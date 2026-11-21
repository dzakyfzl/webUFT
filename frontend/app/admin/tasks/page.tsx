import { PageHeading } from "../ui";
import TaskBoard from "./task-board";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const params = await searchParams;
  return <><PageHeading title="Tugas & Kanban"/><TaskBoard startCreating={params.new === "1"}/></>;
}
