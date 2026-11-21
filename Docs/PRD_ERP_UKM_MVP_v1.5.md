# Product Requirements Document (PRD)
## ERP UKM — Sistem Operasional, Program Kerja, dan Website Publik

| Metadata | Nilai |
|---|---|
| Versi | **1.5 — Template kepanitiaan Proker fleksibel (Modular Monolith)** |
| Tanggal | **17 November 2026** |
| Status | **Draft untuk review; keputusan produk yang sudah disepakati dipisah dari usulan implementasi** |
| Produk | ERP UKM / Organization Management System; nama final belum ditentukan |
| Cakupan | **Satu UKM**; bukan SaaS multi-organisasi |
| Platform | Website internal pengurus (mobile-first) + website publik untuk acara/pendaftaran |
| Target pengerjaan awal | **MVP portofolio sekitar 4 minggu**, dengan fase lanjutan terpisah |
| Stack pilihan | **Modular Monolith**: satu backend FastAPI, satu PostgreSQL, SQLAlchemy 2, Alembic, Docker Compose |
| Infrastruktur | VPS awal 2–4 GB RAM; satu backend process (awalnya 1 Uvicorn worker), satu PostgreSQL instance, reverse proxy |
| Sumber | PRD v1.3, dokumen User Flow v1.0, dan keputusan percakapan hingga 17 November 2026 |

> **Konvensi:** **[FINAL]** = dinyatakan/disepakati dalam percakapan; **[REKOMENDASI]** = rancangan yang disarankan, belum menjadi keputusan UKM; **[TERBUKA]** = masih memerlukan keputusan atau pengujian. P0 berarti harus ada pada MVP minimal; P1 fitur resmi dalam cakupan produk tetapi boleh sesudah MVP; P2 pengembangan masa depan. **Fitur yang tercantum di PRD belum berarti sudah dibuat.**

## 0. Ringkasan keputusan dan perubahan v1.5

1. **[FINAL] Struktur UKM diselaraskan.** Super Inti = Ketua Umum, Wakil Ketua Umum, Sekretaris, Bendahara. Inti = Super Inti + Kepala Departemen Internal, Eksternal, Asset dan Property + Kepala Bidang Hunting, Modeling, Medkom, Public Relations + Kepala HR (**12 jabatan**). HR merupakan fungsi lintas organisasi, **bukan departemen keempat**.
2. **[FINAL] Proker langsung ACTIVE ketika dibuat; tidak ada pengajuan, approval, penolakan, antrean bendahara/sekretaris/ketua, atau persyaratan RAB disetujui.** Kesepakatan kegiatan terjadi lebih dahulu di rapat/WhatsApp. Pembuat Proker: **Kepala Departemen atau anggota Inti**.
3. **[FINAL] Proker dapat dilihat semua pengurus berakun aktif lintas unit, tetapi isi operasional hanya diedit oleh orang yang ditugaskan pada proker.** Proker yang bukan tanggung jawab pengguna **tidak ditonjolkan di dashboard personal**, tetapi tersedia di `Semua Proker` sebagai read-only. Penugasan proker milik suatu departemen dapat ditambah/dicabut oleh semua anggota aktif departemen pemilik; mutasi wajib diaudit.
4. **[FINAL] Ketua Pelaksana ditunjuk per proker.** Jika perlu mengubah data di aplikasi, ia memakai akun individu dan penugasan/akses scoped hanya ke proker terkait. Panitia lainnya boleh hanya tercatat nama/jabatan tanpa login.
5. **[FINAL] Tombol `Tutup Proker` hanya untuk Ketua Pelaksana proker itu atau anggota Inti.** Tugas yang belum selesai menimbulkan peringatan, bukan blokir. Proker ditutup manual, menjadi **arsip read-only** dan tidak muncul lagi sebagai proker aktif di beranda.
6. **[FINAL] Kanban punya papan Organisasi/Umum, Departemen, Bidang/Divisi, dan Proker.** Tugas satu sumber data; seluruh pengurus aktif boleh mengubah tugas asli di papan Umum; anggota unit terkait boleh mengubah tugas asli unitnya; tugas milik proker hanya dapat diedit pengelola proker yang ditugaskan. Melihat lintas departemen dibolehkan read-only.
7. **[FINAL] Calendar punya tampilan umum, departemen/bidang, proker, dan pribadi.** Menu `Monitoring Departemen` di sidebar memberikan ringkasan TODO/IN_PROGRESS/DONE lintas unit, terpisah dari kalender.
8. **[FINAL] Modul Asset dan Property bertambah:** inventaris fisik termasuk **buku**; kondisi dan status terpisah; peminjaman/penyewaan oleh **siapa saja** dicatat **manual** beserta identitas dan histori; aset digital (Drive, folder, domain, hosting, repositori/website) diinventarisasi tanpa menyimpan password plaintext.
9. **[FINAL] Pendaftaran acara pada website publik berlaku untuk semua departemen/bidang.** Peserta tidak wajib punya akun; setiap kegiatan dapat mempunyai formulir khusus. **Form Builder sepenuhnya dapat dikustomisasi.** Empat field awal (Nama, NIM, Fakultas, Prodi/Jurusan) **hanya template yang boleh diedit/dihapus**, bukan field permanen yang wajib.
10. **[FINAL] Short Link dan editor Acara Publik tetap requirement produk.** Semua pengurus aktif dapat membuat; pembuat mengelola/menghapus miliknya sendiri, sedangkan Inti berwenang mengelola milik pengurus lain. Login username/password; batas unggah **20 MB per file**.
11. **Dihapus dari spesifikasi aktif:** seluruh requirement dan test tentang submit/approve proker, approver berikutnya, revisi/persetujuan RAB, status `UNDER_REVIEW`/`APPROVED`, dan kewajiban LPJ disahkan sebelum proker ditutup. Jangan menerapkannya secara diam-diam dari versi lama.
12. **[FINAL — perubahan v1.4] Arsitektur backend memakai modular monolith, BUKAN microservices.** Satu aplikasi FastAPI, satu PostgreSQL database, satu pipeline migrasi Alembic dan satu unit deployment backend. Modul/domain tetap diisolasi dalam struktur kode, kontrak internal, serta test. Tidak ada database-per-service, HTTP internal antarservice, API gateway internal, broker pesan atau orkestrasi distributed systems sebagai kewajiban MVP.
13. **[REKOMENDASI v1.4, tetap berlaku]** Frontend dapat menggunakan React + Vite yang dibangun menjadi aset statis dan disajikan lewat Caddy untuk menghemat RAM; Next.js hanya jika fitur SSR/SEO publik memang membutuhkannya.
14. **[FINAL — v1.5] Template struktur panitia Proker.** Awalnya menampilkan Ketua Pelaksana, Wakil Ketua, kelompok Sekben (Sekretaris + Bendahara), serta divisi Humas, Acara, PDD, dan Logistik. **PDD dapat dipecah menjadi Desain dan Pubdok, tetapi tidak wajib.** Seluruh struktur hanya template dan **Ketua Pelaksana bebas mengubahnya** untuk setiap Proker selama masih ACTIVE. Panitia tidak wajib punya akun. Pembagian panitia Proker tidak mengubah struktur unit formal UKM maupun otomatis memberikan akses edit aplikasi.

---

## 1. Latar belakang, visi, dan batas produk

### 1.1 Masalah yang hendak diselesaikan

Koordinasi UKM saat ini banyak berlangsung lewat WhatsApp. Informasi pekerjaan, penugasan, jadwal, anggaran kegiatan, dan inventaris tersebar. Jika pengurus berganti periode, informasi dan histori proker sulit dicari. Pendaftaran peserta sebelumnya menggunakan Google Forms terpisah dari informasi kegiatan. Solusi perlu **mengurangi pengulangan input**, bukan memindahkan seluruh percakapan ke ERP.

### 1.2 Visi produk

> Pengurus masuk ke satu website untuk melihat pekerjaan yang relevan, mengelola proker dan aset yang menjadi tanggung jawabnya, serta menemukan histori organisasi. Pengunjung publik dapat melihat acara dan mengisi pendaftaran tanpa perlu menjadi pengguna ERP.

### 1.3 Prinsip desain

- **Satu UKM dahulu.** Tidak ada konfigurasi multi-tenant atau marketplace modul.
- **Ringan secara operasional.** WhatsApp tetap boleh menjadi tempat diskusi; ERP merupakan catatan kerja dan status resmi.
- **Minim birokrasi.** Tidak ada approval untuk membuat proker atau RAB.
- **Terbuka untuk melihat, terukur untuk mengubah.** Semua pengurus berakun dapat melihat detail proker lintas departemen, tetapi hak mutasi bergantung scope; data pribadi peserta dan kredensial digital termasuk pengecualian sensitif.
- **Satu record, banyak tampilan.** Kanban, kalender, dashboard, monitoring mengambil data yang sama.
- **Mobile-first.** Tindakan harian mudah dari ponsel; advanced table nyaman di desktop.
- **Tidak semua anggota/panitia wajib login.** Akun individu hanya bagi orang yang benar-benar bertindak di sistem.

### 1.4 Bukan target produk saat ini

Tidak menjadi chat pengganti WA, payment gateway, sistem akuntansi umum, HR payroll/rekrutmen lengkap, SaaS untuk semua UKM, QR check-in/pembayaran/sertifikat acara, sistem penyimpanan gambar/video besar, workflow approval builder, atau enterprise IAM/Kubernetes.

---

## 2. Struktur organisasi dan identitas pengguna

### 2.1 Hirarki yang ditetapkan [FINAL]

```text
UKM
├── Super Inti (4 jabatan)
│   ├── Ketua Umum
│   ├── Wakil Ketua Umum
│   ├── Sekretaris
│   └── Bendahara
├── Departemen Internal
│   ├── Kepala Departemen Internal [Inti]
│   ├── Bidang Hunting — Kepala Bidang Hunting [Inti] + anggota
│   └── Bidang Modeling — Kepala Bidang Modeling [Inti] + anggota
├── Departemen Eksternal
│   ├── Kepala Departemen Eksternal [Inti]
│   ├── Bidang Medkom (Media Communication) — Kepala Bidang [Inti] + anggota
│   └── Bidang PR (Public Relations) — Kepala Bidang [Inti] + anggota
├── Departemen Asset dan Property
│   └── Kepala Departemen Asset dan Property [Inti] + anggota
└── Fungsi Human Resource (lintas organisasi)
    └── Kepala HR [Inti] + anggota HR jika ada
```

**Inti** = 4 Super Inti + 3 Kepala Departemen + 4 Kepala Bidang + 1 Kepala HR = **12 jabatan yang saat ini diketahui**. Jumlah ini menghitung **jabatan**, belum tentu 12 orang unik jika ada rangkap jabatan. Kepala HR masuk Inti tetapi HR tidak diasumsikan sebagai departemen keempat. Detail subordinasi HR serta apakah Asset dan Property memiliki bidang belum dinyatakan; jangan mengarang.

### 2.2 Model identitas [FINAL/REKOMENDASI]

- `User`: akun login individu, username unik, password hash, status aktif.
- `Member`: identitas orang di UKM; dapat ada tanpa akun.
- `Unit`: departemen, bidang, atau fungsi HR; satu tabel dengan `unit_type`, parent opsional, dan periode.
- `PositionAssignment`: seseorang memegang jabatan pada unit/periode tertentu; satu orang bisa memegang beberapa peran.
- `ProgramAssignment`: akses operasional per proker; pemilik akses bisa lintas departemen dan berlaku hanya pada proker terkait.
- `CommitteeMember`: nama + jabatan kepanitiaan; `user_id` opsional. **Anggota panitia tak berakun tidak bisa menekan tombol edit/tutup.**

