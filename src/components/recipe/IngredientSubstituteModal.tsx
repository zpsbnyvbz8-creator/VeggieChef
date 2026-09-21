import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, Lightbulb } from 'lucide-react';
import { RecipeIngredient } from '../../types';

interface IngredientSubstituteModalProps {
  isOpen: boolean;
  ingredient: RecipeIngredient | null;
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

  // Generic culinary alternatives
  return [
    { name: `Pflanzliche Alternative zu ${name}`, ratio: '1:1', reason: 'Erhält Konsistenz und Geschmack des Rezepts', isVegan: true },
    { name: 'Saisonales Gemüse nach Wahl', ratio: 'Nach Belieben', reason: 'Bringt Frische und Vitamine ins Gericht', isVegan: true },
  ];
}

export const IngredientSubstituteModal: React.FC<IngredientSubstituteModalProps> = ({
  isOpen,
  ingredient,
  onClose,
  onApplySubstitute,
}) => {
  const [customInput, setCustomInput] = useState('');

  if (!isOpen || !ingredient) return null;

  const options = getCulinarySubstitutes(ingredient.name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitute-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#ECEBE8] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#ECEBE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6F0] text-[#D35400] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="substitute-modal-title" className="text-lg font-bold text-[#2D3E40]">
                Zutat tauschen
              </h3>
              <p className="text-xs text-[#7A7E7B]">
                Alternative für: <strong className="text-[#2D3E40]">{ingredient.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#7A7E7B] leading-relaxed">
          Wähle eine passende kulinarische Alternative aus, um dein Rezept anzupassen:
        </p>

        {/* List of recommended substitutes */}
        <div className="space-y-2.5">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/40 transition-all flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#2D3E40] flex items-center gap-1.5">
                    <span>{opt.name}</span>
                    {opt.isVegan && (
                      <span className="text-[10px] bg-[#EBF5EE] text-[#4A7856] px-1.5 py-0.5 rounded-md font-semibold">
                        Vegan
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#7A7E7B] mt-0.5">{opt.reason}</div>
                  <div className="text-[11px] text-[#4A7856] font-medium mt-0.5">
                    Menge: {opt.ratio}
                  </div>
                  {opt.tip && (
                    <div className="text-[11px] text-[#D35400] flex items-center gap-1 mt-1 font-medium">
                      <Lightbulb className="w-3 h-3 shrink-0" />
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
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#4A7856] hover:text-white hover:border-[#4A7856] text-xs font-bold text-[#2D3E40] shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  Übernehmen
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom substitution option */}
        <div className="pt-2 border-t border-[#ECEBE8] space-y-2">
          <label className="block text-xs font-semibold text-[#2D3E40]">
            Eigene Alternative eintragen:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="z.B. Cashewmus, Räuchertofu..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 h-11 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden"
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
              className="h-11 px-4 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Setzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
