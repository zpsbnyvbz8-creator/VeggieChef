import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Clock,
  ChefHat,
  Flame,
  Dumbbell,
  Leaf,
  Sparkles,
  Salad,
  Star,
} from 'lucide-react';
import { CloseButton } from '../ui/CloseButton';
import { FilterState } from '../../types';
import {
  CALORIE_OPTIONS,
  DIET_OPTIONS,
  DIFFICULTY_OPTIONS,
  PROTEIN_OPTIONS,
  TIME_OPTIONS,
  SHEET_FILTER_DEFAULTS,
  getActiveSheetFilters,
  Option,
} from '../../utils/discover';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resultCount: number;
}

interface OptionGroupProps<T extends string | number> {
  label: string;
  icon: React.ReactNode;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  getOptionIcon?: (value: T) => React.ReactNode;
}

function OptionGroup<T extends string | number>({
  label,
  icon,
  options,
  value,
  onChange,
  getOptionIcon,
}: OptionGroupProps<T>) {
  const labelId = `filter-group-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-2.5">
      <div id={labelId} className="flex items-center gap-2 text-sm font-bold text-text-main">
        <span className="text-accent" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          const optIcon = getOptionIcon ? getOptionIcon(opt.value) : null;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`h-11 px-4 rounded-xl border text-sm flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                selected
                  ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                  : 'bg-surface border-border text-text-main font-semibold hover:border-accent/50 hover:bg-accent-tint/50'
              }`}
            >
              {optIcon && (
                <span
                  className={`shrink-0 ${selected ? 'text-accent' : 'text-text-muted'}`}
                  aria-hidden="true"
                >
                  {optIcon}
                </span>
              )}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bottom sheet on mobile, centered panel on desktop. Built on native <dialog>
 * (focus trap, Escape, top layer for free). Filters apply live; the footer shows the live result count.
 */
export const FilterSheet: React.FC<FilterSheetProps> = ({ open, onClose, filters, setFilters, resultCount }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef<number | null>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setIsClosing(false);
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // ignore
        }
      }
    } else if (dialog.open && !isClosing) {
      try {
        dialog.close();
      } catch {
        // ignore
      }
    }
  }, [open, isClosing]);

  useEffect(() => {
    return () => {
      if (closingTimeoutRef.current !== null) {
        window.clearTimeout(closingTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      onClose();
      return;
    }

    setIsClosing(true);
    closingTimeoutRef.current = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  const activeCount = getActiveSheetFilters(filters).length;
  const patch = (p: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...p }));

  return (
    <dialog
      ref={dialogRef}
      className={`vc-sheet transition-all duration-200 ease-out ${
        isClosing
          ? 'opacity-0 translate-y-8 sm:scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 sm:scale-100'
      }`}
      aria-labelledby="filter-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex flex-col max-h-[88dvh]">
        {/* Grab handle (mobile) */}
        <div className="sm:hidden pt-2.5 flex justify-center shrink-0" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 shrink-0">
          <h2 id="filter-sheet-title" className="text-xl font-extrabold tracking-tight text-text-main">
            Filter
          </h2>
          <CloseButton onClick={handleClose} ariaLabel="Filter schließen" />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-6">
          <OptionGroup
            label="Ernährungsform"
            icon={<Leaf className="w-4 h-4" />}
            options={DIET_OPTIONS}
            value={filters.diet}
            onChange={(diet) => patch({ diet })}
            getOptionIcon={(v) => {
              if (v === 'vegan') return <Leaf className="w-3.5 h-3.5" />;
              if (v === 'vegetarisch') return <Salad className="w-3.5 h-3.5" />;
              return <Sparkles className="w-3.5 h-3.5" />;
            }}
          />

          <OptionGroup
            label="Zubereitungszeit"
            icon={<Clock className="w-4 h-4" />}
            options={TIME_OPTIONS}
            value={filters.maxTime}
            onChange={(maxTime) => patch({ maxTime })}
            getOptionIcon={(v) => {
              if (v === 0) return <Sparkles className="w-3.5 h-3.5" />;
              return <Clock className="w-3.5 h-3.5" />;
            }}
          />

          <OptionGroup
            label="Schwierigkeit"
            icon={<ChefHat className="w-4 h-4" />}
            options={DIFFICULTY_OPTIONS}
            value={filters.difficulty}
            onChange={(difficulty) => patch({ difficulty })}
            getOptionIcon={(v) => {
              if (v === 'all') return <Sparkles className="w-3.5 h-3.5" />;
              if (v === 'Anspruchsvoll') return <Star className="w-3.5 h-3.5" />;
              return <ChefHat className="w-3.5 h-3.5" />;
            }}
          />

          <OptionGroup
            label="Kalorien pro Portion"
            icon={<Flame className="w-4 h-4" />}
            options={CALORIE_OPTIONS}
            value={filters.maxCalories}
            onChange={(maxCalories) => patch({ maxCalories })}
            getOptionIcon={(v) => {
              if (v === 0) return <Sparkles className="w-3.5 h-3.5" />;
              return <Flame className="w-3.5 h-3.5" />;
            }}
          />

          <OptionGroup
            label="Protein pro Portion"
            icon={<Dumbbell className="w-4 h-4" />}
            options={PROTEIN_OPTIONS}
            value={filters.minProtein}
            onChange={(minProtein) => patch({ minProtein })}
            getOptionIcon={(v) => {
              if (v === 0) return <Sparkles className="w-3.5 h-3.5" />;
              return <Dumbbell className="w-3.5 h-3.5" />;
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-border bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
          <button
            id="filter-sheet-reset-btn"
            type="button"
            disabled={activeCount === 0}
            onClick={() => patch(SHEET_FILTER_DEFAULTS)}
            className="h-12 px-4 rounded-xl text-sm font-bold text-text-muted hover:text-text-main hover:bg-accent-tint disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            Zurücksetzen
          </button>
          <button
            id="filter-sheet-apply-btn"
            type="button"
            onClick={handleClose}
            className="flex-1 h-12 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-base font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            {resultCount === 0
              ? 'Keine Rezepte gefunden'
              : `${resultCount} ${resultCount === 1 ? 'Rezept' : 'Rezepte'} anzeigen`}
          </button>
        </div>
      </div>
    </dialog>
  );
};
