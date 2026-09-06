# Design Document
# UFT HR — Visual & UI Design Guideline

**Versi:** 1.1
**Terakhir diperbarui:** 3 September 2026
**Tema:** Merah & Hitam (dominan), dikombinasikan dengan warna netral pendukung
**Akses:** `hr.ukmfotografitelkom.com` (subdomain, routing via Next.js middleware)
**Tech Stack UI:** Next.js (App Router) + TailwindCSS v4 + Geist Sans/Mono

---

## 1. Filosofi Desain

Tema **merah-hitam** dipilih untuk kesan tegas, profesional, dan energik — cocok untuk tools internal organisasi yang berhubungan dengan komunikasi eksternal (media partner & sponsor). Merah dipakai sebagai **aksen kuat** (aksi utama, status penting, branding), sedangkan hitam/abu gelap dipakai sebagai **basis struktural** (sidebar, header, teks utama) agar mata tidak lelah saat dipakai untuk kerja data-heavy sehari-hari. Warna pendukung (hijau, kuning, biru abu netral) digunakan **secukupnya** untuk status/indikator agar tetap jelas dibaca, tanpa merusak identitas merah-hitam.

**Prinsip:**
1. **Clarity over decoration** — ini tools kerja, bukan landing page marketing. Prioritas keterbacaan data (tabel, status, log).
2. **Merah = perhatian & aksi**, bukan dekorasi berlebihan. Jangan gunakan merah untuk elemen pasif.
3. **Konsistensi status color** di semua modul (approved selalu hijau, pending selalu kuning, dst — lihat §4).
4. **Dark-first mood** namun tetap harus nyaman dibaca lama (kontras cukup, bukan pure black).

---

## 2. Palet Warna

### 2.1 Warna Utama (Brand)

| Nama | Hex | Penggunaan |
|---|---|---|
| Merah Utama (Primary) | `#E4232A` | Tombol utama, aksen brand, logo, link aktif, highlight penting |
| Merah Gelap (Primary Dark) | `#A8181D` | Hover state, border aksen, gradient bawah |
| Merah Terang (Primary Light) | `#FF4B52` | Hover pada elemen terang, badge notifikasi |
| Hitam Utama (Base) | `#0E0E10` | Background utama (dark mode), sidebar |
| Hitam Sekunder (Surface) | `#18181B` | Card, panel, modal background |
| Abu Gelap (Surface Alt) | `#26262A` | Border, divider, hover row tabel |

### 2.2 Warna Netral (Teks & Background Terang)

| Nama | Hex | Penggunaan |
|---|---|---|
| Putih | `#FFFFFF` | Teks di atas background gelap/merah |
| Abu Terang (Text Secondary) | `#A1A1AA` | Teks sekunder, placeholder, caption |
| Abu Muda (Background Light Mode) | `#F5F5F6` | Background alternatif jika ada mode terang |
| Garis/Border | `#3A3A3F` | Pembatas antar section di dark mode |

### 2.3 Warna Status (Semantic Colors — kombinasi pendukung)

| Status | Warna | Hex |
|---|---|---|
| Success / Approved / Deal | Hijau | `#22C55E` |
| Pending / Menunggu | Kuning/Amber | `#F5A623` |
| Rejected / Ditolak | Merah (sama dengan primary, versi solid badge tanpa ikon) | `#E4232A` |
| **Overdue** (deadline terlewat: Undangan/Poster/Aspirasi) | Merah solid + ikon peringatan (triangle-alert) | `#E4232A` |
| Info / Netral / Draft | Biru Abu | `#5B8DEF` |
| Nonaktif / Batal | Abu | `#6B7280` |

> Catatan: karena merah adalah warna brand utama, status "Rejected" dan "Overdue" sama-sama menggunakan merah, namun dibedakan lewat **kombinasi bentuk badge + ikon**: "Rejected" = badge solid polos, "Overdue" = badge solid + ikon peringatan + left-border merah tebal di baris tabel (lihat §4.5b) — agar tidak tertukar visual satu sama lain maupun dengan elemen brand aksi (tombol).

---

## 3. Tipografi

