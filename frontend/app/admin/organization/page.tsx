"use client";

import Disclosure from "../../components/ui/disclosure";

import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { Account, ItemList, Period, Person, Unit } from "../../lib/erp/types";
import { FormActions, FormSurface } from "../form-surface";
import { useErp } from "../erp-context";
import { Feedback, LoadState, PageHeading, formText, useAction, useResource } from "../ui";

const positions = {
  CHAIR: "Ketua Umum", VICE_CHAIR: "Wakil Ketua Umum", SECRETARY: "Sekretaris", TREASURER: "Bendahara",
  HEAD_INTERNAL: "Kepala Departemen Internal", HEAD_EXTERNAL: "Kepala Departemen Eksternal",
  HEAD_ASSET: "Kepala Departemen Asset dan Property", HEAD_HUNTING: "Kepala Bidang Hunting",
  HEAD_MODELING: "Kepala Bidang Modeling", HEAD_MEDKOM: "Kepala Bidang Medkom",
  HEAD_PR: "Kepala Bidang Public Relations", HEAD_HR: "Kepala HR",
};

export default function OrganizationPage() {
  const { me, refresh } = useErp();
  const action = useAction();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const accounts = useResource<ItemList<Account>>(me.capabilities.manage_organization ? `/users${query({ offset, search })}` : null);
  const periods = useResource<ItemList<Period>>("/periods");
  const [targetPeriod, setTargetPeriod] = useState(me.period_id);
  const [selectedUser, setSelectedUser] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetUser, setResetUser] = useState<Account | null>(null);
  const [renameUser, setRenameUser] = useState<Account | null>(null);
  const [selectedMember, setSelectedMember] = useState<Person | null>(null);
  const [memberRevision, setMemberRevision] = useState(0);
  const units = useResource<ItemList<Unit>>(`/units${query({ period_id: targetPeriod })}`);
  if (!me.capabilities.manage_organization) return <p className="erp-error" role="alert">Halaman ini hanya untuk pengurus Inti aktif.</p>;
  return <><PageHeading title="Organisasi & Akun" description="Kelola akun pribadi, keanggotaan unit, dan jabatan setiap periode."><button type="button" className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setSelectedMember(null); setCreating(true); }}>Buat akun pengurus</button></PageHeading>{!resetUser && !renameUser && !creating && <Feedback {...action}/>}
    <div className="erp-stack"><section className="erp-panel">
      <header className="erp-panel-heading erp-account-header">
        <h2>Akun pengurus</h2>
        <label className="erp-compact-field">Periode yang dikelola<select value={targetPeriod} onChange={event => setTargetPeriod(event.target.value)}>
          {periods.data?.items.filter(period => !period.archived_at).map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
        </select></label>
      </header>
      <form role="search" onSubmit={event => { event.preventDefault(); setSearch(formText(new FormData(event.currentTarget), "search")); setOffset(0); }}>
        <label>Cari akun<input name="search" type="search" maxLength={160} placeholder="Nama atau username"/></label><div><button>Cari akun</button></div>
      </form>
      {accounts.data?.items.length === 0 && <p className="erp-empty">Tidak ada akun yang sesuai. Ubah pencarian atau buat akun melalui bagian Buat akun pengurus.</p>}
      {!accounts.data ? <LoadState error={accounts.error} reload={accounts.reload}/> : <><div className="erp-list">{accounts.data.items.map(account => <div className="erp-list-item" key={account.id}><div><h3>{account.display_name}</h3><p>@{account.username} · {account.active ? "Aktif" : "Nonaktif"}</p></div>
        <div className="erp-row"><button onClick={() => { setSelectedUser(account); setResetUser(null); setRenameUser(null); }}>Atur akses</button><button onClick={() => { action.clear(); setRenameUser(account); setResetUser(null); }}>Ubah nama</button><button onClick={() => { action.clear(); setResetUser(account); setRenameUser(null); }}>Reset password</button>
          {account.id !== me.user.id && <button disabled={action.busy} onClick={() => { if (window.confirm(`${account.active ? "Nonaktifkan" : "Aktifkan"} akun ${account.display_name}?`)) action.run(async () => { await api(`/users/${account.id}`, { method: "PATCH", body: { active: !account.active } }); accounts.reload(); }); }}>{account.active ? "Nonaktifkan" : "Aktifkan"}</button>}
        </div></div>)}</div><div className="erp-row" style={{ marginTop: 20 }}>{offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - 50))}>Sebelumnya</button>}{accounts.data.has_more && <button onClick={() => setOffset(offset + 50)}>Berikutnya</button>}</div></>}
      {renameUser && <FormSurface title="Ubah nama pengurus" description={`@${renameUser.username}`} busy={action.busy} onClose={() => setRenameUser(null)}>{close => <form key={renameUser.id} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); action.run(async () => {
        await api(`/users/${renameUser.id}`, { method: "PATCH", body: { display_name: formText(form, "display_name") } }); accounts.reload(); setRenameUser(null); if (renameUser.id === me.user.id) await refresh(me.period_id);
      }, "Nama pengurus diperbarui."); }}><Feedback {...action}/><label>Nama pengurus *<input name="display_name" defaultValue={renameUser.display_name} required maxLength={160}/></label><FormActions><button className="erp-primary" disabled={action.busy}>Simpan nama</button><button type="button" onClick={close}>Batal</button></FormActions></form>}</FormSurface>}
      {resetUser && <FormSurface title="Reset password" description={resetUser.display_name} busy={action.busy} onClose={() => setResetUser(null)}>{close => <form onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => { await api(`/users/${resetUser.id}`, { method: "PATCH", body: { password: String(form.get("password")) } }); element.reset(); setResetUser(null); }, "Password direset. Sesi akun tersebut telah diakhiri."); }}>
        <Feedback {...action}/><label>Password baru *<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} aria-describedby="reset-password-hint"/></label><small id="reset-password-hint">Minimal 12 karakter. Reset mengakhiri sesi akun tersebut.</small><FormActions><button className="erp-primary" disabled={action.busy}>Reset password</button><button type="button" onClick={close}>Batal</button></FormActions>
      </form>}</FormSurface>}
    </section>
    {selectedUser && <MembershipEditor key={`${selectedUser.id}:${targetPeriod}`} account={selectedUser} periodId={targetPeriod} periodName={periods.data?.items.find(period => period.id === targetPeriod)?.name} units={units.data?.items} onClose={() => setSelectedUser(null)}
      error={units.error} retry={units.reload} onDone={async () => { accounts.reload(); if (selectedUser.id === me.user.id) await refresh(me.period_id); }}/>}
    <MemberDirectory key={memberRevision} onSelect={member => { action.clear(); setSelectedMember(member); setCreating(true); }}/>
    {creating && <FormSurface drawer title="Buat akun pengurus" description={periods.data?.items.find(period => period.id === targetPeriod)?.name} busy={action.busy}
      onClose={() => { setCreating(false); setSelectedMember(null); }}>
      {close => <form key={selectedMember?.id ?? "new-member"} onSubmit={event => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        action.run(async () => {
          await api<Account>("/users", { method: "POST", body: { username: formText(form, "username").toLowerCase(), password: String(form.get("password")), display_name: selectedMember?.display_name ?? formText(form, "display_name"), member_id: selectedMember?.id ?? null, period_id: targetPeriod } });
          element.reset(); accounts.reload(); setCreating(false); setSelectedMember(null); setMemberRevision(value => value + 1);
        }, "Akun dibuat. Pilih Atur akses untuk menambahkan keanggotaan atau jabatan.");
      }}>
        <Feedback {...action}/>
        <label>Nama pengurus *<input name="display_name" defaultValue={selectedMember?.display_name ?? ""} readOnly={!!selectedMember} required maxLength={160}/></label>
        {selectedMember && <div><button type="button" onClick={() => {
          if ((document.querySelector<HTMLInputElement>('dialog input[name="username"]')?.value || document.querySelector<HTMLInputElement>('dialog input[name="password"]')?.value) && !window.confirm("Buang isian akun yang belum disimpan?")) return;
          setSelectedMember(null);
          requestAnimationFrame(() => document.querySelector<HTMLInputElement>('dialog input[name="display_name"]')?.focus());
        }}>Gunakan anggota baru</button></div>}
        <label>Username *<input data-form-focus={selectedMember ? "" : undefined} name="username" required pattern={String.raw`[a-z0-9_.\-]+`} autoCapitalize="none" autoComplete="username" maxLength={80} aria-describedby="new-account-name-hint"/></label>
        <small id="new-account-name-hint">Gunakan huruf kecil, angka, titik, garis bawah, atau tanda hubung.</small>
        <label>Password awal *<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={256} aria-describedby="initial-password-hint"/></label>
        <small id="initial-password-hint">Minimal 12 karakter. Sampaikan melalui saluran pribadi.</small>
        <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Membuat akun…" : "Buat akun"}</button><button type="button" onClick={close}>Batal</button></FormActions>
      </form>}
    </FormSurface>}
    <section className="erp-panel"><Disclosure summary={<>Siapkan periode baru</>}><form onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => {
      const period = await api<Period>("/periods", { method: "POST", body: { name: formText(form, "name") } }); element.reset(); periods.reload(); setTargetPeriod(period.id);
    }, "Periode dibuat. Tetapkan Ketua Umum dan keanggotaan penerus sebelum arsip."); }}><label className="erp-compact-field">Nama periode *<input name="name" placeholder="2027–2028" required maxLength={120}/></label><p className="erp-muted">Struktur UKM disiapkan tanpa menyalin tugas atau progres periode lama.</p><div><button disabled={action.busy}>Buat periode</button></div></form></Disclosure></section>
  </div></>;
}

