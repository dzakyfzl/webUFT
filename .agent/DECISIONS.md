# Decisions

## 2026-11-17 — Verifikasi race/restore dan snapshot Jejak

- Pengguna mengizinkan satu fixture periode race yang di-commit lalu dibersihkan tanpa akun, serta satu database PostgreSQL restore sementara yang dihapus setelah pemeriksaan. Runtime tetap memakai target existing; database restore tidak dipakai sebagai fallback aplikasi.
- Nama pengurus untuk Jejak disimpan dalam event arsip JSONB; actor positions diambil dari snapshot otorisasi sebelum mutasi. Perubahan nama/jabatan master berikutnya tidak menulis ulang histori. Mutasi nama global mengambil lock periode sebelum snapshot pengguna agar konsisten dengan archive.
- Reader audit P0 dibatasi resource Proker/tugas terkait yang memang boleh dibaca pengurus aktif; tidak membuka audit akun global atau secret/PII. UI aktivitas memakai label manusia, bukan dump payload internal.

## 2026-11-17 — Migrasi target dan isolasi test

- Pengguna menjawab “Izinkan migrasi baru dan test rollback tersebut” setelah preflight dan review baseline. Baseline hanya membuat schema ERP + tabel versi baru; 20 tabel lama tidak diubah. Backup lokal owner-only dibuat sebelum eksekusi; off-host/restore tetap belum terbukti.
- Integration fixture memakai outer transaction pada target PostgreSQL existing dan savepoint per request. Tidak memakai SQLite/database pengganti dan tidak meninggalkan akun test. Browser memakai Next/API test milik proses, satu connection yang diserialkan, kredensial memori/stdin dan rollback di teardown; pola ini bukan bukti race dua transaksi.
- Test nyata menemukan autoflush saat PIC di-resolve sebelum task lengkap. PIC kini di-resolve sebelum task baru ditambahkan ke Session; test PIC, provenance multi-task/manual dan rollback audit lulus. Hindari mengganti pemeriksaan FK hanya agar test lulus.

## 2026-11-17 — Persetujuan implementasi dan aturan D01–D07

- Pengguna menjawab “Setujui seluruh paket tersebut” untuk FastAPI, Uvicorn, SQLAlchemy 2, Alembic, psycopg, argon2-cffi, pytest dan httpx. Paket dipasang di Backend/.venv; versi resolved dipin di requirements.lock. Tidak ada paket frontend baru.
- Pengguna menjawab “Setujui seluruh usulan D01–D07” setelah rincian ditampilkan: Inti menyiapkan penerus lalu Ketua Umum arsip; assignment HR/UKM oleh Inti; grant mengikuti provenance (cabut manual tidak menghapus PIC); grant Ketupel lama berakhir; pengelola mengisi panitia tetapi struktur hanya Ketupel dan referensi harus dipindah sebelum penghapusan; Jadwal Saya agregat tanpa transfer scope; owner dipilih Inti saat create dan tidak dapat diganti.
- PostgreSQL existing dari .env diperiksa read-only: schema ERP belum ada, tabel existing dipertahankan. Baseline baru hanya membuat schema erp_ukm, 17 tabel dan indeks, serta tabel versi Alembic terpisah; tidak mengadopsi atau mengubah histori/migrasi backend lama. Izin eksekusi migrasi dan test rollback masih menunggu jawaban pengguna.
- Frontend pengurus memakai Geist existing dan CSS scoped merah–hitam menurut gpt-taste yang dibatasi konteks ERP pada AGENTS.md. Pola promosi/GSAP tidak dipasang. Rewrite ERP mempertahankan prefix /api/admin; API publik ditunda tetap terpisah.

## 2026-11-17 — Kontrak perubahan lifecycle dan konfigurasi

