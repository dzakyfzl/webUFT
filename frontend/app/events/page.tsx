"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicEvent } from "../lib/erp/p1-types";

export default function PublicEventsPage() {
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState<{ offset: number; items: PublicEvent[]; has_more: boolean } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/events?offset=${offset}`, { signal: controller.signal, cache: "no-store" }).then(async response => { if (!response.ok) throw Error("Acara belum dapat dimuat."); return response.json(); }).then(data => { setState({ offset, ...data }); setError(""); }).catch(error => { if (!controller.signal.aborted) setError(error instanceof TypeError ? "Koneksi terputus. Coba muat daftar acara kembali." : error.message); });
    return () => controller.abort();
  }, [offset, attempt]);
  return <><h1>Acara & Pendaftaran</h1><p className="erp-muted">Kegiatan UKM Fotografi Telkom yang telah dipublikasikan.</p>{error && <p className="erp-error" role="alert">{error} <button onClick={() => { setError(""); setAttempt(value => value + 1); }}>Coba lagi</button></p>}
    {!state || state.offset !== offset ? !error && <p role="status">Memuat acara…</p> : <div className="erp-stack">{!state.items.length && <p className="erp-empty">Belum ada acara yang dipublikasikan.</p>}{state.items.map(event => <Link key={event.id} href={`/events/${event.id}`} className="erp-panel erp-stack"><h2>{event.title}</h2><p>{new Date(event.starts_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB · {event.location}</p><span>Lihat acara dan pendaftaran</span></Link>)}<div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{state.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div></div>}
  </>;
}
