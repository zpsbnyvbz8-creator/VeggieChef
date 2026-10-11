import React from 'react';
import { Leaf, Droplets, Car } from 'lucide-react';
import { CloseButton } from '../ui/CloseButton';

interface EcoImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCO2Kg: number;
  savedWaterLiters: number;
  isVegan: boolean;
}

export const EcoImpactModal: React.FC<EcoImpactModalProps> = ({
  isOpen,
  onClose,
  savedCO2Kg,
  savedWaterLiters,
  isVegan,
}) => {
  if (!isOpen) return null;

  // Approximate km car equivalent (avg 150g CO2/km)
  const carKmEquivalent = Math.round(savedCO2Kg * 6.7);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eco-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl max-w-md w-full p-6 space-y-5 border border-border shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center font-bold">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 id="eco-modal-title" className="text-lg font-bold text-text-main">
                Umwelt-Impact & Eco-Score
              </h3>
              <p className="text-xs text-text-muted">Vergleich zu konventionellen Rezepten</p>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Eco Badge */}
        <div className="p-4 bg-accent-tint rounded-2xl border border-border flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent text-on-accent flex flex-col items-center justify-center font-black leading-tight shadow-xs">
            <span className="text-sm">Eco</span>
            <span className="text-base">A+</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-accent">
              {isVegan ? '100% Pflanzlich (Hervorragend)' : 'Vegetarisch (Klimaschonend)'}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Bis zu <strong>85% weniger Treibhausgasemissionen</strong> als bei Gerichten mit Rind- oder Schweinefleisch.
            </p>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface border border-border">
            <div className="w-9 h-9 rounded-lg bg-accent-tint text-accent flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-muted">CO₂-Ersparnis</div>
              <div className="text-sm font-bold text-text-main">{savedCO2Kg} kg CO₂ eingespart</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface border border-border">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-muted">Wasser-Schonung</div>
              <div className="text-sm font-bold text-text-main">ca. {savedWaterLiters.toLocaleString('de-DE')} Liter Wasser</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface border border-border">
            <div className="w-9 h-9 rounded-lg bg-[#FDF6F0] text-[#D35400] flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-muted">Fahrt-Äquivalent</div>
              <div className="text-sm font-bold text-text-main">entspricht ca. {carKmEquivalent} km PKW-Fahrt</div>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-sm font-bold transition-all cursor-pointer shadow-xs"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};
