"use client";

import { FormActions, FormSurface } from "../form-surface";

import { useState } from "react";
import { api, query } from "../../lib/erp/client";
import type { ItemList } from "../../lib/erp/types";
import type { ShortLink } from "../../lib/erp/p1-types";
import { useErp } from "../erp-context";
import { Feedback, EmptyState, LoadState, PageHeading, formText, useAction, useResource } from "../ui";

export default function LinksPage() {
  const { me } = useErp();
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<ShortLink | "new" | null>(null);
  const editing = editor === "new" ? null : editor;
  const resource = useResource<ItemList<ShortLink>>(`/links${query({ period_id: me.period_id, offset })}`);
  const action = useAction();
  return <><PageHeading title="Short Link" description="Buat tautan singkat dan kelola tautan milik Anda."><button className="erp-primary" aria-haspopup="dialog" onClick={() => { action.clear(); setEditor("new"); }}>Buat Tautan</button></PageHeading>{!editor && <Feedback {...action}/>}<div className="erp-stack"><section className="erp-panel">
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      {!resource.data.items.length && <EmptyState title="Belum ada tautan singkat" description="Buat tautan yang mudah dibagikan untuk kegiatan UKM."/>}
      {resource.data.items.map(item => <div key={item.id} className="erp-list-item"><div><h3><a href={`/link/${item.slug}`} target="_blank" rel="noopener noreferrer">/link/{item.slug}</a></h3><p style={{ overflowWrap: "anywhere" }}>{item.destination_url}</p><small>{item.active ? "Aktif" : "Nonaktif"}</small></div>{item.can_edit && <div className="erp-row"><button onClick={() => { action.clear(); setEditor(item); }}>Edit</button><button disabled={action.busy} onClick={() => { if (window.confirm("Hapus short link? URL ini tidak lagi mengalihkan pengunjung.")) action.run(async () => { await api(`/links/${item.id}`, { method: "DELETE", body: { expected_version: item.version } }); resource.reload(); }); }}>Hapus</button></div>}</div>)}
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
    </>}
    </section></div>{editor && <FormSurface title={editing ? "Edit tautan" : "Tautan baru"} busy={action.busy} onClose={() => setEditor(null)}>{close => <form key={editing?.id ?? "new"} onSubmit={event => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); action.run(async () => {
      await api(`/links${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body: { period_id: me.period_id, slug: formText(form, "slug"), destination_url: formText(form, "destination_url"), active: form.get("active") === "on", expected_version: editing?.version ?? 1 } }); element.reset(); setEditor(null); resource.reload();
    }); }}><Feedback {...action}/><label>Slug *<input name="slug" required minLength={3} maxLength={80} pattern={String.raw`[a-zA-Z0-9][a-zA-Z0-9_\-]+`} defaultValue={editing?.slug}/></label><label>URL tujuan *<input name="destination_url" type="url" required maxLength={2000} defaultValue={editing?.destination_url}/></label><small>Hanya HTTP/HTTPS publik. Alamat internal, loopback, dan URL berkredensial ditolak.</small><label className="erp-check-label"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true}/> Tautan aktif</label><FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan tautan"}</button><button type="button" disabled={action.busy} onClick={close}>Batal</button></FormActions></form>}</FormSurface>}</>;
}
