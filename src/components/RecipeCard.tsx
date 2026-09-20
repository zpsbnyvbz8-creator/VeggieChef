import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Flame, 
  Dumbbell, 
  Heart, 
  Copy, 
  Check, 
  ShoppingCart, 
  ChefHat,
  Plus,
  ThumbsDown,
  CalendarPlus
} from 'lucide-react';
import { Recipe } from '../types';
import { RecipeImage } from './RecipeImage';
import { generateRecipeIngredientsText } from '../utils/helpers';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useToast } from '../context/ToastContext';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (recipe: Recipe) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
  isDisliked?: boolean;
  onToggleDislike?: (recipeId: string) => void;
  onQuickAddShopping?: (recipe: Recipe) => void;
  onAddToMealPlan?: (recipe: Recipe) => void;
  onCopyFeedback?: (msg: string) => void;
}

const RecipeCardComponent: React.FC<RecipeCardProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const plannerCtx = usePlanner();
  const toastCtx = useToast();

  const recipe = props.recipe;
  const onSelect = props.onSelect || ((r: Recipe) => navigate(`/recipes/${r.id}`));
  const isFavorite = props.isFavorite !== undefined ? props.isFavorite : recipesCtx.favorites.includes(recipe.id);
  const onToggleFavorite = props.onToggleFavorite || recipesCtx.toggleFavorite;
  const isDisliked = props.isDisliked !== undefined ? props.isDisliked : recipesCtx.dislikedIds.includes(recipe.id);
  const onToggleDislike = props.onToggleDislike || recipesCtx.toggleDislike;
  const onQuickAddShopping = props.onQuickAddShopping || ((r: Recipe) => shoppingCtx.addToShoppingList(r, r.servings));
  const onAddToMealPlan = props.onAddToMealPlan || plannerCtx.addToMealPlan;
  const onCopyFeedback = props.onCopyFeedback || toastCtx.showToast;
  const [copied, setCopied] = useState(false);
  const [addedShopping, setAddedShopping] = useState(false);
  const [addedMealPlan, setAddedMealPlan] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateRecipeIngredientsText(recipe, recipe.servings);
    navigator.clipboard.writeText(text);
    setCopied(true);
    onCopyFeedback(`Zutaten für "${recipe.title}" kopiert!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShopping = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAddShopping(recipe);
    setAddedShopping(true);
    onCopyFeedback(`Zutaten für "${recipe.title}" zur Einkaufsliste hinzugefügt!`);
    setTimeout(() => setAddedShopping(false), 2000);
  };

  return (
    <div
      id={`recipe-card-${recipe.id}`}
      onClick={() => onSelect(recipe)}
      className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isDisliked
          ? 'border-rose-200/80 opacity-75 hover:opacity-100 shadow-2xs hover:shadow-sm'
          : 'border-[#ECEBE8] shadow-xs hover:border-[#4A7856]/40 hover:shadow-md'
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-[#FAF9F6]">
        <RecipeImage
          recipe={recipe}
          imgClassName="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
          alt={recipe.title}
        />
        
        {/* Top Badges Overlay */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-1 sm:gap-1.5 pointer-events-auto">
            {isDisliked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-semibold border border-rose-600 shadow-xs">
                <ThumbsDown className="w-2.5 h-2.5" /> Seltener anzeigen
              </span>
            ) : recipe.isVegan ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4A7856] text-white text-xs font-semibold border border-[#4A7856] shadow-xs">
                🌱 Vegan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/95 text-[#4A7856] text-xs font-semibold border border-[#ECEBE8] shadow-xs backdrop-blur-xs">
                🧀 Veggie
              </span>
            )}
          </div>

          {/* Action buttons: Dislike & Favorite (Icon-Buttons: Minimaler Klickbereich 44x44px w-11 h-11, Icon w-5 h-5) */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {onToggleDislike && (
              <button
                id={`dislike-btn-${recipe.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDislike(recipe.id);
                }}
                className={`w-11 h-11 rounded-full backdrop-blur-md shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 touch-manipulation cursor-pointer ${
                  isDisliked
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/95 text-stone-600 hover:text-rose-600 hover:bg-white'
                }`}
                title={isDisliked ? 'Dislike entfernen' : 'Seltener anzeigen (Dislike)'}
              >
                <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-white' : ''}`} />
              </button>
            )}

            {/* Favorite heart button */}
            <button
              id={`fav-btn-${recipe.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(recipe.id);
              }}
              className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md text-stone-600 hover:text-[#D35400] hover:bg-white shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 touch-manipulation cursor-pointer"
              title="Favorit umschalten"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cooking Time Overlay Badge */}
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/65 backdrop-blur-md text-white text-xs font-semibold">
          <Clock className="w-4 h-4 text-[#4A7856]" />
          <span>{recipe.totalTimeMinutes} Min.</span>
          <span className="text-white/60">•</span>
          <span>{recipe.difficulty}</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
              {recipe.category}
            </span>
          </div>

          <h3 className="font-semibold text-stone-800 text-base leading-snug line-clamp-2 group-hover:text-[#4A7856] transition-colors">
            {recipe.title}
          </h3>

          <p className="text-sm font-medium text-stone-500 line-clamp-2 mt-1 leading-relaxed">
            {recipe.subtitle}
          </p>
        </div>

        {/* Nutritional Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEBE8] text-xs">
          <div className="flex items-center gap-1.5 text-stone-800 bg-[#FAF9F6] border border-[#ECEBE8] px-2.5 py-1.5 rounded-lg font-medium">
            <Flame className="w-4 h-4 text-[#E67E22] shrink-0" />
            <span className="truncate"><strong>{recipe.nutrients.calories}</strong> kcal</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#4A7856] bg-[#F1F5F2] border border-[#ECEBE8] px-2.5 py-1.5 rounded-lg font-semibold">
            <Dumbbell className="w-4 h-4 text-[#4A7856] shrink-0" />
            <span className="truncate"><strong>{recipe.nutrients.protein}g</strong> Protein</span>
          </div>
        </div>

        {/* Quick Card Action Buttons (Min height 44px for reliable touch targets) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Wochenplan button */}
          {onAddToMealPlan && (
            <button
              id={`card-plan-btn-${recipe.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddToMealPlan(recipe);
                setAddedMealPlan(true);
                onCopyFeedback(`"${recipe.title}" in Wochenplaner eingetragen!`);
                setTimeout(() => setAddedMealPlan(false), 2000);
              }}
              className="flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold text-stone-800 bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:text-[#4A7856] transition-colors active:scale-95 touch-manipulation cursor-pointer"
              title="In Wochenplaner eintragen"
            >
              {addedMealPlan ? <Check className="w-4 h-4 text-[#4A7856]" /> : <CalendarPlus className="w-4 h-4 text-[#4A7856]" />}
              <span className="truncate">{addedMealPlan ? 'Geplant' : 'Planer'}</span>
            </button>
          )}

          {/* Copy ingredients button */}
          <button
            id={`card-copy-btn-${recipe.id}`}
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold text-stone-800 bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:text-[#4A7856] transition-colors active:scale-95 touch-manipulation cursor-pointer ${
              !onAddToMealPlan ? 'col-span-2' : ''
            }`}
            title="Zutaten schnell kopieren"
          >
            {copied ? <Check className="w-4 h-4 text-[#4A7856]" /> : <Copy className="w-4 h-4 text-stone-500" />}
            <span className="truncate">{copied ? 'Kopiert' : 'Kopieren'}</span>
          </button>

          {/* Shopping list button */}
          <button
            id={`card-shop-btn-${recipe.id}`}
            onClick={handleShopping}
            className="flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold text-[#4A7856] bg-[#F1F5F2] border border-[#ECEBE8] hover:bg-[#4A7856] hover:text-white transition-colors active:scale-95 touch-manipulation cursor-pointer"
            title="Zur Einkaufsliste"
          >
            {addedShopping ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            <span className="truncate">{addedShopping ? 'Hinzugefügt' : '+ Liste'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const RecipeCard = React.memo(RecipeCardComponent);
