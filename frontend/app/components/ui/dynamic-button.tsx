"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "../../lib/motion-preference";

// Adapted from dqnamo's MIT-licensed Kitchen Dynamic Button.
// https://www.dqnamo.com/experiments/dynamic-button
type DynamicButtonProps = Omit<HTMLMotionProps<"button">, "children" | "initial" | "animate" | "transition" | "ref"> & {
  children: string;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export default function DynamicButton({ children, icon, fullWidth, className, type = "button", ...props }: DynamicButtonProps) {
  const reduced = useReducedMotion();
  const button = useRef<HTMLButtonElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const element = button.current;
    const content = measure.current;
    if (!element || !content) return;
    function update() {
      if (!element || !content) return;
      const style = getComputedStyle(element);
      const sides = [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth];
      setWidth(Math.ceil(content.scrollWidth +
        sides.reduce((sum, value) => sum + (parseFloat(value) || 0), 0)));
    }
    const observer = new ResizeObserver(update);
    observer.observe(content);
    update();
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children, fullWidth]);

  const content = <>{icon}<span>{children}</span></>;
  return <motion.button
    type={type}
    ref={button}
    initial={false}
    animate={fullWidth ? undefined : { width: width ?? "auto" }}
    transition={{ width: reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: .26 } }}
    className={["motion-dynamic-button", fullWidth && "motion-dynamic-button-full", className].filter(Boolean).join(" ")}
    aria-label={children}
    {...props}
  >
    <span className="motion-dynamic-slot" aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          className="motion-dynamic-label"
          key={children}
          ref={fullWidth ? undefined : measure}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reduced ? 0 : .18, ease: [.23, 1, .32, 1] }}
        >{content}</motion.span>
      </AnimatePresence>
    </span>
  </motion.button>;
}
