"use client";

import { useRef } from "react";
import { DateRangeFields, FormActions, SearchableSelect } from "../../form-surface";
import { useRouter } from "next/navigation";
import { useErp } from "../../erp-context";
import { Feedback, LoadState, PageHeading, formText, useAction, useDirectory, useResource } from "../../ui";
import { api, query } from "../../../lib/erp/client";
import type { ItemList, Program, Unit } from "../../../lib/erp/types";

export default function NewProgramPage() {
  const { me } = useErp();
  const router = useRouter();
  const action = useAction();
  const dirty = useRef(false);
  const units = useResource<ItemList<Unit>>(`/units${query({ period_id: me.period_id })}`);
  const people = useDirectory(me.period_id);
  if (!me.capabilities.create_program) return <p className="erp-error" role="alert">Hanya pengurus Inti dapat membuat Proker.</p>;
  return <><PageHeading title="Buat Proker" description="Proker langsung aktif. Panitia, RAB, dan tugas dapat dilengkapi setelahnya."/>
    {!units.data || !people.data ? <LoadState error={units.error || people.error} reload={() => { units.reload(); people.reload(); }}/> :
      <section className="erp-panel erp-reading-form"><form onInput={event => { if (event.target instanceof HTMLElement && !event.target.hasAttribute("data-form-filter")) dirty.current = true; }} onSubmit={event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        action.run(async () => {
          const program = await api<Program>("/programs", { method: "POST", body: {
            period_id: me.period_id, owner_unit_id: formText(form, "owner_unit_id"), name: formText(form, "name"),
            description: formText(form, "description"), chairperson_name: formText(form, "chairperson_name"),
            chairperson_user_id: formText(form, "chairperson_user_id") || null,
            starts_on: formText(form, "starts_on") || null, ends_on: formText(form, "ends_on") || null,
          }}); router.push(`/admin/programs/${program.id}`);
        });
      }}>
        <section className="erp-form-section">
          <h3>Informasi Proker</h3>
          <label>Nama Proker *<input name="name" required maxLength={160}/></label>
          <label>Unit pemilik *<select name="owner_unit_id" required>{units.data.items.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label>Deskripsi<textarea name="description" maxLength={10000}/></label>
        </section>
        <section className="erp-form-section">
          <h3>Jadwal</h3>
          <DateRangeFields start={{ name: "starts_on", label: "Tanggal mulai" }} end={{ name: "ends_on", label: "Tanggal akhir" }}/>
        </section>
        <section className="erp-form-section">
          <h3>Pelaksana</h3>
          <div className="erp-form-grid">
            <label>Nama Ketua Pelaksana *<input name="chairperson_name" required maxLength={160}/></label>
            <SearchableSelect label="Akun Ketua Pelaksana" name="chairperson_user_id" empty="Tanpa akun"
              options={people.data.items.map(person => ({ value: person.id, label: person.display_name }))}/>
          </div>
          <small>Pilih akun jika Ketua Pelaksana perlu mengelola Proker di aplikasi.</small>
        </section>
        <Feedback {...action}/>
        <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Buat Proker"}</button><button type="button" disabled={action.busy} onClick={() => { if (!dirty.current || window.confirm("Buang perubahan yang belum disimpan?")) router.push("/admin/programs"); }}>Batal</button></FormActions>
      </form></section>}
  </>;
}
