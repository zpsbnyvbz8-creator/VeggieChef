import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { FilterSheet } from './discover/FilterSheet';
import {
  buildCategoryOptions,
  getActiveSheetFilters,
  SHEET_FILTER_DEFAULTS,
  SheetFilterKey,
} from '../utils/discover';

interface FilterBarProps {
  /** Number of recipes currently shown (for the sheet's confirm button). */
  resultCount: number;
  /** Placeholder / aria text, differs between Entdecker and Favoriten. */
  searchPlaceholder?: string;
}

/**
 * Discovery toolbar: search + filter button, a single horizontally scrolling category row,
 * and removable chips for active filters. Sorting lives next to the result count (not here).
 */
export const FilterBar: React.FC<FilterBarProps> = ({ resultCount, searchPlaceholder = 'Rezept oder Zutat suchen …' }) => {
  const { filters, setFilters, recipes } = useRecipes();
  const [sheetOpen, setSheetOpen] = useState(false);

  const categories = useMemo(() => buildCategoryOptions(recipes), [recipes]);
  const activeFilters = getActiveSheetFilters(filters);

  const removeFilter = (key: SheetFilterKey) =>
    setFilters((prev) => ({ ...prev, [key]: SHEET_FILTER_DEFAULTS[key] }));

  return (
    <div className="space-y-3">
      {/* Search + filter button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-5 h-5 text-[#686E6A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            id="recipe-search-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Rezepte durchsuchen"
            placeholder={searchPlaceholder}
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full h-12 bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 rounded-xl pl-11 pr-12 text-[#2D3E40] placeholder:text-[#686E6A] focus:outline-hidden focus:border-[#4A7856] focus:ring-2 focus:ring-[#4A7856]/15 shadow-2xs transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              aria-label="Suche leeren"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#686E6A] hover:text-[#2D3E40] hover:bg-[#F1F5F2] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          id="open-filter-sheet-btn"
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-label={activeFilters.length > 0 ? `Filter öffnen, ${activeFilters.length} aktiv` : 'Filter öffnen'}
          className={`relative h-12 min-w-12 px-3.5 sm:px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs ${
            activeFilters.length > 0
              ? 'bg-[#F1F5F2] border-[#4A7856]/50 text-[#4A7856]'
              : 'bg-white border-[#ECEBE8] text-[#2D3E40] hover:border-[#4A7856]/50'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilters.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#4A7856] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

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
                    ? 'bg-[#4A7856] border-[#4A7856] text-white shadow-2xs'
                    : 'bg-white border-[#ECEBE8] text-[#2D3E40] hover:border-[#4A7856]/50 hover:bg-[#F1F5F2]'
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
              className="h-9 pl-3 pr-2 rounded-full bg-[#F1F5F2] border border-[#4A7856]/25 text-[#4A7856] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E3EBE5] transition-colors cursor-pointer"
            >
              {chip.label}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button
            id="reset-filters-btn"
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, ...SHEET_FILTER_DEFAULTS }))}
            className="h-9 px-2 text-xs font-bold text-[#686E6A] hover:text-[#2D3E40] underline-offset-2 hover:underline cursor-pointer"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        setFilters={setFilters}
        resultCount={resultCount}
      />
    </div>
  );
};
