import React, { useState } from 'react';
import { 
  ToastProvider, 
  SyncProvider, 
  RecipeProvider, 
  PlannerProvider, 
  ShoppingProvider,
  useRecipes
} from './context';
import { Header } from './components/Header';
import { DishOfTheDay } from './components/DishOfTheDay';
import { FilterBar } from './components/FilterBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeModal } from './components/RecipeModal';
import { CookingModeModal } from './components/CookingModeModal';
import { CookingTimerBar } from './components/CookingTimerBar';
import { FridgeCookView } from './components/FridgeCookView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { ShoppingListView } from './components/ShoppingListView';
import { StatsView } from './components/StatsView';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AddToMealPlanModal } from './components/AddToMealPlanModal';
import { FamilySyncModal } from './components/FamilySyncModal';
import { ViewMode } from './types';
import { Search, Plus } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ViewMode>('recipes');
  const {
    favorites,
    visibleRecipeCount,
    setVisibleRecipeCount,
    filters,
    setFilters,
    filteredRecipes,
    dishOfTheDay,
    selectedRecipe,
    setIsAddRecipeOpen,
    cookingModeRecipe,
    cookingTimer,
  } = useRecipes();

  // Determine recipes to display depending on tab (Explore or Favorites)
  const displayedFilteredRecipes = activeTab === 'favorites'
    ? filteredRecipes.filter((r) => favorites.includes(r.id))
    : filteredRecipes;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3E40] flex flex-col font-sans selection:bg-[#F1F5F2] selection:text-[#4A7856]">
      {/* Top Main Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Persistent Cooking Timer Bar (visible when browsing outside cooking mode) */}
      {cookingTimer && !cookingModeRecipe && <CookingTimerBar />}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* RECIPES EXPLORE VIEW & FAVORITES */}
        {(activeTab === 'recipes' || activeTab === 'favorites') && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-200">
            {/* Dish of the Day (Spotlight on top of explore tab) */}
            {activeTab === 'recipes' && filters.searchQuery === '' && filters.category === 'all' && dishOfTheDay && (
              <DishOfTheDay />
            )}

            {/* View Header with Search Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
                  {activeTab === 'favorites' ? 'Deine Lieblingsrezepte ❤️' : 'Auswahl an Gerichten'}
                </h2>
                <p className="text-xs sm:text-sm text-[#7A7E7B] mt-0.5 font-normal">
                  {activeTab === 'favorites'
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
                      onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A7E7B] hover:text-[#2D3E40] p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter & Sorting Controls */}
            <FilterBar />

            {/* Recipe Cards Grid */}
            {displayedFilteredRecipes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#ECEBE8] space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-[#FAF9F6] border border-[#ECEBE8] text-[#7A7E7B] flex items-center justify-center mx-auto text-2xl">
                  🔍
                </div>
                <h3 className="text-lg font-semibold text-[#2D3E40]">
                  Keine Gerichte für deine Filtereinstellungen gefunden
                </h3>
                <p className="text-xs text-[#7A7E7B] max-w-sm mx-auto">
                  Versuche, die Zeit-, Nährstoff- oder Kategorie-Filter zurückzusetzen oder den Suchbegriff anzupassen.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      category: 'all',
                      searchQuery: '',
                      onlyVegan: false,
                      maxTime: 0,
                      minProtein: 0,
                      maxCalories: 0,
                      minFiber: 0,
                      difficulty: 'all',
                      selectedTags: [],
                      sortBy: 'featured',
                    })
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#2D3E40] text-white text-xs font-semibold shadow-xs hover:bg-[#1F2C2D] transition-colors cursor-pointer"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const isSearching = Boolean(filters.searchQuery && filters.searchQuery.trim().length > 0);
                  const displayCount = isSearching ? displayedFilteredRecipes.length : visibleRecipeCount;

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                        {displayedFilteredRecipes.slice(0, displayCount).map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                          />
                        ))}
                      </div>

                      {/* Pagination Controls ("Mehr laden" & "Alle laden") */}
                      {!isSearching && (
                        <div className="flex flex-col items-center justify-center pt-6 pb-2 gap-3">
                          {displayedFilteredRecipes.length > visibleRecipeCount ? (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <button
                                id="load-more-recipes-btn"
                                onClick={() => setVisibleRecipeCount((prev) => prev + 8)}
                                className="group px-6 py-3 rounded-2xl bg-white border border-[#ECEBE8] hover:border-[#4A7856] text-[#2D3E40] hover:text-[#4A7856] font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-2.5 cursor-pointer"
                              >
                                <span>Mehr Gerichte laden</span>
                                <span className="text-xs bg-[#F1F5F2] group-hover:bg-[#4A7856] group-hover:text-white text-[#4A7856] px-2.5 py-0.5 rounded-full font-bold transition-colors">
                                  +{Math.min(8, displayedFilteredRecipes.length - visibleRecipeCount)}
                                </span>
                              </button>

                              <button
                                id="load-all-recipes-btn"
                                onClick={() => setVisibleRecipeCount(displayedFilteredRecipes.length)}
                                className="px-6 py-3 rounded-2xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                              >
                                <span>Alle laden ({displayedFilteredRecipes.length} Rezepte)</span>
                              </button>
                            </div>
                          ) : (
                            displayedFilteredRecipes.length > 8 && (
                              <div className="flex items-center gap-3 text-xs text-[#7A7E7B]">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F1F5F2] text-[#4A7856] font-semibold">
                                  ✓ Alle {displayedFilteredRecipes.length} Gerichte geladen
                                </span>
                                <button
                                  id="collapse-recipes-btn"
                                  onClick={() => setVisibleRecipeCount(8)}
                                  className="text-xs text-[#7A7E7B] hover:text-[#2D3E40] underline cursor-pointer"
                                >
                                  Weniger anzeigen
                                </button>
                              </div>
                            )
                          )}

                          <p className="text-xs text-[#7A7E7B]">
                            Zeige {Math.min(displayCount, displayedFilteredRecipes.length)} von {displayedFilteredRecipes.length} Gerichten
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* FRIDGE COOK VIEW (Resteverwerter / KI-Zutatentausch) */}
        {activeTab === 'fridge' && <FridgeCookView />}

        {/* WEEKLY MEAL PLANNER VIEW */}
        {activeTab === 'planner' && <WeeklyPlannerView />}

        {/* SHOPPING LIST VIEW */}
        {activeTab === 'shopping' && <ShoppingListView />}

        {/* STATISTICS & IMPACT VIEW */}
        {activeTab === 'stats' && <StatsView />}
      </main>

      {/* Detail Recipe Modal */}
      {selectedRecipe && <RecipeModal />}

      {/* Fullscreen Interactive Cooking Mode */}
      {cookingModeRecipe && <CookingModeModal />}

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
