# Matriks implementasi dan verifikasi PRD v1.6

Acuan [PRD v1.6](../PRD_ERP_UKM_MVP_v1.6.md) dan [rencana P0](../RENCANA_IMPLEMENTASI_ERP_UKM_P0_v1.6.md). Instruksi terbaru memperluas implementasi ke seluruh P1: 50 FR dan 37 skenario UAT masuk cakupan P0+P1. Halaman publik existing dipertahankan; acara/pendaftaran P1 ditambahkan pada /events. P2 tetap backlog. Bukti otomatis tidak menggantikan UAT manusia atau deployment.

Status “implementasi + bukti otomatis” menunjukkan kode dan skenario yang benar-benar diuji, bukan persetujuan operator atau klaim seluruh kondisi production sudah lulus. Semua UAT manusia masih menunggu pelaksanaan pengurus. Tidak ada deployment atau akun operasional yang dibuat.

## Indeks bukti

Test API berada di [test_postgres_api.py](../../Backend/tests/test_postgres_api.py) dan [test_p1_api.py](../../Backend/tests/test_p1_api.py), dijalankan melalui `.venv/bin/python scripts/integration_tests.py` dari Backend dengan fixture transaksi rollback. Test policy, uang, konfigurasi, lifecycle dan HTTP juga masuk suite tersebut. Nama di bawah adalah penunjuk test tanpa awalan `test_`.

