// UI contract tests with intercepted API fixtures; database behavior is tested separately.
const { CDP } = require('./erp-browser.cjs');
const { spawn } = require('node:child_process');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const delay = ms => new Promise(r => setTimeout(r, ms));
const origin = process.env.ERP_UX_ORIGIN || 'http://127.0.0.1:3101';
const statuses = ['TODO','IN_PROGRESS','REVIEW','DONE'];
async function main() {
 const profile = await mkdtemp(join(tmpdir(),'webuft-ux-'));
 const chrome = spawn('chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=9339',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let socket;
 try {
 let targets; for(let i=0;i<60;i++){try {targets=await (await fetch('http://127.0.0.1:9339/json')).json();break;}catch {await delay(100);}}
 socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 const cdp = new CDP(socket); await cdp.send('Page.enable'); await cdp.send('Network.enable');
 await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source: `
   window.fixtureNow = Date.parse('2026-11-18T16:59:59Z');
   Date = new Proxy(Date, {
     construct(Target, args) { return new Target(...(args.length ? args : [window.fixtureNow])); },
     get(Target, key) { return key === 'now' ? () => window.fixtureNow : Reflect.get(Target, key); }
   });
 `});
 let tasks=[], agendas=[], failStatus=false, failCreate=false, failPrograms=false, slowSession=true;
 const archiveRequests = [];
 const activeOffsets = [];
 const units = [
   {id:'org',name:'UKM',kind:'ORGANIZATION'},
   {id:'creative',name:'Departemen Kreatif',kind:'DEPARTMENT'},
   {id:'documentation',name:'Departemen Dokumentasi dan Publikasi dengan Nama Panjang',kind:'DEPARTMENT'},
   {id:'creative-media',name:'Media',kind:'DIVISION',parent_id:'creative'},
   {id:'documentation-media',name:'Media',kind:'DIVISION',parent_id:'documentation'},
 ];
 const program = (id, owner, name, edit = false) => ({id, owner_unit_id:owner, name, period_id:'p', chairperson_name:'Ketupel Uji',
   starts_on:'2026-11-19', status:'ACTIVE', capabilities:{edit}});
 const programs = [
   program('basic','org','Pelatihan dasar',true),
   program('brief','creative-media','Brief media kreatif',true),
   program('recap','documentation-media','Rekap dokumentasi'),
   program('show','creative','Pameran foto'),
 ];
 const archive = [{...program('closed','org','Kegiatan ditutup'),status:'CLOSED',closed_at:'2026-10-01T00:00:00Z'}];
 const me={user:{id:'self',display_name:'Pengurus Uji',username:'fixture',active:true,member_id:'m'},period_id:'p',periods:[{id:'p',name:'Periode uji'},{id:'other',name:'Periode kedua'}],units:[units[1],units[3]],positions:['CHAIR'],csrf_token:'test-only',capabilities:{manage_organization:true,create_program:true,archive_period:false}};
 socket.addEventListener('message',async event=>{const m=JSON.parse(event.data);if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params;try{
 const url=new URL(request.url), path=url.pathname.replace('/api/admin',''), body=request.postData?JSON.parse(request.postData):{};let payload={items:[],has_more:false},code=200;
 if(path==='/me'){if(slowSession) await delay(800);payload={...me,period_id:url.searchParams.get('period_id')||'p'};}
 else if(path==='/directory')payload={items:[{id:'self',display_name:'Pengurus Uji'}]};
 else if(path==='/units')payload={items:units};
 else if(path==='/dashboard')payload={tasks:tasks.filter(task=>task.status!=='DONE'),programs:programs.slice(0,2),events:agendas};
 else if(path==='/programs'){
   const view=url.searchParams.get('view');
   const offset=Number(url.searchParams.get('offset')||0);
   const period=url.searchParams.get('period_id');
   if(view==='archive') archiveRequests.push(period);
   if(view==='all') activeOffsets.push(offset);
   const rows=period==='other'?[]:view==='archive'?archive:view==='mine'?programs.slice(0,2):programs;
   if(failPrograms&&view==='all'){code=503;payload={error:{message:'Daftar Proker gagal diperbarui.'}};}
   else payload={items:rows.slice(offset,offset+2),has_more:offset+2<rows.length};
 }
 else if(path==='/tasks'&&request.method==='GET'){const matching=tasks.filter(t=>!url.searchParams.get('status')||t.status===url.searchParams.get('status'));payload={items:matching,has_more:false,counts:Object.fromEntries(statuses.map(s=>[s,tasks.filter(t=>t.status===s).length]))};}
 else if(path==='/tasks'&&request.method==='POST'){
   if(failCreate){code=422;payload={error:{message:'Tugas belum tersimpan.'}};}
   else {payload={...body,id:'task-'+tasks.length,version:1,can_edit:true,program_id:null,unit_id:null};tasks.push(payload);}
 }
 else if(path.endsWith('/status')){const task=tasks.find(t=>path.includes(t.id));if(failStatus){code=409;payload={error:{message:'Tugas berubah. Muat ulang sebelum mencoba kembali.'}};}else{Object.assign(task,{status:body.status,version:task.version+1});payload=task;}}
 else if(path==='/calendar-events'&&request.method==='POST'){payload={...body,id:'agenda-'+agendas.length,version:1,source:'AGENDA',can_edit:true};agendas.push(payload);}
 else if(path==='/calendar-events')payload={items:agendas};
 else if(path==='/monitoring/units')payload={items:[],total:{TODO:0,IN_PROGRESS:0,REVIEW:0,DONE:0,overdue:0}};
 else if(path.startsWith('/inventory/'))payload={items:[],can_manage:true};
 else if(path==='/periods')payload={items:me.periods};
 await cdp.send('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(payload)).toString('base64')});
 }catch(e){console.error(e.message);await cdp.send('Fetch.failRequest',{requestId,errorReason:'Failed'}).catch(()=>{});}});
 await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*/api/admin/*'}]});
 await cdp.go(origin,'/admin');
 await cdp.wait("document.querySelector('.erp-gate [role=status]')?.innerText.includes('Memuat sesi Anda')",'session loading screen');
 assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.erp-gate .erp-spinner')).animationName"),'erp-spin');
 await cdp.wait("document.querySelectorAll('.erp-summary').length===3 && document.body.innerText.includes('Tidak ada tugas yang perlu dikerjakan')",'dashboard summaries');
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
 await cdp.wait("document.documentElement.dataset.erpTheme==='dark'",'system dark theme');
 assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.erp-app')).backgroundColor"),'rgb(10, 10, 10)');
 assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.erp-sidebar nav')).scrollbarColor.includes('107, 107, 107')"),true);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 let themeShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-theme-dark-1440.png'),Buffer.from(themeShot.data,'base64'));
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp.clickElement("document.querySelector('.erp-mobile-bar button')");
 themeShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-theme-dark-nav-390.png'),Buffer.from(themeShot.data,'base64'));
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:500,deviceScaleFactor:1,mobile:true});
 await cdp.eval("document.querySelectorAll('.erp-nav-group').forEach(group=>group.open=true);true");
 await delay(250);
 assert.equal(await cdp.eval("document.querySelector('.erp-sidebar nav').scrollHeight > document.querySelector('.erp-sidebar nav').clientHeight"),true);
 themeShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-theme-dark-nav-scroll-390.png'),Buffer.from(themeShot.data,'base64'));
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp.clickElement("document.querySelector('.erp-mobile-bar button')");
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await cdp.eval("(()=>{const select=document.querySelector('select[aria-label=\"Tema pengurus\"]');select.value='light';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
 await cdp.wait("document.documentElement.dataset.erpTheme==='light' && localStorage.getItem('webuft-admin-theme')==='light'",'manual theme override');
 await delay(250);
 themeShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-theme-light-1440.png'),Buffer.from(themeShot.data,'base64'));
 await cdp.go(origin,'/admin');
 await cdp.wait("document.querySelectorAll('.erp-summary').length===3 && document.documentElement.dataset.erpTheme==='light'",'saved theme after reload');
 await cdp.eval("(()=>{const select=document.querySelector('select[aria-label=\"Tema pengurus\"]');select.value='system';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
 await cdp.wait("document.documentElement.dataset.erpTheme==='dark' && !localStorage.getItem('webuft-admin-theme')",'return to system theme');
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await cdp.wait("document.documentElement.dataset.erpTheme==='light'",'system light theme');
 assert.equal(await cdp.eval("!document.querySelector('.erp-kanban, .erp-calendar-days')"),true);
 await cdp.eval("document.querySelector('.erp-nav-group').open=false; true");
 await cdp.clickText('a','Tambah Tugas');
 await cdp.wait("location.search==='?new=1' && document.activeElement?.name==='title'",'dashboard add opens focused task form');
 assert.equal(await cdp.eval("document.querySelector('.erp-nav-group').open"),true);
 for (const width of [320, 390, 768, 1440]) {
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
   assert.equal(await cdp.eval("(() => { const dialog = document.querySelector('dialog[open]'); const body = dialog?.querySelector('.erp-form-surface-scroll'); return !!dialog && body.scrollWidth <= body.clientWidth + 1 && dialog.getBoundingClientRect().right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; })()"),true,`drawer fits at ${width}px`);
   const drawerShot = await cdp.send('Page.captureScreenshot',{format:'png'});
   await writeFile(join(tmpdir(), `webuft-forms-task-drawer-${width}.png`),Buffer.from(drawerShot.data,'base64'));
 }
 slowSession=false;
 await cdp.wait("[...document.querySelectorAll('.erp-kanban-column .erp-pill')].every(e=>e.textContent==='0')",'empty board counts');
 await cdp.fill('input[name=title]','Tugas drag uji');await cdp.fill('input[name=deadline]','2026-11-19');await cdp.wait("!!document.querySelector('select[name=assignee_user_id]')",'PIC loaded');await cdp.clickText('button','Simpan tugas');await cdp.wait("!!document.querySelector('[data-task-id]')",'created task');
 await cdp.eval("(()=>{const select=document.querySelector('select[aria-label=\"Tema pengurus\"]');select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
 await cdp.wait("document.documentElement.dataset.erpTheme==='dark'",'dark theme across ERP routes');
 await delay(250);
 async function mouseDrag(to) {await delay(700);await cdp.eval("document.querySelector('.erp-kanban').scrollLeft=0; document.querySelector('.erp-drag-handle').scrollIntoView({block:'center',behavior:'instant'}); true");const points=await cdp.eval(`(()=>{const a=document.querySelector('.erp-drag-handle').getBoundingClientRect(),b=document.querySelector('.erp-status-${to}').getBoundingClientRect();return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+90}}})()`);await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...points.a});await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...points.a});for(let i=1;i<=15;i++){await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',buttons:1,x:points.a.x+(points.b.x-points.a.x)*i/15,y:points.a.y+(points.b.y-points.a.y)*i/15});await delay(25);}await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...points.b});}
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await cdp.wait("document.querySelector('.erp-task .erp-deadline')?.textContent==='Besok'",'deadline before midnight WIB');
 await cdp.eval("window.fixtureNow += 1000; window.dispatchEvent(new Event('focus')); true");
 await cdp.wait("document.querySelector('.erp-task .erp-deadline')?.dataset.urgency==='today'",'deadline after midnight WIB');
 assert.equal(await cdp.eval("new Set([...document.querySelectorAll('.erp-kanban-column')].map(column=>getComputedStyle(column).backgroundColor)).size"),4);
 const boardShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-layout-board-1440.png'),Buffer.from(boardShot.data,'base64'));
 await delay(500);await mouseDrag('REVIEW');await cdp.wait("!!document.querySelector('.erp-status-REVIEW [data-task-id]')",'mouse drag to review');assert.equal(tasks[0].status,'REVIEW');
 failStatus=true;await mouseDrag('DONE');await cdp.wait("document.body.innerText.includes('Tugas berubah.')",'conflict feedback');await cdp.wait("!!document.querySelector('.erp-status-REVIEW [data-task-id]')",'conflict rollback');failStatus=false;
 // Keyboard interaction uses the same drag handle and droppable columns.
 await delay(1000);await cdp.eval("document.querySelector('.erp-drag-handle').focus(); true");
 for(const key of ['Space',...Array(5).fill('ArrowRight'),'Enter']){await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',modifiers:key==='ArrowRight'?8:0,key:key==='Space'?' ':key,code:key,windowsVirtualKeyCode:key==='Space'?32:key==='ArrowRight'?39:13});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:key==='Space'?' ':key,code:key});await delay(400);}
 await cdp.wait("!!document.querySelector('.erp-status-DONE [data-task-id]')",'keyboard drag to done');
 assert.equal(await cdp.eval("document.querySelector('.erp-status-DONE .erp-deadline').hasAttribute('data-urgency')"),false);
 await delay(1000);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cdp.eval("document.querySelector('.erp-drag-handle').scrollIntoView({block:'center',behavior:'instant'});true");
 const touch=await cdp.eval("(()=>{const a=document.querySelector('.erp-drag-handle').getBoundingClientRect(),b=document.querySelector('.erp-status-TODO').getBoundingClientRect();return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+90}}})()");
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touch.a,id:1}]});await delay(350);
 for(let i=1;i<=20;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.a.x+(touch.b.x-touch.a.x)*i/20,y:touch.a.y+(touch.b.y-touch.a.y)*i/20,id:1}]});await delay(25);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.wait("!!document.querySelector('.erp-status-TODO [data-task-id]')",'touch drag');assert.equal(tasks[0].status,'TODO');await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await cdp.clickElement("document.querySelector('.erp-status-REVIEW .erp-column-add')");
 await cdp.wait("document.activeElement === document.querySelector('.erp-status-REVIEW .erp-quick-task input[name=title]')",'column add focuses quick entry');
 await cdp.fill('input[name=title]','Tugas tinjau');
 await cdp.eval("window.dispatchEvent(new Event('erp:changed'));true");
 failCreate=true;
 await cdp.clickText('button','Simpan tugas');
 await cdp.wait("document.querySelector('[role=alert]')?.textContent.includes('Tugas belum tersimpan')",'failed creation feedback');
 assert.equal(await cdp.eval("document.querySelector('.erp-quick-task input[name=title]').value"),'Tugas tinjau');
 failCreate=false;
 await cdp.clickText('button','Simpan tugas');
 await cdp.wait("document.querySelector('.erp-status-REVIEW [data-task-id]')?.textContent.includes('Tugas tinjau')",'column task saved');

 await cdp.fill("input[name=search]", "tinjau");
 await cdp.clickText("button", "Cari");
 await cdp.wait("document.querySelectorAll('[data-task-id]').length===1 && document.querySelector('[data-task-id]')?.textContent.includes('Tugas tinjau')",'task search');
 await cdp.fill(".erp-board-filter select", "DONE");
 await cdp.wait("document.querySelectorAll('.erp-kanban-column').length===1 && !!document.querySelector('.erp-status-DONE')",'status filter');
 await cdp.clickText("button", "Reset");

 await cdp.go(origin,'/admin/calendar');
 await cdp.wait("document.querySelectorAll('.erp-calendar-cell').length===42",'monthly grid');
 await cdp.clickText('button','Tambah Agenda');
 await cdp.wait("document.querySelector('dialog[open]')?.contains(document.activeElement) && document.activeElement.name==='title'", "agenda focus");
 await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await cdp.wait("!document.querySelector('dialog[open]') && document.activeElement.textContent.trim() === 'Tambah Agenda'",'Escape restores agenda trigger');
 await cdp.clickText('button','Tambah Agenda');
 await cdp.fill('input[name=title]','Agenda uji');
 const originalEnd = await cdp.eval("document.querySelector('input[name=ends_at]').value");
 await cdp.fill('input[name=ends_at]', '2026-01-01T10:00');
 assert.equal(await cdp.eval("document.querySelector('input[name=ends_at]').validity.rangeUnderflow"), true, 'end time cannot precede start');
 await cdp.fill('input[name=ends_at]', originalEnd);
 await cdp.clickText('button','Simpan agenda');
 await cdp.wait("document.querySelector('.erp-calendar')?.innerText.includes('Agenda uji')",'agenda on calendar');
 assert.ok(agendas[0].starts_at.endsWith('Z'));

 for(const width of [320,390,768,1440]){
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
   for(const [path, name] of [['/admin','dashboard'],['/admin/calendar','calendar']]){
     await cdp.go(origin,path);
     if(name==='dashboard'){
       await cdp.wait("document.querySelector('.erp-summary-grid')?.getAttribute('aria-busy')==='false'",'dashboard data');
       const columns=await cdp.eval("getComputedStyle(document.querySelector('.erp-summary-grid')).gridTemplateColumns.split(' ').length");
       assert.equal(columns,width===1440?3:width===768?2:1,`dashboard layout at ${width}px`);
       assert.equal(await cdp.eval("document.querySelectorAll('.erp-summary-item').length === 5"),true,'real task, agenda and assigned program summaries');
       if(width===1440) assert.equal(await cdp.eval("[...document.querySelectorAll('.erp-summary, .erp-heading-actions')].every(el=>el.getBoundingClientRect().bottom < innerHeight)"),true);
     }else{
       await cdp.wait("document.querySelectorAll('.erp-calendar-cell').length===42 && document.querySelector('.erp-calendar-days').getAttribute('aria-busy')==='false'",'responsive calendar');
       assert.equal(await cdp.eval(`(() => {
         const grid = document.querySelector('.erp-calendar-days');
         const panel = document.querySelector('#erp-content');
         const style = getComputedStyle(panel);
         const width = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
         return Math.abs(grid.getBoundingClientRect().width - width) < 2
           && grid.scrollWidth <= grid.clientWidth && grid.children[6].getBoundingClientRect().right <= innerWidth;
       })()`),true,`calendar fills available width at ${width}px`);
     }
     assert.equal(await cdp.eval("document.documentElement.scrollWidth <= innerWidth"),true,`${name} overflow at ${width}px`);
     const shot=await cdp.send('Page.captureScreenshot',{format:'png'});
     await writeFile(join(tmpdir(),`webuft-layout-${name}-${width}.png`),Buffer.from(shot.data,'base64'));
   }
 }
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await cdp.clickText('a','Tugas Saya');
 await cdp.wait("location.pathname==='/admin/tasks' && !!document.querySelector('.erp-task-heading')",'client navigation to tasks');
 assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.erp-page-heading')).animationName"),'none');
 await cdp.clickText('button','Daftar');
 await cdp.wait("!!document.querySelector('.erp-task-list .erp-task select')",'list status control');
 await cdp.clickText('button','Kanban');
 await cdp.wait("!!document.querySelector('.erp-kanban .erp-drag-handle')",'back to board');
 for(const path of ['/admin/programs','/admin/inventory','/admin/events','/admin/links','/admin/history','/admin/monitoring','/admin/organization']){await cdp.go(origin,path);await cdp.wait("!!document.querySelector('#erp-content h1')",path);await delay(250);assert.ok(await cdp.eval("document.querySelectorAll('#erp-content .erp-panel').length>0"),`empty sections ${path}`);}
 await cdp.go(origin,'/admin/programs');
 await cdp.wait("document.querySelectorAll('.erp-program-row').length===4 && document.querySelectorAll('.erp-program-labels .erp-pill-active').length===2",'all program pages and my assignments');
 assert.ok(activeOffsets.includes(2));
 assert.equal(archiveRequests.length,0,'archive loads on demand');
 assert.equal(await cdp.eval("[...document.querySelectorAll('.erp-program-group h2')].filter(h=>h.textContent.endsWith('/ Media')).length"),2);
 await cdp.clickText('summary','Arsip Proker');
 await cdp.wait("document.querySelector('.erp-program-archive .erp-program-row')?.textContent.includes('Kegiatan ditutup')",'archive grouping');
 await cdp.eval("document.querySelector('.erp-program-archive summary').click()");
 await cdp.wait("document.querySelector('.erp-program-archive .motion-disclosure-body').inert",'closed archive becomes inert');
 assert.ok(await cdp.eval("!!document.querySelector('.erp-program-archive .erp-program-row')"),'archive content remains mounted for closing');
 await cdp.eval("document.querySelector('.erp-program-archive summary').click()");
 failPrograms=true;
 await cdp.eval("window.dispatchEvent(new Event('erp:changed'));true");
 await cdp.wait("document.querySelector('.erp-global-error')?.textContent.includes('Daftar Proker gagal')",'refresh failure feedback');
 assert.equal(await cdp.eval("document.querySelectorAll('.erp-program-row').length"),5,'retains grouped rows after failure');
 failPrograms=false;
 await cdp.clickElement("document.querySelector('.erp-global-error button')");
 await cdp.wait("!document.querySelector('.erp-global-error')",'program group retry');
 const programShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-layout-programs-1440.png'),Buffer.from(programShot.data,'base64'));
 await cdp.fill('select[aria-label="Periode aktif"]','other');
 await cdp.wait("document.body.innerText.includes('Belum ada Proker aktif pada periode ini')",'period-specific grouped data');
 assert.equal(await cdp.eval("document.querySelectorAll('.erp-program-row').length"),0);

 me.capabilities={manage_organization:false,create_program:false,archive_period:false};
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp.go(origin,'/admin/tasks/unit/documentation-media');
 await cdp.wait("document.querySelector('a[aria-current=page][href$=documentation-media]')?.closest('details')?.open",'unit deep link opens parent group');
 assert.equal(await cdp.eval(`!document.querySelector('.erp-board-add, a[href="/admin/monitoring"], a[href="/admin/organization"]')`),true);
 await cdp.clickElement("document.querySelector('.erp-mobile-bar button')");
 await cdp.wait("document.querySelector('.erp-sidebar')?.classList.contains('is-open')",'mobile menu open');
 const navShot=await cdp.send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'webuft-layout-navigation-390.png'),Buffer.from(navShot.data,'base64'));
 await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await cdp.wait("!document.querySelector('.erp-sidebar.is-open') && document.activeElement === document.querySelector('.erp-mobile-bar button')",'Escape returns focus to menu button');
 await cdp.clickText('a','Beranda');
 await cdp.wait("location.pathname==='/admin' && !document.querySelector('.erp-sidebar.is-open')",'mobile navigation closes after selection');

 console.log(JSON.stringify({passed:true,mode:'intercepted API fixtures, no database writes',flows:['session loading animation','responsive summaries','dashboard and column task creation','draft retry','search and status filter','drawer viewport and focus','date range validation','WIB urgency','grouped Proker pagination and archive','role-scoped navigation','mouse drag','keyboard drag','touch drag','409 rollback','full-width calendars','agenda creation','reduced motion','board and list views','empty module sections'],widths:[320,390,768,1440]}));
 }finally {socket?.close();chrome.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
