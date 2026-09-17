import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ToastProvider, 
  SyncProvider, 
  RecipeProvider, 
  PlannerProvider, 
  ShoppingProvider,
  useRecipes
} from './context';
import { Header } from './components/Header';
import { ScrollToTop } from './components/ScrollToTop';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { DishOfTheDay } from './components/DishOfTheDay';
import { FilterBar } from './components/FilterBar';
import { RecipeCard } from './components/RecipeCard';
import { CookingModeModal } from './components/CookingModeModal';
import { CookingTimerBar } from './components/CookingTimerBar';
import { FridgeCookView } from './components/FridgeCookView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { ShoppingListView } from './components/ShoppingListView';
import { StatsView } from './components/StatsView';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AddToMealPlanModal } from './components/AddToMealPlanModal';
import { FamilySyncModal } from './components/FamilySyncModal';
import { Search, Plus } from 'lucide-react';

interface RecipesExplorerViewProps {
  isFavorites: boolean;
}

function RecipesExplorerView({ isFavorites }: RecipesExplorerViewProps) {
  const {
    favorites,
    visibleRecipeCount,
    setVisibleRecipeCount,
    filters,
    setFilters,
    resetFilters,
    filteredRecipes,
    dishOfTheDay,
    setIsAddRecipeOpen,
  } = useRecipes();

  // Determine recipes to display depending on tab (Explore or Favorites)
  const displayedFilteredRecipes = isFavorites
    ? filteredRecipes.filter((r) => favorites.includes(r.id))
    : filteredRecipes;

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-200">
      {/* Dish of the Day (Spotlight on top of explore tab) */}
      {!isFavorites && filters.searchQuery === '' && filters.category === 'all' && dishOfTheDay && (
        <DishOfTheDay />
      )}

      {/* View Header with Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
            {isFavorites ? 'Deine Lieblingsrezepte ❤️' : 'Auswahl an Gerichten'}
          </h2>
          <p className="text-xs sm:text-sm text-[#7A7E7B] mt-0.5 font-normal">
            {isFavorites
              ? `${favorites.length} gespeicherte Favoriten`
              : '100% vegetarisch & vegan – nährstoffreich & gelingsicher'}
          </p>
        </div>

        {/* Action Buttons & Live Search */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            id="explorer-add-recipe-btn"
            type="button"
            onClick={() => setIsAddRecipeOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Neues Gericht per KI, Foto oder manuell hinzufügen"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Neues Gericht</span>
          </button>

          {/* Live Search Bar */}
          <div className="relative flex-1 sm:w-72">
            <input
              id="recipe-search-input"
              type="text"
              placeholder="Rezept oder Zutat suchen..."
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-white border border-[#ECEBE8] hover:border-[#4A7856]/40 rounded-xl pl-8 sm:pl-9 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#2D3E40] focus:outline-hidden focus:border-[#4A7856] shadow-2xs transition-all placeholder-[#7A7E7B]"
            />
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7A7E7B] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A7E7B] hover:text-[#2D3E40] p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <FilterBar />

      {/* Empty State */}
      {displayedFilteredRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#ECEBE8] shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center mx-auto text-2xl font-bold">
            🌱
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-[#2D3E40]">
              {isFavorites ? 'Noch keine Favoriten vorhanden' : 'Keine passenden Rezepte gefunden'}
            </h3>
            <p className="text-xs sm:text-sm text-[#7A7E7B] max-w-md mx-auto">
              {isFavorites
                ? 'Klicke auf das Herz-Symbol bei einem Rezept, um es in deiner Favoritenliste zu speichern.'
                : 'Passe deine Filterkriterien an oder suche nach einer anderen Zutat.'}
            </p>
          </div>
          {Boolean(filters.searchQuery || filters.category !== 'all' || filters.difficulty !== 'all' || filters.maxTime > 0 || filters.minProtein > 0 || filters.selectedTags.length > 0) && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-[#4A7856] text-white text-xs sm:text-sm font-semibold hover:bg-[#3D6447] transition-colors cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        /* Recipes Grid with Progressive Pagination */
        <div className="space-y-6 sm:space-y-8">
          {(() => {
            const visibleRecipes = displayedFilteredRecipes.slice(0, visibleRecipeCount);
            const remainingCount = displayedFilteredRecipes.length - visibleRecipes.length;
            const hasMore = remainingCount > 0;

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {visibleRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 sm:pt-6">
                    <button
                      id="load-more-recipes-btn"
                      type="button"
                      onClick={() => setVisibleRecipeCount((prev) => Math.min(prev + 8, displayedFilteredRecipes.length))}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#2D3E40] text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      Mehr anzeigen ({remainingCount} weitere {remainingCount === 1 ? 'Rezept' : 'Rezepte'})
                    </button>
                    <button
                      id="load-all-recipes-btn"
                      type="button"
                      onClick={() => setVisibleRecipeCount(displayedFilteredRecipes.length)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F1F5F2] hover:bg-[#E3EBE5] text-[#4A7856] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      Alle anzeigen ({displayedFilteredRecipes.length})
                    </button>
                  </div>
                )}

                {displayedFilteredRecipes.length > 0 && !hasMore && displayedFilteredRecipes.length > 8 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-[#7A7E7B]">
                      ✓ Alle {displayedFilteredRecipes.length} Rezepte geladen
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    cookingModeRecipe,
    isCookingMinimized,
    cookingTimer,
  } = useRecipes();

  // Backward compatibility: If URL has legacy query param ?recipe=id, redirect cleanly to /recipes/:id
  useEffect(() => {
    const legacyRecipeId = searchParams.get('recipe');
    if (legacyRecipeId) {
      navigate(`/recipes/${legacyRecipeId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const showBottomTimerBar = Boolean(cookingTimer || (cookingModeRecipe && isCookingMinimized));

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3E40] flex flex-col font-sans selection:bg-[#F1F5F2] selection:text-[#4A7856]">
      {/* Scroll to Top on every route transition */}
      <ScrollToTop />

      {/* Top Main Navigation Header - synchronized with React Router location */}
      <Header />

      {/* Main Content Area rendered via React Router Routes */}
      <main className={`flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8 ${showBottomTimerBar ? 'pb-20 sm:pb-24' : ''}`}>
        <Routes>
          <Route path="/" element={<RecipesExplorerView isFavorites={false} />} />
          <Route path="/favorites" element={<RecipesExplorerView isFavorites={true} />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/fridge" element={<FridgeCookView />} />
          <Route path="/planner" element={<WeeklyPlannerView />} />
          <Route path="/shopping" element={<ShoppingListView />} />
          <Route path="/stats" element={<StatsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Persistent Cooking Timer Bar at bottom (visible when minimized or timer running) */}
      <CookingTimerBar />

      {/* Fullscreen Interactive Cooking Mode (only active when not minimized) */}
      {cookingModeRecipe && !isCookingMinimized && <CookingModeModal />}

      {/* Add Recipe Modal (Manual, AI Generator & Photo Scan) */}
      <AddRecipeModal />

      {/* Add To Meal Plan Modal (Day & Time selection) */}
      <AddToMealPlanModal />

      {/* Family Sync Modal */}
      <FamilySyncModal />

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-[#ECEBE8] py-8 px-4 text-center text-xs text-[#7A7E7B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-[#2D3E40]">
            <span className="p-1 rounded-md bg-[#4A7856] text-white text-xs">🌱</span>
            <span>VeggieChef • 100% Vegetarische & Vegane Koch-App</span>
          </div>
          <div>
            Mit Liebe zum Kochen, Gesundheit & Umwelt-Impact entwickelt.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <SyncProvider>
        <RecipeProvider>
          <PlannerProvider>
            <ShoppingProvider>
              <MainApp />
            </ShoppingProvider>
          </PlannerProvider>
        </RecipeProvider>
      </SyncProvider>
    </ToastProvider>
  );
}

export default App;
