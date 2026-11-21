# UAT pengurus lokal — P0 dan P1

Status: perangkat UAT tersedia; penerimaan manusia belum dilaksanakan. Acuan PRD v1.6, [matriks kebutuhan](REQUIREMENTS.md) dan [runbook](RUNBOOK.md). Hasil otomatis tidak mengisi kolom penerimaan pengurus.

## Mulai sesi

Dari root project:

```sh
python3 Backend/scripts/preflight.py
./start.sh --uat
```

Buka `http://localhost:3200/admin/login` setelah launcher siap. Semua akun di bawah memakai password sesi yang sama. Password default lokal dapat disimpan sebagai satu baris di `Backend/scripts/.uat-password` dengan izin `0600`. File ini diabaikan Git. Jika file belum ada, masukkan password 12–256 karakter melalui prompt tersembunyi. Sesi memakai PostgreSQL existing dari `.env` dan hanya menerima host loopback non-production. Data ERP harus kosong, kecuali catatan percobaan login (`login_attempts`) yang dapat tertinggal dari login gagal. Jumlah baris seluruh tabel, termasuk catatan tersebut, tetap diperiksa setelah rollback. Launcher tidak memigrasi database atau memasang paket.

| Akun | Peran awal |
|---|---|
| `uat-ketua` | Ketua Umum; pencipta Proker A dan B |
| `uat-wakil` | Wakil Ketua; Inti tanpa assignment Proker |
| `uat-ketupel-a` | Ketupel Proker A; PIC tiga tugas TODO |
| `uat-ketupel-b` | Ketupel Proker B |
| `uat-hunting` | Anggota Hunting, mewarisi Departemen Internal |
| `uat-eksternal` | Anggota Departemen Eksternal |
| `uat-aset` | Anggota Departemen Asset dan Property |
| `uat-biasa` | Pengurus aktif tanpa unit/assignment |

Gunakan profil browser terpisah saat membandingkan peran. Pergantian akun pada tab dengan cookie yang sama memengaruhi tab lainnya. Jalankan urutan checklist di bawah: tutup Proker setelah pengujian dokumen/form dan arsip periode paling akhir. Awal sesi menyediakan Proker A/B, tiga tugas Proker A belum selesai, tugas Umum, dan tugas Eksternal. Aset, acara, form, realisasi dan akun tambahan dibuat melalui UI selama UAT.

Ctrl+C atau SIGTERM menghentikan API/Next milik launcher, rollback transaksi, membersihkan media sementara dan memeriksa jumlah baris seluruh tabel ERP kembali seperti semula. Tutup tab UAT sesudahnya. Sesi berikutnya mulai dari fixture awal. Data UAT tidak disimpan; catat hasil penerimaan di luar transaksi sebelum berhenti. Setelah pemaksaan SIGKILL/listrik mati, PostgreSQL membatalkan transaksi saat koneksi berakhir, tetapi media sementara mungkin perlu diperiksa operator.

Sesi terikat satu transaksi panjang dengan request diserialkan. Jangan jalankan bersama migrasi, suite integrasi, backup atau bootstrap. Jangan memakai data pribadi, akun operasional, atau rujukan vault nyata. Ini uji fungsi lokal; load konkuren, restore dan Compose menggunakan prosedur tersendiri.

Pemeriksaan ulang otomatis launcher:

```sh
./start.sh --uat --check
```

Mode ini membuat password acak di memori, menjalankan Chromium → Next development → FastAPI → PostgreSQL, memeriksa delapan peran dan mutasi, lalu rollback. Port 3200/8200 dan, untuk `--check`, 9328 harus bebas. Build development UAT terpisah di `.next-erp-uat`; tidak mengubah build browser QA. Gunakan `localhost` persis seperti URL di atas agar Origin/CSRF cocok.

Verifikasi perangkat 18 November 2026: `--check` lulus untuk delapan peran, hak organisasi/Proker/panitia, dashboard 320/390/1440, upload/unduh PDF serta mutasi tugas melalui Next. Pembersihan media dan jumlah awal seluruh tabel ERP terverifikasi. Harness lokal juga membuktikan startup interaktif dan penghentian SIGTERM dengan rollback tanpa password tercetak. Suite backend `scripts/integration_tests.py` lulus 107 test (44 integrasi PostgreSQL). Hasil ini tidak mengubah status penerimaan pengurus pada checklist.

## Checklist penerimaan

Isi hasil dengan `LULUS`, `GAGAL`, atau `TERHALANG`; status awal seluruh baris `BELUM`. Untuk setiap hasil, catat hasil aktual dan rujukan bukti/isu tanpa password, cookie, atau data peserta asli. Gunakan desktop dan lebar 320/390 px pada alur UI. Penolakan API harus diperiksa melalui Network/klien uji terautentikasi dengan Origin dan CSRF sesi sendiri, bukan hanya tombol yang tersembunyi.