**[FINAL]** Login username/password, tanpa Google OAuth. **[FINAL]** Pengurus Inti yang berwenang dapat membuat akun. **[REKOMENDASI]** Karena semua Inti tidak perlu otomatis menjadi administrator credential, berikan hak `manage_users` eksplisit kepada pengurus Inti yang mengelola akun (minimal Super Inti atau admin yang ditetapkan), sementara kategori Inti tetap digunakan untuk hak penutupan proker dan pengelolaan konten publik.

### 2.3 Persona

| Persona | Hal utama di dashboard | Kewenangan khas |
|---|---|---|
| Super Inti | Ringkasan UKM + pekerjaan pribadi | Administrasi organisasi sesuai mandat, monitoring, menutup proker |
| Kepala Departemen | Tugas sendiri + proker/unit terkait | Membuat proker, mengelola tugas departemen, menutup proker sebagai Inti |
| Kepala Bidang | Tugas sendiri + papan bidang | Membuat proker sebagai Inti, mengelola tugas bidang, menutup proker sebagai Inti |
| Kepala HR | Ringkasan lintas unit + tugas HR | Monitoring lintas organisasi, termasuk kelompok Inti |
| Anggota pengurus | Tugas pribadi + proker yang ditugaskan | Kelola Kanban Umum/unit sendiri; edit proker jika ditugaskan |
| Ketua Pelaksana | Proker yang dipimpin | Edit proker dengan akun/assignment; Tutup Proker tersebut |
| Panitia/peserta tanpa akun | Tidak mendapat dashboard internal | Dapat dicatat namanya; peserta publik mengisi form tanpa login |
| Pengunjung publik | Acara yang diterbitkan | Melihat acara dan mendaftar tanpa akun |

---

## 3. Katalog fitur dan prioritas

| ID | Fitur | Prioritas | Cakupan minimal |
|---|---|---|---|
| F01 | Auth & akun personal | P0 | Username/password, sesi, admin akun, nonaktifkan akun, hash password |
| F02 | Struktur UKM | P0 | Super Inti/Inti, departemen, bidang, fungsi HR, assignment periode |
| F03 | Dashboard personal | P0 | Tugas Saya, Proker Saya, Agenda Terdekat, tautan ke halaman terkait |
| F04 | Proker | P0 | Buat oleh Kepala Departemen/Inti, langsung aktif, detail, penugasan, tutup dan arsip read-only |
| F05 | Kepanitiaan | P0 | Template awal Ketupel/Wakil, Sekben, Humas, Acara, PDD, Logistik; opsi pecah PDD; struktur bebas dikustom oleh Ketua Pelaksana; nama-jabatan tanpa akun |
| F06 | RAB | P0 | Catatan item dan total per proker, tanpa approval |
| F07 | Kanban | P0 | Umum, departemen, bidang, proker; edit by scope; satu entitas tugas |
| F08 | Kalender | P0 | Umum, departemen/bidang, proker, pribadi; tanggal yang konsisten |
| F09 | Monitoring organisasi | P0 | Sidebar ringkasan To Do/Doing/Done per unit, filter/drill-down |
| F10 | Audit log | P0 | Proker, penugasan, Kanban, RAB, penutupan, aset penting, publikasi |
| F11 | Lampiran & arsip dokumen | P1 | Maks. 20 MB/file, URL/file aman, laporan/LPJ sederhana |
| F12 | Realisasi biaya | P1 | Catatan aktual dan bukti; bukan approval atau full accounting |
| F13 | Inventaris fisik | P1 | Barang/buku, kondisi, status, PIC, pinjam/sewa/kembali, histori |
| F14 | Inventaris digital | P1 | Identifikasi folder, akun layanan, domain, hosting, website, repo; tanpa password plaintext |
| F15 | Editor acara website publik | P1 | Semua pengurus aktif dapat membuat; ownership untuk ubah/hapus; publish/unpublish |
| F16 | Form Builder pendaftaran | P1 | Template awal bebas ubah/hapus, tipe pertanyaan dan section, publikasi form, respons peserta |
| F17 | Data pendaftaran | P1 | Form publik tanpa akun, daftar respons, ekspor Excel/CSV, pembatasan PII |
| F18 | Short Link | P1 | Slug unik, pengalihan URL aman, owner mengelola sendiri, Inti dapat mengelola semua |
| F19 | Notifikasi otomatis | P2 | Email/in-app; integrasi WhatsApp resmi hanya bila diperlukan |
| F20 | Fitur spesifik bidang/layanan lanjutan | P2 | Berdasarkan kebutuhan riil; belum perlu modul khusus Hunting/Modeling/PR/Medkom |
| F21 | Pendaftaran tingkat lanjut | P2 | Kuota, waiting list, check-in QR, pembayaran, sertifikat, branching kompleks |

**Prinsip prioritas:** P1 tetap tercatat sebagai **requirement resmi**, tetapi tidak otomatis harus selesai dalam empat minggu. Jika waktu terbatas, **jangan** mengurangi audit, autentikasi, batas edit, backup, dan fungsi Proker/Kanban P0 hanya untuk mengejar Form Builder yang kompleks.

---

## 4. Information architecture, sidebar, dan alur pertama kali login

### 4.1 Navigasi yang disarankan [REKOMENDASI]

```text
LOGIN (username + password)
└── BERANDA PERSONAL
    ├── Tugas Saya → Detail Task / Papan Asal
    ├── Proker Saya → Detail Proker
    └── Agenda Terdekat → Detail Kalender

SIDEBAR
├── Beranda
├── Tugas & Kanban
│   ├── Tugas Saya
│   ├── Umum UKM
│   ├── Departemen/Bidang Saya (daftar sesuai keanggotaan)
│   └── Jelajahi Unit Lain (read-only untuk yang bukan anggota)
├── Program Kerja
│   ├── Proker Saya (ditugaskan)
│   ├── Semua Proker (bisa dilihat semua akun aktif)
│   └── Arsip Proker
├── Kalender
│   ├── Umum UKM
│   ├── Departemen/Bidang
│   ├── Proker
│   └── Jadwal Saya
├── Monitoring Departemen (Inti/HR dan yang diberi mandat)
├── Asset dan Property [P1]
│   ├── Inventaris Fisik
│   ├── Riwayat Peminjaman/Penyewaan
│   └── Inventaris Digital
├── Konten Publik [P1]
│   ├── Acara
│   ├── Formulir & Pendaftaran
│   └── Short Link
└── Organisasi & Akun (sesuai hak admin)
```

**Tidak semua submenu divisi otomatis ditampilkan.** Sidebar mengutamakan unit pengguna. `Jelajahi Unit Lain` disediakan bagi yang ingin melihat progres lintas departemen/bidang. Tanpa hak edit, tampilkan label `Hanya Lihat`, dan jangan tampilkan tombol yang tidak bisa digunakan.

### 4.2 Alur dasar pengguna [FINAL/REKOMENDASI]

1. Pengurus login; sistem memuat jabatan, keanggotaan, dan assignment proker.
2. Beranda menampilkan **hanya** tugas/proker relevan secara pribadi, bukan semua proker UKM. Agenda umum yang relevan tetap dapat tampil.
3. Klik tugas dari `Tugas Saya` langsung membuka task di papan asalnya, tidak meminta pengguna memilih salah satu Kanban.
4. Klik proker dari `Proker Saya` langsung membuka ringkasan/progresnya dengan tombol edit bila pengguna diberi assignment.
5. Jika ingin melihat proker lain, buka `Semua Proker` dan baca detailnya dengan mode read-only.
6. Jika ingin melihat pekerjaan unit lain, gunakan `Jelajahi Unit Lain` atau `Monitoring Departemen` sesuai mandat.
7. Proker selesai tidak muncul sebagai pekerjaan aktif di Beranda, tetapi selalu dapat ditemukan pada `Arsip Proker`.

---

## 5. Siklus hidup Proker — aturan produk final

### 5.1 Siapa boleh membuat [FINAL]

**Kepala Departemen dan anggota Inti** boleh membuat Proker. Dengan definisi Inti saat ini, anggota Inti meliputi Super Inti, Kepala Departemen, Kepala Bidang, dan Kepala HR. **[REKOMENDASI]** Jika Kepala Departemen membuat, departemen pemilik otomatis dipilih dari jabatannya; anggota Inti lain bisa memilih pemilik unit sesuai penugasan organisasi. Aturan pemilihan unit lintas departemen perlu diuji saat UI dibuat.

### 5.2 Alur membuat Proker [FINAL]

1. Buka `Program Kerja > Buat Proker` (hanya ditampilkan bagi pembuat berwenang).
2. Isi informasi minimum: nama proker, unit penyelenggara/pemilik, deskripsi ringkas, tanggal/rentang yang diketahui, dan kontak/penanggung jawab awal. Lokasi serta tautan dokumen opsional.
3. Pilih Ketua Pelaksana (boleh Kepala Departemen sendiri atau orang lain). Tentukan akun operator bila diperlukan. Pengurus lintas unit bisa dilibatkan.
4. Tekan **`Buat Proker`**. Sistem memvalidasi izin, membuat record, mencatat pencipta/timestamp, dan memberi status **`ACTIVE` langsung**.
5. Setelah Proker dibuat, halaman **Kepanitiaan** menawarkan template default. Ketua Pelaksana dapat memakai atau menyesuaikan template tersebut; nama panitia, RAB, Kanban, kalender, dokumen, dan acara/pendaftaran (jika perlu) dilengkapi **bertahap**, tanpa memaksakan semua isian pada satu form.

**Tidak ada:** tombol `Ajukan Persetujuan`, antrean approver, tahap Sekretaris/Bendahara/Ketua, status `UNDER_REVIEW`, atau keputusan `APPROVED/REJECTED` sebagai prasyarat Proker aktif. Kesepakatan kegiatan berada di luar sistem (WA/rapat). **RAB tidak perlu approval dalam jumlah berapa pun.**

### 5.3 Pengurus Proker dan assignment [FINAL]

- Setiap Proker memiliki unit pemilik, Ketua Pelaksana, serta operator/pengurus berakun yang ditugaskan untuk memperbarui informasi.
- Panitia lain boleh terdaftar sebagai teks nama dan jabatan **tanpa memiliki akun**. **Posisi dan divisi panitia berasal dari template fleksibel yang dapat diubah Ketua Pelaksana** (lihat §5.4).
- **Semua anggota aktif departemen pemilik Proker boleh menambah/mencabut assignment pengelola** Proker departemennya. Mereka tidak boleh mengatur assignment Proker milik departemen lain hanya karena bisa melihatnya.
- Pengurus dari departemen lain **bisa ditugaskan** sebagai pengelola satu Proker dan memperoleh hak edit pada Proker tersebut.
- Ketua Pelaksana tanpa akun dapat ditampilkan namanya, tetapi untuk melakukan aksi (edit atau klik `Tutup Proker`) ia membutuhkan akun personal dengan assignment yang benar. Pengurus Inti tetap boleh menutup jika Ketua Pelaksana tidak berakun.
- Assignment dicabut saat pengurus dikeluarkan atau Proker ditutup; histori assignment tetap tersimpan.

**Risiko yang diketahui:** anggota departemen pemilik dapat menugaskan dirinya sendiri dan memperoleh izin edit. Ini adalah konsekuensi keterbukaan yang dipilih UKM, bukan bug tersembunyi. **[REKOMENDASI]** Audit semua `grant/revoke`, tampilkan aktivitas terbaru, dan sediakan pemulihan perubahan oleh admin. Bila kelak dinilai terlalu longgar, aturan ini dapat dinaikkan menjadi hanya Kepala Departemen tanpa mengubah model data.

