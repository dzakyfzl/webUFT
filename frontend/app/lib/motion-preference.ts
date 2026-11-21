"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  return window.matchMedia(query).matches;
}

function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

export function scrollMotion(): ScrollBehavior {
  return prefersReducedMotion() ? "instant" : "smooth";
}

export function shakeInvalidField(element: HTMLElement) {
  for (const animation of element.getAnimations()) {
    if (animation.id === "invalid-field-shake") animation.cancel();
  }
  if (prefersReducedMotion()) return;
  const animation = element.animate(
    [0, -7, 6, -4, 2, 0].map(x => ({ translate: `${x}px 0` })),
    { duration: 350, easing: "ease-in-out" },
  );
  animation.id = "invalid-field-shake";
  return animation;
}
