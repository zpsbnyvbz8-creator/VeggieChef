import React, { useEffect, useRef } from 'react';
import { X, Clock, ChefHat, Flame, Dumbbell, Leaf } from 'lucide-react';
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
}

function OptionGroup<T extends string | number>({ label, icon, options, value, onChange }: OptionGroupProps<T>) {
  const labelId = `filter-group-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-2.5">
      <div id={labelId} className="flex items-center gap-2 text-sm font-bold text-[#2D3E40]">
        <span className="text-[#4A7856]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`h-11 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                selected
                  ? 'bg-[#4A7856] border-[#4A7856] text-white shadow-2xs'
                  : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#2D3E40] hover:border-[#4A7856]/50 hover:bg-[#F1F5F2]'
              }`}
            >
              {opt.label}
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
  useLockBodyScroll(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const activeCount = getActiveSheetFilters(filters).length;
  const patch = (p: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...p }));

  return (
    <dialog
      ref={dialogRef}
      className="vc-sheet"
      aria-labelledby="filter-sheet-title"
      // Native light-dismiss where supported, manual fallback below
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col max-h-[88dvh]">
        {/* Grab handle (mobile) */}
        <div className="sm:hidden pt-2.5 flex justify-center" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-[#ECEBE8]" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
          <h2 id="filter-sheet-title" className="text-xl font-extrabold tracking-tight text-[#2D3E40]">
            Filter
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Filter schließen"
            className="w-11 h-11 -mr-2 rounded-full hover:bg-[#F1F5F2] text-[#686E6A] hover:text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-6">
          <OptionGroup
            label="Ernährungsform"
            icon={<Leaf className="w-4 h-4" />}
            options={DIET_OPTIONS}
            value={filters.diet}
            onChange={(diet) => patch({ diet })}
          />

          <OptionGroup
            label="Zubereitungszeit"
            icon={<Clock className="w-4 h-4" />}
            options={TIME_OPTIONS}
            value={filters.maxTime}
            onChange={(maxTime) => patch({ maxTime })}
          />
          <OptionGroup
            label="Schwierigkeit"
            icon={<ChefHat className="w-4 h-4" />}
            options={DIFFICULTY_OPTIONS}
            value={filters.difficulty}
            onChange={(difficulty) => patch({ difficulty })}
          />
          <OptionGroup
            label="Kalorien pro Portion"
            icon={<Flame className="w-4 h-4" />}
            options={CALORIE_OPTIONS}
            value={filters.maxCalories}
            onChange={(maxCalories) => patch({ maxCalories })}
          />
          <OptionGroup
            label="Protein pro Portion"
            icon={<Dumbbell className="w-4 h-4" />}
            options={PROTEIN_OPTIONS}
            value={filters.minProtein}
            onChange={(minProtein) => patch({ minProtein })}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#ECEBE8] bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            id="filter-sheet-reset-btn"
            type="button"
            disabled={activeCount === 0}
            onClick={() => patch(SHEET_FILTER_DEFAULTS)}
            className="h-12 px-4 rounded-xl text-sm font-bold text-[#686E6A] hover:text-[#2D3E40] hover:bg-[#F1F5F2] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            Zurücksetzen
          </button>
          <button
            id="filter-sheet-apply-btn"
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-base font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
