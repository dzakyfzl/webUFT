"use client";

import { useEffect, useId, useRef, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "../../lib/motion-preference";

type DisclosureProps = ComponentProps<"details"> & { summary: ReactNode };

export default function Disclosure({ children, summary, onToggle, ...props }: DisclosureProps) {
  const bodyId = useId();
  const legacyTransition = useRef<{ animation: Animation; open: boolean } | null>(null);

  useEffect(() => () => legacyTransition.current?.animation.cancel(), []);

  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    if (CSS.supports("selector(details::details-content)")) return;
    const summary = event.currentTarget;
    const details = summary.parentElement;
    const body = details?.querySelector<HTMLElement>(":scope > .motion-disclosure-body");
    if (!(details instanceof HTMLDetailsElement) || !body) return;

    event.preventDefault();
    const current = legacyTransition.current;
    const open = !(current?.open ?? details.open);
    const from = details.open ? body.getBoundingClientRect().height : 0;
    current?.animation.cancel();
    legacyTransition.current = null;
    body.inert = !open;
    if (prefersReducedMotion()) {
      summary.removeAttribute("aria-expanded");
      details.open = open;
      return;
    }

    summary.setAttribute("aria-expanded", String(open));
    details.open = true;
    const to = open ? body.getBoundingClientRect().height : 0;
    const animation = body.animate(
      [{ height: `${from}px`, overflow: "hidden" }, { height: `${to}px`, overflow: "hidden" }],
      { duration: 320, easing: "cubic-bezier(.25, .8, .25, 1)", fill: "both" },
    );
    legacyTransition.current = { animation, open };
    const finish = () => {
      if (legacyTransition.current?.animation !== animation) return;
      legacyTransition.current = null;
      details.open = open;
      summary.removeAttribute("aria-expanded");
      animation.cancel();
    };
    animation.onfinish = finish;
    // A preference change settles the active transition at its destination.
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onPreferenceChange() { if (media.matches) finish(); }
    media.addEventListener("change", onPreferenceChange);
    animation.finished.catch(() => {}).finally(() => media.removeEventListener("change", onPreferenceChange));
  }

  return <details {...props} onToggle={event => {
    const details = event.currentTarget;
    const body = details.querySelector<HTMLElement>(":scope > .motion-disclosure-body");
    if (!details.open) {
      legacyTransition.current?.animation.cancel();
      legacyTransition.current = null;
      details.querySelector(":scope > summary")?.removeAttribute("aria-expanded");
    }
    if (body) body.inert = !(legacyTransition.current?.open ?? details.open);
    onToggle?.(event);
  }}>
    <summary aria-controls={bodyId} onClick={handleSummaryClick}>{summary}</summary>
    <div id={bodyId} className="motion-disclosure-body"><div className="motion-disclosure-inner">{children}</div></div>
  </details>;
}
