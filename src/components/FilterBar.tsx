import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import {
  buildCategoryOptions,
  getActiveSheetFilters,
  SHEET_FILTER_DEFAULTS,
  SheetFilterKey,
} from '../utils/discover';

/**
 * Discovery-Toolbar: eine horizontal scrollende Kategorie-Zeile und entferubbare
 * Chips für aktive Filter. Suche und Filter-Button leben seit dem Umbau im Header
 * (Suchfeld ersetzt die Tab-Zeile); das Filter-Sheet wird dort geöffnet.
 */
export const FilterBar: React.FC = () => {
  const { filters, setFilters, recipes } = useRecipes();

  const categories = useMemo(() => buildCategoryOptions(recipes), [recipes]);
  const activeFilters = getActiveSheetFilters(filters);

  const removeFilter = (key: SheetFilterKey) =>
    setFilters((prev) => ({ ...prev, [key]: SHEET_FILTER_DEFAULTS[key] }));

  return (
    <div className="space-y-3">
      {/* Category chips: one scrollable row */}
      <div className="-mx-3 sm:mx-0">
        <div
          role="group"
          aria-label="Kategorien"
          className="flex items-center gap-2 overflow-x-auto scrollbar-none px-3 sm:px-0 py-0.5 sm:flex-wrap sm:overflow-visible mask-fade-x"
        >
          {[{ value: 'all', label: 'Alle', emoji: '' }, ...categories].map((cat) => {
            const selected = filters.category === cat.value;
            return (
              <button
                key={cat.value}
                id={`cat-filter-${cat.value}`}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters((prev) => ({ ...prev, category: cat.value }))}
                className={`h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  selected
                    ? 'bg-accent border-accent text-on-accent shadow-2xs'
                    : 'bg-card border-border text-text-main hover:border-accent/50 hover:bg-accent-tint'
                }`}
              >
                {cat.emoji && <span aria-hidden="true">{cat.emoji}</span>}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Aktive Filter">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeFilter(chip.key)}
              aria-label={`Filter entfernen: ${chip.label}`}
              className="h-9 pl-3 pr-2 rounded-full bg-accent-tint border border-accent/25 text-accent text-xs font-bold flex items-center gap-1.5 hover:bg-[#E3EBE5] transition-colors cursor-pointer"
            >
              {chip.label}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button
            id="reset-filters-btn"
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, ...SHEET_FILTER_DEFAULTS }))}
            className="h-9 px-2 text-xs font-bold text-text-muted hover:text-text-main underline-offset-2 hover:underline cursor-pointer"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
};