"use client";

import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "../../lib/motion-preference";

function DirectionalPanel({ step, reduced, children }: { step: 0 | 1; reduced: boolean; children: ReactNode }) {
  const present = useIsPresent();
  const offset = step === 0 ? "-100%" : "100%";
  return <motion.div
    className={present ? "motion-step-panel" : "motion-step-panel motion-step-panel-exiting"}
    inert={!present}
    aria-hidden={!present || undefined}
    tabIndex={-1}
    initial={reduced ? false : { x: offset }}
    animate={{ x: 0 }}
    exit={reduced ? undefined : { x: offset }}
    transition={{ duration: reduced ? 0 : .38, ease: [.22, 1, .36, 1] }}
  >{children}</motion.div>;
}

export default function DirectionalPanels({ step, announcement, children }: { step: 0 | 1; announcement?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const lastFocused = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const previous = lastFocused.current;
    if (!previous || (document.activeElement !== previous && document.activeElement !== document.body)) return;
    const panel = viewport.current?.querySelector<HTMLElement>(".motion-step-panel:not([inert])");
    if (!panel) return;
    const target = panel.querySelector<HTMLElement>("[data-step-focus]") ?? panel;
    target.focus({ preventScroll: true });
  }, [step]);

  return <div
    ref={viewport}
    className="motion-step-viewport"
    onFocusCapture={event => { lastFocused.current = event.target; }}
    onBlurCapture={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) lastFocused.current = null;
    }}
  >
    {announcement !== undefined && <span className="sr-only" role="status">{announcement}</span>}
    <AnimatePresence initial={false}>
      <DirectionalPanel key={step} step={step} reduced={reduced}>{children}</DirectionalPanel>
    </AnimatePresence>
  </div>;
}
