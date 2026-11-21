"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Adapted from dqnamo's MIT-licensed Kitchen Scroll Fade List.
// https://www.dqnamo.com/experiments/scroll-fade-list
export default function ScrollFadeList({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = frame.current;
    const scroll = viewport.current;
    const list = content.current;
    if (!root || !scroll || !list) return;
    let animationFrame = 0;
    function update() {
      if (!root || !scroll) return;
      animationFrame = 0;
      const available = scroll.scrollWidth - scroll.clientWidth;
      root.style.setProperty("--scroll-fade-start", `${Math.min(28, Math.max(0, scroll.scrollLeft))}px`);
      root.style.setProperty("--scroll-fade-end", `${Math.min(28, Math.max(0, available - scroll.scrollLeft))}px`);
    }
    function schedule() {
      if (!animationFrame) animationFrame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(scroll);
    observer.observe(list);
    scroll.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      scroll.removeEventListener("scroll", schedule);
    };
  }, []);

  return <div ref={frame} className={`motion-scroll-fade ${className}`}>
    <div ref={viewport} className="motion-scroll-fade-viewport" role="region" aria-label={label} tabIndex={0}>
      <div ref={content} className="w-max min-w-full">{children}</div>
    </div>
  </div>;
}