| Kode | Bukti otomatis dan batasnya |
|---|---|
| E01 | `auth_cookie_me_logout_and_csrf`, `deactivation_invalidates_an_existing_session`, `login_failures_are_persisted_and_blocked_ip_creates_no_extra_user_buckets`; test HTTP/konfigurasi memeriksa cookie, origin dan redaksi input. HTTPS target belum diuji. |
| E02 | `all_twelve_inti_can_manage_users_non_inti_cannot`, `last_chair_cannot_be_removed_before_a_replacement_is_ready`; model/seed organisasi dan browser akun/handover. |
| E03 | `create_program_active_and_initial_grants_audited_atomically`, `non_inti_cannot_create_program_via_api`, `membership_inheritance_controls_manual_grants`, `manual_grant_can_be_revoked_after_account_deactivation`, `chairperson_change_preserves_record_and_moves_grant`, serta test policy/lifecycle. |
| E04 | `dashboard_only_focuses_assigned_work_and_other_programs_remain_searchable`, `calendar_mutation_follows_scope_and_program_dates_are_derived`, `calendar_date_boundaries_use_jakarta_days`, `monitoring_counts_each_original_task_once`. |
| E05 | `committee_template_only_chair_and_nonaccount_member_has_no_grant`, `two_chairpersons_only_customize_their_own_program`, `chair_can_split_reorder_rename_and_reset_unused_committee_groups`, `recording_account_in_committee_does_not_grant_program_access`. |
| E06 | `budget_total_is_exact_server_value_and_closed_is_read_only`, `scope_rules_and_optimistic_conflict`, `department_aggregate_keeps_original_program_permissions_and_no_duplicates`, `pic_grants_are_scoped_and_changing_pic_preserves_other_sources`, `pic_revoke_preserves_other_task_and_manual_sources`; test Decimal. |
| E07 | `close_with_unfinished_tasks_preserves_status_and_hides_calendar`, `closed_program_mutations_denied_and_retry_does_not_duplicate_audit`; domain retry/version/confirmation. |
| E08 | `every_program_child_mutation_is_rejected_after_close`, `every_program_child_mutation_is_rejected_after_period_archive`, `only_chair_archives_and_successor_reads_unchanged_jejak`, `archived_identity_directory_survives_later_master_name_changes`. Matrix mencakup 18 bentuk mutasi per status. |
| E09 | `failed_audit_rolls_back_task_and_pic_grant_together`, `validation_error_rolls_back_program_and_grants`, `program_activity_is_readable_by_other_boards_without_account_audit_leak`; snapshot identitas/posisi actor dan audit lifecycle. |
| E10 | `.venv/bin/python scripts/race_check.py`: wait lock PostgreSQL teramati lalu mutasi ditolak setelah archive commit, fixture periode milik script dibersihkan. `scripts/restore_check.py` pada backup lokal: 38 tabel/1125 baris cocok, DB sementara dihapus; row-count comparison, bukan hash seluruh isi. |
| E11 | `.venv/bin/python scripts/browser_test.py --production`: build Next production + Chromium + API nyata + PostgreSQL rollback, 18 alur. Tambahan mencakup direktori 505 akun, PIC tetap tersimpan saat direktori ditunda, tautan papan asal, anggota tanpa akun, pemakaian identitas lama untuk akun dan pencarian akun; alur arsip/Jejak tetap lulus. Overflow panitia dan organisasi 320/390/1440 px lolos, screenshot diperiksa; chatbot admin 0 request. |
| E12 | `npm run build`, ESLint file ERP, `bash -n start.sh`, `git diff --check` dan Python compileall; launcher lokal menghasilkan readiness backend serta halaman login HTTP 200, kemudian dimatikan. Preflight: 17 tabel ERP + 21 tabel lain (20 existing + metadata versi), users/periods/programs/tasks/audit = 0. Bukan bukti Compose/deploy. |
| E13 | `.venv/bin/python scripts/profile_read_api.py`: 2000 tugas rollback, 25 pembacaan serial per endpoint; pengukuran ulang p95 tasks 55.25 ms, dashboard 97.06 ms, monitoring 46.29 ms. Peak RSS Python fixture 328612 KiB; shared_buffers PostgreSQL 128 MB. Sampel lokal, bukan uji concurrent load/VPS. |
| E14 | Checkpoint P0 `.venv/bin/python scripts/integration_tests.py`: 89 test lulus, termasuk 35 integrasi PostgreSQL. Tambahan: `existing_member_becomes_one_account_and_duplicate_is_rejected`, `member_search_pages_are_stable_and_exclude_linked_accounts`, `directory_can_reach_accounts_after_the_first_500` (505 akun). Test snapshot arsip dijalankan lagi dengan pagination dua halaman; nama historis tidak berubah. Seluruh fixture rollback. |
| E15 | `test_p1_api.P1ApiTest.test_documents_size_type_download_expenses_report_and_freeze`: tipe/ukuran/akses unduh, bukti antar-Proker ditolak, realisasi dan LPJ readonly setelah close. E19 membuktikan ukuran pada HTTP nyata; metadata/media fixture di-rollback/dibersihkan. |
| E16 | Test `physical_book_manual_borrower_double_loan_return_and_private_history`, `only_asset_members_manage_digital_and_reference_is_private`: buku, pinjam/sewa, guard loan ganda, kembali rusak, arsip tanpa hilang histori, pembatasan borrower/vault. |
| E17 | Test `template_fully_editable_version_conflict_idempotency_and_private_exports`, `form_validation_honeypot_close_and_program_freeze`, `public_only_published_ownership_and_submission_rate_limit`, `published_form_schema_is_database_immutable`, `period_archive_freezes_all_p1_period_mutations`, serta test validator/export: versi terbit dilindungi PostgreSQL, CSV formula-safe dan XLSX inline strings, NIM nol di depan tetap string. |
| E18 | Test `shortlink_owner_inti_safe_destination_inactive_and_audit`: ownership/Inti, private IP/DNS/skema/userinfo ditolak, aktif redirect 307 dan nonaktif 404; DNS API test memakai resolver terkontrol, browser memakai domain publik. |
| E19 | `.venv/bin/python scripts/browser_test.py --production --p1`: build Next production + Chromium → API → PostgreSQL rollback. 21 alur lulus, termasuk autentikasi generator short link existing, publikasi pada kartu landing page existing, dropdown/bagian/urutan baru, upload tepat 20 MiB, batas +1 byte, bukti realisasi, LPJ, template dihapus seluruhnya, versi baru/stale recovery dengan isian tetap, submit anonim, respons/Excel dan freeze pendaftaran. Overflow 320/390/1440 lolos. Screenshot inventaris/builder/pendaftaran diperiksa; perbaikan visual mobile terakhir diverifikasi ulang. |
| E20 | `test_p1_validation.P1ValidationTest.test_media_backup_roundtrip_has_owner_only_artifacts_and_hash_manifest`: arsip media dan manifest mode 0600, isi kembali identik. Bukan uji restore PostgreSQL+media operasional/off-host. |
| E21 | `.venv/bin/python scripts/integration_tests.py`: suite akhir 103 test lulus (44 integrasi PostgreSQL), mencakup regresi P0, seluruh P1, konfigurasi storage dan backup media. Test terduplikasi dari import kelas P0 sudah dihilangkan dari discovery. |
| E22 | `Backend/.venv/bin/python Backend/scripts/uat_session.py --check` dari root: Chromium → Next development → FastAPI → PostgreSQL rollback; delapan peran, hak organisasi/assignment/struktur, dashboard 320/390/1440, upload/unduh PDF dan mutasi nyata lulus. Media sementara dibersihkan dan jumlah baris seluruh tabel ERP kembali kosong. Sesi interaktif juga diuji mulai sampai SIGTERM/rollback melalui harness lokal tanpa mencetak password. Suite `scripts/integration_tests.py` kini 107 test lulus (44 integrasi PostgreSQL), termasuk empat guard launcher. Ini bukti kesiapan perangkat UAT, bukan penerimaan manusia atau deployment. |

