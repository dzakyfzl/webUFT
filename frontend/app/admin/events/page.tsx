"use client";

import Link from "next/link";
import { useState } from "react";
import { query } from "../../lib/erp/client";
import type { PublicEvent } from "../../lib/erp/p1-types";
import type { ItemList } from "../../lib/erp/types";
import { useErp } from "../erp-context";
import { EmptyState, LoadState, PageHeading, dateLabel, useResource } from "../ui";
import EventEditor from "./event-editor";

export default function EventsPage() {
  const { me } = useErp();
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const resource = useResource<ItemList<PublicEvent>>(`/events${query({ period_id: me.period_id, offset })}`);
  return <><PageHeading title="Acara & Formulir" description="Publikasi acara, formulir fleksibel, dan respons peserta.">{!me.periods.find(period => period.id === me.period_id)?.archived_at && <button className="erp-primary" aria-haspopup="dialog" onClick={() => setCreating(true)}>Buat Acara</button>}</PageHeading><div className="erp-stack"><section className="erp-panel">
    {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : <>
      {!resource.data.items.length && <EmptyState title="Belum ada acara pada periode ini" description="Buat acara untuk menyiapkan publikasi dan pendaftaran peserta."/>}
      {resource.data.items.map(event => <Link key={event.id} href={`/admin/events/${event.id}`} className="erp-list-item"><div><h3>{event.title}</h3><p>{dateLabel(event.starts_at)} · {event.location}</p></div><span className="erp-pill">{({ DRAFT: "Draf", PUBLISHED: "Terbit", UNPUBLISHED: "Tidak ditampilkan" })[event.status] ?? event.status}</span></Link>)}
      <div className="erp-row">{offset > 0 && <button onClick={() => setOffset(offset - 30)}>Sebelumnya</button>}{resource.data.has_more && <button onClick={() => setOffset(offset + 30)}>Berikutnya</button>}</div>
    </>}
    </section></div>{creating && <EventEditor onClose={() => setCreating(false)}/>}</>;
}
