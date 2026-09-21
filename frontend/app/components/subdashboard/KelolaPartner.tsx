'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Partner {
  partnerID: number;
  fileID: number | null;
  label: string;
  judul: string;
  deskripsi: string | null;
  kategori: 'sponsor' | 'media_partner';
  urutan: number;
  is_active: boolean;
}

type ModalType = 'none' | 'add' | 'edit';
type FilterTab = 'semua' | 'aktif' | 'nonaktif';

const KATEGORI_LABEL: Record<string, string> = {
  sponsor: 'Sponsor',
  media_partner: 'Media Partner',
};

const KATEGORI_COLOR: Record<string, string> = {
  sponsor: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  media_partner: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
};

const emptyForm = {
  id: 0,
  label: '',
  judul: '',
  deskripsi: '',
  kategori: 'sponsor' as 'sponsor' | 'media_partner',
  urutan: 0,
  fileID: null as number | null,
};

async function getAuthToken(router: ReturnType<typeof useRouter>): Promise<string | null> {
  let accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  if (!accessToken || !refreshToken) {
    router.push('/admin/login');
    return null;
  }

  const me = await fetch('/api/akun/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (me.status === 401) {
    const ref = await fetch('/api/akun/access-token', {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (ref.ok) {
      const data = await ref.json();
      localStorage.setItem('access_token', data.access_token);
      accessToken = data.access_token;
    } else {
      router.push('/admin/login');
      return null;
    }
  }

  return accessToken;
}

export default function KelolaPartner() {
  const router = useRouter();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('semua');

  const [modalType, setModalType] = useState<ModalType>('none');
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ---------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------
  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await getAuthToken(router);
      if (!token) return;
      const res = await fetch('/api/partner/admin/ambil-semua', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengambil data partner');
      const data: Partner[] = await res.json();
      setPartners(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // ---------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------
  const displayed = partners.filter((p) => {
    if (filterTab === 'aktif') return p.is_active;
    if (filterTab === 'nonaktif') return !p.is_active;
    return true;
  });

  // Group by kategori for display
  const sponsors = displayed.filter((p) => p.kategori === 'sponsor');
  const mediaPartners = displayed.filter((p) => p.kategori === 'media_partner');

  // ---------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------
  const handleToggle = async (partner: Partner) => {
    setTogglingId(partner.partnerID);
    // Optimistic update
    setPartners((prev) =>
      prev.map((p) =>
        p.partnerID === partner.partnerID ? { ...p, is_active: !p.is_active } : p,
      ),
    );
    try {
      const token = await getAuthToken(router);
      if (!token) return;
      const res = await fetch(`/api/partner/toggle/${partner.partnerID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !partner.is_active }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status');
    } catch {
      // Revert on error
      setPartners((prev) =>
        prev.map((p) =>
          p.partnerID === partner.partnerID ? { ...p, is_active: partner.is_active } : p,
        ),
      );
      alert('Gagal mengubah status partner');
    } finally {
      setTogglingId(null);
    }
  };

  // ---------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus partner ini? File gambar juga akan dihapus.')) return;
    try {
      const token = await getAuthToken(router);
      if (!token) return;
      const res = await fetch(`/api/partner/hapus/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus partner');
      fetchPartners();
    } catch {
      alert('Error saat menghapus partner');
    }
  };

  // ---------------------------------------------------------------
  // Submit (Add / Edit)
  // ---------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = await getAuthToken(router);
      if (!token) return;

      let finalFileId = form.fileID;

      if (modalType === 'add' && selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        const uploadRes = await fetch('/api/file/tambah', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!uploadRes.ok) throw new Error('Gagal mengupload file gambar');
        const uploadData = await uploadRes.json();
        finalFileId = uploadData.file_id;
      }

      const payload = {
        label: form.label,
        judul: form.judul,
        deskripsi: form.deskripsi || null,
        kategori: form.kategori,
        urutan: form.urutan,
        fileID: finalFileId ?? null,
        is_active: true,
      };

      const url = modalType === 'edit' ? `/api/partner/edit/${form.id}` : '/api/partner/tambah';
      const method = modalType === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Gagal menyimpan data partner');
      setModalType('none');
      fetchPartners();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error saat menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  const openAdd = () => {
    setForm(emptyForm);
    setSelectedFile(null);
    setModalType('add');
  };

  const openEdit = (p: Partner) => {
    setForm({
      id: p.partnerID,
      label: p.label,
      judul: p.judul,
      deskripsi: p.deskripsi ?? '',
      kategori: p.kategori,
      urutan: p.urutan,
      fileID: p.fileID,
    });
    setSelectedFile(null);
    setModalType('edit');
  };

  // ---------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------
  const PartnerCard = ({ partner }: { partner: Partner }) => (
    <div
      className={`relative bg-[#0f0f11] border rounded-2xl p-4 flex gap-4 transition-all duration-200 ${
        partner.is_active
          ? 'border-white/10 hover:border-white/20'
          : 'border-white/5 opacity-60'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
        {partner.fileID ? (
          <img
            src={`/api/file/ambil/${partner.fileID}`}
            alt={partner.judul}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-2xl">🤝</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              KATEGORI_COLOR[partner.kategori]
            }`}
          >
            {KATEGORI_LABEL[partner.kategori]}
          </span>
          <span className="text-[10px] text-slate-500">#{partner.urutan}</span>
          {!partner.is_active && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20">
              Nonaktif
            </span>
          )}
        </div>
        <div className="font-semibold text-sm truncate text-white" title={partner.judul}>
          {partner.judul}
        </div>
        <div className="text-xs text-slate-400 truncate mt-0.5" title={partner.label}>
          {partner.label}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {/* Toggle switch */}
        <button
          id={`toggle-partner-${partner.partnerID}`}
          onClick={() => handleToggle(partner)}
          disabled={togglingId === partner.partnerID}
          title={partner.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 ${
            partner.is_active ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              partner.is_active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>

        <div className="flex gap-1">
          <button
            id={`edit-partner-${partner.partnerID}`}
            onClick={() => openEdit(partner)}
            className="text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-2 py-1 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            id={`delete-partner-${partner.partnerID}`}
            onClick={() => handleDelete(partner.partnerID)}
            className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 px-2 py-1 rounded-lg transition-colors"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );

  const GroupSection = ({
    title,
    items,
    accentClass,
  }: {
    title: string;
    items: Partner[];
    accentClass: string;
  }) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${accentClass}`}>
          {title} ({items.length})
        </h3>
        <div className="space-y-3">
          {items.map((p) => (
            <PartnerCard key={p.partnerID} partner={p} />
          ))}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------
  return (
    <div className="p-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Kelola Partner</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sponsor &amp; Media Partner untuk landing page carousel
          </p>
        </div>
        <button
          id="btn-tambah-partner"
          onClick={openAdd}
          className="bg-red-600 hover:bg-red-500 active:scale-95 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-900/20"
        >
          + Tambah Partner
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 bg-[#18181b] border border-white/5 p-1 rounded-xl w-fit">
        {(['semua', 'aktif', 'nonaktif'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            id={`filter-${tab}`}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filterTab === tab
                ? 'bg-red-600/20 text-red-400 border border-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-[#18181b] border border-white/5 rounded-2xl text-center">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-slate-400 font-medium">
            {filterTab === 'semua'
              ? 'Belum ada partner. Tambahkan partner pertama!'
              : `Tidak ada partner ${filterTab}.`}
          </p>
          {filterTab === 'semua' && (
            <button
              onClick={openAdd}
              className="mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              + Tambah Partner
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 space-y-8">
          <GroupSection
            title="Sponsor"
            items={sponsors}
            accentClass="text-amber-400"
          />
          <GroupSection
            title="Media Partner"
            items={mediaPartners}
            accentClass="text-sky-400"
          />
        </div>
      )}

      {/* Stats bar */}
      {partners.length > 0 && (
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
          <span>Total: {partners.length}</span>
          <span>Aktif: {partners.filter((p) => p.is_active).length}</span>
          <span>Nonaktif: {partners.filter((p) => !p.is_active).length}</span>
        </div>
      )}

      {/* ============================================================
          Modal
      ============================================================ */}
      {modalType !== 'none' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">
              {modalType === 'add' ? 'Tambah Partner Baru' : 'Edit Partner'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Label <span className="text-slate-600 text-xs">(sub-heading kecil)</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="mis. Ruang kolaborasi UFT"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Judul */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Judul</label>
                <input
                  required
                  type="text"
                  placeholder="mis. Media Partner 01"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Deskripsi <span className="text-slate-600 text-xs">(opsional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi singkat tentang partner ini…"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>

              {/* Kategori + Urutan (row) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) =>
                      setForm({ ...form, kategori: e.target.value as 'sponsor' | 'media_partner' })
                    }
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500/50"
                  >
                    <option value="sponsor">Sponsor</option>
                    <option value="media_partner">Media Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Urutan <span className="text-slate-600 text-xs">(dalam kategori)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.urutan}
                    onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  File Gambar / Logo{' '}
                  {modalType === 'edit' && (
                    <span className="text-slate-600 text-xs">
                      (biarkan kosong untuk tidak mengubah gambar)
                    </span>
                  )}
                </label>

                {/* Preview current image on edit */}
                {modalType === 'edit' && form.fileID && !selectedFile && (
                  <div className="mb-2 w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={`/api/file/ambil/${form.fileID}`}
                      alt="Current"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Preview new selection */}
                {selectedFile && (
                  <div className="mb-2 w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  required={modalType === 'add'}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalType('none')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan…'
                    : modalType === 'add'
                    ? 'Upload & Simpan'
                    : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