- Domain create/close mengembalikan record, delta grant dan audit sebagai satu hasil untuk adapter transaksi; tidak menyimpan state in-memory sebagai database pengganti. Adapter nanti wajib lock periode → Proker serta persist atomik. Test domain tidak membuktikan atomicity PostgreSQL.
- Close mengakhiri grant aktif Proker, menjaga detail historis dan tidak menghasilkan perubahan task. Retry sah atas Proker CLOSED menghasilkan no-op tanpa audit duplikat. Pemilihan owner/pencabutan PIC/Ketupel lama tidak diselesaikan melalui asumsi.
- Konfigurasi memakai URL SQLAlchemy `postgresql+psycopg`, tanpa fallback; production membutuhkan origin HTTPS. Pool default 3 + overflow 2 dan satu worker mengikuti rencana resource kecil; nilai tersebut belum hasil benchmark atau bukti koneksi aktif.

## 2026-11-17 — Awal implementasi dan bukti parsial

- Instruksi pengguna terbaru mengizinkan implementasi dan test dengan batas 20 loop; batas planning sebelumnya tidak lagi menghentikan pekerjaan aplikasi. Penghitung kumulatif disimpan di `Docs/implementation/LOOPS.md`, tanpa mereset hitungan saat turn berganti.
- Policy domain dibuat tanpa dependensi sambil menunggu persetujuan paket. Pilihan ini memungkinkan pengujian aturan final tanpa menganggap D01–D07 sudah disetujui. Test snapshot tidak menggantikan bukti endpoint, transaksi atau race PostgreSQL.
- RAB memakai Decimal dari string, pembulatan HALF_UP per baris ke rupiah dan grand total dari baris yang dibulatkan. Float tidak diterima agar total yang terlihat tidak berbeda dari total server; tidak memakai approval/threshold anggaran. Batas presisi input dicatat pada kontrak domain awal.
- Alternatif pemasangan paket otomatis atau pengaktifan kebijakan produk yang masih terbuka tidak dipakai karena instruksi repo mewajibkan persetujuan. Belum ada koneksi/migrasi database atau perubahan frontend publik.

## 2026-11-17 — Acuan ERP pengurus setelah klarifikasi PRD

- Keputusan pengguna: PRD v1.6 menjadi acuan aktif; pekerjaan sekarang fokus alur pengurus. Integrasi API publik ditunda sehingga pemulihan backend publik bukan ketergantungan rilis P0.
- Stack: Next.js dan FastAPI modular monolith mengikuti Compose existing, dengan PostgreSQL di luar Docker. Rekomendasi Vite/static frontend dan database Compose pada v1.5 digantikan keputusan eksplisit pengguna; jangan menambah container database untuk development/test.
- Otorisasi: semua pemegang 12 jabatan Inti aktif mengelola akun/organisasi; tidak ada mandat tambahan per orang. Anggota bidang mewarisi departemen. Izin operasional Proker tetap lewat assignment, termasuk grant otomatis kepada pencipta, Ketupel berakun, dan PIC tugas Proker; sumber grant perlu dibedakan untuk menjaga histori serta pencabutan akses.
- Histori: Jejak seluruh progres periode hanya diarsipkan Ketua Umum dan dibaca kepengurusan berikutnya. Arsip membekukan progres tanpa memalsukan tugas belum selesai menjadi DONE. Pergantian Ketupel oleh Inti mempertahankan progres dan histori.
- Klarifikasi kalender: semua pengurus dapat menggunakannya, tetapi mutasi mengikuti unit/assignment Proker. Penafsiran bahwa seluruh pengurus boleh mengedit seluruh kalender tidak dipakai, sesuai jawaban pengguna.
- Belum final: alur serah terima periode, pengelola assignment manual Proker nondepartemen, pencabutan grant PIC/Ketupel lama, dan rincian operasi panitia/transfer scope; lihat §18 PRD v1.6. Jangan menganggap usulan teknis sebagai keputusan pengguna.

## 2026-11-17 — Batas planning dan koordinasi paralel

