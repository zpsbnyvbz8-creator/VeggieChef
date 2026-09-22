import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Lightbulb, ChefHat, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';
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
  reason: string;
  tip?: string;
  isVegan?: boolean;
}

function getCulinarySubstitutes(name: string): SubstituteOption[] {
  const lower = name.toLowerCase();

  if (lower.includes('milch') || lower.includes('kuhmilch')) {
    return [
      { name: 'Hafermilch (Barista)', ratio: '1:1', reason: 'Cremig & neutral im Kochgericht', tip: 'Hervorragend für Saucen und Teige.', isVegan: true },
      { name: 'Sojamilch ungesüßt', ratio: '1:1', reason: 'Hoher Proteingehalt und gute Bindung', tip: 'Ideal für herzhafte Gerichte.', isVegan: true },
      { name: 'Mandelmilch', ratio: '1:1', reason: 'Leicht nussige feine Note', tip: 'Perfekt für Currys und Frühstück.', isVegan: true },
    ];
  }

  if (lower.includes('sahne') || lower.includes('rahm')) {
    return [
      { name: 'Hafer-Cuisine (Pflanzensahne)', ratio: '1:1', reason: 'Gleiche Bindung und Sämigkeit ohne Cholesterin', tip: 'Einfach wie normale Sahne einrühren.', isVegan: true },
      { name: 'Kokosmilch (Vollfett)', ratio: '1:1', reason: 'Exotisch-sämig mit satter Textur', tip: 'Besonders harmonisch in Currys & Suppen.', isVegan: true },
      { name: 'Cashew-Sahne (pürierte Cashews)', ratio: '1:1', reason: 'Ultra-cremig mit feinem Geschmack', tip: 'Cashews 15 Min. einweichen und mixen.', isVegan: true },
    ];
  }

  if (lower.includes('butter')) {
    return [
      { name: 'Vegane Blockbutter', ratio: '1:1', reason: 'Identisches Back- und Bratverhalten', isVegan: true },
      { name: 'Rapsöl oder Olivenöl', ratio: '80g Öl pro 100g Butter', reason: 'Gesunde ungesättigte Fettsäuren', tip: 'Bei herzhaften Pfannengerichten die beste Wahl.', isVegan: true },
    ];
  }

  if (lower.includes('parmesan') || lower.includes('käse')) {
    return [
      { name: 'Würzige Hefeflocken & gemahlene Mandeln', ratio: '1:1', reason: 'Liefert den intensiven, nussigen Umami-Kick', tip: 'Reich an Vitamin B12 und Zink.', isVegan: true },
      { name: 'Veganer Reibegenuss (Gouda-Art)', ratio: '1:1', reason: 'Schmilzt gut beim Überbacken', isVegan: true },
    ];
  }

  if (lower.includes('ei') || lower.includes('eier')) {
    return [
      { name: '1 EL geschrotete Leinsamen + 3 EL Wasser', ratio: 'Ersetzt 1 Ei', reason: 'Perfekter pflanzlicher Ei-Ersatz für Bindung', tip: '5 Minuten quellen lassen.', isVegan: true },
      { name: '60 g Apfelmus oder Seidentofu', ratio: 'Ersetzt 1 Ei', reason: 'Hält Teige saftig und feucht', isVegan: true },
      { name: '2 EL Kichererbsenmehl + 2 EL Wasser', ratio: 'Ersetzt 1 Ei', reason: 'Ideal für herzhafte Panaden & Quiches', isVegan: true },
    ];
  }

  if (lower.includes('tofu') || lower.includes('fleisch') || lower.includes('hack')) {
    return [
      { name: 'Braune Berglinsen oder Kichererbsen', ratio: '1:1', reason: 'Sattmachende Ballaststoffe & Proteine', isVegan: true },
      { name: 'Räuchertofu fein gewürfelt', ratio: '1:1', reason: 'Würziger Biss und hoher Eiweißanteil', isVegan: true },
      { name: 'Braune Champignons oder Kräuterseitlinge', ratio: '1:1', reason: 'Dunkles herzhaftes Aroma & fleischige Textur', isVegan: true },
    ];
  }

  if (lower.includes('honig')) {
    return [
      { name: 'Agavendicksaft', ratio: '1:1', reason: 'Mild süß und löst sich sofort auf', isVegan: true },
      { name: 'Ahornsirup Grad A', ratio: '1:1', reason: 'Feine Karamellnote', isVegan: true },
    ];
  }

  if (lower.includes('joghurt') || lower.includes('quark')) {
    return [
      { name: 'Soja-Joghurt ungesüßt', ratio: '1:1', reason: 'Gleiche Konsistenz & Proteinprofil', isVegan: true },
      { name: 'Hafer-Joghurtalternative', ratio: '1:1', reason: 'Mild-cremig & regional', isVegan: true },
    ];
  }

  return [
    { name: `Pflanzliche Alternative zu ${name}`, ratio: '1:1', reason: 'Erhält Konsistenz und Geschmack des Rezepts', isVegan: true },
    { name: 'Saisonales Gemüse nach Wahl', ratio: 'Nach Belieben', reason: 'Bringt Frische und Vitamine ins Gericht', isVegan: true },
  ];
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
  const [userWish, setUserWish] = useState('');
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
        throw new Error(`Server antwortete mit Status ${res.status}`);
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.substitutions) && data.substitutions.length > 0) {
        const mapped: SubstituteOption[] = data.substitutions.map((item: any) => ({
          name: item.replacement,
          ratio: item.ratio || '1:1',
          reason: item.reason,
          tip: item.usageTip,
          isVegan: true,
        }));
        setAiSubstitutes(mapped);
        setAiAdvice(data.advice || null);
        setIsAiPowered(!data.isFallback);
      } else {
        // Fallback to culinary heuristics
        const fallback = getCulinarySubstitutes(ingredient.name);
        setAiSubstitutes(fallback);
        setIsAiPowered(false);
      }
    } catch (err) {
      console.warn('AI substitution error, using culinary fallbacks:', err);
      const fallback = getCulinarySubstitutes(ingredient.name);
      setAiSubstitutes(fallback);
      setIsAiPowered(false);
      setErrorNotice('KI-Dienst momentan offline; zuverlässige kulinarische Alternativen geladen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when opened or when ingredient changes
  useEffect(() => {
    if (isOpen && ingredient) {
      setUserWish('');
      setCustomInput('');
      fetchSubstitutes();
    } else {
      setAiSubstitutes([]);
      setAiAdvice(null);
      setErrorNotice(null);
    }
  }, [isOpen, ingredient?.name]);

  if (!isOpen || !ingredient) return null;

  const handleCustomWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userWish.trim()) return;
    fetchSubstitutes(userWish);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitute-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-[#ECEBE8] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEBE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5EE] text-[#4A7856] flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="substitute-modal-title" className="text-lg font-bold text-[#2D3E40]">
                  Zutat tauschen
                </h3>
                {isAiPowered && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF5EE] text-[#4A7856] text-[10px] font-bold tracking-wide">
                    KI-Aktiv
                  </span>
                )}
              </div>
              <p className="text-xs text-[#686E6A]">
                Alternative für: <strong className="text-[#2D3E40]">{ingredient.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#FAF9F6] text-[#686E6A] hover:text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Vorräte-Abfrage & Custom Wish */}
        <form onSubmit={handleCustomWishSubmit} className="space-y-2">
          <label className="block text-xs font-semibold text-[#2D3E40]">
            Bestimmte Vorräte vorhanden oder spezielle Wünsche?
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="z.B. habe nur Hafermilch da / nussfrei / proteinreich..."
              value={userWish}
              onChange={(e) => setUserWish(e.target.value)}
              className="flex-1 h-10 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isLoading || !userWish.trim()}
              className="h-10 min-h-[40px] px-3.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>KI fragen</span>
            </button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#ECEBE8] flex flex-col items-center justify-center gap-3 text-center animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#EBF5EE] text-[#4A7856] flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-[#4A7856]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2D3E40]">
                KI-Küchenchef ermittelt Alternativen...
              </p>
              <p className="text-xs text-[#686E6A] mt-0.5">
                Passend abgestimmt auf Textur, Geschmack und Nährwerte in &bdquo;{recipeTitle}&ldquo;
              </p>
            </div>
          </div>
        )}

        {/* Notice if offline */}
        {errorNotice && !isLoading && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchSubstitutes(userWish)}
              className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 font-semibold text-[11px] cursor-pointer"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* List of recommended substitutes */}
        {!isLoading && aiSubstitutes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#686E6A]">
              <span className="font-semibold text-[#2D3E40]">
                {isAiPowered ? 'Empfohlene KI-Tauschoptionen:' : 'Kulinarische Alternativen:'}
              </span>
              <button
                type="button"
                onClick={() => fetchSubstitutes(userWish)}
                className="hover:text-[#4A7856] flex items-center gap-1 cursor-pointer transition-colors"
                title="Neu laden"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Neu berechnen</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {aiSubstitutes.map((opt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/40 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="text-sm font-bold text-[#2D3E40] flex items-center gap-2">
                        <span>{opt.name}</span>
                        {opt.isVegan && (
                          <span className="text-[10px] bg-[#EBF5EE] text-[#4A7856] px-1.5 py-0.5 rounded-md font-semibold">
                            Pflanzlich
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#686E6A] leading-relaxed">
                        {opt.reason}
                      </div>
                      <div className="text-[11px] text-[#4A7856] font-semibold flex items-center gap-1">
                        <span>Verhältnis: {opt.ratio}</span>
                      </div>
                      {opt.tip && (
                        <div className="text-[11px] text-[#D35400] flex items-start gap-1.5 mt-1 font-medium bg-[#FFF9F5] p-2 rounded-xl border border-[#FEE7D6]">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{opt.tip}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApplySubstitute(ingredient.name, opt.name);
                        onClose();
                      }}
                      className="px-4 py-2 min-h-[40px] rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#4A7856] hover:text-white hover:border-[#4A7856] text-sm font-bold text-[#2D3E40] shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
                    >
                      Übernehmen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Chef's Culinary Advice Note */}
        {!isLoading && aiAdvice && (
          <div className="p-3.5 rounded-2xl bg-[#F0F7F2] border border-[#D5E8DA] flex items-start gap-2.5">
            <ChefHat className="w-4 h-4 text-[#4A7856] shrink-0 mt-0.5" />
            <div className="text-xs text-[#2D3E40] leading-relaxed">
              <strong className="text-[#4A7856] block mb-0.5">Tipp vom Chefkoch:</strong>
              {aiAdvice}
            </div>
          </div>
        )}

        {/* Custom manual substitution option */}
        <div className="pt-2 border-t border-[#ECEBE8] space-y-2">
          <label className="block text-xs font-semibold text-[#2D3E40]">
            Oder eigene Alternative manuell eintragen:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="z.B. Cashewmus, Räuchertofu, Kokosjoghurt..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 h-10 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden"
            />
            <button
              type="button"
              disabled={!customInput.trim()}
              onClick={() => {
                if (customInput.trim()) {
                  onApplySubstitute(ingredient.name, customInput.trim());
                  onClose();
                }
              }}
              className="h-10 min-h-[40px] px-4 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] disabled:opacity-40 text-white text-sm font-bold transition-all cursor-pointer shrink-0"
            >
              Setzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
