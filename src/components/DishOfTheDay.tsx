import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, Flame, Dumbbell, ChefHat, ArrowRight, Heart } from 'lucide-react';
import { RecipeImage } from './RecipeImage';
import { RecipeActionMenu } from './discover/RecipeActionMenu';
import { useRecipes } from '../context/RecipeContext';

/**
 * "Tagesrezept" hero. Immersive photo card with a single primary CTA.
 * The whole hero is clickable via a decorative overlay link; interactive children sit above it.
 */
const DishOfTheDayComponent: React.FC = () => {
  const { dishOfTheDay: recipe, favorites, toggleFavorite } = useRecipes();
  if (!recipe) return null;

  const isFavorite = favorites.includes(recipe.id);
  const detailPath = `/recipes/${recipe.id}`;

  return (
    <section aria-labelledby="dish-of-the-day-title" id="dish-of-the-day-card">
      <article className="group relative isolate overflow-hidden rounded-3xl bg-[#2D3E40] min-h-[340px] sm:min-h-[400px] lg:min-h-[440px] flex flex-col justify-end shadow-sm">
        {/* Photo */}
        <div className="absolute inset-0 -z-10">
          <RecipeImage
            recipe={recipe}
            size="hero"
            imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            alt=""
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#16211f]/90 via-[#16211f]/40 to-[#16211f]/5 sm:bg-gradient-to-r sm:from-[#16211f]/85 sm:via-[#16211f]/45 sm:to-transparent" />

        {/* Whole-hero click target (decorative duplicate of the CTA link) */}
        <Link to={detailPath} tabIndex={-1} aria-hidden="true" className="absolute inset-0 z-10" />

        {/* Top row: badges + favorite */}
        <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 z-20 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#E67E22] text-white text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Tagesrezept
            </span>
            {recipe.isVegan && (
              <span className="inline-flex items-center h-8 px-3 rounded-full bg-white/90 backdrop-blur-xs text-[#4A7856] text-xs font-bold">
                🌱 Vegan
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              id="dish-of-the-day-fav-btn"
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Tagesrezept aus Favoriten entfernen' : 'Tagesrezept zu Favoriten hinzufügen'}
              className="w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-white'}`} />
            </button>
            <RecipeActionMenu recipe={recipe} variant="glass" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 p-4 sm:p-8 lg:p-10 max-w-2xl pointer-events-none">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-200/90">{recipe.category}</p>
          <h2
            id="dish-of-the-day-title"
            className="mt-1.5 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight text-balance"
            style={{ color: '#ffffff' }}
          >
            {recipe.title}
          </h2>
          {recipe.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-white/80 leading-relaxed line-clamp-2">{recipe.subtitle}</p>
          )}

          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-white/95">
            <li className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-300" />
              {recipe.totalTimeMinutes} Min.
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-300" />
              {recipe.nutrients.calories} kcal
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-300" />
              {recipe.nutrients.protein} g Protein
            </li>
            <li className="hidden sm:inline-flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-white/70" />
              {recipe.difficulty}
            </li>
          </ul>

          <Link
            id="dish-of-the-day-view-btn"
            to={detailPath}
            className="pointer-events-auto mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-base shadow-md transition-all active:scale-95 w-full sm:w-auto"
          >
            Rezept ansehen
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </article>
    </section>
  );
};

export const DishOfTheDay = React.memo(DishOfTheDayComponent);
