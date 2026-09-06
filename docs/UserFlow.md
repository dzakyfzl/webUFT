# User Flow Document
# UFT HR — Media Partner, Sponsorship & Aspirasi Management System

**Versi:** 1.1
**Terakhir diperbarui:** 3 September 2026
**Akses:** `hr.ukmfotografitelkom.com` (subdomain, routing via Next.js middleware pada host header)

---

## 1. Peta Navigasi Utama (Sitemap)

> **Catatan:** Semua halaman di bawah diakses melalui subdomain `hr.ukmfotografitelkom.com`. Next.js middleware mendeteksi host header `hr.*` dan meng-rewrite routing ke halaman HR yang sesuai. Sistem autentikasi shared dengan admin panel utama webUFT.

```
Landing / Login
│
├── Register
├── Forgot Password → Reset Password
│
└── Dashboard (setelah login)
    ├── Overview (ringkasan status semua modul + reminder aktif)
    │
    ├── Media Partner
    │   ├── Medpart Masuk (Inbound)
    │   │   ├── List & Filter
    │   │   ├── Tambah Medpart Baru
    │   │   └── Detail Medpart (+ Log Aktivitas panel kanan)
    │   │
    │   ├── Medpart Sebar (Outbound)
    │   │   ├── List Calon Medpart
    │   │   ├── Tambah Calon Medpart
    │   │   └── Detail (Syarat: Bayar / Tidak Bayar + minimal follow)
    │   │
    │   └── Jadwal Poster
    │       ├── Kalender/List Jadwal
    │       └── Detail Jadwal (status upload, bukti)
    │
    ├── Sponsorship
    │   ├── List Sponsor
    │   ├── Tambah Sponsor
    │   └── Detail Sponsor (PIC internal, CP eksternal, riwayat proposal)
    │
    ├── Offer Masuk 🔒 (khusus Kadiv/Wakadiv/Super Admin)
    │   ├── Offer Sponsorship Masuk
    │   └── Offer Kerja Sama / Job Masuk
    │
    ├── Program Kerja (Proker)
    │   ├── List Proker
    │   └── Detail Proker
    │       ├── List Medpart Tamu Undangan (relasi)
    │       └── List Sponsor Proker (relasi)
    │
    ├── Undangan
    │   ├── List Undangan
    │   ├── Tambah Undangan
    │   └── Detail Undangan (assign kehadiran, status)
    │
    ├── Reminder / Deadline
    │   └── List reminder aktif (grouped: Undangan, Poster, Aspirasi)
    │
    ├── Aspirasi
    │   ├── Pengaturan Link Form
    │   ├── Jadwal Kirim (tanggal 1 tiap bulan)
    │   └── Riwayat Pengiriman
    │
    ├── Template Chat
    │   ├── Template Medpart
    │   └── Template Sponsor
    │
    ├── AI Chatbot (Gemini)
    │
    ├── Audit Log (Global) 🔒 (Super Admin/Kadiv/Wakadiv)
    │
    └── Settings
        ├── Profil Saya
        ├── Manajemen User & Role 🔒 (Super Admin)
        └── Integrasi AI 🔒 (Super Admin)
            ├── API Key Pool (Gemini)
            └── Pilih Model Aktif
```

---

## 2. Flow: Autentikasi

### 2.1 Register
> Autentikasi UFT HR **shared** dengan admin panel webUFT utama — akun yang sudah ada di sistem utama langsung bisa login ke UFT HR (jika punya role yang sesuai).

1. User buka halaman Register di `hr.ukmfotografitelkom.com` → isi Nama, Email, Password, No. WA
2. Submit → sistem validasi (email unik, password strength) — data masuk ke tabel `akun` yang sama dengan admin panel utama
3. Akun dibuat dan **otomatis mendapat role default "Anggota"** (bukan status kosong tanpa akses)
4. Notifikasi ke Super Admin (opsional) bahwa ada user baru terdaftar, untuk ditinjau apakah perlu ditambahkan role lain (Kadiv/Wakadiv/PJ Sosmed/PJ Aspirasi)
5. User langsung diarahkan ke Dashboard HR dengan akses sesuai role **Anggota** (lihat matriks akses di PRD §2)

