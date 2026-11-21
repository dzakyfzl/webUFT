"use client";

import { useRouter } from "next/navigation";
import { api } from "../../lib/erp/client";
import type { PublicEvent } from "../../lib/erp/p1-types";
import { DateRangeFields, FormActions, FormSurface, SearchableSelect } from "../form-surface";
import { useErp } from "../erp-context";
import { Feedback, LoadState, formText, useAction, useProgramList } from "../ui";

function localTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function EventEditor({ event, onClose, onDone }: { event?: PublicEvent; onClose: () => void; onDone?: () => void }) {
  const { me } = useErp();
  const router = useRouter();
  const action = useAction();
  const programs = useProgramList(event ? null : me.period_id, "all");
  return <FormSurface drawer title={event ? "Edit acara" : "Buat acara publik"} busy={action.busy} onClose={onClose}>
    {close => <form onSubmit={submit => {
      submit.preventDefault();
      const form = new FormData(submit.currentTarget);
      action.run(async () => {
        const result = await api<PublicEvent>(`/events${event ? `/${event.id}` : ""}`, { method: event ? "PATCH" : "POST", body: {
          period_id: event?.period_id ?? me.period_id, program_id: event?.program_id ?? (formText(form, "program_id") || null),
          title: formText(form, "title"), description: formText(form, "description"),
          starts_at: new Date(formText(form, "starts_at")).toISOString(), ends_at: new Date(formText(form, "ends_at")).toISOString(),
          location: formText(form, "location"), poster_url: formText(form, "poster_url"), related_url: formText(form, "related_url"),
          status: formText(form, "status"), expected_version: event?.version ?? 1,
        } });
        if (event) onDone?.();
        else router.push(`/admin/events/${result.id}`);
      });
    }}>
      <Feedback {...action}/>
      <section className="erp-form-section">
        <h3>Informasi acara</h3>
        <label>Judul acara *<input name="title" required maxLength={160} defaultValue={event?.title}/></label>
        <label>Lokasi<input name="location" maxLength={200} defaultValue={event?.location}/></label>
        <label>Deskripsi<textarea name="description" maxLength={15000} defaultValue={event?.description}/></label>
      </section>
      <section className="erp-form-section">
        <h3>Jadwal</h3>
        <DateRangeFields dateTime required
          start={{ name: "starts_at", label: "Mulai", value: localTime(event?.starts_at) }}
          end={{ name: "ends_at", label: "Selesai", value: localTime(event?.ends_at) }}/>
        <small>Masukkan jadwal sesuai zona waktu perangkat Anda.</small>
      </section>
      <section className="erp-form-section">
        <h3>Publikasi</h3>
        <label>Status publikasi<select name="status" defaultValue={event?.status ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="UNPUBLISHED">Tidak ditampilkan</option></select></label>
        {!event && (programs.error ? <LoadState error={programs.error} reload={programs.reload}/> : <SearchableSelect label="Proker terkait (opsional)" name="program_id" empty="Tanpa Proker"
          options={(programs.data ?? []).filter(item => item.status === "ACTIVE" && item.capabilities.edit).map(item => ({ value: item.id, label: item.name }))}/>)}
        <details open={!!(event?.poster_url || event?.related_url) || undefined}>
          <summary>Tautan pendukung</summary>
          <div className="erp-field-stack">
            <label>Tautan poster<input type="url" name="poster_url" maxLength={2000} defaultValue={event?.poster_url}/></label>
            <label>Tautan terkait<input type="url" name="related_url" maxLength={2000} defaultValue={event?.related_url}/></label>
          </div>
        </details>
      </section>
      <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan acara"}</button><button type="button" onClick={close} disabled={action.busy}>Batal</button></FormActions>
    </form>}
  </FormSurface>;
}
