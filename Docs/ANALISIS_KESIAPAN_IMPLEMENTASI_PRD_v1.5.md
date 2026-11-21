# Analisis kesiapan implementasi PRD ERP UKM v1.5

Tanggal: 17 November 2026.

> Pembaruan setelah klarifikasi pengguna: [PRD v1.6](PRD_ERP_UKM_MVP_v1.6.md) menjadi acuan aktif. Analisis di bawah merekam kondisi v1.5 sebelum jawaban pengguna; rekomendasinya tidak boleh mengesampingkan keputusan final v1.6.

| Kelompok temuan | Status setelah klarifikasi |
|---|---|
| G01 — Publik dan stack | Diputuskan: API acara/galeri/karya-voting/file/chatbot ditunda; fokus pengurus; Next.js + FastAPI, Compose existing, PostgreSQL di luar Docker |
| G02 — Administrasi | Diputuskan: seluruh pemegang 12 jabatan Inti aktif dapat mengelola dan memberikan akses; bootstrap akun pertama tetap detail teknis |
| G03 — Keanggotaan/periode | Keanggotaan bidang mewarisi departemen; Jejak periode diarsipkan hanya Ketua Umum. Alur serah terima akun/jabatan berikutnya masih perlu dirinci |
| G04 — Assignment awal | Pencipta dan Ketupel berakun otomatis mendapat assignment. Pengelola assignment manual untuk Proker nondepartemen belum diputuskan |
| G05 — Ketupel/panitia | Ketupel per-Proker; penggantian hanya oleh Inti dan progres tetap. Nasib assignment Ketupel lama serta operasi reset/hapus struktur perlu dirinci |
| G06 — Kalender | Mengikuti hak unit/assignment Proker, sesuai jawaban klarifikasi; bukan semua orang mengedit seluruh agenda. Jadwal pribadi independen belum dirinci |
| G07 — PIC | Diputuskan: penunjukan PIC berakun sekaligus memberi akses edit Proker terkait, termasuk lintas departemen. Pencabutan setelah pergantian PIC dan transfer scope belum diputuskan |
| G08 — Arsip tugas | Diputuskan: tugas tetap tercatat belum selesai di arsip, tidak muncul di kalender aktif; rumus agregat menjadi spesifikasi teknis |

Sumber utama: [PRD ERP UKM MVP v1.5](PRD_ERP_UKM_MVP_v1.5.md), seluruh bagian 0–19. Pemeriksaan kode dibatasi pada kontrak API halaman publik dan konfigurasi frontend yang relevan. Ini merupakan review spesifikasi, bukan audit implementasi atau hasil pengujian aplikasi.

## 1. Kesimpulan

PRD **cukup jelas untuk memulai fondasi dan perancangan MVP P0**, tetapi **belum cukup untuk mengimplementasikan seluruh produk tanpa menebak sejumlah aturan bisnis**. Gap paling penting ada pada otorisasi, periode kepengurusan, pengelolaan Ketua Pelaksana, kalender, dan transisi website publik.

Keputusan yang sudah tegas tidak perlu dibuka ulang: satu UKM, modular monolith, Proker langsung ACTIVE tanpa approval, RAB tanpa approval, akses edit berdasarkan scope/assignment, CLOSED sebagai arsip read-only, panitia tidak wajib berakun, serta template formulir yang seluruh field-nya boleh diubah/dihapus.

Tidak semua kekurangan adalah blocker produk. Pilihan format error API, struktur tabel final, mekanisme sesi, batas panjang input, dan desain transaksi dapat ditentukan melalui spesifikasi teknis. Sebaliknya, menentukan siapa boleh mengubah data organisasi atau mengambil alih Ketua Pelaksana memerlukan keputusan produk.

Seluruh rekomendasi di laporan ini adalah **usulan untuk review**, bukan keputusan final baru dan bukan perubahan terhadap PRD.

## 2. Penilaian per area

