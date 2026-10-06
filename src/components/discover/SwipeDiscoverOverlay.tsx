import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { X, Heart, RotateCcw, Clock, Flame, Dumbbell, ChefHat, Sparkles } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { useRecipes } from '../../context/RecipeContext';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll';
import { shuffle } from '../../utils/discover';

interface SwipeDiscoverOverlayProps {
  /** Candidate pool (usually the currently filtered recipes). */
  recipes: Recipe[];
  onClose: () => void;
}

const DECK_SIZE = 30;
const SWIPE_DISTANCE = 100;
const SWIPE_VELOCITY = 500;

type Direction = 1 | -1; // 1 = like (right), -1 = skip (left)

interface SwipeCardProps {
  recipe: Recipe;
  direction: Direction;
  onSwipe: (dir: Direction) => void;
  onOpen: (recipe: Recipe) => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ recipe, direction, onSwipe, onOpen }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 110], [0, 1]);
  const skipOpacity = useTransform(x, [-20, -110], [0, 1]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe(1);
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe(-1);
  };

  return (
    <motion.article
      custom={direction}
      style={{ x, rotate }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={(dir: Direction) => ({
        x: dir * 520,
        rotate: dir * 18,
        opacity: 0,
        transition: { duration: 0.28, ease: 'easeIn' },
      })}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      onTap={() => onOpen(recipe)}
      aria-label={`${recipe.title}. Tippen für Details, nach rechts wischen zum Merken, nach links zum Überspringen.`}
      className="absolute inset-0 rounded-3xl bg-white border border-[#ECEBE8] shadow-lg overflow-hidden flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
    >
      {/* Stamps */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-5 z-20 pointer-events-none -rotate-12 flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-[#4A7856] bg-white/90 text-[#4A7856] font-black text-xl"
      >
        <Heart className="w-5 h-5 fill-current" /> MERKEN
      </motion.div>
      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-5 right-5 z-20 pointer-events-none rotate-12 flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-[#C91C43] bg-white/90 text-[#C91C43] font-black text-xl"
      >
        <X className="w-5 h-5 stroke-[3]" /> WEITER
      </motion.div>

      <div className="relative flex-1 min-h-0 basis-3/5 bg-[#FAF9F6]">
        <RecipeImage recipe={recipe} size="hero" imgClassName="w-full h-full object-cover pointer-events-none" alt="" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="h-7 px-3 inline-flex items-center rounded-full bg-white/95 text-[#2D3E40] text-xs font-bold">
            {recipe.category}
          </span>
          {recipe.isVegan && (
            <span className="h-7 px-3 inline-flex items-center rounded-full bg-black/50 backdrop-blur-xs text-white text-xs font-bold">
              🌱 Vegan
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap gap-2 text-xs font-semibold text-white">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/50 backdrop-blur-xs">
            <Clock className="w-3.5 h-3.5 text-amber-300" /> {recipe.totalTimeMinutes} Min.
          </span>
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/50 backdrop-blur-xs">
            <Flame className="w-3.5 h-3.5 text-orange-300" /> {recipe.nutrients.calories} kcal
          </span>
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/50 backdrop-blur-xs">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-300" /> {recipe.nutrients.protein} g
          </span>
        </div>
      </div>

      <div className="basis-2/5 shrink-0 p-4 sm:p-5 flex flex-col gap-2 min-h-0 overflow-hidden">
        <h2 className="text-xl font-extrabold tracking-tight text-[#2D3E40] leading-snug line-clamp-2">{recipe.title}</h2>
        <p className="text-sm text-[#686E6A] line-clamp-2">{recipe.subtitle}</p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {recipe.ingredients.slice(0, 4).map((ing, idx) => (
            <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#ECEBE8] text-xs font-medium text-[#2D3E40]">
              {ing.name}
            </span>
          ))}
          {recipe.ingredients.length > 4 && (
            <span className="px-2 py-1 text-xs font-medium text-[#686E6A]">+{recipe.ingredients.length - 4}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
};

/**
 * Full-screen "Entdecken" mode (swipe deck). Opened on demand from the discovery page –
 * it is a mode with its own close button, not a view toggle competing with the grid.
 */
export const SwipeDiscoverOverlay: React.FC<SwipeDiscoverOverlayProps> = ({ recipes, onClose }) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, dislikedIds, setCookingModeRecipe, setCookingCurrentStep, setIsCookingMinimized } =
    useRecipes();
  useLockBodyScroll(true);

  const [deck, setDeck] = useState<Recipe[]>(() => buildDeck(recipes, favorites, dislikedIds));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [history, setHistory] = useState<{ id: string; liked: boolean; wasFavorite: boolean }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = deck[index];
  const next = deck[index + 1];
  const finished = index >= deck.length;

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const swipe = useCallback(
    (dir: Direction) => {
      if (!active) return;
      const wasFavorite = favorites.includes(active.id);
      if (dir === 1 && !wasFavorite) toggleFavorite(active.id);
      setDirection(dir);
      setHistory((h) => [...h, { id: active.id, liked: dir === 1, wasFavorite }]);
      setIndex((i) => i + 1);
    },
    [active, favorites, toggleFavorite]
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    // Revert favorite if this swipe added it
    if (last.liked && !last.wasFavorite) toggleFavorite(last.id);
    setHistory((h) => h.slice(0, -1));
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }, [history, toggleFavorite]);

  const openDetails = useCallback(
    (recipe: Recipe) => {
      onClose();
      navigate(`/recipes/${recipe.id}`);
    },
    [navigate, onClose]
  );

  const restart = () => {
    setDeck(buildDeck(recipes, favorites, dislikedIds));
    setIndex(0);
    setHistory([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowRight' && !finished) swipe(1);
    else if (e.key === 'ArrowLeft' && !finished) swipe(-1);
    else if (e.key === 'Enter' && active) openDetails(active);
    else if ((e.key === 'Backspace' || e.key.toLowerCase() === 'z') && history.length) undo();
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Rezepte entdecken"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] bg-[#FAF9F6] flex flex-col outline-hidden animate-in fade-in duration-200"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-[#2D3E40] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4A7856]" /> Entdecken
          </h2>
          {!finished && (
            <p className="text-xs font-semibold text-[#686E6A]">
              {index + 1} von {deck.length}
            </p>
          )}
        </div>
        <button
          id="swipe-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Entdecken beenden"
          className="w-11 h-11 rounded-full bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      {!finished && (
        <div className="px-3 sm:px-6" aria-hidden="true">
          <div className="max-w-md mx-auto h-1 rounded-full bg-[#ECEBE8] overflow-hidden">
            <div
              className="h-full bg-[#4A7856] transition-all duration-300"
              style={{ width: `${(index / Math.max(deck.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage */}
      <div className="flex-1 min-h-0 w-full max-w-md mx-auto px-4 py-4 flex flex-col">
        {finished ? (
          <div className="m-auto text-center space-y-5 max-w-xs">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#F1F5F2] text-4xl flex items-center justify-center">🎉</div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-extrabold text-[#2D3E40]">
                {deck.length === 0 ? 'Keine Rezepte zum Entdecken' : 'Alles durchgeschaut!'}
              </h3>
              <p className="text-sm text-[#686E6A] leading-relaxed">
                {deck.length === 0
                  ? 'Passe deine Filter an, um neue Vorschläge zu erhalten.'
                  : `Du hast ${history.filter((h) => h.liked).length} Rezepte gemerkt. Ab damit in die Favoriten oder noch eine Runde?`}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {deck.length > 0 && (
                <button
                  type="button"
                  onClick={restart}
                  className="h-12 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Neue Runde
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/favorites');
                }}
                className="h-12 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] font-bold transition-all active:scale-95 cursor-pointer"
              >
                Zu meinen Favoriten
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex-1 min-h-0">
              {next && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl bg-white border border-[#ECEBE8] shadow-md scale-[0.95] translate-y-3 overflow-hidden"
                >
                  <div className="h-3/5 w-full bg-[#F1F5F2]">
                    <RecipeImage recipe={next} size="hero" imgClassName="w-full h-full object-cover opacity-70" alt="" />
                  </div>
                </div>
              )}
              <AnimatePresence custom={direction} initial={false}>
                {active && (
                  <SwipeCard key={active.id} recipe={active} direction={direction} onSwipe={swipe} onOpen={openDetails} />
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-5 pt-5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                aria-label="Letzte Aktion rückgängig machen"
                className="w-12 h-12 rounded-full bg-white border border-[#ECEBE8] text-[#686E6A] hover:text-[#2D3E40] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                id="swipe-skip-btn"
                type="button"
                onClick={() => swipe(-1)}
                aria-label="Überspringen"
                className="w-16 h-16 rounded-full bg-white border-2 border-[#FECDD3] text-[#C91C43] hover:bg-[#FFF1F2] flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-90 cursor-pointer"
              >
                <X className="w-8 h-8 stroke-[2.5]" />
              </button>
              <button
                id="swipe-like-btn"
                type="button"
                onClick={() => swipe(1)}
                aria-label="Merken"
                className="w-16 h-16 rounded-full bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-90 cursor-pointer"
              >
                <Heart className="w-8 h-8 fill-white" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!active) return;
                  onClose();
                  setCookingCurrentStep(0);
                  setIsCookingMinimized(false);
                  setCookingModeRecipe({ recipe: active, servings: active.servings || 2 });
                }}
                aria-label="Kochmodus starten"
                className="w-12 h-12 rounded-full bg-white border border-[#ECEBE8] text-[#C86D3B] hover:bg-[#FDF6F0] flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
              >
                <ChefHat className="w-5 h-5" />
              </button>
            </div>
            <p className="hidden sm:block text-center text-xs text-[#686E6A] pb-1">
              ← überspringen · → merken · Enter für Details · Z rückgängig
            </p>
          </>
        )}
      </div>
    </div>
  );
};

/** Prefer recipes the user hasn't saved yet; never show disliked ones. */
function buildDeck(pool: Recipe[], favorites: string[], dislikedIds: string[]): Recipe[] {
  const allowed = pool.filter((r) => !dislikedIds.includes(r.id));
  const fresh = allowed.filter((r) => !favorites.includes(r.id));
  return shuffle(fresh.length >= 3 ? fresh : allowed).slice(0, DECK_SIZE);
}