| ID | Langkah dan hasil yang diharapkan | Hasil pengurus |
|---|---|---|
| UAT-01 | Login `uat-biasa`; baca Proker A, detail tetap terbaca dan kontrol edit tidak tersedia. Dashboard tidak menganggap A sebagai pekerjaan pribadi. | BELUM |
| UAT-02 | `uat-ketua` membuat Proker; langsung ACTIVE tanpa approval. | BELUM |
| UAT-03 | `uat-biasa` mengirim create Proker melalui API; 403 dan tidak ada Proker baru. | BELUM |
| UAT-04 | `uat-hunting` memberi assignment Proker A ke `uat-eksternal`; akun Eksternal kemudian dapat mengedit A. | BELUM |
| UAT-05 | Eksternal yang baru mendapat assignment mencoba menambah pengelola A; 403 karena bukan anggota unit pemilik/Inti. | BELUM |
| UAT-06 | `uat-biasa` membaca A lalu mencoba edit detail/RAB melalui API; 403, nilai lama tetap. | BELUM |
| UAT-07 | Hunting dan Eksternal bergantian mengubah tugas Umum; perubahan terlihat dari kedua akun. | BELUM |
| UAT-08 | Hunting membaca tugas asli Eksternal lalu mencoba edit; ditolak dan nilai lama tetap. | BELUM |
| UAT-09 | Buka agregat Internal; tugas A muncul dengan identitas/papan asal yang sama dan tidak diduplikasi. | BELUM |
| UAT-12 | Buka Monitoring Internal; hitungan sesuai tugas asli, drill-down membuka sumber dan tidak memberi izin tambahan. | BELUM |
| UAT-13 | `uat-aset` menambah buku/kamera dengan kode unik; tampil TERSEDIA dengan kondisi terpisah. | BELUM |
| UAT-14 | Catat pinjam kamera atas nama eksternal sintetis tanpa akun; status DIPINJAM, pinjaman ganda ditolak. | BELUM |
| UAT-15 | Kembalikan kamera dengan kondisi rusak; status PERBAIKAN dan riwayat/petugas tetap terbaca pengelola aset. | BELUM |
| UAT-16 | Buat acara dan form template; hapus keempat pertanyaan, simpan, muat ulang; tidak muncul kembali. | BELUM |
| UAT-17 | Tambah bagian dan dropdown beserta opsi; ubah urutan, simpan, preview dan publish; urutan/opsi sesuai. | BELUM |
| UAT-18 | Buka pendaftaran anonim, kirim respons. Biarkan tab form versi lama terbuka, publish versi baru, kirim dari tab lama: konflik, lalu muat versi terbaru; isian dengan ID pertanyaan sama tetap ada dan respons lama tetap terbaca. | BELUM |
| UAT-19 | `uat-biasa` membuat acara/form dan menerima respons sintetis; `uat-wakil` mencoba respons/ekspor: 403 walaupun Inti. Petugas yang ditunjuk pembuat baru dapat membaca. | BELUM |
| UAT-20 | Buat short link ke tujuan publik aman; pengurus nonowner/non-Inti tidak dapat menghapus. Inti dapat menonaktifkan; redirect nonaktif 404. | BELUM |
| UAT-21 | Unggah PDF valid tepat 20 MiB ke Dokumen A, lalu 20 MiB + 1 byte; pertama diterima, kedua 413. Catat bukti realisasi dari A, isi LPJ dan unduh lampiran; bukti dari Proker lain ditolak. | BELUM |
| UAT-23 | Ketupel A dan B masing-masing membuka/menerapkan template panitia; hanya dapat mengubah struktur Proker sendiri. | BELUM |
| UAT-24 | Ketupel A memecah PDD menjadi dua kelompok, mengubah nama/urutan; tidak mengubah struktur B. | BELUM |
| UAT-25 | Pengelola A selain Ketupel mencoba mutasi struktur melalui API; 403. | BELUM |
| UAT-26 | Tambah panitia A tanpa akun; setelah A ditutup nanti, identitas/posisi tetap terbaca tanpa akun baru. | BELUM |
| UAT-27 | Ketua membuat akun untuk 12 jabatan Inti lewat Organisasi & Akun; masing-masing dapat mengelola akun/akses. `uat-biasa` ditolak. Pertahankan Ketua Umum aktif. | BELUM |
| UAT-28 | Hunting mengelola tugas Internal dan assignment A, tetapi tidak memperoleh hak mengelola Eksternal. | BELUM |
| UAT-29 | Bandingkan Ketua sebagai pencipta A dan Ketupel A; keduanya mendapat assignment, nama panitia biasa tidak memberi assignment. | BELUM |
| UAT-30 | Inti mengganti Ketupel A ke akun lain; grant Ketupel lama berhenti, histori/progres tetap. Bila masih PIC/manual, akses dari sumber tersebut tetap sah. Kembalikan Ketupel A sebelum close. | BELUM |
| UAT-31 | Hapus grant manual Eksternal, lalu tunjuk sebagai PIC tugas A; mendapat akses A. Cabut PIC terakhir tanpa sumber lain: akses edit hilang. | BELUM |
| UAT-32 | Hunting mencoba edit agenda Eksternal dan Proker tanpa assignment; ditolak, kalender tidak memperluas scope. | BELUM |
| UAT-10 | Ketupel A menutup A dengan tiga tugas TODO; muncul konfirmasi pekerjaan belum selesai. Lakukan setelah semua pengujian mutasi A. | BELUM |
| UAT-11 | Setelah A CLOSED, coba ubah tugas/RAB/dokumen/realisasi/LPJ/form terkait melalui API; ditolak, histori tetap terbaca. | BELUM |
| UAT-33 | Periksa tiga tugas tadi tetap TODO, bukan otomatis DONE; agenda aktif A hilang tanpa menghapus histori. | BELUM |
| UAT-35 | Siapkan periode penerus dan Ketua Umum penerus lewat Organisasi; Wakil mencoba arsip periode lama melalui API: 403. | BELUM |
| UAT-34 | Ketua Umum lama mengarsipkan periode; login pengurus penerus, baca Jejak beserta dokumen/acara/panitia; progres tidak disalin dan histori membeku. Jalankan paling akhir. | BELUM |
| UAT-36 | Mutasi setelah arsip ditolak. Race dua transaksi diuji terpisah melalui prosedur `race_check.py` yang sudah diizinkan; sesi serial ini tidak membuktikan race semua endpoint HTTP. | BELUM |
| UAT-22 | Operator menjalankan restore pasangan DB+media berisi histori pada lingkungan uji dengan preflight/izin tersendiri. Verifikasi hash, akses unduh, respons dan Jejak. Transaksi UAT rollback tidak bisa didump oleh proses backup eksternal. | BELUM |
| UAT-37 | Readiness melalui Next lokal harus 200. Compose/image/volume/HTTPS/koneksi target deployment diperiksa operator pada target tersendiri; launcher lokal tidak membuktikannya. | BELUM |

