import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignUp() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden py-12">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
         <div className="p-8 pb-6 text-center border-b border-slate-100">
            <Link href="/" className="inline-block mb-4">
              <Image src="/logo.png" alt="Logo" width={120} height={32} className="h-8 w-auto mx-auto" priority />
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Buat Akun Baru</h1>
            <p className="text-slate-500 text-sm">Bergabunglah untuk berpartisipasi dalam berbagai acara yang kami selenggarakan.</p>
         </div>

         <div className="p-8 pt-6">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                {/* PERBAIKAN WARNA TEKS */}
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium" placeholder="Sesuai kartu identitas" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email / NIM</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium" placeholder="Gunakan email aktif atau NIM" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium" placeholder="Minimal 8 karakter" />
              </div>

              <button type="button" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 transition-all transform hover:-translate-y-0.5 mt-6">
                Daftar Sekarang
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              Sudah punya akun? <Link href="/signin" className="text-red-600 font-bold hover:underline">Masuk di sini</Link>
            </div>
         </div>
      </div>
    </main>
  );
}