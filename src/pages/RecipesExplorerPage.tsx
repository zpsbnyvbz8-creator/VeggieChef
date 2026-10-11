import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, Layers, LayoutGrid, List, Plus, Bookmark, Shuffle } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { DishOfTheDay } from '../components/DishOfTheDay';
import { SeasonHighlights } from '../components/SeasonHighlights';
import { FilterBar } from '../components/FilterBar';
import { FilterSheet } from '../components/discover/FilterSheet';
import { RecipeCardUnified } from '../components/ui/RecipeCardUnified';
import { RecipeCardListRow } from '../components/ui/RecipeCardListRow';
import { EmptyState } from '../components/ui/EmptyState';
import { SlotMachineModal } from '../components/SlotMachineModal';
import { SwipeDiscoverOverlay } from '../components/discover/SwipeDiscoverOverlay';
import { FilterState } from '../types';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import {
  RECIPES_PAGE_SIZE,
  SORT_OPTIONS,
  hasAnyNarrowingFilter,
} from '../utils/discover';

/**
 * Remembers list position per route, so "Back" from a recipe returns to where the user was
 * (instead of the top of a freshly re-paginated list).
 */
const listMemory: Record<string, { count: number; scrollY: number }> = {};

interface RecipesExplorerPageProps {
  isFavorites?: boolean;
  isBookmarks?: boolean;
}

