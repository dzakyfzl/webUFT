// Headless browser checks against the app's normal routes using intercepted API fixtures.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { CDP } = require("./erp-browser.cjs");

const origin = process.env.ERP_UX_ORIGIN || "http://127.0.0.1:3101";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const session = {
  user: { id: "user-fixture", display_name: "Pengurus Uji", username: "fixture" },
  period_id: "p",
  periods: [{ id: "p", name: "Periode uji" }],
  units: [],
  capabilities: {},
  csrf_token: "fixture",
};

async function run() {
  const profile = await mkdtemp(join(tmpdir(), "webuft-motion-"));
  const chrome = spawn("chromium", [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9341",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let socket;
  try {
    let targets;
    for (let attempt = 0; attempt < 80; attempt++) {
      try { targets = await fetch("http://127.0.0.1:9341/json").then(response => response.json()); break; }
      catch { await delay(100); }
    }
    assert.ok(targets, "Chromium started");
    socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
    const cdp = new CDP(socket);
    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    let uploaded = false;
    let chatAttempts = 0;
    let voteAttempts = 0;
    let builderVersion = 1;
    socket.addEventListener("message", async event => {
      const notice = JSON.parse(event.data);
      if (notice.method !== "Fetch.requestPaused") return;
      const { requestId, request } = notice.params;
      const { pathname, searchParams } = new URL(request.url);
      let result = { items: [], has_more: false };
      let status = 200;
      switch (pathname) {
        case "/api/admin/me": result = session; break;
        case "/api/admin/links":
          await delay(180);
          if (JSON.parse(request.postData).slug === "sudah-ada") {
            result = { error: { message: "Slug sudah digunakan." } };
            status = 409;
          } else {
            result = { slug: "contoh" };
            status = 201;
          }
          break;
        case "/api/admin/programs/example":
          result = { id: "example", period_id: "p", name: "Proker Uji", chairperson_name: "Ketua Uji", status: "ACTIVE", version: 1, capabilities: { edit: true } };
          break;
        case "/api/admin/programs/example/documents/upload":
          uploaded = searchParams.get("name") === "catatan.txt" && request.headers["Content-Type"] === "text/plain";
          break;
        case "/api/admin/events/e0":
          result = { id: "e0", title: "Acara Uji", capabilities: { edit: true } };
          break;
        case "/api/admin/events/e0/form":
          result = { draft_schema: { title: "Pendaftaran Uji", description: "", sections: [] }, version: builderVersion, versions: [] };
          break;
        case "/api/public/events":
          result = { items: Array.from({ length: 5 }, (_, i) => ({
            id: `e${i}`, title: `Acara Uji ${i + 1}`, location: "Bandung",
            starts_at: "2026-11-19T08:00:00Z", poster_url: `/logo.png?sample=${i}`,
          })) };
          break;
        case "/api/public/events/e0":
          result = {
            title: "Acara Uji", location: "Bandung", starts_at: "2026-11-19T08:00:00Z",
            registration: {
              form_version_id: "v1", accepting: true,
              schema: { title: "Pendaftaran", description: "", sections: [{ id: "s1", questions: [
                { id: "pilihan", type: "CHECKBOX", label: "Pilih jadwal", required: true, options: ["Pagi", "Sore"] },
              ] }] },
            },
          };
          break;
        case "/api/karya/ambil/21/7":
          result = { karyaID: 7, nama: "Karya Uji", pemilik: "Fotografer Uji", deskripsi: "Karya uji", fileID: 1 };
          break;
        case "/api/acara/ambil/21":
          result = { acaraID: 21, nama: "Pameran Uji", status: "Aktif" };
          break;
        case "/api/form/isi/21":
          if (++voteAttempts === 1) { status = 403; result = {}; }
          else result = { message: "Tersimpan" };
          break;
        case "/api/chatbot/chat":
          if (++chatAttempts === 1) { status = 503; result = {}; }
          else result = { reply: "Jawaban uji", session_id: "fixture" };
          break;
        case "/api/album/ambil-semua": result = []; break;
      }
      if (socket.readyState === WebSocket.OPEN) await cdp.send("Fetch.fulfillRequest", {
        requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(result)).toString("base64"),
      }).catch(() => {});
    });
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 920, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

    await cdp.go(origin, "/admin/login");
    await cdp.wait("document.documentElement.dataset.theme === 'light'", "client motion environment");
    const login = "document.querySelector('.erp-login button[type=submit]')";
    const point = async expression => cdp.eval(`(() => {
      const rect = (${expression}).getBoundingClientRect();
      return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
    })()`);
    const loginPoint = await point(login);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, ...loginPoint });
    await delay(180);
    assert.equal(await cdp.eval(`getComputedStyle(${login}).scale`), "0.97");
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...loginPoint });
    const invalid = "document.querySelector('input[name=username]')";
    const shake = `${invalid}.getAnimations().find(animation => animation.id === 'invalid-field-shake')`;
    assert.ok(await cdp.eval(`!!(${shake}) && ${invalid}.getAttribute('aria-invalid') === 'true'`));
    assert.ok(await cdp.eval(`document.getElementById(${invalid}.getAttribute('aria-describedby')).textContent.length > 0`));
    await delay(420);
    await cdp.eval("document.querySelector('.erp-login form').requestSubmit()");
    assert.equal(await cdp.eval(`!!(${shake})`), true);
    await cdp.fill("input[name=username]", "fixture");
    assert.equal(await cdp.eval(`${invalid}.hasAttribute('aria-invalid')`), false);

    await cdp.eval(`(() => {
      const root = document.documentElement;
      new MutationObserver(records => {
        if (records.some(record => record.attributeName === 'data-theme')) {
          window.themeTransitionWasOff = root.classList.contains('theme-switching') &&
            getComputedStyle(${login}).transitionProperty === 'none';
        }
      }).observe(root, { attributes: true });
      return true;
    })()`);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await cdp.wait("document.documentElement.dataset.theme === 'dark' && !document.documentElement.classList.contains('theme-switching')", "theme switched and restored motion");
    assert.equal(await cdp.eval("window.themeTransitionWasOff"), true);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await cdp.wait("document.documentElement.dataset.theme === 'light' && !document.documentElement.classList.contains('theme-switching')", "theme switches back and restores motion");
    assert.equal(await cdp.eval(`getComputedStyle(${login}).transitionProperty.includes('scale')`), true);

    await cdp.go(origin, "/shortlink");
    await cdp.wait("!!document.documentElement.dataset.theme && !!document.querySelector('#dest-url')", "hydrated shortlink form");
    await cdp.fill("#dest-url", "https://example.test/perjalanan");
    await cdp.wait("!document.querySelector('#btn-buat-shortlink').disabled", "shortlink submit enabled");
    await cdp.fill("#custom-slug", "sudah-ada");
    await cdp.eval("document.querySelector('#btn-buat-shortlink').click()");
    await cdp.wait("document.querySelector('#custom-slug').getAttribute('aria-invalid') === 'true'", "slug conflict marks the field");
    assert.ok(await cdp.eval("document.querySelector('#custom-slug').getAnimations().some(animation => animation.id === 'invalid-field-shake')"));
    await cdp.fill("#custom-slug", "contoh");
    await cdp.eval(`(() => {
      window.stepSamples = [];
      const end = performance.now() + 2200;
      function record() {
        const samples = [...document.querySelectorAll('.motion-step-panel')].map(panel => ({
          outgoing: panel.inert, x: new DOMMatrix(getComputedStyle(panel).transform).m41,
        }));
        if (samples.length === 2) window.stepSamples.push(samples);
        if (performance.now() < end) requestAnimationFrame(record);
      }
      requestAnimationFrame(record);
      document.querySelector('#btn-buat-shortlink').focus();
      document.querySelector('#btn-buat-shortlink').click();
    })()`);
    await cdp.wait("document.querySelector('.motion-step-panel:not([inert]) [role=status]')?.textContent.includes('berhasil dibuat')", "shortlink submitted");
    await cdp.wait("window.stepSamples.some(rows => rows.some(row => row.outgoing && row.x < -5) && rows.some(row => !row.outgoing && row.x > 5))", "forward slides");
    await cdp.wait("document.querySelectorAll('.motion-step-panel').length === 1", "completed forward slide");
    assert.equal(await cdp.eval("document.activeElement.matches('[data-step-focus][role=status]')"), true);
    await cdp.eval(`(() => {
      const back = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Buat Shortlink Lagi'));
      back.focus();
      back.click();
    })()`);
    await cdp.wait("window.stepSamples.some(rows => rows.some(row => row.outgoing && row.x > 5) && rows.some(row => !row.outgoing && row.x < -5))", "back slides");
    assert.equal(await cdp.eval("document.activeElement.id"), "dest-url");

    await cdp.go(origin, "/admin/events/e0");
    await cdp.clickText("button", "Form Builder");
    const preview = "[...document.querySelectorAll('button[aria-pressed]')].find(button => /Preview peserta|Kembali ke editor/.test(button.textContent))";
    await cdp.wait(`!!(${preview}) && !!document.querySelector('.motion-step-panel')`, "editor preview control");
    await cdp.fill(".erp-builder-canvas input", "Draft lokal");
    await cdp.clickText("button", "Acara");
    await cdp.clickText("button", "Form Builder");
    assert.equal(await cdp.eval("document.querySelector('.erp-builder-canvas input').value"), "Draft lokal", "tab switch keeps editor draft");
    builderVersion = 2;
    await cdp.eval("window.dispatchEvent(new Event('erp:changed'))");
    await cdp.wait("document.querySelector('#erp-content [role=alert]')?.textContent.includes('Draft di server telah berubah')", "builder detects newer server version");
    assert.equal(await cdp.eval("document.querySelector('.erp-builder-canvas input').value"), "Draft lokal", "refresh does not silently replace draft");
    await cdp.clickText("button", "Muat draft server");
    await cdp.wait("document.querySelector('.erp-builder-canvas input').value === 'Pendaftaran Uji'", "explicit version recovery");
    await cdp.eval(`(${preview}).focus(); (${preview}).click()`);
    await cdp.wait("document.querySelector('.motion-step-viewport > [role=status]')?.textContent === 'Pratinjau peserta aktif'", "preview announcement");
    await cdp.eval(`(${preview}).click()`);
    await cdp.wait("document.querySelector('.motion-step-viewport > [role=status]')?.textContent === 'Editor formulir aktif'", "editor announcement after reversal");
    assert.equal(await cdp.eval(`document.activeElement === (${preview})`), true);
    assert.equal(await cdp.eval("document.querySelectorAll('.motion-step-panel:not([inert])').length"), 1);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await cdp.eval(`(${preview}).click()`);
    await cdp.wait("document.querySelectorAll('.motion-step-panel').length === 1 && document.querySelector('.motion-step-panel h2')?.textContent === 'Pendaftaran Uji'", "reduced motion swaps the editor panel");
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });

    await cdp.go(origin, "/admin/calendar");
    const prev = `document.querySelector('[aria-label="Bulan sebelumnya"]')`;
    const next = `document.querySelector('[aria-label="Bulan berikutnya"]')`;
    await cdp.wait(`!!${prev} && document.querySelectorAll('.erp-calendar-cell').length === 42`, "calendar controls");
    async function hover(expression) {
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...(await point(expression)) });
    }
    await hover(prev);
    await delay(180);
    assert.equal(await cdp.eval("!!document.querySelector('[role=tooltip]')"), false);

    await cdp.wait("document.querySelector('[role=tooltip][data-open]')?.textContent === 'Bulan sebelumnya'", "first tooltip");
    await hover(next);
    await delay(180);
    assert.equal(await cdp.eval("document.querySelector('[role=tooltip][data-open]')?.textContent"), "Bulan berikutnya");
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await delay(1600);
    await hover(prev);
    await delay(180);
    assert.equal(await cdp.eval("!!document.querySelector('[role=tooltip]')"), false);

    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await cdp.eval(`${prev}.nextElementSibling.focus()`);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await cdp.wait("document.querySelector('[role=tooltip][data-instant=focus]')?.textContent === 'Bulan sebelumnya'", "keyboard tooltip opens immediately");
    assert.equal(await cdp.eval("getComputedStyle(document.querySelector('[role=tooltip][data-instant=focus]')).transitionProperty"), "none");
    assert.equal(await cdp.eval(`document.getElementById(${prev}.getAttribute('aria-describedby'))?.getAttribute('role')`), "tooltip");

    await cdp.go(origin, "/admin/programs/example");
    await cdp.clickText("button", "Dokumen");
    const details = "document.querySelector('#program-document-forms')";
    await cdp.wait(`!!${details}`, "document disclosure");
    const height = `${details}.getBoundingClientRect().height`;
    const collapsed = await cdp.eval(height);
    await cdp.eval(`${details}.querySelector('summary').click()`);
    await delay(80);
    const expanding = await cdp.eval(height);
    await delay(320);
    const expanded = await cdp.eval(height);
    assert.ok(expanding > collapsed && expanding < expanded, `accordion height: ${collapsed}, ${expanding}, ${expanded}`);
    await cdp.eval(`${details}.querySelector('summary').click()`);
    await delay(80);
    assert.ok(await cdp.eval(height) > collapsed);
    assert.equal(await cdp.eval(`${details}.querySelector('.motion-disclosure-body').inert`), true);
    await delay(300);
    assert.equal(await cdp.eval(height), collapsed);
    await cdp.clickText("button", "Tambah Dokumen");
    await cdp.wait("document.activeElement?.hasAttribute('data-reveal-focus')", "disclosure opens and focuses picker");
    async function drop(filename, type) {
      return cdp.eval(`(() => {
        const drop = new DataTransfer();
        drop.items.add(new File(['berkas uji'], ${JSON.stringify(filename)}, {type: ${JSON.stringify(type)}}));
        document.querySelector('.motion-drop-zone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: drop }));
        return document.querySelector('input[name=file]').files.length;
      })()`);
    }
    assert.equal(await drop("catatan.exe", "application/octet-stream"), 0);
    await cdp.wait("document.querySelector('.motion-field-error')?.textContent.includes('format')", "unsupported file feedback");
    assert.equal(await drop("catatan.txt", "text/plain"), 1);
    await cdp.wait("document.querySelector('.motion-drop-caption')?.textContent === 'catatan.txt'", "accepted file name");
    await cdp.wait(`(() => {
      const button = ${details}.querySelector('button[type=submit]');
      const { x, y, width, height } = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    })()`, "upload button becomes clickable as the disclosure expands");
    await cdp.clickText("button", "Unggah dokumen");
    await cdp.wait("document.querySelector('.erp-success')?.textContent.includes('Dokumen tersimpan')", "upload completed");
    assert.equal(uploaded, true);

    // Force the legacy branch and suppress the native transition to check the measured fallback.
    await cdp.eval(`(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => args[0] === 'selector(details::details-content)' ? false : supports(...args);
      const style = document.createElement('style');
      style.textContent = '#program-document-forms::details-content, #program-document-forms .motion-disclosure-body { transition: none !important; }';
      document.head.append(style);
    })()`);
    await cdp.eval(`${details}.querySelector('summary').click()`);
    await delay(80);
    const fallbackClosing = await cdp.eval(height);
    assert.ok(fallbackClosing > collapsed && fallbackClosing < expanded);
    assert.equal(await cdp.eval(`${details}.querySelector('.motion-disclosure-body').inert`), true);
    await cdp.eval(`${details}.querySelector('summary').click()`);
    await cdp.wait(`Math.abs(${height} - ${expanded}) < 1`, "legacy accordion reverses to natural height");
    await cdp.eval(`${details}.querySelector('summary').click()`);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await cdp.wait(`!${details}.open && ${height} === ${collapsed}`, "legacy accordion settles on preference change");
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });

    await cdp.go(origin, "/");
    const carousel = "document.querySelector('[aria-roledescription=karusel]')";
    const track = `${carousel}.firstElementChild.firstElementChild`;
    const position = `new DOMMatrix(getComputedStyle(${track}).transform).m41`;
    const card = `${carousel}.firstElementChild`;
    const trackWidth = `${card}.clientWidth`;
    await cdp.wait(`!!${carousel} && !!document.querySelector('.motion-scroll-fade')`, "poster highlights and scroll fade list");
    assert.ok(await cdp.eval("Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.cw-panel')).transform).m11 - .97) < .001"));
    await cdp.eval("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))");
    await cdp.eval(`document.querySelector('[aria-label="Jeda putar otomatis"]').click()`);
    const start = await point(card);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...start });
    await cdp.eval(`(() => {
      window.carouselPointerEvents = [];
      for (const type of ['pointerdown', 'pointermove', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'pointerup']) {
        document.addEventListener(type, event => window.carouselPointerEvents.push({
          type, x: event.clientX, y: event.clientY, buttons: event.buttons, primary: event.isPrimary,
          within: ${card}.contains(event.target), target: event.target.className?.baseVal ?? event.target.className, width: ${card}.clientWidth,
        }), true);
      }
    })()`);
    const mouse = (type, x) => cdp.send("Input.dispatchMouseEvent", {
      type, x, y: start.y, button: type === "mouseMoved" ? "none" : "left",
      buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1,
    });
    const settle = (target, label) => cdp.wait(`Math.abs(${position} - (${target})) < 1`, label);
    async function releaseAtStart(waitBeforeRelease) {
      await cdp.eval(`(${card}).addEventListener('pointerup', () => {
        window.springSamples = [];
        const begin = performance.now();
        function record() {
          window.springSamples.push(${position});
          if (performance.now() - begin < 140) requestAnimationFrame(record);
        }
        requestAnimationFrame(record);
      }, { once: true })`);
      await mouse("mousePressed", start.x);
      await mouse("mouseMoved", start.x + 130);
      await delay(16);
      await mouse("mouseMoved", start.x + 230);
      await delay(waitBeforeRelease);
      const resistedStart = await cdp.eval(`new Promise(resolve => {
        function sample(attempts) {
          const offset = ${position};
          if (offset > 20 || !attempts) resolve(offset);
          else requestAnimationFrame(() => sample(attempts - 1));
        }
        sample(3);
      })`);
      if (resistedStart <= 20 || resistedStart >= 90) {
        const events = await cdp.eval("window.carouselPointerEvents.slice(-12)");
        assert.fail(`resisted start offset: ${resistedStart}; ${JSON.stringify(events)}`);
      }
      await mouse("mouseReleased", start.x + 230);
      await settle(0, "spring back at start");
      return cdp.eval("window.springSamples.slice(0, 5).reduce((total, value) => total + value, 0)");
    }
    const slow = await releaseAtStart(155);
    const fast = await releaseAtStart(20);
    assert.ok(fast > slow, `release velocity changes the spring: fast ${fast}, slow ${slow}`);

    await cdp.eval(`[...${carousel}.querySelectorAll('.hero-carousel-dot')].at(-1).click()`);
    await settle(`-4 * ${trackWidth}`, "end poster");
    const minimum = -4 * await cdp.eval(trackWidth);
    await mouse("mousePressed", start.x);
    await mouse("mouseMoved", start.x - 230);
    await delay(55);
    const resistedEnd = minimum - await cdp.eval(position);
    assert.ok(resistedEnd > 20 && resistedEnd < 90);
    await mouse("mouseReleased", start.x - 230);
    await settle(minimum, "spring back at end");

    await mouse("mousePressed", start.x);
    await mouse("mouseMoved", start.x - 100);
    await cdp.wait(`${card}.classList.contains('cursor-grabbing')`, "drag is captured before resize");

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.wait(`!${card}.classList.contains('cursor-grabbing') && !${card}.hasPointerCapture(1)`, "resize releases the active pointer");
    await settle(`-4 * ${trackWidth}`, "resize snaps to the active poster");
    await mouse("mouseReleased", start.x - 100);
    await cdp.eval(`${carousel}.querySelector('.hero-carousel-dot').click()`);
    await settle(0, "first poster on mobile");
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    const touch = await point(card);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...touch, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touch.x - 100, y: touch.y, id: 1 }] });
    await cdp.wait(`${position} < -10`, "carousel tracks the touch drag");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await settle(0, "touch cancel restores the previous slide");
    await cdp.eval("document.querySelector('[aria-label=\"Lanjutkan putar otomatis\"]').click()");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...touch, id: 1 }] });
    for (const distance of [45, 90, 140, 185]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touch.x - distance, y: touch.y, id: 1 }] });
      await delay(22);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await settle(`-${trackWidth}`, "touch flick advances one poster");
    await cdp.wait("!!document.querySelector('[aria-label=\"Lanjutkan putar otomatis\"]')", "manual swipe pauses autoplay");
    assert.equal(await cdp.eval(`${carousel}.querySelector('[role=status]').textContent`), "Sorotan 2 dari 5");
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await cdp.wait(`!document.querySelector('[aria-label="Lanjutkan putar otomatis"]')`, "reduced motion hides autoplay controls");
    await cdp.eval(`${carousel}.querySelector('.hero-carousel-dot').click()`);
    assert.ok(Math.abs(await cdp.eval(position)) < 1);
    await cdp.eval("document.querySelector('.motion-scroll-fade-viewport').scrollLeft = 310");
    await cdp.wait("parseFloat(document.querySelector('.motion-scroll-fade').style.getPropertyValue('--scroll-fade-start')) > 0", "scroll fade follows horizontal position");
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(join(tmpdir(), "webuft-motion-carousel-390.png"), Buffer.from(screenshot.data, "base64"));
    await cdp.go(origin, "/events/e0");
    await cdp.wait("!!document.querySelector('input[name=pilihan]')", "registration group");
    await cdp.eval("document.querySelector('form').requestSubmit()");
    await cdp.wait("document.querySelector('.erp-field-error')?.textContent === 'Pilih setidaknya satu jawaban.'", "required checkbox group feedback");
    await cdp.eval("document.querySelector('input[name=pilihan][value=Sore]').click()");
    await cdp.wait("!document.querySelector('.erp-field-error')", "choosing any option clears error");
    await cdp.eval("document.querySelector('form').requestSubmit()");
    await cdp.wait("document.querySelector('[role=status] h2')?.textContent === 'Pendaftaran diterima'", "registration succeeds with another checkbox");
    await cdp.go(origin, "/admin/login");
    await cdp.wait("!!document.documentElement.dataset.theme", "reduced motion environment");
    await cdp.eval("document.querySelector('.erp-login form').requestSubmit()");
    assert.equal(await cdp.eval(`!!(${shake})`), false);
    assert.equal(await cdp.eval(`${invalid}.getAttribute('aria-invalid')`), "true");

    await cdp.go(origin, "/katalog/karya/7?acaraId=21&karyaId=7");
    await cdp.clickText("button", "VOTE KARYA INI");
    await cdp.wait("document.querySelector('dialog[open]')?.contains(document.activeElement) && document.activeElement.name === 'nama'", "vote dialog places initial focus");
    await cdp.fill("#vote-nama", "Peserta uji");
    await cdp.fill("#vote-prodi_instansi", "Fotografi");
    await cdp.clickText("button", "Kirim vote");
    await cdp.wait("document.querySelector('dialog [role=alert]')?.textContent.includes('sudah pernah')", "vote error stays in the form");
    assert.equal(await cdp.eval("document.querySelector('#vote-nama').value"), "Peserta uji");
    await cdp.clickText("button", "Kirim vote");
    await cdp.wait("document.querySelector('dialog [role=status]')?.textContent.includes('Vote Terkirim')", "vote retry succeeds");
    await cdp.clickText("button", "Tutup");
    await cdp.wait("!document.querySelector('dialog[open]') && document.activeElement.textContent.trim() === 'VOTE KARYA INI'", "vote trigger regains focus");

    await cdp.go(origin, "/");
    await cdp.clickElement("document.querySelector('#chat-fab')");
    await cdp.wait("document.activeElement.id === 'chat-input'", "chat input focus");
    await cdp.fill("#chat-input", "Jadwal pameran?");
    await cdp.clickElement("document.querySelector('#chat-send-btn')");
    await cdp.wait("document.querySelector('.cw-send-error')?.textContent.includes('belum terkirim')", "chat retry error");
    assert.equal(await cdp.eval("document.querySelector('#chat-input').value"), "Jadwal pameran?");
    await cdp.clickElement("document.querySelector('#chat-send-btn')");
    await cdp.wait("document.querySelector('[role=log]')?.textContent.includes('Jawaban uji')", "chat retry succeeds");

    console.log("Frontend motion browser checks passed: press, validation, theme, directional steps and focus, tooltip grouping and keyboard access, native and legacy accordion, file drop, carousel edges, velocity, resize and touch cancel, manual swipe announcements, scroll fade, reduced motion, vote modal, and chat retry.");
  } finally {
    socket?.close();
    chrome.kill("SIGTERM");
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
