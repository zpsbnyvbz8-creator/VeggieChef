import React, { useState, useEffect, useRef } from 'react';
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
 * - Klick auf [+] oder [–] im Stepper: Stepper bleibt dauerhaft dunkelgrün (#4A7856) aktiv,
 *   auch wenn man auf Werte wie 1, 2 oder 4 steppt!
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

  // Speichert den individuell eingegebenen Stepper-Wert separat, damit er beim Klick auf
  // Schnellwahl-Buttons (1, 2, 4) gespeichert bleibt und nicht auf 1, 2 oder 4 zurückgesetzt wird.
  const [hasCustomValue, setHasCustomValue] = useState<boolean>(() => ![1, 2, 4].includes(value));
  const [stepperValue, setStepperValue] = useState<number>(() => value);

  // Verfolgt interne Klicks, damit beim Steppen auf 1, 2 oder 4 der Stepper AKTIV bleibt
  // und nicht fälschlicherweise auf die Schnellauswahl-Buttons umspringt.
  const lastInternalValRef = useRef<number | null>(null);

  // Aktualisiere Stepper-Fokus & Wert bei externen Änderungen (z. B. wenn ein anderes Rezept geladen wird)
  useEffect(() => {
    // Wenn die Wertänderung von unserer eigenen Benutzerinteraktion im Stepper oder Quick-Select kam,
    // überschreiben wir isStepperActive NICHT!
    if (lastInternalValRef.current === value) {
      lastInternalValRef.current = null;
      return;
    }

    if (![1, 2, 4].includes(value)) {
      setIsStepperActive(true);
      setStepperValue(value);
      setHasCustomValue(true);
    } else {
      setIsStepperActive(false);
      // Nur solange der Nutzer noch keinen eigenen Wert im Stepper eingestellt hat,
      // synchronisieren wir den Anfangswert mit dem gewählten Preset.
      if (!hasCustomValue) {
        setStepperValue(value);
      }
    }
  }, [value, hasCustomValue]);

  const handleQuickSelect = (num: number) => {
    lastInternalValRef.current = num;
    setIsStepperActive(false);
    // stepperValue wird hier BEWUSST NICHT überschrieben:
    // Der vom Nutzer manuell eingestellte Stepper-Wert bleibt gespeichert!
    onChange(num);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = Math.max(min, stepperValue - 1);
    lastInternalValRef.current = nextVal;
    setIsStepperActive(true);
    setHasCustomValue(true);
    setStepperValue(nextVal);
    onChange(nextVal);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = stepperValue + 1;
    lastInternalValRef.current = nextVal;
    setIsStepperActive(true);
    setHasCustomValue(true);
    setStepperValue(nextVal);
    onChange(nextVal);
  };

  const handleStepperContainerClick = () => {
    lastInternalValRef.current = stepperValue;
    setIsStepperActive(true);
    // Bei Klick auf den Stepper-Container (z. B. auf die Zahl) wird der gespeicherte Wert reaktiviert
    onChange(stepperValue);
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
        title={
          isStepperActive
            ? `Aktuell ${stepperValue} Portionen ausgewählt`
            : `Gespeicherter Wert: ${stepperValue} Portionen (Klicken zum Aktivieren)`
        }
      >
        {/* Minus-Button (Mindesthöhe 48px) */}
        <button
          type="button"
          id={`${idPrefix}-stepper-minus`}
          onClick={handleDecrement}
          disabled={stepperValue <= min}
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

        {/* Gespeicherter/Aktueller Stepper-Wert X */}
        <span
          className={`flex-1 min-w-[24px] text-center text-base font-bold tabular-nums select-none px-1 ${
            isStepperActive ? 'text-white' : 'text-stone-800'
          }`}
          aria-live="polite"
        >
          {stepperValue}
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
