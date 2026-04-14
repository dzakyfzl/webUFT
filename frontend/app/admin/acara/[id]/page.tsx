"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function KelolaAcara({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const acaraId = resolvedParams.id;

  // --- STATES ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // MOCK DATA: Detail Acara Saat Ini
  const [currentEvent] = useState({
    id: acaraId,
    // Simulasi: Jika ID 1, tampilkan judul asli. Jika ID lain, tampilkan nama generik
    title: acaraId === '1' ? "Gelar Karya Fotografi UKM 2026" : `Pameran Visual (ID: ${acaraId})`,
    status: "Aktif",
    date: "10-15 April 2026"
  });

  // State Form Tambah Karya
  const [fotoKaryaBaru, setFotoKaryaBaru] = useState<File | null>(null);
  const [judulBaru, setJudulBaru] = useState('');
  const [pemilikBaru, setPemilikBaru] = useState('');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');

  // Data Dummy Karya
  const [karyaList, setKaryaList] = useState([
    { id: 101, title: "Senja di Braga", author: "Budi Santoso", description: "Tangkapan momen langka...", votes: 124, image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=200" },
    { id: 102, title: "Tatapan Kosong", author: "Siti Aminah", description: "Potret mendalam...", votes: 89, image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=200" },
    { id: 103, title: "Megahnya Sudirman", author: "Alex Wijaya", description: "Geometri beton...", votes: 156, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=200" },
  ]);

  // Data Dummy Pemilih / Absensi
  const [votersList] = useState([
    { id: 1, nama: "Daffa Fariza", nim: "1301201234", prodi: "S1 Informatika", telepon: "081234567890", waktu: "15 Apr 2026, 10:30", vote_untuk: "Megahnya Sudirman" },
    { id: 2, nama: "Rina Melati", nim: "1202204321", prodi: "S1 Sistem Informasi", telepon: "089876543210", waktu: "15 Apr 2026, 11:15", vote_untuk: "Senja di Braga" },
    { id: 3, nama: "Bima Arya", nim: "1103209876", prodi: "S1 Teknik Telekomunikasi", telepon: "085612349876", waktu: "15 Apr 2026, 13:45", vote_untuk: "Tatapan Kosong" },
    { id: 4, nama: "Sarah Wijayanti", nim: "1404205555", prodi: "S1 Ilmu Komunikasi", telepon: "081122334455", waktu: "15 Apr 2026, 14:20", vote_untuk: "Megahnya Sudirman" },
  ]);

  const [editingKarya, setEditingKarya] = useState<any>(null);
  const maxVotes = karyaList.length > 0 ? Math.max(...karyaList.map(k => k.votes)) : 0;

  // --- ACTIONS ---
  const handleTambahKarya = () => {
    if (!fotoKaryaBaru || !judulBaru || !pemilikBaru) {
      alert('Harap isi minimal Foto, Judul, dan Pemilik Karya.');
      return;
    }
    const newKarya = {
      id: Date.now(),
      title: judulBaru,
      author: pemilikBaru,
      description: deskripsiBaru,
      votes: 0,
      image: URL.createObjectURL(fotoKaryaBaru) 
    };
    setKaryaList([newKarya, ...karyaList]);
    setFotoKaryaBaru(null);
    setJudulBaru('');
    setPemilikBaru('');
    setDeskripsiBaru('');
  };

  const handleOpenEdit = (karya: any) => {
    setEditingKarya({ ...karya });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setKaryaList(karyaList.map(k => k.id === editingKarya.id ? editingKarya : k));
    setShowEditModal(false);
    setEditingKarya(null);
  };

  const handleDeleteKarya = (karyaId: number, karyaTitle: string) => {
    if (window.confirm(`Hapus karya "${karyaTitle}"?`)) {
      setKaryaList(karyaList.filter(k => k.id !== karyaId));
    }
  };

  const handleDeleteAcara = () => {
    alert(`Acara "${currentEvent.title}" Berhasil Dihapus`);
    router.push('/admin');
  };

  const handleDownloadCSV = () => {
    const headers = ["ID", "Nama Lengkap", "NIM", "Program Studi", "No. Telepon", "Waktu Vote", "Vote Untuk"];
    const csvRows = votersList.map(v => `${v.id},"${v.nama}","${v.nim}","${v.prodi}","${v.telepon}","${v.waktu}","${v.vote_untuk}"`);
    const csvData = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Absensi_Voters_${currentEvent.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* =========================================
            HEADER SECTION (DIPERBARUI)
            ========================================= */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex-grow max-w-3xl">
            <Link href="/admin" className="text-xs uppercase tracking-widest text-slate-500 hover:text-red-500 mb-4 block font-bold transition-colors">
              ← Kembali ke Dashboard
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                ID Acara: {currentEvent.id}
              </span>
              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                {currentEvent.status}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight line-clamp-2">
              {currentEvent.title}
            </h1>
            <p className="text-slate-400 mt-2 text-sm">{currentEvent.date}</p>
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

        {/* BAGIAN ATAS: Manajemen Karya (Grid 1:2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
          
          {/* Form Tambah Karya */}
          <div className="lg:col-span-1">
            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl sticky top-24 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Tambah Karya Baru</h2>
              <div className="space-y-4">
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center bg-[#0f0f11]/50 h-32 group hover:border-red-600/50 transition-all cursor-pointer">
                  <input type="file" accept="image/*" onChange={(e) => setFotoKaryaBaru(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 group-hover:text-red-500">{fotoKaryaBaru ? fotoKaryaBaru.name : 'Pilih Foto Karya'}</p>
                  </div>
                </div>
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
                <button onClick={handleTambahKarya} type="button" className={`w-full font-bold py-3.5 rounded-xl transition-all mt-2 border ${fotoKaryaBaru && judulBaru && pemilikBaru ? 'bg-red-600 text-white border-transparent hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'}`}>
                  Simpan ke Galeri
                </button>
              </div>
            </div>
          </div>

          {/* Daftar Karya & Perolehan Suara */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white">Daftar Karya & Perolehan Suara</h2>
                <div className="text-xs bg-white/5 px-3 py-1 rounded-full text-slate-400">Total Suara: <span className="text-white font-bold">{karyaList.reduce((a, b) => a + b.votes, 0)}</span></div>
              </div>
              <div className="space-y-4">
                {karyaList.map((karya) => (
                  <div key={karya.id} className="flex items-center gap-4 p-4 bg-[#0f0f11] rounded-2xl border border-white/5 hover:border-red-600/30 transition-all group relative overflow-hidden">
                    {karya.votes === maxVotes && maxVotes > 0 && <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-1 uppercase rounded-bl-lg z-10 shadow-md">Terfavorit 🔥</div>}
                    <div className="w-20 h-20 relative rounded-xl overflow-hidden flex-shrink-0 border border-white/10"><Image src={karya.image} alt={karya.title} fill className="object-cover" /></div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-white text-base truncate pr-2">{karya.title}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 truncate">Oleh: {karya.author}</p>
                      <div className="w-full max-w-[150px] h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden"><div className={`h-full transition-all duration-1000 ${karya.votes === maxVotes && maxVotes > 0 ? 'bg-red-600' : 'bg-slate-600'}`} style={{ width: maxVotes > 0 ? `${(karya.votes/maxVotes)*100}%` : '0%' }}></div></div>
                    </div>
                    <div className="text-right px-4 flex-shrink-0">
                      <div className={`text-2xl font-black ${karya.votes === maxVotes && maxVotes > 0 ? 'text-red-500' : 'text-white'}`}>{karya.votes}</div>
                      <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Suara</div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(karya)} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg text-sm" title="Edit Karya">✏️</button>
                      <button onClick={() => handleDeleteKarya(karya.id, karya.title)} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 rounded-lg text-sm" title="Hapus Karya">🗑️</button>
                    </div>
                  </div>
                ))}
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
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Waktu</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Nama Lengkap</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">NIM</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Program Studi</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">No. Telepon</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Memilih Karya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {votersList.map((voter) => (
                  <tr key={voter.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.waktu}</td>
                    <td className="p-4 text-white font-medium whitespace-nowrap">{voter.nama}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.nim}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.prodi}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{voter.telepon}</td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-red-600/10 text-red-400 border border-red-600/20 rounded-full text-[10px] font-bold whitespace-nowrap">
                        {voter.vote_untuk}
                      </span>
                    </td>
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

      {/* Modal Edit Karya (Tetap) */}
      {showEditModal && editingKarya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-2">Edit Data Karya</h3>
            <p className="text-slate-500 text-sm mb-6">Perbarui informasi tanpa mengubah perolehan suara.</p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Judul Karya</label>
                <input type="text" value={editingKarya.title} onChange={(e) => setEditingKarya({...editingKarya, title: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pemilik Karya</label>
                <input type="text" value={editingKarya.author} onChange={(e) => setEditingKarya({...editingKarya, author: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Deskripsi / Makna</label>
                <textarea rows={3} value={editingKarya.description} onChange={(e) => setEditingKarya({...editingKarya, description: e.target.value})} className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none" required></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10">Batal</button>
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Acara (Tetap) */}
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