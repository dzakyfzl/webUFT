"use client";

import { useEffect, useRef } from "react";
import styles from "./announcement-intro.module.css";

export function AnnouncementIntro() {
  const cover = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cover.current;
    if (!element) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || window.location.hash === "#hasil-seleksi") {
      element.dataset.dismissed = "true";
      return;
    }
    if (getComputedStyle(element).visibility === "hidden") return;

    const controller = new AbortController();
    const { signal } = controller;
    const dismiss = () => {
      element.dataset.dismissed = "true";
      controller.abort();
    };

    window.addEventListener("keydown", dismiss, { signal });
    window.addEventListener("pointerdown", dismiss, { signal, passive: true });
    window.addEventListener("wheel", dismiss, { signal, passive: true });
    window.addEventListener("touchmove", dismiss, { signal, passive: true });
    window.addEventListener("pagehide", dismiss, { signal });
    motionPreference.addEventListener("change", dismiss, { signal });
    element.addEventListener("animationend", event => {
      if (event.target === element) dismiss();
    }, { signal });

    return () => controller.abort();
  }, []);

  return (
    <div ref={cover} className={styles.cover} data-announcement-intro aria-hidden="true">
      <div className={styles.strip}>
        <div className={styles.frames}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