### 5.4 Template struktur kepanitiaan yang bisa dikustomisasi [FINAL — v1.5]

**Tujuan:** Mempercepat pembentukan kepanitiaan tanpa memaksa setiap kegiatan memiliki susunan yang sama. Template adalah **data awal**, bukan ketentuan struktural permanen.

**Template standar saat Proker baru dibuat:**

```text
Kepanitiaan Proker (template default, bukan struktur wajib)
├── Pimpinan Pelaksana
│   ├── Ketua Pelaksana
│   └── Wakil Ketua
├── Sekben
│   ├── Sekretaris
│   └── Bendahara
├── Divisi Humas
├── Divisi Acara
├── Divisi PDD
└── Divisi Logistik

Opsional untuk PDD (dipilih jika diperlukan):
Divisi PDD
├── Desain
└── Pubdok
```

**Keterangan 'Sekben':** di PRD ini ditampilkan sebagai kelompok kerja **Sekretaris dan Bendahara**; label dan pembagian peran tetap dapat diubah Ketua Pelaksana. Nama PDD, Desain, dan Pubdok dipertahankan sesuai istilah UKM; implementasi tidak boleh mengunci makna/komposisi divisi tersebut.

**Hak Ketua Pelaksana pada Proker ACTIVE:**

1. Memilih memakai template awal, mengosongkannya, atau mengubah bagian tertentu.
2. Menambah, mengganti nama, menghapus, mengurutkan, dan menyusun kembali kelompok/divisi/subdivisi/jabatan; tidak ada kewajiban memiliki semua posisi template.
3. Menggabungkan satu atau lebih divisi; memecah PDD menjadi Desain dan Pubdok, mempertahankan PDD tanpa pemecahan, atau membuat pembagian lain sesuai kegiatan.
4. Menambahkan anggota panitia sebagai **nama teks + peran**; kaitan ke `Member`/akun internal bersifat opsional, sehingga panitia tidak dipaksa login.
5. Menetapkan satu orang untuk lebih dari satu peran bila diperlukan; jabatan panitia **bukan** jabatan formal organisasi.
6. Melihat pratinjau bagan kepanitiaan dan menyimpan perubahan; perubahan struktur/peran dicatat di audit log (siapa, kapan, sebelum/sesudah secara proporsional).

**Batas akses yang penting:**

- **Mengubah desain/struktur template kepanitiaan** adalah kewenangan **Ketua Pelaksana** pada Proker tersebut; ia harus memiliki akun aktif dan penugasan Proker untuk mengoperasikan UI. Pengelola lain yang hanya mempunyai `can_edit` Proker **tidak otomatis** mempunyai hak `manage_committee_structure`.
- **Mengelola assignment hak edit aplikasi** adalah tindakan *berbeda* dari **mencatat seseorang sebagai panitia**. Aturan penugasan Proker oleh anggota departemen pemilik tetap berlaku. Mencantumkan nama sebagai Ketua Divisi/Sekben/panitia **tidak otomatis** membuat user atau memberi izin akses.
- **[TERBUKA]** Jika Ketua Pelaksana tidak memiliki akun, kebutuhan perubahan template secara langsung harus ditangani dengan menyiapkan akun/penugasan terlebih dahulu, atau kebijakan delegasi yang disepakati khusus. Jangan otomatis memberikan kemampuan ini kepada semua operator tanpa persetujuan.
- Struktur kepanitiaan hanya berlaku untuk **satu Proker**, **tidak** menambah/mengubah unit Departemen/Bidang resmi UKM.
- Begitu Proker **CLOSED**, seluruh struktur, anggota, dan penempatan jabatan dibekukan sebagai arsip **read-only**; termasuk upaya mutasi lewat API.

**Rancangan UX ringan [REKOMENDASI]:** `Detail Proker > Kepanitiaan > Atur Struktur`. Perlihatkan template sebagai bagan atau daftar bertingkat dengan aksi `Tambah Posisi`, `Tambah Divisi`, `Ubah Nama`, `Hapus`, `Pindahkan`, `Pecah PDD`, `Kembalikan Template`. Simpan konfigurasi secara per-Proker; jangan memaksa pengguna membuat akun untuk semua nama panitia. Hindari builder drag-and-drop yang kompleks pada MVP; tombol urut-naik/turun sudah cukup.

**Rancangan data [REKOMENDASI]:**

- `committee_groups`: `id`, `program_id`, `parent_group_id?`, `label`, `sort_order`; menampung Pimpinan, Sekben, Humas, Acara, PDD, Logistik, dan subgrup seperti Desain/Pubdok.
- `committee_roles`: `id`, `program_id`, `group_id?`, `title`, `sort_order`, `is_chairperson?`; mencakup Ketua Pelaksana, Wakil, Sekretaris, Bendahara, koordinator divisi, dan peran tambahan.
- `committee_members`: `id`, `program_id`, `committee_role_id?`, `member_id?`, `user_id?`, `display_name`, `notes?`; memfasilitasi nama tanpa akun dan beberapa peran per orang.
- Simpan `default_template_version` atau snapshot konfigurasi saat template diterapkan agar perubahan template global di masa depan **tidak** mengubah kepanitiaan Proker lama.
- Hubungan Ketua Pelaksana di master `programs.chairperson_member_id` dan peran `Ketua Pelaksana` di bagan harus **konsisten**, tidak dua sumber kebenaran yang bisa saling bertentangan.

**Batas MVP [REKOMENDASI]:** Gunakan operasi CRUD sederhana dan susunan hierarkis 1–2 tingkat. Tidak perlu workflow persetujuan bagan, otomatisasi undangan, atau sinkronisasi data Google Forms.

### 5.5 Hak melihat vs mengedit [FINAL]

- Semua akun pengurus aktif boleh membuka **detail lengkap Proker** lintas departemen, termasuk informasi RAB, panitia, Kanban, dokumen operasional Proker, dan timeline.
- **Hanya akun yang ditugaskan pada Proker boleh mengubah konten operasional Proker**. Peran Inti tidak otomatis menjadi izin mengedit isi Proker yang tidak ditugaskan, kecuali aksi eksplisit lain seperti `Tutup Proker` atau pengelolaan assignment yang diizinkan. **Untuk struktur kepanitiaan, pemeriksaan lebih spesifik: hanya Ketua Pelaksana (atau delegasi yang kelak diputuskan) boleh mengubah desain hierarkinya.**
- Fitur personal (`Proker Saya`) hanya menampilkan Proker yang dikelola/ditugaskan kepada pengguna, bukan seluruh Proker yang bisa ia lihat.
- **Pengecualian privasi:** daftar respons pendaftar publik, data kontak pribadi peminjam, serta kredensial aset digital **bukan** bagian yang otomatis dibuka hanya karena seseorang boleh melihat Proker; aksesnya diatur per modul yang sensitif. Ini menjaga keamanan data tanpa mengurangi transparansi progres Proker.

### 5.6 Penutupan [FINAL]

1. **Ketua Pelaksana Proker** atau **anggota Inti** membuka Proker `ACTIVE`.
2. Klik `Tutup Proker` dan lihat ringkasan: tugas belum selesai, RAB tersedia, dokumen yang sudah ada.
3. Bila masih ada tugas `TODO`/`IN_PROGRESS`, sistem menampilkan peringatan dan meminta konfirmasi; **tidak menghalangi penutupan**.
4. Konfirmasi mengubah Proker `ACTIVE -> CLOSED` secara atomik dan membuat audit `actor`, `timestamp`, serta alasan opsional.
5. **Seluruh isi Proker (tugas, RAB, panitia, kalender terkait, dokumen) menjadi read-only**; tidak ada task edit atau tambah laporan lewat alur biasa. Data historis tetap bisa dibuka.
6. Proker tidak lagi tampil pada `Proker Saya (Aktif)`/beranda, namun selalu bisa dicari di `Arsip Proker` dan dipakai sebagai referensi untuk Proker lain.

Tidak ada syarat wajib semua task DONE, tidak ada final approval RAB/LPJ, dan tidak ada auto-close berdasarkan tanggal. **[TERBUKA]** Apakah fitur `Buka Kembali` akan disediakan dan siapa yang berwenang. Untuk MVP, **jangan implementasikan pembukaan kembali** sebelum ada keputusan; arsip tetap read-only.

### 5.7 State machine

```text
CREATE_PROKER (otorisasi pembuat) → ACTIVE
ACTIVE ── Tutup oleh Ketua Pelaksana / Inti ──► CLOSED (arsip/read-only)
CLOSED ──[tidak ada transisi balik pada MVP]──► CLOSED
```

**Istilah `Proker`, `Acara Publik`, dan `Form Pendaftaran` tidak sama:** satu Proker boleh memiliki acara publik dan formulir pendaftaran, tetapi tidak semua Proker harus dipublikasikan atau membuka pendaftaran. **[TERBUKA]** Bila Proker ditutup ketika pendaftaran publiknya masih terbuka, sistem sebaiknya menampilkan peringatan tersendiri; menutup Proker tidak otomatis menghapus acara dari website publik.

---

## 6. Kanban dan kalender terintegrasi

### 6.1 Definisi empat scope Kanban [FINAL]

| Papan | Data utama | Hak lihat | Hak buat/edit/memindahkan tugas asli |
|---|---|---|---|
| **Umum UKM** | Tugas yang memang dibuat dalam scope organisasi | Semua pengurus aktif | **Semua pengurus aktif** |
| **Departemen** | Tugas asli departemen tertentu | Semua pengurus aktif | **Anggota aktif departemen tersebut** |
| **Bidang/Divisi** | Tugas asli bidang tertentu | Semua pengurus aktif (unit lain read-only) | **Anggota aktif bidang tersebut**; hak Kepala Departemen atas board bidang perlu mandat/assignment eksplisit bila bukan anggota bidang |
| **Proker** | Tugas asli pada Proker tertentu | Semua pengurus aktif | **Akun yang ditugaskan pada Proker**, dan hanya selama ACTIVE |

Papan Departemen/Divisi boleh menampilkan tugas Proker milik unit tersebut sebagai **view agregasi**. Tugas tersebut tetap mengikuti **izin Proker** dan tidak otomatis bisa diedit oleh semua anggota departemen. Begitu pula papan Umum tidak menjadi jalan pintas untuk mengedit tugas Proker.

### 6.2 Model tugas tunggal [FINAL/REKOMENDASI]

`task_id`, `title`, `description?`, `scope_type` (`ORGANIZATION`, `DEPARTMENT`, `DIVISION`, `PROGRAM`), `scope_id`, `assignee_user_id?`, `committee_member_id?`, `status`, `deadline?`, `priority?`, `created_by`, `updated_at`, dan `version`.

- Status minimal: `TODO`, `IN_PROGRESS`, `DONE`. `BLOCKED`/`REVIEW` dapat ditunda.
- Task harus mempunyai **satu pemilik scope**, bukan digandakan ke beberapa database/papan.
- Perubahan task asli tampil pada semua view terkait setelah refresh/sinkronisasi.
- Papan menunjukkan jumlah tugas per status, tugas melewati tenggat, dan filter PIC.
- Panitia tanpa akun bisa muncul sebagai PIC tertulis; operator berakun yang memperbarui statusnya.
- Jika Proker `CLOSED`, semua task scope PROGRAM itu read-only, meskipun sedang terlihat pada tampilan departemen/umum.
- Audit mencatat create/edit/status/delete (soft delete jika histori diperlukan), aktor, waktu, ringkasan perubahan.

