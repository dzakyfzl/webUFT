"use client";

import { useParams } from "next/navigation";
import TaskBoard from "../../task-board";
import { PageHeading } from "../../../ui";

export default function UnitBoardPage() {
  const { id } = useParams<{ id: string }>();
  return <><PageHeading title="Papan unit" description="Tugas asli unit dan Proker terkait. Hak edit mengikuti scope asli setiap tugas."/><TaskBoard key={id} initialView={id}/></>;
}
