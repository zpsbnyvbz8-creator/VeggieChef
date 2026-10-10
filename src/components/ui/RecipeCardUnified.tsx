import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Star, ChefHat } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { useRecipes } from '../../context/RecipeContext';

export type RecipeCardVariant = 'compact' | 'regular';

interface RecipeCardUnifiedProps {
  recipe: Recipe;
  variant?: RecipeCardVariant;
  className?: string;
  showDifficulty?: boolean;
}

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  Einfach: 'Einfach',
  Mittel: 'Mittel',
  Anspruchsvoll: 'Aufwendig',
};

const formatRating = (recipe: Recipe): string | null => {
  if (!recipe.rating || recipe.rating <= 0) return null;
  if (!recipe.reviewCount || recipe.reviewCount <= 0) return null;
  const value = recipe.rating.toFixed(1).replace('.', ',');
  return `${value} (${recipe.reviewCount})`;
};

export const RecipeCardUnified: React.FC<RecipeCardUnifiedProps> = ({
  recipe,
  variant = 'regular',
  className = '',
  showDifficulty = true,
}) => {
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);
  const ratingText = formatRating(recipe);

  const isCompact = variant === 'compact';

  return (
    <article
      id={`recipe-card-${recipe.id}`}
      className={`group relative flex flex-col w-full bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDisliked
          ? 'border-[#ECEBE8] opacity-70 hover:opacity-100'
          : 'border-[#ECEBE8] shadow-xs hover:border-[#4A7856]/40 hover:shadow-md'
      } ${className}`}
    >
      <div
        className={`relative overflow-hidden bg-[#FAF9F6] ${
          isCompact ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-[4/3]'
        }`}
      >
        <RecipeImage
          recipe={recipe}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
        />
        <button
          id={`fav-btn-${recipe.id}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(recipe.id);
          }}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `${recipe.title} aus Favoriten entfernen` : `${recipe.title} zu Favoriten hinzufügen`}
          className="absolute top-2 right-2 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90"
        >
          <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-white'}`} />
        </button>
      </div>

      <div className={`flex flex-col flex-1 ${isCompact ? 'p-3' : 'p-3.5 sm:p-4'}`}>
        <h3
          className={`font-bold text-[#2D3E40] leading-snug line-clamp-2 group-hover:text-[#4A7856] transition-colors ${
            isCompact ? 'text-sm' : 'text-base'
          }`}
        >
          <Link
            to={`/recipes/${recipe.id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-[#4A7856] focus-visible:outline-offset-[-2px] rounded-sm"
          >
            {recipe.title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#686E6A]">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#4A7856]" aria-hidden="true" />
            {recipe.totalTimeMinutes} Min
          </span>
          {ratingText && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" aria-hidden="true" />
              {ratingText}
            </span>
          )}
          {showDifficulty && (
            <span className="inline-flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-[#686E6A]" aria-hidden="true" />
              {DIFFICULTY_LABEL[recipe.difficulty]}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export const RecipeCardUnifiedMemo = React.memo(RecipeCardUnified);
export default RecipeCardUnifiedMemo;