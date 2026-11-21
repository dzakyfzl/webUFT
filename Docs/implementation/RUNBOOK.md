# Menjalankan ERP pengurus

Acuan P0+P1: PRD v1.6 dan keputusan perluasan P1 pengguna. Backend FastAPI di `Backend/`, frontend Next.js di `frontend/`, satu PostgreSQL existing di luar Docker. Tidak ada database pengganti atau migrasi otomatis saat aplikasi mulai. P2 tetap backlog. Detail P1 ada di [P1.md](P1.md).

## Pengembangan lokal

1. Gunakan `.env` root untuk target PostgreSQL yang sudah diverifikasi. Backend menerima `DATABASE_URL` dengan scheme `postgresql+psycopg`, atau lima variabel existing `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_DATABASE`. `DATABASE_URL` didahulukan bila keduanya ada. Jangan menyalin nilai ke log atau git. Lihat `Backend/.env.example` untuk nama variabel ERP.
2. Gunakan `ERP_ENV=development` dan `ERP_PUBLIC_ORIGIN=http://localhost:3000`. Browser harus membuka origin yang sama persis; `127.0.0.1` dan `localhost` berbeda untuk pemeriksaan CSRF.
3. Dependensi backend yang disetujui dipin di `Backend/requirements.lock`; instal dengan `Backend/.venv/bin/pip install -r Backend/requirements.lock`. Bila venv belum ada, buat dengan `python3 -m venv Backend/.venv`. Frontend menggunakan `npm ci` dari `frontend/`.
4. Jalankan preflight read-only dari root: `python3 Backend/scripts/preflight.py`. Script ini membutuhkan konfigurasi `DATABASE_*` existing dan `psql`; output tidak memuat kredensial. Baseline `0001_erp_baseline` sudah diterapkan pada target lokal yang disetujui. Jangan mengeksekusi ulang pada target lain tanpa preflight, backup, review dan izin migrasi.
5. Untuk instalasi baru yang telah disetujui, jalankan `Backend/.venv/bin/python Backend/scripts/backup.py` sebelum `cd Backend` lalu `.venv/bin/alembic upgrade head`. Hanya satu proses migrator berjalan. Jangan mengubah baseline yang sudah diterapkan atau menghapus tabel legacy.
6. Akun pertama dibuat secara interaktif: dari `Backend/`, jalankan `.venv/bin/python -m app.cli bootstrap`. Masukkan nama, username, periode dan password melalui prompt; password tidak masuk argumen CLI. Bootstrap menolak database ERP yang sudah mempunyai akun. Belum ada akun operasional dibuat selama pengujian ini.
7. Dari root jalankan `./start.sh`, lalu buka `http://localhost:3000/admin/login`. Launcher memakai port 8000/3000 dan menghentikan kedua proses miliknya ketika salah satu keluar atau menerima Ctrl+C. Launcher tidak memasang paket, memigrasi, atau membuat akun.

Untuk menjalankan terpisah: backend `.venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --workers 1` dari `Backend/`; frontend `npm run dev` dari `frontend/`. Endpoint liveness `/api/health`, readiness `/api/ready`, kontrak `/api/openapi.json` dan dokumentasi `/api/docs` tersedia langsung pada backend. API administratif berada di `/api/admin`.

Untuk UAT lokal sebelum bootstrap operasional, jalankan `./start.sh --uat` dari root, atau langsung `Backend/.venv/bin/python Backend/scripts/uat_session.py`. Launcher memakai port 3200/8200, delapan akun peran dengan password sesi, media sementara, dan fixture rollback PostgreSQL existing. Password sesi dibaca dari file lokal jika tersedia, atau diminta melalui prompt tersembunyi. Hanya target loopback non-production tanpa data ERP yang diterima; catatan percobaan login boleh sudah ada dan tetap diverifikasi setelah rollback. `./start.sh --uat --check` menjalankan pemeriksaan browser lalu keluar. `./start.sh --help` menampilkan pilihan launcher. Penerimaan manusia tetap harus dicatat pengurus. [Checklist 37 UAT dan urutan pelaksanaan](UAT.md).

