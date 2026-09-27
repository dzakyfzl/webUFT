"use client";

import React, { useEffect, useRef } from "react";

type ScrollRevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

// --- Shared singleton IntersectionObserver (1 instance for entire app) ---
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-revealed");
            sharedObserver!.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
  }
  return sharedObserver;
}

/**
 * Scroll-reveal animation using CSS-only approach.
 * Uses a shared IntersectionObserver singleton to toggle a CSS class.
 * Zero React re-renders — no useState involved.
 */
export function ScrollReveal({ children, delay = 0, className = "" }: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Immediately reveal if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-revealed");
      return;
    }

    const observer = getSharedObserver();
    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`scroll-reveal ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
