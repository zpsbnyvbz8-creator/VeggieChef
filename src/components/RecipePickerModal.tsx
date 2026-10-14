import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ChevronDown, Clock, Star, ChefHat, Heart, Zap, Dumbbell, X, Plus, Eye } from 'lucide-react';
import { Recipe, FilterState } from '../types';
import { RecipeImage } from './RecipeImage';
import { HeartButton } from './ui/HeartButton';
import { CloseButton } from './ui/CloseButton';
import { useRecipes } from '../context/RecipeContext';
import { getRecipeDiet, SORT_OPTIONS } from '../utils/discover';
import { sortRecipes } from '../utils/helpers';

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  Einfach: 'Einfach',
  Mittel: 'Mittel',
  Anspruchsvoll: 'Aufwendig',
};

export interface RecipePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  badge?: string;
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  actionLabel?: string;
  actionIcon?: 'plus' | 'eye';
}

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  isOpen,
  onClose,
  title = 'Merkliste',
  badge,
  recipes: inputRecipes,
  onSelectRecipe,
  actionLabel = 'Rezept ansehen',
  actionIcon = 'eye',
}) => {
  const { favorites, toggleFavorite, cookedLogs } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<FilterState['sortBy']>('featured');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyVegan, setOnlyVegan] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [highProteinOnly, setHighProteinOnly] = useState(false);

  // Filter & Sort recipes
  const filteredRecipes = useMemo(() => {
    let list = [...inputRecipes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const inTitle = r.title.toLowerCase().includes(q);
        const inSubtitle = r.subtitle?.toLowerCase().includes(q);
        const inIngredients = r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
        const inTags = r.tags?.some((t) => t.toLowerCase().includes(q));
        return inTitle || inSubtitle || inIngredients || inTags;
      });
    }

    if (onlyFavorites) {
      list = list.filter((r) => favorites.includes(r.id));
    }

    if (onlyVegan) {
      list = list.filter((r) => r.isVegan);
    }

    if (quickOnly) {
      list = list.filter((r) => r.totalTimeMinutes <= 30);
    }

    if (highProteinOnly) {
      list = list.filter((r) => (r.nutrients?.protein || 0) >= 20);
    }

    return sortRecipes(list, sortBy, cookedLogs);
  }, [inputRecipes, searchQuery, sortBy, onlyFavorites, onlyVegan, quickOnly, highProteinOnly, favorites, cookedLogs]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full p-3.5 sm:p-5 flex flex-col h-[94vh] sm:h-[88vh] max-h-[860px] shadow-2xl border border-border animate-in zoom-in-95 duration-150 overscroll-contain overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Titel, optionaler Badge & CloseButton */}
        <div className="flex items-center justify-between border-b border-border pb-3 gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {badge && (
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-semibold text-accent bg-accent-tint border border-border shrink-0">
                {badge}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-extrabold text-text-main truncate">
              {title}
            </h3>
            <span className="hidden md:inline text-sm font-medium text-text-muted">
              ({filteredRecipes.length} Rezepte)
            </span>
          </div>
          <CloseButton onClick={onClose} ariaLabel="Schließen" size="md" />
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="py-2.5 flex flex-col gap-2 border-b border-border shrink-0">
          {/* Row 1: Longer search input & Sort dropdown */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gericht oder Zutat suchen..."
                className="w-full h-11 min-h-[44px] pl-11 pr-10 py-2.5 rounded-xl border border-border bg-surface text-text-main placeholder:text-text-muted text-base font-medium focus:bg-card focus:outline-hidden focus:border-accent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Suchbegriff löschen"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sortierung wie Startseite */}
            <div className="relative shrink-0">
              <select
                id="picker-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FilterState['sortBy'])}
                className="appearance-none h-11 min-h-[44px] bg-surface border border-border hover:border-accent/50 text-text-main text-[15px] sm:text-[16px] font-medium rounded-xl pl-9 pr-9 py-2 cursor-pointer focus:outline-hidden focus:border-accent transition-colors"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="w-4 h-4 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Row 2: Filter pills wie auf Startseite */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 overflow-x-auto py-1 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-sm">
            {/* Alle Button */}
            <button
              type="button"
              onClick={() => {
                setOnlyVegan(false);
                setOnlyFavorites(false);
                setQuickOnly(false);
                setHighProteinOnly(false);
              }}
              className={`inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border ${
                !onlyVegan && !onlyFavorites && !quickOnly && !highProteinOnly
                  ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                  : 'bg-card text-text-muted border-border hover:bg-surface hover:text-text-main font-medium'
              }`}
            >
              <span>Alle ({inputRecipes.length})</span>
            </button>

            {/* Gelikt / Favoriten Pill */}
            <button
              type="button"
              onClick={() => setOnlyFavorites((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                onlyFavorites
                  ? 'bg-favorite text-on-accent border-transparent font-semibold shadow-xs'
                  : 'bg-card text-text-muted border-border hover:bg-surface hover:text-text-main font-medium'
              }`}
            >
              <Heart className={`w-4 h-4 shrink-0 transition-colors ${onlyFavorites ? 'fill-current' : 'text-text-muted group-hover:text-favorite'}`} />
              <span>Gelikt ({inputRecipes.filter((r) => favorites.includes(r.id)).length})</span>
            </button>

            {/* Schnell Pill (≤ 30 Min) */}
            <button
              type="button"
              onClick={() => setQuickOnly((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                quickOnly
                  ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                  : 'bg-card text-text-muted border-border hover:bg-surface hover:text-text-main font-medium'
              }`}
            >
              <Zap className={`w-4 h-4 shrink-0 transition-colors ${quickOnly ? 'text-on-accent' : 'text-text-muted group-hover:text-text-main'}`} />
              <span>Schnell (≤30m)</span>
            </button>

            {/* High Protein Pill */}
            <button
              type="button"
              onClick={() => setHighProteinOnly((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                highProteinOnly
                  ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                  : 'bg-card text-text-muted border-border hover:bg-surface hover:text-text-main font-medium'
              }`}
            >
              <Dumbbell className={`w-4 h-4 shrink-0 transition-colors ${highProteinOnly ? 'text-on-accent' : 'text-text-muted group-hover:text-text-main'}`} />
              <span>High Protein</span>
            </button>
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="overflow-y-auto pr-1 flex-1 overscroll-contain pt-3">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <p className="text-base font-semibold text-text-main">Keine passenden Rezepte gefunden</p>
              <p className="text-sm text-text-muted">Passe deinen Suchbegriff oder Filter an.</p>
              {(onlyVegan || onlyFavorites || quickOnly || highProteinOnly || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyVegan(false);
                    setOnlyFavorites(false);
                    setQuickOnly(false);
                    setHighProteinOnly(false);
                    setSearchQuery('');
                  }}
                  className="mt-2 text-sm font-semibold text-accent hover:underline cursor-pointer"
                >
                  Filter aufheben
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
              {filteredRecipes.map((recipe) => {
                const isFav = favorites.includes(recipe.id);
                const diet = getRecipeDiet(recipe);

                return (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      onSelectRecipe(recipe);
                      onClose();
                    }}
                    className="bg-card rounded-2xl border border-border hover:border-accent transition-all cursor-pointer group shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative touch-manipulation active:scale-[0.99]"
                  >
                    {/* Bild-Header ohne Vegan-Badge, mit 44px HeartButton */}
                    <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-surface shrink-0">
                      <RecipeImage
                        recipe={recipe}
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt={recipe.title}
                      />

                      {/* Dezent Vegetarisch Label falls vegetarisch */}
                      {diet === 'vegetarisch' && (
                        <div className="absolute top-2.5 left-2.5 pointer-events-none">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-on-accent text-xs font-semibold border border-white/20 shadow-xs">
                            Vegetarisch
                          </span>
                        </div>
                      )}

                      {/* HeartButton oben rechts */}
                      <HeartButton
                        id={`fav-picker-${recipe.id}`}
                        variant="on-image"
                        isFavorite={isFav}
                        onToggle={() => toggleFavorite(recipe.id)}
                        className="absolute top-2 right-2 z-10"
                      />
                    </div>

                    {/* Rezept-Details mit Zeit · Sterne · Schwierigkeit (Kalorien & Protein ersetzt!) */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-[17px] font-bold text-text-main group-hover:text-accent leading-snug transition-colors line-clamp-2">
                          {recipe.title}
                        </h4>
                        <div className="flex items-center gap-2.5 text-[13px] font-medium text-text-muted mt-2 pt-2 border-t border-border flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            <span>{recipe.totalTimeMinutes} Min.</span>
                          </span>
                          {recipe.rating > 0 && (
                            <>
                              <span className="text-text-muted/50" aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-[#E67E22] text-[#E67E22]" />
                                <span>{recipe.rating.toFixed(1).replace('.', ',')}</span>
                              </span>
                            </>
                          )}
                          <span className="text-text-muted/50" aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <ChefHat className="w-3.5 h-3.5 text-text-muted" />
                            <span>{DIFFICULTY_LABEL[recipe.difficulty] || recipe.difficulty}</span>
                          </span>
                        </div>
                      </div>

                      {/* Vollwertiger Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecipe(recipe);
                          onClose();
                        }}
                        className="w-full h-11 min-h-[44px] rounded-xl bg-accent group-hover:bg-accent-hover text-on-accent text-sm font-semibold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-2"
                        title={actionLabel}
                      >
                        {actionIcon === 'plus' ? <Plus className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{actionLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipePickerModal;