### 2.2 Login
1. User buka `hr.ukmfotografitelkom.com` → input email + password (JWT shared dengan admin panel utama)
2. Jika salah → tampilkan error, hitung percobaan gagal (rate limit setelah N kali)
3. Jika benar → JWT access token + refresh token disimpan di localStorage → masuk ke Dashboard HR sesuai gabungan role yang dimiliki (minimal role Anggota, karena setiap akun aktif pasti punya ≥1 role)

### 2.3 Forgot Password
1. User klik "Lupa Password" → input email
2. Sistem kirim email link reset (token expired 1 jam)
3. User klik link → form set password baru → submit
4. Redirect ke Login dengan notifikasi sukses

---

## 3. Flow: Medpart Masuk (Inbound)

**Aktor:** PJ Sosmed (input & tracking), Kadiv/Wakadiv/Super Admin (approval penuh)

1. PJ Sosmed membuka **Medpart Masuk** → klik **Tambah Medpart Baru**
2. Isi form: Nama Medpart, Platform, Kontak, Jumlah Followers, **Link Bukti Follow**, Syarat (teks bebas ditambahkan manual)
3. Simpan → status default: **Pending**
4. Sistem otomatis mencatat log: "Dibuat oleh [Nama PJ Sosmed] pada [timestamp]"
5. Kadiv/Wakadiv membuka detail medpart tsb → cek link bukti → ubah status ke **Approved** / **Rejected**, opsional tambahkan **Note**
6. Setiap perubahan status/note tercatat di **panel Log Aktivitas** (kanan halaman detail) — siapa & kapan
7. Dashboard counter otomatis update (total masuk, per status)
8. Jika perlu follow-up → user klik tombol **Kirim WA** dari halaman detail → lihat Flow §7

---

## 4. Flow: Medpart Sebar (Outbound)

**Aktor:** PJ Sosmed, Kadiv/Wakadiv

1. Buka **Medpart Sebar** → klik **Tambah Calon Medpart**
2. Isi data dasar (nama, kontak, PIC)
3. Isi **Section Syarat**:
   - Toggle **"Bisa Bayar?"** → jika Ya, isi nominal/skema
   - Jika **Tidak Bayar** → isi minimal jumlah follow yang disyaratkan
4. Simpan → masuk list dengan status awal **Belum Dihubungi**
5. User pilih template chat medpart → sistem generate pesan dengan placeholder terisi otomatis (nama medpart, PIC) → klik **Kirim via WhatsApp** → buka `wa.me` link di tab baru
6. User update status manual setelah ada respons: **Dihubungi → Nego → Deal/Batal**
7. Semua perubahan tercatat di Log Aktivitas

---

## 5. Flow: Sponsorship

**Aktor:** Kadiv/Wakadiv (penuh), Super Admin

1. Buka **Sponsorship** → **Tambah Sponsor**
2. Isi: Nama perusahaan/sponsor, **PIC internal** (dropdown user tim), **Contact Person** pihak sponsor (nama, jabatan, no. WA/email)
3. Simpan → status awal **Prospek**
4. Kirim proposal (manual di luar sistem atau lampirkan link/file) → catat tanggal kirim di sistem
5. Setelah sponsor merespons → PIC input **Tawaran/Offer** yang diberikan (nilai, bentuk kerjasama, syarat) di sub-section "Riwayat Offer"
6. Update status: **Nego → Deal → Ditolak**
7. Kirim WA ke CP menggunakan **Template Sponsor** (sama seperti flow §7)
8. Semua aktivitas tercatat di Log Aktivitas panel kanan

---

