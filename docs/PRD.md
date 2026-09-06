# Product Requirements Document (PRD)
# UFT HR — Media Partner, Sponsorship & Aspirasi Management System

**Versi:** 1.2
**Status:** Draft
**Terakhir diperbarui:** 6 September 2026
**Akses:** `hr.ukmfotografitelkom.com` (subdomain dari webUFT utama)
**Tech Stack:** Next.js (App Router) + TailwindCSS v4 + FastAPI (Python) + SQLAlchemy + PostgreSQL

---

## 1. Latar Belakang & Tujuan

UFT HR adalah aplikasi internal — diakses melalui subdomain **hr.ukmfotografitelkom.com** — untuk mengelola seluruh siklus kerja sama **Media Partner (Medpart)** dan **Sponsorship**, termasuk pengelolaan **undangan acara**, **reminder deadline**, **jadwal upload poster**, dan **wadah aspirasi anggota**. Saat ini proses tersebut dilakukan manual (chat WA, spreadsheet terpisah, tanpa histori perubahan), sehingga rawan data hilang, tidak ada jejak audit, dan lambat saat perlu follow-up massal ke banyak pihak.

**Tujuan utama:**
1. Satu sumber data (single source of truth) untuk semua Medpart & Sponsor — status, syarat, bukti, catatan.
2. Mempercepat komunikasi keluar (WA) dengan template siap pakai + auto-fill placeholder, dikirim lewat `wa.me`.
3. Transparansi histori: siapa membuat/mengubah data apa dan kapan (audit log per record).
4. Kontrol akses berlapis (RBAC multi-role) sesuai struktur organisasi.
5. Otomatisasi pengingat (deadline, jadwal poster, aspirasi bulanan) agar tidak ada yang terlewat.
6. AI Chatbot (Gemini API) sebagai asisten yang mempercepat kerja (draf balasan, rekap status, buat draf template), **bukan pengganti** proses manual/approval.

---

## 2. Target Pengguna & Sistem Akses

Sistem menggunakan **akses berbasis fitur (feature-based access)** — bukan role-name yang fixed. Setiap akun dapat memiliki kombinasi akses fitur yang berbeda, di-assign oleh Super Admin. Ini mengikuti pola yang sudah diimplementasikan di webUFT utama melalui tabel `bidang` + `akses`.

**Cara kerja:**
- Setiap fitur/modul HR didaftarkan sebagai satu **"bidang"** (unit akses)
- Super Admin meng-assign satu atau lebih bidang ke akun user
- Daftar bidang yang dimiliki user di-embed langsung ke dalam JWT payload sebagai `access: list[string]`
- Di backend, setiap endpoint mengecek apakah `"Nama Fitur" in user["access"]` sebelum mengizinkan operasi

**Istilah Role** di dokumen ini (Kadiv, Wakadiv, PJ Sosmed, dst.) hanyalah **label deskriptif** untuk kombinasi akses yang umum diberikan kepada jabatan tersebut — bukan enum role yang di-hardcode di sistem.

| Label Jabatan | Kombinasi Akses Tipikal |
|---|---|
| **Super Admin** | Semua bidang HR + "Kelola Akun" |
| **Ketua Divisi / Wakadiv** | Semua bidang HR kecuali "Kelola Akun" |
| **PJ Sosial Media** | Medpart Masuk, Medpart Sebar, Jadwal Poster, Template Medpart, Reminder, AI Chatbot |
| **PJ Aspirasi** | Aspirasi, Reminder, AI Chatbot |
| **Anggota** | Undangan (view self), Reminder (view self), AI Chatbot (terbatas) |

> Modul **Offer Sponsorship & Offer Kerja Sama/Job** hanya dapat diakses oleh akun yang memiliki bidang `"Kelola Offer Masuk"`. Bidang ini hanya di-assign ke Kadiv, Wakadiv, dan Super Admin.

### Matriks Akses per Bidang

