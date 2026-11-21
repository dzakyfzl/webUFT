"use client";

import Disclosure from "../../components/ui/disclosure";

import Link from "next/link";
import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { HistorySummary, ItemList, Period, Program, Task } from "../../lib/erp/types";
import type { PublicEvent, ShortLink } from "../../lib/erp/p1-types";
import { useErp } from "../erp-context";
import { Feedback, LoadState, PageHeading, dateLabel, formText, statusLabels, useAction, useResource } from "../ui";

export default function HistoryPage() {
  const { me, refresh } = useErp();
  const periods = useResource<ItemList<Period>>("/periods");
  const [selected, setSelected] = useState("");
  const [programOffset, setProgramOffset] = useState(0);
  const [taskOffset, setTaskOffset] = useState(0);
  const action = useAction();
  const successors = periods.data?.items.filter(period => !period.archived_at && period.id !== me.period_id) ?? [];
  const id = selected || periods.data?.items.find(period => !!period.archived_at)?.id;
  const history = useResource<HistorySummary>(id ? `/periods/${id}/history` : null);
  const programs = useResource<ItemList<Program>>(id ? `/programs${query({ period_id: id, view: "archive", limit: 30, offset: programOffset })}` : null);
  const tasks = useResource<ItemList<Task>>(id ? `/tasks${query({ period_id: id, archive: true, limit: 50, offset: taskOffset })}` : null);
  return <><PageHeading title="Jejak Kepengurusan" description="Progres setiap periode tetap tersimpan, termasuk pekerjaan yang belum selesai."/><Feedback {...action}/>
    {!periods.data ? <LoadState error={periods.error} reload={periods.reload}/> : <div className="erp-stack">
      <label className="erp-compact-field">Periode arsip<select value={id ?? ""} onChange={event => { setSelected(event.target.value); setProgramOffset(0); setTaskOffset(0); }}><option value="" disabled>Pilih periode</option>{periods.data.items.filter(period => period.archived_at).map(period => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
      {!id && <section className="erp-panel"><h2>Ringkasan periode</h2><p className="erp-empty">Belum ada periode yang diarsipkan. Progres periode aktif tetap tersedia sampai diarsipkan oleh Ketua Umum.</p>{["Program Kerja", "Tugas", "Acara & formulir", "Short link"].map(label => <section key={label}><h3>{label}</h3><p className="erp-muted">Belum ada data arsip untuk ditampilkan.</p></section>)}</section>}
      {id && (!history.data ? <LoadState error={history.error} reload={history.reload}/> : <section className="erp-panel erp-stack"><div><h2>{history.data.name}</h2><p className="erp-muted">Diarsipkan {dateLabel(history.data.archived_at)}{history.data.archived_by_name ? ` oleh ${history.data.archived_by_name}` : ""} · Hanya lihat</p></div>
        <p>{history.data.program_count} Proker · {history.data.tasks.TODO} belum dikerjakan · {history.data.tasks.IN_PROGRESS} dalam proses · {history.data.tasks.REVIEW} perlu ditinjau · {history.data.tasks.DONE} selesai</p>
        <h3>Program Kerja</h3>{!programs.data ? <LoadState error={programs.error} reload={programs.reload}/> : programs.data.items.map(program => <Link key={program.id} className="erp-list-item" href={`/admin/programs/${program.id}`}><span>{program.name}</span><span className="erp-pill">{program.status === "CLOSED" ? "Ditutup" : "Belum ditutup saat arsip"}</span></Link>)}
        <div className="erp-row">{programOffset > 0 && <button onClick={() => setProgramOffset(Math.max(0, programOffset - 30))}>Proker sebelumnya</button>}{programs.data?.has_more && <button onClick={() => setProgramOffset(programOffset + 30)}>Proker berikutnya</button>}</div>
        <h3>Tugas</h3>{!tasks.data ? <LoadState error={tasks.error} reload={tasks.reload}/> : tasks.data.items.map(task => <Link key={task.id} className="erp-list-item" href={`/admin/tasks/${task.id}`}><span>{task.title}</span><span className="erp-pill">{statusLabels[task.status]}</span></Link>)}
        <div className="erp-row">{taskOffset > 0 && <button onClick={() => setTaskOffset(Math.max(0, taskOffset - 50))}>Tugas sebelumnya</button>}{tasks.data?.has_more && <button onClick={() => setTaskOffset(taskOffset + 50)}>Tugas berikutnya</button>}</div>
        <P1History key={id} periodId={id}/>
      </section>)}
      {me.capabilities.archive_period && <section className="erp-panel"><Disclosure summary={<>Arsipkan periode aktif</>}><p className="erp-muted">Seluruh progres periode akan dikunci. Tugas belum selesai tetap tersimpan. Siapkan pengurus penerus melalui Organisasi & Akun terlebih dahulu.</p>
        <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget);
          if (!window.confirm("Arsipkan seluruh progres periode ini? Setelah diarsipkan, data hanya dapat dibaca dan tidak dapat dibuka kembali.")) return;
          action.run(async () => { await api(`/periods/${me.period_id}/archive`, { method: "POST", body: { successor_period_id: formText(form, "successor_period_id"), confirmed: true } }); periods.reload(); await refresh(); }, "Periode diarsipkan.");
        }}><label className="erp-compact-field">Periode penerus *<select name="successor_period_id" required disabled={!successors.length}><option value="">Pilih periode penerus</option>{successors.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>{!successors.length && <small>Siapkan periode penerus di Organisasi &amp; Akun.</small>}<div><button className="erp-danger" disabled={action.busy || !successors.length}>Arsipkan Periode</button></div></form>
      </Disclosure></section>}
    </div>}
  </>;
}

function P1History({ periodId }: { periodId: string }) {
  const [eventOffset, setEventOffset] = useState(0);
  const [linkOffset, setLinkOffset] = useState(0);
  const events = useResource<ItemList<PublicEvent>>(`/events${query({ period_id: periodId, offset: eventOffset })}`);
  const links = useResource<ItemList<ShortLink>>(`/links${query({ period_id: periodId, offset: linkOffset })}`);
  return <><h3>Acara & formulir periode ini</h3>{!events.data ? <LoadState error={events.error} reload={events.reload}/> : <>
    {!events.data.items.length && <p className="erp-muted">Belum ada acara pada arsip ini.</p>}
    {events.data.items.map(event => <Link key={event.id} className="erp-list-item" href={`/admin/events/${event.id}`}><span>{event.title}</span><span className="erp-pill">{event.status} · Hanya lihat</span></Link>)}
    <div className="erp-row">{eventOffset > 0 && <button onClick={() => setEventOffset(eventOffset - 30)}>Acara sebelumnya</button>}{events.data.has_more && <button onClick={() => setEventOffset(eventOffset + 30)}>Acara berikutnya</button>}</div>
  </>}<h3>Short link periode ini</h3>{!links.data ? <LoadState error={links.error} reload={links.reload}/> : <>
    {!links.data.items.length && <p className="erp-empty">Belum ada tautan pada arsip ini.</p>}{links.data.items.map(link => <a key={link.id} href={`/link/${link.slug}`} className="erp-list-item"><span>/link/{link.slug}</span><span className="erp-pill">{link.active ? "Aktif" : "Nonaktif"}</span></a>)}
    <div className="erp-row">{linkOffset > 0 && <button onClick={() => setLinkOffset(linkOffset - 30)}>Tautan sebelumnya</button>}{links.data.has_more && <button onClick={() => setLinkOffset(linkOffset + 30)}>Tautan berikutnya</button>}</div>
  </>}</>;
}