## 6. Flow: Offer Masuk — Sponsorship & Kerja Sama/Job (Khusus Kadiv/Wakadiv)

### 6.1 Offer Sponsorship Masuk
1. Hanya Kadiv, Wakadiv, dan Super Admin melihat menu **"Offer Masuk → Offer Sponsorship Masuk"** di navigasi (role lain tidak melihat menu ini sama sekali)
2. Kadiv/Wakadiv menambahkan entri offer baru (nama sponsor, nilai, bentuk kerja sama, dokumen pendukung)
3. Tracking status: **Pending → Negosiasi → Deal/Ditolak**, dengan note
4. Log aktivitas tetap tercatat (siapa input, siapa update)
5. Jika ingin menghubungkan ke record Sponsor yang sudah ada → pilih dari dropdown relasi (opsional)

### 6.2 Offer Kerja Sama / Job Masuk *(modul terpisah)*
1. Hanya Kadiv, Wakadiv, dan Super Admin melihat menu **"Offer Masuk → Offer Kerja Sama/Job Masuk"**
2. Klik **Tambah Offer Kerja Sama/Job Baru** → isi:
   - Nama pihak pengaju + kategori kerja sama/job (bebas, mis. "Kolaborasi Konten", "Job Freelance")
   - Kontak person
   - Deskripsi/detail tawaran (rich text)
   - Bukti/dokumen pendukung (link)
   - Nilai/kompensasi (opsional)
3. Simpan → status awal **Pending**
4. Update status: **Pending → Negosiasi → Deal/Diterima → Ditolak**, dengan note
5. Log aktivitas tercatat sama seperti modul lain (panel kanan)
6. Modul ini **berdiri sendiri** dari Offer Sponsorship — tidak ada relasi wajib ke data Sponsor, karena sifatnya bisa dari pihak mana saja di luar sponsor

---

## 7. Flow: Kirim WhatsApp via Template (Lintas Modul)

Berlaku untuk Medpart (Masuk/Sebar) & Sponsorship.

1. Dari halaman detail record → klik tombol **"Kirim WA"**
2. Sistem tampilkan modal **pilih Template** (Template Medpart / Template Sponsor sesuai konteks modul)
3. Sistem otomatis mengganti placeholder (`{{nama}}`, `{{nama_pic}}`, `{{deadline}}`, dst.) dengan data dari record yang aktif
4. Tampilkan **preview pesan** — user dapat mengedit manual sebelum kirim
5. Klik **"Buka WhatsApp"** → sistem generate `https://wa.me/<nomor_terformat>?text=<pesan_url_encoded>` → buka tab baru / aplikasi WA
6. User klik kirim manual di WhatsApp (tidak otomatis terkirim dari sistem)
7. Sistem mencatat log: "Pesan template [X] dikirim ke [kontak] oleh [user] pada [timestamp]" (opsional dicentang manual "Sudah dikirim" oleh user jika ingin dicatat)

---

## 8. Flow: Proker — List Medpart Tamu Undangan & Sponsor

1. Buka **Program Kerja** → pilih/tambah Proker
2. Di dalam detail Proker, ada 2 tab: **Medpart Tamu Undangan** & **List Sponsor**
3. User klik **"Tambah dari Data Existing"** → pilih medpart/sponsor dari database utama (relasi, bukan input ulang)
4. Tambahkan status khusus proker ini (misal: status kehadiran/keterlibatan khusus event tsb)
5. Data ini otomatis sinkron jika data induk (medpart/sponsor) diupdate, namun status per-proker independen

---

## 9. Flow: Undangan & Assign Kehadiran

1. Buka **Undangan** → **Tambah Undangan**
2. Isi: Nama acara/pengundang, tanggal acara, lokasi, deadline konfirmasi
3. **Assign Kehadiran**: pilih 1 atau lebih user dari tim yang akan hadir (multi-select)
4. Simpan → status **Baru**
5. Reminder otomatis dibuat mengikuti deadline konfirmasi (lihat Flow §10)
6. User yang di-assign & Kadiv/Wakadiv dapat update status: **Dikonfirmasi / Ditolak / Selesai**
7. Log aktivitas mencatat siapa assign siapa, dan siapa yang mengubah status

