"use client";

import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { ItemList } from "../../lib/erp/types";
import type { Asset, Loan } from "../../lib/erp/p1-types";
import { DateRangeFields, FormActions, FormSurface } from "../form-surface";
import { useErp } from "../erp-context";
import { Feedback, EmptyState, LoadState, PageHeading, formText, rupiah, useAction, useResource } from "../ui";

function assetLabel(value?: string | null) {
  if (!value) return "Belum ditentukan";
  const text = value.toLocaleLowerCase("id").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type LoanAction = "history" | "borrow" | "return";

export default function InventoryPage() {
  const { me } = useErp();
  const [kind, setKind] = useState("physical");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<Asset | "new" | null>(null);
  const editing = editor === "new" ? null : editor;
  const [selected, setSelected] = useState("");
  const [loanAction, setLoanAction] = useState<LoanAction>("history");
  const [opening, setOpening] = useState(0);
  function openLoans(id: string, intent: LoanAction) {
    setSelected(id);
    setLoanAction(intent);
    setOpening(value => value + 1);
    if (intent === "history") requestAnimationFrame(() => document.querySelector<HTMLElement>("#asset-loans h2")?.focus());
  }
  const action = useAction();
  const suffix = query({ period_id: me.period_id });
  const resource = useResource<ItemList<Asset> & { can_manage: boolean }>(`/inventory/${kind}${query({ period_id: me.period_id, offset, search, archived })}`);
  const asset = resource.data?.items.find(item => item.id === selected);
  return <><PageHeading title="Inventaris" description="Aset fisik, buku, aset digital, serta riwayat pinjam dan sewa.">{resource.data?.can_manage && <button className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setEditor("new"); }}>Tambah Aset</button>}</PageHeading>{!editor && <Feedback {...action}/>}
    <div className="erp-tabs">{[["physical", "Aset fisik & buku"], ["digital", "Aset digital"]].map(([value, label]) => <button key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setOffset(0); setEditor(null); setSelected(""); }}>{label}</button>)}</div>
    <div className="erp-stack"><section className="erp-panel erp-stack"><form role="search" onSubmit={event => { event.preventDefault(); setSearch(formText(new FormData(event.currentTarget), "search")); setOffset(0); }}><label>Cari nama aset<input type="search" name="search" maxLength={160}/></label><div className="erp-row"><button>Cari aset</button><label style={{ flexDirection: "row" }}><input type="checkbox" checked={archived} onChange={event => { setArchived(event.target.checked); setOffset(0); }}/> Tampilkan arsip</label></div></form>
      {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
        {!resource.data.items.length && <EmptyState title={search || archived ? "Tidak ada aset yang sesuai filter" : "Belum ada aset tercatat"} description="Daftar aset dan riwayat peminjaman akan tersimpan di bagian ini.">{search || archived ? <button onClick={() => { setSearch(""); setArchived(false); setOffset(0); }}>Hapus filter</button> : null}</EmptyState>}
        <div className="erp-table-wrap" role="region" aria-label="Daftar inventaris" tabIndex={0}><table className="erp-asset-table"><thead><tr><th>Aset</th><th>{kind === "physical" ? "Kondisi / status" : "Jenis / status"}</th><th>Penanggung jawab</th><th>Aksi</th></tr></thead><tbody>{!resource.data.items.length && <tr><td colSpan={4}>Tidak ada aset pada daftar ini.</td></tr>}{resource.data.items.map(item => <tr key={item.id}><td>{item.name}<small style={{ display: "block" }}>{item.asset_code ?? item.url ?? ""}</small></td><td>{assetLabel(item.condition ?? item.kind)}<br/>{assetLabel(item.availability_status ?? item.status)}</td><td data-label="Penanggung jawab">{item.custodian || "Belum ditentukan"}</td><td>{resource.data?.can_manage && <div className="erp-row">{!item.archived_at && !["DIPINJAM", "DISEWAKAN"].includes(item.availability_status ?? "") && <button aria-haspopup="dialog" onClick={() => { action.clear(); setEditor(item); }}>Edit</button>}{kind === "physical" && <>
            {!item.archived_at && item.availability_status === "TERSEDIA" && <button onClick={() => openLoans(item.id, "borrow")}>Catat pinjam/sewa</button>}
            {!item.archived_at && ["DIPINJAM", "DISEWAKAN"].includes(item.availability_status ?? "") && <button onClick={() => openLoans(item.id, "return")}>Catat pengembalian</button>}
            <button onClick={() => openLoans(item.id, "history")}>Lihat riwayat</button>
          </>}{!item.archived_at && <button disabled={action.busy} onClick={() => { if (window.confirm(`Arsipkan aset ${item.name}? Riwayat tetap tersimpan.`)) action.run(async () => { await api(`/inventory/${kind}/${item.id}/archive${suffix}`, { method: "POST", body: { expected_version: item.version } }); resource.reload(); }); }}>Arsipkan</button>}</div>}</td></tr>)}</tbody></table></div>
        <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
      </>}
    </section>
    {asset && resource.data?.can_manage && <LoanPanel key={asset.id + opening} initialAction={loanAction} asset={asset} periodId={me.period_id} reload={resource.reload}/>}
    {editor && resource.data?.can_manage && <FormSurface drawer title={editing ? "Edit aset" : "Tambah aset"} description={kind === "physical" ? "Aset fisik & buku" : "Aset digital"} busy={action.busy} onClose={() => setEditor(null)}>{close => <form key={`${kind}:${editing?.id ?? "new"}`} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => {
      const keys = kind === "physical" ? ["asset_code", "name", "category", "location", "custodian", "condition", "availability_status", "photo_url", "notes"] : ["name", "kind", "url", "custodian", "status", "expires_on", "credential_reference", "notes"];
      const body = Object.fromEntries(keys.map(key => [key, key === "expires_on" ? formText(form, key) || null : formText(form, key)]));
      await api(`/inventory/${kind}${editing ? `/${editing.id}` : ""}${suffix}`, { method: editing ? "PATCH" : "POST", body: { ...body, expected_version: editing?.version ?? 1 } }); element.reset(); setEditor(null); resource.reload();
    }); }}><Feedback {...action}/><div className="erp-form-grid"><label className="erp-full">Nama aset *<input name="name" required defaultValue={editing?.name} maxLength={160}/></label>
      {kind === "physical" ? <><label>Kode per barang / eksemplar *<input name="asset_code" required defaultValue={editing?.asset_code} maxLength={80}/></label><label>Kategori *<input name="category" required defaultValue={editing?.category} maxLength={100}/></label><label>Lokasi<input name="location" defaultValue={editing?.location} maxLength={160}/></label><label>Kondisi<select name="condition" defaultValue={editing?.condition ?? "BAIK"}>{["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"].map(value => <option key={value} value={value}>{assetLabel(value)}</option>)}</select></label><label>Status persediaan<select name="availability_status" defaultValue={editing?.availability_status ?? "TERSEDIA"}>{["TERSEDIA", "PERBAIKAN", "HILANG"].map(value => <option key={value} value={value}>{assetLabel(value)}</option>)}</select><small>Peminjaman dan sewa dicatat melalui transaksi aset.</small></label><label>Tautan foto<input name="photo_url" type="url" defaultValue={editing?.photo_url} maxLength={2000}/></label></>
      : <><label>Jenis aset<select name="kind" defaultValue={editing?.kind ?? "DRIVE_FOLDER"}>{["DRIVE_FOLDER", "ACCOUNT", "DOMAIN", "HOSTING", "WEBSITE", "REPOSITORY", "OTHER"].map(value => <option key={value} value={value}>{assetLabel(value)}</option>)}</select></label><label>URL publik / referensi<input name="url" type="url" defaultValue={editing?.url} maxLength={2000}/></label><label>Status<select name="status" defaultValue={editing?.status ?? "ACTIVE"}>{["ACTIVE", "EXPIRED", "INACTIVE"].map(value => <option key={value} value={value}>{assetLabel(value)}</option>)}</select></label><label>Berakhir / perpanjangan<input type="date" name="expires_on" defaultValue={editing?.expires_on ?? ""}/></label><label>Rujukan password manager<input name="credential_reference" defaultValue={editing?.credential_reference} maxLength={500}/><small>Isi nama vault/item saja. Jangan memasukkan password, token, atau recovery code.</small></label></>}
      <label>Penanggung jawab<input name="custodian" defaultValue={editing?.custodian} maxLength={160}/></label><label className="erp-full">Catatan<textarea name="notes" defaultValue={editing?.notes} maxLength={5000}/></label></div><FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan aset"}</button><button disabled={action.busy} type="button" onClick={close}>Batal</button></FormActions>
    </form>}</FormSurface>}
    </div></>;
}

