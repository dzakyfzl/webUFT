"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignIn() {
  const [role, setRole] = useState<'user' | 'admin'>('user');

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dekorasi Background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-300/40 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
         <div className="p-8 pb-6 text-center">
            <Link href="/" className="inline-block mb-6">
              <Image src="/logo.png" alt="Logo" width={120} height={32} className="h-8 w-auto mx-auto" priority />
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Selamat Datang</h1>
            <p className="text-slate-500 text-sm">Masuk untuk melanjutkan ke akun Anda.</p>
         </div>

         <div className="flex border-b border-slate-200">
            <button
              onClick={() => setRole('user')}
              className={`flex-1 py-3.5 text-sm font-bold transition-all ${
                role === 'user' 
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              User
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-3.5 text-sm font-bold transition-all ${
                role === 'admin' 
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Admin
            </button>
         </div>

         <div className="p-8 pt-6">
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {role === 'user' ? 'Email / NIM' : 'Username Admin'}
                </label>
                {/* PERBAIKAN: Tambah text-slate-900 dan placeholder-slate-400 */}
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium" 
                  placeholder={role === 'user' ? 'Masukkan Email atau NIM' : 'Masukkan Username'} 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <a href="#" className="text-xs text-red-600 hover:underline font-medium">Lupa Password?</a>
                </div>
                {/* PERBAIKAN: Tambah text-slate-900 */}
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium" 
                  placeholder="••••••••" 
                />
              </div>

              {role === 'admin' && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <span className="text-base">🔒</span>
                  <p>Anda sedang mencoba masuk ke area Administrator yang dilindungi.</p>
                </div>
              )}

              <button 
                type="button" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 transition-all transform hover:-translate-y-0.5 mt-2"
              >
                Masuk Sekarang
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              Belum punya akun? <Link href="/signup" className="text-red-600 font-bold hover:underline">Daftar di sini</Link>
            </div>
         </div>
      </div>
    </main>
  );
}