## Functional requirements

| ID | Kebutuhan | Fase | Status dan bukti |
|---|---|---|---|
| FR-001 | Login username/password | P0 | Implementasi + bukti otomatis: E01; login/logout browser E11 |
| FR-002 | Admin akun personal | P0 | Implementasi + bukti otomatis: E02/E14; seluruh 12 jabatan diuji baca dan ubah akun; identitas anggota existing dapat dipakai saat membuat akun dan akun kedua ditolak |
| FR-003 | Struktur organisasi | P0 | Implementasi + bukti otomatis: E02; sembilan unit per periode dan 12 posisi, bukan editor struktur unit bebas |
| FR-004 | Assignment ganda | P0 | Implementasi + bukti otomatis: E03; posisi jamak dan grant bersumber terpisah |
| FR-005 | Otorisasi server-side | P0 | Implementasi + bukti otomatis: E03/E06/E08; 401/403/409 dan rollback |
| FR-006 | Dashboard personal | P0 | Implementasi + bukti otomatis: E04; filter assignment dashboard, pencarian Proker lain |
| FR-007 | Buat Proker langsung aktif | P0 | Implementasi + bukti otomatis: E03; create langsung ACTIVE, non-Inti ditolak |
| FR-008 | Baca lintas departemen | P0 | Implementasi + bukti otomatis: E03/E09; detail/RAB/aktivitas lintas pengurus |
| FR-009 | Edit berdasarkan penugasan | P0 | Implementasi + bukti otomatis: E03/E06; assignment mengendalikan mutasi |
| FR-010 | Kelola assignment oleh anggota departemen | P0 | Implementasi + bukti otomatis: E03; inheritance, grant manual, revoke akun nonaktif |
| FR-011 | Ketua Pelaksana fleksibel | P0 | Implementasi + bukti otomatis: E03; Ketupel beda akun atau nama tanpa akun |
| FR-012 | Panitia tanpa akun | P0 | Implementasi + bukti otomatis: E05; anggota panitia nonakun |
| FR-041 | Template panitia default | P0 | Implementasi + bukti otomatis: E05; template tiap Proker, dua Ketupel |
| FR-042 | Custom struktur oleh Ketua Pelaksana | P0 | Implementasi + bukti otomatis: E05; pecah PDD, rename/reorder/reset, reference guard |
| FR-043 | Struktur panitia terpisah dari akses | P0 | Implementasi + bukti otomatis: E05; panitia berakun maupun nonakun tidak otomatis mendapat grant |
| FR-044 | Audit dan arsip panitia | P0 | Implementasi + bukti otomatis: E05/E08/E09; audit dan matrix freeze |
| FR-046 | Assignment awal otomatis | P0 | Implementasi + bukti otomatis: E03; creator/Ketupel atomik dan provenance |
| FR-048 | Pergantian Ketupel | P0 | Implementasi + bukti otomatis: E03; pergantian Ketupel menjaga record dan memindah grant |
| FR-013 | Tutup manual & warning | P0 | Implementasi + bukti otomatis: E07; Ketupel menutup dengan tiga task TODO |
| FR-014 | Arsip immutable secara operasional | P0 | Implementasi + bukti otomatis: E07/E08; matrix mutasi ditolak dan status task tetap |
| FR-015 | RAB pencatatan | P0 | Implementasi + bukti otomatis: E06; total Decimal server serta UI E11 |
| FR-016 | 4 scope Kanban | P0 | Implementasi + bukti otomatis: E06; empat scope dan task_id asli pada agregat |
| FR-017 | Hak edit Kanban Umum | P0 | Implementasi + bukti otomatis: E06; task Umum lintas unit |
| FR-018 | Hak edit Kanban Departemen/Bidang | P0 | Implementasi + bukti otomatis: E06; hak unit/anak dan optimistic conflict |
| FR-019 | Hak edit Kanban Proker | P0 | Implementasi + bukti otomatis: E06; agregat tidak memperluas izin Proker |
| FR-020 | Kalender satu sumber data | P0 | Implementasi + bukti otomatis: E04; tanggal turunan dan batas hari WIB |
| FR-021 | Monitoring & drill-down | P0 | Implementasi + bukti otomatis: E04; hitungan owner asli dan rollup tanpa duplikasi |
| FR-022 | Audit perubahan | P0 | Implementasi + bukti otomatis: E09; audit transaksi, kegagalan audit me-rollback task/grant |
| FR-045 | Keanggotaan departemen turunan | P0 | Implementasi + bukti otomatis: E03/E06; inheritance bidang satu arah |
| FR-047 | PIC memberi akses Proker | P0 | Implementasi + bukti otomatis: E06/E09; PIC, multi-source revoke dan rollback audit |
| FR-049 | Arsip periode oleh Ketua Umum | P0 | Implementasi + bukti otomatis: E08/E10/E11; handover, hanya Ketua Umum, histori tetap |
| FR-050 | Kalender berdasarkan scope | P0 | Implementasi + bukti otomatis: E04/E08; mutasi scope dan filter CLOSED/arsip |
| FR-023 | Batas file | P1 | Implementasi + E15/E19: upload raw streaming 20 MiB lulus HTTP nyata melalui Next, 20 MiB + 1 ditolak 413 |
| FR-024 | File aman | P1 | Implementasi + E15: allowlist ekstensi/MIME/signature, storage private dan pemeriksaan akses unduh; volume persisten pada Compose source |
| FR-025 | Realisasi | P1 | Implementasi + E15: realisasi terpisah, bukti satu Proker, total dan selisih backend tanpa approval; LPJ sederhana tersedia |
| FR-026 | Aset fisik termasuk buku | P1 | Implementasi + E16: kode unik per eksemplar, lokasi, kondisi dan status terpisah; buku diuji API/browser |
| FR-027 | Peminjam manual | P1 | Implementasi + E16/E19: nama/kontak peminjam manual tanpa akun; riwayat hanya Asset dan Property |
| FR-028 | Pinjam, sewa, kembali | P1 | Implementasi + E16: pinjam/sewa/kembali memakai lock aset, guard transaksi aktif tunggal, biaya sewa dan kondisi awal/akhir |
| FR-029 | Histori terlacak | P1 | Implementasi + E16: transaksi tetap ada setelah kembali/arsip, petugas dari snapshot audit; tidak ada hard-delete aset/transaksi |
| FR-030 | Aset digital | P1 | Implementasi + E16: metadata aset digital, rujukan vault hanya pengelola; input kredensial eksplisit ditolak, tidak ada kolom password |
| FR-031 | Acara publik | P1 | Implementasi + E17/E19: pengurus biasa dapat membuat/publish; publik hanya PUBLISHED, tidak memuat data internal Proker |
| FR-032 | Ownership konten | P1 | Implementasi + E17: edit pemilik/Inti/pengelola Proker sesuai scope; petugas respons bukan akses edit otomatis |
| FR-033 | Form template awal | P1 | Implementasi + E17: template empat field tersedia; seluruh field dapat dihapus |
| FR-034 | Fully editable | P1 | Implementasi + E17/E19: label/tipe/opsi/required/placeholder/hint, pertanyaan/bagian serta tombol urutan dan preview peserta |
| FR-035 | Pilihan fakultas & placeholder | P1 | Implementasi + E17: FIF/FKS/FIK/FIT/FRI/FEB/FTE dan placeholder S1 Informatika diverifikasi |
| FR-036 | Public registration | P1 | Implementasi + E17/E19: anonim, validasi versi aktif, required/choice, honeypot dan rate limit 20 kiriman per 15 menit per IP |
| FR-037 | Data respons | P1 | Implementasi + E17: pagination/filter respons, CSV/XLSX per versi dengan audit; Inti tanpa penunjukan tidak membaca PII |
| FR-038 | Versioning form | P1 | Implementasi + E17: versi terbit immutable lewat trigger PostgreSQL, draft terpisah, stale submit 409 dan pemulihan isian; retry idempotent |
| FR-039 | Short Link | P1 | Implementasi + E18: slug unik, owner/Inti, update/nonaktif/soft-delete dengan audit; redirect dan resolver legacy tersedia |
| FR-040 | Redirect aman | P1 | Implementasi + E18: skema/port/userinfo/IP/DNS divalidasi, alamat internal ditolak dan DNS diperiksa ulang saat resolve; link nonaktif 404 |

