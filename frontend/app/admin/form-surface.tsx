"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import ModalDialog from "../components/ui/modal-dialog";

export function FormSurface({ title, description, drawer = false, busy = false, onClose, children }: {
  title: string; description?: string; drawer?: boolean; busy?: boolean; onClose: () => void; children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [dirty, setDirty] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  function close() {
    if (busy || (dirty && !window.confirm("Buang perubahan yang belum disimpan?"))) return;
    onClose();
  }

  return <ModalDialog onDismiss={close} className={`erp-form-surface${drawer ? " erp-form-drawer" : ""}`}
    aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onInput={event => { if (event.target instanceof HTMLElement && !event.target.hasAttribute("data-form-filter")) setDirty(true); }}
    onReset={() => setDirty(false)}>
    <div className="erp-form-surface-scroll">
      <header className="erp-form-surface-head">
        <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId} className="erp-muted">{description}</p>}</div>
        <button type="button" className="erp-form-close" aria-label="Tutup editor" onClick={close} disabled={busy}><X size={18} aria-hidden="true"/></button>
      </header>
      <fieldset className="erp-form-surface-body" disabled={busy}>{typeof children === "function" ? children(close) : children}</fieldset>
    </div>
  </ModalDialog>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="erp-form-actions">{children}</div>;
}

export type SelectOption = { value: string; label: string };

export function SearchableSelect({ label, name, options, empty, defaultValue = "", required }: {
  label: string; name: string; options: SelectOption[]; empty: string; defaultValue?: string; required?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const select = useRef<HTMLSelectElement>(null);
  const [value, setValue] = useState(defaultValue);
  const normalized = filter.trim().toLocaleLowerCase("id");
  const matches = options.filter(option => option.label.toLocaleLowerCase("id").includes(normalized));
  const retained = options.find(option => option.value === value && !matches.includes(option));
  return <div className="erp-field-stack">
    {options.length > 12 && <input type="search" data-form-filter aria-label={`Saring pilihan ${label}`} placeholder={`Saring ${label.toLowerCase()}`} value={filter} onChange={event => setFilter(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); select.current?.focus(); } }}/>}
    <label>{label}{required && " *"}<select ref={select} name={name} required={required} value={value} onChange={event => setValue(event.target.value)}>
      <option value="">{empty}</option>
      {retained && <option value={retained.value}>{retained.label}</option>}
      {!retained && value && !options.some(option => option.value === value) && <option value={value}>Pilihan tersimpan</option>}
      {matches.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
    {normalized && !matches.length && <small role="status">Tidak ada pilihan yang cocok.</small>}
  </div>;
}

export function DateRangeFields({ start, end, dateTime = false, required = false }: {
  start: { name: string; label: string; value?: string };
  end: { name: string; label: string; value?: string };
  dateTime?: boolean;
  required?: boolean;
}) {
  const [from, setFrom] = useState(start.value ?? "");
  const inputType = dateTime ? "datetime-local" : "date";
  return <div className="erp-form-grid">
    <label>{start.label}{required && " *"}<input type={inputType} name={start.name} value={from} onChange={event => setFrom(event.target.value)} required={required}/></label>
    <label>{end.label}{required && " *"}<input type={inputType} name={end.name} defaultValue={end.value} min={from || undefined} required={required}/></label>
  </div>;
}
