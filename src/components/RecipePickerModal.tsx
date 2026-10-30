import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  ChevronDown,
  Clock,
  Star,
  ChefHat,
  Heart,
  Dumbbell,
  X,
  Sparkles,
  Utensils,
  Flame,
  Salad,
  Sun,
  Cookie,
  Leaf,
  SlidersHorizontal,
  Check,
  Bookmark,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Recipe, FilterState } from '../types';
import { RecipeCardUnified } from './ui/RecipeCardUnified';
import { CloseButton } from './ui/CloseButton';
import { useRecipes } from '../context/RecipeContext';
import { buildCategoryOptions, SORT_OPTIONS } from '../utils/discover';
import { sortRecipes } from '../utils/helpers';

function getPickerCategoryIcon(value: string) {
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

export interface RecipePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  badge?: string;
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  actionLabel?: string;
  actionIcon?: 'plus' | 'eye';
  emptyTitle?: string;
  emptySubtitle?: string;
}

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  isOpen,
  onClose,
  recipes: inputRecipes,
  onSelectRecipe,
  emptyTitle,
  emptySubtitle,
}) => {
  const { favorites, cookedLogs } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<FilterState['sortBy']>('featured');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyVegan, setOnlyVegan] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [highProteinOnly, setHighProteinOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => buildCategoryOptions(inputRecipes), [inputRecipes]);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setCategory('all');
      setOnlyFavorites(false);
      setOnlyVegan(false);
      setQuickOnly(false);
      setHighProteinOnly(false);
      setSortBy('featured');
      setShowFilters(false);
      setShowSortDropdown(false);
    }
  }, [isOpen]);

  // Close sort dropdown on outside click or Escape
  useEffect(() => {
    if (!showSortDropdown) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (sortRef.current && !sortRef.current.contains(target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Filter & Sort recipes
  const filteredRecipes = useMemo(() => {
    let list = inputRecipes.filter((recipe) => {
      if (category !== 'all' && recipe.category !== category) return false;
      if (onlyVegan && !recipe.isVegan) return false;
      if (onlyFavorites && !favorites.includes(recipe.id)) return false;
      if (quickOnly && (recipe.totalTimeMinutes || 0) > 30) return false;
      if (highProteinOnly && (recipe.nutrients?.protein || 0) < 20) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = recipe.title.toLowerCase().includes(q);
      const inSubtitle = recipe.subtitle?.toLowerCase().includes(q);
      const inIngredients = recipe.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
      const inTags = recipe.tags?.some((t) => t.toLowerCase().includes(q));
      return Boolean(inTitle || inSubtitle || inIngredients || inTags);
    });

    return sortRecipes(list, sortBy, cookedLogs);
  }, [
    inputRecipes,
    category,
    onlyVegan,
    onlyFavorites,
    quickOnly,
    highProteinOnly,
    searchQuery,
    sortBy,
    favorites,
    cookedLogs,
  ]);

  const hasActiveFilter =
    category !== 'all' || onlyVegan || onlyFavorites || quickOnly || highProteinOnly;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="recipe-picker-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Rezepte auswählen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[80] bg-text-main/55 backdrop-blur-xs flex items-center justify-center sm:p-4 touch-none overscroll-contain"
        >
          <motion.div
            key="recipe-picker-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-none sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full flex flex-col h-dvh sm:h-[88dvh] sm:max-h-[860px] shadow-2xl border-0 sm:border border-border overscroll-contain overflow-hidden"
          >
            {/* Top Toolbar: Suchleiste (mit dezentem Filter-Icon rechts, das zu einem Kreuz wird), animiertes Sortier-Dropdown & Schließen-Button */}
            <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-4 pb-3 bg-card border-b border-border shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Suchleiste mit integriertem Filter-Toggle rechts */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-[18px] h-[18px] text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rezept oder Zutat suchen …"
                    className={`w-full h-11 min-h-[44px] pl-10 ${
                      searchQuery ? 'pr-20' : 'pr-12'
                    } rounded-xl bg-surface/70 focus:bg-card border border-border focus:border-accent text-text-main placeholder:text-text-muted text-base font-medium focus:outline-hidden transition-all shadow-2xs [&::-webkit-search-cancel-button]:hidden`}
                  />

                  {/* Rechts in der Suchleiste: Optionaler Text-Löschen-Button + Dezentes Filter-Icon (wird bei Klick dynamisch zum Kreuz) */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <AnimatePresence>
                      {searchQuery && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Suchtext löschen"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card cursor-pointer touch-manipulation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      id="picker-toggle-filters-btn"
                      onClick={() => setShowFilters((prev) => !prev)}
                      aria-label={showFilters ? 'Filter schließen' : 'Filter öffnen'}
                      aria-expanded={showFilters}
                      title={showFilters ? 'Filter ausblenden' : 'Filter einblenden'}
                      className={`relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                        showFilters
                          ? 'bg-accent-tint text-accent'
                          : hasActiveFilter
                          ? 'text-accent hover:bg-card'
                          : 'text-text-muted hover:text-text-main hover:bg-card'
                      }`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {showFilters ? (
                          <motion.span
                            key="filter-close-cross"
                            initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-center justify-center"
                          >
                            <X className="w-[18px] h-[18px] stroke-[2.2]" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="filter-open-icon"
                            initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-center justify-center"
                          >
                            <SlidersHorizontal className="w-[17px] h-[17px]" />
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Dezenter Indikator-Punkt, falls Filter aktiv aber Leiste eingeklappt */}
                      {!showFilters && hasActiveFilter && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-card" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Eigenes UI/UX-animiertes Sortierungs-Dropdown */}
                <div className="relative shrink-0" ref={sortRef}>
                  <button
                    type="button"
                    id="picker-sort-dropdown-btn"
                    onClick={() => setShowSortDropdown((prev) => !prev)}
                    aria-expanded={showSortDropdown}
                    aria-label="Sortierung wählen"
                    className={`h-11 min-h-[44px] px-3 sm:px-3.5 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs ${
                      showSortDropdown
                        ? 'bg-accent-tint border-accent/40 text-accent ring-2 ring-accent/20'
                        : 'bg-surface/70 hover:bg-card border-border hover:border-accent/50 text-text-main'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline max-w-[140px] truncate">
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sortierung'}
                    </span>
                    <motion.span
                      animate={{ rotate: showSortDropdown ? 180 : 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-flex items-center justify-center text-text-muted"
                    >
                      <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 top-full mt-2 w-56 origin-top-right bg-card rounded-2xl border border-border shadow-xl p-1.5 z-50 space-y-0.5"
                      >
                        {SORT_OPTIONS.map((opt) => {
                          const isSelected = sortBy === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSortBy(opt.value as FilterState['sortBy']);
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

                {/* Schließen-Button im Stil der App */}
                <CloseButton onClick={onClose} ariaLabel="Schließen" />
              </div>

              {/* Dynamisch ausklappbare Badge-Zeile (erscheint nur bei Klick auf das Filter-Icon in der Suchleiste) */}
              <AnimatePresence initial={false}>
                {showFilters && (
                  <motion.div
                    key="picker-dynamic-filter-bar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.2, ease: 'easeInOut' },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 -mx-3.5 sm:mx-0">
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-3.5 sm:px-0 py-0.5 mask-fade-x">
                        {/* Alle */}
                        <button
                          type="button"
                          onClick={() => {
                            setCategory('all');
                            setOnlyVegan(false);
                            setOnlyFavorites(false);
                            setQuickOnly(false);
                            setHighProteinOnly(false);
                          }}
                          className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            !hasActiveFilter
                              ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                              : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Alle</span>
                        </button>

                        {/* Favoriten */}
                        <button
                          type="button"
                          id="picker-favorites-filter-btn"
                          onClick={() => setOnlyFavorites((prev) => !prev)}
                          className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            onlyFavorites
                              ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                              : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 shrink-0 ${
                              onlyFavorites ? 'fill-favorite text-favorite' : 'text-favorite'
                            }`}
                            aria-hidden="true"
                          />
                          <span>Favoriten</span>
                        </button>

                        {/* Vegan */}
                        <button
                          type="button"
                          id="picker-vegan-filter-btn"
                          onClick={() => setOnlyVegan((prev) => !prev)}
                          className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            onlyVegan
                              ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                              : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                          }`}
                        >
                          <Leaf className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Vegan</span>
                        </button>

                        {/* Schnell (<= 30 Min.) */}
                        <button
                          type="button"
                          onClick={() => setQuickOnly((prev) => !prev)}
                          className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            quickOnly
                              ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                              : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                          }`}
                        >
                          <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Bis 30 Min.</span>
                        </button>

                        {/* High Protein */}
                        <button
                          type="button"
                          onClick={() => setHighProteinOnly((prev) => !prev)}
                          className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            highProteinOnly
                              ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                              : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                          }`}
                        >
                          <Dumbbell className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>High Protein</span>
                        </button>

                        {categories.length > 0 && (
                          <div className="h-5 w-px bg-border shrink-0 mx-0.5" aria-hidden="true" />
                        )}

                        {/* Kategorien wie auf der Startseite */}
                        {categories.map((cat) => {
                          const selected = category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setCategory(selected ? 'all' : cat.value)}
                              className={`h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                                selected
                                  ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                                  : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                              }`}
                            >
                              {getPickerCategoryIcon(cat.value)}
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recipes Content: Exakt die Kacheln aus dem Raster-Modus der Startseite */}
            <div className="overflow-y-auto flex-1 overscroll-contain px-3.5 sm:px-6 py-4">
              {filteredRecipes.length === 0 ? (
                <div className="bg-surface/60 rounded-2xl border border-border px-6 py-12 text-center space-y-3 my-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-tint text-accent flex items-center justify-center mx-auto">
                    {inputRecipes.length === 0 ? (
                      <Bookmark className="w-6 h-6" />
                    ) : (
                      <Search className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-text-main">
                      {inputRecipes.length === 0
                        ? emptyTitle || 'Noch keine Rezepte vorhanden'
                        : 'Keine passenden Rezepte gefunden'}
                    </p>
                    <p className="text-sm text-text-muted">
                      {inputRecipes.length === 0
                        ? emptySubtitle || 'Wische im Entdecken-Modus nach rechts, um Rezepte auf deiner Merkliste zu speichern.'
                        : 'Passe deinen Suchbegriff oder deine Filter an.'}
                    </p>
                  </div>
                  {(hasActiveFilter || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('all');
                        setOnlyVegan(false);
                        setOnlyFavorites(false);
                        setQuickOnly(false);
                        setHighProteinOnly(false);
                        setSearchQuery('');
                      }}
                      className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      Alle Filter zurücksetzen
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-6">
                  {filteredRecipes.map((recipe, idx) => (
                    <RecipeCardUnified
                      key={recipe.id}
                      recipe={recipe}
                      variant="regular"
                      index={idx}
                      onSelect={(r) => {
                        onSelectRecipe(r);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecipePickerModal;

