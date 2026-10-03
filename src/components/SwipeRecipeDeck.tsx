import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Heart, 
  X, 
  RotateCcw, 
  Info, 
  Clock, 
  Flame, 
  Dumbbell, 
  ChefHat, 
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import { Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

interface SwipeRecipeDeckProps {
  recipes: Recipe[];
  onSwitchToGrid?: () => void;
}

interface SwipeCardProps {
  recipe: Recipe;
  isFront: boolean;
  onSwipe: (direction: 'left' | 'right') => void;
  onOpenDetails: (recipe: Recipe) => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ recipe, isFront, onSwipe, onOpenDetails }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0]);

  // Stamp opacities
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-20, -120], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{
        x: isFront ? x : 0,
        rotate: isFront ? rotate : 0,
        opacity: isFront ? opacity : 1,
      }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isFront ? handleDragEnd : undefined}
      className={`absolute inset-0 w-full h-full rounded-3xl bg-white border border-[#ECEBE8] shadow-lg overflow-hidden flex flex-col select-none touch-pan-y cursor-grab active:cursor-grabbing ${
        !isFront ? 'pointer-events-none' : ''
      }`}
    >
      {/* Swipe Badges (Stamps) */}
      {isFront && (
        <>
          {/* LIKE Stamp (Right Drag) */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-6 left-6 z-30 pointer-events-none border-4 border-[#4A7856] text-[#4A7856] bg-white/90 backdrop-blur-xs font-black text-2xl sm:text-3xl px-4 py-1.5 rounded-2xl rotate-[-15deg] shadow-lg flex items-center gap-2"
          >
            <Heart className="w-7 h-7 fill-[#4A7856]" />
            <span>MERKEN</span>
          </motion.div>

          {/* SKIP Stamp (Left Drag) */}
          <motion.div
            style={{ opacity: skipOpacity }}
            className="absolute top-6 right-6 z-30 pointer-events-none border-4 border-rose-500 text-rose-500 bg-white/90 backdrop-blur-xs font-black text-2xl sm:text-3xl px-4 py-1.5 rounded-2xl rotate-[15deg] shadow-lg flex items-center gap-2"
          >
            <X className="w-7 h-7 stroke-[3]" />
            <span>WEITER</span>
          </motion.div>
        </>
      )}

      {/* Hero Image Section */}
      <div className="relative h-[48%] sm:h-[52%] w-full overflow-hidden bg-[#FAF9F6] shrink-0">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top Floating Tags */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
          <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D3E40] text-xs font-bold shadow-xs">
            {recipe.category}
          </span>
          <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-xs text-white text-xs font-semibold">
            {recipe.isVegan ? '🌱 100% Vegan' : '🧀 Vegetarisch'}
          </span>
        </div>

        {/* Bottom Floating Stats over Image */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs sm:text-sm font-semibold drop-shadow-sm z-10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-xs">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>{recipe.totalTimeMinutes} Min.</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-xs">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{recipe.nutrients.calories} kcal</span>
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-xs flex items-center gap-1">
            <ChefHat className="w-4 h-4 text-emerald-300" />
            <span>{recipe.difficulty}</span>
          </span>
        </div>
      </div>

      {/* Card Content & Details */}
      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2D3E40] tracking-tight leading-snug">
            {recipe.title}
          </h2>
          <p className="text-sm text-[#686E6A] mt-1 leading-relaxed line-clamp-2">
            {recipe.subtitle}
          </p>

          {/* Quick Ingredient Chips Preview */}
          <div className="mt-3">
            <span className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1.5">
              Wichtigste Zutaten:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#ECEBE8] text-xs font-medium text-[#2D3E40]"
                >
                  {ing.name}
                </span>
              ))}
              {recipe.ingredients.length > 4 && (
                <span className="px-2 py-1 rounded-lg bg-[#FAF9F6] text-xs text-[#686E6A] font-medium">
                  +{recipe.ingredients.length - 4} weitere
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nutritional Highlights & Tap-for-Details */}
        <div className="pt-3 border-t border-[#ECEBE8] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#686E6A]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#4A7856]">
              <Dumbbell className="w-3.5 h-3.5" />
              {recipe.nutrients.protein}g Protein
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#8C7A6B]">
              🌾 {recipe.nutrients.fiber}g Ballaststoffe
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(recipe);
            }}
            className="text-xs font-bold text-[#4A7856] hover:text-[#3D6447] flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#F1F5F2] transition-colors cursor-pointer"
          >
            <span>Details ansehen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const SwipeRecipeDeck: React.FC<SwipeRecipeDeckProps> = ({ recipes, onSwitchToGrid }) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, setCookingModeRecipe } = useRecipes();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ index: number; action: 'like' | 'skip' }[]>([]);

  const activeRecipe = recipes[currentIndex];
  const nextRecipe = recipes[currentIndex + 1];
  const thirdRecipe = recipes[currentIndex + 2];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!activeRecipe) return;

    if (direction === 'right') {
      // Like / Save
      if (!favorites.includes(activeRecipe.id)) {
        toggleFavorite(activeRecipe.id);
      }
      showToast(`❤️ "${activeRecipe.title}" in Favoriten gemerkt!`);
      setHistory((prev) => [...prev, { index: currentIndex, action: 'like' }]);
    } else {
      // Skip
      setHistory((prev) => [...prev, { index: currentIndex, action: 'skip' }]);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCurrentIndex(last.index);
    showToast('Vorheriges Rezept wiederhergestellt ↺');
  };

  const handleOpenDetails = (recipe: Recipe) => {
    navigate(`/recipes/${recipe.id}`);
  };

  const handleStartCooking = (recipe: Recipe) => {
    setCookingModeRecipe({ recipe, servings: recipe.servings || 2 });
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setHistory([]);
  };

  // Reached end of deck
  if (currentIndex >= recipes.length || recipes.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-6 bg-white rounded-3xl border border-[#ECEBE8] shadow-xs text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-20 h-20 rounded-3xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center text-4xl mx-auto shadow-inner">
          🎉
        </div>
        <div className="space-y-1.5">
          <h3 className="text-2xl font-bold text-[#2D3E40]">
            Alle Rezepte durchgestöbert!
          </h3>
          <p className="text-sm text-[#686E6A] leading-relaxed max-w-xs mx-auto">
            Du hast {recipes.length} Rezepte im Swipe-Modus erkundet. Schau dir deine Favoriten an oder beginne von vorne.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="w-full sm:w-auto h-12 min-h-[48px] px-6 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Von vorne beginnen</span>
          </button>

          {onSwitchToGrid && (
            <button
              type="button"
              onClick={onSwitchToGrid}
              className="w-full sm:w-auto h-12 min-h-[48px] px-5 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[#2D3E40] font-semibold text-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>Zum Grid-Modus ⊞</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center select-none pt-2 pb-6">
      {/* Swipe Progress & Hint */}
      <div className="w-full flex items-center justify-between text-xs font-semibold text-[#686E6A] mb-3 px-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#4A7856]" />
          Rezept {currentIndex + 1} von {recipes.length}
        </span>
        <span className="text-[#8C7A6B]">
          👉 Nach rechts: Merken • 👈 Nach links: Weiter
        </span>
      </div>

      {/* The 3D Stack Container */}
      <div className="relative w-full h-[520px] sm:h-[560px]">
        {/* Third Card in Stack (deepest) */}
        {thirdRecipe && (
          <div
            className="absolute inset-0 rounded-3xl bg-white border border-[#ECEBE8] shadow-sm transform scale-90 translate-y-6 opacity-40 pointer-events-none"
          />
        )}

        {/* Second Card in Stack (preview) */}
        {nextRecipe && (
          <div
            className="absolute inset-0 rounded-3xl bg-white border border-[#ECEBE8] shadow-md transform scale-95 translate-y-3 opacity-80 pointer-events-none overflow-hidden"
          >
            <img
              src={nextRecipe.image}
              alt=""
              className="w-full h-[50%] object-cover opacity-60"
            />
          </div>
        )}

        {/* Top Active Card */}
        <AnimatePresence>
          {activeRecipe && (
            <SwipeCard
              key={activeRecipe.id}
              recipe={activeRecipe}
              isFront={true}
              onSwipe={handleSwipe}
              onOpenDetails={handleOpenDetails}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Ergonomic Action Buttons Bar below Stack (48x48px touch targets) */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 px-4 w-full">
        {/* 1. Undo Button */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          className="w-12 h-12 min-h-[48px] rounded-2xl bg-white hover:bg-[#FAF9F6] border border-[#ECEBE8] text-[#686E6A] hover:text-[#2D3E40] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
          title="Letzten Swipe rückgängig machen"
          aria-label="Zurückspulen"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* 2. Skip / Dislike Button */}
        <button
          type="button"
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 min-h-[48px] rounded-2xl bg-white hover:bg-rose-50 border-2 border-rose-200 text-rose-500 hover:text-rose-600 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-90 cursor-pointer"
          title="Weiter / Überspringen"
          aria-label="Weiter wischen"
        >
          <X className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* 3. Info / Detail Button */}
        <button
          type="button"
          onClick={() => activeRecipe && handleOpenDetails(activeRecipe)}
          className="w-12 h-12 min-h-[48px] rounded-2xl bg-white hover:bg-[#FAF9F6] border border-[#ECEBE8] text-[#4A7856] flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
          title="Rezept-Details ansehen"
          aria-label="Details"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* 4. Like / Save Button */}
        <button
          type="button"
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 min-h-[48px] rounded-2xl bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-90 cursor-pointer"
          title="Merken / Favorit"
          aria-label="Merken wischen"
        >
          <Heart className="w-7 h-7 fill-white" />
        </button>

        {/* 5. Start Cooking Button */}
        <button
          type="button"
          onClick={() => activeRecipe && handleStartCooking(activeRecipe)}
          className="w-12 h-12 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
          title="Direkt Kochmodus starten"
          aria-label="Kochen"
        >
          <ChefHat className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
