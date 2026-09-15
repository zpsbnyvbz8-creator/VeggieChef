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
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: RecipeCategory;
  isVegan: boolean;
  isVegetarian: boolean; // all are true
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  difficulty: 'Einfach' | 'Mittel' | 'Anspruchsvoll';
  servings: number;
  rating: number;
  reviewCount: number;
  nutrients: RecipeNutrients;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  chefTip: string;
  season?: 'Frühling' | 'Sommer' | 'Herbst' | 'Winter' | 'Ganzjährig';
  veganVersionTips?: string;
  isCustomAi?: boolean;
  createdAt?: number | string;
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

export type ViewMode = 'recipes' | 'fridge' | 'planner' | 'shopping' | 'stats' | 'favorites';

export interface FilterState {
  searchQuery: string;
  category: string;
  onlyVegan: boolean;
  maxTime: number; // 0 = unlimited, 15, 30, 45
  minProtein: number; // 0, 15, 25, 35
  maxCalories: number; // 0 = unlimited, 450, 600, 800
  minFiber: number; // 0, 8, 12
  difficulty: string; // 'all', 'Einfach', 'Mittel', 'Anspruchsvoll'
  selectedTags: string[];
  sortBy: 'featured' | 'timeAsc' | 'proteinDesc' | 'caloriesAsc' | 'ratingDesc' | 'fiberDesc' | 'recentlyAdded' | 'recentlyCooked';
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

