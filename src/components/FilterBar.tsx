import React from 'react';
import { 
  ArrowUpDown, 
  Dumbbell, 
  Flame, 
  ChefHat,
  RotateCcw
} from 'lucide-react';
import { FilterState, RecipeCategory } from '../types';
import { useRecipes } from '../context/RecipeContext';

interface FilterBarProps {
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  totalCount?: number;
  filteredCount?: number;
}

const CATEGORIES: ('all' | RecipeCategory)[] = [
  'all',
  'Schnelle Küche',
  'Pasta & Gnocchi',
  'Currys & Eintöpfe',
  'Bowls & Salate',
  'Ofengerichte',
  'Frühstück & Süßes',
  'Snacks & Dips',
  'Festlich',
];

const DIFFICULTY_OPTIONS = [
  { label: 'Schwierigkeit: Alle', value: 'all' },
  { label: 'Einfach', value: 'Einfach' },
  { label: 'Mittel', value: 'Mittel' },
  { label: 'Anspruchsvoll', value: 'Anspruchsvoll' },
];

const CALORIE_OPTIONS = [
  { label: 'Kalorien: Alle', value: 0 },
  { label: '< 500 kcal', value: 500 },
  { label: '< 650 kcal', value: 650 },
  { label: '< 850 kcal', value: 850 },
];

const PROTEIN_OPTIONS = [
  { label: 'Protein: Alle', value: 0 },
  { label: '20g+ Protein', value: 20 },
  { label: '30g+ Protein', value: 30 },
  { label: '40g+ Protein', value: 40 },
];

const SORT_OPTIONS: { label: string; value: FilterState['sortBy'] }[] = [
  { label: 'Standard-Sortierung', value: 'featured' },
  { label: '✨ Zuletzt hinzugefügt', value: 'recentlyAdded' },
  { label: '🍳 Zuletzt gekocht', value: 'recentlyCooked' },
  { label: '⚡ Schnelligkeit (Zubereitung)', value: 'timeAsc' },
  { label: '💪 Höchster Proteingehalt', value: 'proteinDesc' },
  { label: '🥗 Kalorienarm', value: 'caloriesAsc' },
  { label: '⭐ Beste Bewertung', value: 'ratingDesc' },
];

export const FilterBar: React.FC<FilterBarProps> = (props) => {
  const recipesCtx = useRecipes();
  const filters = props.filters ?? recipesCtx.filters;
  const setFilters = props.setFilters ?? recipesCtx.setFilters;
  const totalCount = props.totalCount ?? recipesCtx.recipes.length;
  const filteredCount = props.filteredCount ?? recipesCtx.filteredRecipes.length;

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.onlyVegan ||
    filters.maxCalories > 0 ||
    filters.minProtein > 0 ||
    filters.sortBy !== 'featured';

  const resetFilters = () => {
    setFilters((prev) => ({
      ...prev,
      category: 'all',
      difficulty: 'all',
      onlyVegan: false,
      maxCalories: 0,
      minProtein: 0,
      maxTime: 0,
      minFiber: 0,
      selectedTags: [],
      sortBy: 'featured',
    }));
  };

  return (
    <div className="space-y-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#ECEBE8] shadow-xs">
      {/* Category Pills & Vegan Filter */}
      <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b border-[#ECEBE8]">
        {CATEGORIES.map((cat) => {
          const isSelected = filters.category === cat;
          const label = cat === 'all' ? 'Alle Rezepte' : cat;
          return (
            <button
              key={cat}
              id={`cat-filter-${cat}`}
              onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
              className={`h-10 min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center border ${
                isSelected
                  ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-2xs font-semibold'
                  : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#686E6A] hover:bg-[#F1F5F2] hover:text-[#57534d]'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* Vegan Filter Pill */}
        <button
          id="filter-vegan-pill-btn"
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, onlyVegan: !prev.onlyVegan }))}
          className={`h-10 min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border touch-manipulation active:scale-95 flex items-center justify-center ${
            filters.onlyVegan
              ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-2xs'
              : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#4A7856] hover:bg-[#F1F5F2]'
          }`}
          title="Nur vegane Rezepte anzeigen"
        >
          🌱 Vegan {filters.onlyVegan ? '✓' : ''}
        </button>
      </div>

      {/* Filter by: Difficulty, Calories, Protein & Sort by: Speed, Protein */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter nach Schwierigkeit */}
          <div className="relative">
            <select
              id="filter-difficulty"
              value={filters.difficulty}
              onChange={(e) => setFilters((prev) => ({ ...prev, difficulty: e.target.value }))}
              className="appearance-none min-h-[40px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#57534d] text-xs font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-hidden focus:border-[#4A7856]"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChefHat className="w-4 h-4 text-[#686E6A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter nach Kalorien */}
          <div className="relative">
            <select
              id="filter-max-calories"
              value={filters.maxCalories}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxCalories: Number(e.target.value) }))}
              className="appearance-none min-h-[40px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#57534d] text-xs font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-hidden focus:border-[#4A7856]"
            >
              {CALORIE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Flame className="w-4 h-4 text-[#E67E22] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter nach Protein */}
          <div className="relative">
            <select
              id="filter-min-protein"
              value={filters.minProtein}
              onChange={(e) => setFilters((prev) => ({ ...prev, minProtein: Number(e.target.value) }))}
              className="appearance-none min-h-[40px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#57534d] text-xs font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-hidden focus:border-[#4A7856]"
            >
              {PROTEIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Dumbbell className="w-4 h-4 text-[#4A7856] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filter Button */}
          {hasActiveFilters && (
            <button
              id="reset-filters-btn"
              onClick={resetFilters}
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#57534d] hover:text-[#57534d] hover:bg-[#F1F5F2] transition-colors cursor-pointer touch-manipulation active:scale-95"
              title="Filter zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zurücksetzen</span>
            </button>
          )}
        </div>

        {/* Sort Controls & Count */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#686E6A] hidden md:inline">
            <strong>{filteredCount}</strong> von {totalCount} Rezepten
          </span>

          <div className="relative">
            <select
              id="filter-sort-by"
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
              className="appearance-none min-h-[40px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#57534d] text-xs font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-hidden focus:border-[#4A7856]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="w-4 h-4 text-[#686E6A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