### 6.3 Kalender [FINAL/REKOMENDASI]

Satu `event` record dengan `scope`, jadwal, judul, dan relasi opsional ke Proker/acara publik. Tampilan: **Kalender Umum UKM**, **Departemen/Bidang**, **Proker**, dan **Jadwal Saya**. Pengurus dapat menjelajahi kalender unit lain sebagai read-only, kecuali untuk jadwal nonpublik yang secara khusus diberi atribut sensitif. Perubahan tanggal Proker yang ditampilkan di kalender tidak memerlukan input tanggal kedua. Kalender tidak otomatis menerbitkan acara ke website publik.

### 6.4 Monitoring Departemen [FINAL]

Sidebar `Monitoring Departemen` memberikan ringkasan per departemen, bidang, dan fungsi HR yang relevan: jumlah `TODO`, `IN_PROGRESS`, `DONE`, tugas terlambat, dan tautan drill-down. **[REKOMENDASI]** Inti dan Kepala HR memiliki tampilan agregasi lintas organisasi; pengguna lain memakai board/browse unit. **Jangan menghitung satu tugas Proker dua kali** ketika Proker tersebut juga terlihat pada agregat departemen.

---

## 7. Manajemen RAB, dokumen, dan laporan

### 7.1 RAB sebagai pencatatan [FINAL]

- Tiap Proker dapat memiliki item RAB: nama, kategori, jumlah, satuan, harga satuan, total per item, total keseluruhan, keterangan.
- Total dihitung **di backend**, gunakan integer rupiah atau `Decimal` agar akurat.
- Pengelola Proker dapat menambah/mengubah RAB selama Proker `ACTIVE`; setiap perubahan jumlah dan harga dicatat di audit log.
- **Tidak ada RAB approval**, budget threshold untuk persetujuan, atau verifikasi wajib oleh Bendahara/Ketua/Sekretaris.
- Setelah Proker `CLOSED`, RAB tidak dapat diedit dan dapat menjadi referensi histori.
- P1: catatan realisasi dan bukti transaksi; `RAB` dan `actual` ditampilkan terpisah; tidak menyiratkan fungsi payment gateway.

### 7.2 Dokumen [FINAL/REKOMENDASI]

Unggahan maksimal **20 MB per file**. Pertahankan tautan Google Drive untuk file besar, foto/video, atau dokumen kolaboratif. Validasi tipe, batas ukuran pada reverse proxy dan backend, dan streaming file ke storage persisten. Lampiran Proker tetap bisa dibaca oleh pengurus berakun aktif sesuai kebijakan keterbukaan Proker; informasi pribadi peserta dan rahasia kredensial digital tidak disimpan sebagai lampiran publik Proker.

### 7.3 LPJ dan arsip

Laporan kegiatan sederhana dapat berisi narasi, capaian, hambatan, dan tautan dokumentasi (P1). Data Proker, tugas, tanggal, RAB dan panitia dipakai ulang, bukan diketik berulang. **LPJ bukan syarat tombol `Tutup Proker` untuk MVP**. Jika LPJ dibuat kemudian, putuskan apakah harus diselesaikan **sebelum** menutup karena arsip sudah read-only.

---

## 8. Modul Inventaris Asset dan Property [P1; fitur resmi]

### 8.1 Ruang lingkup [FINAL]

Departemen Asset dan Property bertanggung jawab atas logistik/inventaris sekretariat, **buku**, peralatan, aset digital (folder, Drive, akun layanan, domain, hosting, website, repo), dan aktivitas pengembangan website yang dapat ditrack melalui Kanban/Proker biasa. Modul inventaris terpisah dari papan Kanban, namun boleh ditautkan ke Proker.

### 8.2 Tabel inventaris fisik [FINAL/REKOMENDASI]

| Field | Keterangan |
|---|---|
| `asset_code` | Kode unik per unit; beberapa tripod/buku identik tetap bisa dibedakan |
| `name`, `category` | Kamera/tripod/buku/elektronik/furnitur/perlengkapan/dll. |
| `location`, `custodian` | Sekretariat/gudang dan penanggung jawab |
| `condition` | `BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT` (dapat diperluas) |
| `availability_status` | `TERSEDIA`, `DIPINJAM`, `DISEWAKAN`, `PERBAIKAN`, `HILANG` |
| `notes`, `photo?` | Keterangan opsional; unggah sesuai batas file |
| `archived_at?` | Nonaktif/arsip, bukan hapus permanen riwayat |

**Kondisi bukan status.** Barang dapat berkondisi `BAIK` tetapi berstatus `DIPINJAM`. Item yang `HILANG` tidak boleh dipinjam sebelum statusnya diperbaiki. Untuk buku, catat per eksemplar bila perlu dibedakan siapa yang meminjamnya.

### 8.3 Alur pinjam/sewa/kembali [FINAL]

1. Pengurus Asset dan Property membuka inventaris, pilih aset `TERSEDIA`.
2. Pilih `Pinjam` atau `Sewakan` lalu isi **nama peminjam/penyewa secara manual**, kontak bila perlu, tanggal keluar, tanggal rencana kembali, kondisi awal, serta biaya sewa bila ada.
3. Peminjam **boleh siapa saja**: pengurus, anggota umum, atau pihak luar; **tidak perlu akun dan tidak wajib ada pada database anggota**.
4. Simpan transaksi: status aset menjadi `DIPINJAM` atau `DISEWAKAN`, catatan aktor dibuat.
5. Saat kembali, catat tanggal aktual, kondisi setelah pemakaian, dan keterangan kerusakan jika ada; jika layak, kembali `TERSEDIA`, jika rusak pindah `PERBAIKAN`/kondisi sesuai fakta.
6. Keterlambatan dihitung bila belum kembali dan melewati tanggal rencana; tampilkan indikator, tanpa wajib email/WA otomatis.
7. **Riwayat semua transaksi tidak dihapus** walaupun barang sudah kembali. Pengurus dapat melihat siapa, kapan, dan petugas pencatatnya.

**Tidak perlu alur persetujuan peminjaman pada MVP.** Pencatatan penyewaan berbayar tidak otomatis berarti pembayaran online; catatan biaya sewa bisa dihubungkan ke realisasi keuangan P1.

### 8.4 Inventaris digital dan keamanan [FINAL/REKOMENDASI]

Field: jenis aset (`DRIVE_FOLDER`, `ACCOUNT`, `DOMAIN`, `HOSTING`, `WEBSITE`, `REPOSITORY`, lainnya), nama, URL/referensi, PIC/pengelola, status, tanggal berakhir/perpanjangan opsional, dan referensi tempat kredensial. **Jangan menyimpan password, API token, recovery code atau private key dalam kolom teks biasa maupun audit log.** Jika perlu kredensial, gunakan password manager dengan pengaturan akses yang sesuai; ERP hanya menyimpan rujukan aman. Anggota Asset dan Property berizin mengelola inventaris; unit lain dapat membaca metadata aset yang tidak sensitif, bukan kredensial atau data pribadi peminjam.

---

## 9. Website publik, acara, formulir pendaftaran, dan Short Link [P1]

### 9.1 Pemisahan konsep [FINAL]

- `Program (Proker)` adalah kegiatan kerja internal, dapat hidup tanpa pengumuman publik.
- `PublicEvent` adalah konten yang muncul di landing page/website pengunjung setelah **Publish**; bisa terhubung ke Proker tetapi tidak wajib.
- `RegistrationForm` adalah formulir pendaftaran yang diaktifkan untuk sebuah acara, tidak otomatis ada untuk semua acara.
- `RegistrationSubmission` adalah jawaban publik, termasuk data pribadi; **bukan akun pengguna internal**.

### 9.2 Acara publik [FINAL/REKOMENDASI]

Semua pengurus aktif boleh membuat acara publik. Field awal: judul, deskripsi, tanggal/waktu, lokasi, poster opsional, tautan terkait, `program_id?`, status `DRAFT`/`PUBLISHED`/`UNPUBLISHED`. Konten internal Proker (RAB, Kanban, panitia pengelola) **tidak otomatis diekspos** di API website publik. Pembuat dapat mengedit/menghapus kontennya sendiri; **Inti** bisa mengelola konten pengurus lain. **[TERBUKA]** Apakah perlu review konten sebelum Publish; untuk MVP usulkan publish oleh pembuat tanpa approval tambahan karena UKM ingin operasional ringan.

### 9.3 Template Form Builder — hanya titik awal [FINAL]

Ketika pengurus membuat formulir baru, sistem **dapat mengisi template awal** berikut:

| Urutan awal | Label | Jenis awal | Detail awal |
|---|---|---|---|
| 1 | Nama Lengkap | Short text | Contoh label yang boleh diubah/dihapus |
| 2 | NIM | Short text | Nilai diperlakukan string, termasuk nol di depan |
| 3 | Fakultas | Dropdown | Pilihan awal **FIF, FKS, FIK, FIT, FRI, FEB, FTE** |
| 4 | Prodi / Jurusan | Short text | Placeholder **`S1 Informatika`** |

**Keempatnya bukan kolom wajib permanen.** Pembuat formulir boleh **menghapus keempatnya, menambah, mengganti label, opsi, tipe, urutan, placeholder, instruksi, dan status wajib/opsional**. Jangan hardcode validasi `NIM/fakultas` pada semua acara karena kegiatan bisa terbuka untuk peserta nonmahasiswa. Contohnya, acara umum bisa hanya meminta `Nama` dan `Nomor Kontak`.

### 9.4 Fitur Form Builder [FINAL/REKOMENDASI]

- Tipe field awal: teks pendek, paragraf/teks panjang, pilihan tunggal (radio), dropdown, checkbox/multi-pilihan; tanggal/angka/email bisa ditambahkan tanpa mengubah model.
- Tambah/ubah/hapus pertanyaan, tambah/ubah/hapus pilihan jawaban, atur required, placeholder, hint, urutan drag-and-drop **atau** tombol naik/turun (untuk mobile), dan **section/bagian baru**.
- Editor melakukan preview sebagaimana peserta melihatnya.
- Form dapat disimpan `DRAFT`, diterbitkan, dibuka atau ditutup untuk menerima pendaftaran; status acara publik tidak harus identik dengan status penerimaan pendaftaran.
- **Tidak ada kewajiban mempertahankan field fakultas/prodi pada hasil ekspor.** Kolom ekspor berdasarkan pertanyaan yang ada pada versi form.
- Section baru berarti pengelompokan pertanyaan. **Conditional branching/skip logic bukan kebutuhan MVP P1 awal**; masuk P2 bila diinginkan.
- **[REKOMENDASI penting]** Jika respons sudah masuk, perubahan struktur disimpan sebagai **versi form baru**. Jawaban lama tetap terhubung ke versi pertanyaan saat diisi, sehingga ekspor/histori tidak rusak. Penghapusan pertanyaan pada form baru tidak menghapus respons versi lama.

### 9.5 Alur pendaftaran peserta [FINAL/REKOMENDASI]

