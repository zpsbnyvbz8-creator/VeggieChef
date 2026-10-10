import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ChefHat, ArrowRight, Heart } from 'lucide-react';
import { RecipeImage } from './RecipeImage';
import { useRecipes } from '../context/RecipeContext';
import { getRecipeDiet } from '../utils/discover';

const DIFFICULTY_LABEL: Record<string, string> = {
  Einfach: 'Einfach',
  Mittel: 'Mittel',
  Anspruchsvoll: 'Aufwendig',
};

/**
 * "Tagesrezept" hero. Immersive photo card with a single primary CTA.
 * The whole hero is clickable via a decorative overlay link; interactive children sit above it.
 */
const DishOfTheDayComponent: React.FC = () => {
  const { dishOfTheDay: recipe, favorites, toggleFavorite } = useRecipes();
  if (!recipe) return null;

  const isFavorite = favorites.includes(recipe.id);
  const detailPath = `/recipes/${recipe.id}`;
  const hasRating = recipe.rating > 0 && recipe.reviewCount > 0;
  const diet = getRecipeDiet(recipe);

  return (
    <section aria-labelledby="dish-of-the-day-title" id="dish-of-the-day-card">
      <article className="group relative isolate overflow-hidden rounded-3xl bg-text-main min-h-[320px] sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-end shadow-sm">
        {/* Photo */}
        <div className="absolute inset-0 -z-10">
          <RecipeImage
            recipe={recipe}
            size="hero"
            imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            alt=""
          />
        </div>
        {/* Strong, bottom-weighted dark gradient for reliable white-text contrast */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

        {/* Whole-hero click target (decorative duplicate of the CTA link) */}
        <Link to={detailPath} tabIndex={-1} aria-hidden="true" className="absolute inset-0 z-10" />

        {/* Top row: badge + favorite */}
        <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 z-20 flex items-start justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs">
            Tagesrezept
          </span>
          <button
            id="dish-of-the-day-fav-btn"
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Tagesrezept aus Favoriten entfernen' : 'Tagesrezept zu Favoriten hinzufügen'}
            className="pointer-events-auto w-12 h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90"
          >
            <span className="w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-on-accent/10 flex items-center justify-center transition-colors">
              <Heart
                className={`w-[22px] h-[22px] ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-on-accent'}`}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="relative z-20 p-4 sm:p-8 lg:p-10 max-w-2xl">
          <h2
            id="dish-of-the-day-title"
            className="text-[clamp(1.5rem,1vw+1.25rem,2.5rem)] font-extrabold tracking-tight text-on-accent leading-tight text-balance line-clamp-2"
            style={{ color: '#ffffff' }}
          >
            {recipe.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-on-accent/95">
            {diet === 'vegetarisch' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/15 border border-on-accent/20 px-2.5 py-0.5 text-xs font-semibold text-on-accent/95">
                Vegetarisch
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-on-accent/80" aria-hidden="true" />
              {recipe.totalTimeMinutes} Min.
            </span>
            {hasRating && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#F2B33D] text-[#F2B33D]" aria-hidden="true" />
                {recipe.rating.toFixed(1).replace('.', ',')} ({recipe.reviewCount})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-on-accent/80" aria-hidden="true" />
              {DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
            </span>
          </div>

          <Link
            id="dish-of-the-day-view-btn"
            to={detailPath}
            className="pointer-events-auto mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-base shadow-md transition-all active:scale-95 w-full sm:w-auto min-h-[44px]"
          >
            Rezept ansehen
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </section>
  );
};

export const DishOfTheDay = React.memo(DishOfTheDayComponent);
