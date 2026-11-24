"use client";

import Disclosure from "../../../components/ui/disclosure";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, query } from "../../../lib/erp/client";
import type { Activity, Budget, Committee, Group, ItemList, Person, Program } from "../../../lib/erp/types";
import { DateRangeFields, FormActions, FormSurface, SearchableSelect } from "../../form-surface";
import BudgetPanel from "./budget-panel";
import { useErp } from "../../erp-context";
import { Feedback, LoadState, PageHeading, RevealAction, dateLabel, formText, rupiah, useAction, useDirectory, useResource } from "../../ui";
import TaskBoard from "../../tasks/task-board";
import { ActualsPanel, DocumentsPanel, ReportPanel } from "./p1-panels";

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useErp();
  const initialTab = useSearchParams().get("tab");
  const [tab, setTab] = useState(initialTab === "documents" ? "documents" : "summary");
  const [editing, setEditing] = useState<Program | null>(null);
  const [assigning, setAssigning] = useState(false);
  const resource = useResource<Program>(`/programs/${id}`);
  const committee = useResource<Committee>(`/programs/${id}/committee`);
  const budget = useResource<Budget>(`/programs/${id}/budget`);
  const people = useDirectory(resource.data?.period_id ?? me.period_id);
  const action = useAction();
  const reload = () => { resource.reload(); committee.reload(); budget.reload(); };
  if (!resource.data) return <LoadState error={resource.error} reload={resource.reload}/>;
  const program = resource.data;
  const path = `/programs/${id}`;
  return <><PageHeading title={program.name} description={`Ketua Pelaksana: ${program.chairperson_name}`}>
    <span className={`erp-pill ${program.status === "ACTIVE" ? "erp-pill-active" : ""}`}>{program.period_archived ? "Periode arsip" : program.status === "ACTIVE" ? "Aktif" : "Ditutup"}{!program.capabilities.edit ? " · Hanya lihat" : ""}</span>
  </PageHeading><div className="erp-tabs">{[["summary", "Ringkasan"], ["committee", "Kepanitiaan"], ["budget", "RAB"], ["actuals", "Realisasi"], ["documents", "Dokumen"], ["report", "LPJ"], ["tasks", "Tugas"], ["access", "Pengelola"], ["activity", "Aktivitas"]].map(([value, label]) =>
    <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
    {!editing && <Feedback {...action}/>}
    {tab === "summary" && <section className="erp-panel erp-stack">
      <header className="erp-panel-heading"><h2>Informasi Proker</h2>{program.capabilities.edit && <button className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setEditing(program); }}>Edit Proker</button>}</header>
      <div className="erp-row-between"><span className="erp-muted">{dateLabel(program.starts_on)}{program.ends_on ? ` – ${dateLabel(program.ends_on)}` : ""}</span><span className="erp-scope-label">{program.unfinished_tasks ?? 0} tugas belum selesai</span></div>
      <p className="erp-record-text">{program.description || "Belum ada deskripsi."}</p>
      {program.status === "ACTIVE" && <div className="erp-row">
        {program.capabilities.structure && <button onClick={() => setTab("committee")}>Susun kepanitiaan</button>}
        <Link className="erp-button" href={`/admin/programs/${id}/tasks`}>Buka papan tugas</Link>
        {!program.capabilities.edit && !program.period_archived &&
          <p className="erp-muted">Untuk ikut mengelola kegiatan, hubungi {program.chairperson_name} selaku Ketua Pelaksana.</p>}
      </div>}
      {program.capabilities.close && <div style={{ borderTop: "1px solid var(--erp-line)", paddingTop: 20 }}><h3>Tutup Proker</h3><p className="erp-muted">Setelah ditutup, seluruh isi Proker menjadi arsip yang hanya dapat dibaca.</p>
        {!!program.unfinished_tasks && <p><Link href={`/admin/programs/${id}/tasks`}>Periksa tugas yang belum selesai</Link></p>}
        <button className="erp-danger" disabled={action.busy} onClick={() => {
          if (!window.confirm(`Tutup ${program.name}?\n${program.unfinished_tasks ?? 0} tugas belum selesai akan tetap tercatat.\nTotal RAB: ${budget.data ? rupiah(budget.data.total_rupiah) : "belum dimuat"}.\nSeluruh isi Proker akan dikunci.`)) return;
          action.run(async () => { await api(path + "/close", { method: "POST", body: { expected_version: program.version, confirmed_unfinished: true } }); reload(); }, "Proker ditutup. Histori tetap tersimpan.");
        }}>Tutup Proker</button></div>}
    </section>}
    {editing && program.capabilities.edit && <FormSurface drawer title="Edit Proker" busy={action.busy} onClose={() => setEditing(null)}>
      {close => <form onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        action.run(async () => {
          await api(path, { method: "PATCH", body: { expected_version: editing.version, name: formText(form, "name"), description: formText(form, "description"), starts_on: formText(form, "starts_on") || null, ends_on: formText(form, "ends_on") || null } });
          setEditing(null); reload();
        });
      }}>
        <Feedback {...action}/>
        <label>Nama Proker *<input name="name" defaultValue={editing.name} required maxLength={160}/></label>
        <label>Deskripsi<textarea name="description" defaultValue={editing.description} maxLength={10000}/></label>
        <DateRangeFields start={{ name: "starts_on", label: "Tanggal mulai", value: editing.starts_on ?? "" }} end={{ name: "ends_on", label: "Tanggal akhir", value: editing.ends_on ?? "" }}/>
        <FormActions><button disabled={action.busy} className="erp-primary">{action.busy ? "Menyimpan…" : "Simpan perubahan"}</button><button type="button" onClick={close}>Batal</button></FormActions>
      </form>}
    </FormSurface>}
    {tab === "committee" && (!committee.data || !people.data ? <LoadState error={committee.error || people.error} reload={() => { committee.reload(); people.reload(); }}/> : <CommitteePanel key={JSON.stringify(committee.data.groups)} program={program} data={committee.data} people={people.data.items} reload={reload}/>)}
    {tab === "budget" && (!budget.data ? <LoadState error={budget.error} reload={budget.reload}/> : <BudgetPanel key={program.id} program={program} data={budget.data} reload={reload}/>)}
    {tab === "tasks" && <TaskBoard program={program}/>}
    {tab === "actuals" && <ActualsPanel program={program}/>}
    {tab === "documents" && <DocumentsPanel program={program}/>}
    {tab === "report" && <ReportPanel program={program}/>}
    {tab === "activity" && <ActivityPanel programId={program.id}/>}
    {tab === "access" && (!people.data ? <LoadState error={people.error} reload={people.reload}/> : <section className="erp-panel erp-stack"><header className="erp-panel-heading"><h2>Pengelola Proker</h2>{program.capabilities.assign && <button className="erp-primary" aria-expanded={assigning} onClick={() => setAssigning(!assigning)}>Tambah Pengelola</button>}</header><p className="erp-muted">Satu pengelola dapat memiliki beberapa sumber akses. Pencabutan manual hanya mengakhiri sumber manual.</p>
      <div className="erp-list">{Array.from(new Set(program.assignments?.map(item => item.user_id))).map(userId => <div className="erp-list-item" key={userId}>
        <div><h3>{people.data?.items.find(person => person.id === userId)?.display_name ?? "Pengurus"}</h3><p>{program.assignments?.filter(item => item.user_id === userId).map(item => ({ CREATOR: "Pencipta", CHAIRPERSON: "Ketupel", MANUAL: "Penugasan manual", TASK_PIC: "PIC tugas" }[item.source] ?? item.source)).join(", ")}</p></div>
        {program.capabilities.assign && program.assignments?.some(item => item.user_id === userId && item.source === "MANUAL") && <button disabled={action.busy} onClick={() => action.run(async () => { await api(path + `/assignments/${userId}`, { method: "DELETE" }); reload(); })}>Cabut manual</button>}
      </div>)}</div>
      {program.capabilities.assign && assigning && <form id="program-manager-form" className="erp-inline-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); action.run(async () => { await api(path + "/assignments", { method: "POST", body: { user_id: formText(form, "user_id") } }); setAssigning(false); reload(); }); }}>
        <SearchableSelect name="user_id" label="Pengurus" required empty="Pilih pengurus" options={people.data.items.map(person => ({ value: person.id, label: person.display_name }))}/><div><button disabled={action.busy}>Berikan akses</button></div>
      </form>}
      {program.capabilities.change_chairperson && <Disclosure summary={<>Ganti Ketua Pelaksana</>}><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); action.run(async () => { await api(path + "/chairperson", { method: "PUT", body: { expected_version: program.version, chairperson_name: formText(form, "chairperson_name"), chairperson_user_id: formText(form, "chairperson_user_id") || null } }); reload(); }); }}>
        <label>Nama Ketua Pelaksana<input name="chairperson_name" defaultValue={program.chairperson_name} required maxLength={160}/></label>
        <SearchableSelect label="Akun Ketua Pelaksana" name="chairperson_user_id" defaultValue={program.chairperson_user_id ?? ""} empty="Tanpa akun" options={people.data.items.map(person => ({ value: person.id, label: person.display_name }))}/>
        <p className="erp-muted">Tugas, RAB, dan panitia tetap tersimpan. Hak struktur berpindah ke Ketupel baru.</p><div><button disabled={action.busy}>Simpan Ketupel</button></div>
      </form></Disclosure>}
    </section>)}
  </>;
}

