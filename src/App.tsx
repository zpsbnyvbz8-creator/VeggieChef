import React, { useState, useEffect, useMemo } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  DishOfTheDay 
} from './components/DishOfTheDay';
import { 
  FilterBar 
} from './components/FilterBar';
import { 
  RecipeCard 
} from './components/RecipeCard';
import { 
  RecipeModal 
} from './components/RecipeModal';
import { 
  CookingModeModal 
} from './components/CookingModeModal';
import { 
  CookingTimerBar 
} from './components/CookingTimerBar';
import { 
  FridgeCookView 
} from './components/FridgeCookView';
import { 
  WeeklyPlannerView 
} from './components/WeeklyPlannerView';
import { 
  ShoppingListView 
} from './components/ShoppingListView';
import { 
  StatsView 
} from './components/StatsView';

import { 
  Recipe, 
  ViewMode, 
  FilterState, 
  ShoppingItem, 
  DayPlan, 
  CookedLog,
  CookingTimerState,
  WeekPlan
} from './types';
import { 
  INITIAL_RECIPES, 
  INITIAL_MEAL_PLAN 
} from './data/recipes';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  filterAndSortRecipes, 
  calculateMealSavings,
  createEmptyWeekDays
} from './utils/helpers';
import { 
  Sparkles, 
  Heart, 
  Search, 
  CheckCircle2, 
  BookOpen, 
  ChefHat,
  Filter,
  Plus
} from 'lucide-react';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AddToMealPlanModal } from './components/AddToMealPlanModal';
import { FamilySyncModal } from './components/FamilySyncModal';
import {
  SyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  ensureGroupDocument,
  subscribeToFamilyShopping,
  subscribeToFamilyMealPlan,
  subscribeToFamilyRecipes,
  uploadBatchShopping,
  uploadBatchMealPlan,
  syncFamilyRecipe,
} from './lib/syncService';

