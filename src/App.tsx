import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Leaf } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
import { ScrollToTop } from './components/ScrollToTop';
import { CookingTimerBar } from './components/CookingTimerBar';
import { ExplorerLoadingSkeleton } from './components/ui/ExplorerLoadingSkeleton';

import RecipesExplorerPage from './pages/RecipesExplorerPage';

// Lazy-loaded Views (Code Splitting)
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const AllReviewsPage = lazy(() => import('./pages/AllReviewsPage'));
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
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
      <p className="text-xs font-medium text-text-muted mt-3 tracking-wide">Wird geladen...</p>
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
  const isExplorerRoute = location.pathname === '/' || location.pathname === '/favorites' || location.pathname === '/bookmarks';

  return (
    <div className="min-h-dvh bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans selection:bg-accent-tint selection:text-accent">
      {/* Scroll to Top on every route transition */}
      <ScrollToTop />

      {/* Top Main Navigation Header - only on non-detail pages */}
      {!isRecipeDetailPage && <HeaderWithScroll />}

      {/* Main Content Area rendered via React Router Routes with Suspense code-splitting */}
      <main className={`flex-1 w-full ${isRecipeDetailPage ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[calc(148px_+_env(safe-area-inset-top))] md:pt-[calc(116px_+_env(safe-area-inset-top))] lg:pt-[calc(96px_+_env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)_+_1rem)] space-y-5 sm:space-y-8'} ${showBottomTimerBar ? 'pb-40 sm:pb-44' : ''}`}>
        <Suspense fallback={isExplorerRoute ? <ExplorerLoadingSkeleton /> : <RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RecipesExplorerPage isFavorites={false} />} />
            <Route path="/favorites" element={<RecipesExplorerPage isFavorites={true} />} />
            <Route path="/bookmarks" element={<RecipesExplorerPage isBookmarks={true} />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/recipes/:id/reviews" element={<AllReviewsPage />} />
            <Route path="/fridge" element={<FridgeCookView />} />
            <Route path="/planner" element={<WeeklyPlannerView />} />
            <Route path="/shopping" element={<ShoppingListView />} />
            <Route path="/stats" element={<StatsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Persistent Cooking Timer Bar at bottom (visible when minimized or timer running) */}
      <CookingTimerBar />

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
        <footer className="mt-16 bg-card border-t border-border py-8 px-4 text-center text-xs text-text-muted">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-semibold text-text-main">
              <span className="p-1 rounded-md bg-accent text-on-accent flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
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
              <SpeedInsights />
            </ShoppingProvider>
          </PlannerProvider>
        </RecipeProvider>
      </SyncProvider>
    </ToastProvider>
  );
}

export default App;