| Elemen | Font | Ukuran | Weight |
|---|---|---|---|
| Font utama | **Geist Sans** (via `next/font/google`, CSS var `--font-geist-sans`) | — | 400 / 500 / 600 / 700 |
| H1 (Page Title) | Geist Sans | 28px | 700 |
| H2 (Section Title) | Geist Sans | 20px | 600 |
| H3 (Card Title) | Geist Sans | 16px | 600 |
| Body | Geist Sans | 14px | 400 |
| Caption / Meta / Log | Geist Sans | 12px | 400 (warna abu terang) |
| Angka besar (dashboard stat) | Geist Mono (`--font-geist-mono`) / Tabular Nums | 32px | 700 |

**Warna teks:**
- Teks utama di atas background gelap: `#FFFFFF`
- Teks sekunder: `#A1A1AA`
- Teks di atas tombol merah: `#FFFFFF`

---

## 4. Komponen UI Kunci

### 4.1 Sidebar Navigasi
- Background: `#0E0E10` (hitam utama)
- Logo "UFT HR" di atas dengan aksen garis bawah merah tipis
- Menu aktif: background `#1F1F22` + indikator garis vertikal merah (`#E4232A`) di sisi kiri item
- Icon menu: outline putih/abu, berubah merah saat aktif/hover
- Menu yang restricted (mis. Offer Sponsorship) hanya render untuk role yang diizinkan — tidak ditampilkan sama sekali untuk role lain

### 4.2 Top Bar
- Background: `#18181B`
- Berisi: search global, ikon notifikasi/reminder (badge merah bila ada item baru), avatar user + role badge, akses cepat ke AI Chatbot

### 4.3 Tombol (Button)
| Jenis | Style |
|---|---|
| Primary (aksi utama: Simpan, Tambah, Kirim WA) | Background `#E4232A`, teks putih, radius 8px, hover ke `#A8181D` |
| Secondary (aksi netral: Batal, Kembali) | Border `#3A3A3F`, background transparan, teks putih |
| Danger (Hapus/Reject) | Border/teks merah `#E4232A`, background transparan → hover jadi solid merah |
| Ghost/Icon Button | Transparan, hover background `#26262A` |

### 4.4 Card & Panel
- Background: `#18181B`, border tipis `#26262A`, radius 12px
- Shadow minimal (dark mode tidak butuh shadow tebal), gunakan border sebagai pemisah utama

### 4.5 Badge Status
- Bentuk pill, padding kecil, radius full
- Warna sesuai tabel §2.3, teks kontras (putih atau hitam tergantung terang/gelap warna badge)
- Contoh: `● Pending` (kuning), `● Approved` (hijau), `● Rejected` (merah solid)

### 4.5b Badge & Indikator "Overdue" (Deadline Terlewat)
Berlaku untuk item dengan deadline yang terlewat tanpa diselesaikan: Undangan, Jadwal Poster, Aspirasi bulanan.
- Badge **"Overdue"** menggunakan warna merah solid `#E4232A` dengan **ikon peringatan (triangle-alert)** di sisi kiri teks — dibedakan dari badge "Rejected" (tanpa ikon) agar tidak tertukar makna
- Baris tabel yang overdue mendapat **left border merah tebal (4px)** di sisi kiri baris, plus background sedikit ter-tint merah transparan (`rgba(228, 35, 42, 0.08)`) agar mudah dipindai sekilas di list panjang
- Di Dashboard Overview & halaman Reminder, item overdue **selalu dikelompokkan/ditampilkan paling atas**, dengan header section "⚠ Overdue" bertuliskan merah tebal, terpisah dari section "Mendekati Deadline" (kuning) dan "Akan Datang" (abu netral)
- Card counter "Overdue" di Dashboard menggunakan angka besar merah (bukan putih seperti card statistik netral lainnya) agar langsung menarik perhatian
- Status overdue **tidak memiliki tombol "Snooze"** — hanya tombol aksi utama (mis. "Tandai Selesai", "Update Status") yang berwarna merah primary

### 4.6 Tabel Data (List Medpart/Sponsor/dll)
- Header tabel: background `#1F1F22`, teks abu terang uppercase kecil (12px, letter-spacing)
- Row hover: `#1F1F22`
- Border antar baris: `#26262A` (tipis, horizontal only)
- Kolom status pakai Badge (§4.5 / §4.5b untuk overdue)
- Baris terakhir diklik → highlight kiri garis merah tipis (menandakan row terpilih) — beda ketebalan dengan indikator overdue (§4.5b) agar tidak tertukar makna: highlight seleksi = tipis 2px, overdue = tebal 4px

### 4.7 Panel Log Aktivitas (Kanan Halaman Detail)
- Lebar tetap (misal 320px), background sedikit lebih gelap dari card utama (`#141416`)
- Judul panel: "Log Aktivitas" dengan ikon jam/history berwarna abu
- Setiap entri log: avatar kecil + nama user (bold putih) + aksi (abu terang, mis. "mengubah status ke Approved") + timestamp relatif (abu, kecil, mis. "2 jam lalu")
- Jika entri berasal dari aksi AI yang dikonfirmasi (§4.10a) → tambahkan ikon spark kecil merah di samping nama user, dengan label kecil "via AI Assistant" (abu, italic) setelah timestamp
- Garis vertikal timeline tipis di sisi kiri list, dot merah kecil di tiap entri sebagai penanda

### 4.8 Modal Kirim WA (Template) — Chat Personal
Berlaku untuk Medpart & Sponsorship (chat 1-ke-1).
- Header modal: judul "Kirim Pesan WhatsApp" + ikon WA (tetap gunakan warna hijau asli WA untuk ikon logo, agar dikenali — pengecualian dari aturan merah-hitam karena branding pihak ketiga)
- Textarea preview pesan dengan placeholder sudah terisi otomatis (highlight ringan pada bagian yang di-auto-fill, mis. underline titik-titik merah tipis)
- Tombol utama: "Buka WhatsApp" (merah, primary)
- Tombol sekunder: "Batal"

### 4.8b Modal Kirim ke Grup (Aspirasi) — Copy & Buka Grup
Berlaku khusus untuk modul Aspirasi (target: grup chat, bukan personal).
- Header modal: judul "Kirim Pengingat Aspirasi ke Grup" + ikon WA hijau (sama seperti §4.8)
- Badge kecil info di bawah header (abu, italic): *"WhatsApp tidak mendukung auto-isi teks ke grup — salin pesan lalu tempel manual di grup."*
- Textarea preview pesan (editable), sama styling seperti §4.8
- Dua tombol sejajar (side-by-side), sama besar:
  - **"Copy Pesan"** — style secondary (border abu, ikon copy/clipboard), saat diklik icon berubah sesaat jadi checklist hijau + label "Tersalin!"
  - **"Buka Grup Aspirasi"** — style primary merah, ikon external-link, membuka link invite grup di tab baru
- Setelah kedua aksi di atas dilakukan (dilacak sederhana di state modal), muncul tombol ketiga di bawah: **"Tandai Sudah Dikirim Bulan Ini"** (outline hijau `#22C55E`) — menutup modal & mencatat ke Riwayat Pengiriman
- Tombol "Tandai Sudah Dikirim" tetap bisa diklik kapan saja secara manual meski user lupa/skip langkah copy (tidak dikunci ketat, karena aksi kirim tetap terjadi di luar sistem)
- Jika modal dibuka dari item yang sudah berstatus **Overdue** (lihat §4.5b) → header modal ditambah badge merah kecil "Overdue" di sampingnya, sebagai pengingat visual bahwa pengiriman sudah lewat jadwal

### 4.9 Dashboard / Overview
- Grid card statistik di atas (Total Medpart, Total Sponsor, Reminder Aktif, Aspirasi Bulan Ini) — tiap card angka besar putih + label abu, dengan aksen ikon merah di pojok
- Card tambahan **"Overdue"** ditempatkan paling menonjol (mis. urutan pertama atau diberi border merah di sekeliling card), angka besar berwarna merah `#E4232A` bukan putih — lihat §4.5b
- Section **"⚠ Overdue"** (merah, prioritas atas) → **"Mendekati Deadline"** (kuning, H-3/H-1) → **"Akan Datang"** (abu netral), masing-masing sebagai list terpisah dengan badge urgensi warna
- Grafik ringan (opsional) untuk tren medpart masuk per bulan — gunakan merah sebagai warna garis/bar utama grafik dengan background gelap

