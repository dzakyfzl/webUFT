"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/erp/client";
import type { Committee, Task } from "../../../lib/erp/types";
import { Feedback, LoadState, PageHeading, dateLabel, statusLabels, useAction, useDirectory, useResource } from "../../ui";
import TaskEditor from "../task-editor";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const resource = useResource<Task>(`/tasks/${id}`);
  const people = useDirectory(resource.data?.period_id ?? null);
  const committee = useResource<Committee>(resource.data?.program_id ? `/programs/${resource.data.program_id}/committee` : null);
  const action = useAction();
  const [editing, setEditing] = useState<Task | null>(null);
  const [saved, setSaved] = useState(false);
  if (!resource.data) return <LoadState error={resource.error} reload={resource.reload}/>;
  const task = resource.data;
  const source = task.program_id ? `/admin/programs/${task.program_id}/tasks` : task.unit_id ? `/admin/tasks/unit/${task.unit_id}` : "/admin/tasks/common";
  const owner = people.data?.items.find(person => person.id === task.assignee_user_id)?.display_name
    ?? committee.data?.members.find(person => person.id === task.committee_member_id)?.display_name
    ?? (task.assignee_user_id || task.committee_member_id ? "Nama PIC belum tersedia" : "Belum ada PIC");
  return <>
    <PageHeading title={task.title} description={`${task.scope_type === "PROGRAM" ? "Tugas Proker" : task.scope_type === "ORGANIZATION" ? "Umum UKM" : "Tugas unit"} · ${statusLabels[task.status]}`}>
      <Link className="erp-button" href={source}>Buka papan asal</Link>
      {task.can_edit && <button className="erp-primary" onClick={() => { setSaved(false); setEditing(task); }}>Edit tugas</button>}
    </PageHeading>
    <Feedback {...action}/>{saved && <p className="erp-success" role="status">Perubahan tugas tersimpan.</p>}
    <section className="erp-panel erp-stack erp-reading-form">
      <dl className="erp-form-grid erp-record-details">
        <div><dt>Papan asal</dt><dd>{task.board_name}</dd></div>
        <div><dt>Tenggat</dt><dd>{dateLabel(task.deadline)}</dd></div>
        <div><dt>PIC</dt><dd>{owner}</dd></div>
      </dl>
      {!task.can_edit && <div><span className="erp-pill">Hanya lihat</span></div>}
      <div><h2>Deskripsi</h2><p className="erp-record-text">{task.description || "Belum ada deskripsi."}</p></div>
      {task.can_edit && <div><button type="button" className="erp-danger" disabled={action.busy} onClick={() => {
        if (window.confirm("Hapus tugas ini dari papan aktif? Riwayat perubahan tetap disimpan.")) action.run(async () => {
          await api(`/tasks/${id}`, { method: "DELETE", body: { expected_version: task.version } });
          router.push(task.program_id ? source : "/admin/tasks");
        });
      }}>Hapus tugas</button></div>}
    </section>
    {editing && task.can_edit && <TaskEditor key={editing.id} task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSaved(true); resource.reload(); }}/>}
  </>;
}
