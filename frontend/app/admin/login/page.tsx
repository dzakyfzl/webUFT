"use client"; // Wajib ditambahkan agar bisa menggunakan state dan event handler

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  
  // State untuk menyimpan input dan status
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi untuk menangani proses login
  const handleLogin = async (e) => {
    e.preventDefault(); // Mencegah reload halaman bawaan browser
    setError('');
    setIsLoading(true);

    try {
      // Endpoint mengarah ke /api/akun/login karena NGINX mem-proxy /api/ ke FastAPI
      const response = await fetch('/api/akun/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Simpan token ke localStorage (atau bisa dikembangkan menggunakan Cookies nanti)
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        console.log('Login berhasil, token disimpan:', data.access_token);
        
        // Arahkan ke halaman dashboard
        router.push('/admin');
      } else {
        // Tangkap pesan error dari FastAPI (response code 401 dll)
        setError(data.message || 'Username atau password salah.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

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
            {/* Tempat Menampilkan Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Username / ID Panitia</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-[#222222] text-white placeholder-slate-600 font-medium" 
                  placeholder="••••••••" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full text-white font-bold py-3.5 rounded-xl transition-all transform ${
                    isLoading 
                      ? 'bg-red-800 cursor-not-allowed opacity-70' 
                      : 'bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:-translate-y-0.5'
                  }`}
                >
                  {isLoading ? 'Memproses...' : 'Otorisasi Akses'}
                </button>
              </div>
            </form>
         </div>
      </div>
    </main>
  );
}