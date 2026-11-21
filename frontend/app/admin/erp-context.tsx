"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { api, ErpError, query, setCsrfToken } from "../lib/erp/client";
import type { Me } from "../lib/erp/types";
import LoadingIndicator from "./loading-indicator";
import SidebarNavigation from "./sidebar-navigation";

type SessionContext = { me: Me; refresh: (periodId?: string) => Promise<void> };
const Context = createContext<SessionContext | null>(null);
export function useErp() {
  const context = useContext(Context);
  if (!context) throw new Error("ERP session is unavailable");
  return context;
}

export default function ErpProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [themeChoice, setThemeChoice] = useState<"system" | "light" | "dark">("system");
  const [themeLoaded, setThemeLoaded] = useState(false);
  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("webuft-admin-theme"); } catch { /* Browser storage is optional. */ }
    const choice = stored === "light" || stored === "dark" ? stored : "system";
    queueMicrotask(() => { setThemeChoice(choice); setThemeLoaded(true); });
  }, []);
  useEffect(() => {
    if (!themeLoaded) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { document.documentElement.dataset.erpTheme = themeChoice === "system" ? (media.matches ? "dark" : "light") : themeChoice; };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [themeChoice, themeLoaded]);
  const updateTheme = (choice: "system" | "light" | "dark") => {
    setThemeChoice(choice);
    try { if (choice === "system") window.localStorage.removeItem("webuft-admin-theme"); else window.localStorage.setItem("webuft-admin-theme", choice); } catch { /* Theme still works for this session. */ }
    document.documentElement.dataset.erpTheme = choice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
  };
  useEffect(() => {
    const failed = (event: Event) => setResourceError((event as CustomEvent<string>).detail);
    const clear = () => setResourceError("");
    window.addEventListener("erp:refresh-error", failed); window.addEventListener("erp:changed", clear);
    return () => { window.removeEventListener("erp:refresh-error", failed); window.removeEventListener("erp:changed", clear); };
  }, []);
  const refresh = useCallback(async (periodId?: string) => {
    const identity = await api<Me>(`/me${query({ period_id: periodId })}`);
    setCsrfToken(identity.csrf_token);
    setMe(identity);
    setError("");
  }, []);
  useEffect(() => {
    if (isLogin) return;
    let active = true;
    api<Me>("/me").then(identity => {
      if (!active) return;
      setCsrfToken(identity.csrf_token); setMe(identity); setError("");
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ErpError && error.status === 401) router.replace("/admin/login");
      else setError(error instanceof Error ? error.message : "Sesi tidak dapat dimuat.");
    });
    const expired = () => { setMe(null); setCsrfToken(""); router.replace("/admin/login"); };
    window.addEventListener("erp:unauthorized", expired);
    return () => { active = false; window.removeEventListener("erp:unauthorized", expired); };
  }, [isLogin, refresh, router]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 641px)");
    const changed = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", changed);
    return () => desktop.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.querySelector<HTMLButtonElement>(".erp-mobile-bar button")?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  if (isLogin) return <div className="erp-app" lang="id">{children}</div>;
  if (!me) return <div className="erp-app erp-gate" lang="id"><div className="erp-panel">
    <h1>Ruang pengurus</h1>
    {error ? <p role="alert">{error}</p> : <LoadingIndicator label="Memuat sesi Anda…"/>}
    {error && <button onClick={() => { setError(""); refresh().catch(error => setError(error.message)); }}>Coba kembali</button>}
    {error && <Link href="/admin/login">Kembali ke login</Link>}
  </div></div>;
  return <Context.Provider value={{ me, refresh }}><div className="erp-app erp-workspace" lang="id">
    <a className="erp-skip" href="#erp-content">Ke isi utama</a>
    <header className="erp-mobile-bar"><Link href="/admin" className="erp-brand">UFT <span>Pengurus</span></Link>
      <button className="erp-icon-button" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={open} aria-controls="erp-sidebar" onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
    </header>
    {open && <button className="erp-overlay" data-no-press tabIndex={-1} aria-label="Tutup navigasi" onClick={() => setOpen(false)}/>}
    <aside id="erp-sidebar" className={`erp-sidebar ${open ? "is-open" : ""}`}>
      <Link href="/admin" className="erp-brand" onClick={() => setOpen(false)}>UFT <span>Ruang pengurus</span></Link>
      <SidebarNavigation key={me.period_id} me={me} pathname={pathname} close={() => setOpen(false)}/>
      <div className="erp-sidebar-bottom"><span>{me.user.display_name}</span><small>@{me.user.username}</small>
        <button className="erp-text-button" onClick={async () => {
          try { await api("/auth/logout", { method: "POST" }); setMe(null); setCsrfToken(""); router.replace("/admin/login"); }
          catch (error) { setError(error instanceof Error ? error.message : "Gagal keluar."); }
        }}><LogOut size={16}/> Keluar</button></div>
    </aside>
    <div className="erp-main" inert={open}><div className="erp-topbar"><span>UKM Fotografi Telkom</span>
      <label className="erp-theme-label">Tema <select aria-label="Tema pengurus" value={themeChoice} onChange={event => updateTheme(event.target.value as "system" | "light" | "dark")}>
        <option value="system">Sistem</option><option value="light">Terang</option><option value="dark">Gelap</option>
      </select></label>
      <label className="erp-period-label">Periode <select aria-label="Periode aktif" value={me.period_id} onChange={async event => {
        try { await refresh(event.target.value); } catch (error) { setError(error instanceof Error ? error.message : "Gagal mengganti periode."); }
      }}>{me.periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
    </div>{error && <p role="alert" className="erp-error erp-global-error">{error}</p>}
      {resourceError && <div role="alert" className="erp-error erp-global-error">Data terakhir masih ditampilkan. {resourceError} <button onClick={() => window.dispatchEvent(new Event("erp:changed"))}>Coba kembali</button></div>}
      <main id="erp-content" className={pathname === "/admin" || pathname === "/admin/calendar" ? "erp-content-wide" : undefined} key={me.period_id} tabIndex={-1}>{children}</main>
    </div>
  </div></Context.Provider>;
}
