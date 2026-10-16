import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionValueEvent, PanInfo } from 'motion/react';
import { X, RotateCcw, ChefHat, Bookmark, Clock, Star } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { CloseButton } from '../ui/CloseButton';
import { HeartButton } from '../ui/HeartButton';
import { RecipePickerModal } from '../RecipePickerModal';
import { useRecipes } from '../../context/RecipeContext';
import { useToast } from '../../context/ToastContext';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll';
import { getRecipeDiet, shuffle } from '../../utils/discover';

interface SwipeDiscoverOverlayProps {
  /** Candidate pool (usually the currently filtered recipes). */
  recipes: Recipe[];
  onClose: () => void;
}

const DECK_SIZE = 30;

type Direction = 1 | -1; // 1 = like/merken (right), -1 = skip/weiter (left)

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

// Modulspeicher für die zuletzt in einer Session gemerkten Rezepte (bleibt beim Schließen/Wiederöffnen erhalten)
let lastSessionSavedBackup: Recipe[] = [];

interface SwipeCardProps {
  recipe: Recipe;
  direction: Direction;
  onSwipe: (dir: Direction) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDragXChange?: (val: number) => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({
  recipe,
  direction,
  onSwipe,
  isFavorite,
  onToggleFavorite,
  onDragXChange,
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-8, 8]);

  useMotionValueEvent(x, 'change', (latest) => {
    onDragXChange?.(latest);
  });

  const likeOpacity = useTransform(x, (val) => {
    const width = cardRef.current?.offsetWidth || 360;
    const maxDist = width * 0.4;
    return Math.min(Math.max((val - 12) / (maxDist - 12), 0), 1);
  });

