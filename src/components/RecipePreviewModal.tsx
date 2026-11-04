'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  ChefHat,
  AlertCircle,
  Minus,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { formatIngredientAmount } from '../utils/helpers';
import { CloseButton } from './ui/CloseButton';

export interface RecipePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  recipe: Recipe | null;
  onConfirmSave: (recipe: Recipe, servings: number) => Promise<void> | void;
  onDiscard?: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const RecipePreviewModal: React.FC<RecipePreviewModalProps> = ({
  isOpen,
  onClose,
  isLoading = false,
  isSaving = false,
  recipe,
  onConfirmSave,
  onDiscard,
  errorMessage,
  onClearError,
}) => {
  useLockBodyScroll(isOpen);

  const [servings, setServings] = useState(2);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (recipe?.servings) {
      setServings(recipe.servings);
    } else {
      setServings(2);
    }
  }, [recipe]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (recipe && !isSaving && !isLoading) {
      setShowDiscardConfirm((prev) => !prev);
    } else {
      setShowDiscardConfirm(false);
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    if (onDiscard) {
      onDiscard();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, recipe, showDiscardConfirm, isSaving, isLoading]);

  const showFloatingSaveBar = Boolean(recipe && !isLoading && !isSaving);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="recipe-preview-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (isSaving || isLoading) return;
            if (recipe) {
              setShowDiscardConfirm(true);
            } else {
              onClose();
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 touch-none overscroll-contain"
        >
          <motion.div
            key="recipe-preview-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-card border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] overscroll-contain"
          >
            {/* Header */}
            <div className="relative z-30 px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-accent-tint border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-text-main tracking-tight truncate">
                    Rezept-Vorschau
                  </h2>
                  {(isLoading || isSaving) && (
                    <p className="text-xs text-text-muted truncate">
                      {isLoading
                        ? 'Rezept wird für dich generiert...'
                        : 'Rezeptbuch wird aktualisiert...'}
                    </p>
                  )}
                </div>
              </div>
              {!isSaving && !isLoading && (
                <div className="relative shrink-0">
                  <CloseButton
                    onClick={handleClose}
                    ariaLabel="Schließen"
                    size="lg"
                    className={showDiscardConfirm ? 'bg-surface text-text-main ring-2 ring-border' : ''}
                  />

                  <AnimatePresence>
                    {showDiscardConfirm && recipe && (
                      <motion.div
                        key="discard-confirm-popover"
                        initial={{ opacity: 0, scale: 0.75, y: -8, x: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.75, y: -8, x: 6 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 sm:w-72 origin-top-right p-3.5 rounded-2xl bg-card border border-border shadow-xl space-y-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-text-main">Vorschau verwerfen?</p>
                          <p className="text-xs text-text-muted leading-snug">
                            Das Rezept wurde noch nicht gespeichert.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setShowDiscardConfirm(false)}
                            className="flex-1 min-h-[38px] h-9.5 px-3 rounded-xl border border-border bg-surface hover:bg-accent-tint text-xs sm:text-sm font-semibold text-text-main transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
                          >
                            Behalten
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={handleDiscardConfirm}
                            className="flex-1 min-h-[38px] h-9.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-on-accent text-xs sm:text-sm font-bold transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
                          >
                            Verwerfen
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Scrollable Content Area */}
            <div
              onClick={() => {
                if (showDiscardConfirm) setShowDiscardConfirm(false);
              }}
              className={`flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain ${
                showFloatingSaveBar ? 'pb-24 sm:pb-28' : ''
              }`}
            >
              {/* Error Banner */}
              <AnimatePresence initial={false}>
                {errorMessage && (
                  <motion.div
                    key="error-banner"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs sm:text-sm">
                      <span className="font-semibold">{errorMessage}</span>
                    </div>
                    {onClearError && (
                      <button
                        type="button"
                        onClick={onClearError}
                        className="text-rose-700 hover:text-rose-900 p-1 cursor-pointer touch-manipulation"
                        aria-label="Fehlermeldung schließen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="recipe-preview-loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="py-12 px-4 flex flex-col items-center justify-center space-y-6 text-center"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-accent-tint border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div className="absolute -inset-1 rounded-2xl border-2 border-accent/30 animate-ping pointer-events-none" />
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <h3 className="text-lg font-bold text-text-main">
                        Rezept wird analysiert &amp; strukturiert...
                      </h3>
                      <p className="text-xs text-text-muted">
                        Titel, Beschreibung und Zutaten mit Mengen werden für dich aufbereitet.
                      </p>
                    </div>

                    <div className="w-full max-w-md p-4 bg-surface rounded-2xl border border-border space-y-3 text-left">
                      <div className="h-5 bg-accent/20 rounded-md w-3/4 animate-pulse" />
                      <div className="h-3.5 bg-border rounded-md w-1/2 animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ) : isSaving ? (
                  <motion.div
                    key="recipe-preview-saving"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="py-12 px-4 flex flex-col items-center justify-center space-y-6 text-center"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-accent-tint border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                        <ChefHat className="w-8 h-8" />
                      </div>
                      <div className="absolute -inset-1 rounded-2xl border-2 border-accent/30 animate-ping pointer-events-none" />
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <h3 className="text-xl font-bold text-text-main">
                        Vollständiges Rezept wird erstellt...
                      </h3>
                      <p className="text-sm text-text-muted">
                        Zubereitungsschritte, Kochzeiten und Profi-Tipps werden finalisiert.
                      </p>
                    </div>

                    <div className="w-full max-w-md p-4 bg-surface rounded-2xl border border-border space-y-3 text-left">
                      <div className="h-5 bg-accent/20 rounded-md w-3/4 animate-pulse" />
                      <div className="h-3.5 bg-border rounded-md w-1/2 animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ) : recipe ? (
                  /* REDESIGNED REZEPT-VORSCHAU: CLEAN, MODERN, DEZENT */
                  <motion.div
                    key="recipe-preview-content"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-4"
                  >
                    {/* Kompakte Rezept-Kopfkarte im App-Stil (ohne Tags) */}
                    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
                      {recipe.image && (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-border shadow-2xs shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-lg sm:text-xl font-bold text-text-main tracking-tight leading-snug">
                          {recipe.title}
                        </h3>
                        {recipe.subtitle && (
                          <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-2">
                            {recipe.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Zutaten-Sektion mit integriertem, animiertem Portionen-Stepper */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <h4 className="text-base font-bold text-text-main">
                          Zutaten ({recipe.ingredients.length})
                        </h4>

                        {/* Dezenter Inline-Portionen-Stepper */}
                        <div className="inline-flex items-center bg-surface border border-border rounded-xl p-0.5 h-10 shadow-2xs">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                            disabled={servings <= 1}
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-card disabled:opacity-30 text-text-muted hover:text-text-main transition-colors cursor-pointer touch-manipulation"
                            aria-label="Portion verringern"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.4]" />
                          </motion.button>
                          <div className="h-4 w-[1px] bg-border shrink-0" />
                          <span className="px-2.5 text-sm font-bold text-text-main tabular-nums min-w-[92px] text-center select-none whitespace-nowrap">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={servings}
                                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.92 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="inline-block"
                              >
                                {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                          <div className="h-4 w-[1px] bg-border shrink-0" />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setServings((prev) => Math.min(24, prev + 1))}
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-card text-text-muted hover:text-text-main transition-colors cursor-pointer touch-manipulation"
                            aria-label="Portion erhöhen"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Zutatenliste in Grau (bg-surface) für klaren Kontrast zum weißen Modal */}
                      <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-2xs">
                        <ul className="divide-y divide-border/80">
                          {recipe.ingredients.map((ing, idx) => {
                            const key = `${ing.name}-${idx}`;
                            const rawAmountStr = formatIngredientAmount(
                              ing,
                              recipe.servings || 2,
                              servings
                            );
                            const displayAmount = rawAmountStr && rawAmountStr.trim()
                              ? rawAmountStr.trim()
                              : '';

                            return (
                              <li
                                key={key}
                                className="flex items-center justify-between py-2.5 sm:py-3 px-4 select-none"
                              >
                                <span className="text-[15px] sm:text-base font-medium text-text-main break-words leading-snug pr-3">
                                  {ing.name}
                                </span>
                                {displayAmount ? (
                                  <span className="text-[15px] sm:text-base font-semibold text-accent tabular-nums text-right whitespace-nowrap shrink-0">
                                    {displayAmount}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-text-muted italic shrink-0">
                                    nach Bedarf
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Dezenter Floater unten für die Rezept-Vorschau (immer sofort erreichbar, auch beim Scrollen) */}
            <AnimatePresence>
              {showFloatingSaveBar && recipe && (
                <motion.div
                  key="floating-preview-footer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-0 inset-x-0 z-20 px-4 sm:px-6 py-3 bg-gradient-to-t from-card via-card/95 to-card/75 backdrop-blur-md border-t border-border/80 flex items-center justify-between gap-2.5 shadow-[0_-8px_24px_-6px_rgba(45,62,64,0.08)]"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={handleClose}
                    className="min-h-[44px] h-11 px-4 rounded-xl border border-border bg-surface hover:bg-accent-tint text-sm sm:text-[15px] font-semibold text-text-main transition-colors cursor-pointer touch-manipulation flex items-center justify-center shrink-0"
                  >
                    Zurück
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onConfirmSave(recipe, servings)}
                    className="flex-1 sm:flex-initial min-h-[44px] h-11 px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-sm sm:text-[15px] font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation"
                  >
                    <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span>Im Rezeptbuch speichern</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecipePreviewModal;
