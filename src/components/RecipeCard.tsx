import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Flame, Dumbbell, Heart, Star } from 'lucide-react';
import { Recipe } from '../types';
import { RecipeImage } from './RecipeImage';
import { RecipeActionMenu } from './discover/RecipeActionMenu';
import { useRecipes } from '../context/RecipeContext';

interface RecipeCardProps {
  recipe: Recipe;
}

/**
 * Discovery card. One primary tap target (open recipe), one quick action (favorite),
 * everything else lives in the overflow menu. Whole card is a real link via a stretched
 * anchor so it is keyboard- and screen-reader-accessible.
 */
const RecipeCardComponent: React.FC<RecipeCardProps> = ({ recipe }) => {
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);

  return (
    <article
      id={`recipe-card-${recipe.id}`}
      className={`group relative flex flex-col w-full bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDisliked
          ? 'border-border opacity-70 hover:opacity-100'
          : 'border-border shadow-xs hover:border-accent/40 hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-surface">
        <RecipeImage
          recipe={recipe}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {recipe.isVegan && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-card/95 backdrop-blur-xs text-accent text-xs font-bold shadow-2xs">
            🌱 Vegan
          </span>
        )}

        <button
          id={`fav-btn-${recipe.id}`}
          type="button"
          onClick={() => toggleFavorite(recipe.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `${recipe.title} aus Favoriten entfernen` : `${recipe.title} zu Favoriten hinzufügen`}
          className="absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-on-accent/10 flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90"
        >
          <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-on-accent'}`} />
        </button>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-black/55 backdrop-blur-md text-on-accent text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          {recipe.totalTimeMinutes} Min.
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wide text-accent truncate">{recipe.category}</span>
          {recipe.rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-text-muted shrink-0">
              <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" />
              {recipe.rating.toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="mt-1.5 font-bold text-text-main text-base leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          <Link
            to={`/recipes/${recipe.id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] rounded-sm"
          >
            {recipe.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-text-muted line-clamp-1">{recipe.subtitle}</p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-text-muted min-w-0">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Flame className="w-3.5 h-3.5 text-[#E67E22]" />
              {recipe.nutrients.calories}
              <span className="font-medium"> kcal</span>
            </span>
            <span className="inline-flex items-center gap-1 text-accent shrink-0">
              <Dumbbell className="w-3.5 h-3.5" />
              {recipe.nutrients.protein} g
            </span>
            <span className="hidden min-[400px]:inline truncate">{recipe.difficulty}</span>
          </div>
          <div className="relative z-10 -mr-2 -mb-1">
            <RecipeActionMenu recipe={recipe} />
          </div>
        </div>
      </div>
    </article>
  );
};

export const RecipeCard = React.memo(RecipeCardComponent);