### 4.10 AI Chatbot Widget — Pusat Kendali Terintegrasi
- Floating button pojok kanan bawah: lingkaran merah gradient (`#E4232A` → `#A8181D`) dengan ikon spark/AI putih; badge kecil merah muncul di pojok icon jika ada draf aksi AI yang belum dikonfirmasi
- Chat window: background `#18181B`, bubble chat AI berwarna abu gelap (`#26262A`) teks putih, bubble user berwarna merah solid (`#E4232A`) teks putih rata kanan
- Indikator "AI is typing..." dengan dot animasi abu
- **Tombol "Tanya AI" kontekstual**: muncul sebagai tombol kecil outline (ikon spark, teks abu, hover jadi merah) di pojok halaman detail (Medpart, Sponsorship, Offer, Aspirasi, Undangan, Reminder, Template) — saat diklik, membuka chat window yang sama namun sudah otomatis membawa konteks record yang sedang dibuka

**4.10a Kartu Preview Aksi AI (Draft Card) — komponen kunci mode Write**
Saat AI mengusulkan aksi (menambah/mengubah data di modul manapun), jawabannya di chat window disertai **kartu preview** khusus, bukan hanya teks biasa:
- Card dengan border merah tipis (bukan solid, untuk membedakan dari elemen final/tersimpan) + label kecil di pojok atas: **"Draf — Belum Disimpan"** (abu, italic)
- Isi card menampilkan ringkasan field yang akan diisi/diubah (mis. Nama Medpart, Kontak, Syarat) dalam format list rapi, mirip mini-form
- Field yang bisa diedit langsung ditandai dengan ikon pensil kecil di sampingnya — user dapat klik untuk edit inline sebelum konfirmasi
- Dua tombol di bawah card:
  - **"Konfirmasi & Simpan"** — solid merah primary, hanya aktif untuk role yang berwenang di modul tsb (jika user tidak berwenang, tombol disabled + tooltip "Perlu peran Kadiv/Wakadiv")
  - **"Batalkan"** — outline abu
- Setelah dikonfirmasi → card berubah tampilan: border merah tipis hilang, diganti badge hijau kecil **"✓ Tersimpan"** di pojok, card menjadi non-editable (read-only), dan record tersebut otomatis mendapat penanda "dibuat via AI Assistant" yang juga tampak di panel Log Aktivitas (§4.7) sebagai ikon spark kecil di samping nama user

### 4.11 Halaman Settings — Integrasi AI (Khusus Super Admin)
Dua tab dalam satu halaman: **"API Key Pool"** dan **"Model Aktif"**.

**Tab API Key Pool:**
- List key ditampilkan sebagai baris-baris card kecil (bukan tabel padat), tiap baris berisi:
  - Ikon drag-handle di kiri (untuk reorder prioritas)
  - Key tersamar (`AIza...********`) font monospace, abu terang
  - Badge status di kanan: **Aktif** (hijau `#22C55E`), **Error** (merah `#E4232A`), **Quota Habis** (kuning `#F5A623`)
  - Tombol icon-only: edit/nonaktifkan/hapus (abu, hover jadi merah untuk hapus)
- Tombol utama di atas list: **"+ Tambah Key"** (merah, primary)
- Di bawah list: panel kecil collapsible **"Log Kegagalan Key"** — tabel ringkas (tanggal, key, alasan gagal), teks abu kecil, baris error dengan aksen merah tipis di kiri

