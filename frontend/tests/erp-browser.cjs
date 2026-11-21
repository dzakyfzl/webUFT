const { spawn } = require("node:child_process");
const { mkdtemp, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class CDP {
  constructor(socket) {
    this.socket = socket; this.counter = 0; this.pending = new Map(); this.requests = []; this.dialogs = [];
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id); clearTimeout(waiter.timer);
        if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
      }
      if (message.method === "Page.javascriptDialogOpening") {
        this.dialogs.push({ type: message.params.type, handled: message.params.hasBrowserHandler });
        this.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
      }
      if (message.method === "Page.javascriptDialogClosed") this.dialogs.push({ accepted: message.params.result });
      if (message.method === "Network.requestWillBeSent") this.requests.push(new URL(message.params.request.url).pathname);
    });
  }
  send(method, params = {}) {
    const id = ++this.counter;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${result.exceptionDetails.exception?.description?.split("\n")[0] ?? result.exceptionDetails.text}`);
    return result.result.value;
  }
  async wait(expression, label, timeout = 30000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.eval(expression).catch(() => false)) return;
      await sleep(100);
    }
    // Only labels/body text, never form values or credentials.
    const body = await this.eval("document.body.innerText.slice(-1800)").catch(() => "");
    throw new Error(`Timed out: ${label}\n${body}\nDialogs: ${JSON.stringify(this.dialogs)}\nArchive requests: ${this.requests.filter(path => path.endsWith('/archive')).length}`);
  }
  async go(origin, path) {
    await this.send("Page.navigate", { url: origin + path });
    await this.wait("document.readyState === 'complete'", "page loaded");
  }
  async fill(selector, value) {
    await this.eval(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Input missing'); const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', {bubbles:true})); element.dispatchEvent(new Event('change', {bubbles:true})); return true; })()`);
  }
  async clickText(selector, text) {
    const find = `[...document.querySelectorAll(${JSON.stringify(selector)})].find(element => element.textContent.trim() === ${JSON.stringify(text)})`;
    await this.wait(`(() => { const element = ${find}; return !!element && !element.disabled && !!element.getBoundingClientRect().width; })()`, `control ${text}`);
    const needsMenu = await this.eval(`(() => { const element = ${find}; return !!element?.closest('.erp-sidebar') && innerWidth <= 640 && !document.querySelector('.erp-sidebar.is-open'); })()`);
    if (needsMenu) {
      const menu = await this.eval("(() => {const rect=document.querySelector('.erp-mobile-bar button').getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()");
      await this.clickPoint(menu);
      await this.wait("!!document.querySelector('.erp-sidebar.is-open')", "mobile navigation open");
      await sleep(250);
    }
    await this.eval(`(() => { const element = ${find}; if (!element) throw Error('Control missing'); element.scrollIntoView({block:'center',behavior:'instant'}); const rect=element.getBoundingClientRect(); if (!rect.width || !rect.height || getComputedStyle(element).visibility === 'hidden') throw Error('Control hidden'); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
    await this.wait(`(() => {
      const element = ${find};
      if (!element || element.disabled) return false;
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (element.contains(document.elementFromPoint(x, y))) return true;
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
      return false;
    })()`, `clickable ${text}`);
    const current = await this.eval(`(() => { const rect = (${find}).getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
    await this.clickPoint(current);
  }
  async clickPoint({ x, y }) {
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x, y });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x, y });
  }
  async clickElement(expression) {
    const point = await this.eval(`(() => { const element = (${expression}); if (!element) throw Error('Control missing'); element.scrollIntoView({block:'center',behavior:'instant'}); const rect = element.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
    await this.clickPoint(point);
  }
}

async function main() {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const fixture = JSON.parse(Buffer.concat(chunks).toString());
  const profile = await mkdtemp(join(tmpdir(), "webuft-erp-chromium-"));
  const chrome = spawn("chromium", ["--headless=new", "--incognito", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9327", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let cdp;
  try {
    let targets;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { targets = await fetch("http://127.0.0.1:9327/json/list").then(response => response.json()); break; } catch { await sleep(100); }
    }
    if (!targets) throw new Error("Owned Chromium did not start");
    const target = targets.find(target => target.type === "page");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    cdp = new CDP(socket);
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    async function login(person) {
      await cdp.go(fixture.origin, "/admin/login");
      await cdp.wait("!!document.querySelector('input[name=username]')", "login inputs");
      await cdp.fill("input[name=username]", person.username);
      await cdp.fill("input[name=password]", fixture.password);
      await cdp.eval("document.querySelector('form').requestSubmit(); true");
      await cdp.wait("location.pathname === '/admin' && !!document.querySelector('#erp-content h1')", "authenticated dashboard");
    }
    await login(fixture.root);
    console.log("Browser: program and task flows");
    assert.equal(await cdp.eval("!!document.querySelector('.cw-fab')"), false, "ChatWidget must not mount in admin");
    await cdp.go(fixture.origin, "/admin/programs/new");
    await cdp.wait("!!document.querySelector('input[name=name]')", "create program form");
    await cdp.wait("document.querySelector('select[name=chairperson_user_id]')?.options.length === 506", "directory includes accounts beyond 500");
    const chairName = await cdp.eval(`[...document.querySelector('select[name=chairperson_user_id]').options].find(option => option.value === ${JSON.stringify(fixture.chair.id)}).label`);
    await cdp.fill('input[data-form-filter]', chairName);
    await cdp.wait("document.querySelector('select[name=chairperson_user_id]').options.length < 506", "directory search narrows the choices");
    await cdp.eval("document.querySelector('input[data-form-filter]').focus()");
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await cdp.wait("document.activeElement.name === 'chairperson_user_id'", "search Enter moves to choices");
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" });
    await cdp.fill("input[name=name]", "Browser Test Proker");
    await cdp.fill("select[name=owner_unit_id]", fixture.units["Departemen Internal"]);
    await cdp.fill("input[name=chairperson_name]", "Test Ketua");
    await cdp.fill("select[name=chairperson_user_id]", fixture.chair.id);
    await cdp.eval("document.querySelector('#erp-content form').requestSubmit(); true");
    await cdp.wait("/^\\/admin\\/programs\\/[^/]+$/.test(location.pathname) && document.body.innerText.includes('Browser Test Proker') && document.body.innerText.includes('Edit Proker')", "created program");
    const programId = await cdp.eval("location.pathname.split('/').pop()");
    await cdp.clickText("button", "Tugas");
    await cdp.wait("document.querySelectorAll('.erp-kanban-column').length === 4", "four task columns");
    await cdp.clickText("button", "Tambah Tugas");
    await cdp.fill("input[name=title]", "Browser Test Task");
    await cdp.wait("!!document.querySelector('select[name=assignee_user_id]')", "task PIC directory loaded");
    await cdp.fill("select[name=assignee_user_id]", fixture.external.id);
    await cdp.fill("input[name=deadline]", new Date().toISOString().slice(0, 10));
    await cdp.eval("document.querySelector('input[name=title]').form.requestSubmit(); true");
    await cdp.wait("document.body.innerText.includes('Browser Test Task') && !document.querySelector('.erp-error')", "created scoped task");
    const delayDirectory = await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: "const originalFetch = window.fetch; window.fetch = async (...args) => { if (String(args[0]).startsWith('/api/admin/directory')) await new Promise(resolve => setTimeout(resolve, 700)); return originalFetch(...args); };" });
    const taskPath = await cdp.eval("[...document.querySelectorAll('a')].find(element => element.textContent.trim() === 'Browser Test Task').getAttribute('href')");
    await cdp.go(fixture.origin, taskPath);
    await cdp.clickText("button", "Edit tugas");
    await cdp.wait("/^\\/admin\\/tasks\\/[^/]+$/.test(location.pathname) && !!document.querySelector('select[name=assignee_user_id]')", "task editor waits for complete directory");
    assert.equal(await cdp.eval("document.querySelector('select[name=assignee_user_id]').value"), fixture.external.id, "editing must preserve existing PIC");
    await cdp.fill("textarea[name=description]", "Browser edit preserves PIC");
    await cdp.clickText("button", "Simpan tugas");
    await cdp.wait("document.body.innerText.includes('Perubahan tugas tersimpan.') && !document.querySelector('dialog[open]')", "task details saved");
    await cdp.clickText("button", "Edit tugas");
    await cdp.wait(`document.querySelector('select[name=assignee_user_id]')?.value === ${JSON.stringify(fixture.external.id)}`, "saved task keeps PIC");
    await cdp.clickText("button", "Batal");
    await cdp.clickText("a", "Buka papan asal");
    await cdp.wait(`location.pathname === '/admin/programs/${programId}' && document.body.innerText.includes('Browser Test Proker')`, "original program board link");
    await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: delayDirectory.identifier });
    await cdp.clickText("button", "RAB");
    await cdp.clickText("button", "Tambah Item RAB");
    await cdp.fill("input[name=name]", "Test Kertas"); await cdp.fill("input[name=quantity]", "2.5");
    await cdp.fill("input[name=unit]", "pak"); await cdp.fill("input[name=unit_price]", "1000.2");
    await cdp.wait("document.querySelector('output')?.textContent.includes('2.501')", "exact subtotal before submission");
    await cdp.eval("document.querySelector('input[name=quantity]').form.requestSubmit(); true");
    await cdp.wait("document.body.innerText.includes('2.501') && document.body.innerText.includes('Test Kertas')", "exact backend budget total");
    await cdp.clickText("button", "Keluar");
    await cdp.wait("location.pathname === '/admin/login'", "logout");
    await login(fixture.chair);
    await cdp.go(fixture.origin, `/admin/programs/${programId}`);
    await cdp.wait("document.body.innerText.includes('Browser Test Proker')", "chair program");
    await cdp.clickText("button", "Kepanitiaan");
    await cdp.wait("document.body.innerText.includes('Gunakan template awal')", "chair template action");
    await cdp.clickText("button", "Gunakan template awal");
    await cdp.wait("document.querySelector('.erp-list-item')?.parentElement?.textContent.includes('PDD')", "template displayed as structure");
    await cdp.clickText("button", "Edit struktur");
    await cdp.wait("[...document.querySelectorAll('input')].some(element => element.value === 'PDD')", "template committee groups");
    for (const width of [320, 390, 1440]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: width > 1000 ? 1000 : 844, deviceScaleFactor: 1, mobile: width < 640 });
      await sleep(150);
      assert.equal(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"), true, `committee overflows at ${width}px`);
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(tmpdir(), `webuft-erp-committee-${width}.png`), Buffer.from(screenshot.data, "base64"));
    }
    await cdp.clickText("button", "Keluar"); await cdp.wait("location.pathname === '/admin/login'", "chair logout");
    await login(fixture.root);
    for (const path of ["/admin/tasks", "/admin/calendar", "/admin/monitoring", "/admin/organization", "/admin/history"]) {
      await cdp.go(fixture.origin, path); await cdp.wait("!!document.querySelector('#erp-content h1')", `workspace ${path}`);
      await cdp.wait("!document.body.innerText.includes('Memuat data…')", `data ${path}`);
      assert.equal(await cdp.eval("!!document.querySelector('.erp-error')"), false, `API error on ${path}`);
    }
    await cdp.go(fixture.origin, "/admin/organization");
    await cdp.clickText("summary", "Anggota tanpa akun");
    console.log("Browser: member and account flows");
    await cdp.fill("input[name=name]", "Browser Existing Member");
    await cdp.clickText("button", "Catat anggota tanpa akun");
    await cdp.wait("document.body.innerText.includes('Anggota dicatat tanpa membuat akun login.') && document.body.innerText.includes('Browser Existing Member')", "nonaccount member created");
    await cdp.clickText("button", "Buat akun untuk anggota ini");
    await cdp.wait("document.querySelector('input[name=display_name]')?.value === 'Browser Existing Member'", "existing identity selected");
    assert.equal(await cdp.eval("document.querySelector('input[name=display_name]').readOnly"), true);
    await cdp.fill("input[name=username]", "browser-linked-" + programId);
    await cdp.fill("input[name=password]", fixture.password);
    await cdp.clickText("button", "Buat akun");
    await cdp.wait("document.body.innerText.includes('Akun dibuat.') && !document.querySelector('.erp-error')", "existing member linked to account");
    await cdp.fill("input[name=search]", "browser-linked-" + programId);
    await cdp.clickText("button", "Cari akun");
    await cdp.wait("document.querySelector('.erp-list-item')?.textContent.includes('Browser Existing Member') && document.querySelectorAll('section:first-child .erp-list-item').length === 1", "account search");
    await cdp.fill("input[name=search]", "");
    await cdp.clickText("button", "Cari akun");
    await cdp.wait(`document.querySelector('section:first-child .erp-list')?.textContent.includes(${JSON.stringify(fixture.root.username)})`, "account list restored after search");
    await cdp.clickText("summary", "Anggota tanpa akun");
    await cdp.wait("!document.body.innerText.includes('Memuat data…')", "member directory reloaded");
    for (const width of [320, 390, 1440]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: width > 1000 ? 1000 : 844, deviceScaleFactor: 1, mobile: width < 640 });
      await cdp.eval("[...document.querySelectorAll('summary')].find(element => element.textContent === 'Anggota tanpa akun').scrollIntoView({block:'start',behavior:'instant'}); true");
      assert.equal(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"), true, `organization overflows at ${width}px`);
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(tmpdir(), `webuft-erp-organization-${width}.png`), Buffer.from(screenshot.data, "base64"));
    }
    await cdp.go(fixture.origin, `/admin/programs/${programId}`);
    console.log("Browser: close and successor flows");
    await cdp.wait("document.body.innerText.includes('Tutup Proker')", "close action");
    await cdp.clickText("button", "Tutup Proker");
    await cdp.wait("document.body.innerText.includes('Ditutup') && !document.querySelector('input[name=name]')", "closed program read-only");
    await cdp.go(fixture.origin, "/admin/organization");
    const accountRow = `[...document.querySelectorAll('.erp-list-item')].find(element => element.textContent.includes(${JSON.stringify("@" + fixture.root.username)}))`;
    await cdp.wait(`!!(${accountRow})`, "organization account list");
    await cdp.clickElement(`[...(${accountRow}).querySelectorAll('button')].find(element => element.textContent === 'Ubah nama')`);
    await cdp.fill("input[name=display_name]", "Browser Test Ketua");
    await cdp.clickText("button", "Simpan nama");
    await cdp.wait("document.body.innerText.includes('Nama pengurus diperbarui.')", "updated account name");
    await cdp.clickText("summary", "Siapkan periode baru");
    await cdp.fill("input[placeholder='2027–2028']", "Browser Successor " + programId);
    await cdp.clickText("button", "Buat periode");
    await cdp.wait("document.body.innerText.includes('Periode dibuat.')", "successor period creation");
    await cdp.wait(`document.querySelector('#erp-content select')?.selectedOptions[0]?.textContent === ${JSON.stringify("Browser Successor " + programId)}`, "successor period option loaded");
    const successorId = await cdp.eval("document.querySelector('#erp-content select').value");
    assert.ok(successorId, "successor period must have a loaded ID");
    assert.notEqual(successorId, fixture.period_id);
    await cdp.clickElement(`[...(${accountRow}).querySelectorAll('button')].find(element => element.textContent === 'Atur akses')`);
    await cdp.wait("!!document.querySelector('input[name=active]')", "successor membership form");
    if (!await cdp.eval("document.querySelector('input[name=active]').checked")) await cdp.clickElement("document.querySelector('input[name=active]')");
    await cdp.clickElement("document.querySelector('input[name=positions][value=CHAIR]')");
    await cdp.clickText("button", "Simpan akses periode");
    await cdp.wait("document.body.innerText.includes('Perubahan tersimpan.') && !document.querySelector('.erp-error')", "successor chair membership");
    await cdp.go(fixture.origin, "/admin/history");
    await cdp.wait("!!document.querySelector('select[name=successor_period_id]')", "archive controls");
    await cdp.clickText("summary", "Arsipkan periode aktif");
    await cdp.fill("select[name=successor_period_id]", successorId);
    assert.equal(await cdp.eval("document.querySelector('select[name=successor_period_id]').value"), successorId);
    console.log("Browser: archive and history flow");
    await cdp.send("Page.bringToFront");
    assert.equal(await cdp.eval("document.querySelector('select[name=successor_period_id]').form.checkValidity()"), true);
    await cdp.clickText("button", "Arsipkan Periode");
    await cdp.wait("document.body.innerText.includes('Browser Test Task') && document.body.innerText.includes('oleh Browser Test Ketua')", "successor reads preserved history");
    assert.equal(await cdp.eval("document.body.innerText.includes('1 belum dikerjakan')"), true, "archive must preserve unfinished tasks");
    assert.equal(cdp.requests.some(path => path.startsWith("/api/chatbot")), false, "admin must not call public chatbot API");
    console.log(JSON.stringify({ passed: true, flows: ["login", "directory beyond 500", "create program", "task PIC", "delayed directory preserves PIC", "original board link", "RAB exact total", "chair template", "logout", "scoped pages", "member without account", "link existing member", "account search", "close", "account name", "successor membership", "period archive", "preserved history"], widths: [320, 390, 1440], chatbotRequests: 0 }));
  } finally {
    if (cdp) cdp.socket.close();
    chrome.kill("SIGTERM");
  }
}

module.exports = { CDP };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
