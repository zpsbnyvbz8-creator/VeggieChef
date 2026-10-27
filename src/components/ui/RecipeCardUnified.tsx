import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ChefHat } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { HeartButton } from './HeartButton';
import { useRecipes } from '../../context/RecipeContext';
import { getRecipeDiet } from '../../utils/discover';

export type RecipeCardVariant = 'compact' | 'regular';

interface RecipeCardUnifiedProps {
  recipe: Recipe;
  variant?: RecipeCardVariant;
  className?: string;
  showDifficulty?: boolean;
  index?: number;
  onSelect?: (recipe: Recipe) => void;
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
  index,
  onSelect,
}) => {
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);
  const ratingText = formatRating(recipe);
  const diet = getRecipeDiet(recipe);

  const isCompact = variant === 'compact';

  const cardStyle: React.CSSProperties = {
    ...(index !== undefined && index < 10
      ? ({ viewTransitionName: `recipe-${recipe.id}` } as React.CSSProperties)
      : {}),
    ...(index !== undefined
      ? ({ '--card-index': index } as React.CSSProperties)
      : {}),
  };

  return (
    <article
      id={`recipe-card-${recipe.id}`}
      style={cardStyle}
      className={`group relative flex flex-col w-full h-full bg-card rounded-2xl border overflow-hidden transition-all duration-300 vc-card-stagger ${
        isDisliked
          ? 'border-border opacity-70 hover:opacity-100'
          : isCompact
            ? 'shadow-none border-border/80 hover:border-accent/30 hover:shadow-2xs'
            : 'border-border shadow-xs hover:border-accent/40 hover:shadow-md'
      } ${className}`}
    >
      <div className={`relative overflow-hidden bg-surface ${isCompact ? 'aspect-[3/2]' : 'aspect-[4/3]'}`}>
        <RecipeImage
          recipe={recipe}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
        />
        {/* Vegetarisch-Badge oben links (identisch aufgebaut wie der Badge vom Tagesgericht) */}
        {diet === 'vegetarisch' && (
          <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs pointer-events-none">
            Vegetarisch
          </span>
        )}
        {/* Herz: 48px Tippfläche, sichtbarer 40px-Kreis, Icon 22px, 8px Randabstand (überall gleich) */}
        <HeartButton
          id={`fav-btn-${recipe.id}`}
          variant="on-image"
          isFavorite={isFavorite}
          onToggle={() => toggleFavorite(recipe.id)}
          ariaLabel={isFavorite ? `${recipe.title} aus Favoriten entfernen` : `${recipe.title} zu Favoriten hinzufügen`}
          className="absolute top-2 right-2 z-10"
        />
      </div>

      <div className={`flex flex-col flex-1 ${isCompact ? 'p-3' : 'p-3.5 sm:p-4'}`}>
        <h3
          className={`font-bold text-text-main leading-snug line-clamp-2 text-card-title group-hover:text-accent transition-colors`}
        >
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(recipe)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] rounded-sm cursor-pointer"
            >
              {recipe.title}
            </button>
          ) : (
            <Link
              to={`/recipes/${recipe.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] rounded-sm"
            >
              {recipe.title}
            </Link>
          )}
        </h3>

        {/* Infozeile: bricht bei wenig Platz in 2 Zeilen um, Mindesthöhe hält alle Karten gleich hoch */}
        <div className="mt-auto pt-2.5 flex flex-wrap content-start items-start gap-x-2.5 gap-y-1 text-card-info font-medium leading-snug min-h-[2.65rem] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
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
              <ChefHat className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
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