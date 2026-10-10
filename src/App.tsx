import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ToastProvider, 
  SyncProvider, 
  RecipeProvider, 
  PlannerProvider, 
  ShoppingProvider,
  useRecipes,
  useSync,
  usePlanner,
} from './context';
import { HeaderWithScroll } from './components/navigation/HeaderWithScroll';
import { BottomNav } from './components/navigation/BottomNav';
import { ScrollToTop } from './components/ScrollToTop';
import { CookingTimerBar } from './components/CookingTimerBar';
import { ExplorerLoadingSkeleton } from './components/ui/ExplorerLoadingSkeleton';

/**
 * Opt-in fallback: if the bottom navigation feels too cramped in the Safari
 * browser, set this to `true` to render the compact tab row on top instead
 * (at the top of the header) and hide the bottom nav.
 */
const USE_TOP_TABS_FALLBACK = false;
import RecipesExplorerPage from './pages/RecipesExplorerPage';

// Lazy-loaded Views (Code Splitting)
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const FridgeCookView = lazy(() => import('./components/FridgeCookView').then((m) => ({ default: m.FridgeCookView })));
const WeeklyPlannerView = lazy(() => import('./components/WeeklyPlannerView').then((m) => ({ default: m.WeeklyPlannerView })));
const ShoppingListView = lazy(() => import('./components/ShoppingListView').then((m) => ({ default: m.ShoppingListView })));
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));

// Lazy-loaded Modals (On-demand Chunking)
const CookingModeModal = lazy(() => import('./components/CookingModeModal').then((m) => ({ default: m.CookingModeModal })));
const AddRecipeModal = lazy(() => import('./components/AddRecipeModal').then((m) => ({ default: m.AddRecipeModal })));
const AddToMealPlanModal = lazy(() => import('./components/AddToMealPlanModal').then((m) => ({ default: m.AddToMealPlanModal })));
const FamilySyncModal = lazy(() => import('./components/FamilySyncModal').then((m) => ({ default: m.FamilySyncModal })));

/**
 * Subtle, brand-consistent loading indicator during asynchronous route transitions
 */
function RouteLoadingFallback() {
  return (
    <div className="min-h-[45vh] flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-150">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#ECEBE8] border-t-[#4A7856] animate-spin" />
        <span className="absolute text-sm">🌱</span>
      </div>
      <p className="text-xs font-medium text-[#686E6A] mt-3 tracking-wide">Wird geladen...</p>
    </div>
  );
}


function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isRecipeDetailPage = location.pathname.startsWith('/recipes/');

  const {
    cookingModeRecipe,
    isCookingMinimized,
    cookingTimer,
    isAddRecipeOpen,
  } = useRecipes();

  const { isSyncModalOpen } = useSync();
  const { recipeToAddToPlan } = usePlanner();

  // Backward compatibility: If URL has legacy query param ?recipe=id, redirect cleanly to /recipes/:id
  useEffect(() => {
    const legacyRecipeId = searchParams.get('recipe');
    if (legacyRecipeId) {
      navigate(`/recipes/${legacyRecipeId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const showBottomTimerBar = Boolean(cookingTimer || (cookingModeRecipe && isCookingMinimized));
  const isExplorerRoute = location.pathname === '/' || location.pathname === '/favorites';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans selection:bg-[#F1F5F2] selection:text-[#4A7856]">
      {/* Scroll to Top on every route transition */}
      <ScrollToTop />

      {/* Top Main Navigation Header - only on non-detail pages */}
      {!isRecipeDetailPage && <HeaderWithScroll useTopTabs={USE_TOP_TABS_FALLBACK} />}

      {/* Main Content Area rendered via React Router Routes with Suspense code-splitting */}
      <main className={`flex-1 w-full ${isRecipeDetailPage ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 md:pt-36 pb-32 sm:pb-36 space-y-5 sm:space-y-8'} ${showBottomTimerBar ? 'pb-40 sm:pb-44' : ''}`}>
        <Suspense fallback={isExplorerRoute ? <ExplorerLoadingSkeleton /> : <RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RecipesExplorerPage isFavorites={false} />} />
            <Route path="/favorites" element={<RecipesExplorerPage isFavorites={true} />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/fridge" element={<FridgeCookView />} />
            <Route path="/planner" element={<WeeklyPlannerView />} />
            <Route path="/shopping" element={<ShoppingListView />} />
            <Route path="/stats" element={<StatsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Navigation (non-detail pages; hidden on desktop where the header tabs show) */}
      {!isRecipeDetailPage && <BottomNav visible={!USE_TOP_TABS_FALLBACK} />}

      {/* Persistent Cooking Timer Bar at bottom (visible when minimized or timer running) */}
      <CookingTimerBar offsetForBottomNav={!isRecipeDetailPage} />

      {/* Fullscreen Interactive Cooking Mode (loaded on-demand when active and not minimized) */}
      {cookingModeRecipe && !isCookingMinimized && (
        <Suspense fallback={null}>
          <CookingModeModal />
        </Suspense>
      )}

      {/* Add Recipe Modal (Manual, AI Generator & Photo Scan - loaded on demand) */}
      {isAddRecipeOpen && (
        <Suspense fallback={null}>
          <AddRecipeModal />
        </Suspense>
      )}

      {/* Add To Meal Plan Modal (Day & Time selection - loaded on demand) */}
      {recipeToAddToPlan && (
        <Suspense fallback={null}>
          <AddToMealPlanModal />
        </Suspense>
      )}

      {/* Family Sync Modal (loaded on demand) */}
      {isSyncModalOpen && (
        <Suspense fallback={null}>
          <FamilySyncModal />
        </Suspense>
      )}

      {/* Footer - only on non-detail pages */}
      {!isRecipeDetailPage && (
        <footer className="mt-16 bg-white border-t border-[#ECEBE8] py-8 px-4 text-center text-xs text-[#686E6A]">
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
      )}
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