## UAT

Perangkat sesi lokal dan checklist langkah/hasil yang diharapkan untuk seluruh 37 skenario tersedia di [UAT.md](UAT.md). Launcher rollback menyediakan delapan peran tanpa bootstrap akun operasional. Status manusia di bawah tetap menunggu pelaksanaan pengurus; test launcher tidak memberikan penerimaan manusia.

| ID | Skenario | Fase | Status |
|---|---|---|---|
| UAT-01 | Pengurus biasa login, tidak ditugaskan ke Proker A | P0 | Otomatis E03/E11; UAT manusia belum |
| UAT-02 | Kepala Departemen atau anggota Inti membuat Proker | P0 | Otomatis E03/E11; UAT manusia belum |
| UAT-03 | Pengurus tanpa wewenang mencoba membuat Proker via API | P0 | Otomatis E03: create non-Inti 403, tidak ada record |
| UAT-04 | Anggota departemen pemilik menambahkan user lintas departemen sebagai pengelola | P0 | Otomatis E03: Hunting grant ke Eksternal |
| UAT-05 | Anggota departemen lain mencoba mengubah assignment Proker secara manual tanpa keanggotaan pemilik | P0 | Otomatis E03: pengelola luar departemen tidak boleh grant |
| UAT-06 | Pengurus tanpa assignment mencoba edit detail/RAB Proker yang boleh ia lihat | P0 | Otomatis E03/E06: mutasi ditolak tanpa assignment |
| UAT-07 | Anggota semua unit mengedit task asli Kanban Umum | P0 | Otomatis E06: pengurus beda unit edit Umum |
| UAT-08 | Anggota Internal melihat dan mencoba mengedit task asli Departemen Eksternal | P0 | Otomatis E06 + policy; isolasi unit/anak |
| UAT-09 | Task Proker terlihat pada agregat departemen | P0 | Otomatis E06: task_id tunggal, izin Proker asli |
| UAT-10 | Ketua Pelaksana menutup Proker dengan 3 tugas belum DONE | P0 | Otomatis E07: tiga tugas TODO, konfirmasi lalu close |
| UAT-11 | Siapapun mencoba mengubah tugas/RAB dalam Proker CLOSED | P0 | Otomatis E08: matrix endpoint CLOSED |
| UAT-12 | Pengurus membuka Monitoring Departemen | P0 | Otomatis E04/E11: monitoring dan agregasi; drill-down UI tersedia |
| UAT-13 | Pengurus Asset menambah buku atau kamera | P1 | Otomatis E16/E19: buku dibuat oleh pengurus Asset; UAT manusia belum |
| UAT-14 | Pihak eksternal meminjam kamera, nama dimasukkan manual | P1 | Otomatis E16/E19: peminjam eksternal manual; UAT manusia belum |
| UAT-15 | Kamera dikembalikan rusak | P1 | Otomatis E16/E19: kembali rusak menjadi PERBAIKAN dan histori tetap ada; UAT manusia belum |
| UAT-16 | Pengurus membuat form dan menghapus semua empat field template | P1 | Otomatis E17/E19: seluruh empat field template dihapus; UAT manusia belum |
| UAT-17 | Pengurus menambah dropdown dan section baru | P1 | Otomatis E17/E19: tipe pilihan, opsi dan section fleksibel; editor naik/turun tersedia; UAT manusia belum |
| UAT-18 | Peserta tanpa login mendaftar; lalu pertanyaan form diubah | P1 | Otomatis E17/E19: submit anonim, versi baru tidak merusak respons lama, stale form dipulihkan; UAT manusia belum |
| UAT-19 | Pengurus tak berwenang membuka respons peserta acara orang lain | P1 | Otomatis E17: Inti/pengurus lain tanpa penunjukan ditolak 403; UAT manusia belum |
| UAT-20 | Pengurus membuat short link; pengurus lain menghapusnya | P1 | Otomatis E18: nonowner ditolak, Inti dapat mengubah/nonaktifkan, soft-delete tersedia; UAT manusia belum |
| UAT-21 | Unggah 21 MB pada endpoint lampiran | P1 | Otomatis E15/E19: upload 20 MiB + 1 melalui Next ditolak 413; UAT manusia belum |
| UAT-22 | Restore backup di lingkungan uji | P0 | Parsial E10: restore 38 tabel/1125 baris; ERP masih kosong saat dump |
| UAT-23 | Inti membuat Proker A dan B dengan Ketua Pelaksana berbeda; Ketupel membuka template pada Proker masing-masing | P0 | Otomatis E05: dua Proker/dua Ketupel, template masing-masing |
| UAT-24 | Ketupel mengubah struktur dan memecah PDD | P0 | Otomatis E05: pecah PDD, urutan dan reset |
| UAT-25 | Operator non-Ketupel mengubah desain struktur panitia tanpa mandat | P0 | Otomatis E05: non-Ketupel ditolak |
| UAT-26 | Panitia dicatat tanpa akun lalu Proker ditutup | P0 | Otomatis E05/E08: panitia nonakun dipertahankan setelah close |
| UAT-27 | Uji pemegang masing-masing dari 12 jabatan Inti mengelola akun/akses | P0 | Otomatis E02: 12 posisi membaca/mengubah akun; non-Inti ditolak |
| UAT-28 | Anggota Hunting mengelola task Departemen Internal dan assignment Proker Internal | P0 | Otomatis E03/E06: Hunting memakai hak Internal |
| UAT-29 | Pencipta dan Ketupel berakun berbeda membuat/memimpin Proker | P0 | Otomatis E03: grant creator/Ketupel berbeda akun |
| UAT-30 | Inti mengganti Ketupel Proker A | P0 | Otomatis E03: grant lama berhenti, Ketupel baru berhak struktur |
| UAT-31 | Pengelola menunjuk user Eksternal sebagai PIC task Proker Internal | P0 | Otomatis E06/E11: PIC lintas departemen memberi grant Proker |
| UAT-32 | Pengurus mengedit agenda unit/Proker di luar haknya | P0 | Otomatis E04: agenda unit/Proker mengikuti izin |
| UAT-33 | Proker ditutup dengan task belum DONE | P0 | Otomatis E07: status TODO tetap, kalender aktif kosong |
| UAT-34 | Ketua Umum menekan Arsipkan Periode, lalu pengurus berikutnya membaca Jejak | P0 | Otomatis E08/E11: handover dan baca Jejak penerus |
| UAT-35 | Wakil Ketua/Inti lain mencoba arsip periode melalui API | P0 | Otomatis E08 + policy: arsip hanya CHAIR; API nonketua ditolak |
| UAT-36 | Mutasi task unit/Proker bersamaan atau setelah arsip periode | P0 | Parsial E08/E10: endpoint setelah arsip ditolak; race nyata pada guard periode, bukan race semua endpoint HTTP |
| UAT-37 | Periksa Compose dan koneksi database target | P0 | Parsial E12: PostgreSQL/launcher lokal siap; Compose runtime belum diuji |

