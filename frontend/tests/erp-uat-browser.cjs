const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { CDP } = require("./erp-browser.cjs");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const fixture = JSON.parse(Buffer.concat(chunks).toString());
  const profile = await mkdtemp(join(tmpdir(), "webuft-uat-chromium-"));
  const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9328", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  const exited = new Promise(resolve => chrome.once("exit", resolve));
  let cdp;
  try {
    let targets;
    for (let i = 0; i < 100; i++) {
      try { targets = await fetch("http://127.0.0.1:9328/json/list").then(r => r.json()); break; }
      catch { await sleep(100); }
    }
    assert.ok(targets, "UAT Chromium ready");
    const socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    cdp = new CDP(socket);
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    for (const [role, person] of Object.entries(fixture.roles)) {
      await cdp.send("Network.clearBrowserCookies");
      await cdp.go(fixture.origin, "/admin/login");
      await cdp.wait("!!document.querySelector('input[name=username]')", "UAT login form");
      await cdp.fill("input[name=username]", person.username);
      await cdp.fill("input[name=password]", fixture.password);
      await cdp.eval("document.querySelector('form').requestSubmit(); true");
      await cdp.wait("location.pathname === '/admin' && !!document.querySelector('#erp-content h1')", "UAT dashboard");
      const access = await cdp.eval(`(async () => {
        const me = await fetch('/api/admin/me').then(r => r.json());
        const program = await fetch('/api/admin/programs/${fixture.program_a}').then(r => r.json());
        return {manage:me.capabilities.manage_organization, edit:program.capabilities.edit, structure:program.capabilities.structure};
      })()`);
      assert.equal(access.manage, ["ketua", "wakil"].includes(role), `${role} organization access`);
      assert.equal(access.edit, ["ketua", "ketupel_a"].includes(role), `${role} program assignment`);
      assert.equal(access.structure, role === "ketupel_a", `${role} committee access`);
      if (role === "ketupel_a") {
        const media = await cdp.eval(`(async () => {
          const me = await fetch('/api/admin/me').then(r => r.json());
          const base = '/api/admin/programs/${fixture.program_a}/documents';
          const uploaded = await fetch(base+'/upload?name=uat.pdf', {method:'POST',
            headers:{'Content-Type':'application/pdf','X-CSRF-Token':me.csrf_token},body:'%PDF-1.7\\nUAT temporary media'});
          if (uploaded.status !== 201) return {upload:uploaded.status};
          const document = await uploaded.json();
          const downloaded = await fetch(base+'/'+document.id+'/download');
          return {upload:201,download:downloaded.status,body:await downloaded.text()};
        })()`);
        assert.deepEqual(media, { upload: 201, download: 200, body: "%PDF-1.7\nUAT temporary media" });
      }
      for (const width of [320, 390, 1440]) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
        assert.equal(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"), true, `${role} dashboard width ${width}`);
      }
    }
    // A real write through Next must remain inside the rollback session.
    const saved = await cdp.eval(`(async () => {
      const me = await fetch('/api/admin/me').then(r => r.json());
      return (await fetch('/api/admin/tasks', {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf_token},
        body:JSON.stringify({period_id:${JSON.stringify(fixture.period_id)},scope_type:'ORGANIZATION',title:'UAT browser write'})})).status;
    })()`);
    assert.equal(saved, 201, "UAT mutation through Next");
    console.log("UAT browser lulus: 8 peran, hak organisasi/Proker/panitia, dashboard 320/390/1440, upload/unduh PDF dan mutasi melalui Next.");
  } finally {
    if (cdp) cdp.socket.close();
    chrome.kill("SIGTERM");
    await exited;
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
main().catch(error => { console.error(`UAT browser gagal (${error.code || error.name}); payload login tidak dicetak.`); process.exitCode = 1; });
