"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import DynamicButton from '../../../components/ui/dynamic-button';
import DirectionalPanels from '../../../components/ui/directional-panels';
import ModalDialog from '../../../components/ui/modal-dialog';
import { useSearchParams } from 'next/navigation';
import { generateDeviceHash } from '../../../lib/device-hash';

// --- SUB-KOMPONEN UTAMA (Yang menggunakan useSearchParams) ---
function KaryaContent() {
  const searchParams = useSearchParams();
  const karyaId = searchParams.get('karyaId'); 
  const acaraId = searchParams.get('acaraId'); 

  // --- STATE MANAGEMENT ---
  const [karya, setKarya] = useState<{ id: number; title: string; author: string; description: string; image: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const [showVoteForm, setShowVoteForm] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [voteError, setVoteError] = useState("");
  const submitting = useRef(false);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Karya tidak dapat dimuat.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailKarya();
  }, [acaraId, karyaId]);

  // --- 2. HANDLE SUBMIT VOTE KE BACKEND ---
  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setVoteError("");
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
          karyaID: parseInt(karyaId || '0'),
          device_hash: await generateDeviceHash(),
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
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : "Voting belum berhasil dikirim.");
    } finally {
      submitting.current = false;
      setIsSubmitLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!acaraId) return;
    const controller = new AbortController();
    fetch(`/api/acara/ambil/${acaraId}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted) setIsActive(data?.status === "Aktif"); })
      .catch(() => { if (!controller.signal.aborted) setIsActive(false); });
    return () => controller.abort();
  }, [acaraId]);

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
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-3 text-lg"
              >
                VOTE KARYA INI
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Satu identitas, satu vote</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL FORM VOTE (Framer Motion) --- */}
      {showVoteForm && <VoteModal
        error={voteError}
        isSuccess={isSuccess}
        isSubmitLoading={isSubmitLoading}
        formData={formData}
        karyaTitle={karya.title}
        karyaAuthor={karya.author}
        onClose={() => { if (!isSubmitLoading) { setShowVoteForm(false); if (isSuccess) { setIsSuccess(false); setFormData({ nama: "", prodi_instansi: "", nim: "" }); } } }}
        onSubmit={handleVoteSubmit}
        onInputChange={handleInputChange}
      />}
    </main>
  );
}

// --- KOMPONEN MODAL TERPISAH DENGAN FRAMER MOTION ---
function VoteModal({
  error,
  isSuccess,
  isSubmitLoading,
  formData,
  karyaTitle,
  karyaAuthor,
  onClose,
  onSubmit,
  onInputChange,
}: {
  error: string;
  isSuccess: boolean;
  isSubmitLoading: boolean;
  formData: { nama: string; prodi_instansi: string; nim: string };
  karyaTitle: string;
  karyaAuthor: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <ModalDialog className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-md overflow-y-auto rounded-xl bg-white backdrop:bg-slate-950/75"
      aria-label="Voting karya" onDismiss={onClose} dismissBackdrop>
            <DirectionalPanels step={isSuccess ? 1 : 0}>
              {!isSuccess ? (
                <div className="relative p-5 sm:p-7">
                  <button
                    onClick={onClose}
                    disabled={isSubmitLoading}
                    type="button"
                    aria-label="Tutup voting"
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full font-bold transition-colors"
                  >
                    <X size={16} aria-hidden="true"/>
                  </button>

                  <div className="mb-5">
                    <h2 className="mb-1 text-xl font-bold text-slate-800">Voting karya</h2>
                    <p className="text-slate-500 text-xs">Anda akan memberikan suara untuk <strong>&ldquo;{karyaTitle}&rdquo;</strong>.</p>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="vote-nama" className="mb-1 block text-sm font-medium text-slate-700">Nama lengkap *</label>
                      <input
                        id="vote-nama" type="text" name="nama" value={formData.nama}
                        onChange={onInputChange} disabled={isSubmitLoading} required autoComplete="name"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                      />
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="vote-prodi_instansi" className="mb-1 block text-sm font-medium text-slate-700">Prodi / Instansi *</label>
                        <input
                          id="vote-prodi_instansi" type="text" name="prodi_instansi" value={formData.prodi_instansi}
                          onChange={onInputChange} disabled={isSubmitLoading} required placeholder="S1 Informatika"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label htmlFor="vote-nim" className="mb-1 block text-sm font-medium text-slate-700">NIM (opsional)</label>
                        <input
                          id="vote-nim" type="text" name="nim" value={formData.nim}
                          onChange={onInputChange} disabled={isSubmitLoading}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                        />
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
                    <DynamicButton
                      type="submit"
                      fullWidth
                      disabled={isSubmitLoading}
                      icon={isSubmitLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
                      className="w-full rounded-lg bg-slate-900 py-3 text-white hover:bg-black disabled:opacity-60"
                    >{isSubmitLoading ? "Mengirim…" : "Kirim vote"}</DynamicButton>
                  </form>
                </div>
              ) : (
                <div className="p-6 text-center sm:p-8" role="status" data-step-focus tabIndex={-1}>
                  <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Check size={36} aria-hidden="true"/>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Vote Terkirim!</h2>
                  <p className="text-slate-500 text-sm">Terima kasih telah mendukung <strong>{karyaAuthor}</strong> di pameran ini.</p>
                  <button type="button" className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800" onClick={onClose}>Tutup</button>
                </div>
              )}
            </DirectionalPanels>
    </ModalDialog>
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