- Pengguna memilih “Selesaikan dokumen planning dahulu.” Permintaan subagent dilaksanakan untuk penyusunan dan review rencana; tidak memberi izin memulai implementasi aplikasi pada tahap ini.
- Rencana pelaksanaan memisahkan ownership fondasi/scope, operasional Proker, dan frontend. Koordinator menjadi satu pemilik kontrak shared, manifest, migrasi, dan deployment karena file agregator serta perubahan schema rawan benturan bila ditulis bersama.
- Alternatif banyak agent membuat revision/mengubah lockfile secara bersamaan tidak dipakai. Kontrak dikunci sebelum domain/frontend berpisah; migrasi dan mutasi target database tetap serial meski penulisan modul paralel.
- Usulan produk D01–D07 pada rencana tetap untuk review, tidak mengubah status keputusan terbuka PRD §18. Hasil verifikasi dokumen tidak boleh dianggap bukti backend, database atau deployment sudah berjalan.

## 2026-11-17 — Arahan visual dan skill desain khusus webUFT

- Keputusan pengguna: palet kurang lebih merah dan hitam, komponen design system boleh berasal dari 21st.dev, serta gunakan gpt-taste khusus project ini. Nilai warna final dan pemilihan komponen belum dikunci; arahan ini menjadi acuan desain frontend pengurus berikutnya.
- gpt-taste dipasang lokal dengan revision upstream tetap dan diregistrasikan di `AGENTS.md`, agar instruksi dapat dipakai ulang oleh agent dalam repo. Instalasi global tidak dipakai karena pengguna membatasi scope pada project ini; pengecualian Git hanya untuk instruksi root dan skill terpilih agar ikut branch.
- Penerapan teknis mengikuti konteks ERP/mobile-first serta batas pelestarian halaman publik. Pola promosi AIDA/hero/scroll sinematik tidak dijadikan kewajiban pada dashboard/form/tabel; alternatif tersebut tidak sesuai alur pekerjaan harian. Permintaan ini mencatat desain dan memasang skill, bukan memulai implementasi aplikasi; paket tambahan tetap memerlukan persetujuan.

## 2026-11-18 — Identitas anggota dan direktori pengurus

- Akun baru dapat menggunakan anggota tanpa akun yang sudah tercatat. Backend mengunci identitas anggota dan menolak akun kedua dengan 409; nama existing dipertahankan. Alternatif membuat identitas baru untuk setiap akun ditolak karena memutus keterkaitan anggota. Periode berikutnya tetap memakai akun existing melalui membership.
- Daftar akun/anggota memakai pencarian literal dan pagination dengan urutan stabil. Direktori aktif maupun snapshot Jejak memakai kontrak `items/has_more`; frontend menggabungkan seluruh halaman sebelum menampilkan pilihan edit PIC/Ketupel/panitia. Pemotongan diam-diam pada 500 akun dan menampilkan form edit dengan pilihan yang belum lengkap tidak dipakai karena dapat menghilangkan identitas atau pilihan existing.

## 2026-11-18 — Identitas tunggal dan direktori lengkap

- Pembuatan akun boleh memakai anggota tanpa akun yang sudah tercatat; baris anggota dikunci dan akun kedua ditolak dengan 409. Nama identitas existing dipertahankan. Alternatif membuat anggota baru untuk setiap akun ditolak karena memutus hubungan identitas.
- Direktori memakai offset/limit dan has_more pada data aktif maupun snapshot arsip. Frontend mengumpulkan seluruh halaman sebelum membuka form yang memakai pilihan akun; alternatif memotong diam-diam pada 500 atau memasang default select sebelum data lengkap ditolak karena dapat menghilangkan pilihan PIC/Ketupel.
- Struktur unit resmi tetap sesuai PRD. Kelanjutan ini tidak menambah dependensi maupun perubahan schema; account/member tetap dipisahkan dari nama panitia per-Proker.

## 2026-11-18 — Perluasan seluruh P1

