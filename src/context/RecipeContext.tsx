import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Recipe, 
  FilterState, 
  CookedLog, 
  CookingTimerState 
} from '../types';
import { INITIAL_RECIPES } from '../data/recipes';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  filterAndSortRecipes, 
  calculateMealSavings 
} from '../utils/helpers';
import { 
  subscribeToFamilyRecipes 
} from '../lib/syncService';
import { useToast } from './ToastContext';
import { useSync } from './SyncContext';

const DEFAULT_FILTERS: FilterState = {
  category: 'all',
  searchQuery: '',
  diet: 'all',
  maxTime: 0,
  minProtein: 0,
  maxCalories: 0,
  minFiber: 0,
  difficulty: 'all',
  selectedTags: [],
  sortBy: 'featured',
};

export interface RecipeContextType {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFavorite: (recipeId: string) => void;
  dislikedIds: string[];
  setDislikedIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDislike: (recipeId: string) => void;
  onlyVegan: boolean;
  setOnlyVegan: React.Dispatch<React.SetStateAction<boolean>>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  filteredRecipes: Recipe[];
  dishOfTheDay: Recipe;
  selectedRecipe: Recipe | null;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  isAddRecipeOpen: boolean;
  setIsAddRecipeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** Filter-Sheet (nur auf der Entdecker-Seite gemountet); Header öffnet es über das Filter-Icon im Suchfeld. */
  isFilterSheetOpen: boolean;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
  cookedLogs: CookedLog[];
  setCookedLogs: React.Dispatch<React.SetStateAction<CookedLog[]>>;
  logCooked: (recipe: Recipe, servings: number, notes?: string, rating?: number, photoUrl?: string) => void;
  saveCustomRecipe: (newRecipe: Recipe) => void;
  addRecipe: (newRecipe: Recipe) => void;
  updateRecipe: (updatedRecipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;
  duplicateRecipe: (recipe: Recipe) => Recipe;
  cookingModeRecipe: { recipe: Recipe; servings: number } | null;
  setCookingModeRecipe: React.Dispatch<React.SetStateAction<{ recipe: Recipe; servings: number } | null>>;
  isCookingMinimized: boolean;
  setIsCookingMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  cookingCurrentStep: number;
  setCookingCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  cookingTimer: CookingTimerState | null;
  setCookingTimer: React.Dispatch<React.SetStateAction<CookingTimerState | null>>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { syncConfig, syncSingleRecipe, registerDomainSync } = useSync();

  // Recipes State (Initial + Custom Saved AI Recipes + User Modifications like Photos/Cover)
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = loadFromLocalStorage<Recipe[]>('veggiechef_recipes', []);
    if (!saved || saved.length === 0) {
      return INITIAL_RECIPES;
    }
    const savedMap = new Map(saved.map((r) => [r.id, r]));
    // Merge saved modifications into INITIAL_RECIPES (e.g. photos, custom cover, ratings)
    const mergedInitial = INITIAL_RECIPES.map((initRecipe) => {
      const savedVersion = savedMap.get(initRecipe.id);
      if (savedVersion) {
        return {
          ...initRecipe,
          ...savedVersion,
        };
      }
      return initRecipe;
    });

    // Add user custom recipes that are not part of INITIAL_RECIPES
    const initialIds = new Set(INITIAL_RECIPES.map((r) => r.id));
    const userCustom = saved.filter((r) => !initialIds.has(r.id));
    return [...mergedInitial, ...userCustom];
  });

  // Vegan toggle
  const [onlyVegan, setOnlyVegan] = useState<boolean>(() => 
    loadFromLocalStorage('veggiechef_only_vegan', false)
  );

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => 
    loadFromLocalStorage('veggiechef_favorites', ['rec-1', 'rec-3'])
  );

  // Disliked Recipes (to show less frequently & deprioritize)
  const [dislikedIds, setDislikedIds] = useState<string[]>(() => 
    loadFromLocalStorage('veggiechef_dislikes', [])
  );

  // Filter & Search State
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Modal / Interactive Views State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [cookingModeRecipe, setCookingModeRecipe] = useState<{ recipe: Recipe; servings: number } | null>(null);
  const [isCookingMinimized, setIsCookingMinimized] = useState<boolean>(false);
  const [cookingCurrentStep, setCookingCurrentStep] = useState<number>(0);

  // Active Persistent Cooking Timer State
  const [cookingTimer, setCookingTimer] = useState<CookingTimerState | null>(() =>
    loadFromLocalStorage('veggiechef_active_timer', null)
  );

  // Cooked Logs & Statistics
  const [cookedLogs, setCookedLogs] = useState<CookedLog[]>(() => 
    loadFromLocalStorage('veggiechef_cooked_logs', [
      {
        id: 'log-1',
        recipeId: 'rec-1',
        recipeTitle: 'Cremiges Kichererbsen Tikka Masala',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        servingsCooked: 4,
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
        isVegan: true,
        savedCO2Kg: 2.8,
        savedWaterLiters: 2400,
      }
    ])
  );

  // LocalStorage synchronizations
  useEffect(() => {
    saveToLocalStorage('veggiechef_recipes', recipes);
  }, [recipes]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_only_vegan', onlyVegan);
  }, [onlyVegan]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_favorites', favorites);
  }, [favorites]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_dislikes', dislikedIds);
  }, [dislikedIds]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_cooked_logs', cookedLogs);
  }, [cookedLogs]);

  useEffect(() => {
    saveToLocalStorage('veggiechef_active_timer', cookingTimer);
  }, [cookingTimer]);

  // Register with SyncContext for non-destructive merge updates on join
  useEffect(() => {
    const unregister = registerDomainSync({
      onMergeRecipes: (mergedRecipes) => {
        if (mergedRecipes.length > 0) {
          setRecipes((prev) => {
            const mergedIds = new Set(mergedRecipes.map((r) => r.id));
            const kept = prev.filter((r) => !mergedIds.has(r.id));
            return [...mergedRecipes, ...kept];
          });
        }
      },
    });
    return unregister;
  }, [registerDomainSync]);

  // Realtime Family Sync Subscriptions for recipes
  useEffect(() => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;

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
      unsubRecipes();
    };
  }, [syncConfig.mode, syncConfig.groupId]);

  // Persistent cooking timer interval
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
  }, [cookingTimer?.isRunning]);

  // Actions
  const toggleFavorite = (recipeId: string) => {
    const isFav = favorites.includes(recipeId);
    if (isFav) {
      setFavorites((prev) => prev.filter((id) => id !== recipeId));
      showToast('Aus Favoriten entfernt');
    } else {
      setFavorites((prev) => [...prev, recipeId]);
      // Automatisch Dislike aufheben, damit das Gericht wieder öfter/normal angezeigt wird
      setDislikedIds((prev) => prev.filter((id) => id !== recipeId));
      showToast('Zu Favoriten hinzugefügt! ❤️');
    }
  };

  const toggleDislike = (recipeId: string) => {
    const isDisliked = dislikedIds.includes(recipeId);
    if (isDisliked) {
      setDislikedIds((prev) => prev.filter((id) => id !== recipeId));
      showToast('Gericht wird wieder normal angezeigt.');
    } else {
      setDislikedIds((prev) => [...prev, recipeId]);
      setFavorites((prev) => prev.filter((id) => id !== recipeId));
      showToast('Gericht als Dislike markiert – wird seltener angezeigt.');
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const openFilterSheet = () => setIsFilterSheetOpen(true);
  const closeFilterSheet = () => setIsFilterSheetOpen(false);

  const logCooked = (recipe: Recipe, servings: number, notes?: string, rating?: number, photoUrl?: string) => {
    const savings = calculateMealSavings(servings, recipe.isVegan);
    const newLog: CookedLog = {
      id: `cooked-${Date.now()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      date: new Date().toISOString(),
      servingsCooked: servings,
      notes,
      rating,
      photoUrl,
      isVegan: recipe.isVegan,
      savedCO2Kg: savings.savedCO2Kg,
      savedWaterLiters: savings.savedWaterLiters,
    };

    setCookedLogs((prev) => [newLog, ...prev]);
  };

  const saveCustomRecipe = (newRecipe: Recipe) => {
    const stamped = { ...newRecipe, createdAt: newRecipe.createdAt || Date.now() };
    setRecipes((prev) => [stamped, ...prev]);
    syncSingleRecipe(stamped);
  };

  const addRecipe = (newRecipe: Recipe) => {
    const stamped = { ...newRecipe, createdAt: newRecipe.createdAt || Date.now() };
    setRecipes((prev) => [stamped, ...prev.filter((r) => r.id !== stamped.id)]);
    syncSingleRecipe(stamped);
    setSelectedRecipe(stamped);
    showToast(`Gericht "${stamped.title}" erfolgreich hinzugefügt!`);
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    setRecipes((prev) => prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
    setSelectedRecipe((prev) => (prev?.id === updatedRecipe.id ? updatedRecipe : prev));
    syncSingleRecipe(updatedRecipe);
    showToast(`Gericht "${updatedRecipe.title}" aktualisiert!`);
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setFavorites((prev) => prev.filter((id) => id !== recipeId));
    setDislikedIds((prev) => prev.filter((id) => id !== recipeId));
    showToast('Gericht wurde gelöscht.');
  };

  const duplicateRecipe = (sourceRecipe: Recipe): Recipe => {
    const newId = `rec-copy-${Date.now()}`;
    const newTitle = `${sourceRecipe.title} (Kopie)`;
    const copy: Recipe = {
      ...sourceRecipe,
      id: newId,
      title: newTitle,
      createdAt: Date.now(),
      isCustomAi: true,
    };
    setRecipes((prev) => [copy, ...prev]);
    syncSingleRecipe(copy);
    showToast(`Duplikat "${copy.title}" erstellt!`);
    return copy;
  };

  // Filtered & Sorted Recipes (deprioritizes disliked recipes to bottom)
  const filteredRecipes = useMemo(() => {
    const filtered = filterAndSortRecipes(recipes, filters, onlyVegan, cookedLogs);
    const nonDisliked = filtered.filter((r) => !dislikedIds.includes(r.id));
    const disliked = filtered.filter((r) => dislikedIds.includes(r.id));
    return [...nonDisliked, ...disliked];
  }, [recipes, filters, onlyVegan, dislikedIds, cookedLogs]);

  // Dish of the day (deterministic from day of year, excluding disliked dishes if alternatives exist)
  const dishOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    let candidates = onlyVegan ? recipes.filter((r) => r.isVegan) : recipes;
    const nonDisliked = candidates.filter((r) => !dislikedIds.includes(r.id));
    const finalCandidates = nonDisliked.length > 0 ? nonDisliked : candidates;
    return finalCandidates[dayOfYear % finalCandidates.length] || recipes[0] || INITIAL_RECIPES[0];
  }, [recipes, onlyVegan, dislikedIds]);

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        setRecipes,
        favorites,
        setFavorites,
        toggleFavorite,
        dislikedIds,
        setDislikedIds,
        toggleDislike,
        onlyVegan,
        setOnlyVegan,
        filters,
        setFilters,
        resetFilters,
        filteredRecipes,
        dishOfTheDay,
        selectedRecipe,
        setSelectedRecipe,
        isAddRecipeOpen,
        setIsAddRecipeOpen,
        isFilterSheetOpen,
        openFilterSheet,
        closeFilterSheet,
        cookedLogs,
        setCookedLogs,
        logCooked,
        saveCustomRecipe,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        duplicateRecipe,
        cookingModeRecipe,
        setCookingModeRecipe,
        isCookingMinimized,
        setIsCookingMinimized,
        cookingCurrentStep,
        setCookingCurrentStep,
        cookingTimer,
        setCookingTimer,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};

export function useRecipes(): RecipeContextType {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