**Tab Model Aktif:**
- 4 card pilihan model dalam grid (radio-select style), masing-masing menampilkan nama model besar + deskripsi singkat 1 baris (mis. "Lebih cepat, cocok untuk respons ringan")
- Card yang terpilih: border merah `#E4232A` tebal 2px + background sedikit ter-tint merah, ada checkmark merah di pojok kanan atas card
- Model tersedia: **Gemini 3.1 Flash**, **Gemini 3.1 Flash Lite**, **Gemini 3.5 Flash**, **Gemini 3.5 Flash Lite**
- Tombol **"Simpan Perubahan"** (merah, primary) muncul aktif hanya jika ada perubahan pilihan dari state tersimpan

---

## 5. Layout & Grid

- Struktur utama: **Sidebar tetap (kiri, ~240px) + Top bar (atas) + Content area**
- Content area menggunakan max-width container dengan padding 24px
- Halaman detail record: layout 2 kolom — **kiri (utama, ~70%)** berisi form/data, **kanan (~30%)** berisi panel Log Aktivitas (§4.7), sesuai permintaan "di samping kanan ada log"
- Mobile: sidebar collapse jadi bottom nav atau hamburger drawer; panel Log Aktivitas pindah jadi tab terpisah ("Detail" / "Log") agar tetap satu kolom

---

## 6. Ikonografi

- Gunakan icon set outline konsisten (disarankan **Lucide Icons** atau **Phosphor Icons**)
- Warna default ikon: abu terang `#A1A1AA`; berubah merah `#E4232A` saat active/hover/selected
- Ikon per modul (contoh mapping):
  - Media Partner → ikon megaphone/broadcast
  - Sponsorship → ikon handshake
  - Undangan → ikon mail/envelope
  - Reminder → ikon bell
  - Aspirasi → ikon message-square-heart
  - AI Chatbot → ikon sparkles/bot
  - Audit Log → ikon history/clock-rewind

---

## 7. Aksesibilitas & Kontras

- Pastikan rasio kontras teks putih di atas merah primary (`#E4232A`) memenuhi WCAG AA (rasio ±4.6:1 — aman untuk teks besar/bold, gunakan weight 600+ untuk teks kecil di atas merah)
- Jangan gunakan merah-di-atas-hitam untuk teks body panjang (kontras rendah); merah hanya untuk aksen, badge, border, atau teks besar/bold
- Status warna selalu disertai **label teks**, tidak hanya warna (agar tetap jelas untuk pengguna buta warna)

---

## 8. Design Tokens (TailwindCSS v4)

Project menggunakan **TailwindCSS v4** dengan `@theme inline` di `globals.css`. Semua design token didefinisikan sebagai CSS custom properties di dalam blok `@theme`, sehingga otomatis tersedia sebagai utility class Tailwind (misal `bg-primary`, `text-surface`, `border-border`).

```css
/* globals.css — @theme inline block */
@import "tailwindcss";

@theme inline {
  /* Font (dari next/font/google) */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Brand */
  --color-primary: #E4232A;
  --color-primary-dark: #A8181D;
  --color-primary-light: #FF4B52;

  /* Base (dark theme) */
  --color-bg: #0E0E10;
  --color-surface: #18181B;
  --color-surface-alt: #26262A;
  --color-border: #3A3A3F;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A1A1AA;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F5A623;
  --color-danger: #E4232A;
  --color-info: #5B8DEF;
  --color-neutral: #6B7280;

  /* Radius & Spacing */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --spacing-unit: 8px;
}
```

---

**Contoh penggunaan utility class di komponen:**
- Tombol primary: `className="bg-primary hover:bg-primary-dark text-white rounded-md"`
- Card: `className="bg-surface border border-border rounded-lg"`
- Badge status: `className="bg-success text-white"` / `className="bg-warning text-white"`
- Teks sekunder: `className="text-text-secondary text-sm"`

---

## 9. Mood Reference (deskripsi, bukan gambar)

Bayangkan tampilan seperti **dashboard command-center** ala aplikasi manajemen modern (mirip Linear/Vercel dashboard) tapi dengan aksen merah tegas ala identitas UFT — gelap, rapi, banyak whitespace di antara data padat, dengan merah muncul hanya di titik-titik yang butuh perhatian (tombol aksi, notifikasi, status penting). Kesan akhir: **serius, terpercaya, dan cepat dibaca** — bukan playful atau colorful.