- Pengguna meminta seluruh P1 dan menyetujui publikasi tanpa approval, freeze terkait Proker/periode, stale form 409 dengan pemulihan isian, request ID idempotent, akses PII pembuat/petugas, ekspor per versi dan tanpa penghapusan otomatis PII. Alternatif akses respons otomatis untuk semua Inti ditolak demi batas privasi PRD.
- Migrasi tambahan 0002_p1 (13 tabel dan trigger versi form immutable) serta test rollback pada target lokal yang sama disetujui setelah preflight/backup. Baseline tidak diubah.
- Inventaris lintas periode menjaga kesinambungan barang; pengelola harus anggota aktif Asset dan Property pada periode yang dipakai. Identitas peminjam dan rujukan vault hanya dibaca pengelola. Proker/acara/short link tetap terkait periode.
- Tidak menambah paket: upload raw stream PDF/PNG/JPEG/WebP/TXT/CSV, XLSX XML inline string ke ZIP spool disk, CSV streaming. Batas awal 100 pertanyaan/20 bagian/50 opsi; ekspor per versi maksimal 10000 respons dan 20 MiB jawaban. Empat field template dapat dihapus seluruhnya.

## 2026-11-18 — Sesi UAT lokal sebelum penggunaan operasional

- UAT pengurus menggunakan PostgreSQL existing dengan fixture outer rollback/savepoint yang sudah diizinkan, hanya pada host loopback non-production dan tabel ERP kosong. Akun peran memakai password sesi melalui prompt tersembunyi; alternatif seed akun permanen/bootstrap operasional otomatis ditolak karena penerimaan lokal tidak memerlukan data menetap.
- Sesi UI terpisah pada 3200/8200 dengan build Next development tersendiri, media sementara dan cleanup pada Ctrl+C/SIGTERM. Request diserialkan karena memakai satu transaksi; alternatif menjadikannya bukti race/load konkuren tidak dipakai. Tidak menambah dependensi atau migrasi.
- Checklist 37 UAT memisahkan hasil manusia dari pemeriksaan launcher otomatis. Backup eksternal tidak dapat mendump fixture yang belum commit; restore histori/media operasional dan Compose/HTTPS tetap prosedur teknis terpisah, bukan dilabeli lulus dari sesi rollback.

## 2026-11-18 — Entrypoint launcher UAT

- start.sh mendelegasikan mode --uat melalui exec ke launcher Python yang memegang lifecycle/rollback, sehingga sinyal penghentian diterima langsung oleh pemilik transaksi. Perilaku default tetap development biasa agar penggunaan operasional tidak tanpa sengaja memakai data sementara. Duplikasi seed/cleanup UAT di shell tidak dipakai.

## 2026-11-18 — Impeccable sebagai pendamping desain

- Pengguna menambahkan Impeccable untuk teks UI, animasi, layout, terutama border dan komponen agar tidak terlalu kaku. gpt-taste tetap menjadi acuan bersama; menggantinya sepenuhnya tidak dipilih karena permintaan ini bersifat tambahan.
- Keluwesan visual mengikuti kebutuhan kerja pengurus: pengelompokan dan jarak mengurangi kotak yang berulang, sementara batas kontrol, fokus, kontras dan preferensi pengurangan gerak tetap terjaga. Arahan berlaku pada pekerjaan UI berikutnya; permintaan ini tidak menetapkan halaman untuk langsung diubah.

## 2026-11-18 — Kanban empat tahap dan kalender bulanan

