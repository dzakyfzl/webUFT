"use client";

import React, { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function KatalogContent() {
  const searchParams = useSearchParams();
  const acaraId = searchParams.get('acaraId'); 

  const [daftarKarya, setDaftarKarya] = useState<any[]>([]);
  // 1. TAMBAH 'waktu' PADA STATE ACARA
  const [acaraDetail, setAcaraDetail] = useState<{nama: string, deskripsi: string, waktu: string, tempat: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!acaraId) {
        setError("Acara tidak ditemukan. Silakan kembali ke beranda dan pilih pameran.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [karyaRes, acaraRes] = await Promise.all([
          fetch(`/api/karya/list/${acaraId}`),
          fetch(`/api/acara/ambil/${acaraId}`)
        ]);
        
        if (acaraRes.ok) {
          const acaraData = await acaraRes.json();
          // 2. SIMPAN 'waktu' DAN 'tempat' DARI DATABASE
          setAcaraDetail({
            nama: acaraData.nama,
            deskripsi: acaraData.deskripsi,
            waktu: acaraData.waktu,     // <--- Ditambahkan
            tempat: acaraData.tempat    // <--- Ditambahkan (Opsional, tapi bagus untuk UX)
          });
        }

        if (!karyaRes.ok) {
          throw new Error('Gagal mengambil data karya dari server');
        }

        const dataKarya = await karyaRes.json();
        const formattedData = dataKarya.map((item: any) => ({
          id: item.karyaID,
          title: item.nama,
          author: item.pemilik,
          image: item.fileID ? `/api/file/ambil/${item.fileID}` : "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=800"
        }));

        setDaftarKarya(formattedData);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Gagal memuat data pameran. Silakan coba lagi nanti.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [acaraId]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
            ← Beranda
          </Link>
          <div className="font-extrabold text-slate-800 tracking-tight">Katalog <span className="text-red-600">Pameran</span></div>
        </div>
      </header>

      {/* --- HEADER DINAMIS DARI DATABASE --- */}
      <section className="bg-slate-900 text-white py-16 px-6 text-center flex flex-col items-center">
        {isLoading ? (
          <div className="animate-pulse w-full">
            <div className="h-12 bg-slate-700 w-3/4 md:w-1/2 mx-auto rounded-lg mb-4"></div>
            <div className="h-4 bg-slate-800 w-2/3 mx-auto rounded mb-6"></div>
            <div className="h-8 bg-slate-800 w-48 mx-auto rounded-full"></div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
              {acaraDetail?.nama || "Galeri Pameran"}
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
              {acaraDetail?.deskripsi || "Jelajahi karya-karya luar biasa dari para kreator visual kami."}
            </p>
            
            {/* 3. TAMPILAN BADGE WAKTU & TEMPAT */}
            {(acaraDetail?.waktu || acaraDetail?.tempat) && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {acaraDetail.waktu && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-slate-200 text-xs md:text-sm font-medium tracking-wide">
                    <span>🗓️</span> {acaraDetail.waktu.substring(8, 10)}-{acaraDetail.waktu.substring(5, 7)}-{acaraDetail.waktu.substring(0, 4)} <span>🕰️</span>{acaraDetail.waktu.substring(11, 16)}
                  </div>
                )}
                {acaraDetail.tempat && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-slate-200 text-xs md:text-sm font-medium tracking-wide">
                    <span>📍</span> {acaraDetail.tempat}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="max-w-7xl mx-auto p-6 md:p-12">
        {isLoading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Memuat karya...</div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <Link href="/" className="inline-block px-6 py-2 bg-slate-900 text-white rounded-full text-sm hover:bg-slate-800 transition">
              Kembali ke Beranda
            </Link>
          </div>
        ) : daftarKarya.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-medium">Belum ada karya yang diunggah untuk acara ini.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {daftarKarya.map((karya) => (
              <Link href={`/katalog/karya/detail?acaraId=${acaraId}&karyaId=${karya.id}`} key={karya.id}>
                <div className="group relative aspect-[3/4] rounded-2xl md:rounded-[2rem] overflow-hidden cursor-pointer bg-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <Image 
                    src={karya.image} 
                    alt={karya.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                    unoptimized={karya.image.startsWith('/api')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 md:p-6 opacity-90 group-hover:opacity-100 transition-opacity">
                    <h3 className="text-white font-bold text-lg md:text-xl leading-tight">{karya.title}</h3>
                    <p className="text-slate-300 text-sm mt-1">{karya.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function KatalogKaryaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50">Memuat...</div>}>
      <KatalogContent />
    </Suspense>
  );
}