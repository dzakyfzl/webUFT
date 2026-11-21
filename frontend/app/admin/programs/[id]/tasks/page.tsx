"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { Program } from "../../../../lib/erp/types";
import TaskBoard from "../../../tasks/task-board";
import { LoadState, PageHeading, useResource } from "../../../ui";

export default function ProgramTasksPage() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource<Program>(`/programs/${id}`);
  if (!resource.data) return <LoadState error={resource.error} reload={resource.reload}/>;
  return <><PageHeading title={resource.data.name} description="Papan tugas Proker."><Link className="erp-button" href={`/admin/programs/${id}`}>Ringkasan Proker</Link></PageHeading><TaskBoard program={resource.data}/></>;
}