## Alur pengurus

- Ketua Umum awal membuka Organisasi & Akun, membuat akun personal, lalu mengatur keanggotaan dan jabatan. Semua 12 posisi Inti aktif boleh mengelola; kepala unit memperoleh keanggotaan unit yang sesuai. Struktur tetap per periode sesuai PRD: tiga departemen, empat bidang dan HR. API tidak menyediakan perombakan bebas unit resmi.
- Cari akun dengan nama/username. Untuk anggota yang sudah tercatat tanpa akun, buka **Anggota tanpa akun**, cari namanya lalu pilih **Buat akun untuk anggota ini**. Identitas lama dipakai tanpa membuat anggota kedua; satu anggota hanya boleh memiliki satu akun. Akun existing dipakai lagi lewat **Atur akses** pada periode penerus. Direktori PIC/Ketupel memuat semua halaman, termasuk identitas arsip dari snapshot periode.
- Inti membuat Proker, memilih pemilik dan Ketupel. Pemilik tidak berubah setelah create. Pencipta, Ketupel berakun, pengelola manual dan PIC task memperoleh grant sesuai sumber; nama panitia sendiri tidak memberikan akses.
- Pengelola mengisi tugas, RAB dan nama panitia. Hanya Ketupel berakun mengubah struktur panitia. Total RAB dihitung backend dari string Decimal dan dibulatkan per baris ke rupiah.
- Ketua Pelaksana/Inti menutup Proker dengan konfirmasi pekerjaan tertinggal. Data menjadi read-only dan tugas belum selesai tetap mempunyai status aslinya.
- Inti menyiapkan periode baru dan Ketua Umum penerus di Organisasi & Akun. Ketua Umum lama mengarsipkan melalui Jejak. Akses Ketua Umum terakhir tidak dapat dicabut sebelum pengganti tersedia. Pengurus periode penerus membaca Jejak; akun global tidak dinonaktifkan massal dan progres tidak disalin.
- Proker memiliki tab Dokumen, Realisasi dan LPJ. Upload maksimal 20 MiB; format yang didukung tercantum di form. Berkas besar/format lain memakai tautan Drive. Bukti realisasi harus berasal dari Proker yang sama; close/arsip membuat seluruh tab hanya-baca.
- Anggota aktif Asset dan Property membuka Inventaris. Aset fisik/buku dibedakan per kode; kondisi dan ketersediaan terpisah. Pinjam/sewa menerima nama eksternal tanpa akun; pengembalian rusak menjadi PERBAIKAN. Riwayat dan petugas tidak dihapus. Pengurus unit lain hanya membaca metadata umum, bukan identitas peminjam atau rujukan vault.
- Semua pengurus aktif membuka Acara & Formulir untuk membuat acara. Publish tidak memerlukan approval. Form Builder dapat memakai template atau kosong, mengubah semua pertanyaan, menambah bagian/pilihan dan mengatur urutan. Simpan draft dahulu, Publish menjadi versi immutable, lalu Buka pendaftaran. Halaman publik `/events/{id}` dan kartu acara landing page memakai konten PUBLISHED.
- Respons & ekspor hanya untuk pembuat acara/petugas yang ditunjuk. Inti yang hanya mengelola konten acara tidak otomatis mendapat data peserta. Pilih versi sebelum ekspor CSV/Excel; maksimal 10.000 respons/20 MiB jawaban per versi. Submit versi lama ditolak 409; tombol Muat versi terbaru mempertahankan isian dengan ID pertanyaan yang sama.
- Short Link pengurus ada di `/admin/links`. Form `/shortlink` existing memakai autentikasi dan CSRF yang sama; pengunjung anonim mendapat pesan serta tautan untuk masuk. Redirect `/link/{slug}` dan resolver `/api/shortlink/r/{slug}` hanya bekerja untuk link aktif dengan tujuan publik aman. Pastikan konfigurasi subdomain Next/proxy sesuai pada deployment.