---

## 10. Flow: Reminder & Deadline (Otomatis)

1. Sistem membuat reminder otomatis dari 3 sumber:
   - Deadline konfirmasi Undangan
   - Jadwal upload poster Medpart
   - Jadwal kirim Aspirasi (tanggal 1 setiap bulan)
2. Reminder muncul di:
   - Dashboard Overview (badge/counter)
   - Halaman khusus **Reminder / Deadline**
3. User terkait (assignee/PJ) melihat notifikasi H-3, H-1, dan Hari-H (dapat dikonfigurasi)
4. User dapat **tandai selesai** atau **snooze** — selama item belum melewati deadline
5. **Jika deadline terlewat tanpa diselesaikan** → sistem otomatis mengubah status item menjadi **"Overdue"**:
   - Badge/label berubah warna **merah tegas** (bukan kuning seperti status "mendekati deadline")
   - Item overdue dipindahkan/dikelompokkan ke bagian **paling atas/prioritas** di halaman Reminder dan Dashboard
   - Baris terkait di tabel modul asal (Undangan/Jadwal Poster/Aspirasi) ikut tersorot merah
   - Status **Overdue tidak bisa di-snooze** — hanya hilang setelah item diupdate/diselesaikan secara manual oleh user berwenang
6. Jika reminder terkait pengiriman WA (misal aspirasi) → tombol reminder langsung terhubung ke Flow §7 atau §12 (generate pesan siap kirim)
7. **Tidak ada notifikasi email** — seluruh reminder bersifat **in-app only**. Karena UFT HR adalah **website**, notifikasi hanya tampil saat user membuka aplikasi via browser.

---

## 11. Flow: Jadwal Poster Media Partner

1. Dari detail Medpart (Masuk/Sebar yang sudah Deal) → tambahkan **Jadwal Poster** terkait proker tertentu
2. Isi: tanggal deadline upload, catatan
3. Status: **Belum Jadwal → Terjadwal → Sudah Upload / Telat**
4. Reminder otomatis dibuat mengikuti deadline (lihat Flow §10)
5. Setelah medpart upload, user update status menjadi **Sudah Upload** + lampirkan link bukti
6. Jika lewat deadline tanpa update → sistem otomatis tandai **Telat**

---

## 12. Flow: Aspirasi (Kirim ke Grup Chat — Opsi A: Copy & Buka Grup)

> Catatan penting: pesan aspirasi ditujukan ke **grup chat WhatsApp**, bukan personal. Karena `wa.me` hanya mendukung chat 1-ke-1 dan tidak bisa auto-fill teks ke grup, alurnya menggunakan mekanisme **copy manual + buka grup**.

1. PJ Aspirasi/Kadiv/Wakadiv membuka **Aspirasi → Settings** → set/update:
   - **Link Form** (Google Form eksternal)
   - **Link Invite Grup WA** (`chat.whatsapp.com/<kode_invite>`)
2. Sistem otomatis membuat **reminder & draf pesan** setiap tanggal 1 bulan berjalan (dari template + placeholder link form terisi otomatis)
3. Pada tanggal 1, PJ Aspirasi menerima reminder → klik reminder → sistem tampilkan halaman/modal berisi:
   - Preview pesan siap kirim (dapat diedit manual)
   - Tombol **"Copy Pesan"** → menyalin teks ke clipboard
   - Tombol **"Buka Grup Aspirasi"** → membuka link invite grup WA di tab baru