| Bidang (Unit Akses) | Kemampuan |
|---|---|
| `Kelola Akun` | CRUD user, assign/lepas akses bidang |
| `Kelola Medpart Masuk` | Input, tracking, approval medpart inbound |
| `Kelola Medpart Sebar` | CRUD calon medpart outbound + syarat |
| `Kelola Jadwal Poster` | CRUD jadwal poster per medpart/proker |
| `Kelola Sponsorship` | CRUD sponsor, PIC, riwayat proposal |
| `Kelola Offer Masuk` | Akses Offer Sponsorship & Offer Kerja Sama/Job (sensitif) |
| `Kelola Template Chat` | CRUD template WA medpart & sponsor |
| `Kelola Undangan` | Input undangan, assign kehadiran, update status |
| `Kelola Reminder` | Kelola reminder/deadline aktif miliknya |
| `Kelola Aspirasi` | Settings form, jadwal kirim, riwayat |
| `Kelola Proker` | CRUD Program Kerja & relasi medpart/sponsor per proker |
| `Kelola Audit Log` | Lihat global audit log semua modul |
| `Kelola Integrasi AI` | Manage API Key Pool & model Gemini (Super Admin) |
| `Akses AI Chatbot` | Gunakan AI Chatbot (scope dibatasi oleh bidang lain yang dimiliki) |

---

## 3. Ruang Lingkup Fitur

### 3.1 Autentikasi & Manajemen User

> **Catatan arsitektur:** Sistem autentikasi dan manajemen user UFT HR **terintegrasi (shared)** dengan admin panel webUFT utama (`ukmfotografitelkom.com/admin`). Tabel `akun`, tabel `bidang`, tabel `akses`, dan mekanisme JWT (access token + refresh token) yang sama digunakan. JWT payload menyertakan field `access: list[string]` berisi nama-nama bidang yang dimiliki user — dipakai oleh middleware backend untuk otorisasi per-endpoint. Bidang HR-specific (mis. `Kelola Medpart Masuk`) cukup ditambahkan ke `bidang.json` dan di-assign ke akun yang bersangkutan tanpa perlu perubahan struktur tabel.

- Login (shared JWT dengan admin panel utama — payload: `sub`, `role`, `access[]`, `exp`)
- Register (akun baru **tidak mendapat akses bidang apapun secara default** — Super Admin yang assign akses sesuai jabatan)
- Reset Password (via Super Admin — tidak ada alur email reset di v1)
- Manajemen profil (nama, kontak WA)
- Assign/lepas akses bidang oleh Super Admin (per-fitur, bukan per-role-name)
- Status user: akun dapat dihapus oleh Super Admin (histori audit log tetap tersimpan dengan nama user lama)

### 3.2 Modul Media Partner — "Masuk" (Inbound)
Medpart yang mengajukan diri / follow ke kita.

- Form pengajuan/registrasi medpart baru (nama medpart, jenis platform, kontak, jumlah followers, dll — field dasar; **syarat detail teks ditambahkan manual kemudian oleh user** via rich text/kolom syarat)
- **Bukti follow**: input link bukti (screenshot/link profil)
- **Status**: `Pending`, `Approved`, `Rejected` (dapat dikustom sesuai kebutuhan lanjutan)
- **Note/catatan** bebas per medpart (bisa lebih dari satu catatan dengan timestamp)
- Counter otomatis: total medpart masuk, per status
- Filter & search (by status, tanggal, nama)
- **Audit log per record** (panel kanan): dibuat oleh siapa & kapan, riwayat edit siapa & kapan, termasuk perubahan status

### 3.3 Modul Media Partner — "Sebar" (Outbound)
List calon medpart yang **kita** hubungi untuk diajak kerja sama.

- List calon medpart (nama, kontak WA, PIC/kontak person, platform)
- Data dibagi 2 section syarat:
  1. **Apakah bisa bayar** (opsi berbayar / kerja sama barter, dengan nominal/skema jika ada)
  2. **Jika tidak bayar** — syarat jumlah follow yang dibutuhkan (angka minimal follow/repost dsb.)
