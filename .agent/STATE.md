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

- Alur pengurus dan peserta sudah melalui regresi produksi lokal. Chromium menguji papan asal, kesiapan serah terima, bukti ke-101, pinjam/kembali, publikasi, serta kirim ulang setelah koneksi terputus.
- Suite integrasi lulus 111 tes. Build, TypeScript, lint terarah, regresi UX/motion, dan launcher UAT delapan peran lulus. Launcher memverifikasi rollback dan pembersihan media.
- Skenario penerimaan berbasis tujuan tersedia di Docs/implementation/UAT.md. Pemahaman pengurus/peserta dan pengalaman pada perangkat fisik menunggu sesi manusia.

- Intro shutter beranda publik sudah diuji di Chromium pada 320, 390, dan 1440 px dengan data acara fixture. Susunan delapan PNG cocok dengan master dan frame awal, tengah, akhir diperiksa.
- Regresi `node frontend/tests/shutter-intro.cjs` mencakup kunjungan pertama, kunjungan ulang, tab baru, reduced motion, storage diblokir, aset gagal, JavaScript nonaktif, serta interaksi beranda.
- Build produksi dan TypeScript lulus. Lint terarah mencatat tiga warning lama pada landing page. Pengujian Safari dan perangkat fisik belum dilakukan.

- Arahan aktif pengguna hanya mencakup entrance. Shutter membuka ke carousel asli, satu kali per sesi tab. Reduced motion dan tautan langsung ke bagian beranda melewati intro.
- HTML navbar, konten utama, dan footer pada build produksi cocok persis dengan build lokal 21 November sebelum redesign.
- `shutter-intro.cjs` dan `frontend-motion-browser.cjs` lulus di Chromium dengan fixture API. Intro, poster, navigasi seluler dan keyboard diperiksa pada viewport 320/390/768/1440 px; Safari dan perangkat fisik belum diuji.
- Build produksi beserta TypeScript lulus. Lint terarah melaporkan tiga peringatan variabel lama pada halaman asli.

- Aturan satu kali per sesi tab sudah diganti. Refresh beranda memutar ulang intro, termasuk saat URL memuat fragmen. Kunjungan langsung lewat tautan fragmen dan Reduce Motion melewati intro.
- Regresi Chromium dengan fixture API lulus pada 320/390/768/1440 px, termasuk hard refresh dan penyimpanan sesi diblokir. Build produksi dan lint komponen lulus.
- Safari dan perangkat fisik belum diuji.

- Intro beranda menampilkan pencarian fokus ke tiga arah sebelum mengunci bidikan, menampilkan logo, dan membuka shutter dalam tiga detik.
- Build produksi dan `node frontend/tests/shutter-intro.cjs` lulus. Arah gerak dan penguncian fokus diperiksa pada 390 dan 1440 px. Regresi refresh dan Reduce Motion lulus di Chromium.
- Safari dan perangkat fisik belum diuji untuk gerakan baru.

- Tempo pencarian fokus diperlambat. Bidikan diam 144 ms di masing-masing dari tiga titik sebelum mengunci fokus, dengan durasi intro total 3,6 detik.
- Build produksi, lint komponen, dan regresi Chromium lulus. Posisi diam diperiksa pada 390 dan 1440 px.
- Ritme baru diverifikasi pada Chromium lokal dengan fixture API.

- `/announcement` menampilkan status menunggu hasil resmi sesuai arahan pengguna. Nama dan penempatan yang disetujui untuk publikasi dapat diisi di `frontend/app/announcement/selection-data.ts`.
- Build produksi, lint terarah, dan regresi intro beranda lulus. Chromium memeriksa navigasi, fokus, parallax, dan Reduce Motion pada 320/390/768/1440 px.
- Pengelompokan, pencarian, dan jumlah peserta teruji di salinan lokal dengan fixture. Safari dan perangkat fisik belum diuji.

- `/announcement` kini memutar intro strip film 1,2 detik saat halaman dibuka atau dimuat ulang. Tautan langsung ke hasil dan Reduce Motion melewati intro.
- Mode simulasi berisi 15 nama fiktif dalam tiga departemen. `showDemo` di `selection-data.ts` memilih antara simulasi dan daftar resmi.
- Build, lint, regresi shutter, dan uji intro pengumuman di Chromium 320/390/768/1440 px lulus. Safari dan perangkat fisik belum diuji.

- Frame layar gelap dengan indikator kamera dan bukaan wajik diverifikasi di Chromium pada 390 dan 1440 px.
- Build produksi, lint kedua komponen intro, dan regresi Chromium pada 320/390/768/1440 px lulus. Regresi memeriksa akhir otomatis, navigasi keyboard, Reduce Motion, dan tautan langsung ke hasil pengumuman.
- Safari dan perangkat fisik belum diuji untuk intro ini.

- Ukuran indikator kamera dan keterbacaan label diverifikasi di Chromium pada 320, 390, 640, 768, dan 1440 px. Frame pada 640 px memastikan dua baris atas tidak bertabrakan.
- Build produksi, lint `ShutterIntro.tsx`, dan `node frontend/tests/shutter-intro.cjs` lulus, termasuk regresi bidikan, refresh, dan Reduce Motion.
- Bukti visual berasal dari Chromium lokal. Safari dan perangkat fisik belum diuji.
