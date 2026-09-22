import React from 'react';
import { X, Sparkles, RotateCcw, Clock, Flame, Dumbbell, Check, Lightbulb, AlertTriangle } from 'lucide-react';
import { FridgeCookIdea } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface FridgeIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: FridgeCookIdea | null;
  isLoadingIdea: boolean;
  isCreatingFinalRecipe: boolean;
  errorMessage?: string | null;
  onConfirmCreate: () => void;
  onRetryIdea: () => void;
  onRetryAfterError?: () => void;
  onCancel: () => void;
  isVegan: boolean;
  attemptNumber?: number;
}

export const FridgeIdeaModal: React.FC<FridgeIdeaModalProps> = ({
  isOpen,
  onClose,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="fridge-idea-title"
        className="bg-white rounded-2xl border border-[#ECEBE8] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECEBE8] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${errorMessage ? 'bg-amber-100 text-amber-700' : 'bg-[#EBF3ED] text-[#4A7856]'}`}>
              {errorMessage ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Lightbulb className="w-5 h-5 text-[#4A7856]" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="fridge-idea-title" className="text-lg font-bold text-stone-900">
                  {errorMessage ? 'Rezept konnte nicht erstellt werden' : 'Vorgeschlagene Rezeptidee'}
                </h3>
                {!errorMessage && attemptNumber > 1 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    Vorschlag #{attemptNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                {errorMessage ? 'Hinweis zur Rezeptgenerierung' : 'Gefällt dir diese Idee für deine Vorräte?'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreatingFinalRecipe}
            className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage ? (
            <div className="py-6 px-2 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-base font-bold text-stone-900">
                  Generierung fehlgeschlagen
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {errorMessage}
                </p>
                <p className="text-xs text-stone-500 pt-1">
                  Es wurde kein unpassendes Fantasierezept erzeugt. Bitte versuche es mit einem Klick auf „Erneut versuchen“ noch einmal.
                </p>
              </div>
            </div>
          ) : isLoadingIdea ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#ECEBE8] border-t-[#4A7856] rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-stone-800">
                  Kombiniere Vorräte zu einer Rezeptidee...
                </p>
                <p className="text-xs text-stone-500">
                  Leichtgewichtige Vorab-Generierung zur Ressourcenschonung
                </p>
              </div>
            </div>
          ) : isCreatingFinalRecipe ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#ECEBE8] border-t-[#4A7856] rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-stone-800">
                  Erstelle vollständiges Rezept mit Schritten & Mengenangaben...
                </p>
                <p className="text-xs text-stone-500">
                  Du wirst gleich automatisch zur Rezeptansicht weitergeleitet!
                </p>
              </div>
            </div>
          ) : idea ? (
            <>
              {/* Dish Concept Highlight */}
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] space-y-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    isVegan 
                      ? 'bg-[#EBF3ED] text-[#4A7856] border-[#D4E6D8]' 
                      : 'bg-[#FAF2EC] text-[#E67E22] border-[#F5DFCD]'
                  }`}>
                    {isVegan ? '🌱 100% Vegan' : '🧀 Vegetarisch'}
                  </span>
                  {idea.dishType && (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#ECEBE8] text-stone-700">
                      {idea.dishType}
                    </span>
                  )}
                  {idea.category && (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {idea.category}
                    </span>
                  )}
                </div>

                <h4 className="text-2xl font-bold text-stone-900 leading-snug">
                  {idea.title}
                </h4>

                <p className="text-sm text-stone-700 leading-relaxed">
                  {idea.pitch}
                </p>
              </div>

              {/* Quick Estimated Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8]">
                  <div className="flex items-center justify-center gap-1 text-xs text-stone-500 font-medium mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#4A7856]" />
                    <span>Dauer</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    ca. {idea.estimatedTimeMinutes} Min.
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8]">
                  <div className="flex items-center justify-center gap-1 text-xs text-stone-500 font-medium mb-0.5">
                    <Flame className="w-3.5 h-3.5 text-[#E67E22]" />
                    <span>Kalorien</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    ~{idea.estimatedCalories} kcal
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8]">
                  <div className="flex items-center justify-center gap-1 text-xs text-stone-500 font-medium mb-0.5">
                    <Dumbbell className="w-3.5 h-3.5 text-[#4A7856]" />
                    <span>Protein</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    ~{idea.estimatedProtein}g
                  </span>
                </div>
              </div>

              {/* Incorporated Ingredients */}
              {idea.keyIngredientsUsed && idea.keyIngredientsUsed.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Verwendete Vorratszutaten
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.keyIngredientsUsed.map((ing, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]"
                      >
                        <Check className="w-3 h-3 text-[#4A7856]" />
                        <span>{ing}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Pantry Items if mentioned */}
              {idea.basicPantryItemsNeeded && idea.basicPantryItemsNeeded.length > 0 && (
                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                  <span className="font-semibold text-stone-600">Küchen-Basics:</span>
                  <span>{idea.basicPantryItemsNeeded.join(', ')}</span>
                </div>
              )}

              {/* Usage & AI Savings Hint */}
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#ECEBE8] text-xs text-stone-600 leading-relaxed">
                💡 <strong className="text-stone-800">Smarte Vorab-Idee:</strong> Gefällt dir diese Art von Gericht? Erst wenn du auf <span className="font-medium text-[#4A7856]">„Gericht endgültig erstellen“</span> klickst, wird das komplette Rezept mit allen Mengenangaben und Schritten generiert.
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-stone-500 text-sm">
              Keine Idee verfügbar. Bitte klicke auf „Neu probieren“.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#ECEBE8] bg-[#FAF9F6] space-y-2.5">
          {errorMessage ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="fridge-error-retry-btn"
                onClick={onRetryAfterError || onRetryIdea}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Erneut versuchen</span>
              </button>
              <button
                type="button"
                id="fridge-error-cancel-btn"
                onClick={onCancel}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-white hover:bg-stone-100 border border-[#ECEBE8] text-stone-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
              >
                <X className="w-4 h-4" />
                <span>Abbrechen</span>
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: Gericht endgültig erstellen */}
              <button
                id="fridge-idea-confirm-btn"
                type="button"
                disabled={isLoadingIdea || isCreatingFinalRecipe || !idea}
                onClick={onConfirmCreate}
                className="w-full h-12 min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
              >
                <Sparkles className="w-5 h-5" />
                <span>Gericht endgültig erstellen</span>
              </button>

              {/* Options 2 & 3: Neu probieren & Abbrechen */}
              <div className="flex items-center gap-2">
                <button
                  id="fridge-idea-retry-btn"
                  type="button"
                  disabled={isLoadingIdea || isCreatingFinalRecipe}
                  onClick={onRetryIdea}
                  className="flex-1 h-11 min-h-[44px] rounded-xl bg-white hover:bg-stone-50 disabled:opacity-50 border border-[#ECEBE8] text-stone-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#4A7856]" />
                  <span>Neu probieren</span>
                </button>

                <button
                  id="fridge-idea-cancel-btn"
                  type="button"
                  disabled={isCreatingFinalRecipe}
                  onClick={onCancel}
                  className="flex-1 h-11 min-h-[44px] rounded-xl bg-transparent hover:bg-stone-200/60 disabled:opacity-50 text-stone-600 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