function MemberDirectory({ onSelect }: { onSelect: (member: Person) => void }) {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const resource = useResource<ItemList<Person>>(`/members${query({ search, offset, without_account: true })}`);
  const action = useAction();
  return <section className="erp-panel"><Disclosure summary={<>Anggota tanpa akun</>}>
    <p className="erp-muted">Gunakan identitas yang sudah tercatat saat membuat akun agar data anggota tetap tersambung.</p>
    <form role="search" onSubmit={event => { event.preventDefault(); setSearch(formText(new FormData(event.currentTarget), "search")); setOffset(0); }}><label>Cari anggota<input type="search" name="search" maxLength={160}/></label><div><button>Cari anggota</button></div></form>
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      {resource.data.items.length === 0 && <p className="erp-empty">Tidak ada anggota tanpa akun yang sesuai. Ubah pencarian atau catat anggota baru pada formulir di bagian ini.</p>}
      <div className="erp-list">{resource.data.items.map(member => <div className="erp-list-item" key={member.id}><h3>{member.display_name}</h3><button onClick={() => onSelect(member)}>Buat akun untuk anggota ini</button></div>)}</div>
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - 50))}>Anggota sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 50)}>Anggota berikutnya</button>}</div>
    </>}
    <Feedback {...action}/><form className="erp-inline-form" style={{ marginTop: 12 }} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => { await api("/members", { method: "POST", body: { name: formText(form, "name") } }); element.reset(); resource.reload(); }, "Anggota dicatat tanpa membuat akun login."); }}>
      <label>Nama anggota baru *<input name="name" required maxLength={120}/></label><div><button disabled={action.busy}>Catat anggota tanpa akun</button></div>
    </form>
  </Disclosure></section>;
}