- Review adalah status REVIEW biasa, bukan persetujuan wajib; semua pemegang izin edit task tetap dapat berpindah langsung ke DONE. Migrasi 0003 hanya memperluas constraint; downgrade ditolak bila masih ada REVIEW agar histori tidak dikonversi diam-diam. Pengguna menyetujui target PostgreSQL lokal setelah preflight, backup dilakukan sebelum upgrade.
- Papan digunakan bersama pada Beranda, unit dan Proker; count dihitung sebelum pagination/filter status agar jumlah tidak menyiratkan hanya kartu yang dimuat. Mutasi status terpisah dari edit detail agar PIC/grant tidak berubah. dnd-kit/react 0.5.3 disetujui sebagai satu paket langsung; alternatif drag desktop saja ditolak karena kebutuhan sentuh/keyboard.
- Kalender memakai WIB, grid Minggu–Sabtu enam baris, dan query agenda 30 hari dari hari ini terpisah dari bulan terpilih. Tanggal tugas/Proker tetap turunan sumber. Struktur kosong dan data selama refresh dipertahankan; kegagalan refresh ditandai, bukan dianggap data kosong. Pratinjau/draft formulir tidak di-remount hanya karena versi server berubah.
- Editor formulir mempertahankan base version lokal saat resource diperbarui. Versi server baru tidak otomatis menjadi izin menimpa draft orang lain; pemulihan memakai aksi Muat draft server dengan konfirmasi. Alternatif mengikuti registration.version setiap refresh ditolak karena dapat melewati konflik optimistic locking.
- Identitas editor struktur panitia mengikuti data kelompok yang sudah diterima, bukan versi metadata Proker yang dapat tiba lebih dahulu. Ini menjaga hasil template terlihat setelah refresh tanpa menginisialisasi editor dengan kelompok lama; regresi browser inti diuji ulang dan lulus.

## 2026-11-18 — Lebar kalender dan umpan balik antarmuka

- Kalender bulanan memakai baris penuh di Beranda. Lebar wadah menentukan kapan kisi beralih dari label kegiatan ke hitungan per tanggal agar tujuh hari tetap terbaca di layar sempit. Alternatif mempertahankan kalender dan Proker dalam satu baris mempersempit kisi saat sidebar terbuka.
- Fallback rute Next.js, pemuatan data, dan tindakan ERP berbagi indikator. Motion ringan memakai CSS dengan reduced motion agar masukan pengguna tetap langsung dan tidak perlu paket tambahan atau jeda buatan.

## 2026-11-18 — Ringkasan Beranda dan pengelompokan pengurus

- Pengguna memilih tiga ringkasan di Beranda. Data personal tetap berasal dari endpoint dashboard. Papan dan kalender lengkap dipindahkan ke halaman masing-masing agar ketiga ringkasan bisa diperiksa tanpa melewati tampilan kerja penuh.
- Program aktif dikelompokkan sekali menurut ID unit pemilik. Penugasan dari daftar Proker Saya dipakai sebagai penanda, karena hak edit tidak selalu berarti ditugaskan. Arsip dimuat saat dibuka. Pendekatan ini mempertahankan API dan menghindari perpindahan filter untuk melihat tiap unit.
- Warna kolom menyatakan status, sedangkan warna badge dan teks menyatakan jarak tenggat kalender WIB. Satu formulir tugas menerima pembuka dari Beranda, toolbar, atau status kolom agar draft dan validasi tetap berada pada alur yang sama.

## 2026-11-19 — Panduan animasi dan dqnamo Kitchen

- State formulir, detail yang dapat dibuka, dan pengiriman berkas memakai kontrol HTML yang sudah menjadi kontrak UI. Pola animasi dqnamo disesuaikan dengan CSS, Base UI, dan Framer Motion yang terpasang. Dependensi kedua dan perubahan alur formulir akan menambah biaya pemeliharaan.
- Sorotan beranda memakai hingga lima acara publik yang memiliki poster. Sumber ini membuat gestur carousel dapat dipakai dengan materi yang benar-benar diterbitkan. Daftar acara berderet tetap memakai gulir horizontal karena pengguna dapat melihat beberapa kartu sekaligus.
- Preferensi tema dan reduced motion mengikuti pengaturan sistem. Transisi arah dipakai untuk editor/pratinjau dan bentuk alur dua tahap yang sudah ada.

## 2026-11-19 — Interupsi animasi dan fokus

- Semantik `<details>` dipertahankan. Fallback pengukuran tinggi hanya diperlukan saat `::details-content` tidak tersedia. Mengganti seluruh accordion dengan kontrol buatan akan memperbesar perubahan pada navigasi, fokus, dan pembukaan formulir dari tombol pintas.
- Carousel menghitung posisi awal sebelum menerima drag. Pengukuran pertama yang tertunda bisa memutus pointer capture meskipun ukuran viewport masih sama.

## 2026-11-19 — Password sesi UAT lokal

