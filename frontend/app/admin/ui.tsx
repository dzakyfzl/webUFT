"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, query } from "../lib/erp/client";
import type { ItemList, Person, Program, Unit } from "../lib/erp/types";
import LoadingIndicator from "./loading-indicator";

function readResource<T>(path: string, signal: AbortSignal) {
  return api<T>(path, { signal });
}

export function useResource<T>(path: string | null, read = readResource<T>) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [state, setState] = useState<{ key: string; path: string | null; data: T | null; error: string }>({ key: "", path: null, data: null, error: "" });
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    read(path, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, path, data, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ key, path, data: previous.path === path ? previous.data : null, error: error.message }));
    });
    const refresh = () => reload();
    window.addEventListener("erp:changed", refresh);
    return () => { controller.abort(); window.removeEventListener("erp:changed", refresh); };
  }, [path, key, reload, read]);
  useEffect(() => {
    if (state.path === path && state.error && state.data) window.dispatchEvent(new CustomEvent("erp:refresh-error", { detail: state.error }));
  }, [state.key, state.path, state.error, state.data, path]);
  return { data: state.path === path ? state.data : null, error: state.path === path ? state.error : "", refreshing: state.key !== key, reload };
}

export function useDirectory(periodId: string | null) {
  const [revision, setRevision] = useState(0);
  const key = `${periodId}:${revision}`;
  const [state, setState] = useState<{ key: string; data: ItemList<Person> | null; error: string }>({ key: "", data: null, error: "" });
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!periodId) return;
    const controller = new AbortController();
    async function readDirectory() {
      const items: Person[] = [];
      let more = true;
      while (more) {
        const page = await api<ItemList<Person>>(`/directory${query({ period_id: periodId, offset: items.length, limit: 500 })}`, { signal: controller.signal });
        items.push(...page.items);
        more = !!page.has_more;
        if (more && !page.items.length) throw new Error("Direktori belum lengkap. Coba kembali.");
      }
      if (!controller.signal.aborted) setState({ key, data: { items }, error: "" });
    }
    readDirectory().catch(error => {
      if (!controller.signal.aborted) setState({ key, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [periodId, key]);
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : "", reload };
}

export function LoadState({ error, reload }: { error: string; reload: () => void }) {
  return error ? <div className="erp-error" role="alert"><p>{error}</p><button onClick={reload}>Coba kembali</button></div>
    : <LoadingIndicator label="Memuat data…" skeleton/>;
}

export function useAction() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function run(work: () => Promise<void>, message = "Perubahan tersimpan.") {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError(""); setSuccess("");
    try { await work(); setSuccess(message); notifyChange(); } catch (error) { setError(error instanceof Error ? error.message : "Perubahan belum tersimpan."); }
    finally { running.current = false; setBusy(false); }
  }
  function clear() { if (!running.current) { setError(""); setSuccess(""); } }
  return { busy, error, success, run, clear };
}

export function Feedback({ busy, error, success }: { busy?: boolean; error: string; success: string }) {
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error && notice.current?.closest("dialog[open]")) notice.current.focus();
  }, [error]);
  return <>{busy && <LoadingIndicator label="Memproses…"/>}{error && <p ref={notice} tabIndex={-1} className="erp-error" role="alert">{error}</p>}{success && <p className="erp-success" role="status">{success}</p>}</>;
}

export function PageHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <header className="erp-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="erp-heading-actions">{children}</div>}</header>;
}

export function dateLabel(value?: string | null) {
  if (!value) return "Belum dijadwalkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function rupiah(value: string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(BigInt(value));
}

export function formText(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
export const statusLabels = { TODO: "Belum dikerjakan", IN_PROGRESS: "Sedang dikerjakan", REVIEW: "Perlu ditinjau", DONE: "Selesai" };

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <div className="erp-empty-state"><p>{title}</p>{description && <p className="erp-muted">{description}</p>}{children && <div className="erp-row">{children}</div>}</div>;
}

export function notifyChange() { window.dispatchEvent(new Event("erp:changed")); }

export function RevealAction({ label, target, primary = false }: { label: string; target: string; primary?: boolean }) {
  return <button type="button" className={primary ? "erp-primary" : undefined} aria-controls={target} onClick={() => {
    const element = document.getElementById(target);
    if (!element) return;
    if (element instanceof HTMLDetailsElement) {
      const summary = element.querySelector<HTMLElement>(":scope > summary");
      if (!element.open || summary?.getAttribute("aria-expanded") === "false") summary?.click();
      element.querySelector<HTMLElement>(":scope > .motion-disclosure-body")?.removeAttribute("inert");
    }
    element.scrollIntoView({ block: "nearest" });
    const control = element.querySelector<HTMLElement>("[data-reveal-focus]") ??
      element.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    if (!control) return;
    const previousFocus = document.activeElement;
    control.focus({ preventScroll: true });
    if (document.activeElement !== control) requestAnimationFrame(() => {
      if (document.activeElement === previousFocus && control.isConnected) control.focus({ preventScroll: true });
    });
  }}>{label}</button>;
}

async function readProgramPages(path: string, signal: AbortSignal) {
  const programs = new Map<string, Program>();
  let offset = 0;
  for (;;) {
    const page = await api<ItemList<Program>>(`${path}&limit=100&offset=${offset}`, { signal });
    const before = programs.size;
    for (const program of page.items) programs.set(program.id, program);
    if (!page.has_more) return Array.from(programs.values());
    if (before === programs.size) throw new Error("Daftar Proker belum lengkap. Coba kembali.");
    offset += page.items.length;
  }
}

export function useProgramList(periodId: string | null, view: "all" | "mine" | "archive") {
  return useResource<Program[]>(periodId ? `/programs${query({ period_id: periodId, view })}` : null, readProgramPages);
}

export function unitLabel(unit: Unit, units: Unit[]) {
  const parent = units.find(item => item.id === unit.parent_id);
  return unit.kind === "ORGANIZATION" ? "Umum UKM" : parent?.kind === "DEPARTMENT" ? `${parent.name} / ${unit.name}` : unit.name;
}

export function useProgramChoices(periodId: string) {
  const [state, setState] = useState<{ periodId: string; items: import("../lib/erp/types").Program[]; error: string }>({ periodId: "", items: [], error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      const items: import("../lib/erp/types").Program[] = [];
      let more = true;
      while (more) {
        const page = await api<ItemList<import("../lib/erp/types").Program>>(`/programs${query({ period_id: periodId, view: "mine", limit: 100, offset: items.length })}`, { signal: controller.signal });
        items.push(...page.items); more = !!page.has_more;
        if (more && !page.items.length) throw Error("Daftar Proker belum lengkap. Coba kembali.");
      }
      if (!controller.signal.aborted) setState({ periodId, items, error: "" });
    }
    read().catch(error => { if (!controller.signal.aborted) setState({ periodId, items: [], error: error.message }); });
    return () => controller.abort();
  }, [periodId, revision]);
  return { items: state.periodId === periodId ? state.items : [], error: state.error, ready: state.periodId === periodId && !state.error, reload: () => setRevision(n => n + 1) };
}
