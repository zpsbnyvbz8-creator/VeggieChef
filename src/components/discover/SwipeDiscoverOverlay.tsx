import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  RotateCcw,
  ChefHat,
  Bookmark,
  Clock,
  Star,
  Check,
} from 'lucide-react';
import { Recipe } from '../../types';
import { useRecipes } from '../../context/RecipeContext';
import { useToast } from '../../context/ToastContext';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll';
import { getRecipeDiet, shuffle } from '../../utils/discover';
import { RecipeImage } from '../RecipeImage';
import { RecipePickerModal } from '../RecipePickerModal';
import { AtmosphericBackground } from './AtmosphericBackground';
import {
  InteractiveSwipeCard,
  SwipeDirection,
} from './InteractiveSwipeCard';

export interface SwipeDiscoverOverlayProps {
  /** Candidate pool (usually the currently filtered recipes or all recipes). */
  recipes: Recipe[];
  onClose: () => void;
  onSelectRecipe?: (recipe: Recipe) => void;
}

const DECK_SIZE = 30;
const EXIT_ANIMATION_MS = 360;

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

// Modulspeicher für die zuletzt in einer Session gemerkten Rezepte
let lastSessionSavedBackup: Recipe[] = [];

/** Prefer recipes the user hasn't marked as disliked. */
function buildDeck(pool: Recipe[], dislikedIds: string[]): Recipe[] {
  const allowed = pool.filter((r) => !dislikedIds.includes(r.id));
  const source = allowed.length > 0 ? allowed : pool;
  return shuffle(source).slice(0, DECK_SIZE);
}

/**
 * Vollbild-atmosphärischer „Swipen“-Modus für VeggieChef:
 * - Originales Rezeptkarten-Design mit originaler Merkliste (RecipePickerModal)
 * - Atmosphärischer, weichgezeichneter Hintergrund mit zeitversetztem Farbübergang
 * - Elastische Drag-Geste inkl. Wisch nach unten zum Schließen
 * - Keine versehentlichen Klick-Schließungen
 */
