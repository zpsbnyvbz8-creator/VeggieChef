import React from 'react';
import { SkeletonCard } from './SkeletonCard';

/** Shown while the explorer route chunk is loading (replaces an empty content area). */
export const ExplorerLoadingSkeleton: React.FC = () => (
  <div className="space-y-5 sm:space-y-7" aria-busy="true" aria-label="Rezepte werden geladen">
    <div className="space-y-2">
      <div className="h-3 w-32 rounded bg-[#F1F5F2] animate-pulse" />
      <div className="h-7 w-64 max-w-full rounded bg-[#F1F5F2] animate-pulse" />
    </div>
    <div className="h-12 w-full rounded-xl bg-white border border-[#ECEBE8] animate-pulse" />
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

export default ExplorerLoadingSkeleton;