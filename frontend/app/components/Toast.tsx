"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion-preference";

export type ToastType = "error" | "success" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 4000. 0 = tidak auto-dismiss
  onClose: () => void;
}

const ICONS = {
  error: CircleAlert,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
};

const COLORS: Record<ToastType, string> = {
  error:   "bg-red-700 border-red-500 text-white",
  success: "bg-emerald-700 border-emerald-500 text-white",
  info:    "bg-blue-700 border-blue-500 text-white",
  warning: "bg-amber-600 border-amber-400 text-white",
};

export default function Toast({
  message,
  type = "error",
  duration = 4000,
  onClose,
}: ToastProps) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number>(0);
  const Icon = ICONS[type];
  const close = useCallback(() => {
    if (closeTimer.current) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    const timer = duration ? window.setTimeout(close, duration) : 0;
    return () => window.clearTimeout(timer);
  }, [duration, close]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-5 right-5 z-[9999] flex items-start gap-3
        max-w-[min(24rem,calc(100vw-2.5rem))] w-full px-4 py-3.5
        border rounded-xl shadow-2xl backdrop-blur-md
        ${COLORS[type]}
        ${closing ? "motion-pop-out" : "motion-pop-in"}
      `}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true"/>
      <p className="text-sm font-medium leading-snug flex-1">{message}</p>
      <button
        type="button"
        onClick={close}
        disabled={closing}
        aria-label="Tutup notifikasi"
        className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
      >
        <X size={16} aria-hidden="true"/>
      </button>
    </div>
  );
}