1. Pengurus berakun aktif membuat acara dan, bila diperlukan, membuat atau menautkan formulir pendaftaran khusus untuk acara tersebut.
2. Pengurus memilih template empat field sebagai titik awal, lalu bebas mengganti seluruh isi form; preview dan Publish.
3. Website publik menampilkan detail acara yang telah diterbitkan dan tombol **Daftar** jika form penerimaan sedang dibuka.
4. Peserta mengisi form dari browser **tanpa membuat akun ERP**. Backend memvalidasi field yang **benar-benar ada** pada form versi aktif dan menyimpan jawaban, timestamp, serta `form_version`.
5. Setelah kirim, peserta melihat konfirmasi yang tidak membocorkan identitas pendaftar lain.
6. Pengurus pengelola acara/form dapat melihat jumlah dan daftar respons, memfilter, serta mengekspor **Excel/CSV**. **Respons pribadi tidak otomatis terlihat oleh semua pengurus** walau detail kegiatan/proker dapat dilihat semua.
7. Jika pendaftaran ditutup, endpoint publik menolak pengiriman baru dan halaman menjelaskan bahwa pendaftaran berakhir. Respons lama tetap tersedia bagi yang berwenang.

**MVP P1 awal** mencakup form fleksibel sederhana, publish/open/close, respons tanpa akun, list, dan ekspor. Tidak perlu kuota kompleks, pembayaran, QR attendance, sertifikat, integrasi Google Forms, atau unggah berkas oleh pendaftar pada tahap awal.

### 9.6 Hak akses Form Builder dan data peserta [REKOMENDASI]

Semua pengurus aktif boleh membuat formulir/acara sendiri. Pembuat dan pengelola Proker yang diberi assignment dapat mengedit formulir acara yang dikelolanya; Inti dapat mengelola sesuai mandat. Pendaftaran bisa dilakukan publik tanpa akun, tetapi **hanya pemilik/pengelola acara dan petugas yang ditugaskan** dapat membaca/mengunduh detail respons berisi data pribadi. Semua ekspor dan tindakan penghapusan jawaban perlu audit. Aturan akses final terhadap data peserta perlu konfirmasi pengurus, terutama masa retensi data.

### 9.7 Short Link [FINAL]

Semua pengurus berakun aktif bisa membuat short link (`slug` unik + `destination_url`). Pembuat boleh memperbarui, menonaktifkan, atau soft-delete short link **miliknya sendiri**. **Anggota Inti** berwenang melakukan hal tersebut untuk short link milik pengurus lain. Validasi slug; batasi skema tujuan ke `https://`/`http://` sesuai kebijakan keamanan; cegah skema seperti `javascript:` dan tujuan berbahaya/internal sesuai aturan redirect aman. Redirect publik hanya untuk link aktif; hapus/ubah tujuan harus masuk audit. Statistik klik detail dan QR generator dapat P2.

---

## 10. Matriks role, akses baca, dan akses mutasi

**ABAC ringan:** kebijakan dievaluasi dari identitas aktif, jabatan/keanggotaan unit, kepemilikan konten, assignment Proker, status Proker, scope tugas, dan aksi. Semua pemeriksaan dilakukan **server-side**; frontend hanya menyesuaikan tombol/menunya.

| Aksi | Siapa berwenang | Catatan |
|---|---|---|
| Login ERP | Pengurus dengan akun aktif | Peserta/panitia nonakun tidak bisa login |
| Buat akun, nonaktifkan akun | Inti dengan mandat `manage_users` | Bukan tiap Inti otomatis bebas mengelola password menurut rekomendasi keamanan |
| Lihat detail Proker lintas departemen | Semua akun pengurus aktif | Termasuk RAB dan arsip; tidak mencakup kredensial atau PII pendaftaran |
| Buat Proker | Kepala Departemen atau anggota Inti | Status langsung ACTIVE |
| Edit isi Proker ACTIVE | Pengurus dengan `ProgramAssignment` edit pada Proker itu | Inti yang tidak ditugaskan tetap read-only untuk edit operasional |
| Tambah/cabut penugasan Proker | Anggota aktif departemen pemilik Proker | Lintas departemen tidak bisa; aksi tercatat |
| Ubah template/struktur kepanitiaan Proker | Ketua Pelaksana berakun dengan penugasan Proker | Boleh menambah, menghapus, menamai ulang kelompok/jabatan, memecah PDD, sebelum CLOSED; bukan pemberian hak edit aplikasi |
| Tutup Proker ACTIVE | Ketua Pelaksana yang login / anggota Inti | Konfirmasi meski task belum DONE |
| Edit Proker CLOSED | **Tidak ada pada MVP** | Termasuk task/RAB/dokumen yang menjadi arsip |
| Buat/edit tugas asli Kanban Umum | Semua akun pengurus aktif | Tidak mencakup tugas Proker yang hanya terlihat sebagai agregasi |
| Buat/edit tugas asli Departemen | Anggota aktif departemen tersebut | Orang luar view-only |
| Buat/edit tugas asli Bidang | Anggota aktif bidang tersebut | Orang luar view-only; mandat lintas bidang eksplisit jika diperlukan |
| Buat/edit tugas asli Proker | Akun dengan assignment Proker ACTIVE | Tidak bisa lewat papan agregasi setelah hak dicabut |
| Lihat Kanban unit lain | Semua pengurus aktif | Mode read-only sesuai scope |
| Lihat Monitoring lintas UKM | Inti/Kepala HR menurut rekomendasi | Bisa diperluas oleh admin |
| Kelola inventaris fisik/digital | Anggota aktif Asset dan Property yang berwenang | Pengurus lain membaca metadata nonsensitif |
| Lihat data peminjam dan respons pendaftaran | Petugas modul/pengelola yang ditugaskan | Di luar keterbukaan data umum Proker |
| Buat acara, formulir, short link | Semua akun pengurus aktif | Di luar workflow approval |
| Ubah/hapus acara/short link orang lain | Inti | Soft-delete disarankan, audit wajib |

**Policy contoh (semantik):**

```text
ALLOW edit_program IF
  user.active AND program.status == ACTIVE
  AND user has active ProgramAssignment(program.id, can_edit=true)

ALLOW manage_committee_structure IF
  user.active AND program.status == ACTIVE
  AND user.id == program.chairperson_user_id
  AND user has active ProgramAssignment(program.id, can_edit=true)

ALLOW manage_program_assignments IF
  user.active AND user is active member of program.owner_department
  AND program.status == ACTIVE

ALLOW update_department_task IF
  user.active AND task.owner_scope == DEPARTMENT
  AND user belongs to task.owner_department
  AND task is not a locked/archived program task

ALLOW close_program IF
  user.active AND program.status == ACTIVE
  AND (user is program.chairperson OR user has an active Inti position)
```

**Catatan implementasi:** `program.chairperson_user_id` dalam contoh policy merupakan identitas akun yang ditautkan secara sah ke `chairperson_member_id`, bukan field wajib baru; relasinya perlu dijaga agar tidak ada dua pemilik Ketua Pelaksana yang bertentangan.

**Catatan prioritas kebijakan:** hak dari satu papan tidak mengesampingkan pembatasan scope task asli. `DENY` pada `CLOSED` selalu menang. Audit log tidak menggantikan kontrol akses untuk data pribadi atau kredensial.

---

## 11. Functional Requirements & Acceptance Criteria

### F01/F02 — Auth, jabatan dan akses (P0)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-001 | Login username/password | Akun aktif bisa login; nonaktif/invalid ditolak; password selalu di-hash kuat; rate limit login |
| FR-002 | Admin akun personal | Admin `manage_users` dapat membuat/menonaktifkan akun; tidak ada akun password bersama per departemen |
| FR-003 | Struktur organisasi | 4 Super Inti, 3 departemen, 4 bidang, fungsi HR, dan posisi Inti dapat dimodelkan sebagai data dan periode |
| FR-004 | Assignment ganda | Satu pengurus dapat memegang beberapa posisi/proker tanpa akun kedua |
| FR-005 | Otorisasi server-side | Percobaan mutasi lintas scope mengembalikan 403 tanpa mengubah data |

### F03/F04/F05 — Beranda, Proker, kepanitiaan (P0)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-006 | Dashboard personal | Hanya tugas/proker pengguna yang ditugaskan muncul sebagai fokus pekerjaan; proker lain tetap dapat dicari |
| FR-007 | Buat Proker langsung aktif | Kepala Departemen/Inti menciptakan proker `ACTIVE` tanpa workflow persetujuan |
| FR-008 | Baca lintas departemen | Akun pengurus aktif dapat membuka detail Proker lain termasuk RAB dan histori operasional |
| FR-009 | Edit berdasarkan penugasan | Pengurus bukan pengelola mendapat read-only dan endpoint mutasinya 403 |
| FR-010 | Kelola assignment oleh anggota departemen | Anggota departemen pemilik dapat grant/revoke pengelola; anggota departemen lain tidak bisa; audit ada |
| FR-011 | Ketua Pelaksana fleksibel | Bisa ditunjuk dari orang berbeda/ketua departemen; operasi dalam sistem membutuhkan akun dan assignment |
| FR-012 | Panitia tanpa akun | Nama dan jabatan panitia disimpan tanpa meminta kredensial |
| FR-041 | Template panitia default | Proker baru menawarkan Ketua Pelaksana, Wakil, Sekben (Sekretaris/Bendahara), divisi Humas, Acara, PDD, Logistik tanpa mewajibkan semuanya diisi |
| FR-042 | Custom struktur oleh Ketua Pelaksana | Ketupel berakun dan ditugaskan bisa tambah/ubah/hapus/reorder posisi/divisi, memecah PDD menjadi Desain + Pubdok atau susunan lain; non-Ketupel tanpa mandat tidak boleh |
| FR-043 | Struktur panitia terpisah dari akses | Nama panitia tanpa akun boleh dicatat; penambahan/penempatan peran tidak memberikan hak edit secara otomatis atau mengubah `units` resmi UKM |
| FR-044 | Audit dan arsip panitia | Perubahan struktur/keanggotaan panitia diaudit; penutupan Proker menjadikannya read-only dan API menolak mutasi |
| FR-013 | Tutup manual & warning | Ketua Pelaksana/Inti dapat menutup, task tertinggal memunculkan warning dan tidak memblokir |
| FR-014 | Arsip immutable secara operasional | Setelah CLOSED seluruh perubahan Proker/task/RAB ditolak; histori dapat dicari dan dibaca |

### F06/F07/F08/F09/F10 — RAB, Kanban, kalender, monitoring, audit (P0)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-015 | RAB pencatatan | Tambah/ubah item, total backend; tidak ada permintaan approval atau status verifikasi |
| FR-016 | 4 scope Kanban | Task asli berada di Umum/Departemen/Bidang/Proker; satu `task_id` tanpa duplikasi |
| FR-017 | Hak edit Kanban Umum | Semua pengurus aktif dapat edit task scope ORGANIZATION |
| FR-018 | Hak edit Kanban Departemen/Bidang | Anggota unit dapat edit task asli unit; luar unit read-only |
| FR-019 | Hak edit Kanban Proker | Pengelola proker ditugaskan dapat edit; pengguna di luar assignment tidak, termasuk pada papan agregasi |
| FR-020 | Kalender satu sumber data | Agenda umum dan unit tampil menurut filter; tanggal Proker tidak harus diinput dua kali |
| FR-021 | Monitoring & drill-down | Inti/HR melihat jumlah task per status per unit; tugas tidak dihitung ganda |
| FR-022 | Audit perubahan | Rekam actor/timestamp/resource/action dan nilai before/after yang aman untuk Proker, RAB, tugas, penugasan, penutupan |

### F11/F12 — Lampiran dan realisasi (P1)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-023 | Batas file | Berkas valid <=20 MB dapat diunggah; >20 MB ditolak (413) tanpa ditampung seluruhnya di RAM |
| FR-024 | File aman | MIME/ekstensi divalidasi, penyimpanan persisten, akses unduh diperiksa |
| FR-025 | Realisasi | Pengelola Proker mencatat pengeluaran aktual dan melihat selisih dari RAB tanpa approval |

