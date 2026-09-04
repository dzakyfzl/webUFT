"use client";

import Image from "next/image";
import React from "react";
import type { Koleksi } from "./types";

type GalleryCardProps = {
  item: Koleksi;
  onSelect: (item: Koleksi, event: React.MouseEvent<HTMLButtonElement>) => void;
  featured?: boolean;
};

export function GalleryCard({ item, onSelect, featured = false }: GalleryCardProps) {
  return (
    <article className={`group ${featured ? "" : "mb-4 break-inside-avoid"}`}>
      <button
        type="button"
        onClick={(event) => onSelect(item, event)}
        className={`relative block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 ${featured ? "" : "overflow-hidden"}`}
        aria-label={`Lihat detail ${item.title}`}
      >
        <div data-koleksi-image className={`relative overflow-hidden bg-stone-100 ${featured ? "aspect-[5/4]" : ""}`}>
          {featured ? (
            <Image src={item.image} alt={`Karya foto ${item.title}`} fill className="object-cover transition-opacity duration-200 group-hover:opacity-90" unoptimized />
          ) : (
            <img src={item.image} alt={`Karya foto ${item.title}`} className="block h-auto w-full transition-opacity duration-200 group-hover:opacity-90" />
          )}
        </div>
        {featured ? (
          <div className="pt-3">
            <p className="text-sm text-slate-500">{item.category}</p>
            <h4 className="mt-1 text-lg font-bold text-slate-950">{item.title}</h4>
            <p className="mt-1 text-sm text-slate-600">{item.photographer}</p>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 translate-y-3 p-4 text-white opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <p className="text-sm text-stone-200">{item.category}</p>
              <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-stone-100">{item.photographer}</p>
            </div>
          </>
        )}
      </button>
    </article>
  );
}
