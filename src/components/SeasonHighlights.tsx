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
      <div className="p-[var(--inset-card,16px)] rounded-3xl border border-season-autumn/30 bg-season-autumn-bg overflow-hidden relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-season-autumn shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <h2 id="season-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main truncate">{season.headline}</h2>
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
          className="flex gap-3 sm:gap-4 overflow-x-auto -mx-4 px-4 scroll-px-4 m-0 mt-3.5 pb-0 snap-x snap-mandatory scrollbar-none overscroll-x-contain list-none"
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