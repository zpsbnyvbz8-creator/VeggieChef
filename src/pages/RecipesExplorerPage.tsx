import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, Layers, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { DishOfTheDay } from '../components/DishOfTheDay';
import { SeasonHighlights } from '../components/SeasonHighlights';
import { FilterBar } from '../components/FilterBar';
import { RecipeCardUnified } from '../components/ui/RecipeCardUnified';
import { EmptyState } from '../components/ui/EmptyState';
import { SlotMachineModal } from '../components/SlotMachineModal';
import { SwipeDiscoverOverlay } from '../components/discover/SwipeDiscoverOverlay';
import { FilterState } from '../types';
import {
  RECIPES_PAGE_SIZE,
  SORT_OPTIONS,
  formatTodayLabel,
  getGreeting,
  hasAnyNarrowingFilter,
} from '../utils/discover';

/**
 * Remembers list position per route, so "Back" from a recipe returns to where the user was
 * (instead of the top of a freshly re-paginated list).
 */
const listMemory: Record<string, { count: number; scrollY: number }> = {};

interface RecipesExplorerPageProps {
  isFavorites: boolean;
}

export const RecipesExplorerPage: React.FC<RecipesExplorerPageProps> = ({ isFavorites }) => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { favorites, filters, setFilters, resetFilters, filteredRecipes, dishOfTheDay, setIsAddRecipeOpen } = useRecipes();

  const memoryKey = isFavorites ? 'favorites' : 'explore';
  const restore = navType === 'POP' ? listMemory[memoryKey] : undefined;

  const [visibleCount, setVisibleCount] = useState(restore?.count ?? RECIPES_PAGE_SIZE);
  const [isSlotOpen, setIsSlotOpen] = useState(false);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<1 | 2>(2);

  /* ---- data ---- */
  const recipes = useMemo(
    () => (isFavorites ? filteredRecipes.filter((r) => favorites.includes(r.id)) : filteredRecipes),
    [isFavorites, filteredRecipes, favorites]
  );
  const isNarrowed = hasAnyNarrowingFilter(filters);
  const isBrowsing = !isFavorites && !isNarrowed;
  const visible = recipes.slice(0, visibleCount);
  const hasMore = recipes.length > visibleCount;

  /* ---- reset pagination when filters change (but not on first mount, to allow restore) ---- */
  const filterKey = JSON.stringify(filters);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setVisibleCount(RECIPES_PAGE_SIZE);
  }, [filterKey, isFavorites]);

  /* ---- scroll memory ---- */
  useLayoutEffect(() => {
    if (restore) window.scrollTo({ top: restore.scrollY, left: 0, behavior: 'instant' as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countRef = useRef(visibleCount);
  countRef.current = visibleCount;
  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        listMemory[memoryKey] = { count: countRef.current, scrollY: window.scrollY };
      });
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      cancelAnimationFrame(frame);
    };
  }, [memoryKey]);

  /* ---- infinite scroll (observer is re-created per page so a still-visible sentinel fires again) ---- */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => c + RECIPES_PAGE_SIZE);
      },
      { rootMargin: '700px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const closeSlot = useCallback(() => setIsSlotOpen(false), []);
  const closeSwipe = useCallback(() => setIsSwipeOpen(false), []);

  const greeting = useMemo(() => getGreeting(), []);
  const todayLabel = useMemo(() => formatTodayLabel(), []);

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-200">
      {/* Page header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[#686E6A]">
            {isFavorites ? `${favorites.length} gespeichert` : `${greeting} · ${todayLabel}`}
          </p>
          <h1 className="mt-0.5 text-xl sm:text-3xl font-extrabold tracking-tight text-[#2D3E40] leading-tight text-balance">
            {isFavorites ? 'Deine Favoriten' : 'Was kochen wir heute?'}
          </h1>
        </div>
        <button
          id="explorer-add-recipe-btn"
          type="button"
          onClick={() => setIsAddRecipeOpen(true)}
          aria-label="Neues Gericht hinzufügen"
          title="Neues Gericht per KI, Foto oder manuell hinzufügen"
          className="shrink-0 h-12 min-w-12 sm:px-5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Neues Gericht</span>
        </button>
      </header>

      {/* Search + filters + categories */}
      <FilterBar
        resultCount={recipes.length}
        searchPlaceholder={isFavorites ? 'In Favoriten suchen …' : 'Rezept oder Zutat suchen …'}
      />

      {/* Discovery entry points (browse mode only) */}
      {!isFavorites && isBrowsing && (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              id="explorer-slot-machine-btn"
              type="button"
              onClick={() => setIsSlotOpen(true)}
              className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-[#C86D3B]/25 bg-[#FFF8F0] hover:border-[#C86D3B]/50 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="text-3xl sm:text-4xl leading-none group-hover:rotate-12 transition-transform" aria-hidden="true">
                🎲
              </span>
              <span className="text-base sm:text-lg font-bold text-[#2D3E40] leading-tight">Überrasch mich</span>
            </button>
            <button
              id="explorer-swipe-btn"
              type="button"
              onClick={() => setIsSwipeOpen(true)}
              className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-[#4A7856]/25 bg-[#F6F9F6] hover:border-[#4A7856]/50 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-[#4A7856] group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span className="text-base sm:text-lg font-bold text-[#2D3E40] leading-tight">Entdecken</span>
            </button>
          </div>

          {/* Primary feature: Vorratskammer & KI */}
          <button
            id="explorer-fridge-cta"
            type="button"
            onClick={() => navigate('/fridge')}
            className="group flex w-full items-center gap-4 rounded-2xl bg-[#4A7856] px-4 py-4 text-left text-white shadow-sm hover:bg-[#3D6447] transition-all active:scale-[0.99] cursor-pointer"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden="true">
              <Sparkles className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-tight">Was hast du im Haus?</span>
              <span className="mt-0.5 block text-sm text-white/80">
                Vorratskammer & KI – daraus wird ein Rezept.
              </span>
            </span>
            <ChevronDown className="h-5 w-5 -rotate-90 text-white/80 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Editorial blocks (browse mode only) */}
      {isBrowsing && dishOfTheDay && <DishOfTheDay />}
      {isBrowsing && <SeasonHighlights />}

      {/* Results */}
      <section aria-labelledby="results-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="results-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2D3E40] truncate">
              {isFavorites ? 'Gespeicherte Rezepte' : isNarrowed ? 'Ergebnisse' : 'Alle Rezepte'}
            </h2>
            <p className="text-sm text-[#686E6A]" aria-live="polite">
              {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <label htmlFor="filter-sort-by" className="sr-only">
                Sortierung
              </label>
              <ArrowUpDown className="w-4 h-4 text-[#686E6A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="filter-sort-by"
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
                className="appearance-none h-11 max-w-[10rem] sm:max-w-none bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 rounded-xl pl-9 pr-9 text-sm font-semibold text-[#2D3E40] cursor-pointer focus:outline-hidden focus:border-[#4A7856] focus:ring-2 focus:ring-[#4A7856]/15 transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#686E6A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Layout toggle: 2 columns / 1 column */}
            <div
              role="group"
              aria-label="Layout"
              className="flex items-center rounded-xl border border-[#ECEBE8] bg-white overflow-hidden shrink-0"
            >
              <button
                type="button"
                onClick={() => setGridColumns(2)}
                aria-pressed={gridColumns === 2}
                aria-label="Zwei Spalten"
                title="Zwei Spalten"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors cursor-pointer ${
                  gridColumns === 2 ? 'bg-[#F1F5F2] text-[#4A7856]' : 'text-[#686E6A] hover:bg-[#FAF9F6]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(1)}
                aria-pressed={gridColumns === 1}
                aria-label="Eine große Spalte"
                title="Eine große Spalte"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border-l border-[#ECEBE8] transition-colors cursor-pointer ${
                  gridColumns === 1 ? 'bg-[#F1F5F2] text-[#4A7856]' : 'text-[#686E6A] hover:bg-[#FAF9F6]'
                }`}
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {recipes.length === 0 ? (
          <EmptyState
            isFavorites={isFavorites}
            isNarrowed={isNarrowed}
            onReset={resetFilters}
            onBrowse={() => navigate('/')}
          />
        ) : (
          <>
            <ul
              className={
                gridColumns === 1
                  ? 'grid grid-cols-1 gap-4 sm:gap-5 list-none'
                  : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 list-none'
              }
            >
              {visible.map((recipe) => (
                <li key={recipe.id} className="vc-fade-up flex">
                  <RecipeCardUnified recipe={recipe} variant="regular" />
                </li>
              ))}
            </ul>

            {hasMore ? (
              <div ref={sentinelRef} className="flex justify-center pt-2">
                <button
                  id="load-more-recipes-btn"
                  type="button"
                  onClick={() => setVisibleCount((c) => c + RECIPES_PAGE_SIZE)}
                  className="h-12 px-6 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#2D3E40] font-bold text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Mehr laden ({recipes.length - visibleCount} weitere)
                </button>
              </div>
            ) : (
              recipes.length > RECIPES_PAGE_SIZE && (
                <p className="text-center text-xs font-medium text-[#686E6A] pt-2">Das waren alle {recipes.length} Rezepte</p>
              )
            )}
          </>
        )}
      </section>

      {isSlotOpen && <SlotMachineModal isOpen onClose={closeSlot} />}
      {isSwipeOpen && <SwipeDiscoverOverlay recipes={filteredRecipes} onClose={closeSwipe} />}
    </div>
  );
};

export default RecipesExplorerPage;
