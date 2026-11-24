"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, setCsrfToken } from "../../lib/erp/client";
import DynamicButton from "../../components/ui/dynamic-button";

export default function LoginPage() {
  return <Suspense><LoginForm/></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const archive = params.get("archive");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  return <main className="erp-login">
    <section className="erp-login-story"><Link href="/" className="erp-brand">UFT <span>UKM Fotografi Telkom</span></Link>
      <div><p className="erp-login-message">Tugas, program kerja, dan riwayat kepengurusan.</p></div>
    </section>
    <section className="erp-login-form"><div className="erp-login-inner"><h1>Masuk ke ruang pengurus</h1>
      <p>{archive ? `Periode ${params.get("period_name") || "sebelumnya"} telah diarsipkan. Masuk dengan akun pengurus aktif untuk melihat arsipnya.` : "Gunakan akun pribadi yang diberikan pengurus Inti."}</p>
      <form onSubmit={async event => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true; setBusy(true); setError("");
        const values = new FormData(event.currentTarget);
        try {
          const result = await api<{ csrf_token: string }>("/auth/login", { method: "POST", body: {
            username: String(values.get("username")).trim().toLowerCase(), password: String(values.get("password")),
          }});
          setCsrfToken(result.csrf_token); router.replace(archive ? `/admin/history?period=${encodeURIComponent(archive)}` : "/admin");
        } catch (error) {
          setError(error instanceof Error ? error.message : "Login belum berhasil.");
          submitting.current = false; setBusy(false);
        }
      }}>
        <label>Username<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} disabled={busy}/></label>
        <div className="erp-field-stack">
          <label htmlFor="login-password">Password</label>
          <div className="erp-password-control">
            <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={256} disabled={busy}/>
            <button type="button" aria-controls="login-password" disabled={busy} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Sembunyikan" : "Tampilkan"}</button>
          </div>
        </div>
        {error && <p className="erp-error" role="alert">{error}</p>}
        <DynamicButton type="submit" className="erp-primary" disabled={busy} fullWidth icon={busy && <span className="erp-spinner"/>}>{busy ? "Memeriksa akun…" : "Masuk"}</DynamicButton>
      </form><p className="erp-muted">Lupa password? Hubungi pengurus Inti untuk reset akun.</p><Link href="/" className="erp-back-link">Kembali ke website UFT</Link>
    </div></section>
  </main>;
}
