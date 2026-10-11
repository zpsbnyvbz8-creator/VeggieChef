import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionValueEvent, PanInfo } from 'motion/react';
import { X, RotateCcw, ChefHat, Bookmark } from 'lucide-react';
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
  const ratingStr = (recipe.rating || 4.8).toFixed(1).replace('.', ',');
  const reviewCountStr = recipe.reviewCount ?? 0;

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
      {/* Rechts: Merken mit Bookmark-Icon, Rahmen --accent, Text --accent, rotierter Winkel -8°, Deckkraft bis 40% der Kartenbreite */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-5 z-20 pointer-events-none -rotate-[8deg] flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-accent bg-card/90 text-accent font-black text-xl tracking-wide shadow-xs"
      >
        <Bookmark className="w-5 h-5 fill-current" /> MERKEN
      </motion.div>

      {/* Links: Weiter mit X-Icon, neutral (border-border text-text-main bg-card/90), rotierter Winkel +8°, Deckkraft bis 40% der Kartenbreite. KEINE rosa/rote Farbe! */}
      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-5 right-5 z-20 pointer-events-none rotate-[8deg] flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-[3px] border-border text-text-main bg-card/90 font-black text-xl tracking-wide shadow-xs"
      >
        <X className="w-5 h-5 stroke-[3]" /> WEITER
      </motion.div>

      {/* Bild nimmt die freie Höhe: flex-1 min-h-0 w-full relative overflow-hidden bg-surface */}
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

      {/* Textblock richtet sich nach dem Inhalt: shrink-0 p-4 sm:p-5 flex flex-col gap-1.5. KEIN starrer Leerraum! */}
      <div className="shrink-0 p-4 sm:p-5 flex flex-col gap-1.5">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main line-clamp-2">
          {recipe.title}
        </h2>

        {/* Standard-Infozeile & 'Vegetarisch'-Label nur wenn diet === 'vegetarisch' (kein Vegan-Badge) */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-text-muted">
          {diet === 'vegetarisch' && (
            <span className="px-2 py-0.5 rounded-full bg-accent-tint text-accent border border-accent/20 font-semibold text-[11px]">
              Vegetarisch
            </span>
          )}
          <span>
            ⏱ {recipe.totalTimeMinutes} Min · ★ {ratingStr} ({reviewCountStr}) · {recipe.difficulty}
          </span>
        </div>

        {/* Beschreibung: line-clamp-2 text-sm text-text-muted */}
        <p className="line-clamp-2 text-sm text-text-muted">
          {recipe.subtitle || recipe.chefTip}
        </p>

        {/* Zutaten-Chips: max. 2 Zeilen (max-h-[4rem] overflow-hidden flex flex-wrap gap-1.5 text-xs) mit +N */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="max-h-[4rem] overflow-hidden flex flex-wrap gap-1.5 text-xs pt-0.5">
            {recipe.ingredients.slice(0, 5).map((ing, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-text-main"
              >
                {ing.name}
              </span>
            ))}
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
 * Full-screen "Entdecken" mode (swipe deck).
 */
export const SwipeDiscoverOverlay: React.FC<SwipeDiscoverOverlayProps> = ({ recipes, onClose }) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, bookmarks, toggleBookmark, dislikedIds } = useRecipes();
  const { showToast } = useToast();
  useLockBodyScroll(true);

  const [deck, setDeck] = useState<Recipe[]>(() => buildDeck(recipes, bookmarks, dislikedIds));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [history, setHistory] = useState<{ id: string; liked: boolean; wasBookmarked: boolean }[]>([]);
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

  const swipe = useCallback(
    (dir: Direction) => {
      if (!active) return;
      const wasBookmarked = bookmarks.includes(active.id);
      if (dir === 1) {
        if (!wasBookmarked) {
          toggleBookmark(active.id);
        }
        showToast('Gemerkt');
      }
      setDirection(dir);
      setHistory((h) => [...h, { id: active.id, liked: dir === 1, wasBookmarked }]);
      activeX.set(0);
      setIndex((i) => i + 1);
    },
    [active, bookmarks, toggleBookmark, showToast, activeX]
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    if (last.liked && !last.wasBookmarked && bookmarks.includes(last.id)) {
      toggleBookmark(last.id);
    }
    setHistory((h) => h.slice(0, -1));
    setDirection(-1);
    activeX.set(0);
    setIndex((i) => Math.max(0, i - 1));
  }, [history, bookmarks, toggleBookmark, activeX]);

  const openDetails = useCallback(
    (recipe: Recipe) => {
      onClose();
      navigate(`/recipes/${recipe.id}`);
    },
    [navigate, onClose]
  );

  const restart = () => {
    setDeck(buildDeck(recipes, bookmarks, dislikedIds));
    setIndex(0);
    setHistory([]);
    activeX.set(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowRight' && !finished) {
      swipe(1);
    } else if (e.key === 'ArrowLeft' && !finished) {
      swipe(-1);
    } else if (e.key === 'Enter' && active) {
      openDetails(active);
    } else if ((e.key === 'Backspace' || e.key.toLowerCase() === 'z') && history.length > 0) {
      undo();
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Rezepte entdecken"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] bg-[var(--page)] flex flex-col w-full h-[100lvh] min-h-[-webkit-fill-available] overscroll-contain select-none pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-hidden animate-in fade-in duration-200"
    >
      {/* Kopf: Titel "Entdecken" (kein Sparkles-Emoji/Icon) mit Fortschritt "X von Y", rechts CloseButton */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 pb-2">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-text-main">
            Entdecken
          </h2>
          {!finished && (
            <p className="text-xs font-semibold text-text-muted">
              {index + 1} von {deck.length}
            </p>
          )}
        </div>
        <CloseButton onClick={onClose} ariaLabel="Entdecken beenden" />
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
                {deck.length === 0 ? 'Keine Rezepte zum Entdecken' : 'Alles durchgesehen'}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {deck.length === 0
                  ? 'Passe deine Filter an, um neue Vorschläge zu erhalten.'
                  : `Du hast ${history.filter((h) => h.liked).length} Rezepte auf deine Merkliste gesetzt.`}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={restart}
                className="h-12 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Von vorn
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/bookmarks');
                  onClose();
                }}
                className="h-12 rounded-xl bg-card border border-border hover:bg-accent-tint text-text-main font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                Zur Merkliste
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
                    <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-text-muted">
                      {getRecipeDiet(next) === 'vegetarisch' && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-tint text-accent border border-accent/20 font-semibold text-[11px]">
                          Vegetarisch
                        </span>
                      )}
                      <span>
                        ⏱ {next.totalTimeMinutes} Min · ★ {(next.rating || 4.8).toFixed(1).replace('.', ',')} ({next.reviewCount ?? 0}) · {next.difficulty}
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

            {/* Untere Buttons mit kleiner Beschriftung (12 px Text darunter) */}
            <div className="flex items-end justify-center gap-4 sm:gap-6 pt-3">
              {/* 1. Zurück: 44px Kreis (w-11 h-11), RotateCcw, nimmt letzte Aktion zurück, deaktiviert wenn history.length === 0. Text: "Zurück" (12px text-text-muted) */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={history.length === 0}
                  aria-label="Letzte Aktion zurücknehmen"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card border border-border text-text-muted hover:text-text-main disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-xs transition-all active:scale-90 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <span className="text-[12px] font-medium text-text-muted">Zurück</span>
              </div>

              {/* 2. Weiter: 52px Kreis (w-13 h-13), X, neutral umrandet (border border-border bg-card text-text-main hover:bg-surface active:scale-95). Text: "Weiter" (12px text-text-muted) */}
              <div className="flex flex-col items-center gap-1">
                <button
                  id="swipe-skip-btn"
                  type="button"
                  onClick={() => swipe(-1)}
                  disabled={!active}
                  aria-label="Weiter"
                  className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full border border-border bg-card text-text-main hover:bg-surface flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-[12px] font-medium text-text-muted">Weiter</span>
              </div>

              {/* 3. Merken: 60px Kreis (w-15 h-15), Bookmark (gefüllt), primär größer (bg-accent text-on-accent shadow-md hover:scale-105 active:scale-95). Text: "Merken" (12px font-bold text-accent). Schreibt in Merkliste! */}
              <div className="flex flex-col items-center gap-1">
                <button
                  id="swipe-bookmark-btn"
                  type="button"
                  onClick={() => swipe(1)}
                  disabled={!active}
                  aria-label="Merken"
                  className="w-15 h-15 min-w-[60px] min-h-[60px] rounded-full bg-accent text-on-accent shadow-md hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Bookmark className="w-7 h-7 fill-current" />
                </button>
                <span className="text-[12px] font-bold text-accent">Merken</span>
              </div>

              {/* 4. Ansehen: 44px Kreis (w-11 h-11), ChefHat, neutral (border border-border bg-card text-text-main hover:bg-accent-tint active:scale-95). Text: "Ansehen" (12px text-text-muted). Ruft openDetails(active) auf! */}
              <div className="flex flex-col items-center gap-1">
                <button
                  id="swipe-view-btn"
                  type="button"
                  onClick={() => active && openDetails(active)}
                  disabled={!active}
                  aria-label="Ansehen"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border bg-card text-text-main hover:bg-accent-tint flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChefHat className="w-5 h-5" />
                </button>
                <span className="text-[12px] font-medium text-text-muted">Ansehen</span>
              </div>
            </div>

            <p className="hidden sm:block text-center text-xs text-text-muted pt-2 pb-1">
              ← weiter · → merken · Enter zum Ansehen · Z zurück
            </p>
          </>
        )}
      </main>
    </div>
  );
};

/** Prefer recipes the user hasn't bookmarked yet; never show disliked ones. */
function buildDeck(pool: Recipe[], bookmarks: string[], dislikedIds: string[]): Recipe[] {
  const allowed = pool.filter((r) => !dislikedIds.includes(r.id));
  const fresh = allowed.filter((r) => !bookmarks.includes(r.id));
  return shuffle(fresh.length >= 3 ? fresh : allowed).slice(0, DECK_SIZE);
}
