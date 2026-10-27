import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ChefHat } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { HeartButton } from './HeartButton';
import { useRecipes } from '../../context/RecipeContext';
import { getRecipeDiet } from '../../utils/discover';

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

interface RecipeCardListRowProps {
  recipe: Recipe;
  index?: number;
  className?: string;
  onSelect?: (recipe: Recipe) => void;
}

/**
 * Zeilen-Karte für die Listenansicht des Entdeckers: Bild links (ca. 110 px),
 * rechts Titel (max. 2 Zeilen), Infozeile sowie Kalorien & Protein
 * (bewusst ohne Beschreibung). Herz-Button identisch zur Einheitskarte
 * (48/40/22/8px).
 */
export const RecipeCardListRow: React.FC<RecipeCardListRowProps> = ({ recipe, index, className, onSelect }) => {
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);
  const ratingText = formatRating(recipe);
  const diet = getRecipeDiet(recipe);
  const detailPath = `/recipes/${recipe.id}`;

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
      className={`group relative flex w-full h-full rounded-2xl border overflow-hidden transition-all duration-300 vc-card-stagger ${
        className
          ? className
          : isDisliked
          ? 'bg-card border-border opacity-70 hover:opacity-100'
          : 'bg-card border-border shadow-xs hover:border-accent/40 hover:shadow-md'
      }`}
    >
      {/* Bild links: quadratisch auf Mobile (110px), 4:3 auf grösseren Screens */}
      <div className="relative aspect-square sm:aspect-[4/3] w-[110px] sm:w-[132px] shrink-0 bg-surface overflow-hidden">
        <RecipeImage
          recipe={recipe}
          size="sm"
          imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
        />
        {/* Vegetarisch-Badge oben links (im Stil vom Tagesgericht) */}
        {diet === 'vegetarisch' && (
          <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center h-6 px-2 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-[10px] sm:text-[11px] font-bold shadow-xs pointer-events-none">
            Vegetarisch
          </span>
        )}
      </div>

      {/* Textbereich */}
      <div className="flex flex-col justify-between flex-1 min-w-0 py-2.5 pl-3 pr-12 sm:py-3 sm:pl-4 sm:pr-14">
        <h3 className="font-bold text-card-title leading-snug line-clamp-2 text-text-main group-hover:text-accent transition-colors">
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
              to={detailPath}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] rounded-sm"
            >
              {recipe.title}
            </Link>
          )}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-card-info font-medium leading-snug text-text-muted mt-auto pt-2">
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
          <span className="inline-flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            {DIFFICULTY_LABEL[recipe.difficulty]}
          </span>
        </div>
      </div>

      {/* Herz: identisches Maß wie auf der Einheitskarte */}
      <HeartButton
        id={`fav-btn-${recipe.id}`}
        variant="on-surface"
        isFavorite={isFavorite}
        onToggle={() => toggleFavorite(recipe.id)}
        ariaLabel={isFavorite ? `${recipe.title} aus Favoriten entfernen` : `${recipe.title} zu Favoriten hinzufügen`}
        className="absolute top-2 right-2 z-10"
      />
    </article>
  );
};

export const RecipeCardListRowMemo = React.memo(RecipeCardListRow);
export default RecipeCardListRowMemo;