function LoanPanel({ asset, periodId, reload, initialAction }: { initialAction: LoanAction; asset: Asset; periodId: string; reload: () => void }) {
  const [offset, setOffset] = useState(0);
  const [returnChoice, setReturning] = useState<Loan | "active" | null>(initialAction === "return" ? "active" : null);
  const [newLoan, setNewLoan] = useState(initialAction === "borrow");
  const path = `/inventory/physical/${asset.id}/loans`;
  const suffix = query({ period_id: periodId });
  const resource = useResource<ItemList<Loan>>(path + query({ period_id: periodId, offset }));
  const action = useAction();
  const returning = returnChoice === "active" ? resource.data?.items.find(loan => !loan.returned_on) : returnChoice;
  return <section className="erp-panel erp-stack" id="asset-loans"><header className="erp-panel-heading"><h2 tabIndex={-1}>Transaksi {asset.name}</h2>
      {!asset.archived_at && asset.availability_status === "TERSEDIA" && <button type="button" aria-haspopup="dialog" onClick={() => { action.clear(); setNewLoan(true); }}>Catat pinjam / sewa</button>}
    </header>{!returning && !newLoan && <Feedback {...action}/>}
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      {!resource.data.items.length && <p className="erp-empty">Belum ada transaksi untuk aset ini. Catat peminjaman atau sewa saat aset tersedia.</p>}{resource.data.items.map(loan => <div key={loan.id} className="erp-list-item"><div><h3>{loan.borrower_name} · {loan.transaction_type === "RENT" ? "Sewa" : "Pinjam"}</h3><p>{loan.loan_on} → {loan.due_on} · {loan.returned_on ? `Kembali ${loan.returned_on}` : loan.overdue ? "Terlambat" : "Belum kembali"}</p><p>{assetLabel(loan.condition_before)} → {loan.condition_after ? assetLabel(loan.condition_after) : "Belum kembali"} · {rupiah(loan.rental_fee)}</p><p>{loan.contact} {loan.notes}</p><p>Dicatat oleh {loan.logged_by_name || "Pengurus"}{loan.returned_by_name ? ` · Pengembalian oleh ${loan.returned_by_name}` : ""}</p></div>{!loan.returned_on && <button onClick={() => { action.clear(); setReturning(loan); }}>Catat kembali</button>}</div>)}
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Riwayat sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Riwayat berikutnya</button>}</div>
    </>}
    {returning && <FormSurface title="Catat pengembalian" description={returning.borrower_name} busy={action.busy} onClose={() => setReturning(null)}>{close => <form key={returning.id} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); action.run(async () => { await api(path + `/${returning.id}/return${suffix}`, { method: "POST", body: { returned_on: formText(form, "returned_on"), condition_after: formText(form, "condition_after"), notes: formText(form, "notes"), expected_version: returning.version } }); setReturning(null); resource.reload(); reload(); }); }}><Feedback {...action}/><label>Tanggal kembali aktual *<input name="returned_on" type="date" min={returning.loan_on} required/></label><label>Kondisi setelah pemakaian<select name="condition_after">{["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"].map(value => <option key={value} value={value}>{assetLabel(value)}</option>)}</select></label><label>Catatan kerusakan / pengembalian<textarea name="notes" maxLength={5000}/></label><FormActions><button className="erp-primary" disabled={action.busy}>Simpan pengembalian</button><button type="button" onClick={close}>Batal</button></FormActions></form>}</FormSurface>}
    {newLoan && <FormSurface drawer title="Catat pinjam / sewa" description={asset.name} busy={action.busy} onClose={() => setNewLoan(false)}>{close => <form onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => { await api(path + suffix, { method: "POST", body: { transaction_type: formText(form, "transaction_type"), borrower_name: formText(form, "borrower_name"), contact: formText(form, "contact"), loan_on: formText(form, "loan_on"), due_on: formText(form, "due_on"), rental_fee: formText(form, "rental_fee") || "0", notes: formText(form, "notes"), expected_version: asset.version } }); element.reset(); setNewLoan(false); resource.reload(); reload(); }); }}><Feedback {...action}/><div className="erp-form-grid"><label>Transaksi<select name="transaction_type"><option value="LOAN">Pinjam</option><option value="RENT">Sewa</option></select></label><label>Nama peminjam / penyewa *<input name="borrower_name" required maxLength={160}/><small>Boleh pihak luar, tidak memerlukan akun.</small></label><label>Kontak<input name="contact" maxLength={160}/></label><div className="erp-full"><DateRangeFields required start={{ name: "loan_on", label: "Tanggal keluar" }} end={{ name: "due_on", label: "Rencana kembali" }}/></div><label>Biaya sewa rupiah<input name="rental_fee" inputMode="numeric" pattern="[0-9]+" defaultValue="0"/></label><label>Catatan<textarea name="notes" maxLength={5000}/></label></div><FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan transaksi"}</button><button type="button" onClick={close}>Batal</button></FormActions></form>}</FormSurface>}
  </section>;
}
