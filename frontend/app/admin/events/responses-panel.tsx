"use client";

import Disclosure from "../../components/ui/disclosure";

import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { ItemList } from "../../lib/erp/types";
import type { PublicEvent, Registration, Submission } from "../../lib/erp/p1-types";
import { Feedback, LoadState, formText, useAction, useDirectory, useResource } from "../ui";

export default function ResponsesPanel({ event }: { event: PublicEvent }) {
  const registration = useResource<Registration>(`/events/${event.id}/form`);
  const [version, setVersion] = useState("");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const chosen = version || registration.data?.published_version_id;
  const responses = useResource<ItemList<Submission> & { total: number }>(chosen ? `/events/${event.id}/responses${query({ form_version_id: chosen, offset, search })}` : null);
  const directory = useDirectory(event.can_staff ? event.period_id : null);
  const action = useAction();
  const schema = registration.data?.versions.find(item => item.id === chosen)?.schema;
  const questions = schema?.sections.flatMap(section => section.questions) ?? [];
  return <section className="erp-panel erp-stack"><h2>Respons peserta</h2><Feedback {...action}/>
    {!registration.data && registration.error !== "Acara belum memiliki formulir." ? <LoadState error={registration.error} reload={registration.reload}/> : <>
      {!chosen && <p className="erp-empty">Belum ada versi terbit. Terbitkan formulir untuk mulai menerima respons.</p>}<fieldset disabled={!chosen} className="erp-form-section erp-response-filters"><div className="erp-row"><label className="erp-compact-field">Versi formulir<select value={chosen ?? ""} onChange={input => { setVersion(input.target.value); setOffset(0); }}>{registration.data?.versions.map(item => <option key={item.id} value={item.id}>Versi {item.number}</option>)}</select></label>
      <form role="search" onSubmit={submit => { submit.preventDefault(); setSearch(formText(new FormData(submit.currentTarget), "search")); setOffset(0); }}><label>Cari isi respons<input type="search" name="search" maxLength={160}/></label><div><button>Cari respons</button></div></form></div>
      <div className="erp-row">{["csv", "xlsx"].map(format => <a className="erp-button" key={format} aria-disabled={!chosen} href={chosen ? `/api/admin/events/${event.id}/responses-export${query({ form_version_id: chosen, format })}` : undefined}>Ekspor {format === "xlsx" ? "Excel" : "CSV"} versi ini</a>)}</div><small>Ekspor maksimal 10.000 respons dan 20 MB jawaban per versi. Ekspor dicatat dalam audit.</small>
      </fieldset>{!chosen ? <p className="erp-muted">Respons peserta akan ditampilkan di bagian ini.</p> : !responses.data ? <LoadState error={responses.error} reload={responses.reload}/> : <><p>{responses.data.total} respons sesuai filter.</p>{!responses.data.items.length && <p className="erp-empty">{search ? "Tidak ada respons yang cocok. Hapus pencarian untuk melihat seluruh respons." : "Belum ada respons untuk versi ini. Respons akan tampil setelah peserta mengisi formulir."}</p>}{responses.data.items.map(item => <article key={item.id} className="erp-response-record erp-stack"><small>{new Date(item.submitted_at).toLocaleString("id-ID")}</small><dl>{questions.map(question => <div key={question.id} style={{ marginBottom: 12 }}><dt>{question.label}</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{Array.isArray(item.answers[question.id]) ? (item.answers[question.id] as string[]).join(", ") : item.answers[question.id] || "Tidak diisi"}</dd></div>)}</dl>{event.capabilities.edit && <div><button disabled={action.busy} onClick={() => { if (window.confirm("Hapus respons ini dari daftar dan ekspor? Tindakan dicatat dalam audit.")) action.run(async () => { await api(`/events/${event.id}/responses/${item.id}`, { method: "DELETE" }); responses.reload(); }); }}>Hapus respons</button></div>}</article>)}<div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{responses.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div></>}
    </>}
    {event.can_staff && <Disclosure summary={<>Petugas akses respons</>}><p className="erp-muted">Hanya pembuat acara dan petugas yang ditunjuk dapat melihat atau mengekspor data peserta.</p>{!directory.data ? <LoadState error={directory.error} reload={directory.reload}/> : <form onSubmit={submit => { submit.preventDefault(); const form = new FormData(submit.currentTarget); action.run(async () => { await api(`/events/${event.id}/staff`, { method: "PUT", body: { user_ids: form.getAll("user_ids") } }); }, "Petugas respons diperbarui."); }}>{directory.data.items.length > 12 && <label className="erp-compact-field">Cari pengurus<input type="search" value={staffSearch} onChange={input => setStaffSearch(input.target.value)} onKeyDown={input => { if (input.key === "Enter") input.preventDefault(); }}/></label>}
      <fieldset className="erp-form-grid erp-staff-options"><legend>Petugas akses respons</legend>
        {directory.data.items.map(person => <div key={person.id} hidden={!person.display_name.toLocaleLowerCase("id").includes(staffSearch.trim().toLocaleLowerCase("id"))}><label className="erp-check-label"><input type="checkbox" name="user_ids" value={person.id} defaultChecked={event.staff_ids?.includes(person.id)}/>{person.display_name}</label></div>)}
      </fieldset><div><button className="erp-primary" disabled={action.busy}>Simpan petugas</button></div></form>}</Disclosure>}
  </section>;
}