function MembershipEditor({ account, periodId, periodName, units, onDone, onClose, error, retry }: {
  account: Account; periodId: string; periodName?: string; units?: Unit[]; onDone: () => Promise<void>; onClose: () => void; error: string; retry: () => void;
}) {
  const resource = useResource<{ active: boolean; unit_ids: string[]; positions: string[] }>(`/memberships${query({ user_id: account.id, period_id: periodId })}`);
  const action = useAction();
  const membership = resource.data;
  return <FormSurface drawer title={`Atur akses ${account.display_name}`} description={periodName} busy={action.busy} onClose={onClose}>
    {close => !membership || !units ? <LoadState error={resource.error || error} reload={() => { resource.reload(); retry(); }}/> : <form key={JSON.stringify(membership)} onSubmit={event => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      action.run(async () => {
        await api("/memberships", { method: "PUT", body: { user_id: account.id, period_id: periodId, active: form.get("active") === "on", unit_ids: form.getAll("unit_ids"), positions: form.getAll("positions") } });
        element.reset(); resource.reload();
        await onDone();
      });
    }}>
      <Feedback {...action}/>
      <label className="erp-check-label"><input name="active" type="checkbox" defaultChecked={membership.active}/> Pengurus aktif pada periode ini</label>
      <fieldset className="erp-form-section">
        <legend>Keanggotaan unit</legend><small>Anggota bidang otomatis menjadi anggota departemen induknya.</small>
        {units.filter(unit => unit.kind !== "ORGANIZATION").map(unit => <label key={unit.id} className="erp-check-label"><input type="checkbox" name="unit_ids" value={unit.id} defaultChecked={membership.unit_ids.includes(unit.id)}/>{unit.name}</label>)}
      </fieldset>
      <fieldset className="erp-form-section">
        <legend>Jabatan Inti</legend>
        {Object.entries(positions).map(([value, label]) => <label key={value} className="erp-check-label"><input type="checkbox" name="positions" value={value} defaultChecked={membership.positions.includes(value)}/>{label}</label>)}
      </fieldset>
      <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan akses periode"}</button><button type="button" onClick={close}>Tutup</button></FormActions>
    </form>}
  </FormSurface>;
}
