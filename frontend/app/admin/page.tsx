"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ListChecks, Plus, Presentation } from "lucide-react";
import { query } from "../lib/erp/client";
import type { CalendarEvent, Program, Task } from "../lib/erp/types";
import { useErp } from "./erp-context";
import { TaskDeadline, useJakartaDay } from "./task-deadline";
import { LoadState, PageHeading, dateLabel, statusLabels, useResource } from "./ui";

type Dashboard = { tasks: Task[]; events: CalendarEvent[]; programs: Program[] };

function Summary({ title, icon: Icon, href, action, children }: {
  title: string; icon: typeof ListChecks; href: string; action: string; children: React.ReactNode;
}) {
  return <section className="erp-panel erp-summary">
    <h2><Icon size={18} aria-hidden="true"/>{title}</h2>
    <div className="erp-summary-items">{children}</div>
    <Link className="erp-summary-link" href={href}>{action}<ArrowRight size={14} aria-hidden="true"/></Link>
  </section>;
}

export default function DashboardPage() {
  const { me } = useErp();
  const today = useJakartaDay();
  const resource = useResource<Dashboard>(`/dashboard${query({ period_id: me.period_id })}`);
  const tasks = [...(resource.data?.tasks ?? [])].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")).slice(0, 3);
  const events = resource.data?.events.slice(0, 3) ?? [];
  const programs = resource.data?.programs.slice(0, 3) ?? [];
  const writable = !me.periods.find(period => period.id === me.period_id)?.archived_at;

  return <>
    <PageHeading title={`Halo, ${me.user.display_name.split(" ")[0]}.`}>
      {writable && <Link className="erp-button erp-primary" href="/admin/tasks?new=1"><Plus size={16} aria-hidden="true"/>Tambah Tugas</Link>}
    </PageHeading>
    {!resource.data && resource.error ? <LoadState error={resource.error} reload={resource.reload}/> : <div className="erp-dashboard">
      <div className="erp-summary-grid" aria-busy={resource.refreshing}>
        <Summary title="Tugas Prioritas" icon={ListChecks} href="/admin/tasks" action="Buka papan tugas">
          {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : tasks.length ? tasks.map(task => (
            <Link className="erp-summary-item" key={task.id} href={`/admin/tasks/${task.id}`}>
              <strong>{task.title}</strong>
              <span>{statusLabels[task.status]} {task.deadline && <TaskDeadline deadline={task.deadline} today={today}/>}</span>
            </Link>
          )) : <p className="erp-muted">Tidak ada tugas yang perlu dikerjakan.</p>}
        </Summary>
        <Summary title="Agenda Terdekat" icon={CalendarDays} href="/admin/calendar" action="Buka kalender">
          {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : events.length ? events.map(event => {
            const href = event.resource_id && event.source !== "AGENDA"
              ? `/admin/${event.source === "TASK" ? "tasks" : "programs"}/${event.resource_id}` : "/admin/calendar";
            return <Link className="erp-summary-item" key={event.id} href={href}>
              <strong>{event.title}</strong><span>{dateLabel(event.starts_at ?? event.starts_on)}{event.starts_at && ` · ${new Date(event.starts_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })} WIB`}</span>
            </Link>;
          }) : <p className="erp-muted">Belum ada agenda terdekat.</p>}
        </Summary>
        <Summary title="Proker Saya" icon={Presentation} href="/admin/programs" action="Lihat daftar Proker">
          {!resource.data ? <LoadState error={resource.error} reload={resource.reload}/> : programs.length ? programs.map(program => (
            <Link className="erp-summary-item" key={program.id} href={`/admin/programs/${program.id}`}>
              <strong>{program.name}</strong><span>{dateLabel(program.starts_on)}</span>
            </Link>
          )) : <p className="erp-muted">Penugasan Proker Anda akan muncul di sini. Anda dapat melihat kegiatan unit lain di daftar Proker.</p>}
        </Summary>
      </div>
    </div>}
  </>;
}
