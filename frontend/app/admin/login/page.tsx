import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLogin() {
  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dekorasi Cahaya Merah Gelap */}
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-red-900/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md bg-[#1a1a1a] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative z-10">
         <div className="p-8 pb-6 text-center border-b border-slate-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mb-4 shadow-inner">
               <span className="text-2xl">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Portal Administrator</h1>
            <p className="text-slate-500 text-sm">Akses terbatas khusus panitia dan pengurus UKM.</p>
         </div>

         <div className="p-8 pt-6">
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Username / ID Panitia</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-[#222222] text-white placeholder-slate-600 font-medium" 
                  placeholder="Masukkan Username" 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-400">Password</label>
                </div>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-[#222222] text-white placeholder-slate-600 font-medium" 
                  placeholder="••••••••" 
                />
              </div>

              {/* Sesuai flowchart, jika berhasil login, diarahkan ke Halaman Admin (Dashboard) */}
              <Link href="/admin" className="block pt-2">
                <button 
                  type="button" 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all transform hover:-translate-y-0.5"
                >
                  Otorisasi Akses
                </button>
              </Link>
            </form>
         </div>
      </div>
    </main>
  );
}