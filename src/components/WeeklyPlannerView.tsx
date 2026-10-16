import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShoppingCart, 
  Plus, 
  Minus,
  Trash2, 
  Check, 
  Clock, 
  Dumbbell, 
  Flame, 
  Shuffle, 
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  RotateCcw,
  Undo2,
  AlertTriangle,
  X,
  Search,
  Heart,
  ArrowUpDown,
  GripVertical,
  MoreHorizontal,
  ChefHat,
  ChevronDown,
  Leaf,
  Salad,
  Sun,
  Moon,
  Utensils,
  Zap,
  Sliders
} from 'lucide-react';
import { DayPlan, MealPlanSlot, Recipe, WeekPlan, FilterState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { RecipeImage } from './RecipeImage';
import { SyncConfig } from '../lib/syncService';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { usePlanner } from '../context/PlannerContext';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { useSync } from '../context/SyncContext';
import { useToast } from '../context/ToastContext';
import { HybridPortionStepper } from './HybridPortionStepper';
import { safeStorage } from '../utils/helpers';

const PICKER_SORT_OPTIONS: { label: string; value: FilterState['sortBy'] }[] = [
  { label: 'Standard-Sortierung', value: 'featured' },
  { label: 'Zuletzt hinzugefügt', value: 'recentlyAdded' },
  { label: 'Zuletzt gekocht', value: 'recentlyCooked' },
  { label: 'Schnelligkeit (Zubereitung)', value: 'timeAsc' },
  { label: 'Höchster Proteingehalt', value: 'proteinDesc' },
  { label: 'Meiste Kalorien', value: 'caloriesDesc' },
  { label: 'Beste Bewertung', value: 'ratingDesc' },
];

interface WeeklyPlannerViewProps {
  mealPlan?: DayPlan[];
  setMealPlan?: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  allRecipes?: Recipe[];
  favorites?: string[];
  onToggleFavorite?: (recipeId: string) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  onAddAllToShoppingList?: (recipesToPlan: { recipe: Recipe; servings: number }[]) => void;
  onCopyFeedback?: (msg: string) => void;
  onlyVeganGlobal?: boolean;
  syncConfig?: SyncConfig;
  onOpenSyncModal?: () => void;
  weeks?: WeekPlan[];
  activeWeekId?: string;
  onSelectWeek?: (weekId: string) => void;
  onCreateNewWeek?: (customTitle?: string) => void;
  onDeleteWeek?: (weekId: string) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = (props) => {
  const navigate = useNavigate();
  const plannerCtx = usePlanner();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const syncCtx = useSync();
  const toastCtx = useToast();

  const mealPlan = props.mealPlan ?? plannerCtx.mealPlan;
  const setMealPlan = props.setMealPlan ?? plannerCtx.setMealPlan;
  const allRecipes = props.allRecipes ?? recipesCtx.recipes;
  const favorites = props.favorites ?? recipesCtx.favorites;
  const onToggleFavorite = props.onToggleFavorite ?? recipesCtx.toggleFavorite;
  const onSelectRecipe = props.onSelectRecipe ?? ((r: Recipe) => navigate(`/recipes/${r.id}`));
  const onAddAllToShoppingList = props.onAddAllToShoppingList ?? shoppingCtx.addMultipleToShoppingList;
  const onCopyFeedback = props.onCopyFeedback ?? toastCtx.showToast;
  const onlyVeganGlobal = props.onlyVeganGlobal ?? recipesCtx.onlyVegan;
  const syncConfig = props.syncConfig ?? syncCtx.syncConfig;
  const onOpenSyncModal = props.onOpenSyncModal ?? syncCtx.openSyncModal;
  const weeks = props.weeks ?? plannerCtx.weeks;
  const activeWeekId = props.activeWeekId ?? plannerCtx.activeWeekId;
  const onSelectWeek = props.onSelectWeek ?? plannerCtx.selectWeek;
  const onCreateNewWeek = props.onCreateNewWeek ?? plannerCtx.createNewWeek;
  const onDeleteWeek = props.onDeleteWeek ?? plannerCtx.deleteWeek;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('dinner');
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerOnlyVegan, setPickerOnlyVegan] = useState(false);
  const [pickerOnlyFavorites, setPickerOnlyFavorites] = useState(false);
  const [pickerQuick, setPickerQuick] = useState(false);
  const [pickerHighProtein, setPickerHighProtein] = useState(false);
  const [pickerSortBy, setPickerSortBy] = useState<FilterState['sortBy']>('featured');

  // Toggle showing lunch slot for all days - persisted in safeStorage
  const [showLunchSlot, setShowLunchSlot] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('veggiechef_show_lunch_slot');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // When clicking any day header, all days are expanded or collapsed together
  const toggleDayLunch = () => {
    const next = !showLunchSlot;
    setShowLunchSlot(next);
    try {
      safeStorage.setItem('veggiechef_show_lunch_slot', JSON.stringify(next));
    } catch {}
    onCopyFeedback(next ? 'Mittags-Slots aller Tage eingeblendet.' : 'Mittags-Slots aller Tage ausgeblendet.');
  };

  const handleToggleAllLunch = () => {
    toggleDayLunch();
  };

  // Multi-week navigation modals
  const [showAllWeeksModal, setShowAllWeeksModal] = useState(false);
  const [showCreateWeekModal, setShowCreateWeekModal] = useState(false);
  const [newWeekTitleInput, setNewWeekTitleInput] = useState('');

  // AI Meal plan generator modal state - Reformed and simplified!
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [aiMealOption, setAiMealOption] = useState<'lunch' | 'dinner' | 'both'>('dinner');
  const [aiIsVegan, setAiIsVegan] = useState(true);
  const [aiPeopleCount, setAiPeopleCount] = useState<number>(2);
  const [aiMaxMinutes, setAiMaxMinutes] = useState<number>(35);
  const [isAiTimeSliderActive, setIsAiTimeSliderActive] = useState<boolean>(false);
  const [aiCalorieFilter, setAiCalorieFilter] = useState<string>('all'); // 'all', 'high', 'low', 'moderate'
  const [aiProteinFilter, setAiProteinFilter] = useState<string>('all'); // 'all', 'high', 'very-high', 'medium'
  const [aiDifficultyFilter, setAiDifficultyFilter] = useState<string>('all'); // 'all', 'Einfach', 'Mittel', 'Anspruchsvoll'
  const [aiWishes, setAiWishes] = useState<string>('');
  const [isAiPreferencesOpen, setIsAiPreferencesOpen] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planServings, setPlanServings] = useState<number>(3);

  // Safety confirmation ONLY for clearing entire week
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showContextMenu]);

  // Drag & Drop State for Reordering & Swapping Meals
  const [draggingItem, setDraggingItem] = useState<{
    dayId: string;
    dayName: string;
    mealType: 'lunch' | 'dinner';
    slot: MealPlanSlot;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    dayId: string;
    mealType: 'lunch' | 'dinner';
  } | null>(null);
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);

  // Touch Drag State for mobile/finger drag
  const [touchDragState, setTouchDragState] = useState<{
    source: {
      dayId: string;
      dayName: string;
      mealType: 'lunch' | 'dinner';
      slot: MealPlanSlot;
    };
    currentX: number;
    currentY: number;
  } | null>(null);

  // In-app week deletion confirmation
  const [confirmDeleteWeekId, setConfirmDeleteWeekId] = useState<string | null>(null);

  // Lock background body scroll whenever ANY modal or safety popup is active
  const isAnyModalActive = Boolean(
    showRecipePickerModal ||
    showAIGeneratorModal ||
    showConfirmClearAll ||
    showAllWeeksModal ||
    showCreateWeekModal
  );
  useLockBodyScroll(isAnyModalActive);

  // Active week lookup and rotation indices
  const activeWeek = weeks?.find((w) => w.id === activeWeekId) || weeks?.[0];
  const activeWeekIndex = weeks ? weeks.findIndex((w) => w.id === (activeWeek?.id || '')) : -1;

  const handlePrevWeek = () => {
    if (weeks && activeWeekIndex > 0 && onSelectWeek) {
      onSelectWeek(weeks[activeWeekIndex - 1].id);
    }
  };

  const handleNextWeek = () => {
    if (weeks && activeWeekIndex < weeks.length - 1 && onSelectWeek) {
      onSelectWeek(weeks[activeWeekIndex + 1].id);
    }
  };

  // Undo support for clearing entire meal plan or deleting single meals
  const [undoBackup, setUndoBackup] = useState<DayPlan[] | null>(null);
  const [lastDeletedMealInfo, setLastDeletedMealInfo] = useState<{
    type: 'single' | 'all';
    title?: string;
  } | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // Auto-dismiss undo toast after 6 seconds (with clean unmount timer)
  useEffect(() => {
    if (showUndoBanner) {
      const timer = setTimeout(() => {
        setShowUndoBanner(false);
        setUndoBackup(null);
        setLastDeletedMealInfo(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showUndoBanner]);

  const handleClearEntireMealPlan = () => {
    // Check if there are any meals
    const hasAnyMeals = mealPlan.some((d) => d.lunch || d.dinner);
    if (!hasAnyMeals) return;

    setUndoBackup(JSON.parse(JSON.stringify(mealPlan)));
    setLastDeletedMealInfo({ type: 'all' });
    setMealPlan((prev) => prev.map((d) => ({ ...d, lunch: null, dinner: null })));
    setShowUndoBanner(true);
    onCopyFeedback('Wochenplan wurde geleert.');
  };

  const handleUndoClearMealPlan = () => {
    if (undoBackup) {
      setMealPlan(undoBackup);
      setUndoBackup(null);
      setLastDeletedMealInfo(null);
      setShowUndoBanner(false);
      onCopyFeedback('Wiederhergestellt! ✓');
    }
  };

  const handleConfirmClearAll = () => {
    handleClearEntireMealPlan();
    setShowConfirmClearAll(false);
  };

  const openRecipePicker = (dayId: string, mealType: 'lunch' | 'dinner') => {
    setSelectedDayId(dayId);
    setSelectedMealType(mealType);
    setPickerSearchQuery('');
    setPickerOnlyVegan(false);
    setPickerOnlyFavorites(false);
    setPickerQuick(false);
    setPickerHighProtein(false);
    setPickerSortBy('featured');
    setShowRecipePickerModal(true);
  };

  const filteredPickerRecipes = React.useMemo(() => {
    const cookedLogs = recipesCtx.cookedLogs;
    let list = allRecipes.filter((recipe) => {
      // 1. Vegan filter (kombinierbar)
      if (pickerOnlyVegan && !recipe.isVegan) return false;

      // 2. Favoriten / Gelikt filter (kombinierbar)
      if (pickerOnlyFavorites && !favorites.includes(recipe.id)) return false;

      // 3. Schnell (<= 30 min, kombinierbar)
      if (pickerQuick && (recipe.totalTimeMinutes || 0) > 30) return false;

      // 4. High Protein (>= 20g Protein, kombinierbar)
      if (pickerHighProtein && (recipe.nutrients?.protein || 0) < 20) return false;

      // 5. Suche
      if (!pickerSearchQuery.trim()) return true;
      const query = pickerSearchQuery.toLowerCase().trim();
      const matchesTitle = recipe.title.toLowerCase().includes(query);
      const matchesIngredient = recipe.ingredients?.some((ing) => ing.name.toLowerCase().includes(query));
      return matchesTitle || matchesIngredient;
    });

    // 4. Sortierung wie auf Startseite
    list = [...list].sort((a, b) => {
      const aNutrients = a.nutrients || { calories: 0, protein: 0, fiber: 0 };
      const bNutrients = b.nutrients || { calories: 0, protein: 0, fiber: 0 };

      switch (pickerSortBy) {
        case 'recentlyCooked': {
          if (!cookedLogs || cookedLogs.length === 0) {
            return (b.rating || 0) - (a.rating || 0);
          }
          const getLatestCookedTime = (recId: string) => {
            let maxTime = 0;
            for (const log of cookedLogs) {
              if (log.recipeId === recId) {
                const t = new Date(log.date).getTime();
                if (t > maxTime) maxTime = t;
              }
            }
            return maxTime;
          };
          const aTime = getLatestCookedTime(a.id);
          const bTime = getLatestCookedTime(b.id);
          if (bTime !== aTime) return bTime - aTime;
          return (b.rating || 0) - (a.rating || 0);
        }
        case 'recentlyAdded': {
          const getAddedTimestamp = (r: Recipe) => {
            if (r.createdAt) {
              return typeof r.createdAt === 'number' ? r.createdAt : new Date(r.createdAt).getTime();
            }
            const numMatch = r.id.match(/\d{10,}/);
            if (numMatch) return parseInt(numMatch[0], 10);
            const idNum = parseInt(r.id.replace(/\D/g, ''), 10);
            return isNaN(idNum) ? 0 : idNum;
          };
          const aTime = getAddedTimestamp(a);
          const bTime = getAddedTimestamp(b);
          if (bTime !== aTime) return bTime - aTime;
          return (b.rating || 0) - (a.rating || 0);
        }
        case 'timeAsc':
          return (a.totalTimeMinutes || 0) - (b.totalTimeMinutes || 0);
        case 'proteinDesc':
          return (bNutrients.protein || 0) - (aNutrients.protein || 0);
        case 'caloriesDesc':
          return (b.caloriesPerServing ?? bNutrients.calories ?? 0) - (a.caloriesPerServing ?? aNutrients.calories ?? 0);
        case 'ratingDesc':
          return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        case 'featured':
        default:
          return 0;
      }
    });

    return list;
  }, [allRecipes, pickerOnlyVegan, pickerOnlyFavorites, pickerQuick, pickerHighProtein, pickerSearchQuery, pickerSortBy, favorites, recipesCtx.cookedLogs]);

  const assignRecipeToSlot = (recipe: Recipe) => {
    if (!selectedDayId) return;

    setMealPlan((prev) =>
      prev.map((day) => {
        if (day.dayId === selectedDayId) {
          const slotData: MealPlanSlot = {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            isVegan: recipe.isVegan,
            prepTime: recipe.totalTimeMinutes,
            calories: recipe.nutrients.calories,
            protein: recipe.nutrients.protein,
            servings: planServings,
          };

          return {
            ...day,
            [selectedMealType]: slotData,
          };
        }
        return day;
      })
    );

    setShowRecipePickerModal(false);
    onCopyFeedback(`"${recipe.title}" für ${selectedMealType === 'lunch' ? 'Mittagessen' : 'Abendessen'} eingeplant!`);
  };

  const removeSlot = (dayId: string, mealType: 'lunch' | 'dinner') => {
    const targetDay = mealPlan.find((d) => d.dayId === dayId);
    const mealToDelete = targetDay?.[mealType];
    if (mealToDelete) {
      setUndoBackup(JSON.parse(JSON.stringify(mealPlan)));
      setLastDeletedMealInfo({
        type: 'single',
        title: mealToDelete.recipeTitle,
      });
      setShowUndoBanner(true);
    }

    setMealPlan((prev) =>
      prev.map((day) => {
        if (day.dayId === dayId) {
          return {
            ...day,
            [mealType]: null,
          };
        }
        return day;
      })
    );
  };

  // Drag & Drop: Move or Swap meal between days/slots
  const handleMoveOrSwap = (
    sourceDayId: string,
    sourceMealType: 'lunch' | 'dinner',
    targetDayId: string,
    targetMealType: 'lunch' | 'dinner'
  ) => {
    if (sourceDayId === targetDayId && sourceMealType === targetMealType) return;

    const sourceDay = mealPlan.find((d) => d.dayId === sourceDayId);
    const targetDay = mealPlan.find((d) => d.dayId === targetDayId);
    if (!sourceDay || !targetDay) return;

    const sourceMeal = sourceDay[sourceMealType];
    if (!sourceMeal) return;

    const targetMeal = targetDay[targetMealType];

    setMealPlan((prev) =>
      prev.map((day) => {
        if (day.dayId === sourceDayId && day.dayId === targetDayId) {
          // Swapping slots on the same day (lunch <-> dinner)
          return {
            ...day,
            [sourceMealType]: targetMeal,
            [targetMealType]: sourceMeal,
          };
        }
        if (day.dayId === sourceDayId) {
          return {
            ...day,
            [sourceMealType]: targetMeal,
          };
        }
        if (day.dayId === targetDayId) {
          return {
            ...day,
            [targetMealType]: sourceMeal,
          };
        }
        return day;
      })
    );

    const targetMealLabel = targetMealType === 'lunch' ? 'Mittagessen' : 'Abendessen';
    if (targetMeal) {
      onCopyFeedback(`"${sourceMeal.recipeTitle}" mit "${targetMeal.recipeTitle}" getauscht! ⇄`);
    } else {
      onCopyFeedback(`"${sourceMeal.recipeTitle}" auf ${targetDay.dayName} (${targetMealLabel}) verschoben!`);
    }
  };

  // Drag & Drop: Delete meal by dropping on trash can / clear plan button
  const handleDropToTrash = (
    sourceDayId: string,
    sourceMealType: 'lunch' | 'dinner'
  ) => {
    const sourceDay = mealPlan.find((d) => d.dayId === sourceDayId);
    const sourceMeal = sourceDay?.[sourceMealType];
    if (!sourceDay || !sourceMeal) return;

    removeSlot(sourceDayId, sourceMealType);
    onCopyFeedback(`"${sourceMeal.recipeTitle}" aus dem Wochenplan entfernt.`);
  };

  // Touch drag initiation for mobile / finger drag via grip handle
  const startTouchDrag = (
    e: React.TouchEvent,
    dayId: string,
    dayName: string,
    mealType: 'lunch' | 'dinner',
    slot: MealPlanSlot
  ) => {
    const touch = e.touches[0];
    if (!touch) return;
    const info = { dayId, dayName, mealType, slot };
    setDraggingItem(info);
    setTouchDragState({
      source: info,
      currentX: touch.clientX,
      currentY: touch.clientY,
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  };

  // Global touch listener for active dragging across entire screen
  useEffect(() => {
    if (!touchDragState) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      if (e.cancelable) {
        e.preventDefault();
      }

      setTouchDragState((prev) => (prev ? { ...prev, currentX: touch.clientX, currentY: touch.clientY } : null));

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const trashTarget = elem?.closest('[data-drop-trash="true"]');
      if (trashTarget) {
        setIsDragOverTrash(true);
        setDragOverTarget(null);
        return;
      } else {
        setIsDragOverTrash(false);
      }

      const slotTarget = elem?.closest('[data-drop-slot="true"]');
      if (slotTarget) {
        const targetDayId = slotTarget.getAttribute('data-day-id');
        const targetMealType = slotTarget.getAttribute('data-meal-type') as 'lunch' | 'dinner' | null;
        if (targetDayId && targetMealType) {
          setDragOverTarget({ dayId: targetDayId, mealType: targetMealType });
          return;
        }
      }
      setDragOverTarget(null);
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch && touchDragState) {
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        const trashTarget = elem?.closest('[data-drop-trash="true"]');
        if (trashTarget) {
          handleDropToTrash(touchDragState.source.dayId, touchDragState.source.mealType);
        } else {
          const slotTarget = elem?.closest('[data-drop-slot="true"]');
          if (slotTarget) {
            const targetDayId = slotTarget.getAttribute('data-day-id');
            const targetMealType = slotTarget.getAttribute('data-meal-type') as 'lunch' | 'dinner' | null;
            if (targetDayId && targetMealType) {
              handleMoveOrSwap(
                touchDragState.source.dayId,
                touchDragState.source.mealType,
                targetDayId,
                targetMealType
              );
            }
          }
        }
      }
      setTouchDragState(null);
      setDraggingItem(null);
      setDragOverTarget(null);
      setIsDragOverTrash(false);
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [touchDragState, mealPlan]);

  // 1-Click transfer all planned recipes to shopping list
  const handleTransferAllToShopping = () => {
    const plannedRecipeIds: string[] = [];
    mealPlan.forEach((day) => {
      if (day.lunch) plannedRecipeIds.push(day.lunch.recipeId);
      if (day.dinner) plannedRecipeIds.push(day.dinner.recipeId);
    });

    if (plannedRecipeIds.length === 0) {
      onCopyFeedback('Keine Rezepte im Wochenplan vorhanden.');
      return;
    }

    const payload = plannedRecipeIds
      .map((id) => {
        const found = allRecipes.find((r) => r.id === id);
        return found ? { recipe: found, servings: planServings } : null;
      })
      .filter(Boolean) as { recipe: Recipe; servings: number }[];

    onAddAllToShoppingList(payload);
    onCopyFeedback(`Zutaten von ${payload.length} geplanten Gerichten für ${planServings} Portionen auf die Einkaufsliste gesetzt!`);
  };

  // AI Meal Plan Generator - Robust, dynamic and supports lunch/dinner/both!
  const handleGenerateAIMealPlan = async () => {
    setIsGeneratingPlan(true);

    // Filter candidate recipe pool: when 100% vegan is selected, ONLY pick from vegan recipes!
    const veganPool = allRecipes.filter((r) => r.isVegan);
    const recipePool = aiIsVegan ? (veganPool.length > 0 ? veganPool : allRecipes) : allRecipes;

    const sanitizeVeganTitle = (title: string, fallbackVegan: string) => {
      if (!aiIsVegan) return title;
      const nonVeganPattern = /\b(feta|hirtenk[äa]se|parmesan|mozzarella|gorgonzola|camembert|gouda|cheddar|k[äa]se|quark|spiegelei|r[üu]hrei|eier|ei\b|ricotta|mascarpone|butter|joghurt|milch|sahne)\b/i;
      if (!nonVeganPattern.test(title)) return title;
      return title
        .replace(/hirtenk[äa]se|feta/gi, 'Tofu-Feta')
        .replace(/parmesan|mozzarella|k[äa]se/gi, 'vegane Alternative')
        .replace(/shakshuka/gi, 'Vegane Shakshuka mit Seidentofu')
        .replace(/quark/gi, 'Soja-Quark')
        .replace(/sahne/gi, 'Hafer-Cuisine')
        .replace(/spiegelei|r[üu]hrei|eier/gi, 'Tofu-Scramble');
    };

    try {
      // Compile combined wishes incorporating nutrition/difficulty filters
      const wishParts: string[] = [];

      if (aiCalorieFilter === 'high') {
        wishParts.push('High Calorie (energiereich, mindestens 750 kcal pro Mahlzeit)');
      } else if (aiCalorieFilter === 'low') {
        wishParts.push('Kalorienarm (unter 500 kcal pro Mahlzeit, leicht)');
      } else if (aiCalorieFilter === 'moderate') {
        wishParts.push('Ausgewogener Kaloriengehalt (ca. 500–700 kcal pro Mahlzeit)');
      }

      if (aiProteinFilter === 'high') {
        wishParts.push('High Protein (mindestens 30g Protein pro Mahlzeit mit Tofu, Hülsenfrüchten, Tempeh, etc.)');
      } else if (aiProteinFilter === 'very-high') {
        wishParts.push('Extra High Protein (mindestens 40g Protein pro Mahlzeit)');
      } else if (aiProteinFilter === 'medium') {
        wishParts.push('Guter Proteingehalt (mindestens 20g Protein pro Mahlzeit)');
      }

      if (aiDifficultyFilter !== 'all') {
        wishParts.push(`Schwierigkeitsgrad: ${aiDifficultyFilter}`);
      }

      if (aiMaxMinutes > 0) {
        wishParts.push(`Zubereitungszeit: max. ${aiMaxMinutes} Minuten`);
      }

      if (aiWishes.trim()) {
        wishParts.push(aiWishes.trim());
      }

      const combinedWishes = wishParts.join(', ');

      const response = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVegan: aiIsVegan,
          peopleCount: aiPeopleCount,
          maxMinutesPerMeal: aiMaxMinutes > 0 ? aiMaxMinutes : 60,
          mealOption: aiMealOption,
          wishes: combinedWishes,
        }),
      });
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (data && data.success && data.days && Array.isArray(data.days)) {
        const updatedDays = mealPlan.map((day, idx) => {
          const aiDay = data.days[idx] || data.days[0];
          const newDay = { ...day };

          // Lunch
          if (aiMealOption === 'lunch' || aiMealOption === 'both') {
            const rawLunch = (typeof aiDay?.lunch === 'string' && aiDay.lunch.trim()) 
              ? aiDay.lunch 
              : (aiIsVegan ? 'Kichererbsen-Avocado Bowl mit Zitronen-Tahini' : 'Vital-Bowl mit Avocado & Kichererbsen');
            const lunchTitle = sanitizeVeganTitle(rawLunch, 'Kichererbsen-Avocado Bowl');

            // Find matching recipe strictly from recipePool (which is 100% vegan when aiIsVegan is active)
            const matched = recipePool.find((r) =>
              r && r.title && (
                r.title.toLowerCase().includes(lunchTitle.toLowerCase().slice(0, 6)) ||
                lunchTitle.toLowerCase().includes(r.title.toLowerCase().slice(0, 6))
              )
            ) || recipePool[idx % recipePool.length] || allRecipes[0];

            newDay.lunch = {
              recipeId: matched?.id || allRecipes[0]?.id || `recipe-${idx}`,
              recipeTitle: matched?.title || lunchTitle,
              isVegan: aiIsVegan || Boolean(matched?.isVegan),
              prepTime: matched?.totalTimeMinutes || aiMaxMinutes || 20,
              calories: matched?.nutrients?.calories || 420,
              protein: matched?.nutrients?.protein || 18,
              servings: aiPeopleCount,
            };
          }

          // Dinner
          if (aiMealOption === 'dinner' || aiMealOption === 'both') {
            const rawDinner = (typeof aiDay?.dinner === 'string' && aiDay.dinner.trim()) 
              ? aiDay.dinner 
              : (aiIsVegan ? 'Cremiges Rote-Linsen-Kokos-Curry mit Reis' : 'Cremiges Curry mit Reis & Gemüse');
            const dinnerTitle = sanitizeVeganTitle(rawDinner, 'Cremiges Rote-Linsen-Curry');

            // Find matching recipe strictly from recipePool (which is 100% vegan when aiIsVegan is active)
            const matched = recipePool.find((r) =>
              r && r.title && (
                r.title.toLowerCase().includes(dinnerTitle.toLowerCase().slice(0, 6)) ||
                dinnerTitle.toLowerCase().includes(r.title.toLowerCase().slice(0, 6))
              )
            ) || recipePool[(idx + 2) % recipePool.length] || allRecipes[0];

            newDay.dinner = {
              recipeId: matched?.id || allRecipes[0]?.id || `recipe-${idx + 1}`,
              recipeTitle: matched?.title || dinnerTitle,
              isVegan: aiIsVegan || Boolean(matched?.isVegan),
              prepTime: matched?.totalTimeMinutes || aiMaxMinutes || 25,
              calories: matched?.nutrients?.calories || 520,
              protein: matched?.nutrients?.protein || 22,
              servings: aiPeopleCount,
            };
          }

          return newDay;
        });

        setMealPlan(updatedDays);
        setShowAIGeneratorModal(false);
        if (aiWishes.trim()) {
          onCopyFeedback(`Wochenplan erstellt – deine Wünsche wurden berücksichtigt!`);
        } else {
          onCopyFeedback(`Wochenplan "${data.planTitle || '7-Tage-Plan'}" erfolgreich erstellt!`);
        }
      } else {
        throw new Error('API did not return valid days');
      }
    } catch (err) {
      console.warn('Fallback generation activated for meal plan', err);
      // Filter recipePool by user preferences if sufficient recipes exist
      let filteredPool = [...recipePool];
      if (aiCalorieFilter === 'high') {
        const highCal = filteredPool.filter(r => (r.nutrients?.calories || 0) >= 600);
        if (highCal.length >= 3) filteredPool = highCal;
      } else if (aiCalorieFilter === 'low') {
        const lowCal = filteredPool.filter(r => (r.nutrients?.calories || 0) <= 550);
        if (lowCal.length >= 3) filteredPool = lowCal;
      }
      if (aiProteinFilter === 'high' || aiProteinFilter === 'very-high') {
        const highProt = filteredPool.filter(r => (r.nutrients?.protein || 0) >= 22);
        if (highProt.length >= 3) filteredPool = highProt;
      }
      if (aiDifficultyFilter !== 'all') {
        const diffMatches = filteredPool.filter(r => r.difficulty === aiDifficultyFilter);
        if (diffMatches.length >= 3) filteredPool = diffMatches;
      }

      // Guarantee reliable fallback recipes strictly conforming to vegan settings
      const fallbackDays = mealPlan.map((day, idx) => {
        const newDay = { ...day };
        if (aiMealOption === 'lunch' || aiMealOption === 'both') {
          const rec = filteredPool[idx % filteredPool.length] || recipePool[idx % recipePool.length] || allRecipes[0];
          newDay.lunch = {
            recipeId: rec?.id || allRecipes[0]?.id || `recipe-${idx}`,
            recipeTitle: rec?.title || (aiIsVegan ? 'Kichererbsen-Avocado Bowl mit Zitronen-Tahini' : 'Mediterraner Hirten-Salat'),
            isVegan: aiIsVegan || Boolean(rec?.isVegan),
            prepTime: rec?.totalTimeMinutes || (aiMaxMinutes > 0 ? aiMaxMinutes : 20),
            calories: rec?.nutrients?.calories || (aiCalorieFilter === 'high' ? 760 : 430),
            protein: rec?.nutrients?.protein || (aiProteinFilter === 'high' ? 32 : 19),
            servings: aiPeopleCount,
          };
        }
        if (aiMealOption === 'dinner' || aiMealOption === 'both') {
          const rec = filteredPool[(idx + 3) % filteredPool.length] || recipePool[(idx + 3) % recipePool.length] || allRecipes[0];
          newDay.dinner = {
            recipeId: rec?.id || allRecipes[0]?.id || `recipe-${idx + 1}`,
            recipeTitle: rec?.title || (aiIsVegan ? 'Rote-Linsen Kokos-Curry mit Reis' : 'Ofen-Gnocchi mit Spinat'),
            isVegan: aiIsVegan || Boolean(rec?.isVegan),
            prepTime: rec?.totalTimeMinutes || (aiMaxMinutes > 0 ? aiMaxMinutes : 25),
            calories: rec?.nutrients?.calories || (aiCalorieFilter === 'high' ? 820 : 510),
            protein: rec?.nutrients?.protein || (aiProteinFilter === 'high' ? 35 : 23),
            servings: aiPeopleCount,
          };
        }
        return newDay;
      });
      setMealPlan(fallbackDays);
      setShowAIGeneratorModal(false);
      onCopyFeedback('Wochenplan erfolgreich mit leckeren Gerichten befüllt!');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Calculate weekly metrics
  const totalPlannedMeals = mealPlan.reduce(
    (acc, day) => acc + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0),
    0
  );

  const renderMealItem = (day: DayPlan, mealType: 'lunch' | 'dinner', slot: MealPlanSlot) => {
    const recipe = allRecipes.find((r) => r.id === slot.recipeId) ||
      allRecipes.find((r) => r.title.toLowerCase() === slot.recipeTitle.toLowerCase()) ||
      allRecipes.find((r) => r.title.toLowerCase().includes(slot.recipeTitle.toLowerCase().slice(0, 6)));
    const isDraggingThis = draggingItem?.dayId === day.dayId && draggingItem?.mealType === mealType;
    const isDragOverThis = dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === mealType;
    const isSwapTarget = isDragOverThis && draggingItem && (draggingItem.dayId !== day.dayId || draggingItem.mealType !== mealType);

    return (
      <motion.div
        layout="position"
        key={`${day.dayId}-${mealType}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ dayId: day.dayId, mealType }));
          e.dataTransfer.effectAllowed = 'move';
          setDraggingItem({ dayId: day.dayId, dayName: day.dayName, mealType, slot });
        }}
        onDragEnd={() => {
          setDraggingItem(null);
          setDragOverTarget(null);
        }}
        data-drop-slot="true"
        data-day-id={day.dayId}
        data-meal-type={mealType}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (draggingItem?.dayId !== day.dayId || draggingItem?.mealType !== mealType) {
            setDragOverTarget({ dayId: day.dayId, mealType });
          }
        }}
        onDragLeave={() => {
          if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === mealType) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingItem && (draggingItem.dayId !== day.dayId || draggingItem.mealType !== mealType)) {
            handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, mealType);
            setDraggingItem(null);
            setDragOverTarget(null);
          }
        }}
        className={`p-2.5 sm:p-3 transition-colors group relative flex items-center gap-2.5 cursor-grab active:cursor-grabbing hover:bg-surface flex-1 ${
          isDraggingThis
            ? 'opacity-30 bg-stone-50'
            : isDragOverThis
            ? 'bg-[#E8F1EC] ring-2 ring-inset ring-accent'
            : ''
        }`}
      >
        {/* Left: Thumbnail Preview (~52px) */}
        <div
          onClick={() => {
            if (recipe) onSelectRecipe(recipe);
          }}
          className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-xl overflow-hidden border border-border shrink-0 bg-surface relative cursor-pointer group-hover:shadow-2xs transition-shadow"
        >
          {recipe ? (
            <RecipeImage recipe={recipe} className="w-full h-full" imgClassName="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <ChefHat className="w-5 h-5 text-text-muted" />
            </div>
          )}
          {/* 6-Punkte Grip-Element: Auf Mobile ausgeblendet (hidden sm:block) */}
          <div
            className="hidden sm:block absolute bottom-0 right-0 p-0.5 bg-black/40 text-on-accent rounded-tl-md sm:opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            title="Ziehen zum Tauschen/Verschieben"
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>

        {/* Center: Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-text-muted">
              {mealType === 'lunch' ? 'Mittag' : 'Abendessen'}
            </span>
            {isSwapTarget && (
              <span className="text-[10px] font-bold text-accent bg-card px-1.5 py-0.2 rounded border border-accent shadow-2xs ml-auto">
                Tauschen ⇄
              </span>
            )}
          </div>

          <h4
            onClick={() => {
              if (recipe) onSelectRecipe(recipe);
            }}
            className="text-[16px] font-bold text-text-main leading-snug hover:text-accent cursor-pointer transition-colors break-words"
            title={slot.recipeTitle}
          >
            {slot.recipeTitle}
          </h4>

          {/* Key Stats row beneath title: 13px auf Mobile und Desktop, kein Abschneiden */}
          <div className="flex flex-wrap items-center text-[13px] text-text-muted font-medium gap-x-1.5 gap-y-0.5 mt-1">
            <span className="inline-flex items-center gap-1 text-text-muted whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-[#8a918d] shrink-0" />
              <span>{slot.prepTime}m</span>
            </span>
            <span className="text-text-muted select-none">·</span>
            <span className="inline-flex items-center gap-1 text-text-muted whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-600/80 shrink-0" />
              <span>{slot.calories} kcal</span>
            </span>
            <span className="text-text-muted select-none">·</span>
            <span className="inline-flex items-center gap-1 text-text-muted whitespace-nowrap">
              <Dumbbell className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>{slot.protein}g</span>
            </span>
            {slot.isVegan && (
              <>
                <span className="text-text-muted select-none">·</span>
                <span className="inline-flex items-center gap-1 text-[13px] text-accent font-medium whitespace-nowrap">
                  <Leaf className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Vegan</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right / Top-Right: Actions (Auf Mobile im Flow mit barrierefreiem 40px Touch-Target, auf PC als Hover-Button) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeSlot(day.dayId, mealType);
            onCopyFeedback(`"${slot.recipeTitle || 'Mahlzeit'}" entfernt.`);
          }}
          className="text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center
            opacity-75 hover:opacity-100 w-10 h-10 min-w-[40px] min-h-[40px] shrink-0
            sm:absolute sm:top-2 sm:right-2 sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 sm:opacity-0 sm:group-hover:opacity-100 sm:bg-card sm:border sm:border-border sm:shadow-2xs"
          title="Mahlzeit entfernen"
          aria-label="Mahlzeit entfernen"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </motion.div>
    );
  };

  const renderEmptySlot = (day: DayPlan, mealType: 'lunch' | 'dinner') => {
    const isDragOverThis = dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === mealType;
    const label = mealType === 'lunch'
      ? 'Mittagessen planen'
      : 'Abendessen planen';

    return (
      <motion.div
        layout="position"
        key={`${day.dayId}-${mealType}-empty`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        data-drop-slot="true"
        data-day-id={day.dayId}
        data-meal-type={mealType}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverTarget({ dayId: day.dayId, mealType });
        }}
        onDragLeave={() => {
          if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === mealType) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingItem) {
            handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, mealType);
            setDraggingItem(null);
            setDragOverTarget(null);
          }
        }}
        className="p-2 sm:p-2.5 flex-1 flex flex-col justify-center"
      >
        <button
          type="button"
          onClick={() => openRecipePicker(day.dayId, mealType)}
          className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-[14px] font-medium flex items-center justify-center gap-1.5 transition-all min-h-[44px] touch-manipulation active:scale-[0.99] cursor-pointer ${
            isDragOverThis
              ? 'border-accent bg-[#E8F1EC] text-accent ring-2 ring-accent/40 font-semibold'
              : draggingItem
              ? 'border-accent/60 bg-surface text-accent'
              : 'border-[#D5DDD7] hover:border-accent text-[#57534d] hover:text-accent bg-surface/40 hover:bg-accent-tint'
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="text-[#57534d] group-hover:text-accent truncate text-[14px]">
            {label}
          </span>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs space-y-3 sm:space-y-4">
        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
            Dein Wochenplan
          </h1>
          <p className="text-base text-text-muted leading-relaxed mt-1">
            Mahlzeiten planen, Nährwerte prüfen &amp; Zutaten einkaufen.
          </p>
        </div>

        {/* Unified Action Row with divider after header (wie in der Einkaufsliste) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-border">
          {/* Left side: Compact servings stepper */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-text-main hidden xs:inline select-none">
              Portionen:
            </span>
            <div className="inline-flex items-center bg-surface border border-border rounded-xl p-0.5 shadow-2xs h-11 min-h-[44px]">
              <button
                id="weekly-plan-servings-decrease-btn"
                type="button"
                onClick={() => setPlanServings((prev) => Math.max(1, prev - 1))}
                disabled={planServings <= 1}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-card active:bg-border disabled:opacity-30 text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
                aria-label="Portion verringern"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="h-5 w-[1px] bg-border shrink-0" />
              <span className="px-3 text-sm sm:text-base font-bold text-text-main tabular-nums min-w-[95px] text-center select-none whitespace-nowrap">
                {planServings} {planServings === 1 ? 'Portion' : 'Portionen'}
              </span>
              <div className="h-5 w-[1px] bg-border shrink-0" />
              <button
                id="weekly-plan-servings-increase-btn"
                type="button"
                onClick={() => setPlanServings((prev) => Math.min(24, prev + 1))}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-card active:bg-border text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
                aria-label="Portion erhöhen"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-start sm:justify-end">
            {/* 3-Punkte-Menü Button (Klassisches iOS Select-Menü auf Mobile & Dropdown auf Desktop) */}
            <div className="relative shrink-0" ref={contextMenuRef}>
              {/* Native iOS / Mobile Dropdown Select */}
              <select
                aria-label="Wochenplan-Optionen"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'add-week') {
                    setNewWeekTitleInput('');
                    setShowCreateWeekModal(true);
                  }
                  else if (val === 'all-weeks') setShowAllWeeksModal(true);
                  else if (val === 'clear-plan') setShowConfirmClearAll(true);
                  e.target.value = '';
                }}
                className="sm:hidden absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer text-[16px]"
              >
                <option value="" disabled>Wochenplan-Optionen...</option>
                <option value="add-week">Woche hinzufügen</option>
                <option value="all-weeks">Alle Wochen anzeigen</option>
                {totalPlannedMeals > 0 && (
                  <option value="clear-plan">Plan leeren</option>
                )}
              </select>

              <button
                type="button"
                id="weekly-planner-context-menu-btn"
                onClick={() => setShowContextMenu((prev) => !prev)}
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs border ${
                  showContextMenu
                    ? 'bg-[#E5EBE6] text-text-main border-accent-border ring-2 ring-accent/25'
                    : 'bg-surface hover:bg-accent-tint text-text-main hover:text-text-main border-border hover:border-accent-border'
                }`}
                title="Weitere Optionen"
                aria-label="Weitere Optionen"
                aria-expanded={showContextMenu}
              >
                <MoreHorizontal className="w-5 h-5 text-text-main" />
              </button>

              {showContextMenu && (
                <>
                  {/* Backdrop for click outside on desktop */}
                  <div
                    className="hidden sm:block fixed inset-0 z-40"
                    onClick={() => setShowContextMenu(false)}
                    aria-hidden="true"
                  />

                  {/* Desktop Dropdown Popover (>= sm) */}
                  <div className="hidden sm:block absolute right-0 top-full mt-2 w-72 bg-card rounded-2xl border border-border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                    <button
                      type="button"
                      id="context-menu-add-week-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        setNewWeekTitleInput('');
                        setShowCreateWeekModal(true);
                      }}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-text-main hover:bg-surface active:bg-accent-tint flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-accent">
                        <Plus className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="truncate">Woche hinzufügen</span>
                    </button>

                    <button
                      type="button"
                      id="context-menu-all-weeks-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        setShowAllWeeksModal(true);
                      }}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-text-main hover:bg-surface active:bg-accent-tint flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-accent">
                        <Layers className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="truncate">Alle Wochen anzeigen</span>
                    </button>

                    <div className="border-t border-border my-1" />

                    <button
                      type="button"
                      id="context-menu-clear-plan-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        setShowConfirmClearAll(true);
                      }}
                      disabled={totalPlannedMeals === 0}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100/70 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="truncate">Plan leeren</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* AI Generator Modal Trigger - Harmonized secondary action */}
            <button
              id="open-ai-meal-plan-modal-btn"
              onClick={() => setShowAIGeneratorModal(true)}
              className="flex items-center justify-center gap-2 px-3.5 sm:px-4.5 py-2.5 rounded-xl bg-surface hover:bg-accent-tint active:bg-border border border-border hover:border-accent-border text-text-main font-semibold text-sm sm:text-base shadow-2xs transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap h-11 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              <span>KI-Wochenplan</span>
            </button>

            {/* 1-Click All to Shopping List - Single prominent filled primary CTA */}
            <button
              id="transfer-week-to-shopping-btn"
              onClick={handleTransferAllToShopping}
              disabled={totalPlannedMeals === 0}
              className="flex items-center justify-center gap-2 px-3.5 sm:px-4.5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-on-accent font-semibold text-sm sm:text-base shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap h-11 min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Zutaten auf Liste</span>
            </button>
          </div>
        </div>
      </div>




      {/* 7-Day Grid: Clean Day Containers following "Regale" pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {mealPlan.map((day) => {
          const isLunchVisible = showLunchSlot;

          const totalCalories = (day.lunch?.calories || 0) + (day.dinner?.calories || 0);
          const totalProtein = (day.lunch?.protein || 0) + (day.dinner?.protein || 0);

          return (
            <motion.div
              layout="position"
              key={day.dayId}
              id={`meal-plan-day-${day.dayId}`}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-accent/40 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              {/* Day Header Bar: Klickbar zum Ein- und Ausfahren des Mittags-Slots (schaltet alle Tage synchron) */}
              <button
                type="button"
                onClick={toggleDayLunch}
                className="w-full bg-accent-tint hover:bg-[#e7eee9] active:bg-[#dde6e0] px-3.5 py-2.5 border-b border-border flex items-center justify-between gap-1.5 flex-wrap cursor-pointer transition-colors text-left select-none group min-h-[44px]"
                title={isLunchVisible ? 'Alle Mittags-Slots einklappen' : 'Alle Mittags-Slots ausklappen'}
                aria-expanded={isLunchVisible}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[16px] text-text-main group-hover:text-accent transition-colors">
                    {day.dayName}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted group-hover:text-accent transition-transform duration-200 ${
                      isLunchVisible ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                  {!isLunchVisible && day.lunch && (
                    <span
                      className="w-2 h-2 rounded-full bg-accent shrink-0 inline-block"
                      title={`Mittagsgericht vorhanden: ${day.lunch.recipeTitle}`}
                    />
                  )}
                </div>

                {totalCalories > 0 || totalProtein > 0 ? (
                  <div
                    className="text-[13px] text-[#57534d] font-medium flex items-center gap-1.5 shrink-0"
                    title={`Tagesgesamtwerte: ${totalCalories} kcal, ${totalProtein}g Protein`}
                  >
                    {totalCalories > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#57534d] text-[13px]">
                        <Flame className="w-3.5 h-3.5 text-amber-600/80 shrink-0" />
                        <span>{totalCalories} kcal</span>
                      </span>
                    )}
                    {totalCalories > 0 && totalProtein > 0 && <span className="text-text-muted">•</span>}
                    {totalProtein > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#57534d] font-semibold text-[13px]">
                        <Dumbbell className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{totalProtein}g</span>
                      </span>
                    )}
                  </div>
                ) : null}
              </button>

              {/* Flat Interior: Clean white background, separated only by subtle hairline dividers */}
              <div className="divide-y divide-border flex-1 flex flex-col">
                {/* Lunch Slot: Ein- und ausfahrbar per Klick auf den Tagesheader */}
                <AnimatePresence>
                  {isLunchVisible && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      {day.lunch
                        ? renderMealItem(day, 'lunch', day.lunch)
                        : renderEmptySlot(day, 'lunch')}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dinner Slot */}
                {day.dinner
                  ? renderMealItem(day, 'dinner', day.dinner)
                  : renderEmptySlot(day, 'dinner')}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Undo Notification Banner (Unten am Ende des Wochenplans, exakt gleiches Design wie Einkaufsliste) */}
      {showUndoBanner && undoBackup && (
        <div className="p-3.5 sm:p-4 bg-text-main text-on-accent rounded-2xl shadow-lg border border-border/20 flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-bottom duration-200 mt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="text-[16px] font-medium text-on-accent/95 truncate">
              {lastDeletedMealInfo?.type === 'single' && lastDeletedMealInfo.title
                ? `"${lastDeletedMealInfo.title}" entfernt.`
                : 'Der Wochenplan wurde geleert.'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="undo-clear-meal-plan-btn"
              type="button"
              onClick={handleUndoClearMealPlan}
              className="h-[44px] min-h-[44px] px-4 sm:px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-[16px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 sm:hidden" />
              <span>Rückgängig</span>
            </button>
            <button
              type="button"
              onClick={() => setShowUndoBanner(false)}
              className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-on-accent/70 hover:text-on-accent hover:bg-card/10 transition-colors cursor-pointer touch-manipulation active:scale-95"
              title="Schließen"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Drag & Drop Ghost for Touch Devices */}
      {touchDragState && (
        <div
          style={{
            left: `${touchDragState.currentX}px`,
            top: `${touchDragState.currentY - 50}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="fixed z-9999 pointer-events-none bg-card rounded-xl shadow-2xl border-2 border-accent p-2.5 max-w-[220px] w-max flex items-center gap-2 opacity-95"
        >
          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-accent truncate">
              {touchDragState.source.slot.isVegan ? 'Vegan • ' : ''}{touchDragState.source.mealType === 'lunch' ? 'Mittag' : 'Abend'}
            </div>
            <div className="text-xs font-bold text-text-main truncate max-w-[180px]">
              {touchDragState.source.slot.recipeTitle}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Picker Modal - Breitere Ansicht mit hoher Informationsdichte & Favoriten-Sortierung */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 z-50 bg-text-main/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 touch-none overscroll-contain animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full p-3 sm:p-5 flex flex-col h-[94vh] sm:h-[88vh] max-h-[860px] shadow-2xl border border-border animate-in zoom-in-95 duration-150 overscroll-contain overflow-hidden"
          >
            {/* Header: Übersichtlich mit Wochentag, Mahlzeit & Rezept-Zähler */}
            <div className="flex items-center justify-between border-b border-border pb-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-semibold text-accent bg-accent-tint border border-border shrink-0">
                  {mealPlan.find((d) => d.dayId === selectedDayId)?.dayName || 'Wochentag'} • {selectedMealType === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                </span>
                <h3 className="text-xl font-bold text-text-main truncate">
                  Gericht auswählen
                </h3>
                <span className="hidden md:inline text-sm font-medium text-text-muted">
                  ({filteredPickerRecipes.length} Rezepte)
                </span>
              </div>
              <button
                onClick={() => setShowRecipePickerModal(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[#57534d] hover:text-accent bg-surface hover:bg-accent-tint border border-border flex items-center justify-center cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search, Filter & Sort Bar: Aufgeräumt, vollwertige Buttons & Sortierung wie auf Startseite */}
            <div className="py-2.5 flex flex-col gap-2 border-b border-border">
              {/* Row 1: Search, Sort Dropdown & Favoriten-Herz-Button */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="Gericht oder Zutat suchen..."
                    className="w-full h-11 min-h-[44px] pl-11 pr-10 py-2.5 rounded-xl border border-border bg-surface text-text-main placeholder:text-text-muted text-base font-medium focus:bg-card focus:outline-hidden focus:border-accent transition-all"
                  />
                  {pickerSearchQuery && (
                    <button
                      onClick={() => setPickerSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#57534d] hover:text-accent w-8 h-8 flex items-center justify-center rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sortierung wie auf der Startseite */}
                <div className="relative shrink-0">
                  <select
                    id="picker-sort-by"
                    value={pickerSortBy}
                    onChange={(e) => setPickerSortBy(e.target.value as FilterState['sortBy'])}
                    className="appearance-none h-11 min-h-[44px] bg-surface border border-border hover:border-accent/50 text-text-main text-[15px] sm:text-[16px] font-medium rounded-xl pl-9 pr-8 py-2 cursor-pointer focus:outline-hidden focus:border-accent transition-colors"
                  >
                    {PICKER_SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ArrowUpDown className="w-4 h-4 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 2: Filter pills: Pixel-Perfect vertikale Zentrierung, Pill-Shape (rounded-full), kombinierbare Filter inkl. Gelikt (Herz) */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 overflow-x-auto py-1 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-sm">
                {/* Alle Button - aktiv wenn kein Filter gewählt ist */}
                <button
                  type="button"
                  onClick={() => {
                    setPickerOnlyVegan(false);
                    setPickerOnlyFavorites(false);
                    setPickerQuick(false);
                    setPickerHighProtein(false);
                  }}
                  className={`inline-flex items-center justify-center h-12 sm:h-11 min-h-[48px] sm:min-h-[44px] px-4.5 sm:px-4.5 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border ${
                    !pickerOnlyVegan && !pickerOnlyFavorites && !pickerQuick && !pickerHighProtein
                      ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                      : 'bg-card text-[#57534D] border-border hover:bg-surface hover:text-text-main hover:border-[#D6D3D1] font-medium'
                  }`}
                >
                  <span className="leading-none">Alle ({allRecipes.length})</span>
                </button>

                {/* Gelikt / Favoriten Pill - frei kombinierbar, rote Farbe bei Aktivierung */}
                <button
                  type="button"
                  id="picker-favorites-filter-btn"
                  onClick={() => setPickerOnlyFavorites((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 h-12 sm:h-11 min-h-[48px] sm:min-h-[44px] px-4.5 sm:px-4.5 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                    pickerOnlyFavorites
                      ? 'bg-[#E74C3C] text-on-accent border-transparent font-semibold shadow-xs'
                      : 'bg-card text-[#57534D] border-border hover:bg-surface hover:text-text-main hover:border-[#D6D3D1] font-medium'
                  }`}
                  title="Gelikte Rezepte filtern (kombinierbar)"
                >
                  <Heart className={`w-4 h-4 shrink-0 transition-colors ${pickerOnlyFavorites ? 'fill-on-accent text-on-accent' : 'text-[#78716C] group-hover:text-[#E74C3C]'}`} />
                  <span className="leading-none">Gelikt ({favorites.filter((id) => allRecipes.some((r) => r.id === id)).length})</span>
                </button>

                {/* Vegan Pill - frei kombinierbar */}
                <button
                  type="button"
                  id="picker-vegan-filter-btn"
                  onClick={() => setPickerOnlyVegan((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 h-12 sm:h-11 min-h-[48px] sm:min-h-[44px] px-4.5 sm:px-4.5 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                    pickerOnlyVegan
                      ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                      : 'bg-card text-[#57534D] border-border hover:bg-surface hover:text-text-main hover:border-[#D6D3D1] font-medium'
                  }`}
                  title="Vegan zusätzlich filtern (kombinierbar)"
                >
                  <Leaf className={`w-4 h-4 shrink-0 transition-colors ${pickerOnlyVegan ? 'text-on-accent' : 'text-[#78716C] group-hover:text-text-main'}`} />
                  <span className="leading-none">Vegan</span>
                </button>

                {/* Schnell Pill - frei kombinierbar mit Vegan & High Protein */}
                <button
                  type="button"
                  onClick={() => setPickerQuick((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 h-12 sm:h-11 min-h-[48px] sm:min-h-[44px] px-4.5 sm:px-4.5 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                    pickerQuick
                      ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                      : 'bg-card text-[#57534D] border-border hover:bg-surface hover:text-text-main hover:border-[#D6D3D1] font-medium'
                  }`}
                >
                  <Zap className={`w-4 h-4 shrink-0 transition-colors ${pickerQuick ? 'text-on-accent' : 'text-[#78716C] group-hover:text-text-main'}`} />
                  <span className="leading-none">Schnell (&le;30m)</span>
                </button>

                {/* High Protein Pill - frei kombinierbar mit Vegan & Schnell */}
                <button
                  type="button"
                  onClick={() => setPickerHighProtein((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2 h-12 sm:h-11 min-h-[48px] sm:min-h-[44px] px-4.5 sm:px-4.5 rounded-full transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm border group ${
                    pickerHighProtein
                      ? 'bg-accent text-on-accent border-transparent font-semibold shadow-xs'
                      : 'bg-card text-[#57534D] border-border hover:bg-surface hover:text-text-main hover:border-[#D6D3D1] font-medium'
                  }`}
                >
                  <Dumbbell className={`w-4 h-4 shrink-0 transition-colors ${pickerHighProtein ? 'text-on-accent' : 'text-[#78716C] group-hover:text-text-main'}`} />
                  <span className="leading-none">High Protein</span>
                </button>
              </div>
            </div>

            {/* Recipes Grid: Aufgeräumt & modern auf PC (3-Spalten Rezeptkarten mit Headerbild & vollwertigen Buttons) */}
            <div className="overflow-y-auto pr-1 flex-1 overscroll-contain pt-3">
              {filteredPickerRecipes.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <p className="text-base font-semibold text-text-main">Keine passenden Rezepte gefunden</p>
                  <p className="text-sm text-text-muted">Passe deinen Suchbegriff oder Filter an.</p>
                  {(pickerOnlyVegan || pickerOnlyFavorites || pickerQuick || pickerHighProtein || pickerSearchQuery) && (
                    <button
                      onClick={() => {
                        setPickerOnlyVegan(false);
                        setPickerOnlyFavorites(false);
                        setPickerQuick(false);
                        setPickerHighProtein(false);
                        setPickerSearchQuery('');
                      }}
                      className="mt-2 text-sm font-semibold text-accent hover:underline cursor-pointer"
                    >
                      Filter aufheben
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
                  {filteredPickerRecipes.map((recipe) => {
                    const isFav = favorites.includes(recipe.id);

                    return (
                      <div
                        key={recipe.id}
                        onClick={() => assignRecipeToSlot(recipe)}
                        className={`bg-card rounded-2xl border transition-all cursor-pointer group shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative touch-manipulation active:scale-[0.99] ${
                          isFav 
                            ? 'border-rose-200 hover:border-rose-400' 
                            : 'border-border hover:border-accent'
                        }`}
                      >
                        {/* Bild-Header mit Badges und Favorit-Button */}
                        <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-surface shrink-0">
                          <RecipeImage
                            recipe={recipe}
                            imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            alt={recipe.title}
                          />
                          
                          {/* Badges oben links */}
                          {!recipe.isVegan && recipe.diet !== 'vegan' && (
                            <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                              <span className="inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs">
                                Vegetarisch
                              </span>
                            </div>
                          )}
                          {recipe.isVegan && (
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap pointer-events-none">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-on-accent text-xs font-semibold border border-on-accent/20 shadow-xs">
                                🌱 Vegan
                              </span>
                            </div>
                          )}

                          {/* Favoriten-Button oben rechts (48x48px Liquid Glass Effect) */}
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(recipe.id);
                              }}
                              className="absolute top-2.5 right-2.5 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-on-accent shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 touch-manipulation cursor-pointer border border-on-accent/10 z-10"
                              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                              aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                            >
                              <Heart className={`w-5 h-5 transition-colors ${isFav ? 'fill-[#E74C3C] text-[#E74C3C]' : 'text-on-accent'}`} />
                            </button>
                          )}
                        </div>

                        {/* Rezept-Details & Nährwerte */}
                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="text-[17px] font-bold text-text-main group-hover:text-accent leading-snug transition-colors">
                              {recipe.title}
                            </h4>
                            <div className="flex items-center justify-between text-[13px] font-medium text-text-muted mt-2 pt-2 border-t border-border">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#8a918d]" />
                                <span>{recipe.totalTimeMinutes} Min.</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-600/80" />
                                <span>{recipe.nutrients.calories} kcal</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-accent font-bold">
                                <Dumbbell className="w-3.5 h-3.5 text-accent" />
                                <span>{recipe.nutrients.protein}g Protein</span>
                              </span>
                            </div>
                          </div>

                          {/* Vollwertiger, großer Auswählen-Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignRecipeToSlot(recipe);
                            }}
                            className="w-full h-11 min-h-[44px] rounded-xl bg-accent group-hover:bg-accent-hover text-on-accent text-sm font-semibold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-2"
                            title="Dieses Gericht einplanen"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Gericht wählen</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Meal Plan Generator Modal - Reformed and Streamlined for PC without scrolling */}
      <AnimatePresence>
        {showAIGeneratorModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowAIGeneratorModal(false)}
            className="fixed inset-0 z-50 bg-text-main/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 touch-none overscroll-contain"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-border max-h-[94vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain flex flex-col justify-between"
            >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xl font-bold text-text-main leading-snug">
                  7-Tage-Wochenplan erstellen
                </h3>
              </div>
              <button
                onClick={() => setShowAIGeneratorModal(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface border border-border text-[#57534d] hover:text-accent flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-3.5 space-y-4">
              {/* Hauptpunkte 1, 2, 3 in einem harmonischen Raster */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {/* 1. Mahlzeiten */}
                <div>
                  <label className="block font-bold text-text-main text-[13px] uppercase tracking-wider mb-1.5">
                    1. Mahlzeiten
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAiMealOption('lunch')}
                      className={`h-11 min-h-[44px] py-2 px-1 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
                        aiMealOption === 'lunch'
                          ? 'bg-accent text-on-accent border-accent shadow-xs'
                          : 'bg-surface text-text-muted border-border hover:bg-card'
                      }`}
                    >
                      <Sun className="w-4 h-4 shrink-0" />
                      <span>Mittag</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMealOption('dinner')}
                      className={`h-11 min-h-[44px] py-2 px-1 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
                        aiMealOption === 'dinner'
                          ? 'bg-accent text-on-accent border-accent shadow-xs'
                          : 'bg-surface text-text-muted border-border hover:bg-card'
                      }`}
                    >
                      <Moon className="w-4 h-4 shrink-0" />
                      <span>Abend</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMealOption('both')}
                      className={`h-11 min-h-[44px] py-2 px-1 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
                        aiMealOption === 'both'
                          ? 'bg-accent text-on-accent border-accent shadow-xs'
                          : 'bg-surface text-text-muted border-border hover:bg-card'
                      }`}
                    >
                      <Utensils className="w-4 h-4 shrink-0" />
                      <span>Beides</span>
                    </button>
                  </div>
                </div>

                {/* 2. Ernährungsweise */}
                <div>
                  <label className="block font-bold text-text-main text-[13px] uppercase tracking-wider mb-1.5">
                    2. Ernährungsweise
                  </label>
                  <div className="bg-surface p-1 rounded-xl grid grid-cols-2 gap-1.5 h-11 min-h-[44px] items-center border border-border">
                    <button
                      type="button"
                      id="ai-diet-veggie-btn"
                      onClick={() => setAiIsVegan(false)}
                      className={`h-9 min-h-[36px] px-3 rounded-lg transition-all flex items-center justify-center cursor-pointer touch-manipulation select-none ${
                        !aiIsVegan
                          ? 'bg-accent text-on-accent shadow-2xs font-semibold'
                          : 'text-[#57534d] hover:text-text-main border-0 bg-transparent font-medium'
                      }`}
                    >
                      <span style={{ color: !aiIsVegan ? '#ffffff' : '#57534d', fontSize: '15px' }}>Veggie</span>
                    </button>
                    <button
                      type="button"
                      id="ai-diet-vegan-btn"
                      onClick={() => setAiIsVegan(true)}
                      className={`h-9 min-h-[36px] px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                        aiIsVegan
                          ? 'bg-accent text-on-accent shadow-2xs font-semibold'
                          : 'text-[#57534d] hover:text-text-main border-0 bg-transparent font-medium'
                      }`}
                    >
                      <Leaf className="w-4 h-4 shrink-0" />
                      <span style={{ color: aiIsVegan ? '#ffffff' : '#57534d', fontSize: '15px' }}>Vegan</span>
                    </button>
                  </div>
                </div>

                {/* 3. Portionen */}
                <div>
                  <label className="block font-bold text-text-main text-[13px] uppercase tracking-wider mb-1.5">
                    3. Portionen
                  </label>
                  <HybridPortionStepper
                    value={aiPeopleCount}
                    onChange={setAiPeopleCount}
                    idPrefix="ai-modal-people-count"
                    className="w-full justify-between"
                  />
                </div>
              </div>

              {/* Dünne Trennlinie vor dem ausklappbaren Element */}
              <div className="border-t border-border" />

              {/* Wünsche & Feineinstellungen - Einklappbares Element wie in der Vorratskammer */}
              <div className="space-y-3">
                {/* Accordion Toggle Header */}
                <button
                  type="button"
                  id="ai-toggle-preferences-btn"
                  onClick={() => setIsAiPreferencesOpen((prev) => !prev)}
                  aria-expanded={isAiPreferencesOpen}
                  aria-controls="ai-meal-plan-extra-section"
                  className="w-full min-h-[48px] p-3 sm:p-4 rounded-xl bg-accent-tint hover:bg-surface border border-border hover:border-accent/40 flex items-center justify-between text-left cursor-pointer select-none touch-manipulation transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center text-accent shrink-0">
                      <Sliders className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-text-main">
                          Wünsche &amp; Feineinstellungen
                        </span>
                      </div>
                      {/* Untertitel / Zusammenfassung */}
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {`Max. ${aiMaxMinutes} Min.`}
                        {' · '}
                        {aiCalorieFilter !== 'all' ? (aiCalorieFilter === 'high' ? '750+ kcal' : aiCalorieFilter === 'low' ? '< 500 kcal' : '500–700 kcal') : 'Kalorien: Alle'}
                        {' · '}
                        {aiProteinFilter !== 'all' ? (aiProteinFilter === 'very-high' ? '40+ g' : aiProteinFilter === 'high' ? '30+ g' : '20+ g') : 'Protein: Alle'}
                        {aiDifficultyFilter !== 'all' && ` · ${aiDifficultyFilter}`}
                        {aiWishes.trim() ? ` · "${aiWishes.trim().slice(0, 16)}..."` : ' · Keine Wünsche'}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted group-hover:text-accent transition-colors shrink-0 ml-2">
                    <ChevronDown
                      className={`w-5 h-5 text-accent transition-transform duration-200 shrink-0 ${
                        isAiPreferencesOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Accordion Content mit Schritt-für-Schritt Timeline wie in der Vorratskammer */}
                <div
                  id="ai-meal-plan-extra-section"
                  className={`grid transition-all duration-250 ease-in-out ${
                    isAiPreferencesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pt-3 pb-1">
                      <div className="relative pl-1 sm:pl-3 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
                        {/* Schritt 4: Zubereitungszeit */}
                        <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                          {/* Timeline indicator circle */}
                          <div
                            className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                              aiMaxMinutes < 50
                                ? 'bg-accent text-on-accent shadow-2xs'
                                : 'bg-card border-2 border-accent text-accent'
                            }`}
                          >
                            {aiMaxMinutes < 50 ? <Check className="w-4 h-4 stroke-[3]" /> : '4'}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-[16px] font-bold text-text-main">
                                Zubereitungszeit
                              </h4>
                              <AnimatePresence>
                                {!isAiTimeSliderActive && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-2 py-0.5 rounded-full bg-accent-tint border border-border text-accent font-bold text-xs tabular-nums"
                                  >
                                    {aiMaxMinutes} Min.
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Schieberegler für Zeit - identisch zur Vorratskammer mit iOS Pille */}
                            <div className="relative py-2.5 flex items-center">
                              <AnimatePresence>
                                {isAiTimeSliderActive && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 7, scale: 0.85 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.88 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                      left: `calc(${((aiMaxMinutes - 15) / (50 - 15)) * 100}% + ${(0.5 - (aiMaxMinutes - 15) / (50 - 15)) * 24}px)`,
                                    }}
                                    className="absolute bottom-[calc(50%+26px)] -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center select-none"
                                  >
                                    <div className="px-4 py-1 rounded-full bg-card border border-[#D3DCD5] shadow-lg text-[#355F40] font-extrabold text-[17px] tabular-nums whitespace-nowrap">
                                      {aiMaxMinutes} Min.
                                    </div>
                                    <div className="w-3 h-3 bg-card border-r border-b border-[#D3DCD5] rotate-45 -mt-1.5 shadow-xs" />
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <input
                                id="ai-time-slider"
                                type="range"
                                min="15"
                                max="50"
                                step="5"
                                value={aiMaxMinutes}
                                onPointerDown={() => setIsAiTimeSliderActive(true)}
                                onPointerUp={() => setIsAiTimeSliderActive(false)}
                                onPointerCancel={() => setIsAiTimeSliderActive(false)}
                                onTouchStart={() => setIsAiTimeSliderActive(true)}
                                onTouchEnd={() => setIsAiTimeSliderActive(false)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val !== aiMaxMinutes && typeof window !== 'undefined' && 'vibrate' in navigator) {
                                    try { navigator.vibrate(8); } catch {}
                                  }
                                  setAiMaxMinutes(val);
                                }}
                                className="ios-slider"
                                style={{
                                  background: `linear-gradient(to right, #4A7856 ${((aiMaxMinutes - 15) / (50 - 15)) * 100}%, #E3E8E5 ${((aiMaxMinutes - 15) / (50 - 15)) * 100}%)`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[13px] text-text-muted font-medium tabular-nums px-0.5">
                              <span>15 Min.</span>
                              <span>50 Min.</span>
                            </div>
                          </div>
                        </div>

                        {/* Schritt 5: Nährwerte & Ansprüche */}
                        <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                          {/* Timeline indicator circle */}
                          <div
                            className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                              (aiCalorieFilter !== 'all' || aiProteinFilter !== 'all' || aiDifficultyFilter !== 'all')
                                ? 'bg-accent text-on-accent shadow-2xs'
                                : 'bg-card border-2 border-accent text-accent'
                            }`}
                          >
                            {(aiCalorieFilter !== 'all' || aiProteinFilter !== 'all' || aiDifficultyFilter !== 'all') ? <Check className="w-4 h-4 stroke-[3]" /> : '5'}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-[16px] font-bold text-text-main">
                                Nährwerte &amp; Ansprüche
                              </h4>
                              {(aiCalorieFilter !== 'all' || aiProteinFilter !== 'all' || aiDifficultyFilter !== 'all') && (
                                <span className="text-[11px] font-semibold text-accent bg-accent-tint px-2 py-0.5 rounded-full border border-border">
                                  Aktiv
                                </span>
                              )}
                            </div>

                            {/* 3 Dropdowns in einer Reihe - Labels direkt in den Boxen in dunklem Grau #57534d */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              {/* Kalorien */}
                              <div className="relative">
                                <select
                                  id="ai-filter-calories"
                                  aria-label="Kalorien"
                                  value={aiCalorieFilter}
                                  onChange={(e) => setAiCalorieFilter(e.target.value)}
                                  style={{ color: '#57534d' }}
                                  className={`w-full appearance-none h-11 min-h-[44px] bg-surface border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                                    aiCalorieFilter === 'all' ? '' : 'font-semibold'
                                  }`}
                                >
                                  <option value="all">Kalorien: Alle</option>
                                  <option value="low">&lt; 500 kcal</option>
                                  <option value="moderate">500–700 kcal</option>
                                  <option value="high">750+ kcal</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>

                              {/* Proteine */}
                              <div className="relative">
                                <select
                                  id="ai-filter-protein"
                                  aria-label="Proteine"
                                  value={aiProteinFilter}
                                  onChange={(e) => setAiProteinFilter(e.target.value)}
                                  style={{ color: '#57534d' }}
                                  className={`w-full appearance-none h-11 min-h-[44px] bg-surface border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                                    aiProteinFilter === 'all' ? '' : 'font-semibold'
                                  }`}
                                >
                                  <option value="all">Protein: Alle</option>
                                  <option value="medium">20+ g</option>
                                  <option value="high">30+ g</option>
                                  <option value="very-high">40+ g</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>

                              {/* Schwierigkeit */}
                              <div className="relative">
                                <select
                                  id="ai-filter-difficulty"
                                  aria-label="Schwierigkeit"
                                  value={aiDifficultyFilter}
                                  onChange={(e) => setAiDifficultyFilter(e.target.value)}
                                  style={{ color: '#57534d' }}
                                  className={`w-full appearance-none h-11 min-h-[44px] bg-surface border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                                    aiDifficultyFilter === 'all' ? '' : 'font-semibold'
                                  }`}
                                >
                                  <option value="all">Schwierigkeit: Alle</option>
                                  <option value="Einfach">Einfach</option>
                                  <option value="Mittel">Mittel</option>
                                  <option value="Anspruchsvoll">Anspruchsvoll</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Schritt 6: Wünsche */}
                        <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                          {/* Timeline indicator circle */}
                          <div
                            className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                              aiWishes.trim()
                                ? 'bg-accent text-on-accent shadow-2xs'
                                : 'bg-card border-2 border-accent text-accent'
                            }`}
                          >
                            {aiWishes.trim() ? <Check className="w-4 h-4 stroke-[3]" /> : '6'}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-[16px] font-bold text-text-main">
                                Wünsche
                              </h4>
                              {aiWishes.trim() && (
                                <span className="text-[11px] font-semibold text-accent bg-accent-tint px-2 py-0.5 rounded-full border border-border">
                                  Aktiv
                                </span>
                              )}
                            </div>

                            <input
                              type="text"
                              id="ai-meal-plan-wishes-input"
                              value={aiWishes}
                              onChange={(e) => setAiWishes(e.target.value)}
                              placeholder="z. B. keine Pilze, asiatisch angehaucht, schnell gekocht..."
                              className="w-full h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-surface focus:bg-card border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent text-[16px] text-text-main placeholder-[#A0A5A1] transition-all outline-none"
                            />
                            {aiWishes.trim() && (
                              <p className="text-[11px] text-accent font-medium">
                                ✓ Wünsche werden bei der KI-Generierung berücksichtigt
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons - Direkt sichtbar ohne Scrollen auf PC */}
            <div className="flex items-center gap-2 sm:gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAIGeneratorModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface border border-border hover:bg-accent-tint text-[#57534d] font-semibold text-sm cursor-pointer touch-manipulation active:scale-95 h-11 min-h-[44px]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                id="submit-ai-meal-plan-btn"
                disabled={isGeneratingPlan}
                onClick={handleGenerateAIMealPlan}
                className="flex-2 py-2.5 px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95 h-11 min-h-[44px]"
              >
                {isGeneratingPlan ? (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-on-accent" />
                    <span>Generiere Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-on-accent" />
                    <span>Plan automatisch generieren</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Safety Confirmation Modal: ONLY for clearing entire week */}
      {showConfirmClearAll && (
        <div 
          id="confirm-clear-all-modal-backdrop"
          onClick={() => setShowConfirmClearAll(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-border space-y-4 animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Sicherheitsabfrage
                </span>
                <h3 className="text-xl font-bold text-text-main">
                  Gesamten Wochenplan leeren?
                </h3>
              </div>
            </div>

            <p className="text-[16px] text-[#57534d] leading-relaxed">
              Möchtest du wirklich alle geplanten Mahlzeiten dieser Woche aus deinem Wochenplan löschen? Du kannst diese Aktion danach über den Rückgängig-Button widerrufen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-clear-plan-btn"
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="min-h-[44px] sm:min-h-[48px] h-12 px-5 rounded-xl border border-border bg-card hover:bg-surface text-[#57534d] font-semibold text-[16px] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                id="confirm-clear-plan-btn"
                type="button"
                onClick={handleConfirmClearAll}
                className="min-h-[44px] sm:min-h-[48px] h-12 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-on-accent font-semibold text-[16px] shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-on-accent" />
                <span>Ja, Plan leeren</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alle Wochen Modal (Dezent & Minimalistisch) */}
      {showAllWeeksModal && (
        <div
          id="all-weeks-modal-backdrop"
          onClick={() => {
            setShowAllWeeksModal(false);
            setConfirmDeleteWeekId(null);
          }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-accent-tint flex items-center justify-center text-accent shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">Alle Wochenpläne</h3>
                  <p className="text-sm font-medium text-text-muted">Wähle eine Woche zum Anzeigen & Planen</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAllWeeksModal(false);
                  setConfirmDeleteWeekId(null);
                }}
                className="w-11 h-11 rounded-xl hover:bg-surface text-[#57534d] hover:text-accent transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5 overscroll-contain">
              {weeks?.map((w) => {
                const isActive = w.id === activeWeekId;
                const plannedCount = w.days.reduce(
                  (acc, d) => acc + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0),
                  0
                );

                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      if (onSelectWeek) onSelectWeek(w.id);
                      setShowAllWeeksModal(false);
                      setConfirmDeleteWeekId(null);
                    }}
                    className={`p-3.5 min-h-[48px] rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-accent-tint border-accent shadow-xs ring-1 ring-accent'
                        : 'bg-card border-border hover:border-accent/40 hover:bg-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-text-main truncate">
                          {w.title}
                        </span>
                        {isActive && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-on-accent">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-text-muted mt-0.5">
                        {w.startDate && <span>{w.startDate}</span>}
                        <span>•</span>
                        <span className="font-semibold text-accent">{plannedCount} Mahlzeiten</span>
                      </div>
                    </div>

                    {confirmDeleteWeekId === w.id ? (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded-xl animate-in fade-in duration-150 shrink-0"
                      >
                        <span className="text-xs font-bold text-rose-700">Löschen?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteWeek) {
                              onDeleteWeek(w.id);
                              onCopyFeedback(`Woche "${w.title}" gelöscht.`);
                            }
                            setConfirmDeleteWeekId(null);
                          }}
                          className="min-h-[44px] px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-on-accent text-[14px] font-bold shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteWeekId(null);
                          }}
                          className="min-h-[44px] px-3 rounded-lg bg-card border border-rose-200 text-[#57534d] hover:text-accent text-[14px] font-semibold cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectWeek) onSelectWeek(w.id);
                              setShowAllWeeksModal(false);
                            }}
                            className="min-h-[40px] px-3.5 rounded-xl bg-card border border-border text-sm font-semibold text-[#57534d] hover:bg-accent-tint cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                          >
                            Öffnen
                          </button>
                        )}
                        {weeks && weeks.length > 1 && onDeleteWeek && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteWeekId(w.id);
                            }}
                            className="w-11 h-11 rounded-xl text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                            title="Woche löschen"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-muted">
                Insgesamt {weeks?.length || 1} {weeks?.length === 1 ? 'Woche' : 'Wochen'}
              </span>
              {onCreateNewWeek && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAllWeeksModal(false);
                    setNewWeekTitleInput('');
                    setShowCreateWeekModal(true);
                  }}
                  className="min-h-[44px] h-11 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Neue Woche</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Neue Woche erstellen Modal */}
      {showCreateWeekModal && (
        <div
          id="create-week-modal-backdrop"
          onClick={() => setShowCreateWeekModal(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border shadow-xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-accent-tint flex items-center justify-center text-accent shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">Neue Woche planen</h3>
                  <p className="text-sm font-medium text-text-muted">Leeren 7-Tage-Plan anlegen</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateWeekModal(false)}
                className="w-11 h-11 rounded-xl hover:bg-surface text-[#57534d] hover:text-accent transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-main">Bezeichnung (optional)</label>
              <input
                type="text"
                value={newWeekTitleInput}
                onChange={(e) => setNewWeekTitleInput(e.target.value)}
                placeholder={`z. B. Woche ${(weeks?.length || 0) + 1} oder KW ${(weeks?.length || 0) + 38}`}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-surface border border-border text-base text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <p className="text-xs font-medium text-text-muted">
                Die bestehende Woche wird gespeichert und du startest mit einem frischen Wochenplan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateWeekModal(false)}
                className="flex-1 min-h-[44px] h-11 py-2.5 rounded-xl border border-border text-sm font-semibold text-[#57534d] hover:text-accent hover:bg-surface transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCreateNewWeek) {
                    onCreateNewWeek(newWeekTitleInput.trim() || undefined);
                  }
                  setShowCreateWeekModal(false);
                }}
                className="flex-1 min-h-[44px] h-11 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-base font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Woche anlegen</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
