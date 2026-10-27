import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export interface PortionStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  idPrefix?: string;
  className?: string;
}

/**
 * Global einheitlicher Portionen-Stepper für die gesamte App:
 * [ – | X Portionen | + ] mit dezenten vertikalen Trennlinien und min. 44px Touch-Target.
 */
export const PortionStepper: React.FC<PortionStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 24,
  idPrefix = 'portion-stepper',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center bg-surface border border-border rounded-xl p-0.5 shadow-2xs h-11 min-h-[44px] ${className}`}
    >
      <button
        id={`${idPrefix}-decrease-btn`}
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-card active:bg-border disabled:opacity-30 text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
        aria-label="Portion verringern"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Dezente vertikale Trennlinie */}
      <div className="h-5 w-[1px] bg-border shrink-0" />

      <span className="px-3 text-sm sm:text-base font-bold text-text-main tabular-nums min-w-[95px] text-center select-none whitespace-nowrap overflow-hidden">
        <motion.span
          key={value}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="inline-block"
        >
          {value} {value === 1 ? 'Portion' : 'Portionen'}
        </motion.span>
      </span>

      {/* Dezente vertikale Trennlinie */}
      <div className="h-5 w-[1px] bg-border shrink-0" />

      <button
        id={`${idPrefix}-increase-btn`}
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-card active:bg-border disabled:opacity-30 text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
        aria-label="Portion erhöhen"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// Aliases for unified imports across the app
export const HybridPortionStepper = PortionStepper;
export type HybridPortionStepperProps = PortionStepperProps;
