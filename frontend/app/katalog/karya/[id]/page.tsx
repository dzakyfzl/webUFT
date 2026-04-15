"use client";

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DetailKarya({ params }: { params: Promise<{ id: string }> }) {
  // --- EXTRACT PARAMS & SEARCH PARAMS ---
  
  
  const searchParams = useSearchParams();
  const karyaId = searchParams.get('karyaId'); // Dari Query Params (contoh: ?karyaId=1)
  const acaraId = searchParams.get('acaraId'); // Dari Query Params (contoh: ?acaraId=1)

  // --- STATE MANAGEMENT ---
  const [karya, setKarya] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showVoteForm, setShowVoteForm] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // State untuk form input
  const [formData, setFormData] = useState({
    nama: '',
    prodi_instansi: '',
    nim: '',
    nomor: ''
  });

  // --- 1. FETCH DATA KARYA DARI BACKEND ---
  useEffect(() => {
    const fetchDetailKarya = async () => {
      if (!acaraId || !karyaId) {
        setError("Parameter acara atau karya tidak valid.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/karya/ambil/${parseInt(acaraId)}/${parseInt(karyaId)}`);
        if (!response.ok) {
          throw new Error('Karya tidak ditemukan');
        }

        const data = await response.json();
        setKarya({
          id: data.karyaID,
          title: data.nama,
          author: data.pemilik,
          description: data.deskripsi,
          // Mengambil gambar dari endpoint file, gunakan unoptimized={true} di komponen Image
          image: data.fileID ? `/api/file/ambil/${data.fileID}` : "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=1200"
        });
      } catch (err: any) {
        console.error("Error fetching detail:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailKarya();
  }, [acaraId, karyaId]);

  // --- 2. HANDLE SUBMIT VOTE KE BACKEND ---
  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitLoading(true);

    try {
      // Ambil token dari localStorage jika user pernah submit sebelumnya
      const guestToken = localStorage.getItem('guest_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      // Asumsi backend membaca dari header Authorization (Bearer Token)
      if (guestToken) {
        headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const response = await fetch(`/api/form/isi/${acaraId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          nama: formData.nama,
          prodi_instansi: formData.prodi_instansi,
          nomor: formData.nomor,
          nim: formData.nim,
          karyaID: parseInt(karyaId)
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Anda sudah pernah memberikan vote untuk pameran ini!");
        }
        throw new Error("Gagal mengirim vote. Silakan coba lagi.");
      }

      const responseData = await response.json();
      
      // Simpan token ke localStorage agar backend bisa memblokir vote kedua
      if (responseData.refresh_token) {
        localStorage.setItem('guest_token', responseData.refresh_token);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setShowVoteForm(false);
        setIsSuccess(false);
        // Reset form
        setFormData({ nama: '', prodi_instansi: '', nim: '', nomor: '' });
      }, 3500);

    } catch (err: any) {
      alert(err.message); // Tampilkan alert error (bisa diganti dengan UI Toast yang lebih rapi)
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- TAMPILAN LOADING / ERROR ---
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Memuat detail karya...</div>;
  }

  if (error || !karya) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h1 className="text-2xl font-bold text-slate-800">{error || "Karya tidak ditemukan"}</h1>
        <Link href={`/katalog/karya?acaraId=${acaraId}`} className="mt-4 text-red-600 hover:underline">Kembali ke Katalog</Link>
      </div>
    );
  }

  // --- TAMPILAN UTAMA ---
  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
      <header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center sticky top-0 z-40">
        <Link href={`/katalog/karya?acaraId=${acaraId}`} className="text-sm font-bold text-slate-500 hover:text-red-600 flex items-center gap-2 transition-colors">
          <span>←</span> Kembali ke Katalog
        </Link>
        <div className="font-bold text-slate-300 text-xs tracking-widest uppercase">ID: {karya.id}</div>
      </header>

      <div className="flex flex-col lg:flex-row flex-grow">
        <div className="lg:w-3/5 bg-[#0a0a0c] relative h-[50vh] lg:h-[calc(100vh-65px)] p-4 flex items-center justify-center">
          <Image 
            src={karya.image} 
            alt={karya.title} 
            fill 
            className="object-contain p-4 md:p-8" 
            priority
            unoptimized={karya.image.startsWith('/api')} // Penting untuk Docker/Nginx
          />
        </div>

        <div className="lg:w-2/5 p-8 md:p-12 flex flex-col bg-white overflow-y-auto h-auto lg:h-[calc(100vh-65px)]">
          <div className="flex-grow pt-4">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">{karya.title}</h1>
            <p className="text-lg font-medium text-slate-500 mb-8 border-b border-slate-100 pb-6">
              Oleh <span className="text-slate-800 font-bold">{karya.author}</span>
            </p>
            
            <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Deskripsi Karya</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              {karya.description}
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <button 
              onClick={() => setShowVoteForm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
            >
              VOTE KARYA INI
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Satu identitas, satu vote</p>
          </div>
        </div>
      </div>

      {/* --- MODAL FORM VOTE --- */}
      {showVoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] overflow-hidden max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
            
            {!isSuccess && (
              <button onClick={() => setShowVoteForm(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-800 bg-slate-100 rounded-full font-bold">✕</button>
            )}

            {!isSuccess ? (
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Konfirmasi Vote</h2>
                  <p className="text-slate-500 text-xs">Anda akan memberikan suara untuk <strong>"{karya.title}"</strong>.</p>
                </div>

                <form onSubmit={handleVoteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                    <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} required placeholder="Sesuai KTM / KTP" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prodi / Instansi</label>
                      <input type="text" name="prodi_instansi" value={formData.prodi_instansi} onChange={handleInputChange} required placeholder="S1 Informatika" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIM</label>
                      <input type="text" name="nim" value={formData.nim} onChange={handleInputChange} required placeholder="Nomor Induk Mahasiswa / Kosong" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                    <input type="text" name="nomor" value={formData.nomor} onChange={handleInputChange} required placeholder="08xxxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium" />
                  </div>

                  <button type="submit" disabled={isSubmitLoading} className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-500 text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg flex justify-center items-center">
                    {isSubmitLoading ? "Mengirim..." : "Kirim Vote Sekarang"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">✓</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Vote Terkirim!</h2>
                <p className="text-slate-500 text-sm">Terima kasih telah mendukung <strong>{karya.author}</strong> di pameran ini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}