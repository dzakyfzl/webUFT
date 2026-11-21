# Audit form webUFT

Inventaris dibuat sebelum perubahan UI. Hitungan mencakup kontrol data yang terlihat. Kontrol yang bergantung pada data atau izin ditandai.

| Lokasi | Tujuan dan kontrol | Temuan awal dan pola yang dipilih | Risiko |
| --- | --- | --- | --- |
| `admin/login` | Username dan password | Pertahankan halaman masuk khusus. Perjelas status kirim dan fokus kesalahan | Sedang, sesi dan pengalihan |
| `admin/tasks/task-board.tsx` pada Tugas Saya, Umum, Unit, dan Proker | Tambah 6 kontrol. Pilih papan, tampilan dan status per kartu daftar | Form besar tampil di atas papan. Quick-add judul per kolom, drawer lengkap, pencarian dan filter papan | Tinggi, lingkup asal, PIC, paginasi, drag dan versi |
| `admin/tasks/[id]` | Edit 5–6 kontrol. Hapus tugas | Form selalu terlihat bagi editor. Tampilkan detail dengan aksi edit. Gunakan editor yang sama dari papan dan detail | Tinggi, relasi PIC dan grant otomatis |
| `admin/programs/new` | Nama, unit, Ketupel, akun, dua tanggal, deskripsi | Halaman khusus dengan bagian informasi, jadwal dan pelaksana | Sedang, izin pemilik dan Ketupel |
| `admin/programs/[id]` ringkasan dan pengelola | Edit 4 kontrol, tambah pengelola 1, ganti Ketupel 2. Tutup Proker dan cabut akses | Ringkasan dan daftar dulu. Edit kontekstual dan tambah pengelola ringkas | Tinggi, versi, penutupan, sumber akses |
| `admin/programs/[id]` kepanitiaan | Label dan induk per kelompok serta urutan. Nama, peran, kelompok dan akun per panitia | Struktur dan nama memiliki editor terpisah. Struktur dapat diedit sebagai satu perubahan. Edit nama dekat daftar | Tinggi, hierarki, template, versi dan izin |
| `admin/programs/[id]` RAB | Nama, kategori, jumlah, satuan, harga satuan, keterangan | Tabel menjadi permukaan utama. Editor baris mengelompokkan harga, jumlah dan satuan | Tinggi, desimal dan pembulatan per item |
| `admin/programs/[id]/p1-panels.tsx` | Realisasi 6 kontrol. Dokumen 1 file atau nama dan URL. LPJ 3 teks panjang dan 1 URL | Tabel realisasi dengan editor kontekstual. Unggah dan tautan dibedakan. LPJ dapat dibaca sebelum diedit | Tinggi, bukti privat, jumlah rupiah dan versi |
| `admin/organization` | Cari akun/anggota, buat akun 3, ubah nama 1, reset password 1, buat anggota 1, periode baru 1, ubah akses dengan checkbox dinamis | Pencarian ringkas, edit satu nilai dekat akun atau dialog, akses ditempatkan dalam editor akun yang dipilih | Tinggi, identitas, password, periode dan akses |
| `admin/calendar` | Filter tampilan. Agenda baru 4 kontrol dan edit 3 | Form menggeser kalender. Drawer mempertahankan konteks tanggal dan papan | Tinggi, WIB, sumber agenda, versi |
| `admin/events` dan detail acara | Tambah 9 kontrol, edit 8. Hapus acara | Daftar dan ringkasan lebih dulu. Bagi editor menjadi informasi, jadwal, publikasi dan tautan | Tinggi, versi dan visibilitas publik |
| `admin/events/form-panel.tsx` | Inisialisasi template/kosong, metadata 2, judul per bagian, 5–6 properti per pertanyaan, urutan, preview, simpan, terbitkan, buka/tutup | Daftar bagian dan pertanyaan dengan editor terpilih. Opsi tetap bisa diedit sekaligus. Simpan dan publikasi tetap terpisah | Tinggi, schema, versi terbit, konflik, preview dan respons historis |
| `admin/events/responses-panel.tsx` | Pilih versi, pencarian, ekspor CSV/XLS, checkbox petugas | Toolbar ringkas dan pengaturan petugas terpisah | Tinggi, akses data peserta dan versi ekspor |
| `events/[id]`, `RegistrationFields.tsx` | 8 tipe pertanyaan, honeypot dan submit berversi | Pertahankan fokus pada pengisian. Perbaiki pengelompokan, kesalahan inline dan status hasil | Tinggi, jawaban dinamis, retry dan perubahan versi |
| `admin/inventory` | Filter pencarian dan arsip. Fisik 9 kontrol, digital 8, pinjam/sewa 7, pengembalian 3 | Daftar aset lebih dulu. Editor aset kontekstual. Transaksi dan pengembalian tetap terkait aset | Tinggi, transisi status dan versi aset |
| `admin/links`, `shortlink` | Admin 3 kontrol, layanan publik 2 kontrol, salin hasil | Editor admin pendek. Halaman layanan tetap berfokus pada pembuatan | Sedang, sesi, validasi slug dan API |
| `admin/history`, `admin/erp-context.tsx` | Selektor arsip, periode penerus, periode aktif dan tema | Kontrol inline. Konfirmasi arsip tetap eksplisit | Tinggi untuk arsip, rendah untuk tema |
| `acara/[id]`, `katalog/karya/[id]` | Cari karya, voting 3 kontrol per rute dan pesan verifikasi | Pertahankan tema publik. Rapikan asosiasi, status dan ergonomi dialog | Sedang di UI. API voting legacy tidak terdaftar di FastAPI ERP |
| `components/ChatWidget.tsx` | Satu pesan, kirim, pertanyaan saran | Pertahankan composer satu baris, semantik submit dan status | Sedang. Layanan chat legacy tidak terdaftar di FastAPI ERP |
| `components/ui/magnetic-drop-zone.tsx` | Pilih atau seret file | Pertahankan input file native dan tampilkan kesalahan file di lokasi pemilihan | Sedang, tipe dan batas ukuran |