### F13/F14 — Inventaris (P1)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-026 | Aset fisik termasuk buku | Kode unik, lokasi, kondisi dan status disimpan sebagai field terpisah |
| FR-027 | Peminjam manual | Transaksi menerima nama peminjam eksternal tanpa user_id/akun dan mencatat due date |
| FR-028 | Pinjam, sewa, kembali | Status mengikuti transaksi; kondisi awal/akhir dan tanggal kembali tersedia |
| FR-029 | Histori terlacak | Peminjaman lama tetap dapat dibuka setelah barang kembali; penghapusan hanya arsip |
| FR-030 | Aset digital | Folder/Drive/akun/domain/hosting/repo dapat dicatat tanpa password/API key plaintext |

### F15/F16/F17/F18 — Website publik, Form Builder, pendaftaran, Short Link (P1)

| ID | Kebutuhan | Diterima bila |
|---|---|---|
| FR-031 | Acara publik | Semua pengurus aktif dapat membuat; hanya konten PUBLISHED terlihat oleh pengunjung |
| FR-032 | Ownership konten | Pembuat dapat mengelola miliknya; Inti dapat mengelola milik orang lain; selain itu 403 |
| FR-033 | Form template awal | Form baru dapat diisi Nama/NIM/Fakultas/Prodi-Jurusan sebagai **template saja** |
| FR-034 | Fully editable | Semua field bawaan dapat dihapus/ubah; pengguna menambah field/opsi/section dan mengatur required/urutan |
| FR-035 | Pilihan fakultas & placeholder | Dropdown awal FIF/FKS/FIK/FIT/FRI/FEB/FTE dan placeholder `S1 Informatika` tampil bila template dipakai |
| FR-036 | Public registration | Peserta tanpa akun dapat mengirim jawaban sesuai form versi aktif; input tervalidasi dan antispam dasar |
| FR-037 | Data respons | Pengelola dapat melihat respons dan ekspor Excel/CSV; pihak luar tidak melihat PII |
| FR-038 | Versioning form | Mengubah form setelah menerima respons tidak menghapus atau merusak respons historis |
| FR-039 | Short Link | Semua pengurus bisa membuat; pembuat bisa edit/nonaktif/hapus milik sendiri; Inti bisa mengelola semua |
| FR-040 | Redirect aman | Slug unik dan URL tervalidasi; link nonaktif tidak redirect; aktivitas mutasi diaudit |

---

## 12. Model data konseptual

| Entitas | Field/relasi pokok | Modul pemilik logis (semua dalam `erp_ukm`) |
|---|---|---|
| `users` | id, username, password_hash, is_active | Identity & Org |
| `members` | id, name, contact?, user_id? | Identity & Org |
| `units` | id, name, type, parent_id?, active_period | Identity & Org |
| `position_assignments` | member_id/user_id, role, unit_id?, period, active | Identity & Org |
| `programs` | id, title, owner_unit_id, owner_department_id? (untuk unit yang berada di bawah departemen), owner_division_id?, creator_id, chairperson_member_id, status, dates, closed_at?, closed_by? | Operations / Program |
| `program_assignments` | program_id, user_id, can_edit, granted_by, valid_from, revoked_at? | Operations / Program |
| `committee_groups` | id, program_id, parent_group_id?, label, sort_order, template_version? | Operations / Program |
| `committee_roles` | id, program_id, group_id?, title, sort_order, is_chairperson? | Operations / Program |
| `committee_members` | id, program_id, committee_role_id?, member_id?, user_id?, display_name, notes? | Operations / Program |
| `budget_lines` | program_id, label, category, quantity, unit_price, amount, version | Operations / Finance |
| `tasks` | task_id, scope_type, scope_id, assignee_user_id?, committee_member_id?, status, due_at?, version | Operations / Program |
| `calendar_events` | id, scope_type, scope_id, program_id?, public_event_id?, start_at, end_at | Operations / Program |
| `audit_logs` | actor_id, action, resource_id/type, timestamp, safe_before_after | Owner domain / audit |
| `physical_assets` | code, name, category, location, condition, status, custodian, archived_at? | Asset submodule |
| `asset_loans` | asset_id, transaction_type, borrower_name, contact?, loan_at, due_at, returned_at?, condition_before/after, logged_by | Asset submodule |
| `digital_assets` | name, type, url?, owner_id?, reference_to_password_manager?, notes | Asset submodule |
| `public_events` | title, content, poster, starts_at, owner_user_id, program_id?, publish_status | Public Content submodule |
| `registration_forms` | id, public_event_id, owner_id, published_version_id?, accepting_submissions | Registration submodule |
| `form_versions` | form_id, version, sections, ordered questions/options schema, published_at | Registration submodule |
| `form_submissions` | form_id, form_version_id, timestamp, responses JSON, optional dedupe token | Registration submodule |
| `short_links` | slug, destination, owner_user_id, active, deleted_at? | Public Content submodule |
| `files` | id, owning_resource, path/storage_key, size, mime, uploaded_by | Owner domain / shared storage |

**Model ini konseptual**, bukan perintah membuat seluruh tabel pada minggu pertama. Semua tabel berada dalam **satu database PostgreSQL `erp_ukm`**, sehingga foreign key dan transaksi lintas tabel dapat digunakan untuk menjaga integritas. Kepemilikan domain bersifat **modular/logis**, bukan pemisahan database fisik. Modul mengakses aturan bisnis modul lain melalui *application service* atau antarmuka internal, bukan menulis ke tabel milik modul lain sembarangan. `owner_unit_id` memungkinkan proker di bawah departemen/bidang maupun fungsi HR; **[TERBUKA]** detail pengelolaan assignment untuk proker milik fungsi HR atau tingkat UKM. Data form dinamis menyimpan **ID pertanyaan stabil dan versi**; kolom Nama/NIM/Fakultas/Prodi tidak boleh dianggap selalu ada.

---

## 13. Arsitektur teknis dan batas infrastruktur — Modular Monolith [FINAL]

### 13.1 Prinsip arsitektur

**Keputusan final v1.4:** ERP UKM menggunakan **modular monolith**, bukan microservices. Seluruh modul backend berjalan sebagai **satu aplikasi FastAPI**, berbagi **satu database PostgreSQL** dan **satu proses rilis/migrasi**. Batas modul ditetapkan pada kode, kepemilikan business rules, antarmuka internal, serta pengujian, bukan melalui jaringan.

- **Satu backend deployment:** tidak ada Auth Service, Program Service, Finance Service terpisah.
- **Satu PostgreSQL database:** `erp_ukm`; foreign key dan transaksi lintas entitas dipakai saat masuk akal. Kepemilikan tabel tetap per modul secara logis.
- **Satu sistem autentikasi dan authorization:** central policy code; semua endpoint melakukan enforcement server-side, dan pengecekan sesuai aksi/scope.
- **Interaksi modul in-process:** panggil application service melalui antarmuka yang jelas; **tidak membuat HTTP call ke localhost antar modul**.
- **Satu audit trail:** perubahan penting ditulis dalam transaksi database terkait bila memungkinkan, sehingga tidak kehilangan jejak saat operasi gagal.
- **Satu unit deployment tidak berarti satu file besar:** modular monolith memerlukan disiplin dependensi antar modul dan tests, bukan pembagian folder kosmetik.

### 13.2 Diagram deployment sederhana

```text
Pengurus / Peserta (Browser, HTTPS)
              |
       Caddy Reverse Proxy
       |               |
    Frontend        /api/*
  (React + Vite)       |
   file statis   FastAPI Monolith
                    |
              +-----+-----------------------------------+
              | auth & organization | programs          |
              | permissions         | tasks/kanban      |
              | calendar            | budgets           |
              | monitoring & audit  | asset management  |
              | public events       | forms/registration|
              | short links         | file metadata     |
              +---------------------+-------------------+
                              |
                      PostgreSQL: erp_ukm
                              |
                   Backup terenkripsi di luar VPS

Container utama di Docker Compose: caddy, backend, postgres.
File lampiran: volume persisten/objek storage sesuai kebutuhan.
```

**Frontend:** React + Vite **direkomendasikan** untuk rilis pertama karena dapat disajikan sebagai aset statis tanpa proses Node.js yang menetap. Ini belum keputusan final UI stack. Jika halaman publik membutuhkan SSR/SEO khusus, evaluasi Next.js dengan biaya RAM dan operasionalnya. Aplikasi publik dan dashboard dapat berada pada satu frontend/routing atau dipisah pada level UI saja, tanpa memecah backend.

### 13.3 Batas modul internal

| Modul FastAPI | Kepemilikan aturan bisnis dan data | Catatan integrasi |
|---|---|---|
| `auth` | Akun, password hash, sesi/login, status akun | Semua aksi internal memerlukan identitas aktif |
| `organization` | Anggota, unit, bidang, posisi, HR, periode | Menyediakan fungsi cek keanggotaan dan jabatan untuk `permissions` |
| `permissions` | RBAC+ABAC, pemeriksaan scope dan aksi | Kebijakan terpusat; identitas & assignment diverifikasi melalui API internal Python |
| `programs` | Proker, panitia, assignment, lifecycle ACTIVE/CLOSED | Menentukan siapa boleh edit/menutup; arsip harus immutable secara operasional |
| `tasks` | Tugas Kanban umum/unit/bidang/proker, assignee, status | Asal scope menentukan hak edit meskipun muncul di agregat |
| `calendar` | Agenda umum, unit, proker, pengguna | Menggunakan referensi tanggal proker/tugas, tanpa input ganda |
| `budgets` | Item RAB dan total, realisasi P1 | Pencatatan saja; tidak ada approval |
| `monitoring` | Rekap tugas/proker lintas unit | Query read-only/agregat terhadap sumber yang sama |
| `audit` | Catatan mutasi penting, actor dan timestamp | Redaksi/larangan menyimpan secret/PII yang tidak perlu |
| `assets` (P1) | Inventaris fisik/digital, status, kondisi, pinjam/sewa/kembali | Transaksi peminjaman dan master aset terpisah |
| `public_content` (P1) | Acara publik, short link dan ownership | API publik tidak mengekspos RAB/proker/PII internal |
| `registrations` (P1) | Form, versi pertanyaan, jawaban peserta, ekspor | Template 4 field sepenuhnya dapat diubah/dihapus |
| `files` (P1) | Metadata, validasi ukuran/jenis, penyimpanan lampiran | Maksimum 20 MB per file; tidak buffering penuh di RAM |

**Aturan dependensi:** router tidak melakukan query SQL langsung; router memanggil *application service*; repository fokus pada persistence. Modul tidak mengimpor router atau repository privat modul lain. Kebutuhan lintas modul memakai method/service internal yang diekspos, dengan pengujian kontrak modul. `permissions` memutuskan boleh/tidak, bukan hanya menyembunyikan tombol frontend.

### 13.4 Struktur kode awal (ilustrasi)

```text
erp-ukm/
  backend/
    app/
      main.py                    # FastAPI app, register routers
      core/
        config.py                # environment config
        database.py              # engine, session, transaction
        security.py              # password hash, session
        dependencies.py          # current user, db session
      modules/
        auth/
          router.py
          schemas.py
          models.py
          service.py
          repository.py
        organization/
          router.py, schemas.py, models.py, service.py, repository.py
        permissions/
          policies.py, dependencies.py
        programs/
          router.py, schemas.py, models.py, service.py, repository.py
        tasks/
          router.py, schemas.py, models.py, service.py, repository.py
        calendar/
        budgets/
        monitoring/
        audit/
        assets/                  # P1
        public_content/          # P1
        registrations/          # P1
        files/                   # P1
    alembic/                     # satu migration history
    tests/
  frontend/
  deploy/
    compose.yaml
    Caddyfile
  README.md
  .env.example                   # tidak menyimpan secret asli
```

