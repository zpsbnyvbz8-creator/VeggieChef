import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionValueEvent, PanInfo } from 'motion/react';
import { X, RotateCcw, ChefHat, Bookmark, Clock, Star } from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { CloseButton } from '../ui/CloseButton';
import { HeartButton } from '../ui/HeartButton';
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
      className="absolute inset-0 rounded-3xl bg-card border border-border shadow-lg overflow-hidden flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y"
    >
      {/* Overlay-Stamps */}
      {/* Rechts: Merken mit Bookmark-Icon */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-5 z-20 pointer-events-none -rotate-[8deg] flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-accent bg-card/90 text-accent font-black text-xl tracking-wide shadow-xs"
      >
        <Bookmark className="w-5 h-5 fill-current" /> MERKEN
      </motion.div>

      {/* Links: Weiter mit X-Icon */}
      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-5 right-5 z-20 pointer-events-none rotate-[8deg] flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-border text-text-main bg-card/90 font-black text-xl tracking-wide shadow-xs"
      >
        <X className="w-5 h-5 stroke-[3]" /> WEITER
      </motion.div>

      {/* Bild nimmt die freie Höhe */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-surface">
        <RecipeImage
          recipe={recipe}
          size="hero"
          imgClassName="w-full h-full object-cover pointer-events-none"
          alt=""
        />

        {/* Oben rechts auf dem Bild: Standard HeartButton */}
        <HeartButton
          variant="on-image"
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
          className="absolute top-2.5 right-2.5 z-20"
        />
      </div>

      {/* Textblock richtet sich nach dem Inhalt */}
      <div className="shrink-0 p-4 sm:p-5 flex flex-col gap-1.5">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main line-clamp-2">
          {recipe.title}
        </h2>

        {/* Standard-Infozeile wie auf der Main Page: Zeit · Bewertung (Anzahl) · Schwierigkeit, dezent Vegetarisch */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-card-info font-medium text-text-muted">
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

        {/* Beschreibung: line-clamp-2 text-sm text-text-muted */}
        <p className="line-clamp-2 text-sm text-text-muted">
          {recipe.subtitle || recipe.chefTip}
        </p>

        {/* Zutaten-Chips: alle Klammer-Inhalte entfernt */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="max-h-[4rem] overflow-hidden flex flex-wrap gap-1.5 text-xs pt-0.5">
            {recipe.ingredients.slice(0, 5).map((ing, idx) => {
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
            {recipe.ingredients.length > 5 && (
              <span className="px-2 py-1 text-xs font-medium text-text-muted">
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
      if (isSavedDrawerOpen) {
        setIsSavedDrawerOpen(false);
      } else {
        handleClose();
      }
    } else if (e.key === 'ArrowRight' && !finished && !isSavedDrawerOpen) {
      swipe(1);
    } else if (e.key === 'ArrowLeft' && !finished && !isSavedDrawerOpen) {
      swipe(-1);
    } else if (e.key === 'Enter' && active && !isSavedDrawerOpen) {
      openDetails(active);
    } else if ((e.key === 'Backspace' || e.key.toLowerCase() === 'z') && history.length > 0 && !isSavedDrawerOpen) {
      undo();
    }
  };

  const nextRatingText = next ? formatRating(next) : null;
  const nextDiet = next ? getRecipeDiet(next) : 'vegan';

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Swipen"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[60] bg-[var(--page)] flex flex-col w-full h-[100lvh] min-h-[-webkit-fill-available] overscroll-contain select-none pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-hidden"
    >
      {/* Kopf: Titel "Swipen" mit Fortschritt "X von Y", rechts CloseButton */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 pb-2">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-text-main">
            Swipen
          </h2>
          {!finished && (
            <p className="text-xs font-semibold text-text-muted">
              {index + 1} von {deck.length}
            </p>
          )}
        </div>
        <CloseButton onClick={handleClose} ariaLabel="Swipen beenden" />
      </header>

      {/* Fortschrittsbalken */}
      {!finished && (
        <div className="px-4 sm:px-6" aria-hidden="true">
          <div className="max-w-md mx-auto h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(index / Math.max(deck.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage */}
      <main className="flex-1 min-h-0 w-full max-w-md mx-auto px-4 py-3 flex flex-col">
        {finished ? (
          /* Leerzustand am Ende ("Alles durchgesehen") */
          <div className="m-auto text-center space-y-5 max-w-xs">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-tint text-accent flex items-center justify-center">
              <Bookmark className="w-8 h-8 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-extrabold text-text-main">
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
                  className="h-12 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
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
                  className="h-12 rounded-xl bg-accent-tint border border-accent/20 hover:bg-accent-tint/80 text-accent font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Zuletzt Gemerkte wiederherstellen ({lastSessionSavedBackup.length})
                </button>
              )}
              <button
                type="button"
                onClick={restart}
                className="h-12 rounded-xl bg-card border border-border hover:bg-surface text-text-main font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Von vorn
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-12 rounded-xl bg-card border border-border hover:bg-surface text-text-muted font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                Swipen beenden
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex-1 min-h-0">
              {next && (
                <motion.div
                  aria-hidden="true"
                  style={{ scale: nextScale, y: nextY }}
                  className="absolute inset-0 rounded-3xl bg-card border border-border shadow-md overflow-hidden flex flex-col pointer-events-none select-none"
                >
                  <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-surface">
                    <RecipeImage
                      recipe={next}
                      size="hero"
                      imgClassName="w-full h-full object-cover opacity-80"
                      alt=""
                    />
                  </div>
                  <div className="shrink-0 p-4 sm:p-5 flex flex-col gap-1.5 opacity-80">
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main line-clamp-2">
                      {next.title}
                    </h3>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-card-info font-medium text-text-muted">
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
                    <p className="line-clamp-2 text-sm text-text-muted">
                      {next.subtitle || next.chefTip}
                    </p>
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

            {/* Buttons unter der Karte */}
            <div className="flex flex-col gap-2 pt-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                {/* Button "Zurück" (↺, macht letzten Swipe rückgängig) */}
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

                {/* Button "Weiter" (✕, überspringt die Karte) */}
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

                {/* Button "Rezept ansehen" (öffnet Details des aktuellen Rezepts) */}
                <button
                  id="swipe-view-btn"
                  type="button"
                  onClick={() => active && openDetails(active)}
                  disabled={!active}
                  className="flex-1 h-11 px-4 rounded-xl border border-border bg-card text-text-main font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-sm sm:text-base truncate"
                >
                  <ChefHat className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="truncate">Rezept ansehen</span>
                </button>
              </div>

              {/* Primärer Button: "Gemerkte ansehen" mit Zähler sessionSaved.length */}
              <button
                id="swipe-saved-drawer-btn"
                type="button"
                onClick={() => setIsSavedDrawerOpen(true)}
                className="w-full h-11 min-h-[44px] bg-accent text-on-accent font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-accent-hover flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-sm sm:text-base"
              >
                <Bookmark className="w-4.5 h-4.5 fill-current shrink-0" />
                <span>Gemerkte ansehen ({sessionSaved.length})</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Session Gemerkte Drawer/Modal */}
      <AnimatePresence>
        {isSavedDrawerOpen && (
          <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSavedDrawerOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="In dieser Session gemerkte Rezepte"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface shrink-0">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2 truncate">
                    <Bookmark className="w-5 h-5 text-accent fill-current shrink-0" />
                    <span>In dieser Session gemerkt</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {sessionSaved.length} {sessionSaved.length === 1 ? 'Rezept' : 'Rezepte'} gesammelt
                  </p>
                </div>
                <CloseButton onClick={() => setIsSavedDrawerOpen(false)} ariaLabel="Schließen" />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[160px]">
                {sessionSaved.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-3">
                    <p className="text-sm text-text-muted">Noch keine Rezepte in dieser Session gemerkt.</p>
                    <p className="text-xs text-text-muted">Wische eine Karte nach rechts, um sie hier zu sammeln.</p>
                    {lastSessionSavedBackup.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSessionSaved([...lastSessionSavedBackup]);
                          }}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-accent-tint text-accent border border-accent/20 hover:bg-accent-tint/80 transition-colors cursor-pointer"
                        >
                          Zuletzt Gemerkte wiederherstellen ({lastSessionSavedBackup.length})
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  sessionSaved.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface border border-border hover:border-accent/30 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-card shrink-0">
                        <RecipeImage recipe={r} size="sm" imgClassName="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text-main truncate">{r.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent" /> {r.totalTimeMinutes} Min
                          </span>
                          {getRecipeDiet(r) === 'vegetarisch' && <span>· Vegetarisch</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSavedDrawerOpen(false);
                            openDetails(r);
                          }}
                          className="h-8 px-3 rounded-lg bg-accent text-on-accent text-xs font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                          Ansehen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSessionSaved((prev) => prev.filter((item) => item.id !== r.id));
                          }}
                          aria-label={`${r.title} entfernen`}
                          className="w-8 h-8 rounded-lg border border-border bg-card text-text-muted hover:text-favorite hover:border-favorite/30 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {sessionSaved.length > 0 && (
                <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      sessionSaved.forEach((r) => {
                        if (!bookmarks.includes(r.id)) {
                          toggleBookmark(r.id);
                        }
                      });
                      showToast(`${sessionSaved.length} Rezepte auf Merkliste übernommen`);
                    }}
                    className="flex-1 h-10 px-3 rounded-xl border border-accent/30 bg-card hover:bg-accent-tint text-accent font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>In Merkliste übernehmen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSavedDrawerOpen(false)}
                    className="h-10 px-4 rounded-xl bg-accent text-on-accent font-bold text-xs sm:text-sm hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    Fertig
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/** Prefer recipes the user hasn't marked as disliked. */
function buildDeck(pool: Recipe[], dislikedIds: string[]): Recipe[] {
  const allowed = pool.filter((r) => !dislikedIds.includes(r.id));
  return shuffle(allowed).slice(0, DECK_SIZE);
}
