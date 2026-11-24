// Run against a local Next production server. Screenshots stay in the temporary profile.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, readFile, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { CDP } = require("./erp-browser.cjs");

const origin = process.env.ERP_UX_ORIGIN || "http://127.0.0.1:3116";
const introDuration = 3600;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hidden = "!document.documentElement.dataset.uftIntro && !!document.querySelector('#home')";
const cameraReadouts = "document.getAnimations().find(animation => animation.animationName?.endsWith('fade-readouts'))?.effect.target";

async function run() {
  const profile = await mkdtemp(join(tmpdir(), "uft-shutter-"));
  const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  const sockets = [];
  try {
    let port;
    for (let i = 0; i < 80 && !port; i++) {
      await delay(100);
      port = await readFile(join(profile, "DevToolsActivePort"), "utf8").then(s => s.split("\n")[0]).catch(() => null);
    }
    assert.ok(port, "Chromium started");
    const endpoint = "http://127.0.0.1:" + port;
    async function connect(target) {
      const socket = new WebSocket(target.webSocketDebuggerUrl);
      sockets.push(socket);
      await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
      const cdp = new CDP(socket);
      await cdp.send("Page.enable");
      await cdp.send("Network.enable");
      await cdp.send("Network.setBlockedURLs", {urls: ["https://fonts.googleapis.com/*"]});
      await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.introStates = [];
        new MutationObserver(entries => {
          for (const entry of entries) if (entry.oldValue) introStates.push(entry.oldValue);
          if (document.documentElement?.dataset.uftIntro === 'playing') introStates.push('playing');
        }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['data-uft-intro'] });
      ` });
      socket.addEventListener("message", async e => {
        const { method, params } = JSON.parse(e.data);
        if (method !== "Fetch.requestPaused") return;
        try {
          const pathname = new URL(params.request.url).pathname;
          let data;
          if (pathname === "/api/file/ambil/7") {
            await cdp.send("Fetch.fulfillRequest", {
              requestId: params.requestId, responseCode: 200,
              responseHeaders: [{ name: "Content-Type", value: "image/png" }],
              body: (await readFile(join(__dirname, "../public/logo.png"))).toString("base64"),
            });
            return;
          }
          if (pathname === "/api/public/events") {
            data = { items: [1, 2].map(i => ({
              id: String(i), title: "Poster " + i, location: "Bandung",
              starts_at: "2026-11-19T08:00:00Z", poster_url: "/logo.png?poster=" + i,
            })) };
          } else if (pathname === "/api/album/ambil-semua") {
            data = [{ albumID: 8, nama: "Koleksi" }];
          } else {
            data = { album: { albumID: 8, nama: "Koleksi" }, fotos: [{ fotoID: 7, nama: "Foto uji", pemilik: "Fotografer uji", fileID: 7 }] };
          }
          await cdp.send("Fetch.fulfillRequest", {
            requestId: params.requestId, responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "application/json" }],
            body: Buffer.from(JSON.stringify(data)).toString("base64"),
          });
        } catch (error) { if (!String(error).includes("Invalid InterceptionId")) throw error; }
      });
      await cdp.send("Fetch.enable", { patterns: [{ urlPattern: origin + "/api/*" }] });
      return cdp;
    }

    const targets = await fetch(endpoint + "/json/list").then(r => r.json());
    const cdp = await connect(targets.find(t => t.type === "page"));
    async function navigate(client, path) {
      const url = new URL(path, origin).href;
      await client.send("Page.navigate", { url });
      await client.wait(`location.href === ${JSON.stringify(url)} && document.readyState !== 'loading'`, "destination");
    }
    async function verifySkipped(client) {
      await client.wait(hidden + " && !!document.querySelector('[aria-label=\"Sorotan berikutnya\"]')", "hero available");
      assert.deepEqual(await client.eval("introStates"), []);
    }
    async function reload(client, ignoreCache = false) {
      await client.eval("void (window.beforeReload = true)");
      await client.send("Page.reload", { ignoreCache });
      await client.wait("!window.beforeReload && document.readyState !== 'loading'", "new document after reload");
    }
    async function verifyReplay(client) {
      await client.wait(`document.documentElement.dataset.uftIntro === 'playing' &&
        document.getAnimations().some(animation => animation.playState === 'running' &&
          animation.effect?.getTiming().duration === ${introDuration})`, "shutter animation plays on reload");
      await client.wait(hidden, "replayed intro yields within budget", introDuration + 1300);
    }
    async function capture(client, filename) {
      const { data } = await client.send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(profile, filename + ".png"), Buffer.from(data, "base64"));
    }
    await navigate(cdp, "/admin/login");
    await navigate(cdp, "/#tentang");
    await verifySkipped(cdp);
    await reload(cdp);
    await verifyReplay(cdp);
    assert.equal(await cdp.eval("document.querySelector(':target')?.id"), "tentang");
    for (const [width, height] of [[320,680],[390,844],[640,800],[768,1024],[1440,900]]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {width,height,deviceScaleFactor:1,mobile:false});
      await navigate(cdp, "/admin/login");
      await navigate(cdp, "/");
      await cdp.wait("document.documentElement.dataset.uftIntro === 'playing'", "homepage load starts intro");
      await cdp.wait("!!document.querySelector('#home img')", "shared image");
      await cdp.wait(`!!(${cameraReadouts})`, "camera readouts are shown in the intro");
      assert.ok(await cdp.eval(`(() => {
        const readouts = ${cameraReadouts};
        const labels = readouts.innerText.replace(/\\s+/g, ' ');
        const requiredLabels = [
          'NO CARD', '3:2', '24M', 'RAW', 'X.FINE', '34%', 'MF', 'AF', 'PP',
          'AWB', 'D-R', 'Std.', '±0 ±0 ±0', '1/2000', 'F8.0', '±0.0', 'ISO 102400',
        ];
        return requiredLabels.every(label => labels.includes(label)) &&
          parseFloat(getComputedStyle(readouts).fontSize) >= 16 &&
          Array.from(readouts.children).every(row => row.scrollWidth <= row.clientWidth) &&
          Array.from(readouts.firstElementChild.children).every(group => group.scrollWidth <= group.clientWidth) &&
          readouts.scrollHeight <= readouts.clientHeight;
      })()`), "camera indicators fit the viewport");
      await cdp.eval("void (window.firstPhoto = document.querySelector('#home img'))");
      assert.equal(await cdp.eval("document.querySelectorAll('svg path[fill=currentColor]').length"), 6);
      if (width === 390 || width === 1440) {
        const positions = [];
        const frames = [350, 440, 820, 910, 1250, 1340, 1640, 2304, 2844, 3490];
        for (const ms of frames) {
          positions.push(await cdp.eval(`(() => {
            const animations = document.getAnimations().filter(animation => animation.effect?.getTiming().duration === ${introDuration});
            const scan = animations.find(animation => animation.animationName?.endsWith('search-focus'));
            for (const animation of animations) {
              animation.pause();
              animation.currentTime = ${ms};
            }
            const finder = scan.effect.target;
            const box = finder.getBoundingClientRect();
            const backdrop = getComputedStyle(finder.parentElement, '::before');
            return {
              x: box.left + box.width / 2 - innerWidth / 2,
              y: box.top + box.height / 2 - innerHeight / 2,
              filter: getComputedStyle(finder).filter,
              color: getComputedStyle(finder.querySelector('span')).color,
              backdropFilter: backdrop.backdropFilter,
              backdropColor: backdrop.backgroundColor,
              backdropVisibility: backdrop.visibility,
              clipPath: backdrop.clipPath,
            };
          })()`));
          if (ms === 2844) {
            assert.equal(await cdp.eval(`getComputedStyle(${cameraReadouts}).opacity`), "0", "indicators fade before the shutter opens fully");
          }
          if (![440, 910, 1340].includes(ms)) await capture(cdp, `scene-${width}-${ms}`);
        }
        const [upperLeft, upperLeftHold, right, rightHold, lowerLeft, lowerLeftHold, locked, opening] = positions;
        const cleared = positions.at(-1);
        assert.ok(upperLeft.x < -20 && upperLeft.y < -20, "finder scans upper left");
        assert.ok(right.x > 20, "finder scans right");
        assert.ok(lowerLeft.x < -20 && lowerLeft.y > 20, "finder scans lower left");
        assert.deepEqual(upperLeftHold, upperLeft, "finder pauses in the upper left");
        assert.deepEqual(rightHold, right, "finder pauses on the right");
        assert.deepEqual(lowerLeftHold, lowerLeft, "finder pauses in the lower left");
        assert.ok(Math.abs(locked.x) < 1 && Math.abs(locked.y) < 1, "finder locks in the center");
        assert.equal(locked.filter, "blur(0px)");
        assert.notEqual(locked.color, lowerLeft.color, "lock changes the focus indicator");
        assert.match(upperLeft.backdropFilter, /^blur\([1-9]/, "the page is blurred during the scan");
        assert.equal(upperLeft.backdropColor, "rgba(0, 0, 0, 0)", "the page shows through the soft backdrop");
        assert.equal(locked.clipPath, upperLeft.clipPath, "the page stays fully blurred until focus locks");
        assert.notEqual(opening.clipPath, locked.clipPath, "focus clears from the center after lock");
        assert.equal(opening.backdropVisibility, "visible", "the blur remains outside the opening");
        assert.equal(cleared.backdropVisibility, "hidden", "the blur is gone before the intro ends");
        await cdp.eval("document.getAnimations().filter(a=>a.playState==='paused').forEach(a=>a.play())");
      } else {
        await capture(cdp, "readouts-" + width);
      }
      await cdp.wait(hidden, "intro yields within budget", introDuration + 1300);
      assert.ok(await cdp.eval("firstPhoto === document.querySelector('#home img') && firstPhoto.naturalWidth > 0"));
      assert.ok(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"));
      await capture(cdp, "hero-" + width);
      assert.deepEqual(await cdp.eval("Array.from(document.querySelectorAll('main section[id], footer[id]'), section => section.id)"), ["home", "tentang", "layanan", "acara", "koleksi", "acara-lengkap", "kontak"]);
      assert.ok(await cdp.eval(`!!document.querySelector('#koleksi [aria-label="Lihat detail Foto uji"]')`));
      assert.ok(await cdp.eval(`!!document.querySelector('#acara a[href="/events/1"]')`));
      await cdp.eval(`document.querySelector('[aria-label="Sorotan berikutnya"]').click()`);
      await cdp.wait("document.querySelector('#home h1')?.textContent === 'Poster 2'", "original poster carousel advances");
      await reload(cdp, width === 1440);
      await verifyReplay(cdp);
      if (width === 390) {
        await cdp.clickElement(`document.querySelector('[aria-label="Buka menu navigasi"]')`);
        await cdp.clickText("#mobile-navigation button", "Tentang");
        await cdp.wait(`!!document.querySelector('[aria-label="Buka menu navigasi"]') && document.querySelector('#tentang').getBoundingClientRect().top < 100`, "original mobile navigation scrolls to About");
      }
    }
    const newTab = await fetch(endpoint + "/json/new?about:blank", { method: "PUT" }).then(r => r.json());
    const tab = await connect(newTab);
    await navigate(tab, "/");
    await tab.wait("document.documentElement.dataset.uftIntro === 'playing'", "new session");
    assert.ok(await tab.eval("![...document.querySelectorAll('button')].some(button => /^lewati intro$/i.test(button.textContent.trim()))"), "Intro has no skip button");
    await tab.wait(hidden, "intro ends automatically in a new tab", introDuration + 1300);
    await cdp.send("Page.bringToFront");
    await navigate(cdp, "/");
    await cdp.wait("document.documentElement.dataset.uftIntro === 'playing'", "keyboard skip starts");
    await cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});
    assert.ok(await cdp.eval(hidden + " && document.activeElement.matches('nav button')"), "Tab dismisses the intro and focuses the original navigation");
    await cdp.send("Emulation.setEmulatedMedia", { features:[{name:"prefers-reduced-motion",value:"reduce"}] });
    await reload(cdp);
    await verifySkipped(cdp);
    await cdp.send("Emulation.setEmulatedMedia", {features:[]});
    const noBackdropFilter = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {source: `
      const supportsCSS = CSS.supports.bind(CSS);
      CSS.supports = (property, ...values) => !property.endsWith('backdrop-filter') && supportsCSS(property, ...values);
    `});
    await reload(cdp);
    await verifySkipped(cdp);
    await cdp.send("Page.removeScriptToEvaluateOnNewDocument", {identifier: noBackdropFilter.identifier});
    const guard = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {source:"Object.defineProperty(window,'sessionStorage',{get(){throw Error('disabled')}})"});
    await reload(cdp);
    await verifyReplay(cdp);
    await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier:guard.identifier });
    await cdp.send("Network.setBlockedURLs", {urls:["*/logo.png?poster=*", "https://fonts.googleapis.com/*"]});
    await cdp.send("Network.setCacheDisabled", {cacheDisabled:true});
    await navigate(cdp, "/");
    await cdp.wait(hidden + " && introStates.includes('playing')", "image failure releases intro", 5000);
    await cdp.send("Network.setBlockedURLs", {urls:["https://fonts.googleapis.com/*"]});
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    await navigate(cdp,"/");
    await cdp.wait(hidden + " && introStates.includes('playing')", "automatic exit with 4x CPU slowdown", 6500);
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:1});
    await cdp.send("Emulation.setScriptExecutionDisabled", {value:true});
    await navigate(cdp,"/");
    await cdp.wait(hidden + " && document.querySelector('#tentang h2').getBoundingClientRect().width > 0 && document.querySelector('nav img').naturalWidth > 0", "server-rendered fallback");
    console.log("Landing page and entrance checks passed. Frames in " + profile);
  } finally {
    for (const socket of sockets) socket.close();
    chrome.kill();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