- Status progres kerja sama per calon medpart (mis: Belum dihubungi → Dihubungi → Nego → Deal → Batal)
- Riwayat komunikasi (opsional log kapan WA dikirim, template apa yang dipakai)
- Audit log per record

### 3.4 Modul Sponsorship
- List calon/sponsor aktif
- **PIC internal** (siapa dari tim yang pegang) dan **Contact Person pihak sponsor** (nama, no. WA/email, jabatan)
- Riwayat pengiriman proposal (tanggal, versi proposal)
- **Tawaran/offer dari sponsor setelah proposal dikirim** — dicatat sebagai entri offer (nilai, bentuk kerja sama, syarat, status: Pending/Negosiasi/Deal/Ditolak)
- Note per sponsor
- Audit log per record

### 3.5 Modul Offer Sponsorship Masuk *(khusus Kadiv & Wakadiv)*
- List seluruh tawaran yang masuk dari pihak sponsor (baik hasil kirim proposal maupun sponsor yang datang sendiri)
- Tracking status sama seperti modul lain: status, note, bukti/dokumen pendukung
- Audit log
- **Modul ini disembunyikan total dari role selain Kadiv/Wakadiv/Super Admin** (tidak muncul di navigasi maupun API response untuk role lain)

### 3.5b Modul Offer Kerja Sama / Job Masuk *(khusus Kadiv & Wakadiv)*
Modul terpisah dari Offer Sponsorship — mencakup tawaran kerja sama/job yang bukan sponsorship, misalnya kolaborasi konten, undangan job/freelance untuk tim, kerja sama non-finansial dengan pihak luar, atau bentuk kolaborasi lain yang masuk ke organisasi.
- List seluruh tawaran kerja sama/job yang masuk, dengan field:
  - Nama pihak pengaju & jenis kerja sama/job (kategori bebas, mis. "Kolaborasi Konten", "Job Freelance", "Kerja Sama Acara")
  - Kontak person pihak pengaju
  - Deskripsi/detail tawaran (rich text bebas)
  - Bukti/dokumen pendukung (link)
  - Nilai/kompensasi jika ada (opsional, karena tidak semua job berbayar)
- Status tracking: **Pending → Negosiasi → Deal/Diterima → Ditolak**
- Note per entri
- Audit log per record (panel kanan, sama seperti modul lain)
- **Modul ini disembunyikan total dari role selain Kadiv/Wakadiv/Super Admin** — sama seperti Offer Sponsorship, karena sifatnya sensitif/strategis
- Secara struktur berdiri sendiri dari Offer Sponsorship (tabel data, status, dan navigasi menu terpisah), meski keduanya berada dalam grup menu "Offer Masuk" di sidebar untuk kemudahan navigasi

### 3.6 Template Chat & Integrasi WhatsApp (`wa.me`)
- CRUD template chat, dikelompokkan: **Template Medpart** dan **Template Sponsor**
- Placeholder dinamis, contoh: `{{nama}}`, `{{nama_pic}}`, `{{nama_medpart}}`, `{{proker}}`, `{{deadline}}`, `{{link_form}}`
- Saat user memilih "Kirim WA" dari data medpart/sponsor tertentu → sistem otomatis mengisi placeholder dari data record tsb → generate link `https://wa.me/<nomor>?text=<pesan_terenkode>` → buka di tab baru
- Preview pesan sebelum dikirim (agar user bisa edit manual sebelum klik kirim)
- Riwayat template yang pernah dipakai per kontak (opsional, untuk konteks AI chatbot)

### 3.7 List Medpart & Sponsor per Proker (Program Kerja)
- Proker tertentu memerlukan list **medpart tamu undangan** dan **list sponsor** yang berbeda dari list utama
- Setiap Proker punya sub-list yang menarik referensi dari data Medpart/Sponsor utama (relasi, bukan duplikasi data), plus status kehadiran khusus proker tsb