4. User (di WhatsApp) **paste pesan** yang sudah dicopy ke grup tsb → kirim manual
5. Kembali ke sistem → PJ Aspirasi klik **"Tandai Sudah Dikirim Bulan Ini"** → tercatat di Riwayat Pengiriman (siapa & kapan menandai)
6. (Opsional) tempel link hasil rekap respon untuk referensi

---

## 13. Flow: AI Chatbot (Gemini) — Pusat Kendali Terintegrasi

### 13.1 Mode Tanya-Jawab / Insight (Semua Role, sesuai scope)
1. User klik ikon **AI Chatbot** (tersedia di semua halaman, floating atau tombol kontekstual "Tanya AI" per halaman)
2. User ketik pertanyaan, contoh:
   - "Berapa medpart yang statusnya pending minggu ini?"
   - "Ringkas aspirasi bulan Agustus"
   - "Item apa saja yang overdue minggu ini?"
3. Sistem mengirim request ke backend → backend menyusun konteks (data relevan sesuai scope akses role user, hanya modul yang boleh diakses role tsb) + prompt → **backend memilih key aktif dari API Key Pool** dan model yang sedang diaktifkan Super Admin → panggil **Gemini API**
4. Jika key yang dipakai **gagal** (quota habis/error/invalid) → sistem **otomatis mencoba key berikutnya** dalam pool secara transparan, tanpa user perlu tahu atau mengulang pertanyaan
5. Jawaban ditampilkan di chat window

### 13.2 Mode Aksi Terintegrasi Lintas Modul (Write, dengan Konfirmasi Manual)
1. User memberi perintah aksi ke chatbot, contoh:
   - "Tambahkan calon medpart baru: nama X, tidak bayar, minimal follow 500"
   - "Buatkan draf offer sponsorship dari sponsor Y senilai 5 juta"
   - "Catat tawaran kolaborasi konten dari komunitas Z, kontak budi 08xx"
   - "Siapkan pesan follow-up untuk medpart Z pakai template deadline poster"
   - "Assign budi dan sari untuk hadir di undangan seminar ABC"
2. Backend Gemini API (via **function calling**) mengenali maksud perintah dan memetakan ke salah satu fungsi aksi yang tersedia sesuai modul (Medpart, Sponsorship, Offer Sponsorship, Offer Kerja Sama/Job, Aspirasi, Undangan, Template)
3. Sistem cek dulu **apakah role user berwenang** melakukan aksi tsb di modul terkait (mengikuti matriks akses PRD §2) — jika tidak berwenang, chatbot menolak dan menjelaskan keterbatasan akses, bukan diam-diam gagal
4. Jika berwenang → chatbot menyusun **draf/preview** (form terisi otomatis dari perintah) → ditampilkan ke user sebagai kartu preview di dalam chat, dengan opsi:
   - **Edit dulu** (buka form lengkap untuk disesuaikan)
   - **Simpan/Konfirmasi** (data baru benar-benar tersimpan ke database)
   - **Batalkan**
5. Setelah user klik **Simpan/Konfirmasi** → data tersimpan seperti input manual biasa, dan tercatat di Audit Log dengan penanda tambahan **"dibuat via AI Assistant"**
6. Jika jawaban berupa draf pesan WA → tersedia tombol **"Gunakan sebagai Template"** untuk langsung terhubung ke modal Kirim WA (§7) atau modal Kirim ke Grup Aspirasi (§12)
7. **Catatan penting:** AI tidak pernah mengubah status approval/deal secara otomatis (mis. Approved, Deal) tanpa klik konfirmasi eksplisit dari user berwenang — chatbot hanya menyiapkan, keputusan akhir tetap manual.

### 13.3 Titik Akses Chatbot di Seluruh Sistem
Tombol "Tanya AI" kontekstual tersedia di halaman-halaman berikut (selain floating widget global):
- Detail Medpart Masuk/Sebar
- Detail Sponsorship, Offer Sponsorship Masuk, dan Offer Kerja Sama/Job Masuk
- Aspirasi (susun pesan bulanan & ringkasan hasil)
- Undangan (susun draf assignment)
- Reminder/Deadline (ringkas item overdue & prioritas)
- Template Chat (bantu susun/perbaiki draf template)

