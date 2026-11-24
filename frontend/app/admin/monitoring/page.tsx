"use client";

import Link from "next/link";
import { useErp } from "../erp-context";
import { LoadState, PageHeading, useResource } from "../ui";
import { query } from "../../lib/erp/client";
import type { Monitoring } from "../../lib/erp/types";

export default function MonitoringPage() {
  const { me } = useErp();
  const resource = useResource<Monitoring>(me.capabilities.create_program ? `/monitoring/units${query({ period_id: me.period_id })}` : null);
  if (!me.capabilities.create_program) return <p role="alert" className="erp-error">Monitoring tersedia bagi pengurus Inti. Progres lintas unit dapat dibaca melalui Tugas & Kanban.</p>;
  return <><PageHeading title="Monitoring Departemen" description="Ringkasan pekerjaan aktif lintas unit. Proker ditutup dan periode arsip tidak dihitung."/>
    <div className="erp-stack">{resource.error && <LoadState error={resource.error} reload={resource.reload}/>}
      <div className="erp-stats">{[["TODO", "Belum dikerjakan"], ["IN_PROGRESS", "Sedang dikerjakan"], ["REVIEW", "Perlu ditinjau"], ["DONE", "Selesai"]].map(([key, label]) => <div key={key} className="erp-panel"><div className="erp-stat">{resource.data?.total[key as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"] ?? "—"}</div><p>{label}</p></div>)}</div>
      <section className="erp-panel"><p className="erp-muted">Total UKM menghitung setiap tugas satu kali. Ringkasan departemen mencakup bidang di bawahnya; baris bidang sudah termasuk dalam total departemen.</p>
        <div className="erp-table-wrap"><table><thead><tr><th>Unit</th><th>Belum dikerjakan</th><th>Proses</th><th>Perlu ditinjau</th><th>Selesai</th><th>Terlambat</th></tr></thead><tbody>{!resource.data && <tr><td colSpan={6}><LoadState error={resource.error} reload={resource.reload}/></td></tr>}{resource.data?.items.map(unit => <tr key={unit.id}><td><Link href={unit.kind === "ORGANIZATION" ? "/admin/tasks/common" : `/admin/tasks/unit/${unit.id}`}>{unit.name}</Link><small style={{ display: "block" }}>{unit.parent_id ? "Bidang" : unit.kind === "FUNCTION" ? "Fungsi lintas organisasi" : unit.kind === "ORGANIZATION" ? "Tugas Umum UKM" : "Termasuk bidang"}</small></td><td>{unit.rollup.TODO}</td><td>{unit.rollup.IN_PROGRESS}</td><td>{unit.rollup.REVIEW}</td><td>{unit.rollup.DONE}</td><td>{unit.rollup.overdue}</td></tr>)}</tbody></table></div>
        <p style={{ marginTop: 20 }}><Link className="erp-button" href="/admin/tasks">Buka tugas saya</Link></p>
      </section>
    </div>
  </>;
}
