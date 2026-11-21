"use client";

import { api } from "../../lib/erp/client";
import type { Committee, Task } from "../../lib/erp/types";
import { FormActions, FormSurface, SearchableSelect } from "../form-surface";
import { Feedback, LoadState, formText, statusLabels, useAction, useDirectory, useResource } from "../ui";

export default function TaskEditor({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: () => void }) {
  const action = useAction();
  const people = useDirectory(task.period_id);
  const committee = useResource<Committee>(task.program_id ? `/programs/${task.program_id}/committee` : null);
  const ready = !!people.data && (!task.program_id || !!committee.data);

  return <FormSurface drawer title="Edit tugas" description={[task.scope_type === "PROGRAM" ? "Tugas Proker" : task.scope_type === "ORGANIZATION" ? "Umum UKM" : "Tugas unit", task.title].join(" · ")} busy={action.busy} onClose={onClose}>
    {close => <form onSubmit={event => {
      event.preventDefault();
      if (!ready || !task.can_edit) return;
      const form = new FormData(event.currentTarget);
      action.run(async () => {
        await api(`/tasks/${task.id}`, { method: "PATCH", body: {
          expected_version: task.version,
          title: formText(form, "title"), description: formText(form, "description"),
          status: formText(form, "status"), deadline: formText(form, "deadline") || null,
          assignee_user_id: formText(form, "assignee_user_id") || null,
          committee_member_id: formText(form, "committee_member_id") || null,
        } });
        onSaved();
      });
    }}>
      <Feedback {...action}/>
      <label>Judul *<input name="title" defaultValue={task.title} required maxLength={160}/></label>
      <div className="erp-form-grid">
        <label>Status<select name="status" defaultValue={task.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tenggat<input type="date" name="deadline" defaultValue={task.deadline ?? ""}/></label>
      </div>
      {!ready && <LoadState error={people.error || committee.error} reload={() => { people.reload(); committee.reload(); }}/>}
      {people.data && <SearchableSelect name="assignee_user_id" label="PIC berakun" empty="Tanpa PIC berakun" defaultValue={task.assignee_user_id ?? ""}
        options={people.data.items.map(person => ({ value: person.id, label: person.display_name }))}/>}
      {task.program_id && committee.data && <SearchableSelect name="committee_member_id" label="PIC panitia" empty="Tanpa panitia" defaultValue={task.committee_member_id ?? ""}
        options={committee.data.members.map(member => ({ value: member.id, label: `${member.display_name} · ${member.role}` }))}/>}
      {task.program_id && <small>PIC berakun mendapat akses edit Proker. Jika memilih PIC panitia dan berakun, pilih orang yang sama.</small>}
      <label>Deskripsi<textarea name="description" defaultValue={task.description} maxLength={10000}/></label>
      <FormActions><button className="erp-primary" disabled={!ready || action.busy}>{action.busy ? "Menyimpan…" : "Simpan tugas"}</button><button type="button" onClick={close} disabled={action.busy}>Batal</button></FormActions>
    </form>}
  </FormSurface>;
}