## Nonfunctional requirements

| ID | Aspek | Status dan batas verifikasi |
|---|---|---|
| NFR-01 | Auth | Implementasi + E01; Argon2id, opaque session, CSRF, TTL dan invalidasi. HTTPS dan konfigurasi trusted proxy/IP limit di deployment belum diuji. |
| NFR-02 | ABAC | E02/E03/E06/E08: policy terpusat, default deny, 401/403 terpisah, scope asli dipertahankan. |
| NFR-03 | Audit | E09: transaksi sama dan rollback saat audit gagal; payload tidak menyertakan password/token. |
| NFR-04 | Data | Baseline dan revisi tambahan 0002_p1 diterapkan dengan izin pada PostgreSQL existing, 30 tabel ERP, FK/CHECK/NUMERIC, version/lock dan trigger form immutable. E08/E10. Stream legacy dipertahankan terpisah dari ERP baru, bukan migrator ERP kedua. |
| NFR-05 | Resource | Parsial E13: satu worker, pool 3+2, pagination daftar utama serta direktori aktif/arsip, kalender dibatasi 1000, log rotation source Compose. Sampel production browser terbaru: Next RSS 225300 KiB/PSS 165767 KiB; Python fixture API RSS 111036 KiB/PSS 97325 KiB. Bukan peak/VPS; disk monitoring dan retensi sesi/attempt belum dijadwalkan. |
| NFR-06 | File | E15/E19: streaming disk, 20 MiB backend, allowlist/signature, unduh terotorisasi; source Next 21mb, Nginx 20m dan volume private. Runtime Nginx/Compose belum diuji. |
| NFR-07 | Privasi | E16/E17: PII peminjam dibatasi Asset, respons hanya owner/petugas; audit tanpa jawaban/kontak/vault. Pengguna menyetujui tanpa penghapusan otomatis; jadwal retensi operasional belum ditetapkan. |
| NFR-08 | Form publik | E17: schema versi aktif, rate limit persisted terpisah dari transaksi jawaban, honeypot, batas body 128 KiB, sanitasi render React; public submit tidak memakai sesi ERP. |
| NFR-09 | Redirect | E18: tujuan HTTP/HTTPS publik tanpa userinfo, port dibatasi 80/443, private IP/DNS ditolak dan revalidasi resolve; mutasi owner/Inti diaudit. |
| NFR-10 | Backup | Parsial E10/E20: backup/restore DB lokal terdahulu; helper backup media owner-only + manifest hash diuji roundtrip. Off-host, jadwal/retensi dan restore pasangan DB+media berisi data operasional belum terbukti. |
| NFR-11 | UX | E11: mobile/desktop, form, error, list/Kanban; UAT pengurus dan audit aksesibilitas menyeluruh belum dilaksanakan. |
| NFR-12 | Availability | Satu VPS tetap SPOF. Runbook menjelaskan pemeriksaan health/recovery; tidak ada klaim HA atau hosted uptime. |
| NFR-13 | API | E01/E12: OpenAPI, validasi/error aman, health/ready, test otorisasi; backend modular monolith tanpa HTTP antarservice internal. |
| NFR-14 | Performa | Parsial E13: tiga endpoint baca p95 <1 detik pada 2000 tugas serial lokal. Latensi tulis, beban konkuren dan target VPS belum diukur. |
| NFR-15 | Modularitas | Parsial: policy/service dipisah, canonical task repository ada, satu UoW. Sejumlah service/router masih mengakses model modul lain langsung; pemisahan repository publik tiap modul dan pemeriksaan arsitektur menyeluruh belum selesai. |
| NFR-16 | Jejak | E08/E10/E11: snapshot identitas arsip, freeze mutasi, tugas tidak dipalsukan DONE, penerus dapat membaca. Race seluruh endpoint HTTP belum diuji. |

