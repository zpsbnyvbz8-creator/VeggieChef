import React from 'react';

interface RecipePlaceholderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

/**
 * Modern, text-free recipe placeholder banner and thumbnail.
 * Replaces generic gray blocks with a rich botanical culinary aesthetic:
 * - Velvety forest-sage gradient with warm apricot ambient lighting
 * - Subtle concentric culinary arcs eliminating empty space
 * - Large, prominent, modern chef-hat & botanical leaf emblem
 * - 100% text-free, clean, crisp vector rendering
 */
export const RecipePlaceholder: React.FC<RecipePlaceholderProps> = ({
  className = '',
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const isHero = size === 'hero';
  const isLg = size === 'lg';

  // Badge / Icon dimensions based on size
  const badgeSizeClass = isSm
    ? 'w-10 h-10 rounded-xl'
    : isHero
    ? 'w-28 h-28 sm:w-32 sm:h-32 rounded-3xl'
    : isLg
    ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl'
    : 'w-16 h-16 sm:w-18 sm:h-18 rounded-2xl';

  const iconSizeClass = isSm
    ? 'w-6 h-6'
    : isHero
    ? 'w-16 h-16 sm:w-18 sm:h-18'
    : isLg
    ? 'w-11 h-11 sm:w-12 sm:h-12'
    : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <div
      role="img"
      aria-label="Rezeptbild Platzhalter"
      className={`relative w-full h-full overflow-hidden select-none flex items-center justify-center bg-gradient-to-br from-[#1A2E22] via-[#243F30] to-[#142319] ${className}`}
    >
      {/* Ambient lighting glows: fresh botanical emerald & warm hearth apricot */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_35%_25%,rgba(74,120,86,0.45)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(200,109,59,0.22)_0%,transparent_55%)] pointer-events-none" />

      {/* Decorative concentric culinary rings & rays to enrich space with no text */}
      <svg
        className="absolute inset-0 w-full h-full stroke-white/[0.08] fill-none pointer-events-none"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="200" cy="150" r="135" strokeWidth="1" />
        <circle cx="200" cy="150" r="105" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="200" cy="150" r="75" strokeWidth="1" />
        <circle cx="200" cy="150" r="48" strokeWidth="0.8" strokeDasharray="2 4" />
        {/* Subtle diagonal culinary focal lines */}
        <line x1="80" y1="30" x2="140" y2="90" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="320" y1="270" x2="260" y2="210" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="320" y1="30" x2="260" y2="90" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="80" y1="270" x2="140" y2="210" strokeWidth="0.8" strokeOpacity="0.6" />
      </svg>

      {/* Center Emblem: Glassmorphic shield badge with Chef Hat & Botanical Leaf Logo */}
      <div
        className={`relative z-10 flex items-center justify-center bg-white/[0.10] backdrop-blur-md border border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-transform duration-300 ${badgeSizeClass}`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconSizeClass} drop-shadow-md`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vc-logo-grad" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="60%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <linearGradient id="vc-accent-grad" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#BBF7D0" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Chef Hat Puffs / Top Contours */}
          <path
            d="M20 32C16 32 13 28.5 13 24.5C13 20.5 16 17.5 20.5 17.5C21.2 17.5 21.8 17.6 22.4 17.8C23.6 13.3 27.5 10 32 10C36.5 10 40.4 13.3 41.6 17.8C42.2 17.6 42.8 17.5 43.5 17.5C48 17.5 51 20.5 51 24.5C51 28.5 48 32 44 32"
            stroke="url(#vc-logo-grad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Chef Hat Base Band */}
          <path
            d="M20 36H44C45.1 36 46 36.9 46 38V41C46 42.1 45.1 43 44 43H20C18.9 43 18 42.1 18 41V38C18 36.9 18.9 36 20 36Z"
            fill="url(#vc-logo-grad)"
            fillOpacity="0.18"
            stroke="url(#vc-logo-grad)"
            strokeWidth="2.8"
          />

          {/* Elegant Botanical Leaf Sprout Blooming from Heart of Hat */}
          <path
            d="M32 23C32 23 27 27 27 32C27 34.5 29 36.5 32 36.5C35 36.5 37 34.5 37 32C37 27 32 23 32 23Z"
            fill="url(#vc-accent-grad)"
          />
          {/* Leaf Central Rib */}
          <path
            d="M32 26V36"
            stroke="#15803D"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Delicate Base Accent Dot */}
          <circle cx="32" cy="49" r="2.2" fill="url(#vc-logo-grad)" />
        </svg>
      </div>
    </div>
  );
};
