"use client";

import Disclosure from "../../../components/ui/disclosure";
import MagneticDropZone from "../../../components/ui/magnetic-drop-zone";
import DynamicButton from "../../../components/ui/dynamic-button";

import { FormActions, FormSurface, SearchableSelect } from "../../form-surface";
import { useEffect, useState } from "react";
import { api, query } from "../../../lib/erp/client";
import type { Program, ItemList } from "../../../lib/erp/types";
import type { Actuals, Document, Expense, Report } from "../../../lib/erp/p1-types";
import { Feedback, LoadState, RevealAction, formText, rupiah, readAllPages, useAction, useResource } from "../../ui";

export function DocumentsPanel({ program }: { program: Program }) {
  const [offset, setOffset] = useState(0);
  const path = `/programs/${program.id}/documents`;
  const resource = useResource<ItemList<Document>>(path + query({ offset }));
  const action = useAction();
  return <section className="erp-panel erp-stack"><header className="erp-panel-heading"><h2>Dokumen & tautan</h2>{program.capabilities.edit && <RevealAction label="Tambah Dokumen" target="program-document-forms" primary/>}</header><Feedback {...action}/>
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      {!resource.data.items.length && <p className="erp-empty">Belum ada dokumen. Pengelola dapat mengunggah berkas atau menambahkan tautan di bagian ini.</p>}
      {resource.data.items.map(item => <div className="erp-list-item" key={item.id}><div><a className="erp-back-link" href={item.external_url ?? `/api/admin${path}/${item.id}/download`} target={item.external_url ? "_blank" : undefined} rel="noopener noreferrer">{item.name}</a><p>{item.external_url ? "Tautan eksternal" : `${(item.size / 1024).toFixed(1)} KB`}</p></div>
        {program.capabilities.edit && <button disabled={action.busy} onClick={() => { if (window.confirm("Arsipkan dokumen ini dari daftar?")) action.run(async () => { await api(path + `/${item.id}`, { method: "DELETE" }); resource.reload(); }); }}>Arsipkan</button>}</div>)}
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
    </>}
    {program.capabilities.edit && <Disclosure id="program-document-forms" summary={<>Unggah berkas atau isi tautan</>}><div className="erp-grid"><form onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const file = new FormData(element).get("file") as File; action.run(async () => {
      if (!file.size || file.size > 20 * 1024 * 1024) throw Error("Pilih file berukuran 1 byte sampai 20 MB.");
      await api(path + "/upload" + query({ name: file.name }), { method: "POST", file }); element.reset(); resource.reload();
    }, "Dokumen tersimpan."); }}><h3>Unggah berkas</h3><MagneticDropZone accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv" maxBytes={20 * 1024 * 1024} disabled={action.busy}/><small>Maksimal 20 MB. PDF, PNG, JPEG, WebP, TXT, CSV. Dokumen hanya diunduh oleh pengurus berakun.</small><div><DynamicButton type="submit" disabled={action.busy}>{action.busy ? "Memproses…" : "Unggah dokumen"}</DynamicButton></div></form>
      <form onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => { await api(path + "/links", { method: "POST", body: { name: formText(form, "name"), external_url: formText(form, "external_url") } }); element.reset(); resource.reload(); }); }}>
        <h3>Tambahkan tautan</h3><label>Nama tautan *<input name="name" required maxLength={180}/></label><label>Tautan Drive / dokumentasi *<input name="external_url" type="url" required maxLength={2000}/></label><div><button disabled={action.busy}>Simpan tautan</button></div>
      </form></div></Disclosure>}
  </section>;
}

