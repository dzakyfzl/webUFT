export type ItemList<T> = { items: T[]; has_more?: boolean };
export type Unit = { id: string; name: string; kind: "ORGANIZATION" | "DEPARTMENT" | "DIVISION" | "FUNCTION"; parent_id?: string | null; period_id?: string };
export type Person = { id: string; display_name: string };
export type Period = { successor_ready?: boolean; id: string; name: string; archived_at?: string | null };
export type Account = Person & { username: string; active: boolean; member_id: string };
export type Me = {
  user: Account; period_id: string; periods: Period[]; units: Unit[]; positions: string[]; csrf_token: string;
  capabilities: { manage_organization: boolean; create_program: boolean; archive_period: boolean };
};
export type Program = {
  id: string; period_id: string; owner_unit_id: string; name: string; description: string;
  chairperson_name: string; chairperson_user_id: string | null; created_by: string; created_at: string;
  starts_on: string | null; ends_on: string | null; closed_at: string | null; period_archived: boolean; status: "ACTIVE" | "CLOSED";
  version: number; unfinished_tasks?: number;
  assignments?: { user_id: string; source: string; source_id: string }[];
  capabilities: { edit: boolean; close: boolean; assign: boolean; change_chairperson: boolean; structure: boolean };
};
export type ScopeType = "ORGANIZATION" | "DEPARTMENT" | "DIVISION" | "PROGRAM";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type Task = {
  id: string; title: string; description: string; board_name: string; period_id: string; scope_type: ScopeType; scope_id: string | null;
  program_id: string | null; unit_id: string | null; status: TaskStatus; deadline: string | null;
  assignee_user_id: string | null; committee_member_id: string | null; version: number; can_edit: boolean;
};
export type Group = { id: string; label: string; parent_id: string | null; sort_order: number };
export type Committee = { groups: Group[]; members: { id: string; display_name: string; role: string; group_id: string | null; user_id: string | null }[] };
export type Budget = { total_rupiah: string; items: { id: string; name: string; category: string; quantity: string; unit: string; unit_price: string; total_rupiah: string; notes: string; version: number }[] };
export type CalendarEvent = {
  id: string; resource_id?: string; source: "AGENDA" | "TASK" | "PROGRAM"; title: string;
  starts_at?: string; ends_at?: string; starts_on?: string; ends_on?: string; program_id: string | null;
  scope_type: ScopeType; scope_id: string | null; version?: number; can_edit: boolean;
};
export type Counts = { TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number; overdue: number };
export type Monitoring = { total: Counts; items: (Unit & { direct: Counts; rollup: Counts })[] };
export type HistorySummary = Period & { tasks: Omit<Counts, "overdue">; program_count: number; archived_by_name?: string };
export type Activity = { id: string; actor_name: string; actor_positions: { period_id: string; position: string }[]; occurred_at: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };
