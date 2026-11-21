"use client";

import Disclosure from "../../components/ui/disclosure";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useErp } from "../erp-context";
import { EmptyState, LoadState, PageHeading, dateLabel, unitLabel, useProgramList, useResource } from "../ui";
import { query } from "../../lib/erp/client";
import type { ItemList, Program, Unit } from "../../lib/erp/types";

function ProgramGroups({ programs, units, assigned }: { programs: Program[]; units: Unit[]; assigned: Set<string> }) {
  const groups = new Map<string, { label: string; organization: boolean; items: Program[] }>();
  for (const program of programs) {
    const group = groups.get(program.owner_unit_id);
    if (group) {
      group.items.push(program);
      continue;
    }
    const unit = units.find(unit => unit.id === program.owner_unit_id);
    groups.set(program.owner_unit_id, {
      label: unit ? unitLabel(unit, units) : "Unit tidak tersedia",
      organization: unit?.kind === "ORGANIZATION",
      items: [program],
    });
  }
  const sorted = [...groups].sort(([, a], [, b]) => Number(b.organization) - Number(a.organization) || a.label.localeCompare(b.label, "id"));

  return <div className="erp-program-groups">{sorted.map(([id, group]) => <section key={id} className="erp-program-group" aria-label={group.label}>
    <header><h2>{group.label}</h2><span>{group.items.length} Proker</span></header>
    <ul>{group.items.map(program => <li key={program.id}>
      <Link className="erp-program-row" href={`/admin/programs/${program.id}`}>
        <div><h3>{program.name}</h3><p>{program.chairperson_name} · {dateLabel(program.starts_on)}</p></div>
        <div className="erp-program-labels">
          {assigned.has(program.id) && <span className="erp-pill erp-pill-active">Proker Saya</span>}
          {!program.capabilities.edit && <span className="erp-pill">Hanya lihat</span>}
        </div>
      </Link>
    </li>)}</ul>
  </section>)}</div>;
}

export default function ProgramsPage() {
  const { me } = useErp();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveVisited, setArchiveVisited] = useState(false);
  const units = useResource<ItemList<Unit>>(`/units${query({ period_id: me.period_id })}`);
  const active = useProgramList(me.period_id, "all");
  const mine = useProgramList(me.period_id, "mine");
  const archive = useProgramList(archiveVisited ? me.period_id : null, "archive");
  const assigned = new Set(mine.data?.map(program => program.id));

  return <>
    <PageHeading title="Program Kerja" description="Pantau program kerja dari seluruh unit.">
      {me.capabilities.create_program && <Link className="erp-button erp-primary" href="/admin/programs/new"><Plus size={16} aria-hidden="true"/>Buat Proker</Link>}
    </PageHeading>
    <div className="erp-stack">
      {mine.error && !mine.data && <LoadState error={mine.error} reload={mine.reload}/>}
      {!units.data || !active.data ? (
        <LoadState error={units.error || active.error} reload={() => { units.reload(); active.reload(); }}/>
      ) : active.data.length ? (
        <ProgramGroups programs={active.data} units={units.data.items} assigned={assigned}/>
      ) : <section className="erp-panel"><EmptyState title="Belum ada Proker aktif pada periode ini"/></section>}
      <Disclosure className="erp-panel erp-program-archive" open={archiveOpen} onToggle={event => {
        const open = event.currentTarget.open;
        setArchiveOpen(open);
        if (open) setArchiveVisited(true);
      }} summary={<>Arsip Proker</>}>
        {archiveVisited && (!units.data || !archive.data ? (
          <LoadState error={units.error || archive.error} reload={() => { units.reload(); archive.reload(); }}/>
        ) : archive.data.length ? (
          <ProgramGroups programs={archive.data} units={units.data.items} assigned={assigned}/>
        ) : <EmptyState title="Belum ada Proker yang ditutup"/>)}
      </Disclosure>
    </div>
  </>;
}