export const RecipesExplorerPage: React.FC<RecipesExplorerPageProps> = ({ isFavorites = false, isBookmarks = false }) => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { favorites, bookmarks, filters, setFilters, resetFilters, filteredRecipes, dishOfTheDay, setIsAddRecipeOpen, isFilterSheetOpen, closeFilterSheet } = useRecipes();

  const memoryKey = isBookmarks ? 'bookmarks' : isFavorites ? 'favorites' : 'explore';
  const restore = navType === 'POP' ? listMemory[memoryKey] : undefined;

  const [visibleCount, setVisibleCount] = useState(restore?.count ?? RECIPES_PAGE_SIZE);
  const [isSlotOpen, setIsSlotOpen] = useState(false);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);

  /* ---- Layout-Toggle Raster/Liste: Auswahl wird gemerkt (SSR-sicher, try/catch in helpers) ---- */
  const VIEW_MODE_KEY = 'veggiechef_explorer_view';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => loadFromLocalStorage<'grid' | 'list'>(VIEW_MODE_KEY, 'grid'));
  useEffect(() => {
    saveToLocalStorage(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const handleToggleViewMode = (newMode: 'grid' | 'list') => {
    if (newMode === viewMode) return;
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => {
          setViewMode(newMode);
        });
      });
    } else {
      setViewMode(newMode);
    }
  };

  /* ---- data ---- */
  const recipes = useMemo(
    () => {
      if (isBookmarks) {
        return filteredRecipes.filter((r) => bookmarks.includes(r.id));
      }
      if (isFavorites) {
        return filteredRecipes.filter((r) => favorites.includes(r.id));
      }
      return filteredRecipes;
    },
    [isBookmarks, isFavorites, filteredRecipes, bookmarks, favorites]
  );
  const isNarrowed = hasAnyNarrowingFilter(filters);
  const isBrowsing = !isFavorites && !isBookmarks && !isNarrowed;
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
  }, [filterKey, isFavorites, isBookmarks]);

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

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-200">
      {/* Page header */}
      <header className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          {isBookmarks ? (
            <p className="text-xs sm:text-sm font-medium text-text-muted">
              {bookmarks.length} gemerkt
            </p>
          ) : isFavorites ? (
            <p className="text-xs sm:text-sm font-medium text-text-muted">
              {favorites.length} gespeichert
            </p>
          ) : null}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main leading-tight">
            {isBookmarks ? 'Merkliste' : isFavorites ? 'Deine Favoriten' : 'Was kochen wir heute?'}
          </h1>
        </div>
        <button
          id="explorer-add-recipe-btn"
          type="button"
          onClick={() => setIsAddRecipeOpen(true)}
          aria-label="Rezept hinzufügen"
          title="Rezept per KI, Foto oder manuell hinzufügen"
          className="h-10 min-h-[44px] px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-bold bg-accent hover:bg-accent-hover text-on-accent shrink-0 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">Rezept</span>
          <span className="hidden sm:inline">Rezept hinzufügen</span>
        </button>
      </header>

      {/* Categories + aktive Filter (Suche/Filter-Button leben im Header) */}
      <FilterBar />

      {/* Discovery entry points (browse mode only) */}
      {isBrowsing && (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              id="explorer-slot-machine-btn"
              type="button"
              onClick={() => setIsSlotOpen(true)}
              className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-season-autumn/25 bg-season-autumn-bg hover:border-season-autumn/50 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Shuffle className="w-6 h-6 text-season-autumn group-hover:rotate-12 transition-transform" aria-hidden="true" />
              <span className="text-base sm:text-lg font-bold text-text-main leading-tight">Überrasch mich</span>
            </button>
            <button
              id="explorer-swipe-btn"
              type="button"
              onClick={() => setIsSwipeOpen(true)}
              className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-accent/25 bg-accent-tint hover:border-accent/50 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span className="text-base sm:text-lg font-bold text-text-main leading-tight">Entdecken</span>
            </button>
          </div>
        </>
      )}

      {/* Editorial blocks (browse mode only) */}
      {isBrowsing && dishOfTheDay && <DishOfTheDay />}
      {isBrowsing && <SeasonHighlights />}

      {/* Results */}
      <section aria-labelledby="results-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="results-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main truncate">
              {isBookmarks ? 'Gemerkte Rezepte' : isFavorites ? 'Gespeicherte Rezepte' : isNarrowed ? 'Ergebnisse' : 'Alle Rezepte'}
            </h2>
            <p className="text-sm text-text-muted" aria-live="polite">
              {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <label htmlFor="filter-sort-by" className="sr-only">
                Sortierung
              </label>
              <ArrowUpDown className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="filter-sort-by"
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
                className="appearance-none h-11 max-w-[10rem] sm:max-w-none bg-card border border-border hover:border-accent/50 rounded-xl pl-9 pr-9 text-sm font-semibold text-text-main cursor-pointer focus:outline-hidden focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Layout-Toggle: Raster / Liste */}
            <div
              role="group"
              aria-label="Darstellung"
              className="flex items-center rounded-xl border border-border bg-card overflow-hidden shrink-0"
            >
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Rasteransicht"
                title="Raster"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-accent-tint text-accent' : 'text-text-muted hover:bg-surface'
                }`}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Listenansicht"
                title="Liste"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border-l border-border transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-accent-tint text-accent' : 'text-text-muted hover:bg-surface'
                }`}
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {recipes.length === 0 ? (
          isBookmarks && !isNarrowed ? (
            <div className="bg-card rounded-3xl border border-border shadow-2xs px-6 py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-accent-tint text-accent flex items-center justify-center mx-auto" aria-hidden="true">
                <Bookmark className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-main">
                  Noch nichts gemerkt
                </h3>
                <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
                  Wische im Entdecken-Modus nach rechts, um Rezepte zu merken.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSwipeOpen(true)}
                  className="h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold transition-all active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
                >
                  Entdecken öffnen
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="h-12 px-6 rounded-xl bg-card border border-border hover:bg-surface text-text-main font-bold transition-all active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
                >
                  Zurück zum Entdecken
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              isFavorites={isFavorites}
              isNarrowed={isNarrowed}
              onReset={resetFilters}
              onBrowse={() => navigate('/')}
            />
          )
        ) : (
          <>
            <ul
              id="results-list"
              aria-label={viewMode === 'list' ? 'Rezepte als Liste' : 'Rezepte als Karten'}
              className={
                viewMode === 'list'
                  ? 'space-y-3 sm:space-y-4 list-none'
                  : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 list-none'
              }
            >
              {visible.map((recipe, i) => (
                <li key={recipe.id} className="vc-fade-up flex min-w-0">
                  {viewMode === 'list' ? (
                    <RecipeCardListRow recipe={recipe} index={i} />
                  ) : (
                    <RecipeCardUnified recipe={recipe} variant="regular" index={i} />
                  )}
                </li>
              ))}
            </ul>

            {hasMore ? (
              <div ref={sentinelRef} className="flex justify-center pt-2">
                <button
                  id="load-more-recipes-btn"
                  type="button"
                  onClick={() => setVisibleCount((c) => c + RECIPES_PAGE_SIZE)}
                  className="h-12 px-6 rounded-xl bg-card border border-border hover:bg-accent-tint hover:border-accent/40 text-text-main font-bold text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Mehr laden ({recipes.length - visibleCount} weitere)
                </button>
              </div>
            ) : (
              recipes.length > RECIPES_PAGE_SIZE && (
                <p className="text-center text-xs font-medium text-text-muted pt-2">Das waren alle {recipes.length} Rezepte</p>
              )
            )}
          </>
        )}
      </section>

      {isSlotOpen && <SlotMachineModal isOpen onClose={closeSlot} />}
      {isSwipeOpen && <SwipeDiscoverOverlay recipes={filteredRecipes} onClose={closeSwipe} />}

      {/* Filter-Sheet: wird vom Header (Filter-Icon im Suchfeld) geöffnet */}
      <FilterSheet
        open={isFilterSheetOpen}
        onClose={closeFilterSheet}
        filters={filters}
        setFilters={setFilters}
        resultCount={recipes.length}
      />
    </div>
  );
};

export default RecipesExplorerPage;
