import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowUpDown, Check, ChevronDown, Layers, LayoutGrid, List, Plus, Bookmark, History } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRecipes } from '../context/RecipeContext';
import { DishOfTheDay } from '../components/DishOfTheDay';
import { SeasonHighlights } from '../components/SeasonHighlights';
import { FilterBar } from '../components/FilterBar';
import { FilterSheet } from '../components/discover/FilterSheet';
import { RecipeCardUnified } from '../components/ui/RecipeCardUnified';
import { RecipeCardListRow } from '../components/ui/RecipeCardListRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Recipe, FilterState } from '../types';
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
  isCooked?: boolean;
}

export const RecipesExplorerPage: React.FC<RecipesExplorerPageProps> = ({
  isFavorites = false,
  isBookmarks = false,
  isCooked = false,
}) => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const {
    favorites,
    bookmarks,
    cookedLogs,
    recipes: allRecipes,
    filters,
    setFilters,
    resetFilters,
    filteredRecipes,
    setIsAddRecipeOpen,
    isFilterSheetOpen,
    closeFilterSheet,
  } = useRecipes();

  const memoryKey = isBookmarks ? 'bookmarks' : isFavorites ? 'favorites' : isCooked ? 'cooked' : 'explore';
  const restore = navType === 'POP' ? listMemory[memoryKey] : undefined;

  const [visibleCount, setVisibleCount] = useState(restore?.count ?? RECIPES_PAGE_SIZE);

  /* ---- Custom Animated Sort Dropdown State ---- */
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortDropdown) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setShowSortDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSortDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSortDropdown]);

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
  const recipes = useMemo(() => {
    if (isBookmarks) {
      return filteredRecipes.filter((r) => bookmarks.includes(r.id));
    }
    if (isFavorites) {
      return filteredRecipes.filter((r) => favorites.includes(r.id));
    }
    if (isCooked) {
      const sortedLogs = [...cookedLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const seenIds = new Set<string>();
      const orderedRecipes: Recipe[] = [];

      for (const log of sortedLogs) {
        if (!seenIds.has(log.recipeId)) {
          seenIds.add(log.recipeId);
          const found = allRecipes.find((r) => r.id === log.recipeId);
          if (found) {
            orderedRecipes.push(found);
          }
        }
      }
      // Bei Standard-Sortierung ("Empfohlen") bleibt die chronologische "Zuletzt gekocht"-Reihenfolge erhalten;
      // bei expliziter Sortierung (z. B. Schnellste, Wenigste Kalorien) wird die gewählte Sortierung übernommen.
      if (filters.sortBy !== 'recommended') {
        return filteredRecipes.filter((fr) => seenIds.has(fr.id));
      }
      return orderedRecipes.filter((r) => filteredRecipes.some((fr) => fr.id === r.id));
    }
    return filteredRecipes;
  }, [isBookmarks, isFavorites, isCooked, filteredRecipes, bookmarks, favorites, cookedLogs, allRecipes, filters.sortBy]);

  const isNarrowed = hasAnyNarrowingFilter(filters);
  const isBrowsing = !isFavorites && !isBookmarks && !isCooked && !isNarrowed;
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
  }, [filterKey, isFavorites, isBookmarks, isCooked]);

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

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-200">
      {/* Page header */}
      <header className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
            {isBookmarks ? 'Merkliste' : isFavorites ? 'Deine Favoriten' : isCooked ? 'Zuletzt gekocht' : 'Was kochen wir heute?'}
          </h1>
        </div>
        <motion.button
          id="explorer-add-recipe-btn"
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddRecipeOpen(true)}
          aria-label="Gericht hinzufügen"
          title="Gericht hinzufügen"
          className="h-11 min-h-[44px] px-4 rounded-full text-sm font-bold bg-accent hover:bg-accent-hover text-on-accent shrink-0 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer touch-manipulation"
        >
          <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span className="sm:hidden text-sm">Gericht</span>
          <span className="hidden sm:inline text-sm">Gericht hinzufügen</span>
        </motion.button>
      </header>

      {/* Categories + aktive Filter (Suche/Filter-Button leben im Header) */}
      <FilterBar />

      {/* Discovery entry points (browse mode only) */}
      <AnimatePresence initial={false}>
        {isBrowsing && (
          <motion.div
            key="explorer-discovery-blocks"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5 sm:space-y-7"
          >
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <motion.button
                id="explorer-cooked-recipes-btn"
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/cooked')}
                className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-season-autumn/25 bg-season-autumn-bg hover:border-season-autumn/50 hover:shadow-sm transition-all cursor-pointer"
              >
                <History className="w-6 h-6 text-season-autumn group-hover:-rotate-12 transition-transform duration-300" aria-hidden="true" />
                <span className="text-base sm:text-lg font-bold text-text-main leading-tight">Zuletzt gekocht</span>
              </motion.button>
              <motion.button
                id="explorer-swipe-deck-btn"
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/swipen')}
                className="group flex items-center justify-center gap-3 min-h-[76px] px-4 py-3 rounded-2xl border border-accent/25 bg-accent-tint hover:border-accent/50 hover:shadow-sm transition-all cursor-pointer"
              >
                <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-accent group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                <span className="text-base sm:text-lg font-bold text-text-main leading-tight">Swipen</span>
              </motion.button>
            </div>

            <DishOfTheDay />
            <SeasonHighlights />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <section aria-labelledby="results-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="results-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-main truncate">
              {isBookmarks
                ? 'Gemerkte Rezepte'
                : isFavorites
                ? 'Gespeicherte Rezepte'
                : isCooked
                ? 'Zuletzt gekochte Rezepte'
                : isNarrowed
                ? 'Ergebnisse'
                : 'Alle Rezepte'}
            </h2>
            <p className="text-sm text-text-muted" aria-live="polite">
              {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Eigenes UI/UX-animiertes Sortierungs-Dropdown (kein natives iOS-Menü mehr auf Mobile) */}
            <div className="relative shrink-0" ref={sortDropdownRef}>
              <motion.button
                type="button"
                id="filter-sort-by"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowSortDropdown((prev) => !prev)}
                aria-expanded={showSortDropdown}
                aria-haspopup="listbox"
                aria-label="Sortierung wählen"
                className={`h-11 min-h-[44px] px-3 sm:px-3.5 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-all cursor-pointer touch-manipulation shadow-2xs ${
                  showSortDropdown
                    ? 'bg-accent-tint border-accent/40 text-accent ring-2 ring-accent/15'
                    : 'bg-card border-border hover:border-accent/50 text-text-main'
                }`}
              >
                <ArrowUpDown className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
                <span className="max-w-[7.5rem] sm:max-w-[11rem] truncate">
                  {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label || 'Empfohlen'}
                </span>
                <motion.span
                  animate={{ rotate: showSortDropdown ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex items-center justify-center text-text-muted"
                >
                  <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                </motion.span>
              </motion.button>

              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div
                    role="listbox"
                    aria-label="Sortieroptionen"
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-56 origin-top-right bg-card rounded-2xl border border-border shadow-xl p-1.5 z-40 space-y-0.5"
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = filters.sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, sortBy: opt.value as FilterState['sortBy'] }));
                            setShowSortDropdown(false);
                          }}
                          className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                            isSelected
                              ? 'bg-accent-tint text-accent'
                              : 'text-text-main hover:bg-surface'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Check className="w-4 h-4 text-accent shrink-0 stroke-[2.5]" />
                            </motion.span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Animierter Layout-Toggle: Raster / Liste */}
            <div
              role="group"
              aria-label="Darstellung"
              className="relative flex items-center p-0.5 rounded-xl border border-border bg-card overflow-hidden shrink-0 h-11"
            >
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Rasteransicht"
                title="Raster"
                className={`relative z-10 w-10 h-full min-w-[40px] flex items-center justify-center rounded-[10px] transition-colors cursor-pointer touch-manipulation ${
                  viewMode === 'grid' ? 'text-accent' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {viewMode === 'grid' && (
                  <motion.span
                    layoutId="explorer-view-mode-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-[10px] bg-accent-tint border border-accent/25 -z-10"
                  />
                )}
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Listenansicht"
                title="Liste"
                className={`relative z-10 w-10 h-full min-w-[40px] flex items-center justify-center rounded-[10px] transition-colors cursor-pointer touch-manipulation ${
                  viewMode === 'list' ? 'text-accent' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {viewMode === 'list' && (
                  <motion.span
                    layoutId="explorer-view-mode-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-[10px] bg-accent-tint border border-accent/25 -z-10"
                  />
                )}
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
                  onClick={() => navigate('/swipen')}
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
          ) : isCooked && !isNarrowed ? (
            <div className="bg-card rounded-3xl border border-border shadow-2xs px-6 py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-season-autumn-bg text-season-autumn flex items-center justify-center mx-auto" aria-hidden="true">
                <History className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-main">
                  Noch keine Gerichte gekocht
                </h3>
                <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
                  Sobald du ein Rezept zubereitest oder im Kochmodus abschließt, erscheint es hier in deinem Verlauf.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold transition-all active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
                >
                  Rezepte entdecken
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
