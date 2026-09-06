"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getHRUser } from "../../lib/hr-auth";

export default function HRLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = getHRUser();
    if (user) router.replace("/hr");
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/akun/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        router.push("/hr");
      } else {
        setError(data.message || data.detail || "Username atau password salah.");
      }
    } catch {
      setError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E10] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-15%] right-[-5%] w-80 h-80 bg-red-700/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-80 h-80 bg-red-900/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm bg-[#18181B] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden relative z-10">
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-white/[0.06]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mb-5 shadow-lg shadow-red-900/40">
            <span className="text-2xl font-bold text-white">HR</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Portal UFT HR</h1>
          <p className="text-slate-500 text-sm">Login dengan akun panitia.</p>
        </div>

        {/* Form */}
        <div className="p-8 pt-6">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                id="hr-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-[#222226] border border-white/[0.08] text-white placeholder-slate-600 text-sm outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                placeholder="Username..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                id="hr-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-[#222226] border border-white/[0.08] text-white placeholder-slate-600 text-sm outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  isLoading
                    ? "bg-red-800/50 cursor-not-allowed text-white/50"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:-translate-y-0.5"
                }`}
              >
                {isLoading ? "Memverifikasi..." : "Masuk"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
