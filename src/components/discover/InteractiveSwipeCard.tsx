import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  X,
  ChevronDown,
  Clock,
  Star,
  ChefHat,
} from 'lucide-react';
import { Recipe } from '../../types';
import { RecipeImage } from '../RecipeImage';
import { HeartButton } from '../ui/HeartButton';
import { getRecipeDiet } from '../../utils/discover';

export type SwipeDirection = 1 | -1; // 1 = Merken (Rechts), -1 = Weiter (Links)
export type SwipeExitMode = 'horizontal' | 'down';

export const CARD_FLY_OUT_MS = 280;

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

interface InteractiveSwipeCardProps {
  recipe: Recipe;
  isFirstCardOnEntry: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCommitSwipe: (dir: SwipeDirection) => void;
  onCommitSwipeDownClose: () => void;
  onDragProgressChange: (progress: number) => void;
  externalTriggerDirection: SwipeDirection | null;
}

/**
 * Interaktive Swipe-Karte mit dem originalen VeggieChef Kartendesign:
 * - Echtes App-Kartendesign (HeartButton, Vegetarisch-Badge, Clock, Star, ChefHat)
 * - Sanftes Hineingleiten der 1. Karte beim Eintritt
 * - Dämpfung nach oben, elastischer Wisch nach unten zum Schließen
 * - Merken (rechts) / Weiter (links) Stempel
 */