## Gate rilis dan sisa pekerjaan

G0 keputusan paket/D01–D07 disetujui. API/UI P0 tersedia dengan bukti otomatis di atas. G1–G4 mempunyai bukti teknis lokal; penerimaan akhir G5 belum dilalui. Jangan menyebut seluruh PRD atau seluruh 37 UAT lulus.

- Selesaikan batas repository NFR-15 dan retensi operasional sesi/login attempts.
- Verifikasi Compose/image/proxy/TLS pada target, konfigurasi trusted proxy yang nyata, serta pengukuran concurrent load dan RAM/disk VPS.
- Tetapkan dan uji backup off-host berkala; uji restore histori ERP berisi data sebelum penggunaan riil.
- Jalankan UAT lokal rollback bersama pengurus melalui [UAT.md](UAT.md), catat penerimaan; bootstrap akun operasional lewat prompt aman saat siap penggunaan riil. Tidak ada kredensial default.
- P1 sudah diterapkan dan diuji otomatis (E15–E21); penerimaan manusia masih terbuka. P2 tetap backlog resmi.

Panduan: [RUNBOOK.md](RUNBOOK.md). Batas 20 loop berlaku kumulatif; lihat [LOOPS.md](LOOPS.md).

### E23 — UX ERP dan status Review, 18 November 2026

