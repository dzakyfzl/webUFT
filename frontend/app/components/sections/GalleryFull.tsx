"use client";

import React, { useState, useEffect, useRef, memo } from 'react';
import { ScrollReveal } from '../ScrollReveal';
import { GalleryCard } from '../GalleryCard';
import type { Koleksi } from '../types';

const BATCH_SIZE = 12;

/**
 * Memo'd batch of gallery cards. Once mounted, will not re-render
 * as long as items array ref, start, end, and onSelect ref stay the same.
 */
const GalleryBatch = memo(function GalleryBatch({
  items,
  start,
  end,
  onSelect,
}: {
  items: Koleksi[];
  start: number;
  end: number;
  onSelect: (item: Koleksi, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const slice = items.slice(start, Math.min(end, items.length));
  return (
    <>
      {slice.map((item) => (
        <ScrollReveal key={item.id}>
          <GalleryCard item={item} onSelect={onSelect} />
        </ScrollReveal>
      ))}
    </>
  );
});

type GalleryFullProps = {
  koleksiData: Koleksi[];
  isLoading: boolean;
  error: string | null;
  onSelect: (item: Koleksi, e: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Full gallery section with batch-based infinite scroll.
 * Renders items in batches of 12. As the user scrolls near the bottom,
 * a sentinel IntersectionObserver triggers loading the next batch.
 *
 * Already-rendered batches are wrapped in React.memo and will NOT re-render
 * when new batches are added.
 */
export const GalleryFull = memo(function GalleryFull({
  koleksiData,
  isLoading,
  error,
  onSelect,
}: GalleryFullProps) {
  const [batchCount, setBatchCount] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset batch count when data changes (e.g. fresh fetch)
  useEffect(() => {
    setBatchCount(1);
  }, [koleksiData]);

  // Infinite scroll sentinel observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || koleksiData.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBatchCount((prev) => {
            const maxBatches = Math.ceil(koleksiData.length / BATCH_SIZE);
            return prev < maxBatches ? prev + 1 : prev;
          });
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [koleksiData.length, batchCount]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="mb-4 break-inside-avoid animate-pulse">
            <div className="bg-stone-200" style={{ height: `${150 + (i % 3) * 80}px` }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-red-600">Gagal Memuat Galeri</p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 border border-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (koleksiData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-12 text-center">
        <p className="text-lg font-bold text-slate-950">Belum Ada Karya</p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">Galeri karya anggota akan ditampilkan di sini setelah diupload melalui dashboard admin.</p>
      </div>
    );
  }

  const totalVisible = batchCount * BATCH_SIZE;
  const hasMore = totalVisible < koleksiData.length;

  return (
    <div className="mx-auto max-w-6xl columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
      {Array.from({ length: batchCount }, (_, batchIndex) => (
        <GalleryBatch
          key={batchIndex}
          items={koleksiData}
          start={batchIndex * BATCH_SIZE}
          end={(batchIndex + 1) * BATCH_SIZE}
          onSelect={onSelect}
        />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="mb-4 flex w-full items-center justify-center break-inside-avoid py-6">
          <p className="text-sm text-slate-400">Memuat karya lainnya…</p>
        </div>
      )}
    </div>
  );
});
