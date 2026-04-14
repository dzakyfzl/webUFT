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
  const [fotoKarya, setFotoKarya] = useState<File | null>(null);

  // State untuk menyimpan daftar karya (Dummy)
  const [karyaList, setKaryaList] = useState([
    { id: 101, title: "Senja di Braga", author: "Budi Santoso", votes: 124, image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=200" },
    { id: 102, title: "Tatapan Kosong", author: "Siti Aminah", votes: 89, image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=200" },
    { id: 103, title: "Megahnya Sudirman", author: "Alex Wijaya", votes: 156, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=200" },
  ]);

  // State untuk menangkap data karya yang sedang diedit di dalam modal
  const [editingKarya, setEditingKarya] = useState<any>(null);

  // Logika pencarian vote tertinggi
  const maxVotes = karyaList.length > 0 ? Math.max(...karyaList.map(k => k.votes)) : 0;

  // --- ACTIONS ---

  // Membuka Modal Edit dan mengisi data awal
  const handleOpenEdit = (karya: any) => {
    setEditingKarya({ ...karya });
    setShowEditModal(true);
  };

  // Menyimpan hasil edit ke dalam state lokal
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
    alert(`Acara #${acaraId} Berhasil Dihapus`);
    router.push('/admin');
  };

  return (
    <main className="min-h-screen bg-[#0f0f11] text-slate-300 p-6 md:p-12 font-sans relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Link href="/admin" className="text-xs uppercase tracking-widest text-slate-500 hover:text-red-500 mb-2 block font-bold transition-colors">
              ← Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Kendali Acara #{acaraId}</h1>
          </div>
          <div className="flex gap-3">
            <Link href={`/admin/acara/${acaraId}/edit`}>
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Edit Acara</button>
            </Link>
            <button onClick={() => setShowDeleteModal(true)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-600/20">Hapus Acara</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Sisi Kiri: Form Tambah */}
          <div className="lg:col-span-1">
            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl sticky top-24 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Tambah Karya</h2>
              <form className="space-y-4">
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center bg-[#0f0f11]/50 h-32 group hover:border-red-600/50 transition-all cursor-pointer">
                  <input type="file" accept="image/*" onChange={(e) => setFotoKarya(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <p className="text-xs font-bold text-slate-400 group-hover:text-red-500">{fotoKarya ? fotoKarya.name : 'Pilih Foto Karya'}</p>
                </div>
                <input type="text" placeholder="Judul Karya" className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-red-600" />
                <button type="button" className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl opacity-50 cursor-not-allowed">Unggah Karya</button>
              </form>
            </div>
          </div>

          {/* Sisi Kanan: Daftar Karya & Statistik */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Daftar Karya & Vote</h2>
              <div className="space-y-4">
                {karyaList.map((karya) => (
                  <div key={karya.id} className="flex items-center gap-4 p-4 bg-[#0f0f11] rounded-2xl border border-white/5 hover:border-red-600/20 transition-all group relative overflow-hidden">
                    {karya.votes === maxVotes && <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-1 uppercase rounded-bl-lg">Terfavorit 🔥</div>}
                    <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0"><Image src={karya.image} alt={karya.title} fill className="object-cover" /></div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-white text-sm">{karya.title}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{karya.author}</p>
                      <div className="w-24 h-1 bg-white/5 rounded-full mt-2 overflow-hidden"><div className="h-full bg-red-600" style={{ width: `${(karya.votes/maxVotes)*100}%` }}></div></div>
                    </div>
                    <div className="text-right px-4">
                      <div className="text-xl font-black text-white">{karya.votes}</div>
                      <div className="text-[8px] text-slate-500 uppercase font-bold">Suara</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleOpenEdit(karya)} className="p-2 hover:text-white transition-colors bg-white/5 rounded-lg text-xs">✏️</button>
                      <button onClick={() => handleDeleteKarya(karya.id, karya.title)} className="p-2 hover:text-red-500 transition-colors bg-white/5 rounded-lg text-xs">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          MODAL EDIT KARYA (POP-UP FORM)
          ========================================= */}
      {showEditModal && editingKarya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-2">Edit Data Karya</h3>
            <p className="text-slate-500 text-sm mb-8">Perbarui informasi karya tanpa mengubah jumlah vote.</p>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Judul Karya Foto</label>
                <input 
                  type="text" 
                  value={editingKarya.title}
                  onChange={(e) => setEditingKarya({...editingKarya, title: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Fotografer</label>
                <input 
                  type="text" 
                  value={editingKarya.author}
                  onChange={(e) => setEditingKarya({...editingKarya, author: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" 
                  required 
                />
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