export function ActualsPanel({ program }: { program: Program }) {
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<Expense | "new" | null>(null);
  const editing = editor === "new" ? null : editor;
  const path = `/programs/${program.id}/expenses`;
  const resource = useResource<Actuals>(path + query({ offset }));
  const documents = useResource<Document[]>(editor ? `/programs/${program.id}/documents` : null, readAllPages<Document>);
  const reloadDocuments = documents.reload;
  useEffect(() => {
    if (!editor) return;
    window.addEventListener("focus", reloadDocuments);
    return () => window.removeEventListener("focus", reloadDocuments);
  }, [editor, reloadDocuments]);
  const action = useAction();
  return <section className="erp-panel erp-stack"><header className="erp-panel-heading"><h2>Rencana & realisasi</h2>{program.capabilities.edit && <button className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setEditor("new"); }}>Tambah realisasi</button>}</header>{!editor && <Feedback {...action}/>}
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      <div className="erp-stats">{[["Rencana RAB", resource.data.planned_rupiah], ["Realisasi", resource.data.actual_rupiah], ["Sisa rencana", resource.data.difference_rupiah]].map(([label, value]) => <div key={label}><small>{label}</small><p>{rupiah(value)}</p></div>)}</div>
      <div className="erp-table-wrap"><table><thead><tr><th>Pengeluaran</th><th>Tanggal</th><th>Realisasi</th><th>Bukti</th><th>Aksi</th></tr></thead><tbody>{!resource.data.items.length && <tr><td colSpan={5}>Belum ada realisasi pengeluaran. Pengelola dapat menggunakan Tambah realisasi di bagian ini.</td></tr>}{resource.data.items.map(item => <tr key={item.id}><td>{item.name}<small style={{ display: "block" }}>{item.category}</small></td><td>{item.paid_on}</td><td>{rupiah(item.amount)}</td><td>{item.attachment_id ? <a href={`/api/admin/programs/${program.id}/documents/${item.attachment_id}/download`}>Unduh bukti</a> : "Belum ditautkan"}</td><td>{program.capabilities.edit && <div className="erp-row"><button onClick={() => { action.clear(); setEditor(item); }}>Edit</button><button disabled={action.busy} onClick={() => { if (window.confirm("Arsipkan catatan pengeluaran ini?")) action.run(async () => { await api(path + `/${item.id}`, { method: "DELETE", body: { expected_version: item.version } }); resource.reload(); }); }}>Arsipkan</button></div>}</td></tr>)}</tbody></table></div>
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
    </>}
    {program.capabilities.edit && editor && <FormSurface drawer title={editing ? "Edit realisasi" : "Tambah realisasi"} busy={action.busy} onClose={() => setEditor(null)}>{close => <form key={editing?.id ?? "new"} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => {
      await api(path + (editing ? `/${editing.id}` : ""), { method: editing ? "PATCH" : "POST", body: { name: formText(form, "name"), category: formText(form, "category"), amount: formText(form, "amount"), paid_on: formText(form, "paid_on"), attachment_id: formText(form, "attachment_id") || null, notes: formText(form, "notes"), expected_version: editing?.version ?? 1 } }); element.reset(); setEditor(null); resource.reload();
    }); }}><Feedback {...action}/><div className="erp-form-grid"><label className="erp-full">Pengeluaran *<input name="name" required defaultValue={editing?.name} maxLength={160}/></label><label>Kategori<input name="category" defaultValue={editing?.category} maxLength={100}/></label><label>Jumlah rupiah *<input name="amount" inputMode="numeric" pattern="[0-9]+" required defaultValue={editing?.amount}/></label><label>Tanggal transaksi *<input name="paid_on" type="date" required defaultValue={editing?.paid_on}/></label>
      </div>
      <SearchableSelect name="attachment_id" label="Bukti dari dokumen Proker" empty="Belum ditautkan" defaultValue={editing?.attachment_id ?? ""}
        options={(documents.data ?? []).map(item => ({ value: item.id, label: item.name }))}/>
      {documents.data?.length === 0 && <small>Belum ada dokumen untuk ditautkan. Bukti boleh ditambahkan setelah realisasi disimpan.</small>}
      <a href={`/admin/programs/${program.id}?tab=documents`} target="_blank" rel="noopener noreferrer">Buka Dokumen di tab baru</a>
      {documents.error && <LoadState error={documents.error} reload={documents.reload}/>}
      <details open={!!editing?.notes || undefined}><summary>Catatan</summary><label><span className="erp-visually-hidden">Catatan</span><textarea name="notes" defaultValue={editing?.notes} maxLength={5000}/></label></details>
      <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan realisasi"}</button><button type="button" onClick={close}>Batal</button></FormActions>
    </form>}</FormSurface>}
  </section>;
}

const reportFields = [["narrative", "Narasi kegiatan"], ["achievements", "Capaian"], ["obstacles", "Hambatan"]] as const;

export function ReportPanel({ program }: { program: Program }) {
  const path = `/programs/${program.id}/report`;
  const resource = useResource<Report>(path);
  const action = useAction();
  const [editing, setEditing] = useState<Report | null>(null);
  if (!resource.data) return <section className="erp-panel"><h2>Laporan kegiatan</h2><LoadState error={resource.error} reload={resource.reload}/></section>;
  const report = resource.data;
  return <section className="erp-panel erp-stack erp-reading-form">
    <header className="erp-panel-heading"><h2>Laporan kegiatan</h2>{program.capabilities.edit && <button className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setEditing(report); }}>Edit laporan</button>}</header>
    {!editing && <Feedback {...action}/>}
    {reportFields.map(([name, label]) => <section className="erp-form-section" key={name}><h3>{label}</h3><p className="erp-record-text">{report[name] || "Belum diisi."}</p></section>)}
    {report.documentation_url && <p><a className="erp-back-link" href={report.documentation_url} target="_blank" rel="noopener noreferrer">Buka dokumentasi</a></p>}
    {editing && program.capabilities.edit && <FormSurface drawer title="Edit laporan kegiatan" busy={action.busy} onClose={() => setEditing(null)}>
      {close => <form onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        action.run(async () => {
          await api(path, { method: "PUT", body: { expected_version: editing.version, narrative: formText(form, "narrative"), achievements: formText(form, "achievements"), obstacles: formText(form, "obstacles"), documentation_url: formText(form, "documentation_url") } });
          setEditing(null); resource.reload();
        });
      }}>
        <Feedback {...action}/>
        {reportFields.map(([name, label]) => <label key={name}>{label}<textarea name={name} defaultValue={editing[name]} maxLength={name === "narrative" ? 15000 : 10000}/></label>)}
        <label>Tautan dokumentasi<input name="documentation_url" type="url" defaultValue={editing.documentation_url}/></label>
        <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan laporan"}</button><button type="button" onClick={close}>Batal</button></FormActions>
      </form>}
    </FormSurface>}
  </section>;
}
