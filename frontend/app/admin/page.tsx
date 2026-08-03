"use client";

import React, { useState, useEffect } from 'react';

import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRouter } from 'next/navigation';
import KelolaAcara from '../components/subdashboard/KelolaAcara';
import KelolaAkun from '../components/subdashboard/KelolaAkun';
import KelolaMigrasi from '../components/subdashboard/KelolaMigrasi';
import KelolaGaleri from '../components/subdashboard/KelolaGaleri';
import KelolaSertifikat from '../components/subdashboard/KelolaSertifikat';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Daftar menu sidebar bawaan
  const list_menuItems = [
    { id: 'Kelola Acara', icon: '📅' },
    { id: 'Kelola Akun', icon: '👤' },
    { id: 'Kelola Galeri', icon: '🖼' },
    { id: 'Kelola Migrasi', icon: '🔄' },
    { id: 'Certificate', icon: '🎓' },
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

      // 3. Filter menu berdasarkan akses dari token
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
      case 'Kelola Galeri':
        return <KelolaGaleri/>;
      case 'Certificate':
        return <KelolaSertifikat />;
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0f0f11] font-sans selection:bg-red-600/30 overflow-hidden">

      {/* --- MOBILE NAVBAR --- */}
      <nav className="w-full md:hidden bg-[#18181b] border-b border-white/5 flex items-center px-6 h-[73px] flex-shrink-0 z-20">
        <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-3">
          <img src="/logo-uft.png" alt="Logo UFT" className="w-8 h-8" />
          <span className="font-bold text-white tracking-wide text-lg">
            UFT<span className="text-red-500 font-normal">Admin</span>
          </span>
        </button>
      </nav>

      {/* --- MOBILE OVERLAY --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#18181b] border-r border-white/5 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Logo Brand */}
        <div className="p-6 flex items-center justify-between border-b border-white/5 h-[73px]">
          <div className="flex items-center gap-3">
            <img src="/logo-uft.png" alt="Logo UFT" className="w-8 h-8" />
            <span className="font-bold text-white tracking-wide text-lg">
              UFT<span className="text-red-500 font-normal">Admin</span>
            </span>
          </div>
          {/* Close button on mobile */}
          <button className="md:hidden text-white/50 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            ✕
          </button>
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
              onClick={() => {
                setActiveMenu(item.id);
                setIsSidebarOpen(false);
              }}
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
      <main className="flex-1 flex flex-col h-[calc(100vh-73px)] md:h-screen overflow-y-auto w-full relative z-0">
        {/* Area Render Komponen */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>

    </div>
  );
}