| Area | Penilaian | Implikasi |
|---|---|---|
| Tujuan, batas produk, prioritas P0/P1/P2 | Jelas | Dapat menjadi dasar backlog; P1 bukan kewajiban sprint P0 |
| Arsitektur backend | Jelas | Fondasi FastAPI, PostgreSQL, migrasi, batas modul dapat dimulai |
| Proker direct-active dan penutupan | Jelas pada alur utama | Perlu melengkapi kasus pergantian pengelola, penutupan bersamaan, dan tugas tersisa |
| Organisasi, akun, periode, otorisasi | Belum lengkap | Perlu keputusan sebelum policy dan skema relasi dikunci |
| Kepanitiaan fleksibel | Jelas pada kemampuan utama | Perlu aturan penghapusan, reset template, dan pergantian Ketua Pelaksana |
| Kanban | Jelas pada scope | Perlu aturan PIC, pemindahan scope, serta pengaruh scope terhadap hak akses |
| Kalender dan monitoring | Sebagian jelas | Hak mutasi, kalender pribadi, sumber tanggal, dan rumus agregat belum lengkap |
| RAB P0 | Cukup jelas | Validasi angka dan pembulatan dapat dirinci dalam spesifikasi teknis |
| Website publik dan transisi sistem | Belum lengkap | Perlu kontrak pelestarian halaman/API dan keputusan frontend sebelum integrasi |
| Form Builder dan inventaris P1 | Cukup untuk backlog | Belum cukup untuk implementasi penuh; tidak menghalangi fondasi P0 |
| Kriteria rilis | Arah jelas | Parameter beban uji dan pemulihan perlu ditetapkan sebelum rilis nyata |

## 3. Gap produk yang perlu diperjelas sebelum modul terkait dibuat

### G01 — Batas penggantian admin dan kesinambungan website publik

**Rujukan:** §3, §9, §13.2, §15.2, §19; konteks sesi: frontend admin dihapus, landing page dan informasi acara dipertahankan.

PRD mendefinisikan acara, pendaftaran, dan short link sebagai P1, tetapi belum mendefinisikan apa yang harus tetap berfungsi pada website publik selama P0. Halaman publik saat ini masih meminta API acara, album/foto, karya/voting, file, dan chatbot. Contoh: `frontend/app/lib/api.ts` memakai `/api/acara/list`, `/api/album/ambil-semua`, dan `/api/chatbot/chat`; `frontend/app/acara/[id]/page.tsx` memakai `/api/karya/list/...` serta `/api/form/isi/...`. Gallery, voting karya, dan chatbot belum mempunyai pemetaan kebutuhan dalam PRD v1.5. Keberadaan frontend tersebut tidak membuktikan backend-nya sudah tersedia.

React + Vite masih berstatus rekomendasi, sedangkan frontend yang dipertahankan menggunakan Next.js. Diagram dan checklist memakai Caddy, sementara konfigurasi frontend saat ini masih menyebut Nginx. Ini memerlukan rencana transisi, bukan alasan otomatis untuk menulis ulang halaman publik.

**Yang perlu diputuskan:** halaman dan interaksi publik mana yang wajib berfungsi pada rilis P0; status fitur publik yang belum disebut; strategi kompatibilitas URL/API; apakah dashboard tetap dalam Next.js atau frontend terpisah; serta apakah ada data lama yang harus dipertahankan/dipetakan. Penghapusan kode backend tidak membuktikan database lama kosong.

**Usulan:** pertahankan frontend publik dan URL-nya; dokumentasikan kontrak kompatibilitas atau adapter untuk backend pengganti. Jika suatu fitur ditunda, nyatakan perilaku sementara secara eksplisit. Jangan menganggap penundaan editor publik P1 berarti seluruh pembacaan konten publik ikut ditunda.

**Bukti penerimaan:** daftar route/API publik beserta statusnya, contoh payload yang kompatibel, dan skenario regresi tampilan serta interaksi yang disepakati. Migrasi data hanya dirancang setelah target dan kebutuhan data teridentifikasi.

### G02 — Pengelola organisasi, akun pertama, dan cakupan akun Ketua Pelaksana

**Rujukan:** §2.2–2.3, §10, FR-001–005, §18 nomor 2 dan 12.

Hak `manage_users` telah disebut, tetapi siapa yang memperoleh, memberikan, dan mencabutnya belum final. Hak mengubah anggota, unit, jabatan, periode, dan keanggotaan belum dipisahkan dari administrasi akun. Alur akun pertama, reset password, dan pemulihan saat administrator terakhir nonaktif belum ditetapkan.

PRD juga perlu menjelaskan apakah Ketua Pelaksana yang bukan pengurus aktif boleh diberi akun terbatas. §0/§2 menekankan akses scoped ke Proker terkait, sedangkan akses baca lintas Proker diberikan kepada semua pengurus berakun aktif. Kedua aturan bisa konsisten apabila kategori pengguna dan eligibility-nya dibedakan secara eksplisit.

