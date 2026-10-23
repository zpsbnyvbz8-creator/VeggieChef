import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ChefHat, RefreshCw } from 'lucide-react';
import { CloseButton } from '../ui/CloseButton';
import { RecipeIngredient } from '../../types';

interface IngredientSubstituteModalProps {
  isOpen: boolean;
  ingredient: RecipeIngredient | null;
  recipeTitle?: string;
  recipeIngredients?: RecipeIngredient[];
  onClose: () => void;
  onApplySubstitute: (originalName: string, substituteName: string) => void;
}

interface SubstituteOption {
  name: string;
  ratio: string;
  reason?: string;
  tip?: string;
  isVegan?: boolean;
}

export const IngredientSubstituteModal: React.FC<IngredientSubstituteModalProps> = ({
  isOpen,
  ingredient,
  recipeTitle = 'Rezept',
  recipeIngredients = [],
  onClose,
  onApplySubstitute,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSubstitutes, setAiSubstitutes] = useState<SubstituteOption[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiPowered, setIsAiPowered] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchSubstitutes = async (wish?: string) => {
    if (!ingredient) return;

    setIsLoading(true);
    setErrorNotice(null);

    try {
      const res = await fetch('/api/ai/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle,
          missingIngredients: [ingredient.name],
          currentIngredients: recipeIngredients,
          userWish: wish?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('KI-Funktion nicht erreichbar');
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.substitutions) && data.substitutions.length > 0 && !data.isFallback) {
        const mapped: SubstituteOption[] = data.substitutions.map((item: any) => ({
          name: item.replacement,
          ratio: item.ratio || '1:1',
          reason: item.reason,
          tip: item.usageTip?.trim() || undefined,
          isVegan: true,
        }));
        setAiSubstitutes(mapped);
        setAiAdvice(data.advice?.trim() || null);
        setIsAiPowered(true);
        setErrorNotice(null);
      } else {
        // Nicht halluzinieren: Wenn die KI nichts liefert, keine erfundenen Alternativen anzeigen
        setAiSubstitutes([]);
        setAiAdvice(null);
        setIsAiPowered(false);
        setErrorNotice('Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.');
      }
    } catch {
      // Nicht halluzinieren: Keine erfundene Alternative anzeigen
      setAiSubstitutes([]);
      setAiAdvice(null);
      setIsAiPowered(false);
      setErrorNotice('Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ingredient) {
      setCustomInput('');
      fetchSubstitutes();
    } else {
      setAiSubstitutes([]);
      setAiAdvice(null);
      setErrorNotice(null);
    }
  }, [isOpen, ingredient?.name]);

  if (!isOpen || !ingredient) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    fetchSubstitutes(customInput);
  };

  const topSubstitute = aiSubstitutes[0];
  const secondarySubstitutes = aiSubstitutes.slice(1);
  const tip = topSubstitute?.tip || aiAdvice;
  const hasTip = Boolean(tip && tip.trim().length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitute-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-border shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Minimalistisch & ruhig */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="substitute-modal-title" className="text-lg font-bold text-text-main">
                Zutat tauschen
              </h3>
              {isAiPowered && (
                <span className="px-2 py-0.5 rounded-full bg-accent-tint text-accent text-[11px] font-semibold">
                  KI
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Alternative für: <strong className="text-text-main font-semibold">{ingredient.name}</strong>
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <div>
              <p className="text-sm font-bold text-text-main">
                Alternative wird ermittelt...
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Passend abgestimmt auf „{recipeTitle}“
              </p>
            </div>
          </div>
        )}

        {/* Dezent: Wenn KI nicht geht, keine erfundenen Alternativen anzeigen */}
        {errorNotice && !isLoading && (
          <div className="py-8 text-center space-y-1">
            <p className="text-sm text-text-muted font-medium">
              Die KI-Funktion ist gerade nicht verfügbar.
            </p>
            <p className="text-xs text-text-muted/70">
              Bitte versuche es später noch einmal.
            </p>
          </div>
        )}

        {/* HERO-VORSCHLAG: Das visuelle Zentrum */}
        {!isLoading && topSubstitute && (
          <div className="space-y-4">
            {/* Großer, fetter Titel */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                Empfohlener Tausch
              </span>
              <h4 className="text-xl sm:text-2xl font-extrabold text-text-main tracking-tight leading-snug">
                {topSubstitute.name}
              </h4>

              {/* Dezente moderne Badges: Grün für "Pflanzlich", Grau für "Menge: 1:1" */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {topSubstitute.isVegan !== false && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-tint text-accent text-xs font-semibold">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>Pflanzlich</span>
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface border border-border text-text-muted text-xs font-medium">
                  Menge: {topSubstitute.ratio}
                </span>
              </div>
            </div>

            {/* Action-Buttons: links kompakte "Alternative" zum Weitersuchen, rechts Primary "Übernehmen" */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fetchSubstitutes(customInput || undefined)}
                disabled={isLoading}
                title="Nach einer anderen Alternative suchen"
                aria-label="Nach einer anderen Alternative suchen"
                className="h-12 min-h-[48px] px-4 rounded-xl bg-surface border border-border hover:bg-card hover:border-accent/40 text-text-main font-semibold text-sm transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
                <span>Alternative</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplySubstitute(ingredient.name, topSubstitute.name);
                  onClose();
                }}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-base shadow-sm transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Übernehmen</span>
              </button>
            </div>

            {/* Tipp: Nur anzeigen wenn von der KI als wirklich nötig bewertet */}
            {hasTip && (
              <div className="flex items-center gap-2 text-xs text-text-muted pt-1">
                <ChefHat className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <span className="truncate">
                  <strong className="text-text-main font-semibold">Tipp:</strong> {tip}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Weitere Optionen (ohne Boxen, nur feine Trennlinien) */}
        {!isLoading && secondarySubstitutes.length > 0 && (
          <div className="pt-4 border-t border-border/60 space-y-2">
            <span className="text-xs font-semibold text-text-muted block">
              Weitere Optionen
            </span>
            <div className="divide-y divide-border/50">
              {secondarySubstitutes.map((opt, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-text-main truncate">
                        {opt.name}
                      </span>
                      <span className="text-xs text-text-muted">
                        ({opt.ratio})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplySubstitute(ingredient.name, opt.name);
                      onClose();
                    }}
                    className="h-9 px-3.5 rounded-lg border border-border hover:border-accent hover:text-accent text-xs font-bold text-text-main transition-colors shrink-0 cursor-pointer"
                  >
                    Wählen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZUSAMMENFÜHRUNG DER INPUTS: Ein einziges elegantes Eingabefeld ganz unten */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <label htmlFor="unified-substitute-input" className="block text-xs font-semibold text-text-main">
            Eigene Alternative oder Wunsch eingeben
          </label>
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              id="unified-substitute-input"
              type="text"
              placeholder="z.B. Hafermilch da, nussfrei, Räuchertofu..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 h-11 min-h-[44px] px-3.5 bg-surface border border-border rounded-xl text-[16px] text-text-main placeholder:text-text-muted/60 focus:border-accent focus:bg-card focus:outline-hidden transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !customInput.trim()}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-on-accent text-sm font-bold transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Anpassen</span>
            </button>
          </form>
          {customInput.trim() && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onApplySubstitute(ingredient.name, customInput.trim());
                  onClose();
                }}
                className="text-xs font-medium text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                Oder direkt als „{customInput.trim()}“ übernehmen →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
