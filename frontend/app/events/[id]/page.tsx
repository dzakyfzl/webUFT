"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import RegistrationFields, { type Answers } from "../../components/RegistrationFields";
import type { FormSchema, PublicEvent } from "../../lib/erp/p1-types";

type EventData = PublicEvent & { registration: { form_id: string; form_version_id: string; version_number: number; schema: FormSchema; accepting: boolean } | null };

export default function RegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [values, setValues] = useState<Answers>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [stale, setStale] = useState(false);
  const requestId = useRef("");
  const submitting = useRef(false);
  const result = useRef<HTMLElement>(null);
  const errorNotice = useRef<HTMLParagraphElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/public/events/${id}`, { cache: "no-store" });
    if (!response.ok) throw Error("Acara tidak ditemukan atau belum dipublikasikan.");
    const data: EventData = await response.json();
    setEvent(data);
    return data;
  }, [id]);
  useEffect(() => { load().catch(error => setError(error.message)); }, [load]);
  useEffect(() => { if (complete) result.current?.focus(); }, [complete]);
  useEffect(() => { if (error) errorNotice.current?.focus(); }, [error]);
  const form = event?.registration;

  async function reloadForm() {
    try {
      const latest = (await load()).registration;
      if (latest && form) {
        const previous = new Map(form.schema.sections.flatMap(section => section.questions.map(question => [question.id, question.type])));
        setValues(current => {
          const next: Answers = {};
          for (const question of latest.schema.sections.flatMap(section => section.questions)) {
            const answer = current[question.id];
            if (answer === undefined || previous.get(question.id) !== question.type) continue;
            if (Array.isArray(answer)) next[question.id] = answer.filter(option => question.options.includes(option));
            else if (!["RADIO", "DROPDOWN"].includes(question.type) || question.options.includes(answer)) next[question.id] = answer;
          }
          return next;
        });
      }
      requestId.current = "";
      setStale(false);
      setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Formulir belum dapat dimuat."); }
  }
  return <div className="erp-stack">{error && !event && <p ref={errorNotice} tabIndex={-1} className="erp-error" role="alert">{error}</p>}{!event ? <p role="status">{error ? "Halaman tidak tersedia." : "Memuat acara…"}</p> : <>
    <header><h1>{event.title}</h1><p>{new Date(event.starts_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB{event.location && ` · ${event.location}`}</p></header>
    {(event.description || event.poster_url || event.related_url) && <section className="erp-panel erp-stack"><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{event.description}</p>{event.poster_url && <a href={event.poster_url} target="_blank" rel="noopener noreferrer">Lihat poster</a>}{event.related_url && <a href={event.related_url} target="_blank" rel="noopener noreferrer">Informasi terkait</a>}</section>}
    {complete ? <section ref={result} tabIndex={-1} className="erp-panel motion-pop-in" role="status"><h2>Pendaftaran diterima</h2><p>Jawaban Anda sudah tercatat. Terima kasih sudah mendaftar.</p></section>
      : !form ? <p>Acara ini tidak memiliki formulir pendaftaran.</p> : !form.accepting ? <section className="erp-panel"><h2>Pendaftaran ditutup</h2><p>Acara ini sedang tidak menerima pengiriman formulir.</p></section>
      : <section className="erp-panel erp-stack erp-reading-form"><div><h2>{form.schema.title}</h2>{form.schema.description && <p className="erp-record-text">{form.schema.description}</p>}<small>Data digunakan untuk pendaftaran acara ini.</small></div>
        {error && <p ref={errorNotice} tabIndex={-1} className="erp-error" role="alert">{stale ? "Formulir telah diperbarui. Muat versi terbaru, lalu periksa kembali jawaban Anda." : error}</p>}
        {stale && <div><button onClick={reloadForm}>Muat versi terbaru</button></div>}
        <form onSubmit={async submit => { submit.preventDefault(); if (submitting.current || stale) return; submitting.current = true; setBusy(true); setError("");
          try {
            if (!requestId.current) requestId.current = crypto.randomUUID();
            const activeIds = new Set(form.schema.sections.flatMap(section => section.questions.map(question => question.id)));
            const answers = Object.fromEntries(Object.entries(values).filter(([key]) => activeIds.has(key)));
            const website = String(new FormData(submit.currentTarget).get("website") ?? "");
            const response = await fetch(`/api/public/events/${id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form_version_id: form.form_version_id, request_id: requestId.current, answers, website }) });
            const payload = await response.json();
            if (!response.ok) { if (payload.error?.code === "stale_form") setStale(true); throw Error(payload.error?.message ?? "Pendaftaran belum terkirim."); }
            setComplete(true);
          } catch (error) { setError(error instanceof Error ? error.message : "Koneksi terputus. Isian tetap tersimpan; silakan kirim kembali."); }
          finally { submitting.current = false; setBusy(false); }
        }}><div className="erp-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><RegistrationFields key={form.form_version_id} schema={form.schema} values={values} onChange={setValues} disabled={busy || stale}/><div><button type="submit" className="erp-primary" disabled={busy || stale}>{busy ? "Mengirim…" : "Kirim pendaftaran"}</button></div></form>
      </section>}
  </>}</div>;
}
