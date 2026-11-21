"use client";

import Disclosure from "../components/ui/disclosure";

import Link, { useLinkStatus } from "next/link";
import { Archive, CalendarDays, ChevronDown, ClipboardList, Database, FolderKanban, House, Link2, ListChecks, Network, Settings2, Users, CalendarCheck, Box, ChartNoAxesCombined } from "lucide-react";
import { query } from "../lib/erp/client";
import type { ItemList, Me, Unit } from "../lib/erp/types";
import { LoadState, unitLabel, useResource } from "./ui";

const dataLinks = [
  { href: "/admin/inventory", label: "Inventaris", icon: Box },
  { href: "/admin/events", label: "Acara & Formulir", icon: CalendarCheck },
  { href: "/admin/links", label: "Short Link", icon: Link2 },
  { href: "/admin/history", label: "Jejak Kepengurusan", icon: Archive },
];

function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="erp-spinner erp-nav-pending" aria-hidden="true"/> : null;
}

export default function SidebarNavigation({ me, pathname, close }: { me: Me; pathname: string; close: () => void }) {
  const resource = useResource<ItemList<Unit>>(`/units${query({ period_id: me.period_id })}`);
  const units = resource.data?.items ?? [];
  const boards = units.filter(unit => unit.kind === "DEPARTMENT" || unit.kind === "DIVISION")
    .sort((a, b) => unitLabel(a, units).localeCompare(unitLabel(b, units), "id"));
  const own = new Set(me.units.map(unit => unit.id));
  const unitHref = (id: string) => `/admin/tasks/unit/${id}`;
  const unitActive = (unit: Unit) => pathname === unitHref(unit.id);
  const personal = pathname === "/admin/tasks"
    || pathname.startsWith("/admin/tasks/") && !pathname.startsWith("/admin/tasks/unit/") && pathname !== "/admin/tasks/common";
  const matches = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const systemLinks = [
    ...(me.capabilities.create_program ? [{ href: "/admin/monitoring", label: "Monitoring Departemen", icon: ChartNoAxesCombined }] : []),
    ...(me.capabilities.manage_organization ? [{ href: "/admin/organization", label: "Organisasi & Akun", icon: Users }] : []),
  ];

  function navItem({ href, label, icon: Icon, active = matches(href) }: {
    href: string; label: string; icon?: typeof House; active?: boolean;
  }) {
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={close}>
      {Icon && <Icon size={16} aria-hidden="true"/>}<span>{label}</span><NavPending/>
    </Link>;
  }

  function unitGroup(label: string, group: Unit[]) {
    return group.length > 0 && <Disclosure className="erp-nav-subgroup" open={group.some(unitActive)} summary={<><span>{label}</span><ChevronDown size={13} aria-hidden="true"/></>}>
      <div>{group.map(unit => navItem({ href: unitHref(unit.id), label: unitLabel(unit, units), active: unitActive(unit) }))}</div>
    </Disclosure>;
  }

  return <nav key={pathname} aria-label="Navigasi pengurus" className="erp-nav">
    {navItem({ href: "/admin", label: "Beranda", icon: House, active: pathname === "/admin" })}
    <Disclosure className="erp-nav-group" open={pathname === "/admin" || ["/admin/tasks", "/admin/programs", "/admin/calendar"].some(matches)} summary={<><ClipboardList size={16} aria-hidden="true"/><span>Tugas</span><ChevronDown size={14} aria-hidden="true"/></>}>
      <div>
        {navItem({ href: "/admin/tasks", label: "Tugas Saya", icon: ListChecks, active: personal })}
        {navItem({ href: "/admin/tasks/common", label: "Umum UKM", icon: Network })}
        {unitGroup("Unit Saya", boards.filter(unit => own.has(unit.id)))}
        {unitGroup("Jelajahi Unit Lain", boards.filter(unit => !own.has(unit.id)))}
        {resource.error && !resource.data && <LoadState error={resource.error} reload={resource.reload}/>}
        {navItem({ href: "/admin/programs", label: "Program Kerja", icon: FolderKanban })}
        {navItem({ href: "/admin/calendar", label: "Kalender", icon: CalendarDays })}
      </div>
    </Disclosure>
    <Disclosure className="erp-nav-group" open={dataLinks.some(item => matches(item.href))} summary={<><Database size={16} aria-hidden="true"/><span>Data</span><ChevronDown size={14} aria-hidden="true"/></>}>
      <div>{dataLinks.map(item => navItem(item))}</div>
    </Disclosure>
    {systemLinks.length > 0 && <Disclosure className="erp-nav-group" open={systemLinks.some(item => matches(item.href))} summary={<><Settings2 size={16} aria-hidden="true"/><span>Sistem</span><ChevronDown size={14} aria-hidden="true"/></>}>
      <div>{systemLinks.map(item => navItem(item))}</div>
    </Disclosure>}
  </nav>;
}