export const SwipeDiscoverOverlay: React.FC<SwipeDiscoverOverlayProps> = ({
  recipes,
  onClose,
  onSelectRecipe,
}) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, dislikedIds } = useRecipes();
  const { showToast } = useToast();
  useLockBodyScroll(true);

  const [deck, setDeck] = useState<Recipe[]>(() => buildDeck(recipes, dislikedIds));
  const [index, setIndex] = useState(0);
  const [hasSwipedOnce, setHasSwipedOnce] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [externalSwipeDir, setExternalSwipeDir] = useState<SwipeDirection | null>(null);

  const [history, setHistory] = useState<{ id: string; liked: boolean }[]>([]);
  const [sessionSaved, setSessionSaved] = useState<Recipe[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const active = deck[index];
  const next = deck[index + 1];
  const finished = index >= deck.length;

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsEntered(true);
    });
    containerRef.current?.focus();
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Synchronisiere mobile status bar theme-color
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content');
    meta?.setAttribute('content', '#141210');
    return () => {
      if (prevTheme) meta?.setAttribute('content', prevTheme);
    };
  }, []);

  // Bilder der nächsten 2 Karten vorab im Cache laden
  useEffect(() => {
    const preload = (url?: string) => {
      if (url && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = url;
      }
    };
    const next1 = deck[index + 1];
    const next2 = deck[index + 2];
    if (next1) preload(next1.activeCoverImage || next1.image);
    if (next2) preload(next2.activeCoverImage || next2.image);
  }, [deck, index]);

  const triggerFeedback = useCallback(
    (msg: string) => {
      setLocalFeedback(msg);
      showToast(msg);
      window.setTimeout(() => setLocalFeedback(null), 2000);
    },
    [showToast]
  );

  /**
   * 4. DAS SCHLIESSEN (Der Austritt):
   * Karte gleitet nach unten weg, der weichgezeichnete Hintergrund blendet aus.
   */
  const executeAnimatedClose = useCallback(
    (afterClose?: () => void) => {
      if (isClosing) return;
      setIsClosing(true);

      closeTimeoutRef.current = window.setTimeout(() => {
        if (afterClose) {
          afterClose();
        } else {
          onClose();
        }
      }, EXIT_ANIMATION_MS);
    },
    [isClosing, onClose]
  );

  const handleCloseImmediateOrAnimated = useCallback(() => {
    if (sessionSaved.length > 0) {
      lastSessionSavedBackup = [...sessionSaved];
    }
    setSessionSaved([]);
    executeAnimatedClose();
  }, [sessionSaved, executeAnimatedClose]);

  const requestClose = useCallback(() => {
    if (sessionSaved.length > 0) {
      setShowExitConfirm(true);
    } else {
      handleCloseImmediateOrAnimated();
    }
  }, [sessionSaved.length, handleCloseImmediateOrAnimated]);

  const confirmExitAndDiscard = useCallback(() => {
    lastSessionSavedBackup = [...sessionSaved];
    const count = sessionSaved.length;
    setSessionSaved([]);
    setShowExitConfirm(false);
    executeAnimatedClose(() => {
      onClose();
      showToast(
        `${count} ${count === 1 ? 'Rezept' : 'Rezepte'} verworfen. Beim nächsten Swipen wiederherstellbar.`
      );
    });
  }, [sessionSaved, executeAnimatedClose, onClose, showToast]);

  const commitSwipe = useCallback(
    (dir: SwipeDirection) => {
      if (!active || isClosing) return;
      setHasSwipedOnce(true);
      setExternalSwipeDir(null);
      setDragProgress(0);

      if (dir === 1) {
        setSessionSaved((prev) => {
          if (prev.some((r) => r.id === active.id)) return prev;
          return [...prev, active];
        });
        triggerFeedback('Auf Session-Merkliste gespeichert');
      }

      setHistory((h) => [...h, { id: active.id, liked: dir === 1 }]);
      setIndex((i) => i + 1);
    },
    [active, isClosing, triggerFeedback]
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last || isClosing) return;
    setHasSwipedOnce(true);
    setExternalSwipeDir(null);
    setDragProgress(0);

    if (last.liked) {
      setSessionSaved((prev) => prev.filter((r) => r.id !== last.id));
    }
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [history, isClosing]);

  const openDetails = useCallback(
    (recipe: Recipe) => {
      if (sessionSaved.length > 0) {
        lastSessionSavedBackup = [...sessionSaved];
      }
      executeAnimatedClose(() => {
        if (onSelectRecipe) {
          onSelectRecipe(recipe);
        } else {
          onClose();
          navigate(`/recipes/${recipe.id}`);
        }
      });
    },
    [onSelectRecipe, onClose, navigate, sessionSaved, executeAnimatedClose]
  );

  const restart = () => {
    if (sessionSaved.length > 0) {
      lastSessionSavedBackup = [...sessionSaved];
    }
    setHasSwipedOnce(false);
    setDeck(buildDeck(recipes, dislikedIds));
    setIndex(0);
    setHistory([]);
    setSessionSaved([]);
    setDragProgress(0);
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
    } else if (
      e.key === 'ArrowRight' &&
      !finished &&
      !isSavedDrawerOpen &&
      !showExitConfirm &&
      !externalSwipeDir
    ) {
      setExternalSwipeDir(1);
    } else if (
      e.key === 'ArrowLeft' &&
      !finished &&
      !isSavedDrawerOpen &&
      !showExitConfirm &&
      !externalSwipeDir
    ) {
      setExternalSwipeDir(-1);
    } else if (
      e.key === 'ArrowDown' &&
      !finished &&
      !isSavedDrawerOpen &&
      !showExitConfirm
    ) {
      requestClose();
    } else if (
      e.key === 'Enter' &&
      active &&
      !isSavedDrawerOpen &&
      !showExitConfirm
    ) {
      openDetails(active);
    } else if (
      (e.key === 'Backspace' || e.key.toLowerCase() === 'z') &&
      history.length > 0 &&
      !isSavedDrawerOpen &&
      !showExitConfirm
    ) {
      undo();
    }
  };

  // Hintergrundbild bleibt während des Ziehens starr auf `active` und wechselt erst nach dem Swipe-Commit
  const backgroundRecipe = active || deck[deck.length - 1] || recipes[0];
  const backgroundUrl =
    backgroundRecipe?.activeCoverImage || backgroundRecipe?.image || '';

  // Subtile Skalierung und Elevation der nächsten Karte im Stapel
  const nextCardScale = 0.94 + dragProgress * 0.06;
  const nextCardTranslateY = 14 * (1 - dragProgress);
  const nextCardOpacity = 0.62 + dragProgress * 0.35;
  const nextDiet = next ? getRecipeDiet(next) : 'vegan';
  const nextRatingText = next ? formatRating(next) : null;

  const overlayContent = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Entdecken-Modus: Rezepte swipen"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{
        opacity: isEntered && !isClosing ? 1 : 0,
        transition: isClosing
          ? `opacity ${EXIT_ANIMATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
          : 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className="fixed inset-0 z-[75] bg-[#141210] flex flex-col justify-between overflow-hidden overscroll-contain select-none outline-hidden"
    >
      {/* 1. ATMOSPHÄRISCHER HINTERGRUND */}
      <AtmosphericBackground
        imageUrl={backgroundUrl}
        hasSwipedOnce={hasSwipedOnce}
      />

      {/* Dezent schwebendes Feedback */}
      {localFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 border border-white/20 text-white text-xs font-bold tracking-wide backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-none"
        >
          <Check className="w-3.5 h-3.5 text-accent" />
          <span>{localFeedback}</span>
        </div>
      )}

      {/* 2. TOP HUD: Fortschrittsanzeige & filigranes Schließen-X (Mindest-Touch-Target 48x48px) */}
      <header
        style={{
          transform:
            isEntered && !isClosing
              ? 'translate3d(0, 0, 0)'
              : 'translate3d(0, -14px, 0)',
          opacity: isEntered && !isClosing ? 1 : 0,
          transition: 'transform 340ms ease-out, opacity 300ms ease-out',
        }}
        className="relative z-20 w-full max-w-[430px] mx-auto px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-3 shrink-0"
      >
        {!finished ? (
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/45 border border-white/15 backdrop-blur-md shadow-xs">
            <span className="text-xs font-bold tracking-wide text-white/95 tabular-nums">
              {index + 1}{' '}
              <span className="text-white/55 font-normal">von</span>{' '}
              {deck.length}
            </span>
            <div
              className="w-16 sm:w-20 h-1 rounded-full bg-white/20 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-white/90 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((index + 1) / Math.max(deck.length, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Filigranes Schließen-Symbol mit min 48x48px Klickfläche */}
        <button
          type="button"
          onClick={requestClose}
          aria-label="Entdecken-Modus schließen"
          title="Schließen (Esc oder Karte nach unten wischen)"
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/45 hover:bg-black/65 border border-white/25 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
        </button>
      </header>

      {/* 3. CENTER STAGE: Die Rezeptkarte im Fokus */}
      <main
        style={{
          transform: isClosing
            ? 'translate3d(0, 44vh, 0) scale(0.9)'
            : 'translate3d(0, 0, 0) scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease-out',
        }}
        className="relative z-10 flex-1 min-h-0 w-full max-w-[410px] sm:max-w-[430px] max-h-[620px] sm:max-h-[660px] mx-auto px-4 py-2 flex flex-col justify-center"
      >
        {finished ? (
          /* Leerzustand am Ende */
          <div className="m-auto w-full rounded-2xl sm:rounded-3xl bg-card text-text-main border border-border shadow-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-tint text-accent flex items-center justify-center">
              <Bookmark className="w-8 h-8 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-text-main">
                {deck.length === 0
                  ? 'Keine Rezepte zum Swipen'
                  : 'Alles durchgesehen'}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {deck.length === 0
                  ? 'Passe deine Filter an, um neue Vorschläge zu erhalten.'
                  : `Du hast ${sessionSaved.length} ${
                      sessionSaved.length === 1 ? 'Rezept' : 'Rezepte'
                    } in dieser Session gemerkt.`}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              {sessionSaved.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer text-base"
                >
                  <Bookmark className="w-4 h-4 fill-current" /> Gemerkte ansehen (
                  {sessionSaved.length})
                </button>
              )}
              {sessionSaved.length === 0 && lastSessionSavedBackup.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionSaved([...lastSessionSavedBackup]);
                    setIsSavedDrawerOpen(true);
                  }}
                  className="h-12 min-h-[48px] rounded-xl bg-accent-tint border border-accent/25 text-accent font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
                >
                  <RotateCcw className="w-4 h-4" /> Zuletzt Gemerkte
                  wiederherstellen ({lastSessionSavedBackup.length})
                </button>
              )}
              <button
                type="button"
                onClick={restart}
                className="h-12 min-h-[48px] rounded-xl bg-card border border-border hover:bg-surface text-text-main font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
              >
                <RotateCcw className="w-4 h-4" /> Von vorn beginnen
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="h-12 min-h-[48px] rounded-xl bg-surface hover:bg-border text-text-muted font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-base"
              >
                Entdecken beenden
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex-1 min-h-0 w-full h-full">
            {/* Nächste Karte im Hintergrund-Stapel mit exakt originalem Karten-Aufbau */}
            {next && (
              <div
                aria-hidden="true"
                style={{
                  transform: `translate3d(0px, ${nextCardTranslateY}px, 0px) scale(${nextCardScale})`,
                  opacity: nextCardOpacity,
                  transition:
                    dragProgress === 0
                      ? 'transform 260ms ease-out, opacity 260ms ease-out'
                      : 'none',
                }}
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
                  <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs sm:text-card-info font-medium text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                      <span>{next.totalTimeMinutes} Min</span>
                    </span>
                    {nextRatingText && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" aria-hidden="true" />
                        <span>{nextRatingText}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                      <span>{DIFFICULTY_LABEL[next.difficulty] || next.difficulty}</span>
                    </span>
                  </div>
                  {(next.subtitle || next.chefTip) && (
                    <p className="line-clamp-2 text-xs sm:text-sm text-text-muted">
                      {next.subtitle || next.chefTip}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Aktive interaktive Karte mit originalem Design */}
            {active && (
              <InteractiveSwipeCard
                key={active.id}
                recipe={active}
                isFirstCardOnEntry={!hasSwipedOnce && index === 0}
                isFavorite={favorites.includes(active.id)}
                onToggleFavorite={() => toggleFavorite(active.id)}
                onCommitSwipe={commitSwipe}
                onCommitSwipeDownClose={requestClose}
                onDragProgressChange={setDragProgress}
                externalTriggerDirection={externalSwipeDir}
              />
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM CONTROLS: 48px Mindest-Touch-Targets, Glas-Bedienelemente ohne überflüssigen X-Button */}
      {!finished && (
        <footer
          style={{
            transform:
              isEntered && !isClosing
                ? 'translate3d(0, 0, 0)'
                : 'translate3d(0, 18px, 0)',
            opacity: isEntered && !isClosing ? 1 : 0,
            transition:
              'transform 340ms ease-out 40ms, opacity 300ms ease-out 40ms',
          }}
          className="relative z-20 w-full max-w-[410px] sm:max-w-[430px] mx-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2.5">
            {/* Letzte Karte zurückholen (Undo) */}
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              aria-label="Letzte Aktion zurücknehmen"
              title="Zurück (Z oder Backspace)"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-black/50 hover:bg-black/70 border border-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Rezept direkt öffnen */}
            <button
              id="swipe-view-btn"
              type="button"
              onClick={() => active && openDetails(active)}
              disabled={!active}
              className="flex-1 h-12 min-h-[48px] px-4 rounded-2xl bg-black/50 hover:bg-black/70 border border-white/20 text-white font-semibold backdrop-blur-md flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-35 disabled:pointer-events-none text-sm sm:text-base truncate"
            >
              <ChefHat className="w-5 h-5 text-white/90 shrink-0" />
              <span className="truncate">Rezept ansehen</span>
            </button>

            {/* Session-Merkliste öffnen (originales RecipePickerModal) */}
            <button
              id="swipe-saved-drawer-btn"
              type="button"
              onClick={() => setIsSavedDrawerOpen(true)}
              aria-label={`Gemerkte Rezepte ansehen (${sessionSaved.length})`}
              className="h-12 min-h-[48px] px-4 rounded-2xl bg-accent hover:bg-accent-hover text-on-accent font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer text-sm sm:text-base shrink-0"
            >
              <Bookmark className="w-4 h-4 fill-current shrink-0" />
              <span className="tabular-nums">{sessionSaved.length}</span>
            </button>
          </div>
        </footer>
      )}

      {/* 5. ORIGINALE MERKLISTE (RecipePickerModal) */}
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

      {/* 6. BESTÄTIGUNGS-DIALOG BEIM SCHLIESSEN MIT GEMERKTEN REZEPTEN */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Swipen beenden bestätigen"
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card text-text-main rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-border flex flex-col gap-4 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-tint text-accent flex items-center justify-center">
              <Bookmark className="w-7 h-7 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-text-main">
                Entdecken beenden?
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Du hast{' '}
                <span className="font-bold text-text-main">
                  {sessionSaved.length}{' '}
                  {sessionSaved.length === 1 ? 'Rezept' : 'Rezepte'}
                </span>{' '}
                in dieser Session gemerkt. Möchtest du sie dir vorher noch
                ansehen?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setIsSavedDrawerOpen(true);
                }}
                className="w-full h-12 min-h-[48px] rounded-xl bg-accent text-on-accent font-bold text-sm shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Gemerkte erst ansehen ({sessionSaved.length})
              </button>
              <button
                type="button"
                onClick={confirmExitAndDiscard}
                className="w-full h-12 min-h-[48px] rounded-xl bg-surface hover:bg-border text-favorite font-semibold text-sm transition-colors cursor-pointer"
              >
                Trotzdem beenden & verwerfen
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full h-12 min-h-[48px] rounded-xl bg-transparent hover:bg-surface text-text-muted font-medium text-sm transition-colors cursor-pointer"
              >
                Weiterswipen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(overlayContent, document.body);
  }
  return overlayContent;
};