### 13.4 Pengaturan API Key Pool & Model (Khusus Super Admin)
1. Super Admin buka **Settings → Integrasi AI**
2. Di tab **"API Key Pool"**:
   - Klik **"Tambah Key"** → masukkan Gemini API Key baru → sistem menyimpan key (terenkripsi) dan langsung menampilkannya di list pool dengan status **Aktif**
   - List key ditampilkan tersamar sebagian (mis. `AIza...********`) demi keamanan, dengan indikator status: **Aktif** / **Error** / **Quota Habis**
   - Super Admin dapat **mengatur urutan prioritas** key (drag/reorder) — key urutan teratas dicoba lebih dulu
   - Super Admin dapat **menonaktifkan/menghapus** key kapan saja
   - Tersedia **log ringkas kegagalan key** (tanggal, key mana yang gagal, alasan) untuk monitoring
3. Di tab **"Model Aktif"**:
   - Pilih salah satu dari: **Gemini 3.1 Flash**, **Gemini 3.1 Flash Lite**, **Gemini 3.5 Flash**, **Gemini 3.5 Flash Lite**
   - Klik **"Simpan"** → model baru langsung berlaku untuk seluruh permintaan chatbot berikutnya di sistem (tidak perlu deploy ulang)
4. Perubahan pada pool/model tercatat di Audit Log Global (§14)

---

## 14. Flow: Audit Log

### Per Record (panel kanan halaman detail)
1. Setiap kali record dibuat/diubah, sistem otomatis mencatat: `user_id`, `nama_user`, `role_saat_itu`, `timestamp`
2. Untuk **field kunci** (`status`, `note/catatan`, `assignment/PIC`, `hasil approval`) — dicatat rinci `nilai_lama → nilai_baru`
3. Untuk field lain di luar field kunci — cukup dicatat sebagai entri umum "data diperbarui oleh [user]" tanpa rincian before/after
4. Panel kanan menampilkan histori terbalik-kronologis (terbaru di atas)

### Global (Super Admin/Kadiv/Wakadiv)
1. Buka menu **Audit Log** → tampil tabel seluruh aktivitas sistem
2. Filter: per user, per modul, per rentang tanggal
3. Klik satu entri → drill-down ke record terkait

---

## 15. Flow: Manajemen User & Role (Super Admin)

1. Super Admin buka **Settings → Manajemen User**
2. Lihat list seluruh user + role yang dimiliki (chip multi-role)
3. Klik user → **assign/lepas role** (checkbox multi-select: Super Admin, Kadiv, Wakadiv, PJ Sosmed, PJ Aspirasi, **Anggota**)
4. Simpan → user langsung mendapat/kehilangan akses modul terkait pada login berikutnya (atau real-time jika sesi aktif)
5. Nonaktifkan user (soft delete) jika sudah tidak menjabat — histori record yang pernah dibuat tetap tersimpan (nama tetap muncul di audit log)

---

## 16. Diagram Alur Singkat (Ringkasan Keputusan Status)

```
MEDPART MASUK:      [Input] → Pending → (review bukti) → Approved / Rejected
MEDPART SEBAR:       [Input] → Belum Dihubungi → Dihubungi → Nego → Deal / Batal
SPONSOR:             [Input] → Prospek → Proposal Terkirim → Nego → Deal / Ditolak
OFFER MASUK:         [Input] → Pending → Negosiasi → Deal / Ditolak
UNDANGAN:            [Input] → Baru → Dikonfirmasi / Ditolak → Selesai
JADWAL POSTER:       [Input] → Belum Jadwal → Terjadwal → Sudah Upload / Telat
ASPIRASI (bulanan):  [Reminder tgl 1] → Draf Siap → Terkirim (manual) → Tercatat
```
