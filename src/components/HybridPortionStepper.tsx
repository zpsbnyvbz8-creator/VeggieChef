import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface HybridPortionStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  idPrefix?: string;
  className?: string;
}

/**
 * Hybrider 4-Spalten Inline-Stepper für Mengenauswahlen (Portionen, Personen, Stückzahlen).
 * 
 * 1. Spalte 1, 2, 3: Statische Schnellwahl-Buttons für die Werte [ 1 ], [ 2 ], [ 4 ].
 * 2. Spalte 4: Dynamischer Inline-Stepper im Format [ – | X | + ].
 * 
 * Interaktions- & Farblogik:
 * - Klick auf [1], [2] oder [4]: Button wird dunkelgrün (#4A7856) hervorgehoben.
 *   Der Stepper in Spalte 4 zeigt den gewählten Wert im dezenten weißen/hellgrauen Inaktiv-Zustand.
 * - Klick auf [+] oder [–] im Stepper: Stepper wird dunkelgrün (#4A7856) mit weißer Schrift/Icons,
 *   die Schnellwahl-Buttons (1, 2, 4) werden deselektiert.
 * - Touch-Targets: Mindesthöhe 48px (h-12) für alle Klickbereiche.
 */
export const HybridPortionStepper: React.FC<HybridPortionStepperProps> = ({
  value,
  onChange,
  min = 1,
  idPrefix = 'portion-stepper',
  className = ''
}) => {
  // Stepper ist aktiv im Fokus, wenn der Nutzer im Stepper navigiert hat oder der Wert nicht in [1, 2, 4] liegt
  const [isStepperActive, setIsStepperActive] = useState<boolean>(() => ![1, 2, 4].includes(value));

  // Aktualisiere Stepper-Fokus bei externen Wertänderungen
  useEffect(() => {
    if (![1, 2, 4].includes(value)) {
      setIsStepperActive(true);
    }
  }, [value]);

  const handleQuickSelect = (num: number) => {
    setIsStepperActive(false);
    onChange(num);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStepperActive(true);
    const nextVal = Math.max(min, value - 1);
    onChange(nextVal);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStepperActive(true);
    const nextVal = value + 1;
    onChange(nextVal);
  };

  const handleStepperContainerClick = () => {
    setIsStepperActive(true);
  };

  const QUICK_VALUES = [1, 2, 4];

  return (
    <div className={`grid grid-cols-[repeat(3,minmax(38px,48px))_1fr] gap-1.5 sm:gap-2 w-full select-none ${className}`}>
      {/* Spalten 1, 2, 3: Statische Schnellwahl-Buttons für [1], [2], [4] */}
      {QUICK_VALUES.map((num) => {
        const isActive = !isStepperActive && value === num;
        return (
          <button
            key={num}
            id={`${idPrefix}-quick-${num}`}
            type="button"
            onClick={() => handleQuickSelect(num)}
            className={`h-12 min-h-[48px] rounded-xl font-bold text-base transition-all flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 border ${
              isActive
                ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                : 'bg-white text-stone-700 border-[#ECEBE8] hover:bg-[#FAF9F6] hover:text-stone-900 hover:border-stone-300 shadow-2xs'
            }`}
            title={`${num} ${num === 1 ? 'Portion' : 'Portionen'}`}
            aria-pressed={isActive}
          >
            {num}
          </button>
        );
      })}

      {/* Spalte 4: Dynamischer Inline-Stepper [ – | X | + ] */}
      <div
        id={`${idPrefix}-stepper`}
        onClick={handleStepperContainerClick}
        className={`h-12 min-h-[48px] rounded-xl flex items-center justify-between border transition-all cursor-pointer overflow-hidden ${
          isStepperActive
            ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
            : 'bg-white text-stone-700 border-[#ECEBE8] hover:border-stone-300 shadow-2xs'
        }`}
        title={`Portionen im Stepper anpassen: aktuell ${value}`}
      >
        {/* Minus-Button (Mindesthöhe 48px) */}
        <button
          type="button"
          id={`${idPrefix}-stepper-minus`}
          onClick={handleDecrement}
          disabled={value <= min}
          className={`w-9 sm:w-10 h-12 min-h-[48px] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${
            isStepperActive
              ? 'text-white hover:bg-black/10 active:bg-black/20'
              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200'
          }`}
          aria-label="Portionen verringern"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Vertikaler Teiler links */}
        <div
          className={`w-px h-5 shrink-0 ${
            isStepperActive ? 'bg-white/25' : 'bg-stone-200'
          }`}
        />

        {/* Aktueller Wert X */}
        <span
          className={`flex-1 min-w-[24px] text-center text-base font-bold tabular-nums select-none px-1 ${
            isStepperActive ? 'text-white' : 'text-stone-800'
          }`}
          aria-live="polite"
        >
          {value}
        </span>

        {/* Vertikaler Teiler rechts */}
        <div
          className={`w-px h-5 shrink-0 ${
            isStepperActive ? 'bg-white/25' : 'bg-stone-200'
          }`}
        />

        {/* Plus-Button (Mindesthöhe 48px) */}
        <button
          type="button"
          id={`${idPrefix}-stepper-plus`}
          onClick={handleIncrement}
          className={`w-9 sm:w-10 h-12 min-h-[48px] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90 shrink-0 ${
            isStepperActive
              ? 'text-white hover:bg-black/10 active:bg-black/20'
              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200'
          }`}
          aria-label="Portionen erhöhen"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