## Catatan hasil

- Tanggal sesi dan versi acuan: belum diisi.
- Penguji/peran dan perangkat/browser: belum diisi.
- Per UAT: hasil aktual, bukti, nomor isu, dan hasil pengujian ulang bila gagal.
- Keputusan penerimaan pengurus: belum diberikan; skenario terhalang tetap terbuka.
- Restore operasional, Compose/HTTPS, backup off-host dan beban konkuren tetap gate teknis terpisah.

## Perbaikan UX 18 November 2026

Pemeriksaan berikut menambah checklist existing; hasil otomatis tidak menggantikan penerimaan pengurus.

- [ ] Buka seluruh modul dengan daftar kosong: judul, tab, tabel atau wadah konten tetap terlihat; petunjuk dan tindakan tersedia sesuai peran.
- [ ] Tambah tugas langsung dari setiap kolom, termasuk Review. Papan asal/PIC benar dan tugas tersimpan satu kali.
- [ ] Seret tugas dengan mouse; gunakan pegangan pada layar sentuh; gunakan Spasi, tombol arah (Shift untuk langkah lebih jauh), Enter untuk melepas, Escape untuk membatalkan melalui keyboard.
- [ ] Coba mengubah tugas yang sama dari dua sesi: konflik menjelaskan pemulihan; posisi mengikuti server dan isian tidak hilang.
- [ ] Papan hanya lihat, Proker ditutup, dan periode arsip menolak perubahan; kolom dan informasi historis tetap terlihat.
- [ ] Kalender tetap berbentuk grid tanggal pada bulan kosong; periksa navigasi tahun, Februari kabisat, tanggal terpilih dan Hari ini.
- [ ] Tambah agenda dari tanggal terpilih, pastikan jam WIB, rentang lintas hari, dan akhir tepat tengah malam tidak menambah satu hari kegiatan.
- [ ] Pilih bulan lampau: Agenda mendatang tetap menampilkan 30 hari dari hari ini sesuai filter, bukan dari bulan lampau.
- [ ] Periksa seluruh informasi kalender pada layar 320/390 piksel, agenda padat melalui rincian tanggal, dan scroll kanban tanpa overflow halaman.
- [ ] Periksa koneksi gagal/loading/refresh: struktur tetap terlihat, data lama diberi pesan saat refresh gagal, retry bekerja, pratinjau formulir dan isian bertahan.