### 3.8 Modul Undangan & Assign Kehadiran
- Input undangan yang masuk (nama acara/pengundang, tanggal, lokasi, deadline konfirmasi)
- Assign siapa saja dari tim yang akan hadir (multi-user assignment)
- Status per undangan: Baru, Dikonfirmasi, Ditolak, Selesai
- Terhubung dengan Reminder (H- sekian sebelum deadline konfirmasi/acara)

### 3.9 Modul Reminder / Deadline
- Reminder otomatis untuk:
  - Deadline undangan (konfirmasi kehadiran)
  - **Jadwal upload poster** media partner (per medpart, per proker)
  - Aspirasi bulanan (pengiriman form ke grup setiap tanggal 1)
- Notifikasi tampil di dashboard (in-app only, lihat §4 Non-Fungsional)
- **Indikator Overdue:** setiap item yang memiliki deadline (Undangan, Jadwal Poster, Aspirasi) yang **melewati tanggal deadline tanpa diselesaikan/ditandai selesai**, akan otomatis diberi status visual **"Overdue"** dengan warna **merah tegas** (badge solid + ikon peringatan), ditampilkan di:
  - Dashboard Overview (masuk hitungan terpisah "Overdue" selain "Mendekati Deadline")
  - Halaman Reminder / Deadline (dikelompokkan paling atas/prioritas)
  - Baris terkait di list/tabel modul asal (mis. baris Undangan yang overdue tersorot merah)
- User bisa menandai reminder selesai / snooze; status **Overdue tidak bisa di-snooze**, hanya hilang setelah item ditandai selesai/diupdate

### 3.10 Modul Jadwal Poster (Media Partner)
- Kalender/list jadwal upload poster per medpart per proker
- Status: Belum Jadwal, Terjadwal, Sudah Upload, **Telat (Overdue — badge merah, lihat §3.9)**
- Reminder otomatis menjelang H-1/H-hari deadline
- Bukti upload (link) bisa dilampirkan

### 3.11 Modul Aspirasi
- Pengelolaan link form aspirasi (Google Form/link eksternal)
- Template pesan pengingat yang **otomatis terjadwal setiap tanggal 1**, ditujukan untuk dikirim ke **grup chat** WhatsApp
- **Mekanisme pengiriman (Opsi A — Copy & Buka Grup):** karena `wa.me` hanya mendukung chat personal (1 nomor) dan tidak dapat auto-fill teks ke grup, sistem menyediakan:
  1. Pesan sudah tersusun otomatis dari template (placeholder terisi) ditampilkan di modal/halaman reminder
  2. Tombol **"Copy Pesan"** — menyalin teks ke clipboard
  3. Tombol **"Buka Grup Aspirasi"** — membuka link invite grup (`chat.whatsapp.com/<kode_invite>`) yang disimpan di Settings Aspirasi
  4. User paste manual pesan tsb ke grup lalu kirim
- Link invite grup WA disimpan & dapat diedit oleh PJ Aspirasi/Kadiv/Wakadiv di Settings Aspirasi
- Setelah dikirim, user menandai **"Sudah Dikirim Bulan Ini"** secara manual → tercatat di Riwayat Pengiriman
- Jika tanggal 1 terlewat tanpa ditandai terkirim → status berubah **Overdue (merah)** sampai ditandai
- Rekap ringkas jumlah respon (jika tersedia link hasil form/spreadsheet terhubung)

### 3.12 AI Chatbot (Gemini API) — Pusat Kendali Terintegrasi (System-Wide Assistant)

AI Chatbot berfungsi sebagai **pusat bantuan lintas modul**, bukan sekadar tanya-jawab pasif. Chatbot dapat memahami perintah dalam bahasa natural dan **mengusulkan aksi langsung ke modul terkait** — Medpart, Sponsorship, Offer Kerja Sama, Aspirasi, Undangan, Template, dan Reminder — namun **tetap memerlukan konfirmasi manual dari user** sebelum data benar-benar disimpan/diubah, sesuai prinsip dasar sistem ini: *AI mempercepat kerja, bukan menggantikan proses manual/approval*.

