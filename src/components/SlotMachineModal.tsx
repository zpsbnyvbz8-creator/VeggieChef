import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, ChefHat, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { RecipeImage } from './RecipeImage';
import { CloseButton } from './ui/CloseButton';
import { HeartButton } from './ui/HeartButton';
import { getRecipeDiet, hasAnyNarrowingFilter } from '../utils/discover';
import { motion } from 'motion/react';

interface SlotMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const SlotMachineModal: React.FC<SlotMachineModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    filteredRecipes,
    recipes,
    favorites,
    toggleFavorite,
    dislikedIds,
    filters,
    onlyVegan,
  } = useRecipes();

  useLockBodyScroll(isOpen);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [displayedRecipe, setDisplayedRecipe] = useState<Recipe | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // Pool: Alle Rezepte (bzw. filteredRecipes falls Filter aktiv sind, ohne dislikedIds)
  const isNarrowed = hasAnyNarrowingFilter(filters) || onlyVegan;
  const basePool = isNarrowed && filteredRecipes.length > 0 ? filteredRecipes : recipes;
  const nonDisliked = basePool.filter((r) => !dislikedIds.includes(r.id));
  const pool = nonDisliked.length > 0 ? nonDisliked : basePool;

  const poolRef = useRef<Recipe[]>(pool);
  poolRef.current = pool;

  // Merke die letzten 5 gezogenen Rezept-IDs
  const recentIdsRef = useRef<string[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const displayedRecipeRef = useRef<Recipe | null>(null);
  displayedRecipeRef.current = displayedRecipe;

  // Pick winning recipe
  const pickRecipe = useCallback((currentPool: Recipe[]): Recipe | null => {
    if (currentPool.length === 0) return null;
    if (currentPool.length === 1) return currentPool[0];

    const lastDrawnId = recentIdsRef.current[recentIdsRef.current.length - 1];

    let candidates: Recipe[];
    if (currentPool.length <= 5) {
      candidates = currentPool.filter((r) => r.id !== lastDrawnId);
    } else {
      candidates = currentPool.filter((r) => !recentIdsRef.current.includes(r.id));
    }

    if (candidates.length === 0) {
      candidates = currentPool.filter((r) => r.id !== lastDrawnId);
    }
    if (candidates.length === 0) {
      candidates = currentPool;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];

    recentIdsRef.current = [...recentIdsRef.current.slice(-4), chosen.id];
    return chosen;
  }, []);

  const triggerConfetti = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).__onConfetti) {
        (window as any).__onConfetti();
      }
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.65, x: 0.5 },
        colors: ['#4A7856', '#C86D3B', '#F8EAD3', '#2D3E40'],
        zIndex: 99999,
        disableForReducedMotion: true,
      });
    } catch {
      // ignore
    }
  }, []);

  // Reveal-Animation beim Öffnen und bei "Nochmal":
  // kurzes Durchwürfeln von 4–6 Rezepten (verlangsamend, Intervalle ca. 75ms → 95ms → 125ms → 165ms → 240ms, gesamt ca. 700ms)
  const pickAndShuffle = useCallback(() => {
    const currentPool = poolRef.current;
    if (currentPool.length === 0) return;

    clearTimers();

    const targetRecipe = pickRecipe(currentPool);
    if (!targetRecipe) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // prefers-reduced-motion: sofort das Ergebnis ohne Animation anzeigen
    if (prefersReducedMotion || currentPool.length <= 1) {
      setDisplayedRecipe(targetRecipe);
      setIsShuffling(false);
      triggerConfetti();
      return;
    }

    setIsShuffling(true);

    const pickDummy = (excludeId?: string) => {
      const candidates =
        currentPool.length > 1 && excludeId
          ? currentPool.filter((r) => r.id !== excludeId)
          : currentPool;
      return candidates[Math.floor(Math.random() * candidates.length)];
    };

    let prevDummy = displayedRecipeRef.current?.id;
    const firstDummy = pickDummy(prevDummy);
    setDisplayedRecipe(firstDummy);
    prevDummy = firstDummy.id;

    // Intervalle: 75ms → 95ms → 125ms → 165ms → 240ms (gesamt ca. 700ms)
    const intervals = [75, 95, 125, 165, 240];
    let accumulatedTime = 0;

    for (let i = 0; i < intervals.length; i++) {
      accumulatedTime += intervals[i];
      const isLast = i === intervals.length - 1;

      const timerId = window.setTimeout(() => {
        if (isLast) {
          setDisplayedRecipe(targetRecipe);
          setIsShuffling(false);
          triggerConfetti();
        } else {
          const nextDummy = pickDummy(prevDummy);
          prevDummy = nextDummy.id;
          setDisplayedRecipe(nextDummy);
        }
      }, accumulatedTime);

      timeoutsRef.current.push(timerId);
    }
  }, [clearTimers, pickRecipe, triggerConfetti]);

  // Dialog sync
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        try {
          dialog.showModal();
        } catch {
          // ignore
        }
      }
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') {
        try {
          dialog.close();
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen]);

  // Trigger shuffle on modal open & cleanup on close/unmount
  useEffect(() => {
    if (isOpen) {
      pickAndShuffle();
    }
    return () => {
      clearTimers();
      setIsShuffling(false);
    };
  }, [isOpen, pickAndShuffle, clearTimers]);

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      onClose();
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
    }, 180);
  }, [isClosing, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Synchronize mobile status bar theme-color
  useEffect(() => {
    if (!isOpen) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content');
    meta?.setAttribute('content', '#1c1917');
    return () => {
      if (prevTheme) meta?.setAttribute('content', prevTheme);
    };
  }, [isOpen]);

  const isFavorite = displayedRecipe ? favorites.includes(displayedRecipe.id) : false;
  const ratingText = displayedRecipe ? formatRating(displayedRecipe) : null;
  const diet = displayedRecipe ? getRecipeDiet(displayedRecipe) : 'vegan';

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-modal-title"
      onClick={handleClose}
      className={`fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overscroll-contain transition-opacity duration-200 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-card border border-border rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[min(90dvh,720px)] transition-transform duration-200 ${
          isClosing ? 'scale-95' : 'scale-100'
        }`}
      >
        {/* Header with Title & 48px CloseButton */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 bg-surface border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-season-autumn-bg text-season-autumn flex items-center justify-center shrink-0">
              <Shuffle className="w-5 h-5" />
            </div>
            <h2 id="slot-modal-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-text-main">
              Überrasch mich
            </h2>
          </div>
          <CloseButton onClick={handleClose} ariaLabel="Schließen" size="md" />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 w-full p-4 sm:p-6 flex flex-col gap-3.5 overflow-y-auto">
          {displayedRecipe ? (
            <motion.div
              key={displayedRecipe.id}
              initial={{ opacity: 0.5, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-3 min-h-0"
            >
              {/* Bild 16:9 mit HeartButton */}
              <div className="relative aspect-[16/9] max-h-[190px] sm:max-h-[220px] w-full rounded-2xl overflow-hidden bg-surface shrink-0">
                <RecipeImage
                  recipe={displayedRecipe}
                  size="lg"
                  imgClassName="w-full h-full object-cover"
                  alt={displayedRecipe.title}
                />
                {/* Vegetarisch-Badge oben links (im Stil vom Tagesgericht) */}
                {diet === 'vegetarisch' && (
                  <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs pointer-events-none">
                    Vegetarisch
                  </span>
                )}
                <HeartButton
                  id={`fav-btn-slot-${displayedRecipe.id}`}
                  variant="on-image"
                  isFavorite={isFavorite}
                  onToggle={() => {
                    if (!isShuffling) toggleFavorite(displayedRecipe.id);
                  }}
                  ariaLabel={
                    isFavorite
                      ? `${displayedRecipe.title} aus Favoriten entfernen`
                      : `${displayedRecipe.title} zu Favoriten hinzufügen`
                  }
                  className="absolute top-2.5 right-2.5 z-10"
                />
              </div>

              {/* Titel */}
              <h3 className="text-lg sm:text-xl font-extrabold text-text-main line-clamp-2 leading-snug">
                {displayedRecipe.title}
              </h3>

              {/* Standard-Infozeile: Zeit · Bewertung (Anzahl) · Schwierigkeit, dezent Vegetarisch */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-card-info font-medium text-text-muted">
                {diet === 'vegetarisch' && (
                  <>
                    <span>Vegetarisch</span>
                    <span className="text-text-muted/50" aria-hidden="true">·</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>{displayedRecipe.totalTimeMinutes} Min</span>
                </span>
                {ratingText && (
                  <>
                    <span className="text-text-muted/50" aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" />
                      <span>{ratingText}</span>
                    </span>
                  </>
                )}
                <span className="text-text-muted/50" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <ChefHat className="w-3.5 h-3.5 text-text-muted" />
                  <span>{DIFFICULTY_LABEL[displayedRecipe.difficulty] || displayedRecipe.difficulty}</span>
                </span>
              </div>

              {/* Beschreibung (subtitle) max. 2 Zeilen */}
              {displayedRecipe.subtitle && (
                <p className="text-xs sm:text-sm text-text-muted line-clamp-2 leading-relaxed">
                  {displayedRecipe.subtitle}
                </p>
              )}

              {/* Zutaten-Chips */}
              {displayedRecipe.ingredients && displayedRecipe.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs pt-0.5 overflow-hidden max-h-[3.8rem]">
                  {displayedRecipe.ingredients.slice(0, 6).map((ing, idx) => {
                    const cleanName = ing.name.replace(/\s*\([^)]*\)/g, '').trim();
                    return (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-text-main"
                      >
                        {cleanName}
                      </span>
                    );
                  })}
                  {displayedRecipe.ingredients.length > 6 && (
                    <span className="px-2 py-1 text-xs font-medium text-text-muted">
                      +{displayedRecipe.ingredients.length - 6}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted m-auto">
              <p className="text-base font-semibold">Keine passenden Rezepte gefunden</p>
            </div>
          )}
        </main>

        {/* Footer Buttons pinned securely at bottom (>= 48px hit area) */}
        <footer className="px-4 sm:px-6 py-3 sm:py-4 bg-surface/90 backdrop-blur-xs border-t border-border flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isShuffling || !displayedRecipe}
            onClick={() => {
              if (isShuffling || !displayedRecipe) return;
              handleClose();
              navigate(`/recipes/${displayedRecipe.id}`);
            }}
            className="flex-1 h-12 bg-accent hover:bg-accent-hover text-on-accent font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 text-base min-h-[48px]"
          >
            Rezept ansehen
          </button>

          <button
            type="button"
            disabled={isShuffling}
            onClick={() => {
              if (isShuffling) return;
              pickAndShuffle();
            }}
            className="h-12 px-5 bg-card border border-border hover:bg-surface font-semibold text-text-main flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 text-base min-h-[48px]"
          >
            <Shuffle className={`w-5 h-5 text-accent ${isShuffling ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Nochmal</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default SlotMachineModal;
