import type React from 'react';

export type RecipeCategory =
  | 'Schnelle Küche'
  | 'Schnelle Feierabendküche'
  | 'Currys & Eintöpfe'
  | 'Pasta & Gnocchi'
  | 'Bowls & Salate'
  | 'Ofengerichte'
  | 'Frühstück & Süßes'
  | 'Süßes & Frühstück'
  | 'Snacks & Dips'
  | 'Festlich'
  | 'Gourmet & Festlich'
  | 'High Protein';

export type IngredientCategory =
  | 'gemuese'
  | 'kuehlregal'
  | 'trockenwaren'
  | 'gewuerze'
  | 'huelsenfruechte'
  | 'sonstiges';

export interface RecipeIngredient {
  name: string;
  amount: number | string;
  unit: string;
  category: IngredientCategory;
  veganAlternative?: string;
  substitutes?: string[];
  isEssential?: boolean;
}

export interface RecipeStep {
  stepNumber: number;
  title?: string;
  text: string;
  timerMinutes?: number;
  stepImages?: string[];
}

export interface RecipeNutrients {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  iron?: number; // mg
  b12?: number; // µg
  calcium?: number; // mg
  zinc?: number; // mg
  vitaminC?: number; // mg
  magnesium?: number; // mg
}

/** Ernährungsform eines Rezepts: vegan oder vegetarisch (mit Milch/Ei/Honig). */
export type RecipeDiet = 'vegan' | 'vegetarisch';

/** Filterwert für die Ernährungsform im Entdecker (Alle = keine Einschränkung). */
export type RecipeDietFilter = 'all' | RecipeDiet;

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: RecipeCategory;
  isVegan: boolean;
  isVegetarian: boolean; // all are true
  /** Kanonisches Datenfeld für die Ernährungsform. Fehlt es (z. B. alte/importierte Rezepte), wird es aus `isVegan` abgeleitet. */
  diet?: RecipeDiet;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  difficulty: 'Einfach' | 'Mittel' | 'Anspruchsvoll';
  servings: number;
  rating: number;
  reviewCount: number;
  nutrients: RecipeNutrients;
  caloriesPerServing?: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  chefTip: string;
  season?: 'Frühling' | 'Sommer' | 'Herbst' | 'Winter' | 'Ganzjährig';
  veganVersionTips?: string;
  isCustomAi?: boolean;
  createdAt?: number | string;
  userImages?: string[];
  activeCoverImage?: string;
  userNotes?: string;
}

export interface WeekPlan {
  id: string;
  title: string;
  startDate?: string;
  days: DayPlan[];
  createdAt: number;
}

export interface CookedLog {
  id: string;
  recipeId: string;
  recipeTitle: string;
  date: string; // ISO date
  rating?: number;
  notes?: string;
  photoUrl?: string;
  servingsCooked: number;
  isVegan: boolean;
  savedCO2Kg: number;
  savedWaterLiters: number;
}

export interface MealPlanSlot {
  recipeId: string;
  recipeTitle: string;
  isVegan: boolean;
  prepTime: number;
  calories: number;
  protein: number;
  servings: number;
}

export interface DayPlan {
  dayId: string; // 'mon', 'tue', etc.
  dayName: string;
  dateStr: string;
  lunch: MealPlanSlot | null;
  dinner: MealPlanSlot | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | string;
  unit: string;
  category: IngredientCategory;
  completed: boolean;
  recipeSource?: string;
}

export type ViewMode = 'recipes' | 'fridge' | 'planner' | 'shopping' | 'stats' | 'favorites' | 'bookmarks';

export type SortOption =
  | 'featured'
  | 'timeAsc'
  | 'proteinDesc'
  | 'caloriesDesc'
  | 'ratingDesc'
  | 'fiberDesc'
  | 'recentlyAdded'
  | 'recentlyCooked';

export interface FilterState {
  searchQuery: string;
  category: string;
  diet: RecipeDietFilter;
  maxTime: number; // 0 = unlimited, 15, 30, 45
  minProtein: number; // 0, 15, 25, 35
  maxCalories: number; // 0 = unlimited, 450, 600, 800
  minFiber: number; // 0, 8, 12
  difficulty: string; // 'all', 'Einfach', 'Mittel', 'Anspruchsvoll'
  selectedTags: string[];
  sortBy: SortOption;
}

export interface AISubstitutionResult {
  substitutions: {
    original: string;
    replacement: string;
    reason: string;
    usageTip: string;
  }[];
  advice: string;
  adaptedStepsSummary?: string;
  isFallback?: boolean;
}

export interface CookingTimerState {
  recipeId: string;
  recipeTitle: string;
  stepNumber: number;
  stepTitle?: string;
  totalSeconds: number;
  secondsLeft: number;
  isRunning: boolean;
}

export interface FridgeCookIdea {
  title: string;
  category: string;
  dishType: string;
  pitch: string;
  estimatedTimeMinutes: number;
  estimatedCalories: number;
  estimatedProtein: number;
  keyIngredientsUsed: string[];
  basicPantryItemsNeeded?: string[];
  additionalIngredientsProposed?: string[];
}

export interface RecipeContextType {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFavorite: (recipeId: string) => void;
  bookmarks: string[];
  bookmarksCount: number;
  toggleBookmark: (recipeId: string) => void;
  isBookmarked: (recipeId: string) => boolean;
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



