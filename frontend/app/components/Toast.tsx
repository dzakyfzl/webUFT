"use client";

import { useEffect, useState } from "react";

export type ToastType = "error" | "success" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 4000. 0 = tidak auto-dismiss
  onClose: () => void;
}

const ICONS: Record<ToastType, string> = {
  error:   "❌",
  success: "✅",
  info:    "ℹ️",
  warning: "⚠️",
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
  const [visible, setVisible] = useState(false);

  // Animasi masuk
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // tunggu animasi keluar
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-5 right-5 z-[9999] flex items-start gap-3
        max-w-sm w-full px-4 py-3.5
        border rounded-xl shadow-2xl backdrop-blur-md
        transition-all duration-300 ease-out
        ${COLORS[type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
      `}
    >
      <span className="text-lg shrink-0 mt-0.5">{ICONS[type]}</span>
      <p className="text-sm font-medium leading-snug flex-1">{message}</p>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Tutup notifikasi"
        className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
      >
        ✕
      </button>
    </div>
  );
}
