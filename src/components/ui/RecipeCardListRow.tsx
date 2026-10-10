import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ChefHat, Heart, Flame, Dumbbell } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
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
}

/**
 * Zeilen-Karte für die Listenansicht des Entdeckers: Bild links (ca. 110 px),
 * rechts Titel (max. 2 Zeilen), Infozeile sowie Kalorien & Protein
 * (bewusst ohne Beschreibung). Herz-Button identisch zur Einheitskarte
 * (48/40/22/8px).
 */
export const RecipeCardListRow: React.FC<RecipeCardListRowProps> = ({ recipe }) => {
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);
  const ratingText = formatRating(recipe);
  const diet = getRecipeDiet(recipe);
  const detailPath = `/recipes/${recipe.id}`;

  return (
    <article
      id={`recipe-card-${recipe.id}`}
      className={`group relative flex w-full h-full bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDisliked
          ? 'border-border opacity-70 hover:opacity-100'
          : 'border-border shadow-xs hover:border-accent/40 hover:shadow-md'
      }`}
    >
      {/* Bild links: quadratisch auf Mobile (110px), 4:3 auf grösseren Screens */}
      <div className="relative aspect-square sm:aspect-[4/3] w-[110px] sm:w-[132px] shrink-0 bg-surface">
        <RecipeImage
          recipe={recipe}
          size="sm"
          imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
        />
      </div>

      {/* Textbereich */}
      <div className="flex flex-col flex-1 min-w-0 gap-1 py-3 pl-3 pr-12 sm:py-3.5 sm:pl-4 sm:pr-14">
        <h3 className="font-bold text-card-title leading-snug line-clamp-2 text-text-main group-hover:text-accent transition-colors">
          <Link
            to={detailPath}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] rounded-sm"
          >
            {recipe.title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-card-info font-medium leading-snug text-text-muted">
          {diet === 'vegetarisch' && <span>Vegetarisch</span>}
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

        <div className="mt-auto pt-1.5 flex items-center gap-3.5 text-xs font-semibold text-text-main">
          <span className="inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#E67E22]" aria-hidden="true" />
            {recipe.nutrients.calories} kcal
          </span>
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            {recipe.nutrients.protein} g Protein
          </span>
        </div>
      </div>

      {/* Herz: identisches Maß wie auf der Einheitskarte */}
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
        className="absolute top-2 right-2 z-10 w-12 h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90"
      >
        <span className="w-10 h-10 rounded-full bg-card/95 hover:bg-accent-tint border border-border shadow-sm flex items-center justify-center transition-colors">
          <Heart
            className={`w-[22px] h-[22px] transition-colors ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-text-muted'}`}
            aria-hidden="true"
          />
        </span>
      </button>
    </article>
  );
};

export const RecipeCardListRowMemo = React.memo(RecipeCardListRow);
export default RecipeCardListRowMemo;