## Migrasi dan storage P1

Target lokal telah mendapat `0002_p1` dengan izin terpisah: total 30 tabel ERP + 21 tabel lain. Jangan mengulang baseline atau mengubah revisi yang sudah diterapkan. Target lain tetap membutuhkan preflight, backup dan persetujuan sebelum upgrade.

`ERP_MEDIA_DIR` dibaca dari konfigurasi runtime, default `var/media` relatif cwd backend. Launcher menjalankan backend dari `Backend/`. Direktori private/file dibuat dengan mode 0700/0600. Compose mengatur `/app/var/media` pada volume `erp_media`; volume tersebut harus ikut backup. Tidak ada file peserta publik pada P1 awal. Next source mengizinkan 21mb dan Nginx 20m; batas otoritatif backend 20 MiB pada raw upload.

Periksa izin volume setelah container berjalan, penggunaan disk dan kapasitas VPS sebelum rilis. Pemeriksaan source/build/HTTP lokal tidak membuktikan container atau mount volume di VPS sehat.

## Container dan proxy

Source Compose tersedia, tetapi belum divalidasi/dijalankan oleh Docker Compose dalam sesi ini karena plugin tidak tersedia. Sebelum rilis, pasang tooling melalui proses persetujuan lingkungan, jalankan `docker compose config --quiet`, kemudian verifikasi image dan health pada target sebenarnya.

- Production memakai `docker-compose.yml`, network eksternal `caddy_net` harus tersedia. Tidak ada PostgreSQL container. Bila memakai variabel `DATABASE_*`, `ERP_DATABASE_HOST` menunjuk host PostgreSQL yang dapat dijangkau container, default `host.docker.internal`. Jika memakai `DATABASE_URL`, hostname di URL yang menentukan target; override `DATABASE_HOST` tidak menggantikannya.
- Tetapkan `ERP_ENV=production` dan `ERP_PUBLIC_ORIGIN` origin HTTPS yang benar. TLS berakhir pada proxy yang dikelola operator. Cookie sesi HttpOnly/SameSite=Lax/Secure, TTL default 12 jam; reset password atau nonaktif akun membatalkan sesi. Mutasi memerlukan Origin dan token CSRF.
- Uvicorn membaca `FORWARDED_ALLOW_IPS`, yang di Compose diisi dari `ERP_TRUSTED_PROXY_IPS`. Gunakan hanya IP/CIDR proxy yang benar-benar dikendalikan operator. Default hanya loopback. Jangan memakai `*`. Tanpa daftar proxy yang tepat, rate limit IP mengelompokkan koneksi proxy sebagai satu IP. Proxy harus menimpa header forwarding dari klien; periksa jalur Caddy/Next/Nginx yang benar-benar digunakan sebelum rilis. Nginx API menimpa X-Forwarded-For dengan alamat peer.
- Port backend tidak dipublikasikan Compose. Default satu worker dan pool 3 + overflow 2. Health container menggunakan `/api/ready`, sehingga database/schema yang belum siap tidak dianggap sehat. Log production berotasi 10 MB x 3 per service.
- Setelah target/backup disetujui, migrasi sebelum start: `docker compose run --rm --no-deps backend alembic upgrade head`. Bootstrap memakai `docker compose run --rm --no-deps backend python -m app.cli bootstrap` dengan prompt interaktif. Jangan menjalankannya sebagai bagian restart rutin.
- Verifikasi HTTPS/login/logout/CSRF, dua klien berbeda untuk rate limit, `/api/ready`, latensi dan penggunaan RAM/disk pada target. Satu VPS tetap satu titik kegagalan.

## Backup dan pemulihan