**Yang perlu diputuskan:** pemegang awal dan pemberi mandat `manage_users`/administrasi organisasi; siapa yang boleh mendapat akun; serta apakah akun Ketupel nonpengurus hanya melihat Proker yang ditugaskan atau tidak didukung pada MVP.

**Usulan:** pisahkan hak administrasi akun dan organisasi; sediakan bootstrap awal melalui perintah operator tanpa kredensial hardcoded. Jika akun Ketupel nonpengurus didukung, jangan otomatis memberi hak baca seluruh UKM hanya karena akunnya aktif. Reset password mengatur password baru, bukan menampilkan password lama.

**Bukti penerimaan:** matriks pembuatan/perubahan akun dan struktur organisasi; skenario bootstrap, reset, pencabutan mandat, serta perbedaan akun pengurus aktif dan akun terbatas jika didukung.

### G03 — Keanggotaan bidang, departemen, dan pergantian periode

**Rujukan:** §2.1–2.2, §5.3, §6.1, §12.

Belum jelas apakah anggota Hunting otomatis dihitung sebagai anggota Departemen Internal untuk mengedit papan departemen dan mengelola assignment Proker Internal. Hierarki unit tidak otomatis mendefinisikan pewarisan izin. Model konseptual juga belum menyatakan secara eksplisit bagaimana keanggotaan anggota biasa disimpan ketika ia tidak mempunyai jabatan.

Periode tercantum sebagai data, tetapi belum ada aturan saat periode berakhir: akses alumni, status akun yang masih aktif, Proker yang belum selesai, assignment lintas periode, serta hak membaca arsip.

**Yang perlu diputuskan:** keanggotaan eksplisit atau turunan dari bidang ke departemen; keanggotaan rangkap; definisi pengurus aktif; pengelola keanggotaan; serta kebijakan transisi periode.

**Usulan:** keanggotaan bidang dapat dihitung sebagai keanggotaan departemen induknya jika sesuai praktik UKM; keanggotaan departemen tidak otomatis memberi hak edit semua bidang. Pisahkan status akun, keanggotaan, dan masa jabatan. Perubahan periode tidak menghapus histori.

**Bukti penerimaan:** contoh anggota Hunting, anggota Internal tanpa bidang, anggota HR, dan rangkap jabatan; uji hak sebelum/sesudah masa keanggotaan berakhir serta kasus Proker lintas periode.

### G04 — Pemilik Proker dan akses awal saat dibuat

**Rujukan:** §5.1–5.3, §12, §18 nomor 3 dan 11.

Hak membuat Proker sudah jelas, tetapi pilihan unit pemilik bagi Inti lintas unit masih rekomendasi. Pengelola assignment hanya didefinisikan untuk departemen pemilik; Proker HR atau tingkat UKM belum mempunyai aturan setara. Pemberian assignment kepada pencipta dan Ketua Pelaksana saat pembuatan juga belum final.

**Dampak:** Proker bisa berhasil dibuat, tetapi pencipta/Ketupel tidak dapat mengelolanya; Proker nondepartemen bisa tidak mempunyai pihak yang boleh memperbaiki assignment.

**Usulan:** putuskan unit pemilik yang valid dan pengelola assignment per jenis pemilik. Jika dipilih, pencipta dan Ketupel berakun memperoleh assignment awal secara eksplisit dalam transaksi pembuatan; ini berbeda dari pemberian akses otomatis karena nama panitia. Perubahan unit pemilik harus ditentukan sebagai aksi khusus atau ditunda pada MVP karena mengubah kelompok pemberi akses.

**Bukti penerimaan:** Proker bidang, departemen, HR/UKM jika diizinkan, dan pencipta lintas unit; tidak ada Proker yang kehilangan pengelola assignment setelah dibuat.

### G05 — Pergantian Ketua Pelaksana dan operasi struktur panitia

**Rujukan:** §5.3–5.5, FR-041–044, §14 endpoint kepanitiaan.

PRD membolehkan mengosongkan template/menghapus posisi, tetapi tetap mensyaratkan Ketua Pelaksana otoritatif pada master Proker. Belum jelas siapa yang boleh mengganti Ketupel dan apakah mengganti orang pada peran Ketupel di bagan ikut mengganti pemegang izin. Pengurus departemen juga dapat mencabut assignment Ketupel, sehingga perlu aturan pemulihan saat struktur tidak lagi dapat diubah.

Hak mengubah struktur dan mencatat nama panitia sudah dibedakan secara konsep, tetapi matriks izin untuk tambah/hapus/pindah nama panitia belum lengkap. Hapus divisi beranggota, pecah PDD, gabung divisi, dan kembalikan template belum memiliki aturan penanganan anggota/PIC tugas.

