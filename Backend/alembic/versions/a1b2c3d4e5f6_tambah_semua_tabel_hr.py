"""Tambah semua tabel modul HR

Revision ID: a1b2c3d4e5f6
Revises: 6279c83e3a11
Create Date: 2026-09-06 14:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6279c83e3a11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: buat semua tabel HR modul."""

    # --- hr_medpart_masuk ---
    op.create_table(
        'hr_medpart_masuk',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('kontak', sa.String(length=255), nullable=True),
        sa.Column('jumlah_followers', sa.Integer(), nullable=True),
        sa.Column('link_bukti', sa.Text(), nullable=True),
        sa.Column('syarat', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_medpart_masuk_id'), 'hr_medpart_masuk', ['id'], unique=False)

    # --- hr_medpart_masuk_note ---
    op.create_table(
        'hr_medpart_masuk_note',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medpart_id', sa.Integer(), sa.ForeignKey('hr_medpart_masuk.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_medpart_masuk_note_id'), 'hr_medpart_masuk_note', ['id'], unique=False)

    # --- hr_medpart_sebar ---
    op.create_table(
        'hr_medpart_sebar',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('kontak', sa.String(length=255), nullable=True),
        sa.Column('jumlah_followers', sa.Integer(), nullable=True),
        sa.Column('link_akun', sa.Text(), nullable=True),
        sa.Column('syarat_berbayar', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('harga', sa.String(length=255), nullable=True),
        sa.Column('syarat_detail', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Aktif'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_medpart_sebar_id'), 'hr_medpart_sebar', ['id'], unique=False)

    # --- hr_medpart_sebar_note ---
    op.create_table(
        'hr_medpart_sebar_note',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medpart_sebar_id', sa.Integer(), sa.ForeignKey('hr_medpart_sebar.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_medpart_sebar_note_id'), 'hr_medpart_sebar_note', ['id'], unique=False)

    # --- hr_sponsor ---
    op.create_table(
        'hr_sponsor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama_perusahaan', sa.String(length=255), nullable=False),
        sa.Column('pic_internal_id', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=True),
        sa.Column('cp_nama', sa.String(length=255), nullable=True),
        sa.Column('cp_jabatan', sa.String(length=255), nullable=True),
        sa.Column('cp_wa', sa.String(length=50), nullable=True),
        sa.Column('cp_email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Prospek'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_sponsor_id'), 'hr_sponsor', ['id'], unique=False)

    # --- hr_sponsor_proposal ---
    op.create_table(
        'hr_sponsor_proposal',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sponsor_id', sa.Integer(), sa.ForeignKey('hr_sponsor.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tanggal_kirim', sa.DateTime(), nullable=False),
        sa.Column('versi', sa.String(length=100), nullable=True),
        sa.Column('link_file', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_sponsor_proposal_id'), 'hr_sponsor_proposal', ['id'], unique=False)

    # --- hr_sponsor_offer ---
    op.create_table(
        'hr_sponsor_offer',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sponsor_id', sa.Integer(), sa.ForeignKey('hr_sponsor.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nilai', sa.String(length=255), nullable=True),
        sa.Column('bentuk_kerjasama', sa.Text(), nullable=True),
        sa.Column('syarat', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_sponsor_offer_id'), 'hr_sponsor_offer', ['id'], unique=False)

    # --- hr_sponsor_note ---
    op.create_table(
        'hr_sponsor_note',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sponsor_id', sa.Integer(), sa.ForeignKey('hr_sponsor.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_sponsor_note_id'), 'hr_sponsor_note', ['id'], unique=False)

    # --- hr_offer_sponsorship_masuk ---
    op.create_table(
        'hr_offer_sponsorship_masuk',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama_sponsor', sa.String(length=255), nullable=False),
        sa.Column('nilai', sa.String(length=255), nullable=True),
        sa.Column('bentuk_kerjasama', sa.Text(), nullable=True),
        sa.Column('dokumen_link', sa.Text(), nullable=True),
        sa.Column('syarat', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('sponsor_id', sa.Integer(), sa.ForeignKey('hr_sponsor.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_offer_sponsorship_masuk_id'), 'hr_offer_sponsorship_masuk', ['id'], unique=False)

    # --- hr_offer_kerjasama_job ---
    op.create_table(
        'hr_offer_kerjasama_job',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama_pengaju', sa.String(length=255), nullable=False),
        sa.Column('kategori', sa.String(length=255), nullable=True),
        sa.Column('kontak_person', sa.String(length=255), nullable=True),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('bukti_link', sa.Text(), nullable=True),
        sa.Column('nilai', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_offer_kerjasama_job_id'), 'hr_offer_kerjasama_job', ['id'], unique=False)

    # --- hr_proker ---
    op.create_table(
        'hr_proker',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('tanggal_mulai', sa.DateTime(), nullable=True),
        sa.Column('tanggal_selesai', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Perencanaan'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_proker_id'), 'hr_proker', ['id'], unique=False)

    # --- hr_proker_medpart (pivot) ---
    op.create_table(
        'hr_proker_medpart',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('proker_id', sa.Integer(), sa.ForeignKey('hr_proker.id', ondelete='CASCADE'), nullable=False),
        sa.Column('medpart_masuk_id', sa.Integer(), sa.ForeignKey('hr_medpart_masuk.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- hr_proker_sponsor (pivot) ---
    op.create_table(
        'hr_proker_sponsor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('proker_id', sa.Integer(), sa.ForeignKey('hr_proker.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sponsor_id', sa.Integer(), sa.ForeignKey('hr_sponsor.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- hr_jadwal_poster ---
    op.create_table(
        'hr_jadwal_poster',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medpart_id', sa.Integer(), sa.ForeignKey('hr_medpart_masuk.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proker_id', sa.Integer(), sa.ForeignKey('hr_proker.id', ondelete='SET NULL'), nullable=True),
        sa.Column('tanggal_deadline', sa.DateTime(), nullable=False),
        sa.Column('catatan', sa.Text(), nullable=True),
        sa.Column('link_bukti', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Belum Jadwal'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_jadwal_poster_id'), 'hr_jadwal_poster', ['id'], unique=False)

    # --- hr_undangan ---
    op.create_table(
        'hr_undangan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('judul', sa.String(length=255), nullable=False),
        sa.Column('penyelenggara', sa.String(length=255), nullable=True),
        sa.Column('tanggal_acara', sa.DateTime(), nullable=True),
        sa.Column('deadline_konfirmasi', sa.DateTime(), nullable=True),
        sa.Column('link_undangan', sa.Text(), nullable=True),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_undangan_id'), 'hr_undangan', ['id'], unique=False)

    # --- hr_undangan_assignment ---
    op.create_table(
        'hr_undangan_assignment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('undangan_id', sa.Integer(), sa.ForeignKey('hr_undangan.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('akun.akunID', ondelete='CASCADE'), nullable=False),
        sa.Column('konfirmasi', sa.String(length=50), nullable=False, server_default='Menunggu'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- hr_reminder ---
    op.create_table(
        'hr_reminder',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jenis', sa.String(length=100), nullable=False),
        sa.Column('referensi_id', sa.Integer(), nullable=False),
        sa.Column('judul', sa.String(length=255), nullable=True),
        sa.Column('tanggal_deadline', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Aktif'),
        sa.Column('snoozed_until', sa.DateTime(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_reminder_id'), 'hr_reminder', ['id'], unique=False)

    # --- hr_aspirasi_settings ---
    op.create_table(
        'hr_aspirasi_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('link_form', sa.Text(), nullable=True),
        sa.Column('link_grup_wa', sa.Text(), nullable=True),
        sa.Column('template_pesan', sa.Text(), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- hr_aspirasi_riwayat ---
    op.create_table(
        'hr_aspirasi_riwayat',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bulan', sa.Integer(), nullable=False),
        sa.Column('tahun', sa.Integer(), nullable=False),
        sa.Column('dikirim_oleh', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=True),
        sa.Column('dikirim_pada', sa.DateTime(), nullable=True),
        sa.Column('link_rekap', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Belum Dikirim'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- hr_template_chat ---
    op.create_table(
        'hr_template_chat',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('konten', sa.Text(), nullable=False),
        sa.Column('kategori', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_template_chat_id'), 'hr_template_chat', ['id'], unique=False)

    # --- hr_audit_log ---
    op.create_table(
        'hr_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('modul', sa.String(length=100), nullable=False),
        sa.Column('record_id', sa.Integer(), nullable=False),
        sa.Column('aksi', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('user_nama', sa.String(length=255), nullable=False),
        sa.Column('field_key', sa.String(length=100), nullable=True),
        sa.Column('nilai_lama', sa.Text(), nullable=True),
        sa.Column('nilai_baru', sa.Text(), nullable=True),
        sa.Column('via_ai', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False, index=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_audit_log_id'), 'hr_audit_log', ['id'], unique=False)

    # --- hr_gemini_api_key ---
    op.create_table(
        'hr_gemini_api_key',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('key_encrypted', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hr_gemini_api_key_id'), 'hr_gemini_api_key', ['id'], unique=False)

    # --- hr_gemini_model_setting ---
    op.create_table(
        'hr_gemini_model_setting',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('akun.akunID'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema: hapus semua tabel HR modul."""
    op.drop_table('hr_gemini_model_setting')
    op.drop_table('hr_gemini_api_key')
    op.drop_index(op.f('ix_hr_audit_log_id'), table_name='hr_audit_log')
    op.drop_table('hr_audit_log')
    op.drop_index(op.f('ix_hr_template_chat_id'), table_name='hr_template_chat')
    op.drop_table('hr_template_chat')
    op.drop_table('hr_aspirasi_riwayat')
    op.drop_table('hr_aspirasi_settings')
    op.drop_index(op.f('ix_hr_reminder_id'), table_name='hr_reminder')
    op.drop_table('hr_reminder')
    op.drop_table('hr_undangan_assignment')
    op.drop_index(op.f('ix_hr_undangan_id'), table_name='hr_undangan')
    op.drop_table('hr_undangan')
    op.drop_index(op.f('ix_hr_jadwal_poster_id'), table_name='hr_jadwal_poster')
    op.drop_table('hr_jadwal_poster')
    op.drop_table('hr_proker_sponsor')
    op.drop_table('hr_proker_medpart')
    op.drop_index(op.f('ix_hr_proker_id'), table_name='hr_proker')
    op.drop_table('hr_proker')
    op.drop_index(op.f('ix_hr_offer_kerjasama_job_id'), table_name='hr_offer_kerjasama_job')
    op.drop_table('hr_offer_kerjasama_job')
    op.drop_index(op.f('ix_hr_offer_sponsorship_masuk_id'), table_name='hr_offer_sponsorship_masuk')
    op.drop_table('hr_offer_sponsorship_masuk')
    op.drop_index(op.f('ix_hr_sponsor_note_id'), table_name='hr_sponsor_note')
    op.drop_table('hr_sponsor_note')
    op.drop_index(op.f('ix_hr_sponsor_offer_id'), table_name='hr_sponsor_offer')
    op.drop_table('hr_sponsor_offer')
    op.drop_index(op.f('ix_hr_sponsor_proposal_id'), table_name='hr_sponsor_proposal')
    op.drop_table('hr_sponsor_proposal')
    op.drop_index(op.f('ix_hr_sponsor_id'), table_name='hr_sponsor')
    op.drop_table('hr_sponsor')
    op.drop_index(op.f('ix_hr_medpart_sebar_note_id'), table_name='hr_medpart_sebar_note')
    op.drop_table('hr_medpart_sebar_note')
    op.drop_index(op.f('ix_hr_medpart_sebar_id'), table_name='hr_medpart_sebar')
    op.drop_table('hr_medpart_sebar')
    op.drop_index(op.f('ix_hr_medpart_masuk_note_id'), table_name='hr_medpart_masuk_note')
    op.drop_table('hr_medpart_masuk_note')
    op.drop_index(op.f('ix_hr_medpart_masuk_id'), table_name='hr_medpart_masuk')
    op.drop_table('hr_medpart_masuk')
