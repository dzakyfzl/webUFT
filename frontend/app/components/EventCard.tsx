"use client";

import Image from "next/image";
import Link from "next/link";
import type { Acara } from "./types";

type EventCardProps = {
  event: Acara;
  onSelect: (event: Acara) => void;
  className?: string;
  compact?: boolean;
  href?: string;
};

export function EventCard({ event, onSelect, className = "", compact = false, href }: EventCardProps) {
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <Image src={event.image} alt={event.title} fill className="object-cover transition-opacity duration-200 group-hover:opacity-90" unoptimized />
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "pt-2 sm:pt-3" : "pt-4"}`}>
        {event.status && <p className={`${compact ? "text-[10px] sm:text-xs" : "text-sm"} text-red-700`}>{event.status}</p>}
        <h3 className={`${compact ? "mt-1 line-clamp-2 text-xs leading-tight sm:text-sm" : "mt-1 text-xl leading-snug"} font-bold text-slate-950`}>{event.title}</h3>
        <p className={`${compact ? "mt-1 line-clamp-1 text-[10px] sm:text-xs" : "mt-2 text-sm"} text-slate-600`}>{event.waktu}</p>
        <p className={`${compact ? "line-clamp-1 text-[10px] sm:text-xs" : "mt-1 text-sm"} text-slate-600`}>{event.tempat}</p>
      </div>
    </>
  );

  return (
    <article className={`group min-w-0 ${compact ? "h-full w-full" : "w-[280px] shrink-0 sm:w-[320px] lg:w-[360px]"} ${className}`}>
      {href ? (
        <Link href={href} className="flex h-full w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4" aria-label={`Buka detail ${event.title}`}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => onSelect(event)} className="flex h-full w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4" aria-label={`Buka detail ${event.title}`}>
          {content}
        </button>
      )}
    </article>
  );
}