- Default password disimpan di file privat yang dibaca launcher interaktif. Menaruh nilainya di source atau `.env` bersama akan memperluas akses. Mode pemeriksaan browser tetap membuat password acak per sesi.
## 2026-11-19 — Agent desain frontend dan tema ERP

- Agent khusus proyek disimpan sebagai custom agent Codex di `.codex/agents/frontend_design_fixer.toml`, agar audit visual dan perbaikan ERP dapat dipanggil ulang tanpa mengubah konfigurasi global. Alternatif instruksi global tidak dipakai karena cakupannya hanya webUFT.
- Tema pengurus memakai token terpisah di `erp-theme.css` dan atribut `data-erp-theme`, dengan pilihan Sistem/Terang/Gelap yang disimpan lokal. Ini menjaga palet publik tetap mandiri; alternatif mengubah token global ditolak karena akan memengaruhi halaman publik.
- Scrollbar navigasi memakai warna track dan thumb dari tema. Warna tahap Kanban tetap punya identitas masing-masing pada kedua mode; alternatif menyamaratakan latar kolom ditolak karena menghilangkan pembeda status.

## 2026-11-19 — Pengecualian catatan login pada UAT rollback

- Syarat tabel kosong untuk UAT lokal mengecualikan `login_attempts`, karena percobaan login gagal dapat meninggalkan penghitung tanpa akun atau data kerja. Jumlah baris tabel ini tetap dibandingkan setelah rollback. Alternatif menghapus penghitung atau menerima seluruh data ERP ditolak untuk menjaga data dan isolasi UAT.


## 2026-11-20 — Interaksi formulir ERP

- Quick-add Kanban memakai lingkup dan status kolom yang sudah dipilih. Tugas Saya memakai pengguna aktif sebagai PIC awal. Editor detail menangani perubahan atribut dan tetap mengirim ke endpoint yang sama.
- Editor kontekstual memakai dialog HTML agar fokus, Escape, dan latar inert mengikuti browser. Penyuntingan panjang Proker baru tetap di halaman khusus, sedangkan perubahan singkat seperti peralihan status daftar tetap inline.
- Builder menyunting satu pertanyaan atau bagian sekaligus. Draft dan versi dasar bertahan saat berpindah tab dan saat data disegarkan, karena mengambil versi server otomatis dapat menimpa perubahan organizer.
- RAB menampilkan taksiran subtotal dengan aritmetika desimal yang dibulatkan per baris. Total tersimpan tetap dibaca dari backend agar angka otoritatif tidak bergantung pada floating point browser.

## 2026-11-21 — Perpindahan kerja antarperan

- Kesiapan Ketua penerus dan status penerimaan peserta dihitung memakai aturan backend yang juga memvalidasi tindakan akhirnya. Indikator frontend yang hanya memeriksa pilihan periode atau versi formulir bisa mengizinkan tindakan yang kemudian ditolak.
- Pengelola membuka Dokumen dari formulir realisasi di tab baru. Saat kembali, pemilih bukti memuat ulang semua halaman dokumen. Cara ini menjaga isian nominal dan tanggal di dialog tanpa menyimpan data keuangan pada penyimpanan browser.

## 2026-11-22 — Intro shutter beranda publik

- Penanda kunjungan disimpan di localStorage ketika delapan aset siap dan animasi mulai. sessionStorage akan mengulang intro di tab baru, sedangkan penanda di layout global dapat menghabiskan kunjungan pertama di halaman admin.
- Koordinat potongan dan engsel bilah memakai ruang gambar PNG master agar logo dapat disusun ulang persis dan bukaan mengikuti bentuk diafragma aslinya. Bilah geometris generik tidak mempertahankan kontur logo.

## 2026-11-22 — Beyond the Frame

