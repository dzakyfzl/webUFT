"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

export default function ModalDialog({ onDismiss, dismissBackdrop = false, children, ...props }: Omit<ComponentPropsWithoutRef<"dialog">, "open" | "onCancel"> & {
  onDismiss: () => void; dismissBackdrop?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement;
    element.showModal();
    const initial = element.querySelector<HTMLElement>("[data-form-focus]") ??
      element.querySelector<HTMLElement>("form input:not([type=hidden]):not([disabled]):not([readonly]), form select:not([disabled]), form textarea:not([disabled])");
    initial?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return <dialog {...props} data-modal-root ref={dialog} onCancel={event => { event.preventDefault(); onDismiss(); }} onClick={event => {
    props.onClick?.(event);
    if (dismissBackdrop && event.target === event.currentTarget) onDismiss();
  }}>{children}</dialog>;
}