**A. Mode Tanya-Jawab & Insight (Read)**
- Meringkas status seluruh medpart/sponsor ("berapa medpart yang masih pending?")
- Menyusun ringkasan aspirasi bulan ini, rekap offer yang masuk, status jadwal poster yang overdue, dll
- Menjawab pertanyaan seputar data yang ada di sistem (dibatasi sesuai scope akses role yang bertanya — mis. Anggota tidak bisa tanya soal Offer Sponsorship)

**B. Mode Aksi Terintegrasi (Write, dengan Konfirmasi Manual)**
Chatbot dapat membantu **mengisi/menyiapkan** entri baru di berbagai modul berdasarkan perintah natural, contoh:
- *"Tambahkan calon medpart baru: nama X, kontak 08xx, tidak bayar, minimal follow 500"* → AI menyusun draf entri Medpart Sebar → tampil sebagai **preview form terisi otomatis** → user tinggal klik **"Simpan"** (atau edit dulu) untuk benar-benar menyimpan ke database
- *"Buatkan draf offer kerja sama dari sponsor Y senilai 5 juta, bentuk barter"* → AI siapkan draf entri Offer Sponsorship Masuk → preview → konfirmasi simpan oleh Kadiv/Wakadiv (sesuai role yang berwenang di modul tsb)
- *"Catat tawaran kolaborasi konten dari komunitas Z, kontaknya budi 08xx"* → AI siapkan draf entri Offer Kerja Sama/Job Masuk (§3.5b) → preview → konfirmasi simpan oleh Kadiv/Wakadiv
- *"Siapkan pesan follow-up untuk medpart Z pakai template deadline poster"* → AI ambil template terkait, isi placeholder dari data medpart Z → langsung terhubung ke modal Kirim WA (§4.8) untuk di-review & dikirim
- *"Buat pengingat aspirasi bulan depan dengan link form baru"* → AI update draf pesan aspirasi berikutnya → preview → konfirmasi simpan oleh PJ Aspirasi
- *"Assign budi dan sari untuk hadir di undangan seminar ABC"* → AI siapkan perubahan assignment di record Undangan terkait → preview → konfirmasi simpan
- **Prinsip kunci:** AI **tidak pernah langsung mengubah status approval** (mis. mengubah Medpart jadi "Approved", atau Offer jadi "Deal") tanpa klik konfirmasi eksplisit dari user yang berwenang di modul tsb. AI hanya menyiapkan/mengusulkan; keputusan akhir dan klik "Simpan"/"Konfirmasi" tetap manusia.

**C. Batasan Akses (Role-Aware)**
- Kemampuan aksi chatbot mengikuti **hak akses role user yang sedang chat** — mis. Anggota tidak bisa minta AI menambahkan data Sponsor karena role tsb memang tidak berwenang di modul itu (baik lewat UI biasa maupun lewat chatbot)
- Aksi yang berhasil dikonfirmasi tetap tercatat di **Audit Log** seperti input manual biasa, dengan penanda tambahan "dibuat via AI Assistant" agar tetap transparan asal-usul data

**D. Titik Integrasi Chatbot di Seluruh Sistem**
Chatbot dapat diakses dari **floating widget di semua halaman** (§4.10 di Design.md), dan juga dari tombol kontekstual "Tanya AI" di halaman-halaman berikut:
- Detail Medpart Masuk/Sebar → bantu ringkas syarat, susun pesan follow-up
- Detail Sponsorship & Offer Masuk (Sponsorship + Kerja Sama/Job) → bantu susun draf offer/pesan ke CP
- Aspirasi → bantu susun pesan pengingat bulanan & ringkasan hasil
- Undangan → bantu susun draf assignment/konfirmasi kehadiran
- Reminder/Deadline → bantu ringkas item overdue & prioritas mingguan
- Template Chat → bantu menyusun/menyempurnakan draf template baru

