"use client";

import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface ShortLink {
  linkID: number;
  slug: string;
  destinationUrl: string;
}

interface QRCodeModalProps {
  link: ShortLink;
  shortlinkUrl: string;
  onClose: () => void;
}

export default function QRCodeModal({ link, shortlinkUrl, onClose }: QRCodeModalProps) {
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ── Download QR sebagai PNG ────────────────────────────────────────────────
  const handleDownload = () => {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${link.slug}.png`;
    a.click();
  };

  // ── Salin URL shortlink ────────────────────────────────────────────────────
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortlinkUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shortlinkUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors text-sm w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-xl mb-2">
            📱
          </div>
          <h3 className="text-white font-bold text-lg">QR Code</h3>
          <p className="text-slate-500 text-xs text-center">
            Scan untuk mengakses shortlink
          </p>
        </div>

        {/* QR Code */}
        <div
          ref={qrWrapperRef}
          className="flex items-center justify-center bg-white rounded-xl p-4 mb-5 mx-auto w-fit"
        >
          <QRCodeCanvas
            value={shortlinkUrl}
            size={220}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            marginSize={1}
          />
        </div>

        {/* Info shortlink */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5">
            <span className="text-slate-500 text-xs flex-shrink-0">Shortlink:</span>
            <code className="text-red-400 font-mono text-xs break-all">
              {shortlinkUrl}
            </code>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5">
            <span className="text-slate-500 text-xs flex-shrink-0">Tujuan:</span>
            <span className="text-slate-400 text-xs break-all line-clamp-2">
              {link.destinationUrl}
            </span>
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex flex-col gap-2.5">
          {/* Download PNG */}
          <button
            onClick={handleDownload}
            className="w-full py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-[0_0_20px_rgba(220,38,38,0.25)] hover:shadow-[0_0_28px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download QR Code (PNG)
          </button>

          {/* Salin URL */}
          <button
            onClick={handleCopyUrl}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border ${
              copiedUrl
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {copiedUrl ? (
              <>
                <span>✓</span> URL Tersalin!
              </>
            ) : (
              <>
                <span>📋</span> Salin URL Shortlink
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
