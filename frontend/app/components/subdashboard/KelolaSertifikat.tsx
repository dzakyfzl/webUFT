"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

// ─── Constants & Utilities ────────────────────────────────────────────────────

const FONT_LIST = [
  "Arial", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS", "Courier New", "Impact",
];

const GOOGLE_FONTS = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Raleway", "Poppins",
  "Merriweather", "Ubuntu", "Noto Sans", "Playfair Display", "Lora", "Nunito",
  "PT Sans", "PT Serif", "Rubik", "Oxygen", "Cabin", "Crimson Text", "Bitter",
  "Source Sans 3", "Arimo", "Josefin Sans", "Pacifico", "Dancing Script",
  "Lobster", "Abril Fatface", "Quicksand", "Exo 2", "Titillium Web",
  "Dosis", "Varela Round", "Comfortaa", "Nunito Sans", "Libre Baskerville",
  "Rokkitt", "Arvo", "Domine", "Vollkorn", "Cardo", "EB Garamond",
  "Cormorant Garamond", "Spectral", "Libre Franklin", "Work Sans", "Barlow",
  "Inter", "DM Sans", "Plus Jakarta Sans", "Be Vietnam Pro", "Outfit",
  "Manrope", "Lexend", "Mulish", "Jost", "Karla", "Figtree", "Urbanist",
  "Syne", "Space Grotesk", "Bebas Neue", "Russo One", "Teko", "Orbitron",
  "Audiowide", "Rajdhani", "Exo", "Electrolize", "Chakra Petch",
  "Fira Code", "JetBrains Mono", "Source Code Pro", "IBM Plex Mono",
  "Courier Prime", "Special Elite", "Permanent Marker", "Caveat",
  "Indie Flower", "Satisfy", "Sacramento", "Great Vibes", "Parisienne",
  "Tangerine", "Alex Brush", "Italianno", "Cinzel", "Cinzel Decorative",
  "Cormorant", "Forum", "Philosopher", "IM Fell English",
  "Almendra", "Noto Serif", "Amiri", "Cairo", "Tajawal", "Almarai",
  "Hind", "Baloo 2", "Righteous", "Kaushan Script", "Amatic SC",
  "Poiret One", "Abril Fatface", "Fredoka One", "Lilita One", "Boogaloo",
  "Asap", "Nunito", "Karla", "Jura", "Saira", "Barlow Condensed",
  "IBM Plex Sans", "IBM Plex Serif", "DM Serif Display", "Gloock",
  "Fraunces", "Dela Gothic One", "BIZ UDPGothic", "Noto Sans JP",
];

const LOADED_GFONTS = new Set<string>();
function loadGoogleFont(name: string) {
  if (LOADED_GFONTS.has(name) || FONT_LIST.includes(name)) return;
  LOADED_GFONTS.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 0, g: 0, b: 0 };
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}

const COLOR_SWATCHES = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#1f2937",
];
const MAX_NAMES = 200;
const LS_FONTS_KEY = "cert_custom_fonts";

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

async function loadFontFace(font: { name: string; dataUrl: string }): Promise<void> {
  const existing = [...document.fonts].some(
    (f) => f.family === font.name || f.family === `"${font.name}"`
  );
  if (existing) return;
  const ff = new FontFace(font.name, `url(${font.dataUrl})`);
  const loaded = await ff.load();
  document.fonts.add(loaded);
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
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  align: "left" | "center" | "right";
  opacity: number;
  namesRaw: string;
  // Effects
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  letterSpacing?: number;
}

interface SignatureLayer {
  id: string;
  type: "signature";
  file: File;
  url: string;
  x: number;
  y: number;
  widthPct: number;
  opacity: number;
}

type Layer = TextLayer | SignatureLayer;

interface CustomFont {
  name: string;
  dataUrl: string;
}

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  startElX: number;
  startElY: number;
}

interface ResizeState {
  id: string;
  handle: "nw" | "ne" | "sw" | "se";
  startMouseX: number;
  startMouseY: number;
  startValue: number;
  containerWidth: number;
}

// ─── Download Modal ───────────────────────────────────────────────────────────

