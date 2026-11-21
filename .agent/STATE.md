# State

- Agent proyek `frontend_design_fixer` tersedia di `.codex/agents/` untuk audit dan perbaikan UI ERP pengurus.
- Tema ERP terang/gelap memakai token di `frontend/app/admin/erp-theme.css`; default mengikuti sistem, pilihan manual tersimpan di browser. Halaman publik tetap memakai tema existing.
- Scrollbar sidebar mengikuti tema dan diuji saat menu panjang. Screenshot Beranda, Kanban, Kalender, dan drawer diperiksa pada desktop/mobile; regresi fixture 320/390/768/1440 lulus.
- Lint ERP, TypeScript ERP, dan build produksi lokal lulus. UAT pengurus dan perangkat fisik tetap belum diverifikasi.

- Launcher UAT interaktif membaca default lokal dengan izin `0600`. Lima tes launcher lulus dan pembacaan konfigurasi lokal diverifikasi tanpa menjalankan sesi UAT.

- Verifikasi animasi memakai `Docs/frontend-animation-rules.md`. Cakupan regresi meliputi fokus saat langkah berubah, tooltip keyboard, tinggi penutupan Arsip Proker, fallback accordion, serta resize, pointer cancel, dan pengumuman slide pada carousel.
- `npm run build`, TypeScript ERP, lint terarah, dan `frontend-motion-browser.cjs` lulus pada build produksi lokal. `erp-ux-browser.cjs` lulus pada 320/390/768/1440 px.
- Uji Chromium memakai fixture API, emulasi sentuh, dan simulasi jalur fallback accordion. UAT pengurus serta perangkat sentuh fisik masih terbuka. File voting masih memiliki tiga error `no-explicit-any` lama.

- Layout pengurus selesai diverifikasi. Regresi fixture pada 320/390/768/1440 px mencakup ringkasan Beranda, agenda selebar konten, penambahan tugas dan retry, tenggat tengah malam WIB, grup Proker lintas halaman, dan submenu sesuai peran.
- `npm run lint -- app/admin app/lib/erp`, TypeScript ERP, build produksi, dan regresi Chromium inti/P1 melalui PostgreSQL sementara lulus. Transaksi fixture di-rollback dan server PostgreSQL sementara dihentikan.
- UAT oleh pengurus dan pengujian sentuh pada perangkat fisik masih terbuka. Tangkapan layar lokal Beranda, Kalender, Kanban, grup Proker, dan drawer tersedia di `/tmp/webuft-layout-*.png`.

- P0/P1 tetap diterapkan; head lokal 0003_task_review setelah persetujuan target loopback, preflight dan backup 0600. PostgreSQL tetap 30 tabel ERP + 21 tabel lain; data operasional kembali kosong setelah test rollback.
- Bukti terbaru E23: 108 test backend lulus (45 PostgreSQL); tambahan pagination dan penolakan endpoint status setelah close/arsip diuji ulang terarah. Regresi Next production + FastAPI + PostgreSQL untuk alur inti dan P1 lulus; detail pada REQUIREMENTS.md.
- Uji UI fixture browser lulus pada 320/390/768/1440: kondisi kosong, tambah inline, drag mouse/keyboard/sentuh emulasi, konflik 409, kalender dan agenda. Screenshot 320/1440 diperiksa. Pratinjau/draft formulir bertahan saat refresh; versi dasar edit tidak mengikuti versi eksternal diam-diam.
- UAT lokal tetap ./start.sh --uat (3200); development ./start.sh (3000). Checklist UX tambahan di Docs/implementation/UAT.md perlu diisi pengurus; penerimaan manusia/G5 belum lulus. Tidak ada akun operasional menetap atau deploy pada pekerjaan UX ini.
- Build produksi dan lint ERP lulus. TypeScript memakai tsconfig.erp-ui.json untuk menghindari validator .next/dev lama yang rusak; batas bukti dan perintah tercatat pada E23. Arahan desain gpt-taste + Impeccable tetap berlaku.
- Belum terbukti: perangkat sentuh fisik, Compose/HTTPS/VPS, backup off-host, restore DB+media berisi histori operasional dan race seluruh endpoint HTTP. Ikuti REQUIREMENTS.md/RUNBOOK.md; backup storage private wajib berpasangan.

- UAT rollback lokal kini menerima catatan `login_attempts` yang sudah ada bila tabel ERP lain kosong; data existing tidak dihapus.
- `./start.sh --uat --check` lulus untuk delapan peran, browser, media dan rollback. Mode interaktif mencapai halaman login lalu dihentikan normal; rollback terverifikasi.
- Pengurus dapat menjalankan `./start.sh --uat` dan mengisi checklist `Docs/implementation/UAT.md`; penerimaan manusia masih terbuka.

- Inventaris form dan bukti verifikasi ada di `Docs/implementation/FORM_UX_AUDIT.md`. Perubahan memakai kontrak API serta izin existing.
- Build, TypeScript, lint terarah, dan regresi Chromium inti/P1 lulus dengan PostgreSQL sementara yang sudah dihentikan.
- Fixture UX dan motion lulus pada desktop/tablet/mobile. Lint seluruh frontend masih memiliki temuan existing pada halaman publik dan runner CommonJS.
- Voting dan chat legacy diperiksa dengan fixture HTTP. UAT pengurus, perangkat sentuh fisik, dan layanan legacy aktif masih belum diverifikasi.
