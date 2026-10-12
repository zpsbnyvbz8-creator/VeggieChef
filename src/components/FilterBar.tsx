import React, { useMemo } from 'react';
import {
  Sparkles,
  Clock,
  Utensils,
  Flame,
  Salad,
  ChefHat,
  Dumbbell,
  Sun,
  Cookie,
  Star,
  Leaf,
  X,
} from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import {
  buildCategoryOptions,
  getActiveSheetFilters,
  SHEET_FILTER_DEFAULTS,
  SheetFilterKey,
} from '../utils/discover';

function getCategoryIcon(value: string) {
  switch (value) {
    case 'all':
      return <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Schnelle Küche':
    case 'Schnell':
      return <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Pasta & Gnocchi':
    case 'Pasta':
      return <Utensils className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Currys & Eintöpfe':
      return <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Bowls & Salate':
      return <Salad className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Ofengerichte':
      return <ChefHat className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'High Protein':
      return <Dumbbell className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Frühstück & Süßes':
      return <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Snacks & Dips':
      return <Cookie className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Festlich':
      return <Star className="w-4 h-4 shrink-0" aria-hidden="true" />;
    default:
      return <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />;
  }
}

function getFilterChipIcon(key: SheetFilterKey) {
  switch (key) {
    case 'diet':
      return <Leaf className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'maxTime':
      return <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'difficulty':
      return <ChefHat className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'maxCalories':
      return <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'minProtein':
      return <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'minFiber':
      return <Salad className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'selectedTags':
      return <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
}

/**
 * Discovery-Toolbar: eine horizontal scrollende Kategorie-Zeile und entfernbare
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
          {[{ value: 'all', label: 'Alle' }, ...categories].map((cat) => {
            const selected = filters.category === cat.value;
            return (
              <button
                key={cat.value}
                id={`cat-filter-${cat.value}`}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters((prev) => ({ ...prev, category: cat.value }))}
                className={`h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  selected
                    ? 'bg-accent border-accent text-on-accent shadow-2xs'
                    : 'bg-card border-border text-text-main hover:border-accent/50 hover:bg-accent-tint'
                }`}
              >
                {getCategoryIcon(cat.value)}
                <span>{cat.label}</span>
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
              className="h-9 pl-3 pr-2 rounded-full bg-accent-tint border border-accent/25 text-accent text-xs font-bold flex items-center gap-1.5 hover:bg-accent-tint transition-colors cursor-pointer"
            >
              {getFilterChipIcon(chip.key)}
              <span>{chip.label}</span>
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