export const InteractiveSwipeCard: React.FC<InteractiveSwipeCardProps> = ({
  recipe,
  isFirstCardOnEntry,
  isFavorite,
  onToggleFavorite,
  onCommitSwipe,
  onCommitSwipeDownClose,
  onDragProgressChange,
  externalTriggerDirection,
}) => {
  const cardRef = useRef<HTMLElement>(null);

  // Physischer Eintritts-Zustand (1. Das Öffnen: gleitet sanft von unten/Mitte herein)
  const [entered, setEntered] = useState(false);

  // Live-Pointer-Koordinaten während des Ziehens
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyOutState, setFlyOutState] = useState<{
    mode: SwipeExitMode;
    dir: SwipeDirection;
  } | null>(null);

  const pointerStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  } | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Reagiere auf externe Tastatur- oder Button-Trigger
  useEffect(() => {
    if (!externalTriggerDirection || flyOutState) return;
    setFlyOutState({ mode: 'horizontal', dir: externalTriggerDirection });
    const timer = window.setTimeout(() => {
      onCommitSwipe(externalTriggerDirection);
    }, CARD_FLY_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [externalTriggerDirection, flyOutState, onCommitSwipe]);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (flyOutState) return;
    // Ignoriere Klicks auf interaktive Buttons (z.B. HeartButton)
    if ((e.target as HTMLElement).closest('button')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const state = pointerStartRef.current;
    if (!state || state.pointerId !== e.pointerId || flyOutState) return;

    const now = performance.now();
    const dt = Math.max(now - state.lastTime, 8);
    const rawDx = e.clientX - state.startX;
    const rawDy = e.clientY - state.startY;

    // Nach oben stark gedämpft, nach unten elastisch für Swipe-Down-Exit
    const dampedY = rawDy < 0 ? rawDy * 0.18 : rawDy * 0.85;

    state.vx = ((e.clientX - state.lastX) / dt) * 1000;
    state.vy = ((e.clientY - state.lastY) / dt) * 1000;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.lastTime = now;

    setDragOffset({ x: rawDx, y: dampedY });

    const dist = Math.min(Math.hypot(rawDx, Math.max(0, dampedY)) / 220, 1);
    onDragProgressChange(dist);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLElement>) => {
    const state = pointerStartRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    pointerStartRef.current = null;
    setIsDragging(false);

    const width = cardRef.current?.offsetWidth || 360;
    const height = cardRef.current?.offsetHeight || 520;

    const horizontalThreshold = width * 0.3;
    const verticalCloseThreshold = Math.min(height * 0.22, 115);

    const isPrimarilyDownward =
      dragOffset.y > 0 && dragOffset.y > Math.abs(dragOffset.x) * 1.15;

    // 1. Wisch nach unten -> Modus schließen
    if (
      isPrimarilyDownward &&
      (dragOffset.y > verticalCloseThreshold || state.vy > 550)
    ) {
      setFlyOutState({ mode: 'down', dir: 1 });
      onDragProgressChange(0);
      onCommitSwipeDownClose();
      return;
    }

    // 2. Wisch nach rechts -> Merken
    if (dragOffset.x > horizontalThreshold || state.vx > 520) {
      setFlyOutState({ mode: 'horizontal', dir: 1 });
      onDragProgressChange(1);
      window.setTimeout(() => {
        onCommitSwipe(1);
      }, CARD_FLY_OUT_MS);
      return;
    }

    // 3. Wisch nach links -> Weiter
    if (dragOffset.x < -horizontalThreshold || state.vx < -520) {
      setFlyOutState({ mode: 'horizontal', dir: -1 });
      onDragProgressChange(1);
      window.setTimeout(() => {
        onCommitSwipe(-1);
      }, CARD_FLY_OUT_MS);
      return;
    }

    // 4. Zurückfedern
    setDragOffset({ x: 0, y: 0 });
    onDragProgressChange(0);
  };

  const width = cardRef.current?.offsetWidth || 360;
  const maxStampDist = width * 0.36;

  const isPullingDownPrimarily =
    dragOffset.y > 48 && dragOffset.y > Math.abs(dragOffset.x);

  const likeOpacity = isPullingDownPrimarily
    ? 0
    : flyOutState?.mode === 'horizontal' && flyOutState.dir === 1
    ? 1
    : Math.min(Math.max((dragOffset.x - 18) / (maxStampDist - 18), 0), 1);

  const skipOpacity = isPullingDownPrimarily
    ? 0
    : flyOutState?.mode === 'horizontal' && flyOutState.dir === -1
    ? 1
    : Math.min(Math.max((-dragOffset.x - 18) / (maxStampDist - 18), 0), 1);

  const closePullOpacity =
    Math.abs(dragOffset.x) > dragOffset.y * 0.85
      ? 0
      : Math.min(Math.max((dragOffset.y - 26) / 80, 0), 1);

  const diet = getRecipeDiet(recipe);
  const ratingText = formatRating(recipe);

  // Berechnung von Position, Rotation & Skalierung
  let transformStyle = '';
  let opacityStyle = 1;
  let transitionStyle = '';

  if (!entered) {
    transformStyle = isFirstCardOnEntry
      ? 'translate3d(0px, 68px, 0px) scale(0.91)'
      : 'translate3d(0px, 14px, 0px) scale(0.96)';
    opacityStyle = 0;
  } else if (flyOutState) {
    if (flyOutState.mode === 'down') {
      transformStyle = 'translate3d(0px, 46vh, 0px) scale(0.88)';
      opacityStyle = 0;
      transitionStyle =
        'transform 340ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease-out';
    } else {
      const targetX = flyOutState.dir * (width * 1.45);
      const targetRotate = flyOutState.dir * 13;
      transformStyle = `translate3d(${targetX}px, ${dragOffset.y * 0.5}px, 0px) rotate(${targetRotate}deg)`;
      opacityStyle = 0;
      transitionStyle =
        'transform 280ms cubic-bezier(0.32, 0, 0.67, 0), opacity 260ms ease-in';
    }
  } else if (isDragging) {
    const rotateDeg = (dragOffset.x / 260) * 8.5;
    const pullDownScale =
      dragOffset.y > 0 ? Math.max(0.91, 1 - dragOffset.y / 2200) : 1;
    transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${rotateDeg}deg) scale(${pullDownScale})`;
    opacityStyle = 1;
    transitionStyle = 'none';
  } else {
    transformStyle = 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1)';
    opacityStyle = 1;
    transitionStyle = isFirstCardOnEntry
      ? 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms ease-out'
      : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease-out';
  }

  return (
    <article
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      style={{
        transform: transformStyle,
        opacity: opacityStyle,
        transition: transitionStyle,
      }}
      aria-label={`${recipe.title}. Nach rechts wischen zum Merken, nach links zum Überspringen, nach unten zum Schließen.`}
      className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-lg overflow-hidden flex flex-col cursor-grab active:cursor-grabbing select-none touch-none will-change-transform"
    >
      {/* Pull-Down-Indikator beim Ziehen nach unten */}
      <div
        style={{ opacity: closePullOpacity }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold tracking-wide shadow-md border border-white/20 whitespace-nowrap transition-opacity duration-75"
      >
        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
        <span>Loslassen zum Schließen</span>
      </div>

      {/* Rechts: Merken mit Bookmark-Icon */}
      <div
        style={{ opacity: likeOpacity }}
        className="absolute top-4 left-4 z-20 pointer-events-none -rotate-[8deg] flex items-center gap-2 px-3 py-1.5 rounded-xl border-[3px] border-accent bg-card/90 text-accent font-black text-lg tracking-wide shadow-xs"
      >
        <Bookmark className="w-5 h-5 fill-current" /> MERKEN
      </div>

      {/* Links: Weiter mit X-Icon */}
      <div
        style={{ opacity: skipOpacity }}
        className="absolute top-4 right-4 z-20 pointer-events-none rotate-[8deg] flex items-center gap-2 px-3 py-1.5 rounded-xl border-[3px] border-border text-text-main bg-card/90 font-black text-lg tracking-wide shadow-xs"
      >
        <X className="w-5 h-5 stroke-[3]" /> WEITER
      </div>

      {/* Bild nimmt die freie Höhe (wie im vorherigen Design) */}
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

      {/* Textblock richtet sich nach dem Inhalt (originales Design) */}
      <div className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 bg-card">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-main line-clamp-1 sm:line-clamp-2 leading-snug">
          {recipe.title}
        </h2>

        {/* Infozeile exakt wie auf der Startseite bei Alle Rezepte (keine Punkte dazwischen) */}
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-card-info font-medium text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span>{recipe.totalTimeMinutes} Min</span>
          </span>
          {ratingText && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" aria-hidden="true" />
              <span>{ratingText}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <span>{DIFFICULTY_LABEL[recipe.difficulty] || recipe.difficulty}</span>
          </span>
        </div>

        {/* Beschreibung: max 1-2 Zeilen */}
        {(recipe.subtitle || recipe.chefTip) && (
          <p className="line-clamp-2 text-xs sm:text-sm text-text-muted">
            {recipe.subtitle || recipe.chefTip}
          </p>
        )}
      </div>
    </article>
  );
};