export function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ViewMode>('recipes');
  const [onlyVegan, setOnlyVegan] = useState<boolean>(() => 
    loadFromLocalStorage('veggiechef_only_vegan', false)
  );

  // Recipes State (Initial + Custom Saved AI Recipes)
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = loadFromLocalStorage<Recipe[]>('veggiechef_recipes', []);
    if (!saved || saved.length === 0) {
      return INITIAL_RECIPES;
    }
    const initialIds = new Set(INITIAL_RECIPES.map((r) => r.id));
    const userCustom = saved.filter((r) => !initialIds.has(r.id) && !r.id.startsWith('rec-'));
    return [...INITIAL_RECIPES, ...userCustom];
  });

  // Modal State for Adding / Scanning / AI-Generating Recipes
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => 
    loadFromLocalStorage('veggiechef_favorites', ['rec-1', 'rec-3'])
  );

  // Disliked Recipes (to show less frequently & deprioritize)
  const [dislikedIds, setDislikedIds] = useState<string[]>(() => 
    loadFromLocalStorage('veggiechef_dislikes', [])
  );

  // Recipe Explorer pagination (load more & load all - persistent across tabs)
  const [visibleRecipeCount, setVisibleRecipeCount] = useState<number>(() =>
    loadFromLocalStorage('veggiechef_visible_count', 8)
  );

  useEffect(() => {
    saveToLocalStorage('veggiechef_visible_count', visibleRecipeCount);
  }, [visibleRecipeCount]);

  // Shopping List
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => 
    loadFromLocalStorage('veggiechef_shopping', [
      { id: 'init-1', name: 'Hafer-Kochcreme', amount: '200', unit: 'ml', category: 'kuehlregal', completed: false, recipeSource: 'Gnocchi Pfanne' },
      { id: 'init-2', name: 'Kichererbsen', amount: '1', unit: 'Dose', category: 'huelsenfruechte', completed: false, recipeSource: 'Tikka Masala' },
      { id: 'init-3', name: 'Frischer Spinat', amount: '150', unit: 'g', category: 'gemuese', completed: false },
    ])
  );

  // Weekly Plans (Supports multiple rotated weeks)
  const [weeks, setWeeks] = useState<WeekPlan[]>(() => {
    const saved = loadFromLocalStorage<WeekPlan[]>('veggiechef_weeks_v2', []);
    if (saved && saved.length > 0) return saved;
    const initialDays = loadFromLocalStorage<DayPlan[]>('veggiechef_mealplan', INITIAL_MEAL_PLAN);
    return [
      {
        id: 'week-1',
        title: 'Aktuelle Woche',
        startDate: '15.09. - 21.09.',
        days: initialDays,
        createdAt: Date.now(),
      },
    ];
  });

  const [activeWeekId, setActiveWeekId] = useState<string>(() => {
    return loadFromLocalStorage<string>('veggiechef_active_week_id', 'week-1');
  });

  // Current active week & its 7-day meal plan
  const activeWeek = useMemo(() => {
    return weeks.find((w) => w.id === activeWeekId) || weeks[0] || {
      id: 'week-1',
      title: 'Aktuelle Woche',
      startDate: '15.09. - 21.09.',
      days: INITIAL_MEAL_PLAN,
      createdAt: Date.now(),
    };
  }, [weeks, activeWeekId]);

  const mealPlan = activeWeek.days;

  // Recipe being planned via day/time selector modal
  const [recipeToAddToPlan, setRecipeToAddToPlan] = useState<Recipe | null>(null);

  // Cooked Logs & Statistics
  const [cookedLogs, setCookedLogs] = useState<CookedLog[]>(() => 
    loadFromLocalStorage('veggiechef_cooked_logs', [
      {
        id: 'log-1',
        recipeId: 'rec-1',
        recipeTitle: 'Cremiges Kichererbsen Tikka Masala',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        servingsCooked: 4,
        rating: 5,
        isVegan: true,
        savedCO2Kg: 5.6,
        savedWaterLiters: 4800,
      },
      {
        id: 'log-2',
        recipeId: 'rec-2',
        recipeTitle: 'Crispy Sesam-Tofu Bowl mit Edamame & Erdnuss-Dressing',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        servingsCooked: 2,
        rating: 5,
        isVegan: true,
        savedCO2Kg: 2.8,
        savedWaterLiters: 2400,
      }
    ])
  );

  // Filter & Search State
  const [filters, setFilters] = useState<FilterState>({
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
  });

  // Modal / Interactive Views State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingModeRecipe, setCookingModeRecipe] = useState<{ recipe: Recipe; servings: number } | null>(null);

  // Active Persistent Cooking Timer State
  const [cookingTimer, setCookingTimer] = useState<CookingTimerState | null>(() =>
    loadFromLocalStorage('veggiechef_active_timer', null)
  );

  useEffect(() => {
    saveToLocalStorage('veggiechef_active_timer', cookingTimer);
  }, [cookingTimer]);

  useEffect(() => {
    if (!cookingTimer || !cookingTimer.isRunning || cookingTimer.secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setCookingTimer((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
          } catch {}
          return { ...prev, secondsLeft: 0, isRunning: false };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cookingTimer?.isRunning, cookingTimer?.secondsLeft]);

  // Family Synchronization State
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Realtime Family Sync Subscriptions (when mode is family)
  useEffect(() => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;

    const unsubShopping = subscribeToFamilyShopping(syncConfig.groupId, (cloudItems) => {
      setShoppingItems(cloudItems);
    });

    const unsubPlan = subscribeToFamilyMealPlan(syncConfig.groupId, (cloudPlan) => {
      setWeeks((prev) =>
        prev.map((w) => (w.id === activeWeekId ? { ...w, days: cloudPlan } : w))
      );
    });

    const unsubRecipes = subscribeToFamilyRecipes(syncConfig.groupId, (cloudRecipes) => {
      if (cloudRecipes.length > 0) {
        setRecipes((prev) => {
          const cloudIds = new Set(cloudRecipes.map((r) => r.id));
          const kept = prev.filter((r) => !cloudIds.has(r.id));
          return [...cloudRecipes, ...kept];
        });
      }
    });

    return () => {
      unsubShopping();
      unsubPlan();
      unsubRecipes();
    };
  }, [syncConfig.mode, syncConfig.groupId]);

  // Synchronized Setters (update local state and Firestore if in family mode)
  const handleSetShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>> = (updater) => {
    setShoppingItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (syncConfig.mode === 'family' && syncConfig.groupId) {
        uploadBatchShopping(syncConfig.groupId, next).catch((err) =>
          console.warn('[Sync] Shopping upload error:', err)
        );
      }
      return next;
    });
  };

  const handleSetMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>> = (updater) => {
    setWeeks((prev) => {
      return prev.map((w) => {
        if (w.id === activeWeek.id) {
          const nextDays = typeof updater === 'function' ? updater(w.days) : updater;
          if (syncConfig.mode === 'family' && syncConfig.groupId) {
            uploadBatchMealPlan(syncConfig.groupId, nextDays).catch((err) =>
              console.warn('[Sync] Meal plan upload error:', err)
            );
          }
          return { ...w, days: nextDays };
        }
        return w;
      });
    });
  };

  const handleJoinFamily = async (
    groupId: string,
    groupName: string,
    memberName: string,
    pushData: boolean
  ) => {
    await ensureGroupDocument(groupId, groupName, memberName);
    const newConfig: SyncConfig = {
      mode: 'family',
      groupId,
      groupName,
      memberName,
      joinedAt: new Date().toISOString(),
    };
    setSyncConfig(newConfig);
    saveSyncConfig(newConfig);

    if (pushData) {
      if (shoppingItems.length > 0) {
        await uploadBatchShopping(groupId, shoppingItems);
      }
      if (mealPlan.length > 0) {
        await uploadBatchMealPlan(groupId, mealPlan);
      }
      const customOnes = recipes.filter((r) => r.isCustomAi);
      for (const cr of customOnes) {
        await syncFamilyRecipe(groupId, cr);
      }
    }
    showToast(`Erfolgreich mit Familie „${groupName || groupId}“ verbunden! 👥`);
  };

  const handleLeaveFamily = () => {
    const localConfig: SyncConfig = {
      mode: 'local',
      groupId: '',
      groupName: '',
      memberName: '',
      joinedAt: '',
    };
    setSyncConfig(localConfig);
    saveSyncConfig(localConfig);
    showToast('Zu lokalem Modus gewechselt. Deine Daten bleiben privat auf diesem iPhone.');
  };

  const handleForcePushData = async () => {
    if (!syncConfig.groupId) return;
    await uploadBatchShopping(syncConfig.groupId, shoppingItems);
    await uploadBatchMealPlan(syncConfig.groupId, mealPlan);
    const customOnes = recipes.filter((r) => r.isCustomAi);
    for (const cr of customOnes) {
      await syncFamilyRecipe(syncConfig.groupId, cr);
    }
    showToast('Lokale Daten erfolgreich für die Familie synchronisiert! ☁️');
  };

  // Sync state with localStorage
  useEffect(() => {
    saveToLocalStorage('veggiechef_only_vegan', onlyVegan);
  }, [onlyVegan]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_recipes', recipes);
  }, [recipes]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_favorites', favorites);
  }, [favorites]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_dislikes', dislikedIds);
  }, [dislikedIds]);

  // Reset pagination count on search or filter change
  useEffect(() => {
    setVisibleRecipeCount(8);
  }, [filters, onlyVegan, activeTab]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_shopping', shoppingItems);
  }, [shoppingItems]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_weeks_v2', weeks);
    saveToLocalStorage('veggiechef_active_week_id', activeWeekId);
    if (activeWeek) {
      saveToLocalStorage('veggiechef_mealplan', activeWeek.days);
    }
  }, [weeks, activeWeekId, activeWeek]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_cooked_logs', cookedLogs);
  }, [cookedLogs]);

  // Toggle Favorite
  const handleToggleFavorite = (recipeId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(recipeId);
      const updated = exists ? prev.filter((id) => id !== recipeId) : [...prev, recipeId];
      showToast(exists ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt! ❤️');
      return updated;
    });
  };

  // Toggle Dislike (shows dish less frequently by pushing it to the bottom)
  const handleToggleDislike = (recipeId: string) => {
    setDislikedIds((prev) => {
      const exists = prev.includes(recipeId);
      if (exists) {
        showToast('Gericht wird wieder normal angezeigt.');
        return prev.filter((id) => id !== recipeId);
      } else {
        // Also remove from favorites if it was favorited
        setFavorites((favs) => favs.filter((id) => id !== recipeId));
        showToast('Gericht als Dislike markiert – wird seltener angezeigt.');
        return [...prev, recipeId];
      }
    });
  };

  // Add Recipe ingredients to Shopping List
  const handleAddToShoppingList = (recipe: Recipe, servings: number) => {
    const newItems: ShoppingItem[] = recipe.ingredients.map((ing) => {
      let calcAmount = ing.amount;
      if (typeof ing.amount === 'number') {
        calcAmount = Math.round(((ing.amount / recipe.servings) * servings) * 10) / 10;
      }
      return {
        id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: ing.name,
        amount: calcAmount,
        unit: ing.unit,
        category: ing.category,
        completed: false,
        recipeSource: recipe.title,
      };
    });

    handleSetShoppingItems((prev) => [...prev, ...newItems]);
  };

  // Add multiple recipes to shopping list (from weekly planner)
  const handleAddMultipleToShoppingList = (items: { recipe: Recipe; servings: number }[]) => {
    let allNewItems: ShoppingItem[] = [];
    items.forEach(({ recipe, servings }) => {
      const converted = recipe.ingredients.map((ing) => {
        let calcAmount = ing.amount;
        if (typeof ing.amount === 'number') {
          calcAmount = Math.round(((ing.amount / recipe.servings) * servings) * 10) / 10;
        }
        return {
          id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: ing.name,
          amount: calcAmount,
          unit: ing.unit,
          category: ing.category,
          completed: false,
          recipeSource: recipe.title,
        };
      });
      allNewItems = [...allNewItems, ...converted];
    });

    handleSetShoppingItems((prev) => [...prev, ...allNewItems]);
  };

  // Log a cooked dish into stats
  const handleLogCooked = (recipe: Recipe, servings: number, rating: number, notes?: string) => {
    const savings = calculateMealSavings(servings, recipe.isVegan);
    const newLog: CookedLog = {
      id: `cooked-${Date.now()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      date: new Date().toISOString(),
      servingsCooked: servings,
      rating,
      notes,
      isVegan: recipe.isVegan,
      savedCO2Kg: savings.savedCO2Kg,
      savedWaterLiters: savings.savedWaterLiters,
    };

    setCookedLogs((prev) => [newLog, ...prev]);
  };

  // Save generated custom AI recipe
  const handleSaveCustomRecipe = (newRecipe: Recipe) => {
    const stamped = { ...newRecipe, createdAt: newRecipe.createdAt || Date.now() };
    setRecipes((prev) => [stamped, ...prev]);
    if (syncConfig.mode === 'family' && syncConfig.groupId) {
      syncFamilyRecipe(syncConfig.groupId, stamped).catch((err) =>
        console.warn('Sync custom recipe error:', err)
      );
    }
  };

  // Add newly created recipe (manual, AI, or scanned photo)
  const handleRecipeAdded = (newRecipe: Recipe) => {
    const stamped = { ...newRecipe, createdAt: newRecipe.createdAt || Date.now() };
    setRecipes((prev) => [stamped, ...prev.filter((r) => r.id !== stamped.id)]);
    if (syncConfig.mode === 'family' && syncConfig.groupId) {
      syncFamilyRecipe(syncConfig.groupId, stamped).catch((err) =>
        console.warn('Sync added recipe error:', err)
      );
    }
    setSelectedRecipe(stamped);
    showToast(`Gericht "${stamped.title}" erfolgreich hinzugefügt!`);
  };

  // Open modal to select day and meal time for planning
  const handleAddToMealPlan = (r: Recipe) => {
    setRecipeToAddToPlan(r);
  };

  const handleConfirmAddToMealPlan = (dayId: string, mealType: 'lunch' | 'dinner', targetWeekId?: string) => {
    if (!recipeToAddToPlan) return;
    const weekIdToUse = targetWeekId || activeWeekId;

    setWeeks((prevWeeks) => {
      return prevWeeks.map((w) => {
        if (w.id === weekIdToUse) {
          const updatedDays = w.days.map((day) => {
            if (day.dayId === dayId) {
              const newSlot = {
                recipeId: recipeToAddToPlan.id,
                recipeTitle: recipeToAddToPlan.title,
                isVegan: recipeToAddToPlan.isVegan,
                prepTime: recipeToAddToPlan.totalTimeMinutes,
                calories: recipeToAddToPlan.nutrients.calories,
                protein: recipeToAddToPlan.nutrients.protein,
                servings: 2,
              };
              return {
                ...day,
                [mealType]: newSlot,
              };
            }
            return day;
          });
          return { ...w, days: updatedDays };
        }
        return w;
      });
    });

    const targetWeek = weeks.find((w) => w.id === weekIdToUse);
    const dayName = targetWeek?.days.find((d) => d.dayId === dayId)?.dayName || 'Tag';
    const mealLabel = mealType === 'lunch' ? 'Mittagessen' : 'Abendessen';
    showToast(`"${recipeToAddToPlan.title}" für ${dayName} (${mealLabel}) eingeplant!`);
    setRecipeToAddToPlan(null);
  };

  // Week management handlers
  const handleCreateNewWeek = (customTitle?: string) => {
    const weekCount = weeks.length;
    const newWeekId = `week-${Date.now()}`;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 7 * weekCount);
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const dateRangeStr = `${monday.getDate()}.${monday.getMonth() + 1}. - ${sunday.getDate()}.${sunday.getMonth() + 1}.`;

    const newDays = createEmptyWeekDays(monday);
    const newWeek: WeekPlan = {
      id: newWeekId,
      title: customTitle || `Woche ${weekCount + 1}`,
      startDate: dateRangeStr,
      days: newDays,
      createdAt: Date.now(),
    };

    setWeeks((prev) => [...prev, newWeek]);
    setActiveWeekId(newWeekId);
    showToast(`Neue Woche "${newWeek.title}" erstellt! 📅`);
  };

  const handleDeleteWeek = (weekId: string) => {
    if (weeks.length <= 1) {
      showToast('Mindestens eine Woche muss erhalten bleiben.');
      return;
    }
    const remaining = weeks.filter((w) => w.id !== weekId);
    setWeeks(remaining);
    if (activeWeekId === weekId) {
      setActiveWeekId(remaining[0].id);
    }
    showToast('Woche wurde gelöscht.');
  };

  const handleSelectWeek = (weekId: string) => {
    setActiveWeekId(weekId);
  };

  // Filtered & Sorted Recipes (deprioritizes disliked recipes to bottom)
  const filteredRecipes = useMemo(() => {
    let baseList = recipes;
    if (activeTab === 'favorites') {
      baseList = baseList.filter((r) => favorites.includes(r.id));
    }
    const filtered = filterAndSortRecipes(baseList, filters, onlyVegan, cookedLogs);
    const nonDisliked = filtered.filter((r) => !dislikedIds.includes(r.id));
    const disliked = filtered.filter((r) => dislikedIds.includes(r.id));
    return [...nonDisliked, ...disliked];
  }, [recipes, filters, onlyVegan, activeTab, favorites, dislikedIds, cookedLogs]);

  // Dish of the day (deterministic from day of year, excluding disliked dishes if alternatives exist)
  const dishOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    let candidates = onlyVegan ? recipes.filter((r) => r.isVegan) : recipes;
    const nonDisliked = candidates.filter((r) => !dislikedIds.includes(r.id));
    const finalCandidates = nonDisliked.length > 0 ? nonDisliked : candidates;
    return finalCandidates[dayOfYear % finalCandidates.length] || recipes[0] || INITIAL_RECIPES[0];
  }, [recipes, onlyVegan, dislikedIds]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3E40] flex flex-col font-sans selection:bg-[#F1F5F2] selection:text-[#4A7856]">
      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        favoritesCount={favorites.length}
        shoppingCount={shoppingItems.filter((i) => !i.completed).length}
        cookedCount={cookedLogs.length}
        searchQuery={filters.searchQuery}
        setSearchQuery={(q) => {
          setFilters((prev) => ({ ...prev, searchQuery: q }));
          if (activeTab !== 'recipes' && activeTab !== 'favorites') {
            setActiveTab('recipes');
          }
        }}
        syncConfig={syncConfig}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Persistent Cooking Timer Bar (visible when browsing outside cooking mode) */}
      {cookingTimer && !cookingModeRecipe && (
        <CookingTimerBar
          timer={cookingTimer}
          onTogglePlay={() => {
            setCookingTimer((prev) => prev ? { ...prev, isRunning: !prev.isRunning } : null);
          }}
          onReset={() => {
            setCookingTimer((prev) => prev ? { ...prev, secondsLeft: prev.totalSeconds, isRunning: false } : null);
          }}
          onDismiss={() => {
            setCookingTimer(null);
          }}
          onOpenCookingMode={() => {
            const target = recipes.find((r) => r.id === cookingTimer.recipeId) || INITIAL_RECIPES.find((r) => r.id === cookingTimer.recipeId);
            if (target) {
              setCookingModeRecipe({ recipe: target, servings: 2 });
              setSelectedRecipe(null);
            }
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* RECIPES EXPLORE VIEW & FAVORITES */}
        {(activeTab === 'recipes' || activeTab === 'favorites') && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-200">
            {/* Dish of the Day (Spotlight on top of explore tab) */}
            {activeTab === 'recipes' && filters.searchQuery === '' && filters.category === 'all' && dishOfTheDay && (
              <DishOfTheDay
                dish={dishOfTheDay}
                recipe={dishOfTheDay}
                onSelect={setSelectedRecipe}
                onSelectRecipe={setSelectedRecipe}
                isFavorite={dishOfTheDay ? favorites.includes(dishOfTheDay.id) : false}
                onToggleFavorite={handleToggleFavorite}
                isDisliked={dishOfTheDay ? dislikedIds.includes(dishOfTheDay.id) : false}
                onToggleDislike={handleToggleDislike}
                onQuickAddShopping={(r) => {
                  handleAddToShoppingList(r, r.servings);
                  showToast(`Zutaten für "${r.title}" auf die Einkaufsliste gesetzt!`);
                }}
                onAddToMealPlan={handleAddToMealPlan}
                onCopyFeedback={showToast}
              />
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
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-95 shrink-0"
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
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A7E7B] hover:text-[#2D3E40] p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter & Sorting Controls */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              totalCount={recipes.length}
              filteredCount={filteredRecipes.length}
              onOpenAddRecipe={() => setIsAddRecipeOpen(true)}
            />

            {/* Recipe Cards Grid */}
            {filteredRecipes.length === 0 ? (
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
                  className="px-5 py-2.5 rounded-xl bg-[#2D3E40] text-white text-xs font-semibold shadow-xs hover:bg-[#1F2C2D] transition-colors"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const isSearching = Boolean(filters.searchQuery && filters.searchQuery.trim().length > 0);
                  const displayCount = isSearching ? filteredRecipes.length : visibleRecipeCount;

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                        {filteredRecipes.slice(0, displayCount).map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onSelect={setSelectedRecipe}
                            isFavorite={favorites.includes(recipe.id)}
                            onToggleFavorite={handleToggleFavorite}
                            isDisliked={dislikedIds.includes(recipe.id)}
                            onToggleDislike={handleToggleDislike}
                            onQuickAddShopping={(r) => handleAddToShoppingList(r, r.servings)}
                            onAddToMealPlan={handleAddToMealPlan}
                            onCopyFeedback={showToast}
                          />
                        ))}
                      </div>

                      {/* Pagination Controls ("Mehr laden" & "Alle laden") */}
                      {!isSearching && (
                        <div className="flex flex-col items-center justify-center pt-6 pb-2 gap-3">
                          {filteredRecipes.length > visibleRecipeCount ? (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <button
                                id="load-more-recipes-btn"
                                onClick={() => setVisibleRecipeCount((prev) => prev + 8)}
                                className="group px-6 py-3 rounded-2xl bg-white border border-[#ECEBE8] hover:border-[#4A7856] text-[#2D3E40] hover:text-[#4A7856] font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-2.5 cursor-pointer"
                              >
                                <span>Mehr Gerichte laden</span>
                                <span className="text-xs bg-[#F1F5F2] group-hover:bg-[#4A7856] group-hover:text-white text-[#4A7856] px-2.5 py-0.5 rounded-full font-bold transition-colors">
                                  +{Math.min(8, filteredRecipes.length - visibleRecipeCount)}
                                </span>
                              </button>

                              <button
                                id="load-all-recipes-btn"
                                onClick={() => setVisibleRecipeCount(filteredRecipes.length)}
                                className="px-6 py-3 rounded-2xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                              >
                                <span>Alle laden ({filteredRecipes.length} Rezepte)</span>
                              </button>
                            </div>
                          ) : (
                            filteredRecipes.length > 8 && (
                              <div className="flex items-center gap-3 text-xs text-[#7A7E7B]">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F1F5F2] text-[#4A7856] font-semibold">
                                  ✓ Alle {filteredRecipes.length} Gerichte geladen
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
                            Zeige {Math.min(displayCount, filteredRecipes.length)} von {filteredRecipes.length} Gerichten
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
        {activeTab === 'fridge' && (
          <FridgeCookView
            allRecipes={recipes}
            onSelectRecipe={setSelectedRecipe}
            onSaveCustomRecipe={handleSaveCustomRecipe}
            onlyVeganGlobal={onlyVegan}
            onCopyFeedback={showToast}
          />
        )}

        {/* WEEKLY MEAL PLANNER VIEW */}
        {activeTab === 'planner' && (
          <WeeklyPlannerView
            mealPlan={mealPlan}
            setMealPlan={handleSetMealPlan}
            allRecipes={recipes}
            onSelectRecipe={setSelectedRecipe}
            onAddAllToShoppingList={handleAddMultipleToShoppingList}
            onCopyFeedback={showToast}
            onlyVeganGlobal={onlyVegan}
            syncConfig={syncConfig}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            weeks={weeks}
            activeWeekId={activeWeekId}
            onSelectWeek={handleSelectWeek}
            onCreateNewWeek={handleCreateNewWeek}
            onDeleteWeek={handleDeleteWeek}
          />
        )}

        {/* SHOPPING LIST VIEW */}
        {activeTab === 'shopping' && (
          <ShoppingListView
            items={shoppingItems}
            setItems={handleSetShoppingItems}
            onCopyFeedback={showToast}
            syncConfig={syncConfig}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
          />
        )}

        {/* STATISTICS & IMPACT VIEW */}
        {activeTab === 'stats' && (
          <StatsView
            logs={cookedLogs}
            setLogs={setCookedLogs}
            favoritesCount={favorites.length}
            allRecipes={recipes}
            onSelectRecipe={(r) => setSelectedRecipe(r)}
            onCopyFeedback={showToast}
          />
        )}
      </main>

      {/* Detail Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          isFavorite={favorites.includes(selectedRecipe.id)}
          onToggleFavorite={handleToggleFavorite}
          isDisliked={dislikedIds.includes(selectedRecipe.id)}
          onToggleDislike={handleToggleDislike}
          onAddToShoppingList={handleAddToShoppingList}
          onAddToMealPlan={handleAddToMealPlan}
          onLogCooked={handleLogCooked}
          onOpenCookingMode={(recipe, servings) => {
            setCookingModeRecipe({ recipe, servings });
            setSelectedRecipe(null);
          }}
          onCopyFeedback={showToast}
        />
      )}

      {/* Fullscreen Interactive Cooking Mode */}
      {cookingModeRecipe && (
        <CookingModeModal
          recipe={cookingModeRecipe.recipe}
          servings={cookingModeRecipe.servings}
          cookingTimer={cookingTimer}
          onUpdateTimer={setCookingTimer}
          onClose={() => {
            const recipeToReopen = cookingModeRecipe.recipe;
            setCookingModeRecipe(null);
            setSelectedRecipe(recipeToReopen);
          }}
          onFinishCooking={() => {
            handleLogCooked(cookingModeRecipe.recipe, cookingModeRecipe.servings, 5);
            const recipeToReopen = cookingModeRecipe.recipe;
            setCookingModeRecipe(null);
            setSelectedRecipe(recipeToReopen);
            showToast('🎉 Bravo! Dein Gericht wurde als gekocht in deiner Statistik gespeichert!');
          }}
        />
      )}

      {/* Add Recipe Modal (Manual, AI Generator & Photo Scan) */}
      <AddRecipeModal
        isOpen={isAddRecipeOpen}
        onClose={() => setIsAddRecipeOpen(false)}
        onRecipeAdded={handleRecipeAdded}
      />

      {/* Add To Meal Plan Modal (Day & Time selection) */}
      <AddToMealPlanModal
        recipe={recipeToAddToPlan}
        isOpen={!!recipeToAddToPlan}
        onClose={() => setRecipeToAddToPlan(null)}
        onConfirm={handleConfirmAddToMealPlan}
        currentMealPlan={mealPlan}
        weeks={weeks}
        activeWeekId={activeWeekId}
      />

      {/* Family Sync Modal */}
      <FamilySyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncConfig={syncConfig}
        onJoinFamily={handleJoinFamily}
        onLeaveFamily={handleLeaveFamily}
        onForcePushCurrentData={handleForcePushData}
      />

      {/* Floating Toast Notification Banner */}
      {toastMessage && (
        <div
          id="app-toast-banner"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70 bg-[#2D3E40] text-white px-5 py-3 rounded-xl shadow-xl border border-[#ECEBE8]/20 text-xs sm:text-sm font-medium flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-[#4A7856] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
export default App;