  const skipOpacity = useTransform(x, (val) => {
    const width = cardRef.current?.offsetWidth || 360;
    const maxDist = width * 0.4;
    return Math.min(Math.max((-val - 12) / (maxDist - 12), 0), 1);
  });

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const width = cardRef.current?.offsetWidth || 360;
    const threshold = width * 0.35;
    const velocityThreshold = 500; // 0.5 px/ms
    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      onSwipe(1);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      onSwipe(-1);
    }
  };

  const diet = getRecipeDiet(recipe);
  const ratingText = formatRating(recipe);

  return (
    <motion.article
      ref={cardRef}
      custom={direction}
      style={{ x, rotate }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={(dir: Direction) => {
        const width = cardRef.current?.offsetWidth || 360;
        return {
          x: dir * (width * 1.5),
          rotate: dir * 12,
          opacity: 0,
          transition: { duration: 0.28, ease: 'easeIn' },
        };
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      aria-label={`${recipe.title}. Nach rechts wischen zum Merken, nach links zum Überspringen.`}
      className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-lg overflow-hidden flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
    >
      {/* Overlay-Stamps */}
      {/* Rechts: Merken mit Bookmark-Icon */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-4 left-4 z-20 pointer-events-none -rotate-[8deg] flex items-center gap-2 px-3 py-1.5 rounded-xl border-[3px] border-accent bg-card/90 text-accent font-black text-lg tracking-wide shadow-xs"
      >
        <Bookmark className="w-5 h-5 fill-current" /> MERKEN
      </motion.div>

      {/* Links: Weiter mit X-Icon */}
      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-4 right-4 z-20 pointer-events-none rotate-[8deg] flex items-center gap-2 px-3 py-1.5 rounded-xl border-[3px] border-border text-text-main bg-card/90 font-black text-lg tracking-wide shadow-xs"
      >
        <X className="w-5 h-5 stroke-[3]" /> WEITER
      </motion.div>

      {/* Bild nimmt die freie Höhe */}
      <div className="flex-1 min-h-[140px] w-full relative overflow-hidden bg-surface">
        <RecipeImage
          recipe={recipe}
          size="hero"
          imgClassName="w-full h-full object-cover pointer-events-none"
          alt=""
        />

        {/* Vegetarisch-Badge oben links (im Stil vom Tagesgericht) */}
        {diet === 'vegetarisch' && (
          <span className="absolute top-2.5 left-2.5 z-20 inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs pointer-events-none">
            Vegetarisch
          </span>
        )}

        {/* Oben rechts auf dem Bild: Standard HeartButton */}
        <HeartButton
          variant="on-image"
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
          className="absolute top-2.5 right-2.5 z-20"
        />
      </div>

      {/* Textblock richtet sich nach dem Inhalt */}
      <div className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 bg-card">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-main line-clamp-1 sm:line-clamp-2 leading-snug">
          {recipe.title}
        </h2>

        {/* Standard-Infozeile wie auf der Main Page: Zeit · Bewertung (Anzahl) · Schwierigkeit, dezent Vegetarisch */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs sm:text-card-info font-medium text-text-muted">
          {diet === 'vegetarisch' && (
            <>
              <span>Vegetarisch</span>
              <span className="text-text-muted/50" aria-hidden="true">·</span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>{recipe.totalTimeMinutes} Min</span>
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
            <span>{DIFFICULTY_LABEL[recipe.difficulty] || recipe.difficulty}</span>
          </span>
        </div>

        {/* Beschreibung: 1 Zeile auf kleinen Bildschirmen */}
        {(recipe.subtitle || recipe.chefTip) && (
          <p className="line-clamp-1 text-xs text-text-muted">
            {recipe.subtitle || recipe.chefTip}
          </p>
        )}

        {/* Zutaten-Chips: kompakte Leiste */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="overflow-hidden flex flex-wrap gap-1 text-xs pt-0.5 max-h-[1.85rem]">
            {recipe.ingredients.slice(0, 5).map((ing, idx) => {
              const cleanName = ing.name.replace(/\s*\([^)]*\)/g, '').trim();
              return (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-medium text-text-main"
                >
                  {cleanName}
                </span>
              );
            })}
            {recipe.ingredients.length > 5 && (
              <span className="px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
                +{recipe.ingredients.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
};

/**
 * Full-screen "Swipen" mode (swipe deck).
 */
export const SwipeDiscoverOverlay: React.FC<SwipeDiscoverOverlayProps> = ({ recipes, onClose }) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, bookmarks, toggleBookmark, dislikedIds } = useRecipes();
  const { showToast } = useToast();
  useLockBodyScroll(true);

  const [deck, setDeck] = useState<Recipe[]>(() => buildDeck(recipes, dislikedIds));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [history, setHistory] = useState<{ id: string; liked: boolean }[]>([]);
  const [sessionSaved, setSessionSaved] = useState<Recipe[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeX = useMotionValue(0);

  const active = deck[index];
  const next = deck[index + 1];
  const finished = index >= deck.length;

  const nextScale = useTransform(activeX, [-250, 0, 250], [1, 0.96, 1]);
  const nextY = useTransform(activeX, [-250, 0, 250], [0, 8, 0]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Synchronize mobile status bar theme-color
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content');
    meta?.setAttribute('content', '#1c1917');
    return () => {
      if (prevTheme) meta?.setAttribute('content', prevTheme);
    };
  }, []);

  // Bilder der nächsten 2 Karten vorab laden
  useEffect(() => {
    const preload = (url?: string) => {
      if (url && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = url;
      }
    };
    const next1 = deck[index + 1];
    const next2 = deck[index + 2];
    if (next1) preload(next1.image || next1.activeCoverImage);
    if (next2) preload(next2.image || next2.activeCoverImage);
  }, [deck, index]);

  const handleClose = useCallback(() => {
    if (sessionSaved.length > 0) {
      lastSessionSavedBackup = [...sessionSaved];
    }
    setSessionSaved([]);
    onClose();
  }, [sessionSaved, onClose]);

  const requestClose = useCallback(() => {
    if (sessionSaved.length > 0) {
      setShowExitConfirm(true);
    } else {
      handleClose();
    }
  }, [sessionSaved.length, handleClose]);

  const confirmExitAndDiscard = useCallback(() => {
    lastSessionSavedBackup = [...sessionSaved];
    const count = sessionSaved.length;
    setSessionSaved([]);
    setShowExitConfirm(false);
    onClose();
    showToast(`${count} ${count === 1 ? 'Rezept' : 'Rezepte'} verworfen. Beim nächsten Swipen wiederherstellbar.`);
  }, [sessionSaved, onClose, showToast]);

  const swipe = useCallback(
    (dir: Direction) => {
      if (!active) return;
      if (dir === 1) {
        setSessionSaved((prev) => {
          if (prev.some((r) => r.id === active.id)) return prev;
          return [...prev, active];
        });
        showToast('In Session gemerkt');
      }
      setDirection(dir);
      setHistory((h) => [...h, { id: active.id, liked: dir === 1 }]);
      activeX.set(0);
      setIndex((i) => i + 1);
    },
    [active, showToast, activeX]
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    if (last.liked) {
      setSessionSaved((prev) => prev.filter((r) => r.id !== last.id));
    }
    setHistory((h) => h.slice(0, -1));
    setDirection(-1);
    activeX.set(0);
    setIndex((i) => Math.max(0, i - 1));
  }, [history, activeX]);

  const openDetails = useCallback(
    (recipe: Recipe) => {
      if (sessionSaved.length > 0) {
        lastSessionSavedBackup = [...sessionSaved];
      }
      onClose();
      navigate(`/recipes/${recipe.id}`);
    },
    [navigate, onClose, sessionSaved]
  );

  const restart = () => {
    if (sessionSaved.length > 0) {
      lastSessionSavedBackup = [...sessionSaved];
    }
    setDeck(buildDeck(recipes, dislikedIds));
    setIndex(0);
    setHistory([]);
    setSessionSaved([]);
    activeX.set(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showExitConfirm) {
        setShowExitConfirm(false);
      } else if (isSavedDrawerOpen) {
        setIsSavedDrawerOpen(false);
      } else {
        requestClose();
      }
    } else if (e.key === 'ArrowRight' && !finished && !isSavedDrawerOpen && !showExitConfirm) {
      swipe(1);
    } else if (e.key === 'ArrowLeft' && !finished && !isSavedDrawerOpen && !showExitConfirm) {
      swipe(-1);
    } else if (e.key === 'Enter' && active && !isSavedDrawerOpen && !showExitConfirm) {
      openDetails(active);
    } else if ((e.key === 'Backspace' || e.key.toLowerCase() === 'z') && history.length > 0 && !isSavedDrawerOpen && !showExitConfirm) {
      undo();
    }
  };

  const nextRatingText = next ? formatRating(next) : null;
  const nextDiet = next ? getRecipeDiet(next) : 'vegan';

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Swipen"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={requestClose}
      className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center sm:p-4 overscroll-contain select-none outline-hidden animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-[100dvh] sm:h-[min(720px,94vh)] sm:max-h-[760px] bg-card sm:border sm:border-border sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Kopf: Titel "Swipen" mit Fortschritt "X von Y", rechts CloseButton */}
        <header className="px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4 pb-2.5 bg-surface border-b border-border flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight text-text-main leading-tight">
              Swipen
            </h2>
            {!finished && (
              <p className="text-xs font-semibold text-text-muted mt-0.5">
                {index + 1} von {deck.length}
              </p>
            )}
          </div>
          <CloseButton onClick={requestClose} ariaLabel="Swipen beenden" size="md" />
        </header>

        {/* Fortschrittsbalken direkt unter dem Header */}
        {!finished && (
          <div className="h-1 bg-border/60 overflow-hidden shrink-0" aria-hidden="true">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${(index / Math.max(deck.length, 1)) * 100}%` }}
            />
          </div>
        )}

        {/* Stage */}
        <main className="flex-1 min-h-0 w-full p-3 sm:p-4 relative flex flex-col justify-center overflow-hidden">
          {finished ? (
            /* Leerzustand am Ende ("Alles durchgesehen") */
            <div className="m-auto text-center space-y-4 max-w-xs p-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-tint text-accent flex items-center justify-center">
                <Bookmark className="w-8 h-8 fill-current" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold text-text-main">
                  {deck.length === 0 ? 'Keine Rezepte zum Swipen' : 'Alles durchgesehen'}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {deck.length === 0
                    ? 'Passe deine Filter an, um neue Vorschläge zu erhalten.'
                    : `Du hast ${sessionSaved.length} Rezepte in dieser Session gemerkt.`}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-2">
                {sessionSaved.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsSavedDrawerOpen(true)}
                    className="h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer text-base"
                  >
                    <Bookmark className="w-4 h-4 fill-current" /> Gemerkte ansehen ({sessionSaved.length})
                  </button>
                )}
                {sessionSaved.length === 0 && lastSessionSavedBackup.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessionSaved([...lastSessionSavedBackup]);
                      setIsSavedDrawerOpen(true);
                    }}
                    className="h-12 min-h-[48px] rounded-xl bg-accent-tint border border-accent/20 hover:bg-accent-tint/80 text-accent font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
                  >
                    <RotateCcw className="w-4 h-4" /> Zuletzt Gemerkte wiederherstellen ({lastSessionSavedBackup.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={restart}
                  className="h-12 min-h-[48px] rounded-xl bg-card border border-border hover:bg-surface text-text-main font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
                >
                  <RotateCcw className="w-4 h-4" /> Von vorn
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  className="h-12 min-h-[48px] rounded-xl bg-card border border-border hover:bg-surface text-text-muted font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
                >
                  Swipen beenden
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 min-h-0 w-full h-full">
              {next && (
                <motion.div
                  aria-hidden="true"
                  style={{ scale: nextScale, y: nextY }}
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-md overflow-hidden flex flex-col pointer-events-none select-none"
                >
                  <div className="flex-1 min-h-[140px] w-full relative overflow-hidden bg-surface">
                    <RecipeImage
                      recipe={next}
                      size="hero"
                      imgClassName="w-full h-full object-cover opacity-80"
                      alt=""
                    />
                    {nextDiet === 'vegetarisch' && (
                      <span className="absolute top-2.5 left-2.5 z-20 inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs pointer-events-none">
                        Vegetarisch
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 opacity-80 bg-card">
                    <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-main line-clamp-1 sm:line-clamp-2 leading-snug">
                      {next.title}
                    </h3>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs sm:text-card-info font-medium text-text-muted">
                      {nextDiet === 'vegetarisch' && (
                        <>
                          <span>Vegetarisch</span>
                          <span className="text-text-muted/50" aria-hidden="true">·</span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>{next.totalTimeMinutes} Min</span>
                      </span>
                      {nextRatingText && (
                        <>
                          <span className="text-text-muted/50" aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" />
                            <span>{nextRatingText}</span>
                          </span>
                        </>
                      )}
                      <span className="text-text-muted/50" aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-text-muted" />
                        <span>{DIFFICULTY_LABEL[next.difficulty] || next.difficulty}</span>
                      </span>
                    </div>
                    {(next.subtitle || next.chefTip) && (
                      <p className="line-clamp-1 text-xs text-text-muted">
                        {next.subtitle || next.chefTip}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
              <AnimatePresence custom={direction} initial={false}>
                {active && (
                  <SwipeCard
                    key={active.id}
                    recipe={active}
                    direction={direction}
                    onSwipe={swipe}
                    isFavorite={favorites.includes(active.id)}
                    onToggleFavorite={() => toggleFavorite(active.id)}
                    onDragXChange={(val) => activeX.set(val)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* Buttons unter der Karte - fest verankert mit Safe Area */}
        {!finished && (
          <footer className="px-4 sm:px-5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3.5 bg-surface/90 backdrop-blur-xs border-t border-border shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {/* Button "Zurück" */}
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                aria-label="Letzte Aktion zurücknehmen"
                title="Zurück"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-border bg-card text-text-muted hover:text-text-main flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Button "Weiter" */}
              <button
                id="swipe-skip-btn"
                type="button"
                onClick={() => swipe(-1)}
                disabled={!active}
                aria-label="Weiter"
                title="Weiter"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-border bg-card text-text-main hover:bg-surface flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Button "Rezept ansehen" */}
              <button
                id="swipe-view-btn"
                type="button"
                onClick={() => active && openDetails(active)}
                disabled={!active}
                className="flex-1 h-11 min-h-[44px] px-3 sm:px-4 rounded-xl border border-border bg-card text-text-main font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-sm sm:text-base truncate"
              >
                <ChefHat className="w-4 h-4 text-text-muted shrink-0" />
                <span className="truncate">Rezept ansehen</span>
              </button>
            </div>

            {/* Primärer Button: "Gemerkte ansehen" */}
            <button
              id="swipe-saved-drawer-btn"
              type="button"
              onClick={() => setIsSavedDrawerOpen(true)}
              className="w-full h-11 min-h-[44px] bg-accent text-on-accent font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-accent-hover flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-sm sm:text-base"
            >
              <Bookmark className="w-4.5 h-4.5 fill-current shrink-0" />
              <span>Gemerkte ansehen ({sessionSaved.length})</span>
            </button>
          </footer>
        )}
      </div>

      {/* Globales RecipePickerModal für Gemerkte (statt alter Drawer) */}
      <RecipePickerModal
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        title="Merkliste"
        recipes={sessionSaved}
        onSelectRecipe={(recipe) => {
          setIsSavedDrawerOpen(false);
          openDetails(recipe);
        }}
        actionLabel="Rezept ansehen"
        actionIcon="eye"
      />

      {/* Bestätigungs-Dialog beim Schließen mit gemerkten Rezepten */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Swipen beenden bestätigen"
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-border flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-favorite/10 text-favorite flex items-center justify-center">
              <Bookmark className="w-7 h-7 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-text-main">
                Swipen beenden?
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Es werden <span className="font-bold text-text-main">{sessionSaved.length} {sessionSaved.length === 1 ? 'Rezept' : 'Rezepte'}</span> von deiner Merkliste verworfen. Du kannst sie beim nächsten Mal rückgängig machen.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setIsSavedDrawerOpen(true);
                }}
                className="w-full h-11 min-h-[44px] rounded-xl bg-accent text-on-accent font-bold text-sm shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Gemerkte erst ansehen ({sessionSaved.length})
              </button>
              <button
                type="button"
                onClick={confirmExitAndDiscard}
                className="w-full h-11 min-h-[44px] rounded-xl bg-surface hover:bg-border text-favorite font-semibold text-sm transition-colors cursor-pointer"
              >
                Trotzdem beenden & verwerfen
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full h-11 min-h-[44px] rounded-xl bg-transparent hover:bg-surface text-text-muted font-medium text-sm transition-colors cursor-pointer"
              >
                Weiterswipen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

/** Prefer recipes the user hasn't marked as disliked. */
function buildDeck(pool: Recipe[], dislikedIds: string[]): Recipe[] {
  const allowed = pool.filter((r) => !dislikedIds.includes(r.id));
  return shuffle(allowed).slice(0, DECK_SIZE);
}