function ActivityPanel({ programId }: { programId: string }) {
  const [offset, setOffset] = useState(0);
  const resource = useResource<ItemList<Activity>>(`/programs/${programId}/activity${query({ offset })}`);
  const labels: Record<string, string> = { "program.created": "Membuat Proker", "program.updated": "Mengubah Proker", "program.closed": "Menutup Proker", "program.chairperson_changed": "Mengganti Ketua Pelaksana", "assignment.granted": "Memberikan akses manual", "assignment.revoked": "Mencabut akses manual", "task.saved": "Menyimpan tugas", "task.status_changed": "Memindahkan status tugas", "task.removed": "Menghapus tugas", "budget.saved": "Menyimpan item RAB", "budget.removed": "Menghapus item RAB", "committee.structure_updated": "Mengubah struktur panitia", "committee.member_saved": "Menyimpan nama panitia", "committee.member_removed": "Menghapus nama panitia" };
  return <section className="erp-panel"><h2>Riwayat aktivitas</h2>{!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
    {!resource.data.items.length && <p className="erp-empty">Belum ada aktivitas pada Proker ini. Perubahan berikutnya akan tercatat di sini.</p>}{resource.data.items.map(event => <article key={event.id} className="erp-list-item"><div><h3>{labels[event.action] ?? "Perubahan Proker"}</h3><p>{event.actor_name} · {dateLabel(event.occurred_at)} · {new Date(event.occurred_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
      {event.action === "program.closed" && <p>{String(event.after?.unfinished_tasks ?? 0)} tugas belum selesai tetap tersimpan.</p>}
      {event.action === "task.saved" && event.after?.program_grant != null && <p>PIC berakun memperoleh grant akses Proker.</p>}
    </div></article>)}
    <div className="erp-row" style={{ marginTop: 16 }}>{offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - 30))}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
  </>}</section>;
}

