"use client";

import { ActionTooltip, TooltipGroup } from "../../components/ui/tooltip";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent, ItemList } from "../../lib/erp/types";
import { query } from "../../lib/erp/client";
import LoadingIndicator from "../loading-indicator";
import { EmptyState, LoadState, dateLabel, useResource } from "../ui";

export function jakartaDay(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0,10);
}
export function eventOnDay(event: CalendarEvent, day: string) {
  if (event.starts_at) { const start = new Date(`${day}T00:00:00+07:00`).getTime(); const finish = start + 86400000; return new Date(event.starts_at).getTime() < finish && new Date(event.ends_at ?? event.starts_at).getTime() >= start && (new Date(event.ends_at ?? event.starts_at).getTime() > start || event.starts_at === event.ends_at); }
  return (event.starts_on ?? "") <= day && (event.ends_on ?? event.starts_on ?? "") >= day;
}
const sourceLabel = { AGENDA: "Agenda", TASK: "Tenggat tugas", PROGRAM: "Proker" };
function EventRow({ event, onEdit }: { event: CalendarEvent; onEdit?: (event: CalendarEvent) => void }) {
  return <article className="erp-list-item"><div><small>{sourceLabel[event.source]} · {dateLabel(event.starts_at ?? event.starts_on)}{event.starts_at && ` · ${new Date(event.starts_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })} WIB`}</small><h3>{event.title}</h3>{!event.can_edit && <small>Hanya lihat</small>}</div>{event.source === "AGENDA" ? onEdit && <button onClick={() => onEdit(event)}>{event.can_edit ? "Lihat / edit" : "Lihat agenda"}</button> : <Link className="erp-button" href={event.source === "TASK" ? `/admin/tasks/${event.resource_id}` : `/admin/programs/${event.resource_id}`}>Buka sumber</Link>}</article>;
}
export default function MonthCalendar({ periodId, filter = {}, onAdd, onEdit }: { periodId: string; filter?: Record<string,string | boolean | undefined>; onAdd?: (day: string) => void; onEdit?: (event: CalendarEvent) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const today = jakartaDay(new Date(now)); const [month, setMonth] = useState(today.slice(0,7)); const [selected, setSelected] = useState(today);
  const first = `${month}-01`; const weekday = new Date(`${first}T12:00:00Z`).getUTCDay(); const start = shiftDay(first,-weekday); const end = shiftDay(start,41);
  const resource = useResource<ItemList<CalendarEvent>>(`/calendar-events${query({ period_id: periodId, ...filter, start, end })}`);
  const upcoming = useResource<ItemList<CalendarEvent>>(`/calendar-events${query({ period_id: periodId, ...filter, start: today, end: shiftDay(today,30) })}`);
  function choose(day: string) { setSelected(day); setMonth(day.slice(0,7)); }
  function changeMonth(amount: number) { const date = new Date(`${first}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); const day = date.toISOString().slice(0,10); choose(day); }
  const dayItems = resource.data?.items.filter(event => eventOnDay(event,selected)) ?? [];
  const nextItems = [...(upcoming.data?.items ?? [])].filter(event => event.ends_at ? new Date(event.ends_at).getTime() >= now : (event.ends_on ?? event.starts_on ?? "") >= today).sort((a,b) => (a.starts_at ?? a.starts_on ?? "").localeCompare(b.starts_at ?? b.starts_on ?? ""));
  return <TooltipGroup><div className="erp-calendar-stack"><section className="erp-calendar" aria-label="Kalender bulanan"><div className="erp-row-between erp-calendar-toolbar"><h2>{new Date(`${first}T12:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" })}</h2><div className="erp-row"><ActionTooltip label="Bulan sebelumnya" trigger={<button aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)}><ChevronLeft size={18}/></button>}/><button onClick={() => choose(today)}>Hari ini</button><ActionTooltip label="Bulan berikutnya" trigger={<button aria-label="Bulan berikutnya" onClick={() => changeMonth(1)}><ChevronRight size={18}/></button>}/></div></div>
    {resource.error && <LoadState error={resource.error} reload={resource.reload}/>}
    {resource.refreshing && <LoadingIndicator label="Memuat kegiatan…"/>}
    <div className="erp-calendar-weekdays" aria-hidden="true">{["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="erp-calendar-days" aria-busy={resource.refreshing}>{Array.from({ length: 42 },(_,i) => shiftDay(start,i)).map(day => { const events = resource.data?.items.filter(event => eventOnDay(event,day)) ?? []; return <div key={day} className={`erp-calendar-cell ${day.slice(0,7) !== month ? "is-adjacent" : ""} ${selected === day ? "is-selected" : ""}`}><button className={`erp-calendar-date ${today === day ? "is-today" : ""}`} aria-label={`${dateLabel(day)}, ${resource.data ? `${events.length} kegiatan` : "memuat kegiatan"}`} aria-pressed={selected === day} aria-current={today === day ? "date" : undefined} onClick={() => choose(day)} onKeyDown={e => { const delta: Record<string,number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -7, ArrowDown: 7 }; if (e.key in delta) { e.preventDefault(); choose(shiftDay(day,delta[e.key])); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date="${shiftDay(day,delta[e.key])}"]`)?.focus()); } }} data-date={day}>{Number(day.slice(-2))}<span className="erp-calendar-mobile-count" aria-hidden="true">{events.length ? `${events.length}` : ""}</span></button><div className="erp-calendar-chips">{events.slice(0,2).map(event => <ActionTooltip key={event.id} label={`${sourceLabel[event.source]}: ${event.title}`} trigger={<button className={`erp-calendar-chip erp-event-${event.source}`} onClick={() => { choose(day); onEdit?.(event); }}>{event.title}</button>}/>)}{events.length > 2 && <button className="erp-calendar-more" onClick={() => choose(day)}>+{events.length - 2} lainnya</button>}</div></div>; })}</div>
    </section><section className="erp-calendar-detail" aria-label="Kegiatan tanggal terpilih"><div className="erp-row-between"><h3>{dateLabel(selected)}</h3>{onAdd && <button onClick={() => onAdd(selected)}>Tambah agenda</button>}</div>{resource.data && (!dayItems.length ? <EmptyState title="Belum ada kegiatan pada tanggal ini" description={onAdd ? "Tambahkan agenda untuk menjadwalkan kegiatan." : "Pilih tanggal lain atau buka Kalender untuk menambahkan agenda."}/> : dayItems.map(event => <EventRow key={event.id} event={event} onEdit={onEdit}/>))}</section>
    <section className="erp-calendar-upcoming"><h3>Agenda mendatang</h3><p className="erp-muted">Kegiatan berlangsung dan 30 hari ke depan.</p>{upcoming.error && <LoadState error={upcoming.error} reload={upcoming.reload}/>} {!upcoming.data ? (!upcoming.error && <LoadState error="" reload={upcoming.reload}/>) : !nextItems.length ? <EmptyState title="Belum ada agenda mendatang" description="Agenda, tenggat tugas, dan jadwal Proker akan muncul di sini."/> : nextItems.map(event => <EventRow key={event.id} event={event} onEdit={onEdit}/>)}</section>
  </div></TooltipGroup>;
}
