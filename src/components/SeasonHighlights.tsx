import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Flame } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeImage } from './RecipeImage';
import { getSeasonInfo, getSeasonalRecipes } from '../utils/discover';

/**
 * Seasonal carousel. Season is derived from the current date (not hard-coded),
 * recipes explicitly tagged for the season come first. Intentionally lightweight cards
 * (image + title + two facts) – no action buttons, tapping opens the recipe.
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
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="season-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2D3E40] flex items-center gap-2">
            <span aria-hidden="true">{season.emoji}</span>
            <span className="truncate">{season.headline}</span>
          </h2>
          <p className="text-sm text-[#686E6A] mt-0.5 line-clamp-1">{season.description}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Vorherige Saison-Rezepte"
            className="w-11 h-11 rounded-full bg-white border border-[#ECEBE8] hover:border-[#4A7856]/40 hover:bg-[#F1F5F2] text-[#2D3E40] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Nächste Saison-Rezepte"
            className="w-11 h-11 rounded-full bg-white border border-[#ECEBE8] hover:border-[#4A7856]/40 hover:bg-[#F1F5F2] text-[#2D3E40] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ul
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 snap-x snap-mandatory scrollbar-none overscroll-x-contain list-none"
        aria-label={`${season.headline} – Rezepte`}
      >
        {seasonal.map((recipe) => (
          <li key={recipe.id} className="snap-start shrink-0 w-[200px] sm:w-[240px]">
            <Link
              to={`/recipes/${recipe.id}`}
              className="group block rounded-2xl bg-white border border-[#ECEBE8] overflow-hidden shadow-xs hover:shadow-md hover:border-[#4A7856]/40 transition-all focus-visible:outline-2 focus-visible:outline-[#4A7856]"
            >
              <div className="relative aspect-[4/3] bg-[#FAF9F6] overflow-hidden">
                <RecipeImage
                  recipe={recipe}
                  size="sm"
                  imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt=""
                />
                {recipe.isVegan && (
                  <span className="absolute top-2 left-2 h-6 px-2 inline-flex items-center rounded-full bg-white/95 text-[#4A7856] text-[11px] font-bold">
                    🌱 Vegan
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-[#2D3E40] leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#4A7856] transition-colors">
                  {recipe.title}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#686E6A]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#4A7856]" />
                    {recipe.totalTimeMinutes} Min.
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#E67E22]" />
                    {recipe.nutrients.calories} kcal
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
