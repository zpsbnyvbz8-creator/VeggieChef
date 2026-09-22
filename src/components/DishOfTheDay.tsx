import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, Flame, Dumbbell, Copy, ArrowRight, Check, Heart, ShoppingCart, ThumbsDown, CalendarPlus } from 'lucide-react';
import { Recipe } from '../types';
import { generateRecipeIngredientsText, safeCopyToClipboard } from '../utils/helpers';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useToast } from '../context/ToastContext';

interface DishOfTheDayProps {
  dish?: Recipe;
  recipe?: Recipe;
  onSelect?: (recipe: Recipe) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
  isDisliked?: boolean;
  onToggleDislike?: (recipeId: string) => void;
  onQuickAddShopping?: (recipe: Recipe) => void;
  onAddToMealPlan?: (recipe: Recipe) => void;
  onCopyFeedback?: (msg: string) => void;
}

const DishOfTheDayComponent: React.FC<DishOfTheDayProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const plannerCtx = usePlanner();
  const toastCtx = useToast();

  const currentDish = props.dish || props.recipe || recipesCtx.dishOfTheDay;
  const onSelect = props.onSelect || props.onSelectRecipe || ((r: Recipe) => navigate(`/recipes/${r.id}`));
  const isFavorite = props.isFavorite !== undefined ? props.isFavorite : (currentDish ? recipesCtx.favorites.includes(currentDish.id) : false);
  const onToggleFavorite = props.onToggleFavorite || recipesCtx.toggleFavorite;
  const isDisliked = props.isDisliked !== undefined ? props.isDisliked : (currentDish ? recipesCtx.dislikedIds.includes(currentDish.id) : false);
  const onToggleDislike = props.onToggleDislike || recipesCtx.toggleDislike;
  const onQuickAddShopping = props.onQuickAddShopping || ((r: Recipe) => shoppingCtx.addToShoppingList(r, r.servings));
  const onAddToMealPlan = props.onAddToMealPlan || plannerCtx.addToMealPlan;
  const onCopyFeedback = props.onCopyFeedback || toastCtx.showToast;
  const [copied, setCopied] = React.useState(false);
  const [addedShopping, setAddedShopping] = React.useState(false);

  const activeRecipe = currentDish;
  const handleSelect = onSelect;

  if (!activeRecipe) return null;

  const handleCopyIngredients = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateRecipeIngredientsText(activeRecipe, activeRecipe.servings);
    await safeCopyToClipboard(text);
    setCopied(true);
    onCopyFeedback('Zutatenliste für Tagesrezept in Zwischenablage kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShopping = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAddShopping) {
      onQuickAddShopping(activeRecipe);
      setAddedShopping(true);
      onCopyFeedback(`Zutaten für "${activeRecipe.title}" auf die Einkaufsliste gesetzt!`);
      setTimeout(() => setAddedShopping(false), 2000);
    }
  };

  const handleMealPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToMealPlan) {
      onAddToMealPlan(activeRecipe);
    }
  };

  const recipeImage = activeRecipe.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80';

  return (
    <div 
      id="dish-of-the-day-card"
      onClick={() => handleSelect?.(activeRecipe)}
      className="w-full h-[156px] sm:h-[168px] relative overflow-hidden rounded-2xl bg-white border border-[#ECEBE8] shadow-xs cursor-pointer group transition-all duration-200 hover:border-[#4A7856]/40 hover:shadow-sm"
    >
      <div className="flex flex-row items-stretch h-full w-full overflow-hidden">
        {/* Image - constant fixed proportion & height across all dishes */}
        <div className="w-36 xs:w-44 sm:w-52 md:w-60 lg:w-64 h-full shrink-0 relative overflow-hidden bg-[#FAF9F6]">
          <img
            src={recipeImage}
            alt={activeRecipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E67E22] text-white text-xs font-semibold border border-[#E67E22] shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Tagesrezept</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs ${
              activeRecipe.isVegan 
                ? 'bg-[#4A7856] text-white border-[#4A7856]' 
                : 'bg-white/95 text-[#4A7856] border-[#ECEBE8]'
            }`}>
              {activeRecipe.isVegan ? '🌱 Vegan' : '🧀 Veggie'}
            </span>
          </div>
        </div>

        {/* Right Content - fixed height layout with strict single-line text */}
        <div className="flex-1 h-full p-2.5 sm:p-3.5 flex flex-col justify-between overflow-hidden min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs text-[#7A7E7B]">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8] shrink-0">
                {activeRecipe.category}
              </span>
              <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-[#7A7E7B]" />
                  {activeRecipe.totalTimeMinutes}m
                </span>
                <span className="hidden xs:flex items-center gap-1 font-medium">
                  <Flame className="w-3 h-3 text-[#E67E22]" />
                  {activeRecipe.nutrients.calories} kcal
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#4A7856]">
                  <Dumbbell className="w-3 h-3 text-[#4A7856]" />
                  {activeRecipe.nutrients.protein}g Prot.
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-[#2D3E40] tracking-tight group-hover:text-[#4A7856] transition-colors truncate">
                {activeRecipe.title}
              </h2>
              <p className="text-[#7A7E7B] text-xs truncate mt-0.5">
                {activeRecipe.subtitle || `${activeRecipe.category} • ${activeRecipe.difficulty}`}
              </p>
            </div>
          </div>

          {/* Action Row - ergonomically sized and single line */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#ECEBE8] shrink-0 mt-auto">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden">
              <button
                id="dish-of-the-day-fav-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(activeRecipe.id);
                }}
                className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl border border-[#ECEBE8] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
                  isFavorite ? 'bg-[#FDF6F0] text-[#D35400]' : 'bg-white hover:bg-[#F1F5F2] text-[#7A7E7B]'
                }`}
                title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
              </button>

              {onToggleDislike && (
                <button
                  id="dish-of-the-day-dislike-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDislike(activeRecipe.id);
                  }}
                  className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl border border-[#ECEBE8] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
                    isDisliked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white hover:bg-[#F1F5F2] text-[#7A7E7B]'
                  }`}
                  title={isDisliked ? 'Nicht mehr ablehnen' : 'Gericht weniger oft anzeigen'}
                >
                  <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDisliked ? 'fill-red-600' : ''}`} />
                </button>
              )}

              {onAddToMealPlan && (
                <button
                  id="dish-of-the-day-plan-btn"
                  onClick={handleMealPlan}
                  className="h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer touch-manipulation active:scale-95 shrink-0"
                  title="In Wochenplaner eintragen"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-[#4A7856]" />
                  <span className="hidden sm:inline">Plan</span>
                </button>
              )}

              <button
                id="dish-of-the-day-copy-btn"
                onClick={handleCopyIngredients}
                className="hidden md:flex h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] transition-colors items-center gap-1 text-xs font-semibold cursor-pointer touch-manipulation active:scale-95 shrink-0"
                title="Kopieren"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#4A7856]" /> : <Copy className="w-3.5 h-3.5 text-[#7A7E7B]" />}
                <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
              </button>

              {onQuickAddShopping && (
                <button
                  id="dish-of-the-day-shopping-btn"
                  onClick={handleShopping}
                  className="h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer touch-manipulation active:scale-95 shrink-0"
                  title="Auf die Liste setzen"
                >
                  {addedShopping ? <Check className="w-3.5 h-3.5 text-[#4A7856]" /> : <ShoppingCart className="w-3.5 h-3.5 text-[#7A7E7B]" />}
                  <span className="hidden sm:inline">{addedShopping ? 'Auf Liste' : 'Liste'}</span>
                </button>
              )}
            </div>

            <button
              id="dish-of-the-day-view-btn"
              onClick={() => handleSelect?.(activeRecipe)}
              className="h-8 sm:h-8.5 flex items-center gap-1 px-2.5 sm:px-3 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Rezept öffnen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DishOfTheDay = React.memo(DishOfTheDayComponent);

