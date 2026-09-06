"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getHRUser, hasAccess, HR_MENU, type HRUser } from "../lib/hr-auth";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<HRUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bypass auth guard untuk halaman login agar tidak terjadi infinite redirect loop
  const isLoginPage = pathname === "/hr/login";

  useEffect(() => {
    if (isLoginPage) return; // jangan cek auth di halaman login
    const u = getHRUser();
    if (!u) {
      router.push("/hr/login");
      return;
    }
    setUser(u);
    setLoading(false);
  }, [router, isLoginPage]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/hr/login");
  };

  const visibleMenu = HR_MENU.filter(
    (item) => item.bidang === null || (user && hasAccess(user, item.bidang))
  );

  // Halaman login: render langsung tanpa sidebar maupun loading guard
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0E0E10] font-sans overflow-hidden">
      
      {/* Mobile Topbar */}
      <nav className="w-full md:hidden bg-[#18181B] border-b border-white/5 flex items-center justify-between px-5 h-16 flex-shrink-0 z-20">
        <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm">
            HR
          </div>
          <span className="font-bold text-white text-base">
            UFT<span className="text-red-400 font-normal">HR</span>
          </span>
        </button>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          ☰
        </button>
      </nav>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-[240px] bg-[#18181B] border-r border-white/[0.06] flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="p-5 flex items-center justify-between border-b border-white/[0.06] h-16 flex-shrink-0">
          <Link href="/hr" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-900/40">
              HR
            </div>
            <span className="font-bold text-white tracking-wide">
              UFT<span className="text-red-400 font-normal">HR</span>
            </span>
          </Link>
          <button
            className="md:hidden text-slate-500 hover:text-white p-1 transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.nama.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.nama}</p>
                <p className="text-slate-500 text-xs truncate">{user.role || "Anggota"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2">
            Menu
          </p>
          {visibleMenu.map((item) => {
            const isActive = item.href === "/hr"
              ? pathname === "/hr"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-red-600/15 text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(220,38,38,0.08)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-red-600/15 hover:border-red-500/30 border border-white/[0.06] rounded-xl transition-all flex items-center gap-3"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen overflow-y-auto w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
