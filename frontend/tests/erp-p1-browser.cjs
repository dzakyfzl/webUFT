const { spawn } = require("node:child_process");
const { mkdtemp, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { CDP } = require("./erp-browser.cjs");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const fixture = JSON.parse(Buffer.concat(chunks).toString());
  const profile = await mkdtemp(join(tmpdir(), "webuft-p1-chromium-"));
  const chrome = spawn("chromium", ["--headless=new", "--incognito", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9327", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let cdp;
  try {
    let targets;
    for (let i = 0; i < 100; i++) { try { targets = await fetch("http://127.0.0.1:9327/json/list").then(r => r.json()); break; } catch { await sleep(100); } }
    assert.ok(targets, "owned Chromium ready");
    const socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    cdp = new CDP(socket);
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    async function fillLabel(label, value, index = 0) {
      await cdp.eval(`(() => { document.querySelectorAll('[data-cdp-field]').forEach(e => e.removeAttribute('data-cdp-field')); const label = [...document.querySelectorAll('label')].filter(e => e.textContent.trim().startsWith(${JSON.stringify(label)}))[${index}]; if (!label) throw Error('Label missing'); label.control?.setAttribute('data-cdp-field','active'); return true; })()`);
      await cdp.fill('[data-cdp-field="active"]', value);
    }
    async function login() {
      await cdp.go(fixture.origin, "/admin/login"); await cdp.wait("!!document.querySelector('input[name=username]')", "login form");
      await cdp.fill("input[name=username]", fixture.root.username); await cdp.fill("input[name=password]", fixture.password);
      await cdp.eval("document.querySelector('form').requestSubmit(); true");
      await cdp.wait("location.pathname === '/admin' && !!document.querySelector('#erp-content h1')", "dashboard");
    }
    async function ready(path, text) { await cdp.go(fixture.origin, path); await cdp.wait(`document.body.innerText.includes(${JSON.stringify(text)}) && !document.body.innerText.includes('Memuat data…')`, text); }
    async function widths(name) {
      for (const width of [320, 390, 1440]) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: width > 1000 ? 1000 : 844, deviceScaleFactor: 1, mobile: width < 640 });
        assert.equal(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"), true, `${name} overflow ${width}`);
        const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(tmpdir(), `webuft-p1-${name}-${width}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    await login();
    console.log("P1 browser: inventory");
    await ready("/admin/inventory", "Tambah Aset"); await cdp.clickText("button", "Tambah Aset");
    await cdp.fill("input[name=name]", "P1 Browser Book"); await cdp.fill("input[name=asset_code]", "BROWSER-" + Date.now()); await cdp.fill("input[name=category]", "Buku");
    await cdp.clickText("button", "Simpan aset"); await cdp.wait("document.querySelector('tbody')?.textContent.includes('P1 Browser Book')", "physical book saved");
    await cdp.clickText("button", "Catat pinjam/sewa");
    await cdp.fill("input[name=borrower_name]", "P1 External Visitor"); await cdp.fill("input[name=loan_on]", "2026-01-01"); await cdp.fill("input[name=due_on]", "2026-01-02");
    await cdp.clickText("button", "Simpan transaksi"); await cdp.wait("document.body.innerText.includes('P1 External Visitor') && document.body.innerText.includes('Dipinjam')", "manual borrower loan");
    await cdp.clickText("button", "Catat pengembalian"); await cdp.wait("!!document.querySelector('input[name=returned_on]')", "active loan loaded for return"); await cdp.fill("input[name=returned_on]", "2026-01-03"); await cdp.fill("select[name=condition_after]", "RUSAK_RINGAN");
    await cdp.clickText("button", "Simpan pengembalian"); await cdp.wait("document.body.innerText.includes('Perbaikan') && !document.querySelector('input[name=returned_on]')", "damaged return retained");
    await widths("inventory");
    await cdp.clickText("button", "Aset digital"); await cdp.wait("!document.body.innerText.includes('Memuat data…')", "digital ready"); await cdp.clickText("button", "Tambah Aset");
    await cdp.fill("input[name=name]", "P1 Website"); await cdp.fill("select[name=kind]", "WEBSITE"); await cdp.fill("input[name=url]", "https://example.com/"); await cdp.fill("input[name=credential_reference]", "Team vault / Website");
    await cdp.clickText("button", "Simpan aset"); await cdp.wait("document.querySelector('tbody')?.textContent.includes('P1 Website')", "digital saved");
    console.log("P1 browser: documents and actuals");
    await ready("/admin/programs/new", "Nama Proker"); await cdp.wait("!!document.querySelector('input[name=name]')", "program create");
    await cdp.fill("input[name=name]", "P1 Browser Proker"); await cdp.fill("input[name=chairperson_name]", "P1 Chair");
    await cdp.clickText("button", "Buat Proker"); await cdp.wait("/^\\/admin\\/programs\\/[^/]+$/.test(location.pathname) && document.body.innerText.includes('P1 Browser Proker')", "program created");
    const programId = await cdp.eval("location.pathname.split('/').pop()");
    await cdp.clickText("button", "Dokumen"); await cdp.clickText("button", "Tambah Dokumen"); await cdp.wait("!!document.querySelector('input[name=file]')", "upload form");
    const receipt = join(profile, "browser-receipt.pdf");
    const pdf = Buffer.alloc(20 * 1024 * 1024, 32); Buffer.from("%PDF-1.7\n").copy(pdf); await writeFile(receipt, pdf);
    const dom = await cdp.send("DOM.getDocument"); const fileNode = await cdp.send("DOM.querySelector", { nodeId: dom.root.nodeId, selector: "input[name=file]" });
    await cdp.send("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [receipt] });
    await cdp.clickText("button", "Unggah dokumen"); await cdp.wait("document.body.innerText.includes('browser-receipt.pdf') && !document.querySelector('.erp-error')", "20 MiB HTTP upload", 60000);
    const largeStatus = await cdp.eval(`(async () => { const me = await fetch('/api/admin/me').then(r=>r.json()); const file = new Blob([new Uint8Array(20*1024*1024+1)],{type:'application/pdf'}); return (await fetch('/api/admin/programs/${programId}/documents/upload?name=too-big.pdf',{method:'POST',headers:{'Content-Type':'application/pdf','X-CSRF-Token':me.csrf_token},body:file})).status; })()`);
    assert.equal(largeStatus, 413);
    for (let batch = 0; batch < 10; batch++) await cdp.eval(`(async () => {
      const me = await fetch('/api/admin/me').then(response => response.json());
      for (let index = ${batch * 10}; index < ${(batch + 1) * 10}; index++) {
        const response = await fetch('/api/admin/programs/${programId}/documents/upload?name=fixture-' + index + '.txt', {
          method: 'POST', headers: {'Content-Type': 'text/plain', 'X-CSRF-Token': me.csrf_token}, body: 'Fixture'
        });
        if (!response.ok) throw Error('Evidence fixture failed ' + response.status);
      }
      return true;
    })()`);
    await cdp.clickText("button", "Realisasi"); await cdp.wait("document.body.innerText.includes('Tambah realisasi')", "actuals ready"); await cdp.clickText("button", "Tambah realisasi");
    await cdp.fill("input[name=name]", "P1 Printing"); await cdp.fill("input[name=amount]", "12500"); await cdp.fill("input[name=paid_on]", "2026-11-18");
    await cdp.wait("document.querySelector('select[name=attachment_id]')?.options.length === 102", "all 101 evidence options");
    const evidence = await cdp.eval("document.querySelector('select[name=attachment_id]').options[101].value"); await cdp.fill("select[name=attachment_id]", evidence);
    await cdp.clickText("button", "Simpan realisasi"); await cdp.wait("document.querySelector('tbody')?.textContent.includes('P1 Printing')", "actuals saved");
    await cdp.clickText("button", "LPJ"); await cdp.clickText("button", "Edit laporan"); await cdp.wait("!!document.querySelector('textarea[name=narrative]')", "report form");
    await cdp.fill("textarea[name=narrative]", "P1 Browser report"); await cdp.clickText("button", "Simpan laporan"); await cdp.wait("document.body.innerText.includes('Perubahan tersimpan.')", "report saved");
    console.log("P1 browser: events and builder");
    await ready("/admin/events", "Buat Acara"); await cdp.clickText("button", "Buat Acara");
    await cdp.fill("input[name=title]", "P1 Browser Workshop"); await cdp.fill("input[name=starts_at]", "2026-12-01T09:00"); await cdp.fill("input[name=ends_at]", "2026-12-01T12:00");
    await cdp.wait(`[...document.querySelector('select[name=program_id]').options].some(option => option.value === ${JSON.stringify(programId)})`, "program choice"); await cdp.fill("select[name=program_id]", programId);
    await cdp.clickText("button", "Simpan acara"); await cdp.wait("/^\\/admin\\/events\\/[^/]+$/.test(location.pathname) && document.body.innerText.includes('P1 Browser Workshop')", "event created");
    const eventId = await cdp.eval("location.pathname.split('/').pop()");
    await cdp.clickText("button", "Formulir"); await cdp.clickText("button", "Gunakan template awal");
    await cdp.wait("document.body.innerText.includes('Simpan draft')", "template editor");
    assert.equal(await cdp.eval("document.querySelector('.erp-builder-questions').textContent.includes('Fakultas')"), true);
    for (let index = 0; index < 4; index++) { await cdp.clickText("button", "Hapus pertanyaan"); await cdp.wait(`document.querySelectorAll('.erp-builder-questions li').length === ${3-index}`, "template question removed"); }
    await cdp.clickText("button", "Tambah pertanyaan"); await fillLabel("Label pertanyaan", "Nomor Kontak");
    await cdp.clickElement("[...document.querySelectorAll('label')].find(e=>e.textContent.trim()==='Wajib diisi').querySelector('input')");
    await cdp.clickText("button", "Tambah pertanyaan");
    await fillLabel("Label pertanyaan", "Jenis peserta");
    await fillLabel("Jenis jawaban", "DROPDOWN");
    await fillLabel("Pilihan jawaban", "Anggota\nUmum");
    await cdp.clickElement("[...document.querySelectorAll('button')].find(e => e.textContent === 'Pertanyaan naik' && !e.disabled)");
    await cdp.clickElement("[...document.querySelectorAll('button')].find(e => e.textContent === 'Pertanyaan turun' && !e.disabled)");
    await cdp.clickText("button", "Tambah bagian"); await cdp.clickText("button", "Simpan draft");
    await cdp.wait(`(async()=>{const r=await fetch('/api/admin/events/${eventId}/form').then(r=>r.json());return r.draft_schema?.sections[0].questions[0]?.label==='Nomor Kontak' && r.draft_schema.sections.length===2;})()`, "flexible form saved");
    await cdp.clickElement("[...document.querySelectorAll('.erp-builder-questions button')].find(button => button.textContent.includes('Jenis peserta'))");
    await cdp.wait("document.querySelector('.erp-builder-properties').contains(document.activeElement)", "question selection focuses its properties");
    await widths("builder-editor");
    await cdp.clickText("button", "Preview peserta"); await cdp.wait("document.body.innerText.includes('Nomor Kontak *')", "participant preview"); await widths("builder"); await cdp.clickText("button", "Kembali ke editor");
    await cdp.clickText("button", "Terbitkan draf tersimpan"); await cdp.wait("document.body.innerText.includes('Versi terbit 1')", "published version");
    assert.equal(await cdp.eval("!!document.querySelector('a[target=_blank][href^=\"/events/\"]')"), false);
    assert.equal(await cdp.eval("[...document.querySelectorAll('button')].find(button => button.textContent === 'Buka pendaftaran').disabled"), true);
    await cdp.clickText("button", "Acara"); await cdp.clickText("button", "Atur publikasi acara");
    await cdp.fill("select[name=status]", "PUBLISHED"); await cdp.clickText("button", "Simpan acara");
    await cdp.wait("document.body.innerText.includes('Lihat halaman publik')", "published event link");
    await cdp.clickText("button", "Formulir");
    await cdp.clickText("button", "Buka pendaftaran"); await cdp.wait("document.body.innerText.includes('Pendaftaran dibuka')", "registration open");
    await ready("/", "P1 Browser Workshop");
    assert.equal(await cdp.eval(`!!document.querySelector('a[href="/events/${eventId}"]')`), true, "published event appears on the preserved landing page");
    console.log("P1 browser: anonymous registration and version recovery");
    await ready(`/events/${eventId}`, "Kirim pendaftaran");
    await cdp.clickText("button", "Kirim pendaftaran");
    await cdp.wait("document.querySelector('.erp-field-error')?.textContent.includes('wajib diisi')", "required answer shows inline feedback");
    await fillLabel("Nomor Kontak", "08123456789");
    await cdp.eval(`(async()=>{const me=await fetch('/api/admin/me').then(r=>r.json()); const path='/api/admin/events/${eventId}/form'; const form=await fetch(path).then(r=>r.json()); form.draft_schema.title='P1 Updated Registration'; const headers={'Content-Type':'application/json','X-CSRF-Token':me.csrf_token};const saved=await fetch(path,{method:'PUT',headers,body:JSON.stringify({expected_version:form.version,schema:form.draft_schema})}).then(r=>r.json()); const result=await fetch(path+'/publish',{method:'POST',headers,body:JSON.stringify({expected_version:saved.version})}); if(!result.ok)throw Error('publish failed');return true;})()`);
    await cdp.send("Network.clearBrowserCookies");
    await cdp.clickText("button", "Kirim pendaftaran"); await cdp.wait("document.body.innerText.includes('Formulir telah diperbarui')", "stale schema rejected");
    await cdp.clickText("button", "Muat versi terbaru"); await cdp.wait("document.body.innerText.includes('P1 Updated Registration') && !document.body.innerText.includes('Formulir telah diperbarui')", "new version loaded");
    assert.equal(await cdp.eval("document.querySelector('input[id^=answer-]').value"), "08123456789");
    await widths("registration");
    await cdp.eval(`(() => {
      const send = window.fetch.bind(window);
      window.fetch = async (url, options) => {
        const response = await send(url, options);
        if (String(url).endsWith('/submissions') && response.ok) {
          window.fetch = send;
          throw new TypeError('Connection lost after submission');
        }
        return response;
      };
      return true;
    })()`);
    await cdp.clickText("button", "Kirim pendaftaran");
    await cdp.wait("document.body.innerText.includes('Isian Anda masih ada')", "submission acknowledgement lost");
    await cdp.clickText("button", "Kirim pendaftaran"); await cdp.wait("document.body.innerText.includes('Pendaftaran diterima')", "anonymous registration accepted");
    await ready("/shortlink", "Buat Shortlink");
    await cdp.fill('input[type="url"]', "https://example.com/workshop");
    await cdp.clickText("button", "Buat Shortlink");
    await cdp.wait("document.body.innerText.includes('Masuk sebagai pengurus aktif')", "legacy creator requires active login");
    await login(); await ready(`/admin/events/${eventId}`, "Respons & ekspor"); await cdp.clickText("button", "Respons & ekspor");
    await cdp.wait("document.body.innerText.includes('08123456789')", "private response displayed");
    const exportStatus = await cdp.eval(`(async()=>{const form=await fetch('/api/admin/events/${eventId}/form').then(r=>r.json());const r=await fetch('/api/admin/events/${eventId}/responses-export?format=xlsx&form_version_id='+form.published_version_id);const bytes=new Uint8Array(await r.arrayBuffer());return {status:r.status,zip:bytes[0]===80&&bytes[1]===75};})()`);
    assert.deepEqual(exportStatus, { status: 200, zip: true });
    console.log("P1 browser: short link and freeze");
    await ready("/admin/links", "Buat Tautan"); await cdp.clickText("button", "Buat Tautan"); await cdp.fill("input[name=slug]", "browser-" + eventId); await cdp.fill("input[name=destination_url]", "https://example.com/workshop");
    await cdp.clickText("button", "Simpan tautan"); await cdp.wait(`document.querySelector('.erp-list-item')?.textContent.includes(${JSON.stringify("browser-" + eventId)})`, "short link saved");
    await ready("/shortlink", "Buat Shortlink");
    await cdp.fill('input[type="url"]', "https://example.com/workshop");
    await cdp.fill('input[id="custom-slug"]', "legacy-" + eventId);
    await cdp.clickText("button", "Buat Shortlink");
    await cdp.wait(`document.body.innerText.includes(${JSON.stringify("legacy-" + eventId)}) && !document.querySelector('[role=alert]')`, "legacy creator uses authenticated P1 API");
    await ready(`/admin/programs/${programId}`, "Tutup Proker"); await cdp.clickText("button", "Tutup Proker"); await cdp.wait("document.body.innerText.includes('Ditutup')", "program closed");
    await ready(`/events/${eventId}`, "Pendaftaran ditutup");
    await ready("/events/missing-event", "Lihat acara lain");
    await cdp.clickText("a", "Lihat acara lain");
    await cdp.wait("location.pathname === '/events'", "public events index");
    const outage = await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `
      const realFetch = window.fetch.bind(window);
      window.fetch = (url, options) => {
        if (String(url).startsWith('/api/public/events')) {
          window.fetch = realFetch;
          return Promise.resolve(new Response('', {status: 503}));
        }
        return realFetch(url, options);
      };` });
    for (const path of ["/events", `/events/${eventId}`]) {
      await ready(path, "Coba lagi");
      assert.equal(await cdp.eval("document.body.innerText.includes('Memuat acara…')"), false);
      await cdp.clickText("button", "Coba lagi");
      await cdp.wait("document.body.innerText.includes('P1 Browser Workshop')", "temporary error recovered");
    }
    await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: outage.identifier });
    console.log(JSON.stringify({ passed: true, suite: "P1", flows: ["physical book", "external borrower", "damaged return history", "digital asset", "20 MiB upload", "over-limit rejected", "actuals evidence", "LPJ", "event publish", "landing page publication", "remove all template fields", "new dropdown section and reorder", "preview", "immutable version publish", "stale schema recovery", "anonymous submission", "private response", "Excel export", "safe short link", "legacy creator authentication", "closed program closes registration"], widths: [320,390,1440] }));
  } finally { if (cdp) cdp.socket.close(); chrome.kill("SIGTERM"); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
