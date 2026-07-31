"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";

// ─── Constants & Utilities ────────────────────────────────────────────────────

const FONT_LIST = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Impact",
];
const MAX_NAMES = 200;

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function parseNames(raw: string): {
  names: string[];
  duplicates: string[];
  isOverLimit: boolean;
} {
  const trimmed = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const n of trimmed) {
    const k = n.toLowerCase();
    if (seen.has(k)) {
      if (!dupes.map((d) => d.toLowerCase()).includes(k)) dupes.push(n);
    } else {
      seen.add(k);
    }
  }
  return { names: trimmed, duplicates: dupes, isOverLimit: trimmed.length > MAX_NAMES };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Image load failed"));
    img.src = src;
  });
}

function resolvePlaceholders(
  text: string,
  name: string,
  batchInfo: BatchInfo,
  idx: number
): string {
  const dateStr = batchInfo.date
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(batchInfo.date))
    : "";
  return text
    .replace(/{name}/gi, name)
    .replace(/{event}/gi, batchInfo.event)
    .replace(/{date}/gi, dateStr)
    .replace(/{organization}/gi, batchInfo.organization)
    .replace(/{certificate_id}/gi, `CERT-2026-${String(idx + 1).padStart(3, "0")}`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchInfo {
  event: string;
  date: string;
  organization: string;
}

interface TextLayer {
  id: string;
  type: "text";
  content: string;
  x: number; // % of template width
  y: number; // % of template height
  fontSize: number; // px at native resolution
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  align: "left" | "center" | "right";
  opacity: number;
}

interface SignatureLayer {
  id: string;
  type: "signature";
  file: File;
  url: string;
  x: number;
  y: number;
  widthPct: number; // % of template width
  opacity: number;
}

type Layer = TextLayer | SignatureLayer;

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  startElX: number;
  startElY: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KelolaSertifikat() {
  // ── Template ──────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState<{
    file: File | null;
    url: string | null;
    naturalW: number;
    naturalH: number;
  }>({ file: null, url: null, naturalW: 0, naturalH: 0 });

  // ── Layers ────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // ── Batch ─────────────────────────────────────────────────────────────────
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    event: "",
    date: "",
    organization: "",
  });
  const [namesRaw, setNamesRaw] = useState("");

  // ── Generation ────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  // ── Preview scale (to map native px → preview px) ─────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const templateInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const { names, duplicates, isOverLimit } = useMemo(
    () => parseNames(namesRaw),
    [namesRaw]
  );
  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;

  // ── Track preview container size ──────────────────────────────────────────
  useEffect(() => {
    if (!template.naturalW) return;
    const update = () => {
      if (containerRef.current) {
        setPreviewScale(containerRef.current.offsetWidth / template.naturalW);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    const el = containerRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [template.naturalW]);

  // ── Template upload ───────────────────────────────────────────────────────
  const handleTemplateFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (template.url) URL.revokeObjectURL(template.url);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () =>
        setTemplate({ file, url, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
      img.src = url;
    },
    [template.url]
  );

  // ── Add text layer ────────────────────────────────────────────────────────
  const addTextLayer = useCallback(() => {
    const newLayer: TextLayer = {
      id: uid(),
      type: "text",
      content: "{name}",
      x: 50,
      y: 50,
      fontSize: Math.round(template.naturalW * 0.025) || 48,
      fontFamily: "Arial",
      fontWeight: "bold",
      fontStyle: "normal",
      color: "#000000",
      align: "center",
      opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedId(newLayer.id);
  }, [template.naturalW]);

  // ── Add signature layer ───────────────────────────────────────────────────
  const addSignatureLayer = useCallback(
    (file: File) => {
      if (sigInputRef.current) sigInputRef.current.value = "";
      const url = URL.createObjectURL(file);
      const newLayer: SignatureLayer = {
        id: uid(),
        type: "signature",
        file,
        url,
        x: 20,
        y: 72,
        widthPct: 18,
        opacity: 1,
      };
      setLayers((prev) => [...prev, newLayer]);
      setSelectedId(newLayer.id);
    },
    []
  );

  // ── Update layer ──────────────────────────────────────────────────────────
  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))
    );
  }, []);

  // ── Delete layer ──────────────────────────────────────────────────────────
  const deleteLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        const l = prev.find((x) => x.id === id);
        if (l?.type === "signature") URL.revokeObjectURL(l.url);
        return prev.filter((x) => x.id !== id);
      });
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  // ── Keyboard delete ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!selectedId) return;
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
      deleteLayer(selectedId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, deleteLayer]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleLayerMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setDrag({
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElX: layer.x,
      startElY: layer.y,
    });
  };

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - drag.startMouseX) / rect.width) * 100;
      const dy = ((e.clientY - drag.startMouseY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, drag.startElX + dx));
      const newY = Math.max(0, Math.min(100, drag.startElY + dy));
      setLayers((prev) =>
        prev.map((l) => (l.id === drag.id ? { ...l, x: newX, y: newY } : l))
      );
    },
    [drag]
  );

  const handleCanvasMouseUp = useCallback(() => setDrag(null), []);

  // ── Render certificate (HTML5 Canvas API) ─────────────────────────────────
  const renderCertificate = useCallback(
    async (name: string, idx: number): Promise<Blob> => {
      if (!template.url || !template.naturalW) throw new Error("No template");

      const canvas = document.createElement("canvas");
      canvas.width = template.naturalW;
      canvas.height = template.naturalH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      // 1. Draw template background
      const tmplImg = await loadImage(template.url);
      ctx.drawImage(tmplImg, 0, 0);

      // 2. Draw each layer in order
      for (const layer of layers) {
        const xPx = (layer.x / 100) * canvas.width;
        const yPx = (layer.y / 100) * canvas.height;
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        if (layer.type === "text") {
          const text = resolvePlaceholders(layer.content, name, batchInfo, idx);
          ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}"`;
          ctx.fillStyle = layer.color;
          ctx.textAlign = layer.align as CanvasTextAlign;
          ctx.textBaseline = "top";
          ctx.fillText(text, xPx, yPx);
        } else if (layer.type === "signature") {
          const sigImg = await loadImage(layer.url);
          const wPx = (layer.widthPct / 100) * canvas.width;
          const hPx = wPx * (sigImg.naturalHeight / sigImg.naturalWidth);
          ctx.drawImage(sigImg, xPx, yPx, wPx, hPx);
        }

        ctx.restore();
      }

      return new Promise((res, rej) => {
        canvas.toBlob(
          (blob) => (blob ? res(blob) : rej(new Error("toBlob failed"))),
          "image/png"
        );
      });
    },
    [template, layers, batchInfo]
  );

  // ── Download single preview ───────────────────────────────────────────────
  const handleDownloadPreview = async () => {
    if (!template.file || layers.length === 0) return;
    const previewName = names[0] ?? "Preview";
    const blob = await renderCertificate(previewName, 0);
    triggerDownload(blob, "sertifikat_preview.png");
  };

  // ── Batch generate & download ─────────────────────────────────────────────
  const handleBatchGenerate = async () => {
    if (!names.length || generating) return;
    setGenerating(true);
    setDoneCount(0);

    for (let i = 0; i < names.length; i++) {
      try {
        const blob = await renderCertificate(names[i], i);
        const safeName = names[i]
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_\-]/g, "");
        triggerDownload(blob, `sertifikat_${safeName}.png`);
        setDoneCount(i + 1);
        // Tiny delay so the browser can register each download
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        console.error(`Generate failed for "${names[i]}":`, err);
      }
    }

    setGenerating(false);
  };

  // ── Shared style classes ──────────────────────────────────────────────────
  const inputCls =
    "w-full bg-[#0f0f11] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700";
  const labelCls =
    "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#0f0f11] text-slate-300 font-sans">
      <div className="p-6 md:p-8">

        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Generate Sertifikat
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload template → drag &amp; drop teks &amp; TTD → download PNG langsung (tidak disimpan ke server).
          </p>
        </div>

        {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-5 pb-5 border-b border-white/5">
          {/* Upload template */}
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#18181b] hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all"
          >
            🖼️ {template.file ? "Ganti Template" : "Upload Template"}
          </button>
          <input
            ref={templateInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleTemplateFile(f);
            }}
          />

          {/* Add text */}
          <button
            type="button"
            onClick={addTextLayer}
            disabled={!template.file}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${
              template.file
                ? "bg-[#18181b] hover:bg-white/10 border-white/10"
                : "bg-white/5 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            T Tambah Teks
          </button>

          {/* Upload signature */}
          <button
            type="button"
            onClick={() => sigInputRef.current?.click()}
            disabled={!template.file}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${
              template.file
                ? "bg-[#18181b] hover:bg-white/10 border-white/10"
                : "bg-white/5 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            ✍️ Upload TTD
          </button>
          <input
            ref={sigInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addSignatureLayer(f);
            }}
          />

          {/* Layer chips */}
          {layers.map((l) => (
            <div
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedId === l.id
                  ? "bg-red-600/10 border-red-500/30 text-red-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span>{l.type === "text" ? "📝" : "✍️"}</span>
              <span className="max-w-[80px] truncate">
                {l.type === "text" ? (l as TextLayer).content : "TTD"}
              </span>
              <span
                role="button"
                aria-label="Hapus layer"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(l.id);
                }}
                className="ml-0.5 text-slate-600 hover:text-red-400 cursor-pointer text-sm leading-none"
              >
                ×
              </span>
            </div>
          ))}

          {/* Template info badge */}
          {template.naturalW > 0 && (
            <span className="ml-auto text-[10px] text-slate-700 font-mono flex-shrink-0">
              {template.naturalW}×{template.naturalH}px
            </span>
          )}
        </div>

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ═══ KOLOM KIRI: CANVAS ═══ */}
          <div>
            {!template.file ? (
              /* Drop zone */
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleTemplateFile(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => templateInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-red-600/40 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all py-32 px-8 hover:bg-white/[0.01]"
              >
                <div className="text-6xl mb-5 select-none">🖼️</div>
                <p className="text-xl font-bold text-white mb-2">
                  Upload Template Sertifikat
                </p>
                <p className="text-sm text-slate-500">
                  Seret &amp; lepas gambar PNG/JPG, atau{" "}
                  <span className="text-red-400 font-semibold underline underline-offset-2">
                    klik untuk memilih
                  </span>
                </p>
                <p className="text-[10px] text-slate-700 mt-4 font-mono">
                  PNG transparan disarankan
                </p>
              </div>
            ) : (
              <>
                {/* Canvas container — overlay model */}
                <div
                  ref={containerRef}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onClick={() => setSelectedId(null)}
                  className="relative select-none rounded-2xl overflow-hidden border border-white/10 bg-[#0f0f11] shadow-2xl"
                  style={{ cursor: drag ? "grabbing" : "default" }}
                >
                  {/* Template image as base */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.url ?? ""}
                    alt="Template sertifikat"
                    className="w-full h-auto block"
                    draggable={false}
                  />

                  {/* Layers rendered as absolute positioned overlays */}
                  {layers.map((layer) => {
                    if (layer.type === "text") {
                      const tl = layer as TextLayer;
                      const fsPx = Math.max(8, tl.fontSize * previewScale);
                      const resolvedText = resolvePlaceholders(
                        tl.content,
                        names[0] ?? "{name}",
                        batchInfo,
                        0
                      );
                      return (
                        <div
                          key={tl.id}
                          onMouseDown={(e) => handleLayerMouseDown(e, tl.id)}
                          style={{
                            position: "absolute",
                            left: `${tl.x}%`,
                            top: `${tl.y}%`,
                            fontSize: `${fsPx}px`,
                            fontFamily: tl.fontFamily,
                            fontWeight: tl.fontWeight,
                            fontStyle: tl.fontStyle,
                            color: tl.color,
                            opacity: tl.opacity,
                            textAlign: tl.align,
                            cursor:
                              drag?.id === tl.id ? "grabbing" : "grab",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                            transform:
                              tl.align === "center"
                                ? "translateX(-50%)"
                                : tl.align === "right"
                                ? "translateX(-100%)"
                                : "none",
                            outline:
                              selectedId === tl.id
                                ? "2px dashed rgba(239,68,68,0.8)"
                                : "2px dashed transparent",
                            outlineOffset: "3px",
                            borderRadius: "2px",
                            padding: "1px 3px",
                          }}
                        >
                          {resolvedText}
                        </div>
                      );
                    } else {
                      const sl = layer as SignatureLayer;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={sl.id}
                          src={sl.url}
                          alt="Tanda tangan"
                          draggable={false}
                          onMouseDown={(e) =>
                            handleLayerMouseDown(e, sl.id)
                          }
                          style={{
                            position: "absolute",
                            left: `${sl.x}%`,
                            top: `${sl.y}%`,
                            width: `${sl.widthPct}%`,
                            opacity: sl.opacity,
                            cursor:
                              drag?.id === sl.id ? "grabbing" : "grab",
                            outline:
                              selectedId === sl.id
                                ? "2px dashed rgba(239,68,68,0.8)"
                                : "2px dashed transparent",
                            outlineOffset: "3px",
                          }}
                        />
                      );
                    }
                  })}
                </div>

                {layers.length > 0 && (
                  <p className="text-[10px] text-slate-600 text-center mt-2">
                    Drag elemen untuk memindahkan · Klik untuk memilih · Del untuk hapus
                  </p>
                )}
              </>
            )}
          </div>

          {/* ═══ KOLOM KANAN: PANEL ═══ */}
          <div className="flex flex-col gap-4">

            {/* ── PROPERTIES PANEL (conditional) ── */}
            {selectedLayer && (
              <section
                aria-label="Properti elemen"
                className="bg-[#18181b] border border-red-500/20 rounded-3xl p-5 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-sm font-bold text-white">
                    {selectedLayer.type === "text"
                      ? "📝 Properti Teks"
                      : "✍️ Properti TTD"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => deleteLayer(selectedLayer.id)}
                    className="text-[10px] px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 rounded-lg transition-all font-bold"
                  >
                    Hapus
                  </button>
                </div>

                {/* Text properties */}
                {selectedLayer.type === "text" && (
                  <TextProperties
                    layer={selectedLayer as TextLayer}
                    onUpdate={(patch) => updateLayer(selectedLayer.id, patch)}
                    inputCls={inputCls}
                    labelCls={labelCls}
                  />
                )}

                {/* Signature properties */}
                {selectedLayer.type === "signature" && (
                  <SignatureProperties
                    layer={selectedLayer as SignatureLayer}
                    onUpdate={(patch) => updateLayer(selectedLayer.id, patch)}
                    labelCls={labelCls}
                  />
                )}
              </section>
            )}

            {/* ── BATCH INFO ── */}
            <section className="bg-[#18181b] border border-white/5 rounded-3xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-4 border-b border-white/5 pb-3">
                📋 Info Batch
              </h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="cert-event" className={labelCls}>
                    Nama Event
                  </label>
                  <input
                    id="cert-event"
                    type="text"
                    value={batchInfo.event}
                    onChange={(e) =>
                      setBatchInfo((p) => ({ ...p, event: e.target.value }))
                    }
                    placeholder="Workshop UI/UX 2026"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="cert-date" className={labelCls}>
                    Tanggal
                  </label>
                  <input
                    id="cert-date"
                    type="date"
                    value={batchInfo.date}
                    onChange={(e) =>
                      setBatchInfo((p) => ({ ...p, date: e.target.value }))
                    }
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label htmlFor="cert-org" className={labelCls}>
                    Organisasi
                  </label>
                  <input
                    id="cert-org"
                    type="text"
                    value={batchInfo.organization}
                    onChange={(e) =>
                      setBatchInfo((p) => ({
                        ...p,
                        organization: e.target.value,
                      }))
                    }
                    placeholder="UKM Fotografi Telkom"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* ── DAFTAR NAMA ── */}
            <section className="bg-[#18181b] border border-white/5 rounded-3xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 border-b border-white/5 pb-3">
                👥 Daftar Nama
              </h2>
              <textarea
                rows={7}
                value={namesRaw}
                onChange={(e) => setNamesRaw(e.target.value)}
                placeholder={"Budi Santoso\nSiti Aminah\nAndi Wijaya"}
                className={`${inputCls} resize-y font-mono text-xs leading-relaxed ${
                  isOverLimit ? "border-red-500/60" : ""
                }`}
              />
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold ${
                    isOverLimit ? "text-red-400" : "text-slate-500"
                  }`}
                >
                  {names.length} nama terdeteksi
                  {isOverLimit && ` (maks ${MAX_NAMES})`}
                </span>
                {duplicates.length > 0 && !isOverLimit && (
                  <span className="text-[10px] text-slate-600">
                    · {duplicates.length} duplikat (diabaikan)
                  </span>
                )}
              </div>
              {isOverLimit && (
                <p className="text-[10px] text-red-400 mt-1">
                  ⚠️ Kurangi jumlah nama untuk melanjutkan.
                </p>
              )}
            </section>

            {/* ── GENERATE & DOWNLOAD ── */}
            <section className="bg-[#18181b] border border-white/5 rounded-3xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-4 border-b border-white/5 pb-3">
                ⚡ Download
              </h2>

              {/* Checklist */}
              <ul className="space-y-2 mb-4">
                <CheckItem ok={!!template.file} label="Template diupload" />
                <CheckItem
                  ok={layers.length > 0}
                  label={
                    layers.length > 0
                      ? `${layers.length} elemen pada canvas`
                      : "Belum ada elemen (teks/TTD)"
                  }
                />
                <CheckItem
                  ok={names.length > 0 && !isOverLimit}
                  label={
                    isOverLimit
                      ? `Nama melebihi batas (${names.length}/${MAX_NAMES})`
                      : names.length > 0
                      ? `${names.length} nama siap digenerate`
                      : "Daftar nama kosong"
                  }
                />
              </ul>

              {/* Progress bar */}
              {generating && (
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Generating &amp; downloading…</span>
                    <span className="font-mono">
                      {doneCount}/{names.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-300 rounded-full"
                      style={{
                        width: `${(doneCount / names.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                {/* Preview download */}
                <button
                  type="button"
                  onClick={handleDownloadPreview}
                  disabled={!template.file || layers.length === 0}
                  className={`w-full py-3 rounded-xl text-sm font-bold border transition-all ${
                    template.file && layers.length > 0
                      ? "bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20"
                      : "bg-white/[0.02] text-slate-600 border-white/5 cursor-not-allowed"
                  }`}
                >
                  👁 Download Preview (nama pertama)
                </button>

                {/* Batch generate */}
                <button
                  id="btn-batch-generate"
                  type="button"
                  onClick={handleBatchGenerate}
                  disabled={
                    !template.file ||
                    layers.length === 0 ||
                    names.length === 0 ||
                    isOverLimit ||
                    generating
                  }
                  className={`w-full py-3.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                    template.file &&
                    layers.length > 0 &&
                    names.length > 0 &&
                    !isOverLimit &&
                    !generating
                      ? "bg-red-600 hover:bg-red-700 text-white border-transparent shadow-[0_0_20px_rgba(220,38,38,0.25)]"
                      : "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed"
                  }`}
                >
                  {generating ? (
                    <>
                      <Spinner />
                      Generating {doneCount}/{names.length}…
                    </>
                  ) : (
                    <>⚡ Generate &amp; Download Semua ({names.length})</>
                  )}
                </button>
              </div>

              <p className="text-[9px] text-slate-700 text-center mt-3">
                PNG diunduh langsung ke perangkat · Tidak disimpan ke server
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TextProperties({
  layer,
  onUpdate,
  inputCls,
  labelCls,
}: {
  layer: TextLayer;
  onUpdate: (patch: Partial<TextLayer>) => void;
  inputCls: string;
  labelCls: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="prop-content" className={labelCls}>
          Konten
        </label>
        <input
          id="prop-content"
          type="text"
          value={layer.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className={inputCls}
          placeholder="{name}"
        />
        <p className="text-[9px] text-slate-700 mt-1">
          Placeholder: {"{name}"} {"{event}"} {"{date}"} {"{organization}"}{" "}
          {"{certificate_id}"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="prop-font" className={labelCls}>
            Font
          </label>
          <select
            id="prop-font"
            value={layer.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className={inputCls}
          >
            {FONT_LIST.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prop-size" className={labelCls}>
            Ukuran (px)
          </label>
          <input
            id="prop-size"
            type="number"
            value={layer.fontSize}
            min={8}
            max={2000}
            onChange={(e) =>
              onUpdate({ fontSize: parseInt(e.target.value) || 48 })
            }
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="prop-color" className={labelCls}>
            Warna
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-9 h-9 rounded-lg border border-white/10 bg-[#0f0f11] cursor-pointer p-0.5 flex-shrink-0"
            />
            <input
              id="prop-color"
              type="text"
              value={layer.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="prop-opacity"
            className={`${labelCls} flex justify-between`}
          >
            <span>Opacity</span>
            <span className="text-slate-400 font-normal normal-case tracking-normal">
              {Math.round(layer.opacity * 100)}%
            </span>
          </label>
          <input
            id="prop-opacity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-full mt-2 accent-red-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Style toggles */}
      <div className="flex items-center gap-3">
        <span className={labelCls + " flex-none"}>Gaya</span>
        <div className="flex gap-1 flex-wrap">
          {(["normal", "bold"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onUpdate({ fontWeight: w })}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-bold ${
                layer.fontWeight === w
                  ? "bg-red-600/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {w === "bold" ? "B" : "N"}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onUpdate({
                fontStyle: layer.fontStyle === "italic" ? "normal" : "italic",
              })
            }
            className={`px-2.5 py-1 text-xs rounded-lg border transition-all italic ${
              layer.fontStyle === "italic"
                ? "bg-red-600/20 border-red-500/40 text-red-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            I
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 ml-auto">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onUpdate({ align: a })}
              title={`Rata ${a}`}
              className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                layer.align === a
                  ? "bg-red-600/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {a === "left" ? "⬅" : a === "center" ? "≡" : "➡"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignatureProperties({
  layer,
  onUpdate,
  labelCls,
}: {
  layer: SignatureLayer;
  onUpdate: (patch: Partial<SignatureLayer>) => void;
  labelCls: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="sig-width"
          className={`${labelCls} flex justify-between`}
        >
          <span>Lebar</span>
          <span className="text-slate-400 font-normal normal-case tracking-normal">
            {layer.widthPct}% template
          </span>
        </label>
        <input
          id="sig-width"
          type="range"
          min={2}
          max={80}
          step={1}
          value={layer.widthPct}
          onChange={(e) =>
            onUpdate({ widthPct: parseFloat(e.target.value) })
          }
          className="w-full accent-red-600 cursor-pointer"
        />
      </div>
      <div>
        <label
          htmlFor="sig-opacity"
          className={`${labelCls} flex justify-between`}
        >
          <span>Opacity</span>
          <span className="text-slate-400 font-normal normal-case tracking-normal">
            {Math.round(layer.opacity * 100)}%
          </span>
        </label>
        <input
          id="sig-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-red-600 cursor-pointer"
        />
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs list-none">
      <span
        className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] border ${
          ok
            ? "bg-green-500/20 text-green-400 border-green-500/30"
            : "bg-white/5 text-slate-600 border-white/10"
        }`}
      >
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "text-slate-300" : "text-slate-600"}>{label}</span>
    </li>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}