`Backend/.venv/bin/python Backend/scripts/backup.py` menggunakan `pg_dump` pada target runtime yang dikonfigurasi dan membuat dump lokal mode 0600 di `/tmp`. Ini bukan backup berkala/off-host. Operator masih perlu menentukan tujuan off-host, akses terbatas, jadwal, retensi dan pemantauan kegagalan; jangan menganggap file `/tmp` tahan reboot. P1 sudah aktif; media wajib ikut backup bersama database.

P1 sudah menyediakan backup pasangan DB/media. Setelah operator menghentikan penulisan aplikasi, jalankan dari root:

```sh
Backend/.venv/bin/python Backend/scripts/backup.py --media-dir Backend/var/media --quiesced
```

Gunakan lokasi volume yang benar bila container dipakai. Flag `--quiesced` adalah konfirmasi operator bahwa penulisan sudah berhenti; script tidak mematikan aplikasi. Hasilnya dump, `.media.tar.gz` dan `.manifest.json` mode 0600. Manifest mencatat storage key, ukuran dan SHA-256 setiap file. Simpan ketiga artefak sebagai satu pasangan dan salin off-host melalui saluran yang dikelola operator. Jangan hanya menyalin database.

Helper arsip/manifest media telah diuji roundtrip dengan file sintetis. Restore pasangan PostgreSQL+media operasional belum diuji; jangan menganggap test media setara restore sistem. Pemulihan ke target runtime tetap membutuhkan preflight dan persetujuan tersendiri, pemeriksaan hash/file serta izin storage, dan verifikasi akses unduh setelah database dan media kembali sebagai pasangan.

Uji restore yang diizinkan: dari `Backend/`, `.venv/bin/python scripts/restore_check.py /path/to/backup.dump`. Script membuat satu database acak `webuft_restore_*`, membatasi koneksi PUBLIC, memulihkan dump, membandingkan jumlah baris dengan sumber, lalu menghapus hanya database tersebut. Target runtime tidak diganti. Memerlukan hak CREATE DATABASE dan izin eksplisit CREATE/DROP. Sumber yang berubah setelah backup dapat menyebabkan selisih; jalankan pembandingan pada jendela tenang. Pembandingan row count bukan bukti kesamaan setiap isi kolom.

Pemulihan production membutuhkan preflight dan izin terpisah. Jangan menjalankan DROP, downgrade destruktif atau restore ke target runtime sebagai percobaan. Catatan uji lokal: 38 tabel/1125 baris cocok; tabel ERP masih kosong saat backup, sehingga pemulihan histori ERP berisi data operasional belum terbukti.

## Pemeriksaan yang dapat diulang

Jalankan dari `Backend/`:

```sh
.venv/bin/python scripts/integration_tests.py
.venv/bin/python scripts/browser_test.py --production
.venv/bin/python scripts/browser_test.py --production --p1
.venv/bin/python scripts/profile_read_api.py
```

Perintah tersebut memakai target PostgreSQL existing dengan fixture outer transaction yang di-rollback. Browser menyalakan API/Next/Chromium milik script pada port 8100/3100/9327, memakai build terisolasi, password fixture hanya lewat stdin dan storage media sementara yang dibersihkan. Jangan jalankan script browser bersamaan pada port yang sama. Serialisasi koneksi fixture diperlukan karena satu transaksi dipakai lintas request; ini bukan simulasi beban konkuren.

`.venv/bin/python scripts/race_check.py` berbeda: membuat satu periode sintetis yang di-commit untuk menguji dua transaksi yang benar-benar bersaing. Izin fixture dan cleanup telah diberikan untuk pengujian ini; script menghapus hanya UUID/nama miliknya. Tidak membuat akun. Jangan mengganti target tanpa preflight/persetujuan baru.

Dari `frontend/`, jalankan `npm run build` serta `./node_modules/.bin/eslint app/admin app/lib/erp app/components/PublicChatBoundary.tsx next.config.ts`. Matriks [REQUIREMENTS.md](REQUIREMENTS.md) membedakan bukti otomatis, UAT manusia, backlog, dan pemeriksaan deployment yang belum dijalankan.
