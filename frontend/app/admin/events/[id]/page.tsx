"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { PublicEvent } from "../../../lib/erp/p1-types";
import { api } from "../../../lib/erp/client";
import { Feedback, LoadState, PageHeading, useAction, useResource } from "../../ui";
import EventEditor from "../event-editor";
import FormPanel from "../form-panel";
import ResponsesPanel from "../responses-panel";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource<PublicEvent>(`/events/${id}`);
  const [tab, setTab] = useState("event");
  const [openedBuilder, setOpenedBuilder] = useState(false);
  const [editing, setEditing] = useState<PublicEvent | null>(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  if (!resource.data) return <LoadState error={resource.error} reload={resource.reload}/>;
  const event = resource.data;
  return <><PageHeading title={event.title} description={event.frozen ? "Arsip hanya dapat dibaca." : "Publikasi acara dan pendaftaran peserta."}><Link className="erp-button" href={`/events/${id}`} target="_blank">Lihat halaman publik</Link></PageHeading><Feedback {...action}/>
    <div className="erp-tabs"><button aria-pressed={tab === "event"} onClick={() => setTab("event")}>Acara</button>{(event.capabilities.edit || event.capabilities.responses) && <button aria-pressed={tab === "form"} onClick={() => { setOpenedBuilder(true); setTab("form"); }}>Form Builder</button>}{event.capabilities.responses && <button aria-pressed={tab === "responses"} onClick={() => setTab("responses")}>Respons & ekspor</button>}</div>
    {tab === "event" && <section className="erp-panel erp-stack erp-reading-form">
      <header className="erp-panel-heading"><h2>Detail acara</h2>{event.capabilities.edit && <button className="erp-primary" aria-haspopup="dialog" onClick={() => { setSaved(false); setEditing(event); }}>Edit acara</button>}</header>
      {saved && <p className="erp-success" role="status">Perubahan acara tersimpan.</p>}
      <dl className="erp-form-grid erp-record-details">
        <div><dt>Status publikasi</dt><dd>{({ DRAFT: "Draft", PUBLISHED: "Terbit", UNPUBLISHED: "Tidak ditampilkan" })[event.status] ?? event.status}</dd></div>
        <div><dt>Lokasi</dt><dd>{event.location || "Belum ditentukan"}</dd></div>
        <div><dt>Mulai</dt><dd>{new Date(event.starts_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</dd></div>
        <div><dt>Selesai</dt><dd>{new Date(event.ends_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</dd></div>
      </dl>
      <p className="erp-record-text">{event.description || "Belum ada deskripsi."}</p>
      {(event.poster_url || event.related_url) && <div className="erp-row">
        {event.poster_url && <a className="erp-back-link" href={event.poster_url} target="_blank" rel="noopener noreferrer">Lihat poster</a>}
        {event.related_url && <a className="erp-back-link" href={event.related_url} target="_blank" rel="noopener noreferrer">Informasi terkait</a>}
      </div>}
      {event.capabilities.edit && <div><button className="erp-danger" disabled={action.busy} onClick={() => {
        if (window.confirm("Hapus publikasi acara? Respons lama tetap tersimpan.")) action.run(async () => {
          await api(`/events/${id}`, { method: "DELETE", body: { expected_version: event.version } });
          window.location.assign("/admin/events");
        });
      }}>Hapus acara</button></div>}
    </section>}
    {editing && event.capabilities.edit && <EventEditor event={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); setSaved(true); resource.reload(); }}/>}
    {openedBuilder && (event.capabilities.edit || event.capabilities.responses) && <div hidden={tab !== "form"}><FormPanel event={event}/></div>}
    {tab === "responses" && <ResponsesPanel event={event}/>}
  </>;
}
