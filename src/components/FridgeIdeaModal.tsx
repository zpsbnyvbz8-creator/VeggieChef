import React, { useState, useEffect } from 'react';
import { X, Sparkles, RotateCcw, Clock, Flame, Dumbbell, Check, Lightbulb, AlertTriangle, Leaf } from 'lucide-react';
import { CloseButton } from './ui/CloseButton';
import { FridgeCookIdea } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface FridgeIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: FridgeCookIdea | null;
  isLoadingIdea: boolean;
  isCreatingFinalRecipe: boolean;
  errorMessage?: string | null;
  onConfirmCreate: (approvedAdditionalIngredients: string[]) => void;
  onRetryIdea: () => void;
  onRetryAfterError?: () => void;
  onCancel: () => void;
  isVegan: boolean;
  attemptNumber?: number;
}

const getShortPitch = (text?: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  const match = trimmed.match(/^([^.!?]+[.!?])/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
};

export const FridgeIdeaModal: React.FC<FridgeIdeaModalProps> = ({
  isOpen,
  idea,
  isLoadingIdea,
  isCreatingFinalRecipe,
  errorMessage,
  onConfirmCreate,
  onRetryIdea,
  onRetryAfterError,
  onCancel,
  isVegan,
  attemptNumber = 1,
}) => {
  useLockBodyScroll(isOpen);

  const [selectedAdditional, setSelectedAdditional] = useState<string[]>([]);
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  useEffect(() => {
    if (!isLoadingIdea && !isCreatingFinalRecipe) {
      setLoadingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoadingIdea, isCreatingFinalRecipe]);

  useEffect(() => {
    if (idea?.additionalIngredientsProposed) {
      setSelectedAdditional(idea.additionalIngredientsProposed);
    } else {
      setSelectedAdditional([]);
    }
  }, [idea]);

  const toggleAdditional = (ingredient: string) => {
    setSelectedAdditional((prev) =>
      prev.includes(ingredient)
        ? prev.filter((item) => item !== ingredient)
        : [...prev, ingredient]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="fridge-idea-title"
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-[640px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${errorMessage ? 'bg-amber-100 text-amber-700' : 'bg-accent-tint text-accent'}`}>
              {errorMessage ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Lightbulb className="w-5 h-5 text-accent" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="fridge-idea-title" className="text-lg font-bold text-text-main">
                  {errorMessage ? 'Rezept konnte nicht erstellt werden' : 'Vorgeschlagene Rezeptidee'}
                </h3>
                {!errorMessage && attemptNumber > 1 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                    Vorschlag #{attemptNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {errorMessage ? 'Hinweis zur Rezeptgenerierung' : 'Gefällt dir diese Idee für deine Vorräte?'}
              </p>
            </div>
          </div>
          <CloseButton
            onClick={() => !isCreatingFinalRecipe && onCancel()}
            className={isCreatingFinalRecipe ? 'opacity-50 pointer-events-none' : ''}
            ariaLabel="Schließen"
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage ? (
            <div className="py-6 px-2 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-base font-bold text-text-main">
                  Generierung fehlgeschlagen
                </h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  {errorMessage}
                </p>
                <p className="text-xs text-text-muted pt-1">
                  Es wurde kein unpassendes Fantasierezept erzeugt. Bitte versuche es mit einem Klick auf „Erneut versuchen“ noch einmal.
                </p>
              </div>
            </div>
          ) : isLoadingIdea ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin" />
              <div className="space-y-1.5 max-w-sm">
                <p className="text-sm font-semibold text-text-main">
                  Kombiniere Vorräte zu einer Rezeptidee...
                </p>
                {loadingSeconds >= 5 && (
                  <p className="text-xs text-text-muted animate-in fade-in duration-300">
                    {loadingSeconds >= 12
                      ? 'Rezeptidee wird final verfeinert...'
                      : 'Wird mit Gemini 3.8 Flash ausgearbeitet – bei hoher Nachfrage kann dies kurz dauern.'}
                  </p>
                )}
              </div>
            </div>
          ) : isCreatingFinalRecipe ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin" />
              <div className="space-y-1.5 max-w-sm">
                <p className="text-sm font-semibold text-text-main">
                  Erstelle vollständiges Rezept mit Schritten &amp; Mengenangaben...
                </p>
                {loadingSeconds >= 5 && (
                  <p className="text-xs text-text-muted animate-in fade-in duration-300">
                    {loadingSeconds >= 14
                      ? 'Schritte und Nährwerte werden präzise berechnet...'
                      : 'Sorgfältige Ausarbeitung mit Gemini 3.8 Flash – bei hoher Nachfrage dauert es kurz länger.'}
                  </p>
                )}
              </div>
            </div>
          ) : idea ? (
            <>
              {/* Dish Concept Highlight */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                {/* Pills at top: Vegan/Vegetarisch (voll grün) and Category (hellgrün) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-on-accent text-xs font-semibold shadow-2xs">
                    <Leaf className="w-3.5 h-3.5 text-on-accent" />
                    <span>{isVegan ? 'Vegan' : 'Vegetarisch'}</span>
                  </span>
                  {idea.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-tint text-accent border border-border text-xs font-semibold">
                      {idea.category}
                    </span>
                  )}
                </div>

                <h4 className="text-2xl font-bold text-text-main leading-snug">
                  {idea.title}
                </h4>

                {/* Subtitle / Pitch deutlich kürzer gefasst */}
                <p className="text-sm text-text-muted leading-relaxed">
                  {getShortPitch(idea.pitch)}
                </p>
              </div>

              {/* Quick Estimated Stats - GENAUSO wie in der Rezept-Detailansicht, dynamisch nebeneinander */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Total Time / Dauer */}
                <div className="p-2.5 sm:p-3.5 bg-card rounded-2xl border border-border flex items-center gap-2.5 sm:gap-3 shadow-2xs min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0">
                    <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] sm:text-[14px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                      Dauer
                    </div>
                    <div className="font-bold text-text-main text-sm sm:text-base tabular-nums whitespace-nowrap">
                      ca. {idea.estimatedTimeMinutes} Min.
                    </div>
                  </div>
                </div>

                {/* Calories / Kalorien */}
                <div className="p-2.5 sm:p-3.5 bg-card rounded-2xl border border-border flex items-center gap-2.5 sm:gap-3 shadow-2xs min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FDF6F0] text-[#E67E22] flex items-center justify-center shrink-0">
                    <Flame className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#E67E22]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] sm:text-[14px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                      Kalorien
                    </div>
                    <div className="font-bold text-text-main text-sm sm:text-base tabular-nums whitespace-nowrap">
                      ~{idea.estimatedCalories} kcal
                    </div>
                  </div>
                </div>

                {/* Protein */}
                <div className="p-2.5 sm:p-3.5 bg-card rounded-2xl border border-border flex items-center gap-2.5 sm:gap-3 shadow-2xs min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] sm:text-[14px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                      Protein
                    </div>
                    <div className="font-bold text-accent text-sm sm:text-base tabular-nums whitespace-nowrap">
                      ~{idea.estimatedProtein}g
                    </div>
                  </div>
                </div>
              </div>

              {/* Incorporated Ingredients - grau, kein Haken, gleiche Größe */}
              {idea.keyIngredientsUsed && idea.keyIngredientsUsed.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-main block">
                    Verwendete Vorratszutaten
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {idea.keyIngredientsUsed.map((ing, idx) => (
                      <div
                        key={idx}
                        className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium flex items-center justify-center border border-border bg-surface text-[#57534D] shadow-2xs select-none"
                      >
                        <span className="font-medium text-[#57534D]">{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist for Additional Ingredients - Titel in #2D3E40, Text in #57534D */}
              {idea.additionalIngredientsProposed && idea.additionalIngredientsProposed.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-border">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-main block">
                    Zusätzliche Zutaten
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {idea.additionalIngredientsProposed.map((ing, idx) => {
                      const isSelected = selectedAdditional.includes(ing);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleAdditional(ing)}
                          className={`h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-all select-none cursor-pointer touch-manipulation flex items-center gap-2 border ${
                            isSelected
                              ? 'bg-accent-tint border-accent/40 text-[#57534D] shadow-2xs'
                              : 'bg-surface border-border text-[#8A918D] line-through opacity-70'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-accent text-on-accent'
                                : 'border border-[#C5CAC7] bg-card text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <span className={isSelected ? 'font-medium text-[#57534D]' : 'text-[#8A918D]'}>
                            {ing}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-text-muted text-sm">
              Keine Idee verfügbar. Bitte klicke auf „Neu probieren“.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface space-y-2.5">
          {errorMessage ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="fridge-error-retry-btn"
                onClick={onRetryAfterError || onRetryIdea}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Erneut versuchen</span>
              </button>
              <button
                type="button"
                id="fridge-error-cancel-btn"
                onClick={onCancel}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-card hover:bg-stone-100 border border-border text-[#57534d] font-semibold text-[16px] flex items-center justify-center gap-2 transition-colors cursor-pointer touch-manipulation"
              >
                <X className="w-4 h-4" />
                <span>Abbrechen</span>
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: Gericht erstellen (ohne 'endgültig') */}
              <button
                id="fridge-idea-confirm-btn"
                type="button"
                disabled={isLoadingIdea || isCreatingFinalRecipe || !idea}
                onClick={() => onConfirmCreate(selectedAdditional)}
                className="w-full h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent font-semibold text-[16px] flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
              >
                <Sparkles className="w-5 h-5" />
                <span>Gericht erstellen</span>
              </button>

              {/* Options 2 & 3: Neu probieren & Abbrechen */}
              <div className="flex items-center gap-2.5">
                <button
                  id="fridge-idea-retry-btn"
                  type="button"
                  disabled={isLoadingIdea || isCreatingFinalRecipe}
                  onClick={onRetryIdea}
                  className="flex-1 h-12 min-h-[48px] rounded-xl bg-card hover:bg-stone-50 disabled:opacity-50 border border-border text-[#57534d] font-semibold text-[16px] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4 text-accent" />
                  <span>Neu probieren</span>
                </button>

                <button
                  id="fridge-idea-cancel-btn"
                  type="button"
                  disabled={isCreatingFinalRecipe}
                  onClick={onCancel}
                  className="flex-1 h-12 min-h-[48px] rounded-xl bg-card hover:bg-stone-50 disabled:opacity-50 border border-border text-[#57534d] font-semibold text-[16px] flex items-center justify-center gap-2 transition-colors cursor-pointer touch-manipulation active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Abbrechen</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