Struktur file tidak perlu diikuti secara mekanis. Tujuannya: **fitur punya ownership kode yang jelas**, mudah diuji, tidak menjadi `main.py` atau `models.py` raksasa.

### 13.5 Database, transaction, dan consistency

- **Satu database `erp_ukm`** pada satu PostgreSQL instance. **Satu Alembic migration stream**, disertai constraints `UNIQUE`, `CHECK`, foreign keys, indeks dan lock/version bila diperlukan.
- Satu request yang mengubah Proker, assignment, dan audit dapat menggunakan **satu transaksi PostgreSQL**. Contoh `Tutup Proker`: validasi role → lock/update status → tulis audit → commit; semua berhasil bersama atau rollback bersama.
- `CLOSED` wajib diperiksa oleh service dan policy pada setiap operasi perubahan terkait Proker, termasuk Task, RAB, lampiran/kalender yang menjadi bagian arsip; jangan hanya mengandalkan UI.
- Field `scope_type` + `scope_id` untuk task perlu constraint/pemeriksaan integritas sesuai desain ERD final; hindari foreign key polimorfik yang tidak dapat divalidasi tanpa aturan tambahan.
- Tambahkan `updated_at`/version counter untuk operasi rentan *lost update* ketika dua pengurus mengedit data bersamaan; API mengembalikan konflik 409 bila versi tidak cocok.
- Untuk Form Builder P1 gunakan PostgreSQL JSONB untuk **schema form versi tetap** dan jawaban peserta dengan pertanyaan ber-ID stabil; jangan menggunakan kolom universal `nim`/`fakultas` pada semua formulir.
- Untuk jumlah data MVP, laporan monitoring cukup query/agregasi indeks pada database yang sama; **tidak perlu event bus, cache Redis atau materialized view sejak awal**.

### 13.6 API dan proses latar belakang

- API publik dan pengurus bisa berbagi codebase **dengan router terpisah** (`/api/admin/...` dan `/api/public/...`) serta middleware/rate limit yang sesuai.
- REST API FastAPI + OpenAPI untuk antarmuka frontend; **tidak perlu service-to-service API**.
- Background pekerjaan kecil bisa menggunakan mekanisme sederhana yang sesuai, tetapi jangan mengandalkan `BackgroundTasks` in-process untuk pekerjaan kritikal/harus dijamin (misalnya ekspor besar atau notifikasi resmi) tanpa penyimpanan status job yang persisten.
- Untuk MVP, permintaan ekspor kecil dapat dibuat langsung dengan batas baris/memori; proses berat baru memakai worker terpisah jika terbukti perlu (bukan mengubah sistem menjadi microservices).
- Short link endpoint redirect publik harus memvalidasi tujuan URL; API publik pendaftaran melakukan validasi form versi aktif, rate limit, dan mencegah kebocoran informasi pendaftar lain.

### 13.7 Infrastruktur dan batas RAM

| Komponen | Rancangan ringan |
|---|---|
| Reverse proxy | Caddy (HTTPS + static frontend + `/api` reverse proxy) |
| Backend | **Satu** container FastAPI, awalnya satu Uvicorn worker; ukur RAM dan latensi sebelum menambah worker |
| Database | **Satu** container PostgreSQL, database `erp_ukm`, hanya jaringan internal Compose |
| Frontend | React + Vite build-time; aset statis via Caddy; tidak wajib proses Node.js saat runtime |
| File storage | Volume persisten dengan hard limit file 20 MB, validasi tipe, kuota total menyusul |
| Backup | PostgreSQL dump/PITR sesuai kapasitas + file storage, **off-host**, rutin diuji restore |
| Observability | JSON logs/rotasi, health check, statistik container/disk; stack monitoring berat ditunda |

**VPS 2 GB:** cocok sebagai target awal yang perlu diuji dengan satu worker, query efisien, pool terbatas, dan traffic rendah. **VPS 4 GB:** ruang cadangan lebih baik. Jumlah request yang sanggup ditangani **tidak dijamin** hanya dari RAM; uji beban sesuai data dan perangkat riil. Satu VPS tetap menjadi *single point of failure* dan bukan high availability. Hindari RabbitMQ, Redis, Kubernetes, banyak worker, dan service tambahan kecuali pengukuran menunjukkan kebutuhan.

### 13.8 Non-functional requirements

| ID | Aspek | Kriteria |
|---|---|---|
| NFR-01 | Auth | HTTPS, sesi/cookie aman, password Argon2id atau hash kuat setara, rate limit login, invalidasi sesi saat akun dinonaktifkan |
| NFR-02 | ABAC | Kebijakan terpusat namun dipanggil dari seluruh endpoint mutasi/sensitif; `default deny`; test 401/403 terpisah |
| NFR-03 | Audit | Actor dan perubahan penting tercatat dalam transaksi yang sama bila memungkinkan; jangan audit password, token, secret atau PII berlebihan |
| NFR-04 | Data | Foreign key satu DB, transaksi atomik, constraints, locking/version untuk race, **satu** Alembic migration history |
| NFR-05 | Resource | Ukur RAM app/Postgres, batasi workers/connection pool, pagination, indeks; log rotation dan monitor disk |
| NFR-06 | File | Batas **20 MB/file** ditegakkan di proxy+backend, upload streaming ke disk persisten, kuota total terbuka |
| NFR-07 | Privasi | Respons peserta dan identitas peminjam terproteksi; retensi/izin ekspor data masih perlu keputusan |
| NFR-08 | Keamanan form publik | Validasi schema versi aktif, rate limit/antispam, sanitasi saat render, CSRF jika relevan dengan cookie |
| NFR-09 | Redirect | Validasi slug dan destination URL; larang skema berbahaya dan tujuan jaringan internal yang berisiko |
| NFR-10 | Backup | Backup DB + media off-host secara berkala; restore diuji sebelum dipakai secara riil |
| NFR-11 | UX | Mobile-first sekitar 360px; Kanban bisa list view, label status familiar |
| NFR-12 | Availability | Satu VPS = satu titik kegagalan; tidak mengklaim high availability |
| NFR-13 | API | OpenAPI, status/error jelas, request validation, health endpoint, test API/authorization; **tanpa timeout antarservice internal** |
| NFR-14 | Performa | Usulan target p95 operasi umum <1 detik dalam dataset/beban uji terukur, belum hasil benchmark |
| NFR-15 | Modularitas | Setiap modul punya service/repository/policy yang diuji; larang dependensi siklik dan akses langsung ke repository internal modul lain |

### 13.9 Performa Form Builder (P1)

- Skema form versi JSONB dengan batas pertanyaan/section wajar; editor tidak memuat seluruh respons.
- Validasi submission sesuai versi form aktif di server; pagination untuk respons; ekspor CSV streaming dengan batas keamanan dan audit.
- Ekspor Excel besar perlu batas jumlah respons, memori, dan pengujian; jangan `load all rows` tanpa ukur RAM.
- Foto/video resolusi tinggi tidak disimpan di disk VPS kecil; gunakan link eksternal atau storage terpisah bila sesuai kebutuhan UKM.

---

## 14. Pemetaan API tingkat tinggi (bukan kontrak final)