function CommitteePanel({ program, data, people, reload }: { program: Program; data: Committee; people: Person[]; reload: () => void }) {
  const action = useAction();
  const [groups, setGroups] = useState<Group[]>(data.groups);
  const [structureOpen, setStructureOpen] = useState(false);
  const [editing, setEditing] = useState<Committee["members"][number] | null>(null);
  const path = `/programs/${program.id}/committee`;
  function move(index: number, direction: number) {
    const next = [...groups]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setGroups(next.map((group, index) => ({ ...group, sort_order: index })));
  }
  return <div className="erp-stack"><Feedback {...action}/><section className="erp-panel erp-stack"><header className="erp-panel-heading"><h2>Struktur panitia</h2>{program.capabilities.structure && <button aria-expanded={structureOpen} onClick={() => { if (structureOpen && JSON.stringify(groups) !== JSON.stringify(data.groups) && !window.confirm("Buang perubahan struktur yang belum disimpan?")) return; setGroups(data.groups); setStructureOpen(!structureOpen); }}>{structureOpen ? "Tutup editor struktur" : "Edit struktur"}</button>}</header><p className="erp-muted">Ketua Pelaksana: {program.chairperson_name}. Bagan ini khusus Proker ini.</p>
    {groups.length === 0 && <p className="erp-empty">Belum ada struktur. Ketupel dapat memakai template atau menyusun sendiri.</p>}
    {program.capabilities.structure && !data.groups.length && <div><button disabled={action.busy} onClick={() => action.run(async () => { await api(path + "/template", { method: "POST", body: { expected_version: program.version } }); reload(); })}>Gunakan template awal</button></div>}
    {program.capabilities.structure && structureOpen ? <div className="erp-stack">
      {groups.map((group, index) => <div key={group.id} className="erp-form-grid" style={{ borderBottom: "1px solid var(--erp-line)", paddingBottom: 14 }}>
        <label>Nama posisi / divisi<input value={group.label} maxLength={120} onChange={event => setGroups(groups.map(row => row.id === group.id ? { ...row, label: event.target.value } : row))}/></label>
        <label>Kelompok induk<select value={group.parent_id ?? ""} onChange={event => setGroups(groups.map(row => row.id === group.id ? { ...row, parent_id: event.target.value || null } : row))}><option value="">Tanpa induk</option>{groups.filter(row => row.id !== group.id).map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
        <div className="erp-row erp-full"><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Naik</button><button type="button" disabled={index === groups.length - 1} onClick={() => move(index, 1)}>Turun</button><button type="button" className="erp-danger" onClick={() => setGroups(groups.filter(row => row.id !== group.id))}>Hapus</button></div>
      </div>)}
      <div className="erp-row"><button onClick={() => setGroups([...groups, { id: crypto.randomUUID(), label: "Divisi baru", parent_id: null, sort_order: groups.length }])}>Tambah posisi / divisi</button>
        <button className="erp-primary" disabled={action.busy || groups.some(group => !group.label.trim())} onClick={() => action.run(async () => { await api(path + "/structure", { method: "PUT", body: { expected_version: program.version, groups } }); setStructureOpen(false); reload(); })}>Simpan struktur</button></div>
    </div> : <div className="erp-list">{groups.map(group => <div key={group.id} className="erp-list-item"><span>{group.parent_id ? `${groups.find(row => row.id === group.parent_id)?.label} / ` : ""}{group.label}</span></div>)}</div>}
  </section><section className="erp-panel"><header className="erp-panel-heading"><h2>Nama panitia</h2>{program.capabilities.edit && <RevealAction label={editing ? "Lanjutkan Edit" : "Tambah Panitia"} target="program-member-form" primary/>}</header><p className="erp-muted">Panitia boleh tanpa akun. Pencatatan nama tidak memberikan akses edit aplikasi.</p>
    {!data.members.length && <p className="erp-empty">Belum ada nama panitia. Pengelola dapat menambahkan nama melalui Tambah nama panitia di bagian ini.</p>}
    {data.members.map(member => <div className="erp-list-item" key={member.id}><div><h3>{member.display_name}</h3><p>{member.role}{member.group_id ? ` · ${data.groups.find(group => group.id === member.group_id)?.label ?? ""}` : ""}</p></div>
      {program.capabilities.edit && <div className="erp-row"><button onClick={() => { setEditing(member); requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#program-member-form input")?.focus()); }}>Edit</button><button className="erp-danger" disabled={action.busy} onClick={() => { if (window.confirm(`Hapus ${member.display_name} dari panitia?`)) action.run(async () => { await api(path + `/members/${member.id}`, { method: "DELETE", body: { expected_version: program.version } }); reload(); }); }}>Hapus</button></div>}
    </div>)}
    {program.capabilities.edit && <Disclosure id="program-member-form" open={!!editing} summary={<>{editing ? "Edit panitia" : "Tambah nama panitia"}</>}><form key={editing?.id ?? "new"} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => { await api(path + "/members" + (editing ? `/${editing.id}` : ""), { method: editing ? "PUT" : "POST", body: { expected_version: program.version,
      display_name: formText(form, "display_name"), role: formText(form, "role"), group_id: formText(form, "group_id") || null, user_id: formText(form, "user_id") || null } }); element.reset(); setEditing(null); reload(); }); }}>
      <div className="erp-form-grid"><label>Nama<input name="display_name" defaultValue={editing?.display_name} required maxLength={160}/></label><label>Peran<input name="role" defaultValue={editing?.role} required maxLength={120}/></label>
        <label>Kelompok<select name="group_id" defaultValue={editing?.group_id ?? ""}><option value="">Tanpa kelompok</option>{data.groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
        <SearchableSelect label="Akun terkait (opsional)" name="user_id" defaultValue={editing?.user_id ?? ""} empty="Tanpa akun" options={people.map(person => ({ value: person.id, label: person.display_name }))}/></div>
      <div className="erp-row"><button className="erp-primary" disabled={action.busy}>Simpan panitia</button>{editing && <button type="button" onClick={() => setEditing(null)}>Batal edit</button>}</div>
    </form></Disclosure>}
  </section></div>;
}