- Target lokal loopback diperiksa read-only (30 tabel ERP, 21 tabel lain, data operasional kosong). Backup mode 0600 sebelum migrasi; `alembic upgrade head` ke `0003_task_review` setelah konfirmasi pengguna. Data status lama tidak diubah.
- `.venv/bin/python scripts/integration_tests.py`: 108 test lulus, termasuk 45 integrasi PostgreSQL. Kasus Review memeriksa versi, 409, 403, count lintas status dan grant PIC tidak berubah. Tambahan pagination 3 record/limit 1 diuji ulang terarah dan lulus.
- `.venv/bin/python scripts/browser_test.py --production`: alur inti dengan Next production, FastAPI, PostgreSQL rollback lulus, 320/390/1440. `--production --p1`: inventaris, dokumen, realisasi, LPJ, form builder, pratinjau, publikasi, respons/ekspor, short link dan freeze lulus setelah koreksi pratinjau yang ter-reset saat refresh.
- `node frontend/tests/erp-ux-browser.cjs` dengan ERP_UX_ORIGIN pada server Next production: API fixture dicegat di browser, tanpa penulisan DB. Struktur kosong, tambah inline, drag mouse/keyboard/sentuh emulasi, rollback 409, kalender dan tambah agenda, modul kosong dan lebar 320/390/768/1440 lulus. Screenshot `/tmp/webuft-ux-dashboard-{width}.png` dibandingkan secara visual pada 320/1440.
- Build produksi (melalui runner browser dan `ERP_NEXT_DIST_DIR=.next-ui-check ERP_TS_CONFIG_PATH=tsconfig.erp-ui.json npm run build`), ESLint `app/admin app/lib/erp`, serta TypeScript dengan config ERP lulus. Config terpisah menghindari validator `.next/dev` lama yang rusak; perintah TypeScript default belum dapat dipakai dengan artefak lama tersebut.
- Bukti browser adalah Chromium lokal/emulasi, bukan perangkat fisik, deploy/VPS, atau penerimaan UAT manusia. Checklist tambahan dicatat di UAT.md; halaman publik tidak didesain ulang.
- Endpoint status juga dimasukkan ke pemeriksaan mutasi setelah close dan arsip periode; dua test terarah lulus. Setelah seluruh runner selesai, preflight kembali memastikan 30 + 21 tabel dan seluruh data operasional kosong. Builder mempertahankan base version edit; penyegaran versi eksternal memerlukan pemulihan draft eksplisit.
- Regresi inti production dijalankan ulang setelah koreksi sinkronisasi template kepanitiaan dan lulus. ESLint ERP, TypeScript config ERP dan preflight akhir juga lulus; tidak ada data fixture tertinggal.