| Area | Contoh endpoint |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /me` |
| Organisasi | `GET /units`, `GET /members`, `POST /users`, `PATCH /position-assignments/{id}` |
| Proker | `POST /programs` (langsung ACTIVE), `GET /programs`, `GET /programs/{id}`, `POST /programs/{id}/close` |
| Assignment | `POST /programs/{id}/assignments`, `DELETE /programs/{id}/assignments/{assignmentId}` |
| Kepanitiaan/RAB | `GET /programs/{id}/committee`, `PUT /programs/{id}/committee/structure` (Ketupel), `POST /programs/{id}/committee/members` (sesuai mandat), `GET/PUT /programs/{id}/budget` |
| Kanban | `GET /tasks?scope=...`, `POST /tasks`, `PATCH /tasks/{id}` |
| Kalender/Monitoring | `GET /events?scope=...`, `GET /monitoring/units` |
| Inventaris P1 | `GET/POST /assets`, `POST /assets/{id}/loans`, `POST /asset-loans/{id}/return` |
| Aset digital P1 | `GET/POST /digital-assets` (tanpa secret plaintext) |
| Acara publik P1 | `GET /public/events`, `POST /admin/events`, `PATCH /admin/events/{id}` |
| Form Builder P1 | `POST /admin/events/{id}/forms`, `PUT /admin/forms/{id}/draft`, `POST /admin/forms/{id}/publish` |
| Pendaftaran P1 | `GET /public/forms/{slug}`, `POST /public/forms/{slug}/submissions`, `GET /admin/forms/{id}/submissions`, `GET /admin/forms/{id}/export` |
| Short Link P1 | `POST /admin/short-links`, `PATCH /admin/short-links/{id}`, `GET /s/{slug}` |

Endpoint final harus mendefinisikan: parameter, skema Pydantic, respons 200/201/204, error 400/401/403/404/409/413/422, kebijakan ABAC, idempotensi pada aksi penting, dan audit. Hindari endpoint `submit`, `approve`, `reject` untuk Proker: **tidak ada approval Proker pada desain ini**.

---

## 15. Roadmap implementasi yang realistis

### 15.1 Empat minggu — MVP inti P0

| Minggu | Pekerjaan | Bukti selesai |
|---|---|---|
| 1 — Fondasi | Repo modular monolith, Compose, satu PostgreSQL, login username/password, struktur 12 jabatan Inti, unit/assignment, ABAC, migrasi | Dua akun berbeda punya akses berbeda; unauthorized API ditolak |
| 2 — Proker | Buat proker langsung ACTIVE, ketua pelaksana, **template panitia fleksibel + ubah struktur oleh Ketupel**, akses baca/edit, penugasan, RAB tanpa approval, tutup manual, read-only arsip, audit | Template bawaan dapat diubah dan PDD dipecah, lalu Proker ditutup tanpa antrean persetujuan |
| 3 — Kanban & Kalender | Scope Umum/Departemen/Bidang/Proker, filter agregat, dashboard personal, kalender, monitoring per unit | Tidak ada task duplikat; hak edit selalu mengikuti scope asli |
| 4 — Stabilitas | Test akses/arsip/audit, responsive UI, load test ringan, backup/restore, dokumentasi, deploy, uji 5–8 pengurus | Demo lengkap dan dapat dioperasikan pada VPS terukur |

### 15.2 Fase setelah MVP inti (P1)

Urutan yang disarankan (bisa berubah menurut kebutuhan UKM): **(A) editor Acara Publik dan Short Link → (B) Form Builder & registrasi → (C) inventaris fisik + pinjam/sewa/kembali → (D) inventaris digital → (E) realisasi biaya/LPJ.** Ini adalah urutan pengembangan, **bukan penghapusan fitur PRD**. Form Builder yang benar-benar fleksibel, versi pertanyaan, dan ekspor peserta perlu waktu desain dan pengujian tersendiri.

### 15.3 Definition of Done

Fitur selesai jika: acceptance criteria dipenuhi; API dilindungi; test positif dan negatif berjalan; perubahan sensitif tercatat; validasi error state baik; UI responsif; migrasi dan seed demo tersedia; dokumentasi cukup untuk menjalankan ulang; penggunaan RAM sesuai hasil pengukuran. Rilis untuk penggunaan nyata memerlukan uji pengguna, kebijakan privasi, backup restore, dan penanggung jawab operasional.

---

## 16. UAT — skenario utama

| ID | Skenario | Hasil diharapkan |
|---|---|---|
| UAT-01 | Pengurus biasa login, tidak ditugaskan ke Proker A | Proker A tidak jadi fokus dashboard; ditemukan di Semua Proker dalam read-only |
| UAT-02 | Kepala Departemen atau anggota Inti membuat Proker | Proker langsung ACTIVE tanpa approval dan tercatat penciptanya |
| UAT-03 | Pengurus tanpa wewenang mencoba membuat Proker via API | 403; tidak ada record baru |
| UAT-04 | Anggota departemen pemilik menambahkan user lintas departemen sebagai pengelola | Assignment berhasil dan tercatat; user dapat edit Proker itu |
| UAT-05 | Anggota departemen lain mencoba mengubah assignment Proker | 403; isi assignment tidak berubah |
| UAT-06 | Pengurus tanpa assignment mencoba edit detail/RAB Proker yang boleh ia lihat | 403; hanya dapat membaca |
| UAT-07 | Anggota semua unit mengedit task asli Kanban Umum | Perubahan diizinkan dan diaudit |
| UAT-08 | Anggota Internal melihat dan mencoba mengedit task asli Departemen Eksternal | Bisa melihat; edit ditolak 403 |
| UAT-09 | Task Proker terlihat pada agregat departemen | Edit mengikuti assignment Proker; tidak ada duplikasi task |
| UAT-10 | Ketua Pelaksana menutup Proker dengan 3 tugas belum DONE | Muncul warning, lanjut bila dikonfirmasi, status CLOSED, audit tersimpan |
| UAT-11 | Siapapun mencoba mengubah tugas/RAB dalam Proker CLOSED | Ditolak; arsip tetap dapat dibaca |
| UAT-12 | Pengurus membuka Monitoring Departemen | Jumlah task tiap status per unit konsisten tanpa penghitungan ganda |
| UAT-13 | Pengurus Asset menambah buku atau kamera | Kondisi dan status terpisah, kode unik, data dapat dicari (P1) |
| UAT-14 | Pihak eksternal meminjam kamera, nama dimasukkan manual | Tidak perlu akun; status dipinjam, due date dan histori tersimpan (P1) |
| UAT-15 | Kamera dikembalikan rusak | Condition berubah; histori before/after tersimpan; tidak otomatis layak dipinjam (P1) |
| UAT-16 | Pengurus membuat form dan menghapus semua empat field template | Bisa; form valid sesuai pertanyaan pengganti, bukan memaksa NIM/fakultas (P1) |
| UAT-17 | Pengurus menambah dropdown dan section baru | Preview dan form publik mengikuti konfigurasi; required berfungsi (P1) |
| UAT-18 | Peserta tanpa login mendaftar; lalu pertanyaan form diubah | Data respons terdahulu tetap utuh dan terikat versi sebelumnya (P1) |
| UAT-19 | Pengurus tak berwenang membuka respons peserta acara orang lain | Ditolak; data pribadi tidak bocor (P1) |
| UAT-20 | Pengurus membuat short link; pengurus lain menghapusnya | Ditolak kecuali anggota Inti; pencipta boleh hapus miliknya (P1) |
| UAT-21 | Unggah 21 MB pada endpoint lampiran | Ditolak 413 tanpa lonjakan memori akibat penampungan file penuh (P1) |
| UAT-22 | Restore backup di lingkungan uji | Data utama dan audit kembali terbaca; tidak hanya sukses membuat file backup |
| UAT-23 | Ketupel membuat Proker dan memakai template panitia | Ada Ketua Pelaksana, Wakil Ketua, Sekben, Humas, Acara, PDD, Logistik tanpa anggota wajib akun |
| UAT-24 | Ketupel mengubah struktur dan memecah PDD | Bisa menambah/rename/hapus/reorder serta membuat Desain dan Pubdok; struktur hanya berubah pada Proker itu |
| UAT-25 | Operator non-Ketupel mengubah struktur panitia tanpa mandat | API mengembalikan 403; keanggotaan/struktur tidak berubah |
| UAT-26 | Panitia dicatat tanpa akun lalu Proker ditutup | Nama tetap terlihat di arsip, tidak mempunyai akun/izin edit otomatis, mutasi struktur setelah CLOSED ditolak |

---

## 17. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Pengurus enggan memindah kerja dari WA | Beranda personal, sedikit input, satu proker sebagai sumber data; WA tetap untuk percakapan |
| Semua anggota departemen dapat self-assign edit Proker | Audit grant/revoke, riwayat perubahan, evaluasi kebijakan bila muncul penyalahgunaan |
| Keterbukaan Proker disalahartikan sebagai keterbukaan PII | Pisahkan permission respons pendaftaran, data peminjam, dan kredensial digital |
| Kanban Umum jadi bypass izin Proker | Pemeriksaan scope asli setiap task, deny pada Proker CLOSED |
| Task agregat dihitung lebih dari sekali | `task_id` tunggal, query DISTINCT/aggregation dengan scope jelas |
| Ketua Pelaksana belum punya akun | Tetap bisa dicatat sebagai nama; Inti menutup; beri akun saat perlu aksi sistem |
| Form Builder bebas merusak respons historis | Form versioning, immutable submission schema, migration/preview |
| Form publik menerima spam/bot dan data salah | Rate-limit, validasi schema, honeypot/antispam dasar, batas panjang jawaban |
| Banyak data peserta pada VPS kecil | Pagination, query indexed, batas ekspor, streaming bila memungkinkan |
| Password organisasi bocor melalui inventaris | Tidak menyimpan password/API key sebagai plaintext; pakai password manager dan akses terbatas |
| Peminjaman aset tertukar dengan kondisi barang | Pisahkan condition/status dan catat transaksi lengkap sebelum/selepas |
| File 20 MB membebani RAM/disk | Streaming, pembatasan reverse proxy, volume persisten, kuota/backup |
| One-server outage | Backup off-host, healthcheck, dokumentasi recovery; tidak mengklaim HA |
| Scope P1 membengkak pada sprint MVP | P0 diprioritaskan, P1 dirilis setelahnya, definisi done diuji |
| Struktur kepanitiaan diperlakukan sebagai jabatan organisasi | Pisahkan data `committee_*` per-Proker dari `units/position_assignments`; template hanya memberi struktur awal, tidak memberi role/permission |
| Ketua Pelaksana nonakun ingin mengubah template | Harus masuk lewat akun berpenugasan Ketupel atau atur delegasi eksplisit di masa depan; jangan menyiasatinya dengan akun bersama |

---

## 18. Keputusan yang masih terbuka / bukan asumsi final

1. **[TERBUKA]** Apakah Proker yang sudah `CLOSED` boleh dibuka kembali? Jika ya, oleh siapa dan bagaimana audit/edit histori dilakukan? **Default MVP: tidak bisa**.
2. **[TERBUKA]** Detail siapa di kelompok Inti yang secara operasional mempunyai `manage_users` dan reset password; istilah Inti tidak harus berarti semua orang dapat mengakses rahasia login.
3. **[TERBUKA]** Apakah anggota Inti yang membuat Proker untuk unit lain harus langsung menjadi pengelola? Rekomendasi: pembuat otomatis diberi assignment pengelola proker itu, dapat dicabut oleh anggota departemen pemilik.
4. **[TERBUKA]** Hak Ketua Departemen untuk mengedit task asli bidang yang bukan keanggotaannya. Rekomendasi: read-only kecuali diberi penugasan khusus.
5. **[TERBUKA]** Publikasi acara perlu peninjauan atau langsung tayang oleh pembuat? Rekomendasi: langsung publish oleh pembuat, sesuai prinsip birokrasi ringan.
6. **[TERBUKA]** Kuota storage total, tipe file yang diizinkan, dan retensi data pribadi pendaftaran/peminjaman. Batas tiap file **sudah final 20 MB**.
7. **[TERBUKA]** Penyewaan aset: biaya, pembayaran tunai/transfer, kebijakan denda, dan pencatatan pemasukan—boleh ditambahkan P1 setelah kebutuhan nyata diketahui.
8. **[TERBUKA]** Kebijakan duplicate submission untuk Form Builder (satu peserta boleh daftar berulang atau tidak); karena semua field bisa dihapus, NIM tidak dapat dijadikan dedupe key universal.
9. **[TERBUKA]** Kapasitas VPS pasti (2 atau 4 GB, vCPU, storage) dan volume pendaftaran riil; profiling menentukan pool koneksi, jumlah worker, rate limit dan kuota disk, **bukan pemisahan microservice**.
10. **[TERBUKA]** Level akses membaca semua dokumen Proker: sesuai keputusan transparansi penuh untuk konten Proker biasa; klasifikasi khusus tetap diperlukan bila ada data pribadi/rahasia.

11. **[TERBUKA]** Jika fungsi HR atau Pengurus Inti membuat proker tanpa departemen pemilik, siapa yang boleh menambahkan/mencabut penugasan? Untuk Proker departemen, aturan semua anggota departemen pemilik tetap final.
12. **[TERBUKA]** Bila Ketua Pelaksana hanya dicatat sebagai nama tanpa akun, apakah ia perlu diberi akun aktif untuk menyunting struktur panitia sendiri atau perlu mekanisme delegasi terbatas ke operator? **Default MVP:** struktur diubah Ketua Pelaksana berakun; jangan otomatis membuka hak kepada semua operator.

**Arsitektur sudah final: Modular Monolith.** Keputusan untuk memakai satu backend dan satu database tidak perlu dibuka kembali hanya demi portofolio; penambahan proses background worker jika diperlukan tetap bisa menjadi bagian dari monolith.

**Tidak perlu membuka kembali keputusan yang sudah final** (approval Proker/RAB, template form terkunci, kewajiban akun semua panitia, Google OAuth, batas pinjam hanya internal, atau penyamaan status dan kondisi aset) kecuali UKM sendiri meminta perubahan.

---

## 19. Checklist implementasi dan deliverables

- [ ] `README.md`, `.env.example` (tanpa password nyata), `compose.yaml`, keputusan arsitektur/ADR **Modular Monolith**; satu FastAPI backend + PostgreSQL + Caddy.
- [ ] **Satu database `erp_ukm` dan satu Alembic migration history**; data seed struktur UKM (4 Super Inti, 3 Kepala Departemen, 4 Kepala Bidang, 1 Kepala HR).
- [ ] OpenAPI contract pada satu aplikasi FastAPI untuk login, Proker direct-active, **template/bagan panitia yang bebas dikustom Ketua Pelaksana**, penugasan, penutupan, RAB, Kanban, kalender, monitoring.
- [ ] Unit/integration tests per modul, test batas dependensi, ABAC lintas scope, arsip read-only, atomisitas audit, self-assignment yang disepakati.
- [ ] UX walkthrough mobile: login → Tugas Saya → proker ditugaskan → Kanban → tutup Proker → lihat arsip.
- [ ] Test RAM dan ukuran upload 20 MB, backup/restore off-host.
- [ ] Backlog tahap P1: inventaris fisik/digital, website publik, editor acara, Form Builder (empat field hanya template), respons publik + ekspor, short link.
- [ ] UAT 5–8 pengurus lintas peran untuk memvalidasi kemudahan penggunaan sebelum memakai data UKM nyata.

**Akhir PRD ERP UKM v1.5 — draft revisi template kepanitiaan Proker fleksibel, mempertahankan arsitektur Modular Monolith, 17 November 2026.**