**Pengelolaan API Key (khusus Super Admin) — API Key Pool:**
- Super Admin dapat menambahkan **lebih dari satu Gemini API Key** ke dalam satu "pool" (list key aktif)
- Sistem memanggil key secara berurutan (atau round-robin) — jika satu key **gagal/error** (mis. rate limit, quota habis, key invalid) → sistem **otomatis failover** ke key berikutnya dalam pool tanpa mengganggu proses chat yang sedang berjalan bagi user
- Super Admin dapat: tambah key baru, nonaktifkan/hapus key, melihat status tiap key (Aktif / Error / Quota Habis), dan urutan prioritas key dalam pool
- Log ringkas kegagalan key (kapan, key mana, alasan) untuk keperluan monitoring oleh Super Admin
- Karena chatbot kini terintegrasi ke seluruh sistem (frekuensi pemanggilan API lebih tinggi), pool multi-key ini penting untuk menjaga ketersediaan layanan tetap stabil meski satu key kena rate limit

**Pemilihan Model (khusus Super Admin):**
- Super Admin dapat memilih model Gemini yang dipakai sistem dari daftar berikut:
  - **Gemini 3.1 Flash**
  - **Gemini 3.1 Flash Lite**
  - **Gemini 3.5 Flash**
  - **Gemini 3.5 Flash Lite**
- Model default berlaku untuk seluruh permintaan chatbot di sistem (satu model aktif pada satu waktu, dapat diganti kapan saja oleh Super Admin di halaman Settings Integrasi)
- Perubahan key pool maupun model tidak memerlukan deploy ulang — cukup update dari UI Settings

**Aspek Teknis (untuk tim pengembang):**
- Implementasi mode aksi (§B) menggunakan mekanisme **function calling / tool use** dari Gemini API — backend mendefinisikan "fungsi" yang merepresentasikan setiap aksi yang boleh dilakukan AI per modul (mis. `draft_new_medpart_sebar()`, `draft_offer_sponsorship()`, `draft_offer_kerjasama_job()`, `prepare_wa_message()`, `draft_undangan_assignment()`), dan Gemini API akan memilih fungsi yang sesuai berdasarkan perintah natural user, lalu backend menyiapkan preview — bukan langsung eksekusi ke database
- Konteks yang dikirim ke Gemini API harus difilter sesuai scope akses role user (jangan kirim seluruh data mentah tanpa filter role)

> Catatan: nama-nama model di atas mengikuti penamaan yang diberikan tim UFT HR. Tim pengembang perlu mengonfirmasi nama model persis yang tersedia di Gemini API saat implementasi, karena penamaan model dapat berubah mengikuti rilis resmi dari penyedia (Google).

### 3.13 Audit Log (Global & Per Record)
- Setiap record penting (Medpart, Sponsor, Offer, Undangan, Aspirasi) punya panel **"Log Aktivitas"** di sisi kanan halaman detail:
  - Dibuat oleh: nama user + timestamp
  - Diedit oleh: histori berurutan (nama user, timestamp)
  - **Detail before/after hanya dicatat untuk field kunci**: `status`, `note/catatan`, `assignment/PIC`, `hasil approval`. Perubahan field lain cukup tercatat sebagai "data diperbarui" tanpa rincian before/after.
- Halaman Audit Log global (Super Admin/Kadiv/Wakadiv) untuk melihat seluruh aktivitas sistem, dapat difilter per user/modul/tanggal

---

## 4. Non-Fungsional Requirements

| Aspek | Requirement |
|---|---|
| Keamanan | Password hashing (SHA-256 + salt), rate-limit login, proteksi feature-based di level API backend (cek `access[]` JWT, bukan hanya UI) |
| Ketersediaan Data | Semua perubahan data penting tercatat di audit log; hapus akun tidak menghapus histori audit log (nama user tetap tercatat) |
| Responsif | Web app harus dapat diakses baik dari desktop maupun mobile (banyak update dilakukan on-the-go via HP) |
| Performa | Loading list data < 2 detik untuk <1000 records |
| Integrasi | `wa.me` link generation client-side; Gemini API dipanggil dari backend (API key tidak boleh exposed ke frontend) |
| Skalabilitas Akses | Menambah fitur/modul baru cukup menambahkan entry di `bidang` dan implementasi pengecekan di endpoint — tidak perlu refactor tabel atau enum role |
| Tech Stack | **Frontend:** Next.js (App Router) + TailwindCSS v4 + Geist Sans/Mono; **Backend:** FastAPI (Python) + SQLAlchemy + PostgreSQL; **Auth:** JWT (authlib, HS256) + tabel `bidang`/`akses` untuk feature-based RBAC; **Infra:** Docker Compose + Nginx (reverse proxy + subdomain routing) |
| Routing Subdomain | UFT HR diakses via `hr.ukmfotografitelkom.com`, di-route oleh Next.js middleware yang mendeteksi host header — mengikuti pola yang sama dengan subdomain shortlink (`s.ukmfotografitelkom.com`) |

