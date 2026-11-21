# Implementasi ERP pengurus

Instruksi implementasi pengguna menggantikan batas tugas planning sebelumnya. Acuan tetap PRD v1.6 dan rencana P0 v1.6. Instruksi terbaru mengaktifkan seluruh P1. Halaman publik existing dipertahankan; acara/pendaftaran memakai rute /events dan API /api/public. P2 tetap backlog.

- [Matriks persyaratan dan bukti](REQUIREMENTS.md): seluruh 50 FR, 37 UAT dan 16 NFR; status parsial tidak berarti fitur selesai.
- [Catatan loop](LOOPS.md): batch P0 berhenti pada 20/20, lalu pengguna memberikan instruksi baru untuk seluruh P1; catatan P0 tidak direset.
- Backend FastAPI dan frontend Next.js pengurus tersedia dengan API nyata, policy, sesi/CSRF, organisasi, Proker/panitia/RAB, tugas, kalender, monitoring dan Jejak. Baseline ERP telah diterapkan pada PostgreSQL lokal yang disetujui; fixture pengujian di-rollback.

- Seluruh P1: lampiran/tautan, realisasi/LPJ, inventaris fisik/digital, pinjam/sewa/kembali, acara publik, Form Builder immutable, respons/CSV/XLSX dan short link. Lihat [P1.md](P1.md). Migrasi tambahan `0002_p1` sudah diterapkan dengan izin; total 30 tabel ERP.

## Urutan berikutnya

1. Paket backend/test dan D01–D07 sudah disetujui; rujuk `.agent/DECISIONS.md`. Grant manual, Ketupel dan PIC dikelola berdasarkan sumber masing-masing.
2. Gunakan [RUNBOOK.md](RUNBOOK.md) untuk menjalankan lokal dan menyiapkan akun awal secara interaktif. Akun operasional belum dibuat; bootstrap bukan bagian restart rutin.
3. Lanjutkan W10: UAT pengurus, Compose/HTTPS pada target, kapasitas VPS, backup off-host dan restore histori ERP berisi data masih memerlukan pembuktian. Build, test lokal dan profiler bukan bukti deployment.
4. Verifikasi otomatis saat ini dicatat pada matriks dan log loop. P0+P1 telah ditulis dan diverifikasi otomatis sesuai matriks; P2 tetap backlog. UAT manusia dan gate deployment masih terpisah.

## Kontrak domain awal

Policy menerima akun, keanggotaan pengurus, keanggotaan unit dan posisi dari persistence terpercaya, bukan payload klien. `governing_period_ids` adalah periode pengurus aktif yang wajib dimuat adapter organisasi; posisi kepala unit harus disertai membership unit yang sesuai oleh service organisasi. Posisi Inti tidak memberikan assignment Proker.

Setiap grant mempunyai sumber dan ID sumber, memungkinkan beberapa task PIC/manual/Ketupel mendukung satu assignment efektif. Create Proker menghasilkan grant pencipta dan Ketupel, close menghasilkan pencabutan semua grant aktif Proker tersebut tanpa menghapus histori. Grant tersimpan di PostgreSQL. Pencabutan satu sumber mempertahankan sumber lain sesuai D03/D04 yang disetujui.

Domain lifecycle menghasilkan satu `Change` berisi record, perubahan grant dan audit. Adapter PostgreSQL menyimpan perubahan operasional dalam satu transaksi dengan lock periode → Proker. Penutupan tidak mengubah task menjadi DONE. `confirmed_unfinished` diperlukan jika ada tugas belum selesai. Retry close yang sah menghasilkan no-op. Inti memilih owner saat create; owner tidak dapat diganti, sesuai D07.

`Settings.from_environment` memvalidasi mapping environment tanpa membaca `.env` otomatis atau menghubungi database. `DATABASE_URL` memakai scheme SQLAlchemy `postgresql+psycopg`; tidak ada fallback database. Production wajib `ERP_PUBLIC_ORIGIN` HTTPS; origin dinormalisasi agar skema uppercase tetap menghasilkan cookie Secure. TTL sesi, rate limit login dan batas pool diterapkan pada runtime; ERP_MEDIA_DIR menentukan storage private P1. Contoh nama variabel tersedia di `Backend/.env.example` tanpa kredensial.

RAB menerima jumlah dan harga berupa string Decimal, maksimal empat digit pecahan dan nilai `999999999999999.9999` per input. Jumlah harus positif; harga boleh nol. Total baris dibulatkan ke rupiah dengan `ROUND_HALF_UP`, total keseluruhan adalah jumlah total baris yang ditampilkan. Ini keputusan teknis awal untuk API dan kolom NUMERIC, bukan batas persetujuan anggaran. Tidak ada workflow approval.
