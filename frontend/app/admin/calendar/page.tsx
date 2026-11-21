"use client";

import MonthCalendar, { jakartaDay } from "./month-calendar";
import { DateRangeFields, FormActions, FormSurface } from "../form-surface";
import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { CalendarEvent, ItemList, ScopeType, Unit } from "../../lib/erp/types";
import { useErp } from "../erp-context";
import { Feedback, PageHeading, formText, useAction, useProgramChoices, useResource } from "../ui";

function localInput(value?: string) {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 7 * 3600000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { me } = useErp();
  const [newDay, setNewDay] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState("mine");
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [newScope, setNewScope] = useState("ORGANIZATION:");
  const action = useAction();
  const units = useResource<ItemList<Unit>>(`/units${query({ period_id: me.period_id })}`);
  const programs = useProgramChoices(me.period_id);
  const unit = units.data?.items.find(unit => unit.id === view);
  const selectedProgram = programs.items.find(row => `PROGRAM:${row.id}` === view);
  const scopes = [{ value: "ORGANIZATION:", label: "Umum UKM" },
    ...me.units.filter(row => row.kind === "DEPARTMENT" || row.kind === "DIVISION").map(unit => ({ value: `${unit.kind}:${unit.id}`, label: unit.name })),
    ...(programs.items).filter(program => program.capabilities.edit).map(program => ({ value: `PROGRAM:${program.id}`, label: program.name }))];
  const canAdd = !me.periods.find(p => p.id === me.period_id)?.archived_at
    && (["mine", "all", "ORGANIZATION"].includes(view) || me.units.some(row => row.id === view) || !!selectedProgram?.capabilities.edit);

  function openAgenda(day: string) {
    action.clear();
    setEditing(null);
    setNewScope(selectedProgram?.capabilities.edit ? `PROGRAM:${selectedProgram.id}`
      : unit && me.units.some(row => row.id === unit.id) ? `${unit.kind}:${unit.id}` : "ORGANIZATION:");
    setNewDay(day);
    setFormOpen(true);
  }

  return <><PageHeading title="Kalender" description="Agenda, tenggat tugas, dan jadwal Proker.">
    {canAdd && <button type="button" className="erp-primary" onClick={() => openAgenda(jakartaDay())}>Tambah Agenda</button>}
  </PageHeading>
    <div className="erp-row" style={{ marginBottom: 20 }}><label>Tampilan<select value={view} onChange={event => setView(event.target.value)}><option value="mine">Jadwal Saya</option><option value="all">Semua agenda</option><option value="ORGANIZATION">Umum UKM</option>{units.data?.items.filter(row => row.kind === "DEPARTMENT" || row.kind === "DIVISION").map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}{programs.items.map(row => <option key={row.id} value={`PROGRAM:${row.id}`}>{row.name} · Proker</option>)}</select></label><span className="erp-muted">Waktu Indonesia Barat (WIB)</span></div>{!formOpen && <Feedback {...action}/>}<div className="erp-stack">
      {formOpen && <FormSurface drawer title={editing ? editing.can_edit ? "Edit agenda" : "Detail agenda" : "Agenda baru"} busy={action.busy} onClose={() => { setEditing(null); setFormOpen(false); }}>{close => <form id="agenda-form" key={editing?.id ?? newDay ?? "new"} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => {
        const [kind, id] = newScope.split(":");
        const body = { title: formText(form, "title"), starts_at: new Date(formText(form, "starts_at") + "+07:00").toISOString(), ends_at: new Date(formText(form, "ends_at") + "+07:00").toISOString(),
          ...(editing ? { expected_version: editing.version } : { period_id: me.period_id, scope_type: kind as ScopeType, scope_id: id || null }) };
        await api(`/calendar-events${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body });
        element.reset(); setEditing(null); setFormOpen(false);
      }); }}><Feedback {...action}/><fieldset disabled={!!me.periods.find(p => p.id === me.period_id)?.archived_at || !!editing && !editing.can_edit} className="erp-agenda-fields"><label>Judul *<input name="title" defaultValue={editing?.title} required maxLength={160}/></label>
        {!editing && <label>Papan asal<select value={newScope} onChange={event => setNewScope(event.target.value)}>{scopes.map(scope => <option key={scope.value} value={scope.value}>{scope.label}</option>)}</select></label>}
        <DateRangeFields dateTime required
          start={{ name: "starts_at", label: "Mulai", value: editing ? localInput(editing.starts_at) : newDay ? `${newDay}T09:00` : "" }}
          end={{ name: "ends_at", label: "Selesai", value: editing ? localInput(editing.ends_at) : newDay ? `${newDay}T10:00` : "" }}/>
        </fieldset><p className="erp-muted">Waktu menggunakan WIB. Tanggal tugas dan Proker diubah melalui sumbernya.</p><FormActions>{(!editing || editing.can_edit) && <button className="erp-primary" disabled={action.busy || !!me.periods.find(p => p.id === me.period_id)?.archived_at}>{action.busy ? "Menyimpan…" : "Simpan agenda"}</button>}<button type="button" onClick={close} disabled={action.busy}>{editing && !editing.can_edit ? "Tutup" : "Batal"}</button>{editing?.can_edit && <button type="button" className="erp-danger" disabled={action.busy} onClick={() => { if (window.confirm(`Hapus agenda ${editing.title}?`)) action.run(async () => { await api(`/calendar-events/${editing.id}`, { method: "DELETE", body: { expected_version: editing.version } }); setEditing(null); setFormOpen(false); }); }}>Hapus agenda</button>}</FormActions>
      </form>}</FormSurface>}
    <MonthCalendar periodId={me.period_id} filter={{ mine: view === "mine", scope_type: selectedProgram ? "PROGRAM" : view === "ORGANIZATION" ? "ORGANIZATION" : unit?.kind, scope_id: selectedProgram?.id ?? unit?.id }} onAdd={canAdd ? openAgenda : undefined} onEdit={event => {
      if (event.source !== "AGENDA") {
        window.location.assign(event.source === "TASK" ? `/admin/tasks/${event.resource_id}` : `/admin/programs/${event.resource_id}`);
        return;
      }
      action.clear();
      setEditing(event);
      setFormOpen(true);
    }}/>
    </div>
  </>;
}