**Usulan:** jadikan identitas Ketupel pada Proker sebagai sumber otoritatif; ubah Ketupel melalui aksi khusus yang diaudit, dengan pelaku yang ditetapkan UKM. Mengubah label bagan tidak mengganti otorisasi. Jika posisi tampilan boleh dihapus, identitas Ketupel operasional tetap harus ada. Operasi hapus/reset harus memindahkan anggota atau meminta penanganan referensi, bukan diam-diam menghilangkan histori.

**Bukti penerimaan:** pergantian Ketupel, pencabutan assignment Ketupel, template kosong, divisi beranggota dihapus, dan anggota yang sudah menjadi PIC tugas dipindahkan/dihapus. Bedakan izin CRUD nama panitia dari izin desain struktur.

### G06 — Kalender belum mempunyai matriks mutasi dan definisi pribadi

**Rujukan:** §4, §6.3, FR-020, §12, §13.3.

PRD menjelaskan siapa dapat melihat kalender, tetapi belum siapa boleh membuat/mengubah/menghapus agenda per scope. `Jadwal Saya` bisa berarti filter agenda yang melibatkan pengguna atau agenda pribadi yang hanya terlihat pemilik; keduanya menghasilkan model akses berbeda. Model scope tugas belum memuat scope personal, sedangkan kalender menyebut agenda pengguna.

Belum ditentukan apakah kalender menampilkan deadline tugas selain tanggal Proker, siapa yang menjadi sumber tanggal ketika agenda terkait Proker diedit, dan apa definisi agenda sensitif. Zona waktu dan dukungan tanggal tanpa jam juga perlu dinyatakan.

**Usulan:** tentukan dulu apakah MVP hanya mempunyai agregasi `Jadwal Saya` atau juga agenda pribadi. Untuk agenda unit/Proker, hak mutasi dapat mengikuti scope yang sama dengan tugas jika disepakati. Tanggal turunan dari Proker/tugas jangan menjadi salinan bebas edit; perubahan harus diarahkan ke sumbernya. Kebijakan agenda sensitif perlu spesifikasi sendiri atau ditunda secara eksplisit.

**Bukti penerimaan:** izin CRUD kalender per scope, agenda pribadi milik orang lain, tanggal tanpa jam, dan satu perubahan tanggal Proker/tugas yang konsisten pada seluruh tampilan.

### G07 — PIC tugas dan pemindahan scope

**Rujukan:** §6.1–6.2, FR-016–019, §12.

Hak edit berdasarkan scope sudah tegas, tetapi belum siapa yang boleh menjadi PIC: apakah dapat menunjuk user luar departemen/Proker; apakah penunjukan PIC memberi assignment Proker; dan apa yang terjadi ketika PIC dinonaktifkan atau assignment-nya dicabut. Kebolehan mengubah scope sebuah tugas juga belum ditentukan.

**Dampak:** pengguna dapat memperoleh tugas yang tidak dapat diperbaruinya, atau perpindahan tugas Proker ke papan Umum dapat menjadi jalan melewati batas izin/arsip.

**Usulan:** penunjukan PIC tidak otomatis memberi hak edit atau assignment. MVP dapat membatasi pilihan PIC berakun pada anggota/pengelola yang sesuai; PIC teks nonakun tetap diperbarui operator. Scope pemilik tugas dapat dibuat tetap pada MVP; jika transfer didukung, perlukan hak pada sumber dan tujuan, audit, dan larangan memindahkan tugas dari Proker CLOSED.

**Bukti penerimaan:** user lintas unit dijadikan PIC, PIC kehilangan akses, panitia nonakun sebagai PIC, dan percobaan transfer tugas yang menghindari batas scope.

### G08 — Nasib tugas tersisa dan angka monitoring setelah penutupan

**Rujukan:** §4.2, §5.6, §6.2–6.4, FR-006/014/021.

Penutupan dengan tugas belum DONE sudah final dan tidak perlu diperdebatkan lagi. Yang belum jelas adalah perilaku tugas tersebut pada `Tugas Saya`, deadline kalender, jumlah terlambat, dan monitoring aktif. Bila semua query hanya memakai status task, tugas arsip dapat terus tampil sebagai pekerjaan terlambat yang tidak bisa diselesaikan.

