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
      setShowDiscardConfirm(true);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="recipe-preview-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={recipe && !isSaving && !isLoading ? undefined : handleClose}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 touch-none overscroll-contain"
        >
          <motion.div
            key="recipe-preview-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] overscroll-contain"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-main">
                    Rezept-Vorschau
                  </h2>
                  <p className="text-xs text-text-muted">
                    {isLoading
                      ? 'Rezept wird für dich generiert...'
                      : isSaving
                      ? 'Rezeptbuch wird aktualisiert...'
                      : 'Prüfe Zutaten und Portionen vor dem Speichern'}
                  </p>
                </div>
              </div>
              {!isSaving && !isLoading && (
                <CloseButton onClick={handleClose} ariaLabel="Schließen" size="lg" />
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              {/* Discreet Discard Confirmation */}
              {showDiscardConfirm && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-text-main flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-text-main">Diese Rezeptidee verwerfen?</p>
                      <p className="text-xs text-text-muted">Deine Vorschau wird nicht im Rezeptbuch gespeichert.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="min-h-[48px] h-12 px-4 rounded-xl border border-border bg-card hover:bg-surface text-sm font-semibold text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                    >
                      Weiter bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardConfirm}
                      className="min-h-[48px] h-12 px-4 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-bold transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                    >
                      Rezeptidee verwerfen
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Hinweis</span>
                    <span>{errorMessage}</span>
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
                </div>
              )}

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
                  <motion.div
                    key="recipe-preview-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                  >
                    {/* Titel & Beschreibung (kein Platzhalterbild) */}
                    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-3">
                      <div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-tint text-accent border border-accent/20 inline-block mb-2">
                          {recipe.category || 'Rezept'}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-text-main leading-tight">
                          {recipe.title}
                        </h3>
                        {recipe.subtitle ? (
                          <p className="text-sm sm:text-base text-text-muted leading-relaxed mt-1.5">
                            {recipe.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Zutaten mit Portionen-Stepper */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base sm:text-lg font-bold text-text-main">
                          Zutaten
                        </h4>
                        <span className="text-xs sm:text-sm text-text-muted font-medium">
                          {recipe.ingredients.length} {recipe.ingredients.length === 1 ? 'Zutat' : 'Zutaten'}
                        </span>
                      </div>

                      {/* Interactive Portion Stepper Card */}
                      <div className="bg-surface border border-accent-border/60 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-text-main">Portionen anpassen:</span>
                        <div className="inline-flex items-center justify-between bg-card border border-border rounded-xl p-1 shadow-2xs w-[210px] h-[54px]">
                          <button
                            type="button"
                            onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                            disabled={servings <= 1}
                            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-surface active:bg-border disabled:opacity-30 text-text-muted hover:text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95"
                            aria-label="Portion verringern"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <div className="h-5 w-[1px] bg-border shrink-0" />
                          <span className="px-2 text-[16px] font-bold text-text-main tabular-nums flex-1 text-center select-none whitespace-nowrap overflow-hidden">
                            <motion.span
                              key={servings}
                              initial={{ scale: 1.2 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="inline-block"
                            >
                              {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                            </motion.span>
                          </span>
                          <div className="h-5 w-[1px] bg-border shrink-0" />
                          <button
                            type="button"
                            onClick={() => setServings((prev) => Math.min(24, prev + 1))}
                            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-surface active:bg-border text-text-muted hover:text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95"
                            aria-label="Portion erhöhen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Flat List with High Contrast, no checkbox, no clickability, and ca. prefix */}
                      <div className="border border-accent-border/70 rounded-2xl overflow-hidden bg-surface shadow-xs">
                        <div className="px-4 sm:px-5 py-2.5 bg-accent-tint/90 border-b border-accent-border/50 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-main">
                          <span>Zutat</span>
                          <span>Richtwert</span>
                        </div>
                        <ul className="divide-y divide-border">
                          {recipe.ingredients.map((ing, idx) => {
                            const key = `${ing.name}-${idx}`;
                            const rawAmountStr = formatIngredientAmount(ing, recipe.servings || 2, servings);
                            let displayAmount = 'ca. nach Bedarf';
                            if (rawAmountStr && rawAmountStr.trim()) {
                              if (/^(ca\.|etwa)/i.test(rawAmountStr.trim())) {
                                displayAmount = rawAmountStr.trim();
                              } else {
                                displayAmount = `ca. ${rawAmountStr.trim()}`;
                              }
                            }

                            return (
                              <li
                                key={key}
                                className="flex items-center justify-between py-3.5 px-4 sm:px-5 bg-card even:bg-surface/80 select-none cursor-default"
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <span className="text-base font-semibold text-text-main break-words leading-normal block">
                                    {ing.name}
                                  </span>
                                </div>

                                <div className="shrink-0 pl-2">
                                  <span className="text-base font-bold text-accent tabular-nums text-right whitespace-nowrap block">
                                    {displayAmount}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="min-h-[48px] h-12 px-5 py-2.5 rounded-xl border border-border hover:bg-surface text-base font-semibold text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                      >
                        Zurück &amp; Anpassen
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmSave(recipe, servings)}
                        className="min-h-[48px] h-12 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Check className="w-5 h-5" />
                        <span>Ins Rezeptbuch speichern</span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecipePreviewModal;
