"use client";

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';

type Partner = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
};

type HeroCarouselProps = {
  partners: Partner[];
};

/**
 * Self-contained carousel with its own `highlightIndex` timer.
 * Isolates the 6-second interval from the rest of the page tree.
 */
export const HeroCarousel = memo(function HeroCarousel({ partners }: HeroCarouselProps) {
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (partners.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const carouselTimer = window.setInterval(() => {
      setHighlightIndex((current) => (current === partners.length - 1 ? 0 : current + 1));
    }, 6000);

    return () => window.clearInterval(carouselTimer);
  }, [partners.length]);

  if (partners.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center bg-stone-100 p-8 text-center gap-2">
        <p className="text-base font-semibold text-slate-700">Belum ada Poster yang tersedia</p>
        <p className="text-sm text-slate-500">Poster akan ditampilkan di sini.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[360px] overflow-hidden bg-stone-900 sm:min-h-[410px] md:min-h-[480px]">
      {partners.map((partner, index) => (
        <div
          key={partner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === highlightIndex ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={index !== highlightIndex}
        >
          <Image
            src={partner.image}
            alt={index === highlightIndex ? partner.title : ''}
            fill
            className="object-cover"
            priority={index === 0}
            unoptimized
          />
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-4 pb-12 pt-24 text-white sm:px-8 sm:pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200 sm:text-sm">{partners[highlightIndex].label}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[0.95] sm:text-6xl md:text-7xl">{partners[highlightIndex].title}</h1>
        <p className="mt-5 max-w-xl text-sm text-slate-100 sm:text-base">{partners[highlightIndex].description}</p>
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
        {partners.map((partner, index) => (
          <button
            key={partner.id}
            type="button"
            onClick={() => setHighlightIndex(index)}
            className={`h-2.5 w-2.5 rounded-full border border-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${index === highlightIndex ? 'bg-white' : 'bg-transparent hover:bg-white/60'}`}
            aria-label={`Tampilkan sorotan ${index + 1}: ${partner.title}`}
            aria-current={index === highlightIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
});
