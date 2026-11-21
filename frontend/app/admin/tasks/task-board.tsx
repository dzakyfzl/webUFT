"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { Columns3, GripVertical, List, Pencil, Plus, UserRound } from "lucide-react";
import DynamicButton from "../../components/ui/dynamic-button";
import { api, query } from "../../lib/erp/client";
import type { ItemList, Program, ScopeType, Task, TaskStatus, Unit } from "../../lib/erp/types";
import { useErp } from "../erp-context";
import LoadingIndicator from "../loading-indicator";
import { FormActions, FormSurface, SearchableSelect } from "../form-surface";
import TaskEditor from "./task-editor";
import { TaskDeadline, useJakartaDay } from "../task-deadline";
import { LoadState, formText, notifyChange, statusLabels, unitLabel, useDirectory, useProgramChoices, useResource } from "../ui";

type TaskPage = ItemList<Task> & { counts: Record<TaskStatus, number> };
const statuses = Object.keys(statusLabels) as TaskStatus[];
function Card({ task, people, today, list, move, edit }: { task: Task; people: Map<string, string>; today: string; list: boolean; move: (task: Task, status: TaskStatus) => void; edit: () => void }) {
  const { ref, handleRef, isDragging } = useDraggable({ id: task.id, disabled: !task.can_edit || list, data: { task } });
  const owner = task.assignee_user_id ? people.get(task.assignee_user_id) ?? "PIC belum tersedia" : "Belum ada PIC";
  return <article ref={ref} className={`erp-task ${isDragging ? "is-dragging" : ""}`} data-task-id={task.id}>
    <div className="erp-task-heading">
      <h4><Link href={`/admin/tasks/${task.id}`}>{task.title}</Link></h4>
      <div className="erp-task-controls">{task.can_edit && <button type="button" className="erp-task-edit" aria-label={`Edit ${task.title}`} onClick={edit}><Pencil size={14} aria-hidden="true"/></button>}{task.can_edit && !list && <button ref={handleRef} className="erp-drag-handle" data-no-press aria-label={`Pindahkan ${task.title}`}><GripVertical size={18} aria-hidden="true"/></button>}</div>
    </div>
    <div className="erp-task-meta">
      <span><UserRound size={14} aria-hidden="true"/>{owner}</span>
      {task.deadline && <TaskDeadline deadline={task.deadline} today={today} done={task.status === "DONE"}/>}
    </div>
    <footer className="erp-task-footer"><span className="erp-scope-label">{task.program_id ? "Proker" : task.unit_id ? "Unit" : "Umum UKM"}</span>{!task.can_edit && <small>Hanya lihat</small>}</footer>
    {list && task.can_edit && <label>Status<select value={task.status} onChange={e => move(task, e.target.value as TaskStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>}
  </article>;
}
function Column({ status, children, count, add }: { status: TaskStatus; children: React.ReactNode; count?: number; add?: () => void }) {
  const { ref, isDropTarget } = useDroppable({ id: status });
  return <section ref={ref} className={`erp-kanban-column erp-status-${status} ${isDropTarget ? "is-drop-target" : ""}`} aria-label={statusLabels[status]}>
    <header className="erp-kanban-heading">
      <span className="erp-status-dot" aria-hidden="true"/><h3>{statusLabels[status]}</h3>
      <span className="erp-pill" aria-label={count === undefined ? "Jumlah belum tersedia" : `${count} tugas`}>{count ?? "—"}</span>
      {add && <button type="button" className="erp-column-add" aria-label={`Tambah tugas: ${statusLabels[status]}`} onClick={add}><Plus size={16} aria-hidden="true"/></button>}
    </header>
    {children}
  </section>;
}

export default function TaskBoard({ program, initialView = "mine", startCreating = false }: { program?: Program; initialView?: string; startCreating?: boolean }) {
  const { me } = useErp();
  const router = useRouter();
  const periodId = program?.period_id ?? me.period_id;
  const view = initialView;
  const allUnits = useResource<ItemList<Unit>>(`/units${query({ period_id: periodId })}`);
  const people = useDirectory(periodId);
  const units = allUnits.data?.items ?? [];
  const boards = units.filter(unit => unit.kind === "DEPARTMENT" || unit.kind === "DIVISION");
  const unit = boards.find(row => row.id === view);
  const scopeType = program ? "PROGRAM" : view === "ORGANIZATION" ? "ORGANIZATION" : unit?.kind;
  const base = query({ period_id: periodId, scope_type: scopeType, scope_id: program?.id ?? unit?.id, mine: !program && view === "mine", archive: !!program?.closed_at });
  if (!program && view !== "mine" && view !== "ORGANIZATION" && !unit) {
    return allUnits.data ? <p className="erp-empty">Unit tidak tersedia pada periode ini.</p> : <LoadState error={allUnits.error} reload={allUnits.reload}/>;
  }

  const picker = !program && <label className="erp-board-picker"><span className="erp-visually-hidden">Papan</span><select value={view} onChange={event => {
    const next = event.target.value;
    router.push(next === "mine" ? "/admin/tasks" : next === "ORGANIZATION" ? "/admin/tasks/common" : `/admin/tasks/unit/${next}`);
  }}><option value="mine">Tugas Saya</option><option value="ORGANIZATION">Umum UKM</option>{boards.map(row => <option key={row.id} value={row.id}>{unitLabel(row, units)}</option>)}</select></label>;
  return <div className="erp-board">
    <Board key={base} base={base} program={program} view={view} picker={picker} startCreating={startCreating}
      people={new Map(people.data?.items.map(row => [row.id, row.display_name]))} peopleReady={!!people.data}
      peopleError={people.error} retryPeople={people.reload} selectedUnit={unit}/>
  </div>;
}

function Board({ base, program, view, picker, startCreating, people, peopleReady, peopleError, retryPeople, selectedUnit }: {
  base: string; program?: Program; view: string; picker: React.ReactNode; startCreating: boolean;
  people: Map<string, string>; peopleReady: boolean; peopleError: string; retryPeople: () => void; selectedUnit?: Unit;
}) {
  const { me } = useErp();
  const programs = useProgramChoices(program?.period_id ?? me.period_id);
  const [pages, setPages] = useState<Partial<Record<TaskStatus, TaskPage>>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [creating, setCreating] = useState<TaskStatus | null>(startCreating ? "TODO" : null);
  const [formError, setFormError] = useState("");
  const [detailed, setDetailed] = useState(startCreating);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [loadedSearch, setLoadedSearch] = useState("");
  const columnTrigger = useRef<HTMLElement | null>(null);
  const quickDraft = useRef<string | null>(null);
  const [list, setList] = useState(false);
  const today = useJakartaDay();
  const titleInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [revision, setRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState<TaskStatus | null>(null);
  useEffect(() => { if (!base) return; const controller = new AbortController();
    async function loadColumn(status: TaskStatus) {
      const path = `/tasks${base}&status=${status}`;
      const page = await api<TaskPage>(`${path}&limit=30`, { signal: controller.signal });
      if (!search || !page.has_more) return [status, page] as const;
      const items = [...page.items];
      let hasMore: boolean = page.has_more;
      while (hasMore) {
        const next = await api<TaskPage>(`${path}&limit=100&offset=${items.length}`, { signal: controller.signal });
        items.push(...next.items);
        hasMore = !!next.has_more && next.items.length > 0;
      }
      return [status, { ...page, items, has_more: false }] as const;
    }
    Promise.all(statuses.map(loadColumn)).then(rows => {
      if (!controller.signal.aborted) { setPages(Object.fromEntries(rows)); setLoadedSearch(search); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    const refresh = () => setRevision(n => n + 1); window.addEventListener("erp:changed", refresh);
    return () => { controller.abort(); window.removeEventListener("erp:changed", refresh); };
  }, [base, revision, search]);
  const scopeChoices = program ? [{ value: `PROGRAM:${program.id}`, label: program.name }] : [{ value: "ORGANIZATION:", label: "Umum UKM" }, ...me.units.filter(row => row.kind === "DEPARTMENT" || row.kind === "DIVISION").map(row => ({ value: `${row.kind}:${row.id}`, label: row.name })), ...programs.items.filter(row => row.capabilities.edit).map(row => ({ value: `PROGRAM:${row.id}`, label: row.name }))];
  const defaultScope = program ? `PROGRAM:${program.id}` : selectedUnit ? `${selectedUnit.kind}:${selectedUnit.id}` : "ORGANIZATION:";
  const canCreate = !me.periods.find(p => p.id === me.period_id)?.archived_at && (program ? !program.closed_at && program.capabilities.edit : view === "mine" || view === "ORGANIZATION" || me.units.some(row => row.id === view));
  async function move(task: Task, status: TaskStatus) {
    if (busy.current || !task.can_edit || task.status === status) return;
    busy.current = true; setError(""); setMessage(""); setCreatedId(""); const previous = pages;
    setPages(old => Object.fromEntries(statuses.map(s => { const page = old[s]; if (!page) return [s, page]; return [s, { ...page, counts: { ...page.counts, [task.status]: page.counts[task.status] - 1, [status]: page.counts[status] + 1 }, items: [...page.items.filter(t => t.id !== task.id), ...(s === status ? [{ ...task, status }] : [])] }]; })));
    try { await api(`/tasks/${task.id}/status`, { method: "PATCH", body: { status, expected_version: task.version } }); setMessage(`Tugas "${task.title}" dipindahkan ke ${statusLabels[status].toLowerCase()}.`); notifyChange(); }
    catch (e) { setPages(previous); setError(e instanceof Error ? e.message : "Pemindahan gagal. Coba kembali."); setRevision(n => n + 1); }
    finally { busy.current = false; }
  }
  async function more(status: TaskStatus) {
    if (!base || loadingMore) return; setLoadingMore(status);
    try { const next = await api<TaskPage>(`/tasks${base}&status=${status}&limit=30&offset=${pages[status]?.items.length ?? 0}`); setPages(old => ({ ...old, [status]: { ...next, items: [...(old[status]?.items ?? []), ...next.items].filter((t,i,all) => all.findIndex(row => row.id === t.id) === i) } })); } catch(e) { setError((e as Error).message); } finally { setLoadingMore(null); }
  }
  function openForm(status: TaskStatus, full = false) {
    if (saving) return;
    if (!full) columnTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (full) quickDraft.current = creating && !detailed ? draft : null;
    setCreating(status);
    setDetailed(full);
    setFormError("");
    if (!full) requestAnimationFrame(() => titleInput.current?.focus());
  }

  function closeForm() {
    quickDraft.current = null;
    setCreating(null);
    setDetailed(false);
    setDraft("");
    setFormError("");
  }

  function cancelDetails() {
    if (quickDraft.current === null) { closeForm(); return; }
    setDraft(quickDraft.current);
    quickDraft.current = null;
    setDetailed(false);
    setFormError("");
    requestAnimationFrame(() => titleInput.current?.focus());
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !creating || !canCreate || (detailed && !peopleReady)) return;
    const form = new FormData(event.currentTarget);
    const [kind, id] = (formText(form, "scope") || defaultScope).split(":");
    busy.current = true;
    setSaving(true);
    setFormError("");
    setMessage("");
    try {
      const task = await api<Task>("/tasks", { method: "POST", body: {
        period_id: program?.period_id ?? me.period_id,
        scope_type: kind as ScopeType,
        scope_id: id || null,
        title: formText(form, "title"),
        description: formText(form, "description"),
        deadline: formText(form, "deadline") || null,
        assignee_user_id: detailed ? formText(form, "assignee_user_id") || null : view === "mine" && !program ? me.user.id : null,
        status: detailed ? formText(form, "status") : creating,
      } });
      closeForm();
      if (!detailed) columnTrigger.current?.focus({ preventScroll: true });
      setCreatedId(task.id);
      setMessage(task.assignee_user_id !== me.user.id && view === "mine"
        ? "Tugas tersimpan di papan asal. Buka papan asal untuk melihat tugas dengan PIC lain."
        : "Tugas ditambahkan.");
      notifyChange();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Tugas belum tersimpan.");
    } finally {
      setSaving(false);
      busy.current = false;
    }
  }

  const loading = (!Object.keys(pages).length || loadedSearch !== search) && !error;
  const normalizedSearch = search.toLocaleLowerCase("id");
  const context = scopeChoices.find(scope => scope.value === defaultScope)?.label;
  return <>
    <div className="erp-board-toolbar">
      {picker}
      <label className="erp-board-filter"><span className="erp-visually-hidden">Filter status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as TaskStatus | "")}>
        <option value="">Semua status</option>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
      </select></label>
      <form role="search" className="erp-task-search" onSubmit={event => {
        event.preventDefault(); setError(""); setSearch(searchInput.trim());
      }}>
        <label><span className="erp-visually-hidden">Cari tugas</span><input type="search" name="search" placeholder="Cari tugas" maxLength={160} value={searchInput} onChange={event => setSearchInput(event.target.value)}/></label>
        <button>Cari</button>
        {search && <button type="button" onClick={() => { setSearchInput(""); setError(""); setSearch(""); }}>Reset</button>}
      </form>
      <div className="erp-board-views" role="group" aria-label="Tampilan tugas">
        <button aria-pressed={!list} onClick={() => setList(false)}><Columns3 size={15} aria-hidden="true"/>Kanban</button>
        <button aria-pressed={list} onClick={() => setList(true)}><List size={15} aria-hidden="true"/>Daftar</button>
      </div>
      {canCreate && <button className="erp-primary erp-board-add" aria-haspopup="dialog" onClick={() => openForm(statusFilter || "TODO", true)}><Plus size={16} aria-hidden="true"/>Tambah Tugas</button>}
    </div>
    {error && <div className="erp-error" role="alert">{error} <button onClick={() => { setError(""); setRevision(n => n + 1); }}>Coba kembali</button></div>}
    {message && <p role="status" className="erp-success">{message} {createdId && <Link className="erp-back-link" href={`/admin/tasks/${createdId}`}>Buka tugas</Link>}</p>}
    {canCreate && creating && detailed && <FormSurface drawer title="Tambah tugas" description={context} busy={saving} onClose={cancelDetails}>
      {close => <form aria-label="Tambah tugas" onSubmit={createTask}>
        {formError && <p className="erp-error" role="alert">{formError}</p>}
        <label>Judul tugas *<input name="title" value={draft} onChange={event => setDraft(event.target.value)} required maxLength={160}/></label>
        <div className="erp-form-grid">
          <label>Status<select name="status" defaultValue={creating}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
          <label>Tenggat<input name="deadline" type="date"/></label>
        </div>
        {!peopleReady ? <LoadState error={peopleError} reload={retryPeople}/> : <SearchableSelect name="assignee_user_id" label="PIC" defaultValue={view === "mine" && !program ? me.user.id : ""} empty="Belum ditentukan"
          options={Array.from(people, ([value, label]) => ({ value, label }))}/>}
        {program && <small>PIC berakun memperoleh akses edit Proker ini.</small>}
        <label>Deskripsi<textarea name="description" maxLength={10000}/></label>
        {!program && <details>
          <summary>Ubah papan asal</summary>
          <label>Papan asal<select name="scope" defaultValue={defaultScope}>{scopeChoices.map(scope => <option value={scope.value} key={scope.value}>{scope.label}</option>)}</select></label>
          {programs.error && <LoadState error={programs.error} reload={programs.reload}/>}
        </details>}
        <FormActions>
          <DynamicButton type="submit" className="erp-primary" disabled={saving || !peopleReady}>{saving ? "Menyimpan…" : "Simpan tugas"}</DynamicButton>
          <button type="button" disabled={saving} onClick={close}>Batal</button>
        </FormActions>
      </form>}
    </FormSurface>}
    {editing && <TaskEditor key={editing.id} task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage("Perubahan tugas tersimpan."); setCreatedId(""); }}/>}
    {program?.closed_at && <p className="erp-muted erp-board-help">Arsip tugas · Hanya lihat</p>}
    {!list && !statusFilter && <p className="erp-board-scroll-hint">Geser papan untuk melihat tahap lainnya.</p>}
    {loading && <LoadingIndicator label="Memuat tugas…"/>}
    <DragDropProvider onDragEnd={event => {
      const { source, target } = event.operation;
      if (event.canceled || !source || !target || !statuses.includes(target.id as TaskStatus)) return;
      const task = source.data.task as Task;
      if (task) void move(task, target.id as TaskStatus);
    }}>
      <div className={list ? "erp-task-list" : "erp-kanban"} data-filtered={!!statusFilter} role="region" aria-label={list ? "Daftar tugas menurut status" : "Kanban tugas"} tabIndex={list ? undefined : 0} aria-busy={loading}>
        {statuses.filter(status => !statusFilter || statusFilter === status).map(status => {
          const page = pages[status];
          const matches = page?.items.filter(task => !search || `${task.title} ${task.description}`.toLocaleLowerCase("id").includes(normalizedSearch));
          return <Column key={status} status={status} count={loading ? undefined : search ? matches?.length : page?.counts[status]} add={canCreate ? () => openForm(status) : undefined}>
            {canCreate && creating === status && !detailed && <form className="erp-quick-task" aria-label={`Tambah tugas: ${statusLabels[status]}`} onSubmit={createTask} onKeyDown={event => {
              if (event.key === "Escape" && !saving) { event.preventDefault(); closeForm(); columnTrigger.current?.focus(); }
            }}>
              <label><span className="erp-visually-hidden">Judul tugas</span><input ref={titleInput} name="title" placeholder="Judul tugas" required maxLength={160} readOnly={saving} value={draft} onChange={event => setDraft(event.target.value)}/></label>
              {formError && <p className="erp-error" role="alert">{formError}</p>}
              <div className="erp-quick-actions">
                <button className="erp-primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan tugas"}</button>
                <button type="button" disabled={saving} onClick={() => openForm(status, true)}>Detail</button>
                <button type="button" disabled={saving} onClick={() => { closeForm(); columnTrigger.current?.focus(); }}>Batal</button>
              </div>
            </form>}
            {loading && <div className="erp-task erp-task-placeholder" aria-hidden="true"><span className="erp-skeleton"/><span className="erp-skeleton"/></div>}
            {page && !loading && <>
              {!matches?.length && <p className="erp-kanban-empty">{search ? "Tidak ada tugas yang cocok" : "Belum ada tugas"}</p>}
              {matches?.map(task => <Card key={task.id} task={task} today={today} people={people} list={list} move={move} edit={() => setEditing(task)}/>)}
              {page.has_more && <button disabled={loadingMore === status} onClick={() => more(status)}>{loadingMore === status ? "Memuat tugas…" : "Muat tugas lainnya"}</button>}
            </>}
          </Column>;
        })}
      </div>
    </DragDropProvider>
  </>;
}