Monitoring juga belum mendefinisikan apakah ringkasan departemen menyertakan task bidang anak dan task Proker, filter periode, serta penyebut persentase progres jika ditampilkan. Satu task bisa tampil pada ringkasan bidang dan departemen secara sah, tetapi tidak boleh dihitung dua kali dalam total UKM.

**Usulan:** task tersisa mempertahankan status historis; pekerjaan aktif mengecualikan scope Proker CLOSED, dengan filter arsip tersendiri. Rumus agregasi harus menyebut scope yang disertakan, filter periode/arsip, dan aturan total lintas level. Jangan mengubah task menjadi DONE hanya untuk membersihkan dashboard.

**Bukti penerimaan:** Proker ditutup dengan tiga task tersisa; status historis tetap utuh, dashboard aktif tidak menampilkan pekerjaan yang terkunci, dan total UKM tidak menggandakan task yang muncul pada beberapa level ringkasan.

## 4. Ketidaksesuaian yang perlu dirapikan

| Bagian | Temuan | Perbaikan yang dibutuhkan |
|---|---|---|
| §5.3 dan FR-011 dibanding policy `close_program` §10 | Narasi mensyaratkan assignment yang benar untuk aksi Ketupel, tetapi policy contoh hanya memeriksa identitas Ketupel atau jabatan Inti | Tegaskan apakah Ketupel yang assignment-nya dicabut tetap boleh menutup. Hak Inti menutup tanpa assignment operasional tetap merupakan aturan final yang terpisah |
| UAT-23 dibanding §5.1/FR-007 | UAT menulis “Ketupel membuat Proker”, padahal Ketupel biasa tidak otomatis berwenang membuat | Nyatakan Ketupel tersebut juga Inti, atau ubah skenario menjadi Inti membuat dan menunjuk Ketupel |
| UAT-25 dibanding §5.4–5.5 | Judul menguji perubahan struktur oleh non-Ketupel, tetapi hasil juga menyebut keanggotaan tidak berubah; izin mengelola nama panitia belum lengkap | Pisahkan test perubahan struktur dan test pengisian/penempatan nama panitia |
| §9.4 dibanding FR-038/UAT-18 | Versioning form masih diperkenalkan sebagai rekomendasi, tetapi histori versi sudah menjadi acceptance requirement | Tegaskan bahwa menjaga respons historis merupakan kewajiban; detail mekanisme teknis boleh menjadi rekomendasi |
| §0/§13.2 dibanding diagram/checklist deployment | Vite dinyatakan belum final, sementara beberapa deliverable tampak mengasumsikannya | Tandai diagram sebagai rancangan rekomendasi dan tetapkan strategi frontend sebelum implementasi UI/deployment |

Reopen Proker bukan blocker baru: §5.6 dan §18 sudah menetapkan default MVP tidak dapat dibuka kembali. Ketupel nonakun juga sudah mempunyai default untuk struktur: harus memakai akun/assignment; delegasi tidak perlu dibangun sebelum diputuskan.

## 5. Rincian teknis yang bisa diselesaikan tim implementasi

Hal berikut perlu didokumentasikan sebelum fitur terkait selesai, tetapi tidak semuanya perlu keputusan pengguna atau penambahan panjang PRD.

| Area | Spesifikasi yang belum lengkap | Hasil perancangan yang dibutuhkan |
|---|---|---|
| Sesi/auth | Bentuk sesi, masa berlaku, logout, reset password, perubahan izin saat sesi masih aktif | Kontrak auth dan skenario invalidasi. Nonaktifkan akun memang sudah diwajibkan menginvalidasi sesi oleh NFR-01 |
| API | §14 secara eksplisit hanya pemetaan tingkat tinggi; belum skema final, pagination/filter, format error, dan versi konflik | OpenAPI beserta contoh request/response dan matriks policy. Endpoint tidak harus seluruhnya ditulis ulang ke PRD |
| Proker/task/RAB | Wajib/opsional, panjang input, status transition task, tanggal parsial, prioritas, batas jumlah | Kamus data dan validasi; nilai numerik untuk kuantitas pecahan, uang, dan pembulatan RAB |
| Integritas relasi | Member–User, keanggotaan unit, scope task, konsistensi Ketupel, snapshot periode | ERD, constraints, serta aturan menjaga nama/jabatan historis ketika master berubah |
| Race dan retry | Penutupan bersamaan dengan task/RAB, pencabutan akses saat mutasi, dua kali klik tutup/buat | Desain transaksi dan konflik; retry tutup tidak menduplikasi audit; update yang kalah terhadap penutupan tidak lolos |
| Audit | Pembaca log, filter, redaksi, retensi, kegagalan pencatatan | Policy akses audit dan daftar event. Usulan: mutasi penting gagal bersama apabila audit wajib gagal ditulis; tidak perlu fitur undo hanya karena audit tersedia |
| UX | State kosong/loading/error, 403/409, pagination, tampilan mobile, akses keyboard dan label form | Spesifikasi interaksi per layar dan checklist aksesibilitas; tidak perlu mengunci seluruh desain visual di PRD |
| Rilis/operasi | Beban dan dataset uji, target pemulihan, frekuensi/retensi backup, pemilik recovery | Rencana verifikasi dengan angka terukur. p95 <1 detik di PRD masih target usulan, bukan hasil uji; target empat minggu belum tervalidasi tanpa kapasitas tim |

