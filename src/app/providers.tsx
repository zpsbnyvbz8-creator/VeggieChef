'use client';

import React, { useEffect, Suspense, lazy } from 'react';
import { Leaf } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
} from '../context';
import { HeaderWithScroll } from '../components/navigation/HeaderWithScroll';
import { ScrollToTop } from '../components/ScrollToTop';
import { CookingTimerBar } from '../components/CookingTimerBar';
import { AddRecipeModal } from '../components/AddRecipeModal';

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

// Lazy-loaded Modals
const CookingModeModal = lazyWithRetry(() =>
  import('../components/CookingModeModal').then((m) => ({ default: m.CookingModeModal }))
);
const AddToMealPlanModal = lazyWithRetry(() =>
  import('../components/AddToMealPlanModal').then((m) => ({ default: m.AddToMealPlanModal }))
);
const FamilySyncModal = lazyWithRetry(() =>
  import('../components/FamilySyncModal').then((m) => ({ default: m.FamilySyncModal }))
);

function LegacyRecipeQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const legacyRecipeId = searchParams?.get('recipe');
    if (legacyRecipeId) {
      router.replace(`/recipes/${legacyRecipeId}`);
    }
  }, [searchParams, router]);

  return null;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  const isRecipeDetailPage = pathname.startsWith('/recipes/');
  const isSwipeRoute = pathname === '/swipen' || pathname === '/swipe';

  const {
    cookingModeRecipe,
    isCookingMinimized,
    cookingTimer,
    isAddRecipeOpen,
  } = useRecipes();

  const { isSyncModalOpen } = useSync();
  const { recipeToAddToPlan } = usePlanner();

  const showBottomTimerBar = Boolean(cookingTimer || (cookingModeRecipe && isCookingMinimized));

  return (
    <div className="min-h-dvh bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans selection:bg-accent-tint selection:text-accent">
      <Suspense fallback={null}>
        <LegacyRecipeQueryRedirect />
      </Suspense>

      {/* Scroll to Top on every route transition */}
      <ScrollToTop />

      {/* Top Main Navigation Header - only on non-detail, non-swipe pages */}
      {!isRecipeDetailPage && !isSwipeRoute && <HeaderWithScroll />}

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full ${
          isRecipeDetailPage || isSwipeRoute
            ? ''
            : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[calc(148px_+_env(safe-area-inset-top))] md:pt-[calc(116px_+_env(safe-area-inset-top))] lg:pt-[calc(96px_+_env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)_+_1rem)] space-y-5 sm:space-y-8'
        } ${showBottomTimerBar ? 'pb-40 sm:pb-44' : ''}`}
      >
        {children}
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SyncProvider>
        <RecipeProvider>
          <PlannerProvider>
            <ShoppingProvider>
              <AppShell>{children}</AppShell>
              <SpeedInsights />
            </ShoppingProvider>
          </PlannerProvider>
        </RecipeProvider>
      </SyncProvider>
    </ToastProvider>
  );
}
