import React from 'react';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <article className={`flex flex-col w-full bg-white rounded-2xl border border-[#ECEBE8] overflow-hidden ${className}`}>
    <div className="relative aspect-[4/3] bg-[#F1F5F2] animate-pulse" />
    <div className="flex flex-col flex-1 p-3.5 sm:p-4">
      <div className="h-4 w-3/4 bg-[#F1F5F2] rounded animate-pulse" />
      <div className="mt-2 h-3 w-full bg-[#F1F5F2] rounded animate-pulse" />
      <div className="mt-2 h-3 w-1/2 bg-[#F1F5F2] rounded animate-pulse" />
    </div>
  </article>
);

export default SkeletonCard;