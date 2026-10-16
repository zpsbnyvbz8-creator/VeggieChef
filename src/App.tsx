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
import { AddRecipeModal } from './components/AddRecipeModal';

// Resilient dynamic importer that retries chunk downloads if network or dev server momentarily drops
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>
) {
  return lazy(async () => {
    try {
      const module = await factory();
      if ('default' in module && module.default) {
        return { default: module.default as T };
      }
      const keys = Object.keys(module);
      const named = keys.find((k) => typeof module[k] === 'function');
      return { default: (named ? module[named] : module) as T };
    } catch (error) {
      console.warn('Dynamic chunk load failed, retrying once...', error);
      await new Promise((r) => setTimeout(r, 400));
      const retryModule = await factory();
      if ('default' in retryModule && retryModule.default) {
        return { default: retryModule.default as T };
      }
      const keys = Object.keys(retryModule);
      const named = keys.find((k) => typeof retryModule[k] === 'function');
      return { default: (named ? retryModule[named] : retryModule) as T };
    }
  });
}

// Lazy-loaded Views (Code Splitting with auto-retry)
const RecipeDetailPage = lazyWithRetry(() => import('./pages/RecipeDetailPage'));
const AllReviewsPage = lazyWithRetry(() => import('./pages/AllReviewsPage'));
const FridgeCookView = lazyWithRetry(() => import('./components/FridgeCookView').then((m) => ({ default: m.FridgeCookView })));
const WeeklyPlannerView = lazyWithRetry(() => import('./components/WeeklyPlannerView').then((m) => ({ default: m.WeeklyPlannerView })));
const ShoppingListView = lazyWithRetry(() => import('./components/ShoppingListView').then((m) => ({ default: m.ShoppingListView })));
const StatsView = lazyWithRetry(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
const SwipePage = lazyWithRetry(() => import('./pages/SwipePage'));

// Lazy-loaded Modals
const CookingModeModal = lazyWithRetry(() => import('./components/CookingModeModal').then((m) => ({ default: m.CookingModeModal })));
const AddToMealPlanModal = lazyWithRetry(() => import('./components/AddToMealPlanModal').then((m) => ({ default: m.AddToMealPlanModal })));
const FamilySyncModal = lazyWithRetry(() => import('./components/FamilySyncModal').then((m) => ({ default: m.FamilySyncModal })));

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
  const isSwipeRoute = location.pathname === '/swipen' || location.pathname === '/swipe';

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

      {/* Top Main Navigation Header - only on non-detail, non-swipe pages */}
      {!isRecipeDetailPage && !isSwipeRoute && <HeaderWithScroll />}

      {/* Main Content Area rendered via React Router Routes with Suspense code-splitting */}
      <main className={`flex-1 w-full ${isRecipeDetailPage || isSwipeRoute ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[calc(148px_+_env(safe-area-inset-top))] md:pt-[calc(116px_+_env(safe-area-inset-top))] lg:pt-[calc(96px_+_env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)_+_1rem)] space-y-5 sm:space-y-8'} ${showBottomTimerBar ? 'pb-40 sm:pb-44' : ''}`}>
        <Suspense fallback={isExplorerRoute ? <ExplorerLoadingSkeleton /> : <RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RecipesExplorerPage isFavorites={false} />} />
            <Route path="/favorites" element={<RecipesExplorerPage isFavorites={true} />} />
            <Route path="/bookmarks" element={<RecipesExplorerPage isBookmarks={true} />} />
            <Route path="/swipen" element={<SwipePage />} />
            <Route path="/swipe" element={<Navigate to="/swipen" replace />} />
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

      {/* Add Recipe Modal (Single-tab All-in-One field with optional photo) */}
      {isAddRecipeOpen && <AddRecipeModal />}

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

      {/* Footer - only on non-detail, non-swipe pages */}
      {!isRecipeDetailPage && !isSwipeRoute && (
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
