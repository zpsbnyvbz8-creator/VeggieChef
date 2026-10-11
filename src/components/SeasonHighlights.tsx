import React, { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Leaf } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeCardUnified } from './ui/RecipeCardUnified';
import { getSeasonInfo, getSeasonalRecipes } from '../utils/discover';

/**
 * Saisonales Karussell. Die Saison wird aus dem aktuellen Datum abgeleitet,
 * explizit markierte Rezepte kommen zuerst. Die Herbst-Variante läuft als
 * Karte (Punkt 6): warmes Hintergrund-Panel mit Blatt-Icon, das Karussell
 * reicht bis an die Kartenränder (negative Margin + overflow hidden).
 */
export const SeasonHighlights: React.FC = () => {
  const { recipes } = useRecipes();
  const scrollRef = useRef<HTMLUListElement>(null);

  const season = useMemo(() => getSeasonInfo(), []);
  const seasonal = useMemo(() => getSeasonalRecipes(recipes, season, 10), [recipes, season]);

  if (seasonal.length < 3) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="season-title" className="space-y-3">
      {/* Karte: Radius 24px, Saison-Hintergrund, 1px Rand, Karussell bis zum
          Rand (neg. Margin innerhalb von overflow-hidden). */}
      <div className="relative overflow-hidden rounded-3xl border border-season-autumn/30 bg-season-autumn-bg p-4">
        <Leaf
          className="absolute right-4 top-4 w-8 h-8 text-season-autumn shrink-0"
          strokeWidth={2}
          aria-hidden="true"
          style={{ transform: 'rotate(24deg)' }}
        />
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="season-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main flex items-center gap-2">
              <span aria-hidden="true">{season.emoji}</span>
              <span className="truncate">{season.headline}</span>
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Vorherige Saison-Rezepte"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card/60 border border-season-autumn/25 hover:border-season-autumn/50 hover:bg-card text-text-main flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-season-autumn-text" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Nächste Saison-Rezepte"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card/60 border border-season-autumn/25 hover:border-season-autumn/50 hover:bg-card text-text-main flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-season-autumn-text" aria-hidden="true" />
            </button>
          </div>
        </div>

        <ul
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-none overscroll-x-contain list-none mt-3"
          aria-label={`${season.headline} – Rezepte`}
        >
          {seasonal.map((recipe) => (
            <li key={recipe.id} className="snap-start shrink-0 w-[70%] sm:w-[280px] md:w-[300px] lg:w-[320px] flex">
              <RecipeCardUnified recipe={recipe} variant="compact" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};