"use client";

import { motion, useSpring } from "framer-motion";
import { Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { shakeInvalidField, useReducedMotion } from "../../lib/motion-preference";

// Adapted from dqnamo Kitchen: https://www.dqnamo.com/experiments/magnetic-drop-zone
const spring = { damping: 24, mass: .65, stiffness: 280 };

export default function MagneticDropZone({ accept, disabled, maxBytes }: { accept: string; disabled?: boolean; maxBytes: number }) {
  const zone = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const reduced = useReducedMotion();
  const [filename, setFilename] = useState("");
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();

  useEffect(() => {
    const form = input.current?.form;
    function reset() {
      setFilename("");
      setError("");
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  useEffect(() => {
    if (disabled) return;
    function settle() {
      x.set(0);
      y.set(0);
      setOver(false);
    }
    function drag(event: DragEvent) {
      if (!zone.current?.getClientRects().length || !event.dataTransfer?.types.includes("Files")) return;
      const rect = zone.current.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(Math.max(0, Math.abs(dx) - rect.width / 2), Math.max(0, Math.abs(dy) - rect.height / 2));
      const strength = reduced ? 0 : 8 * Math.max(0, 1 - distance / 140);
      const length = Math.max(1, Math.hypot(dx, dy));
      x.set(dx / length * strength);
      y.set(dy / length * strength);
      setOver(distance === 0);
    }
    function leave(event: DragEvent) {
      if (!event.relatedTarget) settle();
    }
    window.addEventListener("dragover", drag);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragend", settle);
    window.addEventListener("drop", settle);
    return () => {
      window.removeEventListener("dragover", drag);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragend", settle);
      window.removeEventListener("drop", settle);
    };
  }, [disabled, reduced, x, y]);

  function validate(file: File | undefined) {
    const supported = file && accept.split(",").some(extension => file.name.toLowerCase().endsWith(extension));
    const problem = !file ? "Pilih dokumen terlebih dahulu."
      : !supported ? "Pilih berkas dengan format yang didukung."
      : !file.size || file.size > maxBytes ? "Ukuran berkas harus antara 1 byte dan 20 MB." : "";
    setError(problem);
    setFilename(problem ? "" : file?.name ?? "");
    if (!problem) return;
    if (input.current) input.current.value = "";
    picker.current?.focus();
    if (picker.current) shakeInvalidField(picker.current);
  }

  return <div
    ref={zone}
    onDragOver={event => {
      if (!disabled && event.dataTransfer.types.includes("Files")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    }}
    onDrop={event => {
      if (disabled || !input.current || !event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.current.files = transfer.files;
      validate(file);
    }}
  >
    <input
      ref={input}
      type="file"
      className="motion-drop-input"
      name="file"
      accept={accept}
      required
      disabled={disabled}
      tabIndex={-1}
      aria-label="Berkas dokumen"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      data-validation-managed
      onChange={event => validate(event.currentTarget.files?.[0])}
      onInvalid={event => { event.preventDefault(); validate(undefined); }}
    />
    <motion.div className="motion-drop-zone" data-over={over} data-invalid={Boolean(error)} style={reduced ? undefined : { x, y }}>
      <button
        ref={picker}
        type="button"
        data-reveal-focus
        aria-describedby={error ? errorId : undefined}
        onClick={() => input.current?.click()}
        disabled={disabled}
      ><Upload size={16} aria-hidden="true"/>{filename ? "Ganti berkas" : "Pilih berkas"}</button>
      <span className="erp-muted motion-drop-caption" aria-live="polite">{filename || (over ? "Lepas berkas di sini" : "atau seret dokumen ke sini")}</span>
    </motion.div>
    {error && <p id={errorId} role="alert" className="motion-field-error">{error}</p>}
  </div>;
}
