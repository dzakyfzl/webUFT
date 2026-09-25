"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// --- SUB-KOMPONEN UTAMA (Yang menggunakan useSearchParams) ---
function KaryaContent() {
  const searchParams = useSearchParams();
  const karyaId = searchParams.get('karyaId'); 
  const acaraId = searchParams.get('acaraId'); 

  // --- STATE MANAGEMENT ---
  const [karya, setKarya] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const [showVoteForm, setShowVoteForm] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // State untuk form input
  const [formData, setFormData] = useState({
    nama: '',
    prodi_instansi: '',
    nim: '',
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
      const guestToken = localStorage.getItem('guest_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (guestToken) {
        headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const response = await fetch(`/api/form/isi/${acaraId || '0'}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          nama: formData.nama,
          prodi_instansi: formData.prodi_instansi,
          nim: formData.nim,
          karyaID: parseInt(karyaId || '0')
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Anda sudah pernah memberikan vote untuk pameran ini!");
        }
        throw new Error("Gagal mengirim vote. Silakan coba lagi.");
      }

      const responseData = await response.json();
      
      if (responseData.refresh_token) {
        localStorage.setItem('guest_token', responseData.refresh_token);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setShowVoteForm(false);
        setIsSuccess(false);
        setFormData({ nama: '', prodi_instansi: '', nim: '' });
      }, 3500);

    } catch (err: any) {
      alert(err.message); 
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- LOGIKA PENENTUAN STATUS VOTE ---
  const checkActiveStatus = (async () => {
    const response = await fetch(`/api/acara/ambil/${acaraId}`).then(res => res.json());
    setIsActive(response.status === "Aktif");
  })();

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
            unoptimized={karya.image.startsWith('/api')} 
          />
        </div>

        <div className="lg:w-2/5 p-8 md:p-12 flex flex-col bg-white overflow-y-auto h-auto lg:h-[calc(100vh-65px)]">
          <div className="flex-grow pt-4">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">{karya.title}</h1>
            <p className="text-lg font-medium text-slate-500 mb-8 border-b border-slate-100 pb-6">
              Oleh <span className="text-slate-800 font-bold">{karya.author}</span>
            </p>
            
            <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Deskripsi Karya</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
              {karya.description}
            </p>
          </div>

          {isActive && (
            <div className="mt-12 pt-8 border-t border-slate-100">
              <button 
                onClick={() => setShowVoteForm(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
              >
                VOTE KARYA INI
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Satu identitas, satu vote</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL FORM VOTE (Framer Motion) --- */}
      <VoteModal
        show={showVoteForm}
        isSuccess={isSuccess}
        isSubmitLoading={isSubmitLoading}
        formData={formData}
        karyaTitle={karya.title}
        karyaAuthor={karya.author}
        onClose={() => setShowVoteForm(false)}
        onSubmit={handleVoteSubmit}
        onInputChange={handleInputChange}
      />
    </main>
  );
}

// --- KOMPONEN MODAL TERPISAH DENGAN FRAMER MOTION ---
function VoteModal({
  show,
  isSuccess,
  isSubmitLoading,
  formData,
  karyaTitle,
  karyaAuthor,
  onClose,
  onSubmit,
  onInputChange,
}: {
  show: boolean;
  isSuccess: boolean;
  isSubmitLoading: boolean;
  formData: { nama: string; prodi_instansi: string; nim: string };
  karyaTitle: string;
  karyaAuthor: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [FM, setFM] = React.useState<any>(null);

  React.useEffect(() => {
    import('framer-motion').then((mod) => setFM(mod));
  }, []);

  if (!FM) return null;

  const { AnimatePresence, motion } = FM;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(6px)' }}
          onClick={!isSuccess ? onClose : undefined}
        >
          <motion.div
            key="modal"
            className="bg-white max-w-md w-full shadow-2xl overflow-hidden relative"
            style={{ borderRadius: '1.75rem' }}
            initial={{ opacity: 0, y: 64, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="p-8 md:p-10"
                >
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full font-bold transition-colors"
                  >
                    ✕
                  </button>

                  <div className="mb-8">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      Voting Aktif
                    </span>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Konfirmasi Vote</h2>
                    <p className="text-slate-500 text-xs">Anda akan memberikan suara untuk <strong>&ldquo;{karyaTitle}&rdquo;</strong>.</p>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                      <input
                        type="text" name="nama" value={formData.nama}
                        onChange={onInputChange} required placeholder="Nama Saya..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prodi / Instansi</label>
                        <input
                          type="text" name="prodi_instansi" value={formData.prodi_instansi}
                          onChange={onInputChange} required placeholder="S1 Informatika"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIM (Opsional)</label>
                        <input
                          type="text" name="nim" value={formData.nim}
                          onChange={onInputChange} placeholder="NIM / Kosong"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSubmitLoading}
                      className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white font-bold py-4 rounded-2xl mt-2 transition-colors shadow-lg flex justify-center items-center gap-2"
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      {isSubmitLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        'Kirim Vote Sekarang →'
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="p-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                    className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner"
                  >
                    ✓
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 }}
                    className="text-2xl font-black text-slate-800 mb-2"
                  >
                    Vote Terkirim!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="text-slate-500 text-sm"
                  >
                    Terima kasih telah mendukung <strong>{karyaAuthor}</strong> di pameran ini.
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- KOMPONEN EXPORT UTAMA DIBUNGKUS SUSPENSE ---
export default function DetailKarya() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Menyiapkan Katalog...</div>}>
      <KaryaContent />
    </Suspense>
  );
}