## 6. Gap khusus P1 yang boleh diselesaikan setelah fondasi P0

| Area | Yang perlu diperjelas sebelum diimplementasikan |
|---|---|
| Acara dan form setelah Proker CLOSED | Apakah form tetap menerima jawaban; siapa boleh mengedit/unpublish acara yang terkait arsip. PRD hanya memastikan acara tidak otomatis dihapus; belum menjelaskan seluruh mutasi konten publik |
| Akses form dan data peserta | Jangan menyamakan izin edit Proker dengan izin baca/ekspor respons; §9.6 masih rekomendasi. Tetapkan owner/pengelola/petugas, retensi, penghapusan, dan pengalihan ownership saat akun nonaktif |
| Versi form dan submission | Tentukan satu acara boleh punya berapa form, apakah form bisa dipakai ulang, penanganan peserta yang membuka versi lama lalu submit setelah versi baru publish, duplicate submission, double-click/retry, serta kolom ekspor lintas versi |
| Batas form dan unggahan | Tetapkan tipe field awal, batas pertanyaan/opsi/section/jawaban, form tanpa pertanyaan, tipe file, kuota total, dan visibilitas file. File privat dan poster publik tidak boleh dianggap mempunyai policy download identik |
| Inventaris | Satu aset tidak boleh mempunyai dua transaksi pinjam aktif; tetapkan izin koreksi transaksi, pengembalian ganda, status saat hilang, biaya sewa/denda bila didukung, dan batas baca data peminjam |
| Short link | Tetapkan penggunaan ulang slug setelah soft-delete, slug terlarang, case sensitivity, alih ownership, perilaku 404/410, serta cakupan validasi URL. Pertahankan URL/subdomain lama jika masuk kontrak kompatibilitas |
| Realisasi/LPJ | Tetapkan apakah realisasi bisa berdiri tanpa item RAB, bukti wajib atau opsional, koreksi transaksi, dan alur menyelesaikan laporan sebelum arsip dikunci. CLOSED tetap read-only pada MVP |

Keputusan P1 tidak harus menghentikan pengerjaan P0. Namun, jika fitur publik yang dipertahankan harus aktif pada rilis P0, kontrak API yang dibutuhkan menjadi ketergantungan rilis P0 meskipun editor barunya tetap P1.

## 7. Langkah agar siap diimplementasikan

1. Putuskan G01–G04 terlebih dahulu: batas rilis/website publik, pengelola akun/organisasi, keanggotaan/periode, dan pemilik/assignment Proker. Ini memengaruhi fondasi otorisasi dan data.
2. Lengkapi G05–G08 sebelum implementasi kepanitiaan, kalender, Kanban, dan dashboard/monitoring masing-masing.
3. Buat lampiran keputusan produk singkat, matriks izin per aksi, ERD/kamus data, dan OpenAPI P0. Detail teknis ditetapkan tim; pilihan produk yang belum disepakati tetap dilabeli usulan.
4. Tambahkan acceptance test untuk anggota bidang terhadap departemen, Proker HR, periode berakhir, pergantian Ketupel, pencabutan assignment, kalender pribadi, tugas arsip, konflik mutasi saat tutup, dan kompatibilitas halaman publik.
5. Tetapkan rencana uji beban serta backup/restore sebelum menyebut rilis siap dipakai; gunakan lingkungan uji dan jangan mengasumsikan data existing dapat dihapus.

Fondasi yang sudah jelas dapat dikerjakan sambil keputusan modul lain dilengkapi. Implementasi penuh tanpa menyelesaikan gap akses dan transisi di atas berisiko menghasilkan perilaku yang konsisten secara kode tetapi berbeda dari kebutuhan UKM.