## Fondasi dan batas sistem

- Next App Router dan React client state memakai kontrol native, `FormData`, `useResource`, `useDirectory`, dan `useAction`. Tidak ada library form atau schema frontend terpisah. CSS ERP dan token tema, Disclosure, DynamicButton, DirectionalPanels dan MagneticDropZone adalah fondasi UI. Input umur pendek tidak memerlukan komponen pembungkus sendiri.
- Klien ERP mengirim CSRF untuk mutasi. FastAPI/Pydantic memvalidasi dan menerapkan izin, optimistic locking dan audit log. Simpan persis jenis nilai, null, waktu, uang sebagai string desimal, versi dan konteks payload. RAB membulatkan tiap baris di server sebelum menjumlahkan.
- Template pendaftaran menyediakan Nama Lengkap, NIM, Fakultas dan Prodi/Jurusan sebagai data awal. Schema menyimpan ID bagian dan pertanyaan, membatasi 20 bagian dan 100 pertanyaan, serta mengikat respons ke versi terbit. Pendaftaran memakai ID permintaan untuk retry.
- Tidak ditemukan halaman konfigurasi unit mandiri, import atau backup/restore. Struktur unit dikelola melalui periode dan keanggotaan. Backup/restore adalah alur operator CLI. Ekspor peserta serta unggah dokumen sudah tersedia.
- Regresi Chromium yang tersedia mencakup core ERP, P1, UX, animasi dan UAT. Fixture UX mencakup desktop, tablet dan mobile, drag, konflik dan kalender. Pengujian P1 dengan backend mencakup dokumen, keuangan, builder, respons, aset dan tautan.

## Lokasi perubahan

| Area | File |
| --- | --- |
| Primitif | `frontend/app/admin/form-surface.tsx`, `ui.tsx`, `erp.css`, `erp-theme.css`, `frontend/app/components/ui/modal-dialog.tsx`, `frontend/app/globals.css` |
| Tugas dan agenda | `frontend/app/admin/tasks/task-board.tsx`, `task-editor.tsx`, `tasks/[id]/page.tsx`, `calendar/page.tsx` |
| Proker dan keuangan | `frontend/app/admin/programs/new/page.tsx`, `programs/[id]/page.tsx`, `budget-panel.tsx`, `p1-panels.tsx` |
| Acara dan pendaftaran | `frontend/app/admin/events/page.tsx`, `events/[id]/page.tsx`, `event-editor.tsx`, `form-panel.tsx`, `responses-panel.tsx`, `frontend/app/events/[id]/page.tsx`, `frontend/app/components/RegistrationFields.tsx` |
| Pengelolaan dan autentikasi | `frontend/app/admin/inventory/page.tsx`, `organization/page.tsx`, `links/page.tsx`, `history/page.tsx`, `login/page.tsx` |
| Interaksi publik | `frontend/app/shortlink/page.tsx`, `acara/[id]/page.tsx`, `katalog/karya/[id]/page.tsx`, `frontend/app/components/ChatWidget.tsx` |
| Regresi | `frontend/tests/erp-browser.cjs`, `erp-p1-browser.cjs`, `erp-ux-browser.cjs`, `frontend-motion-browser.cjs` |

Pencarian tugas membaca seluruh halaman pada papan aktif melalui endpoint daftar existing saat pencarian dijalankan. Dengan demikian, pencarian mencakup tugas di luar halaman pertama. Waktu pencarian bertambah ketika jumlah tugas bertambah. Pengiriman detail tetap memeriksa hak akses dan versi di server.

Voting dan chat lama memakai API legacy. Perilaku penolakan, isian yang bertahan, dan retry dapat diperiksa dengan fixture browser. Pencatatan ke layanan legacy memerlukan layanan yang menjalankan endpoint tersebut. Tampilan voting acara menggunakan karya dari API dan hanya mengonfirmasi suara setelah respons berhasil.

## Verifikasi

- Dari `frontend/`, `./node_modules/.bin/tsc --noEmit -p tsconfig.erp-ui.json`, `npm run lint -- app/admin app/components/RegistrationFields.tsx app/components/ChatWidget.tsx app/components/ui/modal-dialog.tsx app/events app/acara app/shortlink app/katalog`, dan `npm run build` lulus.
- Dari `Backend/`, `.venv/bin/python scripts/browser_test.py --production` dan varian `--p1` lulus dengan FastAPI, PostgreSQL loopback sementara, dan build Next produksi. Fixture mencakup PIC, anggota, akun, keanggotaan, RAB, arsip periode, inventaris, dokumen 20 MiB, realisasi, LPJ, builder, pendaftaran, ekspor Excel, dan tautan.
- `node frontend/tests/erp-ux-browser.cjs` dan `node frontend/tests/frontend-motion-browser.cjs` lulus dengan fixture HTTP. Skenario mencakup 320/390/768/1440 px, retry, pencarian, drag mouse/keyboard/sentuh emulasi, validasi tanggal dan checkbox, fokus dialog, konflik draft, voting legacy, chat, dan reduced motion.
- Tangkapan layar drawer tugas, papan, editor builder, dan registrasi diperiksa. Lint seluruh frontend masih melaporkan aturan React pada galeri dan redirect serta impor CommonJS di test browser. Pengujian perangkat fisik dan UAT pengurus belum dilakukan.