- Penyimpanan sesi tab menggantikan penanda permanen sesuai storyboard baru. Skrip HTML memulai satu timeline CSS dengan batas waktu mandiri agar hidrasi atau unduhan foto yang lambat tetap menghasilkan beranda yang dapat diakses.
- Enam path SVG berasal dari kontur alfa bilah master. Satu elemen foto memakai mask selama pembukaan dan tetap menjadi hero setelahnya. Pendekatan ini menghindari duplikasi gambar, sinkronisasi dua elemen, dan dependensi animasi tambahan.
- Seri referensi disimpan lokal di direktori studi terpisah. Galeri anggota tetap mengambil data album, sehingga foto sementara tidak pernah mendapat kredit sebagai karya anggota.
- Pembukaan mengandalkan font dan stylesheet yang disajikan oleh build Next. Memuat Yesteryear dari Google Fonts pada setiap kunjungan menambah permintaan yang menahan render pertama, sementara tidak ada komponen yang memakai font tersebut.

## 2026-11-22 — Entrance pada landing page asli

- Pengguna membatasi perubahan pada animasi masuk. Shutter memakai lapisan sementara di atas beranda yang sudah terpasang agar bukaan langsung memperlihatkan poster dan navigasi asli. Hero pengganti dan rute pameran terpisah berada di luar cakupan.

## 2026-11-23 — Putar ulang intro saat refresh

- Siklus dokumen menggantikan penanda `sessionStorage` agar refresh selalu dapat memulai intro, termasuk ketika penyimpanan browser diblokir. Untuk URL berfragmen, tipe navigasi `reload` memicu intro dan kunjungan langsung tetap membawa pengunjung ke bagian tujuan tanpa intro.

## 2026-11-23 — Pencarian fokus shutter

- Pencarian fokus memakai kotak bidik dengan jarak sapuan mengikuti ukuran viewport. Fase logo dan bukaan digeser dalam timeline CSS yang sama agar pengunjung melihat fokus terkunci tanpa tambahan durasi atau logika JavaScript.

## 2026-11-23 — Jeda pencarian fokus

- Pasangan keyframe dengan posisi yang sama memberi jeda nyata di tiap titik bidik. Durasi intro dinaikkan menjadi 3,6 detik agar tiga jeda dapat masuk tanpa mempercepat sapuan atau bukaan shutter.

## 2026-11-23 — Publikasi hasil seleksi

- Sumber pengumuman berupa daftar terkurasi yang diisi setelah nama dan penempatan disetujui untuk publikasi. Data keanggotaan ERP mencatat keanggotaan operasional dan bisa berbeda dari hasil seleksi, sehingga dipisahkan dari pengumuman ini.
- Framer Motion menggerakkan foto dan bingkai bidik sejak guliran pertama agar parallax tetap terlihat saat daftar belum diumumkan dan halaman masih pendek. Nama peserta serta kontrol pencarian mengikuti guliran biasa untuk menjaga keterbacaan.

## 2026-11-23 — Intro dan demonstrasi pengumuman

- Intro pengumuman memakai gerakan strip film dan satu sapuan mendatar. Timeline CSS berakhir sendiri agar halaman segera terbuka saat hidrasi lambat, JavaScript gagal, atau foto masih dimuat.
- Daftar simulasi dan daftar resmi dipisah supaya mode demo dapat dimatikan dengan satu pilihan, sementara hasil yang sudah dikurasi tetap utuh.

## 2026-11-24 — Intro beranda dan pengumuman

- Lapisan intro bersifat dekoratif dan meneruskan klik ke halaman. Input penunjuk menutup intro seperti input keyboard, sehingga pengunjung bisa langsung memakai navigasi tanpa menunggu animasi selesai.

- Empat titik pada poligon `evenodd` memotong lapisan gelap dari tengah untuk membuka shutter berbentuk wajik. Cara ini langsung memperlihatkan beranda yang sudah terpasang tanpa menambahkan foto atau menggandakan konten hero.

## 2026-11-24 — Keterbacaan indikator kamera

- Pada lebar hingga 42 rem, metadata foto turun ke baris kedua. Ini memberi ruang untuk mempertahankan ukuran teks utama minimal 16 px pada layar sempit. Ikon yang terbaca di referensi diadaptasi memakai Lucide yang sudah ada di frontend.