---

## 5. Out of Scope (v1)

- Integrasi resmi WhatsApp Business API (hanya pakai `wa.me`, tidak ada pengiriman otomatis tanpa klik manual)
- Pembuatan form aspirasi built-in (masih pakai link form eksternal)
- Payment gateway untuk sponsorship berbayar
- Auto-generate laporan PDF (dipertimbangkan untuk v2)

---

## 6. Metrik Keberhasilan

- Waktu rata-rata untuk mengirim pesan ke medpart/sponsor berkurang signifikan dibanding manual copy-paste
- 100% record memiliki jejak audit log yang lengkap
- Tidak ada reminder deadline/poster/aspirasi yang terlewat tanpa notifikasi
- Adopsi AI chatbot oleh minimal PJ Sosmed & PJ Aspirasi untuk kerja harian

---

## 7. Keputusan atas Pertanyaan Terbuka (Klarifikasi Final)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Format syarat medpart masuk | **Rich text bebas** — kolom syarat menggunakan rich text editor (bold, italic, bullet list, link) agar user leluasa menempel/menulis syarat apa pun tanpa batasan struktur. |
| 2 | Nomor WA grup untuk aspirasi | **Sama seperti syarat medpart — rich text bebas** untuk catatan/konteks pengiriman aspirasi. Untuk nomor tujuan grup, disimpan sebagai satu field kontak tetap di Settings Aspirasi (dapat diedit kapan saja oleh PJ Aspirasi/Kadiv/Wakadiv), tidak dibedakan per proker di v1. |
| 3 | Notifikasi email | **Tidak digunakan.** Semua reminder & notifikasi cukup **in-app** (badge, dashboard, panel Reminder). Tidak ada pengiriman email sama sekali di v1. **Platform aplikasi ini adalah website (web app)**, diakses via browser — bukan aplikasi mobile native. |
| 4 | Cakupan audit log (before/after) | **Field kunci saja** — audit log mencatat perubahan hanya pada field-field penting: `status`, `note/catatan`, `assignment (PIC/assignee)`, dan `hasil approval`. Perubahan pada field minor (mis. typo pada nama kontak) tidak perlu tercatat detail before/after, cukup tercatat "data diperbarui oleh [user] pada [timestamp]" secara umum. |
| 5 | Sistem role/permission | **Feature-based access (bukan role-name enum).** Mengikuti pola yang sudah diimplementasikan di webUFT utama — tabel `bidang` + `akses`, akses di-embed ke JWT payload sebagai `access[]`. Tidak ada tabel `role` terpisah. Istilah "Kadiv", "PJ Sosmed", dst. hanya label deskriptif untuk kombinasi akses, bukan nilai yang disimpan di database. |
| 6 | Tech stack backend | **FastAPI (Python) + SQLAlchemy + PostgreSQL** — mengikuti dan memperluas codebase webUFT utama yang sudah ada. Tidak menggunakan Go/Chi router. |

> Catatan tambahan: karena platform dipastikan **website**, seluruh asumsi desain (di `Design.md`) dan layout (di `UserFlow.md`) mengacu ke pengalaman **desktop-first dengan dukungan responsif untuk akses mobile browser** — bukan aplikasi native terpisah (tidak perlu App Store/Play Store).
