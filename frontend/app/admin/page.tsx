"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRouter } from 'next/navigation';
import KelolaAcara from '../components/subdashboard/KelolaAcara';
import KelolaAkun from '../components/subdashboard/KelolaAkun';
import KelolaMigrasi from '../components/subdashboard/KelolaMigrasi';

interface CustomJwtPayload extends JwtPayload {
  access?: string[];
  role?: string;
}

// --- KOMPONEN UTAMA (SIDEBAR + LAYOUT) ---
export default function AdminDashboardLayout() {
  const router = useRouter();
  
  // 1. Jadikan menuItems sebagai State di React
  const [menuItems, setMenuItems] = useState<{id: string, icon: string}[]>([]);
  const [activeMenu, setActiveMenu] = useState('');

  // Daftar menu sidebar bawaan
  const list_menuItems = [
    { id: 'Kelola Acara', icon: '📅' },
    { id: 'Kelola Akun', icon: '👤' },
    { id: 'Kelola Migrasi', icon: '🔄' } // Typo diperbaiki: pakai spasi agar cocok dengan switch case
  ];

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    // 2. Proteksi jika token tidak ada
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userAccess = decodedToken.access || [];
      
      // 3. Filter menu
      const filteredMenu = list_menuItems.filter(item => userAccess.includes(item.id));
      
      // 4. Simpan ke dalam state agar layar merender ulang
      setMenuItems(filteredMenu);

      // 5. Atur default active menu ke menu pertama yang mereka punya akses
      if (filteredMenu.length > 0) {
        setActiveMenu(filteredMenu[0].id);
      }
    } catch (error) {
      console.error("Token tidak valid:", error);
      router.push('/admin/login');
    }
  }, [router]);

  // Fungsi untuk merender konten berdasarkan state
  const renderContent = () => {
    switch (activeMenu) {
      case 'Kelola Acara':
        return <KelolaAcara />;
      case 'Kelola Akun':
        return <KelolaAkun />;
      case 'Kelola Migrasi':
        return <KelolaMigrasi />;
      default:
        // Render kosong jika activeMenu belum di-set / user tidak punya akses apa-apa
        return <div className="p-8 text-slate-500">Silakan pilih menu...</div>; 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-[#0f0f11] font-sans selection:bg-red-600/30">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#18181b] border-r border-white/5 flex flex-col sticky top-0 h-screen">
        {/* Logo Brand */}
        <div className="p-6 flex items-center gap-3 border-b border-white/5 h-[73px]">
          <img src="/logo-uft.png" alt="Logo UFT" className="w-8 h-8" />
          <span className="font-bold text-white tracking-wide text-lg">
            UFT<span className="text-red-500 font-normal">Admin</span>
          </span>
        </div>

        {/* Navigasi Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 mt-2 px-2">
            Menu Utama
          </div>
          
          {/* Menu dirender dari State, bukan variabel mati */}
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeMenu === item.id
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span>{item.icon}</span>
              {item.id}
            </button>
          ))}
          
          {/* Pesan jika user tidak punya akses menu apa pun */}
          {menuItems.length === 0 && (
            <div className="px-2 text-sm text-slate-600">Tidak ada akses.</div>
          )}
        </nav>

        {/* Tombol Logout di Bawah */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-white/5 hover:bg-red-600 hover:text-white text-slate-300 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-red-500 flex justify-center items-center gap-2"
          >
            Keluar <span>🚪</span>
          </button>
        </div>
        
        {/* Tombol Kembali ke Beranda */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={() => router.push('/')}
            className="w-full px-4 py-3 bg-white/5 hover:bg-slate-600 hover:text-white text-slate-300 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-slate-500 flex justify-center items-center gap-2"
          >
            Kembali ke Beranda <span>🏠</span>
          </button>
        </div>
      </aside>

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Area Render Komponen */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
      
    </div>
  );
}