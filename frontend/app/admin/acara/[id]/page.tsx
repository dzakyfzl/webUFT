"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function KelolaAcara({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const acaraId = resolvedParams.id;

  // --- STATES DATA ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [karyaList, setKaryaList] = useState<any[]>([]);
  const [votersList, setVotersList] = useState<any[]>([]);

  // --- STATES MODAL ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKarya, setEditingKarya] = useState<any>(null);

  // --- STATES FORM TAMBAH KARYA ---
  const [fotoKaryaBaru, setFotoKaryaBaru] = useState<File | null>(null);
  const [judulBaru, setJudulBaru] = useState('');
  const [pemilikBaru, setPemilikBaru] = useState('');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- KALKULASI VOTING ---
  const maxVotes = karyaList.length > 0 ? Math.max(...karyaList.map(k => k.jumlah_pilihan || 0)) : 0;
  const totalVotes = karyaList.reduce((acc, k) => acc + (k.jumlah_pilihan || 0), 0);

  // =========================================================================
  // 1. FETCH DATA AWAL (Lebih Bersih Karena Endpoint Backend Sudah Lengkap)
  // =========================================================================
  useEffect(() => {
    const fetchEventData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        // Ambil Info Acara
        const resAcara = await fetch(`/api/acara/admin-ambil/${acaraId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resAcara.ok) throw new Error('Gagal mengambil data acara');
        setCurrentEvent(await resAcara.json());

        // Ambil Daftar Karya & Jumlah Pilihan (Kini sudah membawa karyaID)
        const resKarya = await fetch(`/api/form/urutkan-karya/${acaraId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resKarya.ok) {
          // Langsung simpan karena data dari backend sudah lengkap dan terurut
          setKaryaList(await resKarya.json());
        }

        // Ambil Daftar Absensi/Responden
        const resVoters = await fetch(`/api/form/list/${acaraId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resVoters.ok) {
          setVotersList(await resVoters.json());
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [acaraId, router]);


  // =========================================================================
  // 2. FUNGSI DOWNLOAD CSV
  // =========================================================================
  const handleDownloadCSV = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/form/download-csv/${acaraId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Gagal mengunduh CSV dari server');

      let filename = `Data_Absensi_Acara_${acaraId}.csv`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches && matches[1]) filename = matches[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      alert(`Error saat mengunduh: ${err.message}`);
    }
  };


  // =========================================================================
  // 3. FUNGSI CRUD MENGGUNAKAN karyaID SEBAGAI KEY UTAMA
  // =========================================================================
  const handleTambahKarya = async () => {
    if (!fotoKaryaBaru || !judulBaru || !pemilikBaru) {
      alert('Harap isi minimal Foto, Judul, dan Pemilik Karya.');
      return;
    }
    
    setIsSubmitting(true);
    const token = localStorage.getItem('access_token');

    try {
      // Tahap 1: Upload File Gambar
      const formData = new FormData();
      formData.append('file', fotoKaryaBaru);
      const uploadRes = await fetch('/api/file/tambah', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Tanpa Content-Type manual
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Gagal mengunggah foto karya');
      const uploadData = await uploadRes.json();
      const fileId = uploadData.file_id;

      // Tahap 2: Simpan Data Karya
      const karyaRes = await fetch('/api/karya/tambah', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: judulBaru,
          deskripsi: deskripsiBaru,
          pemilik: pemilikBaru,
          acaraID: parseInt(acaraId),
          fileID: fileId
        })
      });

      if (!karyaRes.ok) throw new Error('Gagal menyimpan data karya');
      
      // Berhasil! Reload halaman agar mendapatkan urutan suara terbaru
      window.location.reload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (karya: any) => {
    setEditingKarya({ ...karya });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');

    try {
      // Menggunakan karyaID untuk operasi edit
      const res = await fetch(`/api/karya/edit/${editingKarya.karyaID}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: editingKarya.nama,
          deskripsi: editingKarya.deskripsi,
          pemilik: editingKarya.pemilik,
          acaraID: parseInt(acaraId),
          fileID: editingKarya.fileID // Tetap sertakan fileID agar relasi file tidak hilang
        })
      });

      if (!res.ok) throw new Error('Gagal memperbarui karya');

      // Update State Lokal tanpa reload halaman (Mencocokkan karyaID)
      setKaryaList(karyaList.map(k => k.karyaID === editingKarya.karyaID ? editingKarya : k));
      setShowEditModal(false);
      setEditingKarya(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteKarya = async (karyaId: number, namaKarya: string) => {
    if (window.confirm(`Hapus karya "${namaKarya}" secara permanen?`)) {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/karya/hapus/${karyaId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Gagal menghapus karya');
        
        // Filter state UI berdasarkan karyaID yang valid
        setKaryaList(karyaList.filter(k => k.karyaID !== karyaId));
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleDeleteAcara = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/acara/hapus/${acaraId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal menghapus acara');
      
      alert(`Acara Berhasil Dihapus`);
      router.push('/admin');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // =========================================================================
  // 4. RENDER UI
  // =========================================================================
  if (isLoading) return <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center text-red-500 font-bold animate-pulse">Memuat Data Pusat...</div>;
  if (error || !currentEvent) return <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center text-red-500">Error: {error || 'Data tidak ditemukan'}</div>;

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER ACARA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex-grow max-w-3xl">
            <Link href="/admin" className="text-xs uppercase tracking-widest text-slate-500 hover:text-red-500 mb-4 block font-bold transition-colors">
              ← Kembali ke Dashboard
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                ID Acara: {currentEvent.acaraID}
              </span>
              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                {currentEvent.status}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight line-clamp-2">
              {currentEvent.nama}
            </h1>
            <p className="text-slate-400 mt-2 text-sm">{currentEvent.waktu}</p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <Link href={`/admin/acara/${acaraId}/edit`}>
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                Edit Info Acara
              </button>
            </Link>
            <button onClick={() => setShowDeleteModal(true)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-3 rounded-xl text-sm font-bold transition-all border border-red-600/20">
              Hapus Acara
            </button>
          </div>
        </header>

        {/* GRID UTAMA (Form & Daftar Karya) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
          
          {/* KOLOM KIRI: FORM TAMBAH KARYA */}
          <div className="lg:col-span-1">
            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl sticky top-24 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Tambah Karya Baru</h2>
              <div className="space-y-4">
                
                {/* Input File Foto */}
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center bg-[#0f0f11]/50 h-32 group hover:border-red-600/50 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setFotoKaryaBaru(e.target.files ? e.target.files[0] : null)} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 group-hover:text-red-500">
                      {fotoKaryaBaru ? fotoKaryaBaru.name : 'Pilih Foto Karya'}
                    </p>
                  </div>
                </div>

                {/* Input Teks */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Judul Karya</label>
                  <input type="text" value={judulBaru} onChange={(e) => setJudulBaru(e.target.value)} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pemilik Karya</label>
                  <input type="text" value={pemilikBaru} onChange={(e) => setPemilikBaru(e.target.value)} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Deskripsi / Makna</label>
                  <textarea rows={3} value={deskripsiBaru} onChange={(e) => setDeskripsiBaru(e.target.value)} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all resize-none"></textarea>
                </div>

                {/* Tombol Simpan */}
                <button 
                  onClick={handleTambahKarya} 
                  disabled={isSubmitting || !fotoKaryaBaru || !judulBaru || !pemilikBaru}
                  type="button" 
                  className={`w-full font-bold py-3.5 rounded-xl transition-all mt-2 border ${
                    !isSubmitting && fotoKaryaBaru && judulBaru && pemilikBaru 
                      ? 'bg-red-600 text-white border-transparent hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                      : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Mengunggah...' : 'Simpan ke Galeri'}
                </button>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: DAFTAR KARYA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white">Daftar Karya & Perolehan Suara</h2>
                <div className="text-xs bg-white/5 px-3 py-1 rounded-full text-slate-400">Total Suara: <span className="text-white font-bold">{totalVotes}</span></div>
              </div>
              <div className="space-y-4">
                {/* Menggunakan karyaID sebagai key utama karena ini primary key */}
                {karyaList.map((karya) => (
                  <div key={karya.karyaID} className="flex items-center gap-4 p-4 bg-[#0f0f11] rounded-2xl border border-white/5 hover:border-red-600/30 transition-all group relative overflow-hidden">
                    
                    {karya.jumlah_pilihan === maxVotes && maxVotes > 0 && (
                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-1 uppercase rounded-bl-lg z-10 shadow-md">Terfavorit 🔥</div>
                    )}
                    
                    <div className="w-20 h-20 relative rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-black">
                      {/* fileID tetap digunakan hanya untuk memanggil path gambar */}
                      <img src={`/api/file/ambil/${karya.fileID}`} alt={karya.nama} className="object-cover w-full h-full" />
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-white text-base truncate pr-2">{karya.nama}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 truncate">Oleh: {karya.pemilik}</p>
                      
                      <div className="w-full max-w-[150px] h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${karya.jumlah_pilihan === maxVotes && maxVotes > 0 ? 'bg-red-600' : 'bg-slate-600'}`} 
                          style={{ width: maxVotes > 0 ? `${(karya.jumlah_pilihan/maxVotes)*100}%` : '0%' }}>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right px-4 flex-shrink-0">
                      <div className={`text-2xl font-black ${karya.jumlah_pilihan === maxVotes && maxVotes > 0 ? 'text-red-500' : 'text-white'}`}>
                        {karya.jumlah_pilihan || 0}
                      </div>
                      <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Suara</div>
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(karya)} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg text-sm" title="Edit Karya">✏️</button>
                      {/* Menghapus data secara aman menggunakan Primary Key karyaID */}
                      <button onClick={() => handleDeleteKarya(karya.karyaID, karya.nama)} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 rounded-lg text-sm" title="Hapus Karya">🗑️</button>
                    </div>
                  </div>
                ))}
                
                {karyaList.length === 0 && (
                  <div className="text-center py-10 text-slate-500">Belum ada karya untuk acara ini.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABEL ABSENSI & VOTERS */}
        <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/5 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Data Kehadiran & Pemilih</h2>
              <p className="text-xs text-slate-500 mt-1">Daftar pengunjung yang telah memberikan vote pada pameran ini.</p>
            </div>
            <button onClick={handleDownloadCSV} className="bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white border border-green-600/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
              <span>📥</span> Unduh Data (CSV)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Nama Lengkap</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">NIM</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Program Studi</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">No. Telepon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {votersList.map((voter) => (
                  <tr key={voter.respID || voter.nim} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium whitespace-nowrap">{voter.nama}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.nim}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.prodi_instansi}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.nomor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {votersList.length === 0 && (
            <div className="text-center py-10 text-slate-500">Belum ada data pemilih.</div>
          )}
        </div>

      </div>

      {/* MODAL EDIT KARYA */}
      {showEditModal && editingKarya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-2">Edit Data Karya</h3>
            <p className="text-slate-500 text-sm mb-6">Perbarui informasi tanpa mengubah perolehan suara.</p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Judul Karya</label>
                <input type="text" value={editingKarya.nama} onChange={(e) => setEditingKarya({...editingKarya, nama: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pemilik Karya</label>
                <input type="text" value={editingKarya.pemilik} onChange={(e) => setEditingKarya({...editingKarya, pemilik: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Deskripsi / Makna</label>
                <textarea rows={3} value={editingKarya.deskripsi} onChange={(e) => setEditingKarya({...editingKarya, deskripsi: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none" required></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10">Batal</button>
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS ACARA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-red-500/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-6">Hapus Acara Permanen?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white/5 text-white font-bold py-4 rounded-xl border border-white/10">Batal</button>
              <button onClick={handleDeleteAcara} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30">Hapus!</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}