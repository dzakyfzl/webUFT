# AGENTS.md

## Konteks project (di dalam repo)

Catatan project ada di `.agent/` dan ikut git, jadi otomatis sesuai branch:

- `.agent/STATE.md`: posisi terakhir (status, next steps, blocker).
- `.agent/DECISIONS.md`: keputusan teknis beserta alasannya, append-only.

**Awal sesi:** baca `.agent/STATE.md`. Jangan scan seluruh repo atau folder; buka hanya file yang relevan dengan tugas.

**Akhir kerja yang bermakna:** update `STATE.md` (3-6 baris cukup). Kalau ada keputusan teknis, tambah entri di `DECISIONS.md` (apa, kenapa, alternatif yang ditolak). Perubahan kecil seperti typo atau format tidak perlu dicatat.

Jangan mencatat hal yang sudah terlihat di `git log` atau diff.

## Gaya komunikasi

- Balas dalam bahasa Indonesia kecuali diminta lain. Kode, nama variabel, dan commit message dalam bahasa Inggris.
- Ringkas dan langsung: kesimpulan dulu, detail setelahnya. Tanpa basa-basi pembuka dan tanpa mengulang isi di akhir.
- Jangan pakai emoji di balasan, kode, komentar, commit message, dokumentasi, maupun teks UI. Pengecualian hanya jika user memintanya atau emoji memang bagian dari konten produk.
- Format seperlunya. Jawaban pendek tidak butuh heading atau bullet, dan hindari bold berlebihan.
- Kalau tidak tahu, bilang tidak tahu. Jangan mengarang file, API, atau hasil test.
- Klaim hasil ("test lulus", "bug sudah diperbaiki") hanya jika benar-benar dijalankan. Sebut perintahnya dan hasil singkatnya.

## Kode

- Ikuti gaya dan pola yang sudah ada di repo sebelum membuat pola baru.
- Ubah sekecil yang dibutuhkan tugas. Jangan refactor yang tidak diminta; kalau menemukan masalah lain, sebutkan saja.
- Jalankan test, lint, atau build yang relevan sebelum menyatakan selesai. Kalau tidak bisa dijalankan, katakan.
- Jangan menambah dependensi baru tanpa menyebut alasannya dan menunggu persetujuan.
- Jangan menyimpan secret, token, atau kredensial di kode, log, maupun `.agent/`.
- Tanya dulu sebelum aksi destruktif: hapus file, reset, force-push, mengubah migrasi data.

## UI dan desain

- Teks UI: tanpa emoji, bahasa sesuai produk, tidak berlebihan.
- Arahan warna ERP pengurus: kurang lebih merah dan hitam. Nilai warna/token final ditetapkan saat desain; gunakan warna netral pendukung untuk keterbacaan dan kontras.
- Komponen dari [21st.dev](https://21st.dev/) boleh digunakan sebagai sumber komponen design system, disesuaikan dengan stack existing dan konsistensi visual project. Paket tambahan tetap membutuhkan persetujuan.
- Halaman publik tetap mengikuti batas pelestarian pada planning aktif; arahan desain ini tidak otomatis mengizinkan redesign publik.

## Preferensi skill project

- Pengguna secara eksplisit memilih `gpt-taste` untuk pekerjaan desain/frontend webUFT. Sebelum pekerjaan tersebut, baca dan gunakan [skill lokal](.agent/skills/gpt-taste/SKILL.md). Registrasi ini berlaku khusus repo ini, tanpa instalasi atau perubahan konfigurasi global.
- Gunakan juga skill `impeccable` sebagai pendamping `gpt-taste` untuk penggunaan kata/teks UI, animasi, layout, border, dan komponen. Sebelum mengerjakan bagian tersebut, baca `SKILL.md` Impeccable dari lokasi yang tercantum pada katalog skill sesi.
- Teks UI harus natural, ringkas, dan jelas tentang tindakan serta hasilnya. Buat layout dan komponen lebih luwes melalui hierarki, jarak, pengelompokan, radius yang konsisten, dan border seperlunya; hindari membungkus setiap bagian dalam kotak berbatas yang seragam. Pertahankan kejelasan batas kontrol, fokus keyboard, dan kontras. Animasi membantu transisi atau umpan balik tindakan, tetap ringan, dan menghormati `prefers-reduced-motion`.
- Terapkan skill sesuai konteks alur pengurus dan prinsip mobile-first pada PRD. Pola halaman promosi seperti AIDA/hero dan animasi sinematik diterapkan hanya bila sesuai jenis layar; dashboard, form, dan tabel tetap mengutamakan pekerjaan pengguna. Dependensi animasi tidak otomatis disetujui.
- Jangan gunakan skill antislop atau antislop-ui, kecuali diminta eksplisit oleh pengguna.