function DownloadModal({
  batchInfo,
  setBatchInfo,
  totalCerts,
  generating,
  doneCount,
  canDownload,
  onPreview,
  onGenerate,
  onGeneratePdf,
  onClose,
  inputCls,
  labelCls,
}: {
  batchInfo: BatchInfo;
  setBatchInfo: React.Dispatch<React.SetStateAction<BatchInfo>>;
  totalCerts: number;
  generating: boolean;
  doneCount: number;
  canDownload: boolean;
  onPreview: () => void;
  onGenerate: () => void;
  onGeneratePdf: () => void;
  onClose: () => void;
  inputCls: string;
  labelCls: string;
}) {
  // Close on backdrop click
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !generating) onClose(); }}
    >
      <div
        style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24, width: "min(500px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Sertifikat
            </h2>
            <p style={{ margin: "4px 0 0", color: "#71717a", fontSize: 12 }}>
              {totalCerts > 0 ? `${totalCerts} sertifikat akan digenerate` : "Lengkapi daftar nama di tiap komponen teks"}
            </p>
          </div>
          {!generating && (
            <button
              type="button"
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#71717a", cursor: "pointer", width: 28, height: 28, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ×
            </button>
          )}
        </div>

        {/* Info Nama File (formerly Batch Info) */}
        <p className={labelCls} style={{ marginBottom: 12 }}>📁 Info &amp; Nama File</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div>
            <label htmlFor="modal-event" className={labelCls}>Nama Event</label>
            <input
              id="modal-event"
              type="text"
              value={batchInfo.event}
              onChange={(e) => setBatchInfo((p) => ({ ...p, event: e.target.value }))}
              placeholder="Workshop UI/UX 2026"
              className={inputCls}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label htmlFor="modal-date" className={labelCls}>Tanggal</label>
              <input
                id="modal-date"
                type="date"
                value={batchInfo.date}
                onChange={(e) => setBatchInfo((p) => ({ ...p, date: e.target.value }))}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="modal-org" className={labelCls}>Organisasi</label>
              <input
                id="modal-org"
                type="text"
                value={batchInfo.organization}
                onChange={(e) => setBatchInfo((p) => ({ ...p, organization: e.target.value }))}
                placeholder="UKM Fotografi"
                className={inputCls}
              />
            </div>
          </div>
          <p style={{ color: "#3f3f46", fontSize: 10, margin: 0 }}>
            Dipakai pada placeholder &#123;event&#125;, &#123;date&#125;, &#123;organization&#125; di teks sertifikat
          </p>
        </div>

        {/* Progress bar (when generating) */}
        {generating && (
          <div style={{ marginBottom: 16, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1aa", fontSize: 12, marginBottom: 8 }}>
              <span>Generating &amp; downloading…</span>
              <span style={{ fontFamily: "monospace" }}>{doneCount}/{totalCerts}</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{ height: "100%", background: "#dc2626", borderRadius: 999, transition: "width 0.3s", width: `${totalCerts > 0 ? (doneCount / totalCerts) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={onPreview}
            disabled={generating}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.08)", cursor: generating ? "not-allowed" : "pointer",
              background: generating ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
              color: generating ? "#52525b" : "white", transition: "all 0.2s",
            }}
          >
            👁 Download Preview (nama terpanjang)
          </button>
          <button
            id="btn-batch-generate"
            type="button"
            onClick={onGenerate}
            disabled={!canDownload || generating}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: canDownload && !generating ? "none" : "1px solid rgba(255,255,255,0.06)",
              cursor: canDownload && !generating ? "pointer" : "not-allowed",
              background: canDownload && !generating ? "#dc2626" : "rgba(255,255,255,0.04)",
              color: canDownload && !generating ? "white" : "#52525b",
              boxShadow: canDownload && !generating ? "0 0 24px rgba(220,38,38,0.3)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
            }}
          >
            {generating ? (
              <><Spinner /> Generating {doneCount}/{totalCerts}…</>
            ) : (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PNG Semua ({totalCerts})</>
            )}
          </button>

          {/* PDF button */}
          <button
            id="btn-batch-generate-pdf"
            type="button"
            onClick={onGeneratePdf}
            disabled={!canDownload || generating}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: canDownload && !generating ? "1px solid rgba(220,38,38,0.35)" : "1px solid rgba(255,255,255,0.06)",
              cursor: canDownload && !generating ? "pointer" : "not-allowed",
              background: canDownload && !generating ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
              color: canDownload && !generating ? "#fca5a5" : "#52525b",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
            }}
          >
            {generating ? (
              <><Spinner /> Generating PDF…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Download PDF ({totalCerts} hal.)
              </>
            )}
          </button>
        </div>

        <p style={{ color: "#27272a", fontSize: 10, textAlign: "center", marginTop: 12, marginBottom: 0 }}>
          PNG diunduh langsung ke perangkat · Tidak disimpan ke server
        </p>
      </div>
    </div>
  );
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
  const [resize, setResize] = useState<ResizeState | null>(null);

  // ── Custom fonts ──────────────────────────────────────────────────────────
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);

  // ── Batch info & Download modal ───────────────────────────────────────────
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    event: "",
    date: "",
    organization: "",
  });
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // ── Generation ────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  // ── Preview scale ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const templateInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;

  // Text layers only
  const textLayers = useMemo(
    () => layers.filter((l): l is TextLayer => l.type === "text"),
    [layers]
  );

  // Parse names per text layer
  const parsedLayerNames = useMemo(
    () => textLayers.map((l) => parseNames(l.namesRaw ?? "")),
    [textLayers]
  );

  // Total sertifikat = max panjang nama di seluruh layer
  const totalCerts = useMemo(
    () => (parsedLayerNames.length === 0 ? 0 : Math.max(...parsedLayerNames.map((p) => p.names.length))),
    [parsedLayerNames]
  );

  // Selected text layer & its parsed names
  const selectedTextLayer = selectedLayer?.type === "text" ? (selectedLayer as TextLayer) : null;
  const selectedLayerIdx = selectedTextLayer ? textLayers.findIndex((l) => l.id === selectedTextLayer.id) : -1;
  const selectedParsed = selectedLayerIdx >= 0 ? parsedLayerNames[selectedLayerIdx] : null;

  const canDownload =
    !!template.file && layers.length > 0 && totalCerts > 0 &&
    parsedLayerNames.every((p) => !p.isOverLimit);

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

  // ── Load custom fonts from localStorage on mount ──────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_FONTS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as CustomFont[];
      Promise.all(parsed.map(loadFontFace))
        .then(() => setCustomFonts(parsed))
        .catch(console.error);
    } catch { /* ignore */ }
  }, []);

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

  // ── Import custom font ────────────────────────────────────────────────────
  const handleImportFont = useCallback(async (file: File) => {
    if (fontInputRef.current) fontInputRef.current.value = "";
    try {
      const dataUrl = await fileToDataUrl(file);
      const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, "");
      await loadFontFace({ name, dataUrl });
      setCustomFonts((prev) => {
        const next = [...prev.filter((f) => f.name !== name), { name, dataUrl }];
        try { localStorage.setItem(LS_FONTS_KEY, JSON.stringify(next)); } catch { /* quota */ }
        return next;
      });
    } catch (err) {
      console.error("Font import failed:", err);
    }
  }, []);

  const removeCustomFont = useCallback((name: string) => {
    setCustomFonts((prev) => {
      const next = prev.filter((f) => f.name !== name);
      try { localStorage.setItem(LS_FONTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ── Add text layer ────────────────────────────────────────────────────────
  const addTextLayer = useCallback(() => {
    const newLayer: TextLayer = {
      id: uid(), type: "text", content: "{name}", x: 50, y: 50,
      fontSize: Math.round(template.naturalW * 0.025) || 48,
      fontFamily: "Arial", fontWeight: "bold", fontStyle: "normal",
      color: "#000000", align: "center", opacity: 1,
      namesRaw: "",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedId(newLayer.id);
  }, [template.naturalW]);

  // ── Add signature layer ───────────────────────────────────────────────────
  const addSignatureLayer = useCallback((file: File) => {
    if (sigInputRef.current) sigInputRef.current.value = "";
    const url = URL.createObjectURL(file);
    const newLayer: SignatureLayer = {
      id: uid(), type: "signature", file, url,
      x: 20, y: 72, widthPct: 18, opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedId(newLayer.id);
  }, []);

  // ── Update / Delete layer ─────────────────────────────────────────────────
  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)));
  }, []);

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

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handleLayerMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setDrag({ id, startMouseX: e.clientX, startMouseY: e.clientY, startElX: layer.x, startElY: layer.y });
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string, handle: ResizeState["handle"]) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      const cw = containerRef.current?.offsetWidth ?? 300;
      const startValue = layer.type === "text"
        ? (layer as TextLayer).fontSize
        : (layer as SignatureLayer).widthPct;
      setResize({ id, handle, startMouseX: e.clientX, startMouseY: e.clientY, startValue, containerWidth: cw });
    },
    [layers]
  );

  // ── Canvas mouse move (drag + resize) ─────────────────────────────────────
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (drag && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - drag.startMouseX) / rect.width) * 100;
        const dy = ((e.clientY - drag.startMouseY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(100, drag.startElX + dx));
        const newY = Math.max(0, Math.min(100, drag.startElY + dy));
        setLayers((prev) =>
          prev.map((l) => (l.id === drag.id ? { ...l, x: newX, y: newY } : l))
        );
      }
      if (resize) {
        const deltaX = e.clientX - resize.startMouseX;
        const sign = (resize.handle === "se" || resize.handle === "ne") ? 1 : -1;
        const effectiveDelta = deltaX * sign;
        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== resize.id) return l;
            if (l.type === "text") {
              const newFontSize = Math.max(8, Math.round(
                resize.startValue * Math.max(0.1, 1 + effectiveDelta / 300)
              ));
              return { ...l, fontSize: newFontSize };
            } else if (l.type === "signature") {
              const deltaWidthPct = (deltaX / resize.containerWidth) * 100;
              const newWidthPct = Math.max(2, Math.min(80, resize.startValue + deltaWidthPct));
              return { ...l, widthPct: Math.round(newWidthPct * 10) / 10 };
            }
            return l;
          })
        );
      }
    },
    [drag, resize]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDrag(null);
    setResize(null);
  }, []);

  // ── Render certificate ────────────────────────────────────────────────────
  // idx = index sertifikat; tiap TextLayer mengambil namanya sendiri di index ini
  const renderCertificate = useCallback(
    async (idx: number, overrideNamePerLayerId?: Record<string, string>): Promise<Blob> => {
      if (!template.url || !template.naturalW) throw new Error("No template");
      await document.fonts.ready;

      const canvas = document.createElement("canvas");
      canvas.width = template.naturalW;
      canvas.height = template.naturalH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const tmplImg = await loadImage(template.url);
      ctx.drawImage(tmplImg, 0, 0);

      for (const layer of layers) {
        const xPx = (layer.x / 100) * canvas.width;
        const yPx = (layer.y / 100) * canvas.height;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        if (layer.type === "text") {
          // Resolusi nama: override > layer's own namesRaw[idx] > ""
          let nameForLayer = "";
          if (overrideNamePerLayerId?.[layer.id] !== undefined) {
            nameForLayer = overrideNamePerLayerId[layer.id];
          } else {
            const parsed = parseNames((layer as TextLayer).namesRaw ?? "");
            nameForLayer = parsed.names[idx] ?? "";
          }
          const tl = layer as TextLayer;
          const text = resolvePlaceholders(tl.content, nameForLayer, batchInfo, idx);
          const fontStr = `${tl.fontStyle} ${tl.fontWeight} ${tl.fontSize}px "${tl.fontFamily}"`;
          ctx.font = fontStr;
          ctx.textAlign = tl.align as CanvasTextAlign;
          ctx.textBaseline = "top";
          // Letter spacing (Chrome 99+)
          if (tl.letterSpacing != null && "letterSpacing" in ctx) {
            (ctx as unknown as { letterSpacing: string }).letterSpacing = `${tl.letterSpacing}px`;
          }
          // Shadow
          if (tl.shadowBlur || tl.shadowOffsetX || tl.shadowOffsetY) {
            const sc = hexToRgb(tl.shadowColor ?? "#000000");
            const sa = tl.shadowOpacity ?? 0.5;
            ctx.shadowColor = `rgba(${sc.r},${sc.g},${sc.b},${sa})`;
            ctx.shadowBlur = tl.shadowBlur ?? 0;
            ctx.shadowOffsetX = tl.shadowOffsetX ?? 0;
            ctx.shadowOffsetY = tl.shadowOffsetY ?? 0;
          }
          // Fill text
          ctx.fillStyle = tl.color;
          ctx.fillText(text, xPx, yPx);
          // Reset shadow before stroke
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          // Stroke
          if (tl.stroke && tl.strokeWidth) {
            ctx.strokeStyle = tl.stroke;
            ctx.lineWidth = tl.strokeWidth;
            ctx.lineJoin = "round";
            ctx.strokeText(text, xPx, yPx);
          }
          // Reset letter spacing
          if ("letterSpacing" in ctx) {
            (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
          }
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

  // ── Download preview (called from modal) ──────────────────────────────────
  const handleDownloadPreview = useCallback(async () => {
    if (!template.file || layers.length === 0) return;
    // Preview: tiap layer pakai nama terpanjangnya sendiri
    const overrideNamePerLayerId: Record<string, string> = {};
    for (const tl of textLayers) {
      const parsed = parseNames(tl.namesRaw ?? "");
      overrideNamePerLayerId[tl.id] =
        parsed.names.reduce((a, b) => (b.length > a.length ? b : a), "") || "Nama Peserta";
    }
    const blob = await renderCertificate(0, overrideNamePerLayerId);
    const safeEvent = batchInfo.event.trim().replace(/[^a-zA-Z0-9\s\-]/g, "").trim() || "preview";
    const safeOrg = batchInfo.organization.trim().replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
    const previewFilename = safeOrg ? `${safeEvent}_${safeOrg}.png` : `${safeEvent}.png`;
    triggerDownload(blob, previewFilename);
  }, [template.file, layers.length, textLayers, renderCertificate, batchInfo]);

  // ── Batch generate (called from modal) ───────────────────────────────────
  const handleBatchGenerate = useCallback(async () => {
    if (!totalCerts || generating) return;
    setGenerating(true);
    setDoneCount(0);
    await document.fonts.ready;
    for (let i = 0; i < totalCerts; i++) {
      try {
        const blob = await renderCertificate(i);
        const safeEvent = batchInfo.event.trim().replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
        const safeOrg = batchInfo.organization.trim().replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
        // Nama file pakai nama dari layer pertama yang punya entry di index i
        const primaryName =
          parsedLayerNames.find((p) => p.names[i])?.names[i]?.trim() ?? `cert_${i + 1}`;
        const parts = [safeEvent, safeOrg, primaryName].filter(Boolean);
        const filename = parts.join("_") + ".png";
        triggerDownload(blob, filename);
        setDoneCount(i + 1);
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        console.error(`Generate failed for index ${i}:`, err);
      }
    }
    setGenerating(false);
  }, [totalCerts, generating, renderCertificate, parsedLayerNames, batchInfo]);

  // ── Batch generate PDF (called from modal) ─────────────────────────────────
  const handleBatchGeneratePdf = useCallback(async () => {
    if (!totalCerts || generating) return;
    setGenerating(true);
    setDoneCount(0);
    await document.fonts.ready;

    // Kumpulkan semua PNG sebagai data URL
    const dataUrls: string[] = [];
    for (let i = 0; i < totalCerts; i++) {
      try {
        const blob = await renderCertificate(i);
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = () => rej(new Error("FileReader failed"));
          reader.readAsDataURL(blob);
        });
        dataUrls.push(dataUrl);
        setDoneCount(i + 1);
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`PDF generate failed for index ${i}:`, err);
        dataUrls.push(""); // placeholder
      }
    }

    // Buka jendela print dengan semua gambar
    const safeEvent = batchInfo.event.trim() || "Sertifikat";
    const printWindow = window.open("", "_blank");
    if (!printWindow) { setGenerating(false); return; }
    const imgs = dataUrls
      .filter(Boolean)
      .map((url) =>
        `<div style="page-break-after:always;margin:0;padding:0;width:100%;">
          <img src="${url}" style="width:100%;display:block;" />
        </div>`
      )
      .join("");
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${safeEvent}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;}@media print{@page{margin:0;size:landscape;}}</style>
    </head><body>${imgs}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    printWindow.document.close();
    setGenerating(false);
  }, [totalCerts, generating, renderCertificate, batchInfo]);

  // ── Shared style classes ──────────────────────────────────────────────────
  const inputCls =
    "w-full bg-[#0f0f11] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700";
  const labelCls =
    "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1";

  const allFonts = [...FONT_LIST, ...customFonts.map((f) => f.name)];

  // ── Resize handle builder ─────────────────────────────────────────────────
  const buildResizeHandles = (id: string) =>
    (["nw", "ne", "sw", "se"] as const).map((handle) => (
      <div
        key={handle}
        onMouseDown={(e) => handleResizeMouseDown(e, id, handle)}
        style={{
          position: "absolute", width: 10, height: 10,
          background: "white", border: "2px solid rgba(239,68,68,0.9)",
          borderRadius: 2, cursor: `${handle}-resize`, zIndex: 20,
          ...(handle === "nw" ? { top: -5, left: -5 }
            : handle === "ne" ? { top: -5, right: -5 }
            : handle === "sw" ? { bottom: -5, left: -5 }
            : { bottom: -5, right: -5 }),
        }}
      />
    ));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#0f0f11] text-slate-300 font-sans">
      <div className="px-5 pt-4 pb-6 md:px-8">

        {/* ── COMPACT HEADER ───────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">
              Generate Sertifikat
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              Halaman untuk membuat sertifikat secara otomatis
            </p>
          </div>
          {template.naturalW > 0 && (
            <span className="text-[10px] text-slate-700 font-mono flex-shrink-0">
              {template.naturalW}×{template.naturalH}px
            </span>
          )}
        </div>

        {/* ── TOP TOOLBAR ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-white/5">
          {/* Upload template */}
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition-all"
          >
            🖼️ {template.file ? "Ganti" : "Upload Template"}
          </button>
          <input ref={templateInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTemplateFile(f); }} />

          {/* Add text */}
          <button
            type="button"
            onClick={addTextLayer}
            disabled={!template.file}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all ${
              template.file ? "bg-[#18181b] hover:bg-white/10 border-white/10" : "bg-white/5 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            T Tambah Teks
          </button>

          {/* Upload signature */}
          <button
            type="button"
            onClick={() => sigInputRef.current?.click()}
            disabled={!template.file}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all ${
              template.file ? "bg-[#18181b] hover:bg-white/10 border-white/10" : "bg-white/5 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            ✍️ Upload TTD
          </button>
          <input ref={sigInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) addSignatureLayer(f); }} />

          {/* Layer selector dropdown — replaces layer chips, shown when layers exist */}
          {layers.length > 0 && (
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              title="Pilih elemen untuk diedit"
              className="bg-[#18181b] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-red-600 cursor-pointer max-w-[180px]"
            >
              <option value="">— Pilih elemen —</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type === "text"
                    ? `📝 ${(l as TextLayer).content.slice(0, 25)}`
                    : "✍️ TTD"}
                </option>
              ))}
            </select>
          )}

          {/* Delete selected layer shortcut */}
          {selectedId && (
            <button
              type="button"
              onClick={() => deleteLayer(selectedId)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-400 rounded-xl text-xs font-bold transition-all"
            >
              🗑 Hapus
            </button>
          )}
        </div>

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

          {/* ═══ LEFT: CANVAS ═══ */}
          <div>
            {/* Text toolbar — always visible when template loaded, disabled when no text layer selected */}
            {template.file && (
              <TextToolbar
                layer={selectedTextLayer ?? textLayers[0] ?? {
                  id: "", type: "text" as const, content: "{name}", x: 50, y: 50,
                  fontSize: 48, fontFamily: "Arial", fontWeight: "bold" as const,
                  fontStyle: "normal" as const, color: "#000000", align: "center" as const,
                  opacity: 1, namesRaw: "",
                }}
                onUpdate={(patch) => { if (selectedTextLayer) updateLayer(selectedTextLayer.id, patch); }}
                onDelete={() => { if (selectedTextLayer) deleteLayer(selectedTextLayer.id); }}
                customFonts={customFonts}
                onImportFont={handleImportFont}
                fontInputRef={fontInputRef}
                disabled={!selectedTextLayer}
              />
            )}

            {!template.file ? (
              <div
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleTemplateFile(f); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => templateInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-red-600/40 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all py-28 px-8 hover:bg-white/[0.01]"
              >
                <div className="text-5xl mb-4 select-none">🖼️</div>
                <p className="text-lg font-bold text-white mb-1">Upload Template Sertifikat</p>
                <p className="text-sm text-slate-500">
                  Seret &amp; lepas PNG/JPG, atau{" "}
                  <span className="text-red-400 font-semibold underline underline-offset-2">klik untuk memilih</span>
                </p>
              </div>
            ) : (
              <>
                {/* Canvas container — overflow-hidden di inner div agar resize handle tidak ter-clip */}
                <div
                  ref={containerRef}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onMouseDown={(e) => {
                    // Deselect only when clicking the canvas background (not a child layer)
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "IMG") {
                      setSelectedId(null);
                    }
                  }}
                  className="relative select-none rounded-2xl border border-white/10 bg-[#0f0f11] shadow-2xl"
                  style={{ cursor: drag ? "grabbing" : resize ? "nwse-resize" : "default" }}
                >
                  {/* Template image clipped to rounded corners */}
                  <div className="rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.url ?? ""}
                      alt="Template sertifikat"
                      className="w-full h-auto block"
                      draggable={false}
                    />
                  </div>

                  {/* Layers */}
                  {layers.map((layer) => {
                    if (layer.type === "text") {
                      const tl = layer as TextLayer;
                      const fsPx = Math.max(8, tl.fontSize * previewScale);
                      // Preview canvas: tiap layer pakai nama terpanjangnya sendiri
                      const tlParsed = parseNames(tl.namesRaw ?? "");
                      const tlLongest =
                        tlParsed.names.reduce((a, b) => (b.length > a.length ? b : a), "") ||
                        "Nama Peserta";
                      const resolvedText = resolvePlaceholders(tl.content, tlLongest, batchInfo, 0);
                      const isSelected = selectedId === tl.id;
                      return (
                        <div
                          key={tl.id}
                          onMouseDown={(e) => handleLayerMouseDown(e, tl.id)}
                          // FIX: stopPropagation on click so canvas onMouseDown doesn't deselect
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute", left: `${tl.x}%`, top: `${tl.y}%`,
                            cursor: drag?.id === tl.id ? "grabbing" : "grab",
                            transform: tl.align === "center" ? "translateX(-50%)" : tl.align === "right" ? "translateX(-100%)" : "none",
                          }}
                        >
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <span
                              style={{
                                display: "block", fontSize: `${fsPx}px`,
                                fontFamily: tl.fontFamily, fontWeight: tl.fontWeight,
                                fontStyle: tl.fontStyle, color: tl.color, opacity: tl.opacity,
                                userSelect: "none", whiteSpace: "nowrap",
                                outline: isSelected ? "2px dashed rgba(239,68,68,0.8)" : "2px dashed transparent",
                                outlineOffset: "3px", borderRadius: "2px", padding: "1px 3px",
                                letterSpacing: tl.letterSpacing ? `${tl.letterSpacing}px` : undefined,
                                textShadow: (tl.shadowBlur || tl.shadowOffsetX || tl.shadowOffsetY)
                                  ? `${tl.shadowOffsetX ?? 0}px ${tl.shadowOffsetY ?? 0}px ${tl.shadowBlur ?? 0}px ${tl.shadowColor ?? "#000000"}`
                                  : undefined,
                                WebkitTextStroke: (tl.stroke && tl.strokeWidth)
                                  ? `${tl.strokeWidth}px ${tl.stroke}`
                                  : undefined,
                              }}
                            >
                              {resolvedText}
                            </span>
                            {isSelected && buildResizeHandles(tl.id)}
                          </div>
                        </div>
                      );
                    } else {
                      const sl = layer as SignatureLayer;
                      const isSelected = selectedId === sl.id;
                      return (
                        <div
                          key={sl.id}
                          onMouseDown={(e) => handleLayerMouseDown(e, sl.id)}
                          // FIX: stopPropagation on click so canvas onMouseDown doesn't deselect
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute", left: `${sl.x}%`, top: `${sl.y}%`,
                            width: `${sl.widthPct}%`,
                            cursor: drag?.id === sl.id ? "grabbing" : "grab",
                          }}
                        >
                          <div style={{ position: "relative" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sl.url} alt="Tanda tangan" draggable={false}
                              style={{
                                width: "100%", display: "block", opacity: sl.opacity,
                                outline: isSelected ? "2px dashed rgba(239,68,68,0.8)" : "2px dashed transparent",
                                outlineOffset: "3px",
                              }}
                            />
                            {isSelected && buildResizeHandles(sl.id)}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {layers.length > 0 && (
                  <p className="text-[10px] text-slate-600 text-center mt-2">
                    Klik teks/TTD untuk memilih · Drag untuk memindahkan · Drag sudut untuk resize · Del untuk hapus
                  </p>
                )}
              </>
            )}
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          <div className="flex flex-col gap-4">

            {/* ── DOWNLOAD — di bagian paling atas agar langsung terlihat ── */}
            <section className="bg-[#18181b] border border-red-600/20 rounded-3xl p-4 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 border-b border-white/5 pb-2.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </h2>

              {/* Readiness checklist */}
              <ul className="space-y-1.5 mb-3">
                <CheckItem ok={!!template.file} label="Template diupload" />
                <CheckItem
                  ok={layers.length > 0}
                  label={layers.length > 0 ? `${layers.length} elemen canvas` : "Belum ada elemen"}
                />
                <CheckItem
                  ok={totalCerts > 0 && parsedLayerNames.every((p) => !p.isOverLimit)}
                  label={
                    parsedLayerNames.some((p) => p.isOverLimit)
                      ? `Ada nama melebihi batas (maks ${MAX_NAMES})`
                      : totalCerts > 0
                      ? `${totalCerts} sertifikat siap`
                      : "Daftar nama kosong"
                  }
                />
              </ul>

              {/* Single CTA — opens modal */}
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                disabled={!template.file || layers.length === 0}
                className={`w-full py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                  template.file && layers.length > 0
                    ? "bg-red-600 hover:bg-red-700 text-white border-transparent shadow-[0_0_20px_rgba(220,38,38,0.25)]"
                    : "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Buka Dialog Download
              </button>
            </section>

            {/* ── PROPERTI TTD (sidebar, only for signature layer) ── */}
            {selectedLayer?.type === "signature" && (
              <section
                aria-label="Properti TTD"
                className="bg-[#18181b] border border-red-500/20 rounded-3xl p-4 shadow-xl"
              >
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                  <h2 className="text-sm font-bold text-white">✍️ Properti TTD</h2>
                  <button
                    type="button"
                    onClick={() => deleteLayer(selectedLayer.id)}
                    className="text-[10px] px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 rounded-lg transition-all font-bold"
                  >
                    Hapus
                  </button>
                </div>
                <SignatureProperties
                  layer={selectedLayer as SignatureLayer}
                  onUpdate={(patch) => updateLayer(selectedLayer.id, patch)}
                  labelCls={labelCls}
                />
              </section>
            )}

            {/* ── DAFTAR NAMA — context-sensitive per text layer ── */}
            <section className="bg-[#18181b] border border-white/5 rounded-3xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  👥
                  {selectedTextLayer
                    ? <>
                        Nama —
                        <span className="text-red-400 font-mono text-xs max-w-[120px] truncate">
                          {selectedTextLayer.content.slice(0, 20) || "(teks)"}
                        </span>
                      </>
                    : "Daftar Nama"
                  }
                </h2>
                {textLayers.length > 1 && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    {selectedLayerIdx >= 0 ? `Layer ${selectedLayerIdx + 1}/${textLayers.length}` : `${textLayers.length} layer`}
                  </span>
                )}
              </div>

              {textLayers.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">
                  Tambahkan elemen teks di canvas terlebih dahulu
                </p>
              ) : !selectedTextLayer ? (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Klik salah satu elemen teks di canvas untuk mengedit daftar namanya.
                  </p>
                  {/* Ringkasan semua layer */}
                  <div className="flex flex-col gap-2">
                    {textLayers.map((tl, idx) => {
                      const p = parsedLayerNames[idx];
                      return (
                        <button
                          key={tl.id}
                          type="button"
                          onClick={() => setSelectedId(tl.id)}
                          className="flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 rounded-xl text-left transition-all"
                        >
                          <span className="text-xs text-slate-300 font-mono truncate max-w-[140px]">
                            📝 {tl.content.slice(0, 22) || "(teks)"}
                          </span>
                          <span className={`text-[11px] font-semibold ml-2 flex-shrink-0 ${
                            p.isOverLimit ? "text-red-400" : p.names.length > 0 ? "text-emerald-400" : "text-slate-600"
                          }`}>
                            {p.names.length > 0 ? `${p.names.length} nama` : "kosong"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {totalCerts > 0 && (
                    <p className="text-[10px] text-slate-600 mt-3 text-center">
                      Total: <span className="text-slate-400">{totalCerts} sertifikat</span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    rows={8}
                    value={selectedTextLayer.namesRaw ?? ""}
                    onChange={(e) => updateLayer(selectedTextLayer.id, { namesRaw: e.target.value } as Partial<TextLayer>)}
                    placeholder={"Budi Santoso\nSiti Aminah\nAndi Wijaya"}
                    className={`${inputCls} resize-y font-mono text-xs leading-relaxed ${
                      selectedParsed?.isOverLimit ? "border-red-500/60" : ""
                    }`}
                  />
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${
                      selectedParsed?.isOverLimit ? "text-red-400" : "text-slate-500"
                    }`}>
                      {selectedParsed?.names.length ?? 0} nama
                      {selectedParsed?.isOverLimit && ` (maks ${MAX_NAMES})`}
                    </span>
                    {(selectedParsed?.duplicates.length ?? 0) > 0 && !selectedParsed?.isOverLimit && (
                      <span className="text-[10px] text-slate-600">
                        · {selectedParsed!.duplicates.length} duplikat (diabaikan)
                      </span>
                    )}
                  </div>
                  {(selectedParsed?.names.length ?? 0) > 0 && (
                    <p className="text-[10px] text-slate-600 mt-1">
                      Terpanjang:{" "}
                      <span className="text-slate-400">
                        {selectedParsed!.names.reduce((a, b) => (b.length > a.length ? b : a), "")}
                      </span>
                    </p>
                  )}
                  {selectedParsed?.isOverLimit && (
                    <p className="text-[10px] text-red-400 mt-1">⚠️ Kurangi jumlah nama untuk melanjutkan.</p>
                  )}
                  {totalCerts > 0 && textLayers.length > 1 && (
                    <p className="text-[10px] text-slate-600 mt-2 text-center">
                      Total sertifikat: <span className="text-slate-400">{totalCerts}</span>
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ── DOWNLOAD MODAL ─────────────────────────────────────────────────── */}
      {showDownloadModal && (
        <DownloadModal
          batchInfo={batchInfo}
          setBatchInfo={setBatchInfo}
          totalCerts={totalCerts}
          generating={generating}
          doneCount={doneCount}
          canDownload={canDownload}
          onPreview={handleDownloadPreview}
          onGenerate={handleBatchGenerate}
          onGeneratePdf={handleBatchGeneratePdf}
          onClose={() => { if (!generating) setShowDownloadModal(false); }}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}
    </div>
  );
}

// ─── Text Toolbar ─ always visible when template loaded ───────────────────────

const ALIGN_ORDER = ["left", "center", "right"] as const;

function AlignCycleIcon({ align }: { align: "left" | "center" | "right" }) {
  if (align === "left") return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="10" x2="15" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  );
  if (align === "center") return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" /><line x1="7" y1="18" x2="17" y2="18" />
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="10" x2="21" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" /><line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function FontPicker({ value, customFonts, onChange, onImportFont, fontInputRef, disabled }: {
  value: string; customFonts: CustomFont[]; onChange: (f: string) => void;
  onImportFont: (f: File) => void; fontInputRef: React.RefObject<HTMLInputElement | null>; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const customNames = customFonts.map((f) => f.name);
  const allFonts = useMemo(() => {
    const base = [...customNames, ...GOOGLE_FONTS.filter((f) => !customNames.includes(f))];
    return search.trim() ? base.filter((f) => f.toLowerCase().includes(search.toLowerCase())) : base;
  }, [customNames, search]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 60); }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} type="button" disabled={disabled} onClick={handleToggle}
        style={{ fontFamily: value, background: "#0f0f11", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "white", padding: "3px 8px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, minWidth: 130, maxWidth: 180 }}>
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4, flexShrink: 0 }}><path d="M1 3l4 4 4-4" /></svg>
      </button>

      {open && (
        <div ref={popRef} style={{ position: "fixed", top: popPos.top, left: popPos.left, width: 230, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 9999, overflow: "hidden" }}>
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari font…"
              style={{ width: "100%", background: "#0f0f11", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 12, padding: "5px 8px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 290, overflowY: "auto", padding: "4px 0" }}>
            {customNames.length > 0 && !search && (
              <div style={{ padding: "3px 12px", fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Custom</div>
            )}
            {allFonts.map((font) => (
              <button key={font} type="button"
                onMouseEnter={() => loadGoogleFont(font)}
                onClick={() => { loadGoogleFont(font); onChange(font); setOpen(false); setSearch(""); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: font === value ? "rgba(220,38,38,0.15)" : "transparent", border: "none", color: font === value ? "#fca5a5" : "#d4d4d8", padding: "6px 12px", fontSize: 13, fontFamily: font, cursor: "pointer" }}
                onMouseOver={(e) => { if (font !== value) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseOut={(e) => { if (font !== value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {font}
                {customNames.includes(font) && <span style={{ fontSize: 9, background: "rgba(220,38,38,0.2)", color: "#fca5a5", padding: "1px 5px", borderRadius: 4, fontFamily: "system-ui" }}>Custom</span>}
              </button>
            ))}
            {allFonts.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#52525b", fontSize: 12 }}>Tidak ditemukan</div>}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "4px" }}>
            <button type="button" onClick={() => fontInputRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 8px", borderRadius: 8, background: "transparent", border: "none", color: "#71717a", fontSize: 12, cursor: "pointer" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "white"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "#71717a"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Import Font (.ttf/.otf/.woff)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorPickerPopover({ value, onChange, disabled }: {
  value: string; onChange: (c: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [rgb, setRgb] = useState(() => hexToRgb(value));
  const [recent, setRecent] = useState<string[]>([]);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => { setHexInput(value); setRgb(hexToRgb(value)); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRecent((prev) => { const w = prev.filter((c) => c !== value); return [value, ...w].slice(0, 8); });
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, value]);

  const apply = (hex: string) => {
    if (/^#[0-9a-f]{6}$/i.test(hex)) { onChange(hex); setRgb(hexToRgb(hex)); }
  };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popWidth = 244;
      let left = rect.left;
      // Prevent overflow off right edge of viewport
      if (left + popWidth > window.innerWidth - 8) {
        left = window.innerWidth - popWidth - 8;
      }
      setPopPos({ top: rect.bottom + 6, left });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button ref={btnRef} type="button" disabled={disabled} onClick={handleToggle} title="Pilih warna"
        style={{ width: 24, height: 24, borderRadius: 6, background: value, border: open ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0, transition: "border-color 0.2s" }} />

      {open && (
        <div ref={popRef} style={{ position: "fixed", top: popPos.top, left: popPos.left, width: 244, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", zIndex: 9999, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <HexColorPicker color={value} onChange={(c) => { onChange(c); setHexInput(c); setRgb(hexToRgb(c)); }}
            style={{ width: "100%", height: 160 }} />

          {/* Hex input */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: value, border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />
            <input type="text" value={hexInput}
              onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value; setHexInput(v); apply(v); }}
              style={{ flex: 1, background: "#0f0f11", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", fontSize: 11, padding: "3px 6px", fontFamily: "monospace", outline: "none" }} />
          </div>

          {/* RGB */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {(["r", "g", "b"] as const).map((ch) => (
              <div key={ch} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9, color: "#52525b", textAlign: "center", fontWeight: 700, textTransform: "uppercase" }}>{ch}</span>
                <input type="number" min={0} max={255} value={rgb[ch]}
                  onChange={(e) => { const nv = { ...rgb, [ch]: Math.max(0, Math.min(255, parseInt(e.target.value) || 0)) }; setRgb(nv); const h = rgbToHex(nv.r, nv.g, nv.b); onChange(h); setHexInput(h); }}
                  style={{ background: "#0f0f11", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", fontSize: 11, padding: "3px 4px", textAlign: "center", outline: "none", width: "100%" }} />
              </div>
            ))}
          </div>

          {/* Swatches */}
          <div>
            <div style={{ fontSize: 9, color: "#52525b", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Preset</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {COLOR_SWATCHES.map((c) => (
                <button key={c} type="button" onClick={() => { onChange(c); setHexInput(c); setRgb(hexToRgb(c)); }}
                  style={{ width: 20, height: 20, borderRadius: 4, background: c, border: c === value ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }} title={c} />
              ))}
            </div>
          </div>

          {/* Recent */}
          {recent.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: "#52525b", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Terakhir</div>
              <div style={{ display: "flex", gap: 4 }}>
                {recent.map((c) => (
                  <button key={c} type="button" onClick={() => { onChange(c); setHexInput(c); setRgb(hexToRgb(c)); }}
                    style={{ width: 20, height: 20, borderRadius: 4, background: c, border: c === value ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }} title={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EffectsPanel({ layer, onUpdate, disabled }: {
  layer: TextLayer; onUpdate: (p: Partial<TextLayer>) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hasStroke = !!(layer.stroke && layer.strokeWidth);
  const hasShadow = !!(layer.shadowBlur || layer.shadowOffsetX || layer.shadowOffsetY);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
  const labelStyle: React.CSSProperties = { fontSize: 10, color: "#71717a", width: 56, flexShrink: 0 };
  const valStyle: React.CSSProperties = { fontSize: 10, color: "#a1a1aa", width: 26, textAlign: "right", flexShrink: 0 };
  const sliderStyle: React.CSSProperties = { flex: 1, accentColor: "#dc2626" };
  const dividerStyle: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" };

  const toggleBtn = (on: boolean, onToggle: () => void) => (
    <button type="button" onClick={onToggle}
      style={{ fontSize: 10, padding: "2px 10px", borderRadius: 6, background: on ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.07)", border: on ? "1px solid rgba(220,38,38,0.35)" : "1px solid rgba(255,255,255,0.1)", color: on ? "#fca5a5" : "#71717a", cursor: "pointer", fontWeight: 700 }}>
      {on ? "ON" : "OFF"}
    </button>
  );

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popWidth = 268;
      let left = rect.left;
      if (left + popWidth > window.innerWidth - 8) {
        left = window.innerWidth - popWidth - 8;
      }
      setPopPos({ top: rect.bottom + 4, left });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} type="button" disabled={disabled} onClick={handleToggle} title="Efek teks"
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: (hasStroke || hasShadow) ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.05)", border: (hasStroke || hasShadow) ? "1px solid rgba(220,38,38,0.3)" : "1px solid rgba(255,255,255,0.1)", color: (hasStroke || hasShadow) ? "#fca5a5" : "#a1a1aa", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
        ✨ Efek
      </button>

      {open && (
        <div ref={popRef} style={{ position: "fixed", top: popPos.top, left: popPos.left, width: 268, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 9999, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Stroke */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Stroke (Outline)</span>
              {toggleBtn(hasStroke, () => hasStroke ? onUpdate({ stroke: undefined, strokeWidth: 0 }) : onUpdate({ stroke: "#000000", strokeWidth: 2 }))}
            </div>
            {hasStroke && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={rowStyle}>
                  <span style={labelStyle}>Warna</span>
                  <ColorPickerPopover value={layer.stroke || "#000000"} onChange={(c) => onUpdate({ stroke: c })} />
                  <span style={{ ...valStyle, fontFamily: "monospace", width: "auto" }}>{layer.stroke}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Tebal</span>
                  <input type="range" min={1} max={20} value={layer.strokeWidth || 1} onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })} style={sliderStyle} />
                  <span style={valStyle}>{layer.strokeWidth || 1}px</span>
                </div>
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* Shadow */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Shadow</span>
              {toggleBtn(hasShadow, () => hasShadow ? onUpdate({ shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0 }) : onUpdate({ shadowColor: "#000000", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, shadowOpacity: 0.5 }))}
            </div>
            {hasShadow && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={rowStyle}>
                  <span style={labelStyle}>Warna</span>
                  <ColorPickerPopover value={layer.shadowColor || "#000000"} onChange={(c) => onUpdate({ shadowColor: c })} />
                  <span style={{ ...valStyle, fontFamily: "monospace", width: "auto" }}>{layer.shadowColor}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Blur</span>
                  <input type="range" min={0} max={30} value={layer.shadowBlur || 0} onChange={(e) => onUpdate({ shadowBlur: parseInt(e.target.value) })} style={sliderStyle} />
                  <span style={valStyle}>{layer.shadowBlur || 0}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Offset X</span>
                  <input type="range" min={-20} max={20} value={layer.shadowOffsetX || 0} onChange={(e) => onUpdate({ shadowOffsetX: parseInt(e.target.value) })} style={sliderStyle} />
                  <span style={valStyle}>{layer.shadowOffsetX || 0}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Offset Y</span>
                  <input type="range" min={-20} max={20} value={layer.shadowOffsetY || 0} onChange={(e) => onUpdate({ shadowOffsetY: parseInt(e.target.value) })} style={sliderStyle} />
                  <span style={valStyle}>{layer.shadowOffsetY || 0}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Opacity</span>
                  <input type="range" min={0} max={1} step={0.05} value={layer.shadowOpacity ?? 0.5} onChange={(e) => onUpdate({ shadowOpacity: parseFloat(e.target.value) })} style={sliderStyle} />
                  <span style={valStyle}>{Math.round((layer.shadowOpacity ?? 0.5) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* Letter spacing */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Letter Spacing</span>
              <span style={{ fontSize: 10, color: "#a1a1aa" }}>{layer.letterSpacing ?? 0}px</span>
            </div>
            <input type="range" min={-5} max={50} step={0.5} value={layer.letterSpacing ?? 0} onChange={(e) => onUpdate({ letterSpacing: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: "#dc2626" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TextToolbar({
  layer, onUpdate, onDelete, customFonts, onImportFont, fontInputRef, disabled = false,
}: {
  layer: TextLayer; onUpdate: (patch: Partial<TextLayer>) => void; onDelete: () => void;
  customFonts: CustomFont[]; onImportFont: (file: File) => void;
  fontInputRef: React.RefObject<HTMLInputElement | null>; disabled?: boolean;
}) {
  const sep = <span className="w-px h-4 bg-white/10 flex-shrink-0 self-center" />;
  const nextAlign = ALIGN_ORDER[(ALIGN_ORDER.indexOf(layer.align) + 1) % 3];

  return (
    <div
      className="mb-2 bg-[#18181b] border border-red-500/20 rounded-2xl px-3 py-2 shadow-lg"
      style={{ opacity: disabled ? 0.38 : 1, pointerEvents: disabled ? "none" : "auto", transition: "opacity 0.2s", overflow: "visible" }}
      title={disabled ? "Pilih elemen teks di canvas untuk mengedit" : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-max" style={{ overflowX: "auto", overflowY: "visible" }}>

        {/* Font picker */}
        <FontPicker value={layer.fontFamily} customFonts={customFonts} onChange={(f) => onUpdate({ fontFamily: f })} onImportFont={onImportFont} fontInputRef={fontInputRef} disabled={disabled} />
        <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFont(f); }} />

        {sep}

        {/* Font size stepper */}
        <div className="flex items-center">
          <button type="button" onClick={() => onUpdate({ fontSize: Math.max(8, layer.fontSize - 2) })}
            className="w-5 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-l text-white text-sm transition-all border-r-0">−</button>
          <input type="number" value={layer.fontSize} min={8} max={2000}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 48 })}
            className="w-12 bg-[#0f0f11] border border-white/10 px-1 py-1 text-xs text-white text-center outline-none focus:ring-1 focus:ring-red-600" />
          <button type="button" onClick={() => onUpdate({ fontSize: Math.min(2000, layer.fontSize + 2) })}
            className="w-5 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-r text-white text-sm transition-all border-l-0">+</button>
        </div>

        {sep}

        {/* Bold */}
        <button type="button" title="Bold" onClick={() => onUpdate({ fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
          className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-extrabold transition-all ${layer.fontWeight === "bold" ? "bg-red-600/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}>B</button>

        {/* Italic */}
        <button type="button" title="Italic" onClick={() => onUpdate({ fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })}
          className={`w-6 h-6 flex items-center justify-center rounded border text-xs italic transition-all ${layer.fontStyle === "italic" ? "bg-red-600/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}>I</button>

        {sep}

        {/* Alignment cycle button */}
        <button type="button" onClick={() => onUpdate({ align: nextAlign })}
          title={`Alignment: ${layer.align} → klik untuk ${nextAlign}`}
          className="w-7 h-6 flex items-center justify-center rounded border bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all">
          <AlignCycleIcon align={layer.align} />
        </button>

        {sep}

        {/* Color picker */}
        <ColorPickerPopover value={layer.color} onChange={(c) => onUpdate({ color: c })} disabled={disabled} />

        {sep}

        {/* Effects panel */}
        <EffectsPanel layer={layer} onUpdate={onUpdate} disabled={disabled} />

        {sep}

        {/* Content placeholder text */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-600 uppercase tracking-wide font-bold whitespace-nowrap">Teks</span>
          <input type="text" value={layer.content} onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="{name}" className="w-28 bg-[#0f0f11] border border-white/10 rounded px-1.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-red-600 font-mono" />
        </div>

        {sep}

        {/* Delete */}
        <button type="button" onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 rounded text-[10px] font-bold transition-all whitespace-nowrap">
          🗑 Hapus
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignatureProperties({
  layer, onUpdate, labelCls,
}: {
  layer: SignatureLayer;
  onUpdate: (patch: Partial<SignatureLayer>) => void;
  labelCls: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="sig-width" className={`${labelCls} flex justify-between`}>
          <span>Lebar</span>
          <span className="text-slate-400 font-normal normal-case tracking-normal">{layer.widthPct.toFixed(1)}%</span>
        </label>
        <input id="sig-width" type="range" min={2} max={80} step={0.5} value={layer.widthPct}
          onChange={(e) => onUpdate({ widthPct: parseFloat(e.target.value) })}
          className="w-full accent-red-600 cursor-pointer" />
      </div>
      <div>
        <label htmlFor="sig-opacity" className={`${labelCls} flex justify-between`}>
          <span>Opacity</span>
          <span className="text-slate-400 font-normal normal-case tracking-normal">{Math.round(layer.opacity * 100)}%</span>
        </label>
        <input id="sig-opacity" type="range" min={0} max={1} step={0.05} value={layer.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-red-600 cursor-pointer" />
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs list-none">
      <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] border ${ok ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-slate-600 border-white/10"}`}>
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "text-slate-300" : "text-slate-600"}>{label}</span>
    </li>
  );
}

function Spinner() {
  return (
    <svg aria-hidden="true" className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
    </svg>
  );
}
