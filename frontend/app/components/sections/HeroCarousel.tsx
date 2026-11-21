"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { useReducedMotion } from "../../lib/motion-preference";

type Partner = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
};

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moving: boolean;
};

function resist(distance: number) {
  return Math.sign(distance) * 90 * (1 - Math.exp(-Math.abs(distance) / 260));
}

function releaseCapture(element: HTMLElement, pointerId: number) {
  if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
}

export const HeroCarousel = memo(function HeroCarousel({ partners }: { partners: Partner[] }) {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const lastIndex = Math.max(0, partners.length - 1);
  const index = Math.min(selected, lastIndex);
  const active = useRef(index);
  const viewport = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const drag = useRef<Drag | null>(null);
  const x = useMotionValue(0);
  const reduced = useReducedMotion();

  function snap(next: number, velocity = 0) {
    const nextIndex = Math.max(0, Math.min(lastIndex, next));
    if (nextIndex !== active.current) {
      setPlaying(false);
      setAnnouncement(`Sorotan ${nextIndex + 1} dari ${partners.length}`);
    }
    active.current = nextIndex;
    setSelected(nextIndex);
    const target = -width.current * nextIndex;
    if (reduced) x.jump(target);
    else animate(x, target, { type: "spring", stiffness: 280, damping: 32, velocity });
  }

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) {
      active.current = 0;
      width.current = 0;
      x.jump(0);
      return;
    }
    width.current = element.clientWidth;
    active.current = Math.min(active.current, lastIndex);
    x.jump(-width.current * active.current);
    const frame = requestAnimationFrame(() => {
      setSelected(active.current);
      if (!drag.current) setDragging(false);
    });
    function resize() {
      if (!element || width.current === element.clientWidth) return;
      width.current = element.clientWidth;
      const gesture = drag.current;
      drag.current = null;
      if (gesture) releaseCapture(element, gesture.pointerId);
      setDragging(false);
      x.jump(-width.current * active.current);
    }
    const sizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    sizeObserver.observe(element);
    visibilityObserver.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      const gesture = drag.current;
      drag.current = null;
      if (gesture) releaseCapture(element, gesture.pointerId);
      x.stop();
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [x, lastIndex, partners.length]);

  useEffect(() => {
    if (reduced) x.jump(-width.current * active.current);
  }, [reduced, x]);

  useEffect(() => {
    if (lastIndex === 0 || reduced || !playing || hovered || focused || dragging || !visible) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const next = active.current === lastIndex ? 0 : active.current + 1;
      active.current = next;
      setSelected(next);
      setAnnouncement("");
      if (next === 0) x.jump(0);
      else animate(x, -width.current * next, { type: "spring", stiffness: 280, damping: 32 });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [dragging, focused, hovered, lastIndex, playing, reduced, visible, x]);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!lastIndex || !width.current || drag.current || !event.isPrimary || event.button !== 0) return;
    if (event.pointerType === "mouse") event.preventDefault();
    x.stop();
    const now = performance.now();
    drag.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      startOffset: x.get(), lastX: event.clientX, lastTime: now, velocity: 0, moving: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const delta = event.clientX - gesture.startX;
    if (!gesture.moving && (Math.abs(delta) < 5 || Math.abs(delta) < Math.abs(event.clientY - gesture.startY))) return;
    gesture.moving = true;
    const now = performance.now();
    const elapsed = now - gesture.lastTime;
    if (elapsed > 0) gesture.velocity = Math.max(-2400, Math.min(2400, (event.clientX - gesture.lastX) * 1000 / elapsed));
    gesture.lastX = event.clientX;
    gesture.lastTime = now;
    if (reduced) return;
    const offset = gesture.startOffset + delta;
    const minimum = -width.current * lastIndex;
    x.set(offset > 0 ? resist(offset) : offset < minimum ? minimum + resist(offset - minimum) : offset);
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    drag.current = null;
    releaseCapture(event.currentTarget, gesture.pointerId);
    setDragging(false);
    if (cancelled || !gesture.moving || !width.current) {
      snap(active.current);
      return;
    }
    const velocity = performance.now() - gesture.lastTime < 85 ? gesture.velocity : 0;
    const offset = gesture.startOffset + event.clientX - gesture.startX;
    const projected = offset + velocity * .18;
    const minimum = -width.current * lastIndex;
    const distanceBeyondEdge = offset > 0 ? offset : Math.max(0, minimum - offset);
    const visualVelocity = distanceBeyondEdge ? velocity * (90 / 260) * Math.exp(-distanceBeyondEdge / 260) : velocity;
    const target = offset >= 0 ? 0 : offset <= minimum ? lastIndex : Math.round(-projected / width.current);
    snap(target, visualVelocity);
  }

  if (!partners.length) {
    return <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 bg-stone-100 p-8 text-center">
      <p className="text-base font-semibold text-slate-700">Belum ada Poster yang tersedia</p>
      <p className="text-sm text-slate-500">Poster akan ditampilkan di sini.</p>
    </div>;
  }

  function select(next: number) {
    const gesture = drag.current;
    if (gesture && viewport.current) {
      drag.current = null;
      releaseCapture(viewport.current, gesture.pointerId);
      setDragging(false);
    }
    setPlaying(false);
    snap(next);
  }

  return (
    <section
      aria-label="Sorotan acara"
      aria-roledescription="karusel"
      className="relative overflow-hidden bg-stone-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        select(index + (event.key === "ArrowRight" ? 1 : -1));
      }}
    >
      <div
        ref={viewport}
        className={`touch-pan-y overflow-hidden ${lastIndex ? `select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}` : ""}`}
        onDragStart={event => event.preventDefault()}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={event => finish(event)}
        onPointerCancel={event => finish(event, true)}
        onLostPointerCapture={event => finish(event, true)}
      >
        <motion.div className="flex" style={{ x }}>
          {partners.map((partner, position) => (
            <div
              key={partner.id}
              className="relative flex min-h-[360px] min-w-0 flex-[0_0_100%] items-end pt-20 sm:min-h-[410px] md:min-h-[480px]"
              aria-hidden={position !== index}
            >
              <Image src={partner.image} alt="" fill className="pointer-events-none object-cover" priority={position === 0} unoptimized draggable={false}/>
              <div className="relative w-full bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-4 pb-12 pt-24 text-white sm:px-8 sm:pb-14">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200 sm:text-sm">{partner.label}</p>
                {position === index ? <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[0.95] sm:text-6xl md:text-7xl">{partner.title}</h1>
                  : <p className="mt-3 max-w-3xl text-4xl font-extrabold leading-[0.95] sm:text-6xl md:text-7xl">{partner.title}</p>}
                <p className="mt-5 max-w-xl text-sm text-slate-100 sm:text-base">{partner.description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      {lastIndex > 0 && <div className="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-1 px-3">
        <button className="hero-carousel-control" type="button" aria-label="Sorotan sebelumnya" aria-disabled={index === 0} onClick={() => index > 0 && select(index - 1)}><ChevronLeft size={18} aria-hidden="true"/></button>
        {partners.map((partner, position) => (
          <button key={partner.id} className="hero-carousel-control hero-carousel-dot" type="button" onClick={() => select(position)} aria-label={`Tampilkan sorotan ${position + 1}: ${partner.title}`} aria-current={position === index ? "true" : undefined}>
            <span aria-hidden="true"/>
          </button>
        ))}
        <button className="hero-carousel-control" type="button" aria-label="Sorotan berikutnya" aria-disabled={index === lastIndex} onClick={() => index < lastIndex && select(index + 1)}><ChevronRight size={18} aria-hidden="true"/></button>
        {!reduced && <button className="hero-carousel-control" type="button" aria-label={playing ? "Jeda putar otomatis" : "Lanjutkan putar otomatis"} onClick={() => setPlaying(value => !value)}>
          {playing ? <Pause size={14} aria-hidden="true"/> : <Play size={14} aria-hidden="true"/>}
        </button>}
      </div>}
      <span className="sr-only" role="status">{announcement}</span>
    </section>
  );
});
