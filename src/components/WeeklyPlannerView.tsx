import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Sparkles, 
  ShoppingCart, 
  Plus, 
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
  ChevronDown
} from 'lucide-react';
import { DayPlan, MealPlanSlot, Recipe, WeekPlan } from '../types';
import { RecipeImage } from './RecipeImage';
import { SyncConfig } from '../lib/syncService';
import { Users, Cloud } from 'lucide-react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { usePlanner } from '../context/PlannerContext';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { useSync } from '../context/SyncContext';
import { useToast } from '../context/ToastContext';
import { HybridPortionStepper } from './HybridPortionStepper';
import { safeStorage } from '../utils/helpers';

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
  const [pickerFilter, setPickerFilter] = useState<'all' | 'favorites' | 'vegan' | 'quick' | 'protein'>('all');
  const [pickerSortFavoritesFirst, setPickerSortFavoritesFirst] = useState(true);

  // Toggle showing lunch slot - persisted in safeStorage
  const [showLunchSlot, setShowLunchSlot] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('veggiechef_show_lunch_slot');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleLunchSlot = () => {
    setShowLunchSlot((prev) => {
      const next = !prev;
      try {
        safeStorage.setItem('veggiechef_show_lunch_slot', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Multi-week navigation modals
  const [showAllWeeksModal, setShowAllWeeksModal] = useState(false);
  const [showCreateWeekModal, setShowCreateWeekModal] = useState(false);
  const [newWeekTitleInput, setNewWeekTitleInput] = useState('');

  // AI Meal plan generator modal state - Reformed and simplified!
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [aiMealOption, setAiMealOption] = useState<'lunch' | 'dinner' | 'both'>('both');
  const [aiIsVegan, setAiIsVegan] = useState(true);
  const [aiPeopleCount, setAiPeopleCount] = useState<number>(2);
  const [aiMaxMinutes, setAiMaxMinutes] = useState<number>(0); // 0 = Standardmäßig "Beliebig"
  const [aiCalorieFilter, setAiCalorieFilter] = useState<string>('all'); // 'all', 'high', 'low', 'moderate'
  const [aiProteinFilter, setAiProteinFilter] = useState<string>('all'); // 'all', 'high', 'very-high', 'medium'
  const [aiDifficultyFilter, setAiDifficultyFilter] = useState<string>('all'); // 'all', 'Einfach', 'Mittel', 'Anspruchsvoll'
  const [aiWishes, setAiWishes] = useState<string>('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planServings, setPlanServings] = useState<number>(3);

  // Safety confirmation ONLY for clearing entire week
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const mobileContextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDesktop = contextMenuRef.current && contextMenuRef.current.contains(target);
      const insideMobile = mobileContextMenuRef.current && mobileContextMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  // Undo support for clearing entire meal plan
  const [undoBackup, setUndoBackup] = useState<DayPlan[] | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  const handleClearEntireMealPlan = () => {
    // Check if there are any meals
    const hasAnyMeals = mealPlan.some((d) => d.lunch || d.dinner);
    if (!hasAnyMeals) return;

    setUndoBackup(JSON.parse(JSON.stringify(mealPlan)));
    setMealPlan((prev) => prev.map((d) => ({ ...d, lunch: null, dinner: null })));
    setShowUndoBanner(true);
    onCopyFeedback('Wochenplan wurde geleert.');

    setTimeout(() => {
      setShowUndoBanner(false);
    }, 10000);
  };

  const handleUndoClearMealPlan = () => {
    if (undoBackup) {
      setMealPlan(undoBackup);
      setUndoBackup(null);
      setShowUndoBanner(false);
      onCopyFeedback('Wochenplan wiederhergestellt!');
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
    setPickerFilter(onlyVeganGlobal ? 'vegan' : 'all');
    setShowRecipePickerModal(true);
  };

  const filteredPickerRecipes = React.useMemo(() => {
    let list = allRecipes.filter((recipe) => {
      if (pickerFilter === 'vegan' && !recipe.isVegan) return false;
      if (pickerFilter === 'favorites' && !favorites.includes(recipe.id)) return false;
      if (pickerFilter === 'quick' && recipe.totalTimeMinutes > 30) return false;
      if (pickerFilter === 'protein' && recipe.nutrients.protein < 20) return false;
      if (!pickerSearchQuery.trim()) return true;
      const query = pickerSearchQuery.toLowerCase().trim();
      const matchesTitle = recipe.title.toLowerCase().includes(query);
      const matchesIngredient = recipe.ingredients?.some((ing) => ing.name.toLowerCase().includes(query));
      return matchesTitle || matchesIngredient;
    });

    if (pickerSortFavoritesFirst) {
      list = [...list].sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    }

    return list;
  }, [allRecipes, pickerFilter, pickerSearchQuery, pickerSortFavoritesFirst, favorites]);

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
            servings: 2,
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
      onCopyFeedback(`"${sourceMeal.recipeTitle}" auf ${targetDay.dayName} (${targetMealLabel}) verschoben! 📅`);
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
    onCopyFeedback(`"${sourceMeal.recipeTitle}" aus dem Wochenplan entfernt. 🗑️`);
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
            ) || recipePool[idx % recipePool.length];

            newDay.lunch = {
              recipeId: matched?.id || `plan-lunch-${idx}`,
              recipeTitle: lunchTitle,
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
            ) || recipePool[(idx + 2) % recipePool.length];

            newDay.dinner = {
              recipeId: matched?.id || `plan-dinner-${idx}`,
              recipeTitle: dinnerTitle,
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
          onCopyFeedback(`Wochenplan erstellt – deine Wünsche wurden berücksichtigt! ✨`);
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
          const rec = filteredPool[idx % filteredPool.length];
          newDay.lunch = {
            recipeId: rec?.id || `fb-lunch-${idx}`,
            recipeTitle: rec?.title || (aiIsVegan ? 'Kichererbsen-Avocado Bowl mit Zitronen-Tahini' : 'Mediterraner Hirten-Salat'),
            isVegan: aiIsVegan || Boolean(rec?.isVegan),
            prepTime: rec?.totalTimeMinutes || (aiMaxMinutes > 0 ? aiMaxMinutes : 20),
            calories: rec?.nutrients?.calories || (aiCalorieFilter === 'high' ? 760 : 430),
            protein: rec?.nutrients?.protein || (aiProteinFilter === 'high' ? 32 : 19),
            servings: aiPeopleCount,
          };
        }
        if (aiMealOption === 'dinner' || aiMealOption === 'both') {
          const rec = filteredPool[(idx + 3) % filteredPool.length];
          newDay.dinner = {
            recipeId: rec?.id || `fb-dinner-${idx}`,
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

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#ECEBE8] shadow-xs space-y-3 sm:space-y-4">
        {/* Top: Header Info, Dropdown Menu & Main Action CTAs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            {/* Badges row: Status badge & Family sync button side by side */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8] whitespace-nowrap">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Wöchentliche Essensplanung</span>
              </div>

              {onOpenSyncModal && (
                <button
                  type="button"
                  id="header-family-sync-btn"
                  onClick={onOpenSyncModal}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                    syncConfig?.mode === 'family' && syncConfig?.groupId
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                  title="Synchronisationseinstellungen öffnen"
                >
                  {syncConfig?.mode === 'family' && syncConfig?.groupId ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <Users className="w-3 h-3 text-emerald-700" />
                      <span>Familie: {syncConfig.groupName || syncConfig.groupId}</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-[#7A7E7B]" />
                      <span>Lokal</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Dein Wochenplan
            </h1>
            <p className="text-sm font-medium text-stone-500">
              Mahlzeiten planen, Nährwerte prüfen & Zutaten einkaufen.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* 3-Punkte-Menü Button direkt links neben dem KI-Wochenplan (auf Desktop) */}
            <div className="relative shrink-0 hidden sm:block" ref={contextMenuRef}>
              <button
                type="button"
                id="weekly-planner-context-menu-btn"
                onClick={() => setShowContextMenu((prev) => !prev)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs border ${
                  showContextMenu
                    ? 'bg-[#E5EBE6] text-[#2D3E40] border-[#CCD5CF] ring-2 ring-[#4A7856]/25'
                    : 'bg-[#F1F5F2] hover:bg-[#E5EBE6] text-[#2D3E40] hover:text-stone-900 border-[#ECEBE8] hover:border-[#CCD5CF]'
                }`}
                title="Weitere Optionen (Woche hinzufügen, Alle Wochen anzeigen, Plan leeren)"
                aria-label="Weitere Optionen"
              >
                <MoreHorizontal className="w-5 h-5 text-[#2D3E40]" />
              </button>

              {showContextMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-white rounded-xl border border-[#ECEBE8] shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                  <button
                    type="button"
                    id="context-menu-add-week-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setNewWeekTitleInput('');
                      setShowCreateWeekModal(true);
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-sm font-medium text-stone-800 hover:bg-[#FAF9F6] active:bg-[#F1F5F2] flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Plus className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>Woche hinzufügen</span>
                  </button>

                  <button
                    type="button"
                    id="context-menu-all-weeks-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setShowAllWeeksModal(true);
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-sm font-medium text-stone-800 hover:bg-[#FAF9F6] active:bg-[#F1F5F2] flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Layers className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>Alle Wochen anzeigen</span>
                  </button>

                  <button
                    type="button"
                    id="context-menu-clear-plan-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setShowConfirmClearAll(true);
                    }}
                    disabled={totalPlannedMeals === 0}
                    className="w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-sm font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100/70 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Plan leeren</span>
                  </button>
                </div>
              )}
            </div>

            {/* AI Generator Modal Trigger */}
            <button
              id="open-ai-meal-plan-modal-btn"
              onClick={() => setShowAIGeneratorModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:px-4.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap h-10 sm:h-11 min-h-[40px] sm:min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#4A7856]" />
              <span>KI-Wochenplan</span>
            </button>

            {/* 1-Click All to Shopping List */}
            <button
              id="transfer-week-to-shopping-btn"
              onClick={handleTransferAllToShopping}
              disabled={totalPlannedMeals === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:px-4.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white font-semibold text-sm shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap h-10 sm:h-11 min-h-[40px] sm:min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Zutaten auf Liste</span>
            </button>
          </div>
        </div>

        {/* Filter-Zeile: Links komfortabler Switch für Mittag + 3-Punkte-Menü auf Mobile, rechts Portionen */}
        <div className="bg-[#FAF9F6] rounded-xl px-3.5 py-2 sm:py-2.5 border border-[#ECEBE8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          {/* Zeile auf Mobile: Switch für Mittags-Slot + 3-Punkte-Menü (auf Mobile) */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <button
              type="button"
              id="toggle-show-lunch-btn"
              onClick={handleToggleLunchSlot}
              role="switch"
              aria-checked={showLunchSlot}
              className="flex items-center gap-2.5 text-sm font-semibold text-stone-800 cursor-pointer select-none group touch-manipulation active:scale-98 min-h-[38px]"
              title={showLunchSlot ? 'Mittagsgerichte ausblenden' : 'Mittagsgerichte anzeigen'}
            >
              <div
                className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center shadow-inner ${
                  showLunchSlot ? 'bg-[#4A7856]' : 'bg-[#CCD5CF]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    showLunchSlot ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="font-semibold text-stone-800 group-hover:text-stone-950 transition-colors">
                Mittags-Slot anzeigen
              </span>
            </button>

            {/* 3-Punkte-Menü Button auf Mobile in der Zeile vom Mittags-Slot */}
            <div className="relative shrink-0 sm:hidden" ref={mobileContextMenuRef}>
              <button
                type="button"
                id="mobile-weekly-planner-context-menu-btn"
                onClick={() => setShowContextMenu((prev) => !prev)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs border ${
                  showContextMenu
                    ? 'bg-[#E5EBE6] text-[#2D3E40] border-[#CCD5CF] ring-2 ring-[#4A7856]/25'
                    : 'bg-[#F1F5F2] hover:bg-[#E5EBE6] text-[#2D3E40] hover:text-stone-900 border-[#ECEBE8] hover:border-[#CCD5CF]'
                }`}
                title="Weitere Optionen (Woche hinzufügen, Alle Wochen anzeigen, Plan leeren)"
                aria-label="Weitere Optionen"
              >
                <MoreHorizontal className="w-4 h-4 text-[#2D3E40]" />
              </button>

              {showContextMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#ECEBE8] shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                  <button
                    type="button"
                    id="mobile-context-menu-add-week-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setNewWeekTitleInput('');
                      setShowCreateWeekModal(true);
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-sm font-medium text-stone-800 hover:bg-[#FAF9F6] active:bg-[#F1F5F2] flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Plus className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>Woche hinzufügen</span>
                  </button>

                  <button
                    type="button"
                    id="mobile-context-menu-all-weeks-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setShowAllWeeksModal(true);
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-sm font-medium text-stone-800 hover:bg-[#FAF9F6] active:bg-[#F1F5F2] flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Layers className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>Alle Wochen anzeigen</span>
                  </button>

                  <button
                    type="button"
                    id="mobile-context-menu-clear-plan-btn"
                    onClick={() => {
                      setShowContextMenu(false);
                      setShowConfirmClearAll(true);
                    }}
                    disabled={totalPlannedMeals === 0}
                    className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-sm font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100/70 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Plan leeren</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Rechts/Unten: Portionen-Auswahl direkt anschließend an die Beschriftung */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <span className="text-sm font-semibold text-stone-700 select-none shrink-0">
              Portionen:
            </span>
            <div className="flex-1 sm:flex-initial sm:w-72 max-w-[290px]">
              <HybridPortionStepper
                value={planServings}
                onChange={setPlanServings}
                idPrefix="weekly-plan-servings"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Undo Banner when cleared */}
      {showUndoBanner && undoBackup && (
        <div className="bg-[#2D3E40] text-white p-3 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trash2 className="w-4 h-4 text-white/70" />
            <span>Der Wochenplan wurde geleert.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="undo-clear-meal-plan-btn"
              onClick={handleUndoClearMealPlan}
              className="flex items-center gap-1.5 bg-[#4A7856] hover:bg-[#3D6447] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[36px] touch-manipulation active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Rückgängig machen</span>
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="text-white/60 hover:text-white w-8 h-8 rounded-lg touch-manipulation cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Discreet Minimalist Week Navigation Bar - Single slim line */}
      {weeks && weeks.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-1.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl">
          <button
            type="button"
            id="prev-week-btn"
            onClick={handlePrevWeek}
            disabled={activeWeekIndex <= 0}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#ECEBE8] bg-white text-[#2D3E40] hover:bg-[#F1F5F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs flex items-center justify-center touch-manipulation active:scale-95 shrink-0"
            title="Vorherige Woche aufrufen"
          >
            <ChevronLeft className="w-4 h-4 text-stone-700" />
          </button>

          {/* Central Week Indicator */}
          <div className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-[#ECEBE8] rounded-xl shadow-2xs min-h-[38px] sm:min-h-[40px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-4 h-4 text-[#4A7856] shrink-0" />
              <span className="text-sm font-semibold text-stone-800 truncate">
                {activeWeek?.title || 'Aktuelle Woche'}
              </span>
              {activeWeek?.startDate && (
                <span className="text-xs text-[#7A7E7B] font-medium hidden xs:inline whitespace-nowrap">
                  ({activeWeek.startDate})
                </span>
              )}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8] whitespace-nowrap shrink-0">
              {totalPlannedMeals} {totalPlannedMeals === 1 ? 'Gericht' : 'Gerichte'}
            </span>
          </div>

          <button
            type="button"
            id="next-week-btn"
            onClick={handleNextWeek}
            disabled={activeWeekIndex >= weeks.length - 1}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#ECEBE8] bg-white text-[#2D3E40] hover:bg-[#F1F5F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs flex items-center justify-center touch-manipulation active:scale-95 shrink-0"
            title="Nächste Woche aufrufen"
          >
            <ChevronRight className="w-4 h-4 text-stone-700" />
          </button>
        </div>
      )}

      {/* 7-Day Grid - On PC balanced across columns with high-end card proportions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 xl:gap-2.5 2xl:gap-3">
        {mealPlan.map((day) => {
          const totalCalories = (day.lunch?.calories || 0) + (day.dinner?.calories || 0);
          const totalProtein = (day.lunch?.protein || 0) + (day.dinner?.protein || 0);
          const hasAnyMeals = Boolean(day.lunch || day.dinner);

          return (
            <div
              key={day.dayId}
              id={`meal-plan-day-${day.dayId}`}
              className={`bg-white rounded-2xl border border-[#ECEBE8] p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 shadow-xs hover:border-[#4A7856]/40 hover:shadow-sm transition-all ${
                hasAnyMeals
                  ? (showLunchSlot ? 'min-h-[220px]' : 'min-h-0 sm:min-h-[220px]')
                  : 'min-h-0 sm:min-h-[220px]'
              } xl:min-h-[250px]`}
            >
              {/* Day Header */}
              <div className="border-b border-[#ECEBE8] pb-1.5 flex items-center justify-between gap-1.5">
                <span className="font-bold text-sm text-[#2D3E40]">
                  {day.dayName}
                </span>
                {(totalCalories > 0 || totalProtein > 0) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F2] text-xs font-semibold border border-[#ECEBE8] shrink-0 text-stone-700" title={`Tagesgesamtwerte: ${totalCalories} kcal, ${totalProtein}g Protein`}>
                    {totalCalories > 0 && (
                      <span className="text-stone-700">🔥 {totalCalories}</span>
                    )}
                    {totalCalories > 0 && totalProtein > 0 && (
                      <span className="text-stone-400 font-normal">·</span>
                    )}
                    {totalProtein > 0 && (
                      <span className="text-[#4A7856]">💪 {totalProtein}g</span>
                    )}
                  </span>
                )}
              </div>

              {/* Lunch Slot - nur anzeigen wenn showLunchSlot aktiviert ist */}
              {showLunchSlot && (
                <div className="space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Mittag</span>
                  </div>

                  {day.lunch ? (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ dayId: day.dayId, mealType: 'lunch' }));
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingItem({ dayId: day.dayId, dayName: day.dayName, mealType: 'lunch', slot: day.lunch! });
                      }}
                      onDragEnd={() => {
                        setDraggingItem(null);
                        setDragOverTarget(null);
                      }}
                      data-drop-slot="true"
                      data-day-id={day.dayId}
                      data-meal-type="lunch"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggingItem?.dayId !== day.dayId || draggingItem?.mealType !== 'lunch') {
                          setDragOverTarget({ dayId: day.dayId, mealType: 'lunch' });
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'lunch') {
                          setDragOverTarget(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingItem && (draggingItem.dayId !== day.dayId || draggingItem.mealType !== 'lunch')) {
                          handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, 'lunch');
                          setDraggingItem(null);
                          setDragOverTarget(null);
                        }
                      }}
                      className={`p-2 sm:p-2.5 bg-[#FAF9F6] hover:bg-[#F1F5F2] rounded-xl border space-y-1.5 transition-colors group relative flex-1 flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                        draggingItem?.dayId === day.dayId && draggingItem?.mealType === 'lunch'
                          ? 'opacity-40 border-dashed border-[#4A7856]'
                          : dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'lunch'
                          ? 'border-[#4A7856] ring-2 ring-[#4A7856]/50 bg-[#E8F1EC] shadow-xs'
                          : 'border-[#ECEBE8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[#9BA19D] hover:text-[#4A7856] hover:bg-stone-100 cursor-grab active:cursor-grabbing touch-none shrink-0"
                              title="Ziehen zum Verschieben/Tauschen oder auf »Plan leeren« ziehen zum Löschen"
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                startTouchDrag(e, day.dayId, day.dayName, 'lunch', day.lunch!);
                              }}
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            {day.lunch.isVegan ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                                <span>🌱</span>
                                <span>Vegan</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white text-[#2D3E40] text-xs font-semibold border border-[#ECEBE8]">
                                <span>🧀</span>
                                <span>Veggie</span>
                              </span>
                            )}
                            {dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'lunch' && draggingItem?.dayId !== day.dayId && (
                              <span className="absolute top-1.5 right-10 text-[11px] font-semibold text-[#4A7856] bg-white px-1.5 py-0.5 rounded border border-[#4A7856] shadow-xs pointer-events-none z-10">
                                Tauschen ⇄
                              </span>
                            )}
                          </div>
                          <h4 
                            onClick={() => {
                              const r = allRecipes.find((rec) => rec.id === day.lunch?.recipeId);
                              if (r) onSelectRecipe(r);
                            }}
                            className="text-sm font-semibold text-stone-900 leading-snug break-words whitespace-normal cursor-pointer hover:text-[#4A7856] transition-colors"
                            title={day.lunch.recipeTitle}
                          >
                            {day.lunch.recipeTitle}
                          </h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(day.dayId, 'lunch');
                            onCopyFeedback(`"${day.lunch?.recipeTitle || 'Mahlzeit'}" entfernt.`);
                          }}
                          className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95"
                          title="Mahlzeit entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Dezent gehaltene Info-Leiste mit Zeit, Kalorien & Protein */}
                      <div className="flex items-center justify-between text-xs text-stone-500 pt-1.5 border-t border-[#ECEBE8] font-medium gap-1 flex-wrap">
                        <span className="flex items-center gap-0.5 shrink-0" title={`Zubereitungszeit: ${day.lunch.prepTime} Minuten`}>
                          <span>⏱️</span>
                          <span>{day.lunch.prepTime}m</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-stone-600 shrink-0" title={`Kalorien: ${day.lunch.calories} kcal`}>
                          <span>🔥</span>
                          <span>{day.lunch.calories} kcal</span>
                        </span>
                        <span className="flex items-center gap-0.5 font-semibold text-[#4A7856] shrink-0" title={`Protein: ${day.lunch.protein}g`}>
                          <span>💪</span>
                          <span>{day.lunch.protein}g</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      data-drop-slot="true"
                      data-day-id={day.dayId}
                      data-meal-type="lunch"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverTarget({ dayId: day.dayId, mealType: 'lunch' });
                      }}
                      onDragLeave={() => {
                        if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'lunch') {
                          setDragOverTarget(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingItem) {
                          handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, 'lunch');
                          setDraggingItem(null);
                          setDragOverTarget(null);
                        }
                      }}
                      className="w-full flex-1 flex flex-col"
                    >
                      <button
                        onClick={() => openRecipePicker(day.dayId, 'lunch')}
                        className={`w-full py-2 px-2.5 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-1.5 transition-colors min-h-[38px] sm:min-h-[40px] touch-manipulation active:scale-98 cursor-pointer flex-1 ${
                          dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'lunch'
                            ? 'border-[#4A7856] bg-[#E8F1EC] text-[#4A7856] ring-2 ring-[#4A7856]/40 font-semibold'
                            : draggingItem
                            ? 'border-[#4A7856]/60 bg-[#FAF9F6] text-[#4A7856]'
                            : 'border-[#D5DDD7] hover:border-[#4A7856] text-stone-700 hover:text-[#4A7856] bg-[#FAF9F6]/60 hover:bg-[#F1F5F2]'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Gericht wählen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dinner Slot - wenn Mittag ausgeblendet ist, geräumiger */}
              <div className={`space-y-1 ${showLunchSlot ? 'flex-1' : 'flex-initial sm:flex-1'} flex flex-col justify-between`}>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Abendessen</span>
                  {!showLunchSlot && day.lunch && (
                    <span className="text-xs text-[#7A7E7B] normal-case font-medium">
                      (1 Mittag)
                    </span>
                  )}
                </div>

                {day.dinner ? (
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ dayId: day.dayId, mealType: 'dinner' }));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingItem({ dayId: day.dayId, dayName: day.dayName, mealType: 'dinner', slot: day.dinner! });
                    }}
                    onDragEnd={() => {
                      setDraggingItem(null);
                      setDragOverTarget(null);
                    }}
                    data-drop-slot="true"
                    data-day-id={day.dayId}
                    data-meal-type="dinner"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggingItem?.dayId !== day.dayId || draggingItem?.mealType !== 'dinner') {
                        setDragOverTarget({ dayId: day.dayId, mealType: 'dinner' });
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'dinner') {
                        setDragOverTarget(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingItem && (draggingItem.dayId !== day.dayId || draggingItem.mealType !== 'dinner')) {
                        handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, 'dinner');
                        setDraggingItem(null);
                        setDragOverTarget(null);
                      }
                    }}
                    className={`p-2 sm:p-2.5 bg-[#FAF9F6] hover:bg-[#F1F5F2] rounded-xl border space-y-1.5 transition-colors group relative flex-1 flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                      draggingItem?.dayId === day.dayId && draggingItem?.mealType === 'dinner'
                        ? 'opacity-40 border-dashed border-[#4A7856]'
                        : dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'dinner'
                        ? 'border-[#4A7856] ring-2 ring-[#4A7856]/50 bg-[#E8F1EC] shadow-xs'
                        : 'border-[#ECEBE8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#9BA19D] hover:text-[#4A7856] hover:bg-stone-100 cursor-grab active:cursor-grabbing touch-none shrink-0"
                            title="Ziehen zum Verschieben/Tauschen oder auf »Plan leeren« ziehen zum Löschen"
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              startTouchDrag(e, day.dayId, day.dayName, 'dinner', day.dinner!);
                            }}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          {day.dinner.isVegan ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                              <span>🌱</span>
                              <span>Vegan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white text-[#2D3E40] text-xs font-semibold border border-[#ECEBE8]">
                              <span>🧀</span>
                              <span>Veggie</span>
                            </span>
                          )}
                          {dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'dinner' && draggingItem?.dayId !== day.dayId && (
                            <span className="absolute top-1.5 right-10 text-[11px] font-semibold text-[#4A7856] bg-white px-1.5 py-0.5 rounded border border-[#4A7856] shadow-xs pointer-events-none z-10">
                              Tauschen ⇄
                            </span>
                          )}
                        </div>
                        <h4 
                          onClick={() => {
                            const r = allRecipes.find((rec) => rec.id === day.dinner?.recipeId);
                            if (r) onSelectRecipe(r);
                          }}
                          className="text-sm font-semibold text-stone-900 leading-snug break-words whitespace-normal cursor-pointer hover:text-[#4A7856] transition-colors"
                          title={day.dinner.recipeTitle}
                        >
                          {day.dinner.recipeTitle}
                        </h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlot(day.dayId, 'dinner');
                          onCopyFeedback(`"${day.dinner?.recipeTitle || 'Mahlzeit'}" entfernt.`);
                        }}
                        className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95"
                        title="Mahlzeit entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Dezent gehaltene Info-Leiste mit Zeit, Kalorien & Protein */}
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-1.5 border-t border-[#ECEBE8] font-medium gap-1 flex-wrap">
                      <span className="flex items-center gap-0.5 shrink-0" title={`Zubereitungszeit: ${day.dinner.prepTime} Minuten`}>
                        <span>⏱️</span>
                        <span>{day.dinner.prepTime}m</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-stone-600 shrink-0" title={`Kalorien: ${day.dinner.calories} kcal`}>
                        <span>🔥</span>
                        <span>{day.dinner.calories} kcal</span>
                      </span>
                      <span className="flex items-center gap-0.5 font-semibold text-[#4A7856] shrink-0" title={`Protein: ${day.dinner.protein}g`}>
                        <span>💪</span>
                        <span>{day.dinner.protein}g</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    data-drop-slot="true"
                    data-day-id={day.dayId}
                    data-meal-type="dinner"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverTarget({ dayId: day.dayId, mealType: 'dinner' });
                    }}
                    onDragLeave={() => {
                      if (dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'dinner') {
                        setDragOverTarget(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingItem) {
                        handleMoveOrSwap(draggingItem.dayId, draggingItem.mealType, day.dayId, 'dinner');
                        setDraggingItem(null);
                        setDragOverTarget(null);
                      }
                    }}
                    className={`w-full ${!showLunchSlot ? 'h-[42px] sm:h-auto sm:flex-1' : 'flex-1'} flex flex-col`}
                  >
                    <button
                      onClick={() => openRecipePicker(day.dayId, 'dinner')}
                      className={`w-full py-2 px-2.5 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-1.5 transition-colors min-h-[38px] sm:min-h-[40px] touch-manipulation active:scale-98 cursor-pointer ${
                        !showLunchSlot ? 'h-[42px] sm:h-auto sm:flex-1' : 'flex-1'
                      } ${
                        dragOverTarget?.dayId === day.dayId && dragOverTarget?.mealType === 'dinner'
                          ? 'border-[#4A7856] bg-[#E8F1EC] text-[#4A7856] ring-2 ring-[#4A7856]/40 font-semibold'
                          : draggingItem
                          ? 'border-[#4A7856]/60 bg-[#FAF9F6] text-[#4A7856]'
                          : 'border-[#D5DDD7] hover:border-[#4A7856] text-stone-700 hover:text-[#4A7856] bg-[#FAF9F6]/60 hover:bg-[#F1F5F2]'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Gericht wählen</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Drag & Drop Ghost for Touch Devices */}
      {touchDragState && (
        <div
          style={{
            left: `${touchDragState.currentX}px`,
            top: `${touchDragState.currentY - 50}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="fixed z-9999 pointer-events-none bg-white rounded-xl shadow-2xl border-2 border-[#4A7856] p-2.5 max-w-[220px] w-max flex items-center gap-2 opacity-95"
        >
          <div className="w-2 h-2 rounded-full bg-[#4A7856] shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-[#4A7856] truncate">
              {touchDragState.source.slot.isVegan ? '🌱 Vegan' : '🧀 Veggie'} • {touchDragState.source.mealType === 'lunch' ? 'Mittag' : 'Abend'}
            </div>
            <div className="text-xs font-bold text-[#2D3E40] truncate max-w-[180px]">
              {touchDragState.source.slot.recipeTitle}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Picker Modal - Breitere Ansicht mit hoher Informationsdichte & Favoriten-Sortierung */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 z-50 bg-[#2D3E40]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 touch-none overscroll-contain animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full p-3 sm:p-5 flex flex-col h-[94vh] sm:h-[88vh] max-h-[860px] shadow-2xl border border-[#ECEBE8] animate-in zoom-in-95 duration-150 overscroll-contain overflow-hidden"
          >
            {/* Header: Übersichtlich mit Wochentag, Mahlzeit & Rezept-Zähler */}
            <div className="flex items-center justify-between border-b border-[#ECEBE8] pb-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-semibold text-[#4A7856] bg-[#F1F5F2] border border-[#ECEBE8] shrink-0">
                  {mealPlan.find((d) => d.dayId === selectedDayId)?.dayName || 'Wochentag'} • {selectedMealType === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                </span>
                <h3 className="text-xl font-bold text-[#2D3E40] truncate">
                  Gericht auswählen
                </h3>
                <span className="hidden md:inline text-sm font-medium text-stone-500">
                  ({filteredPickerRecipes.length} Rezepte)
                </span>
              </div>
              <button
                onClick={() => setShowRecipePickerModal(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[#7A7E7B] hover:text-[#2D3E40] bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] flex items-center justify-center cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search, Filter & Sort Bar: Aufgeräumt, vollwertige Buttons */}
            <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-[#ECEBE8]">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  placeholder="Gericht oder Zutat suchen..."
                  className="w-full h-11 min-h-[44px] pl-11 pr-10 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-stone-800 placeholder:text-stone-400 text-base font-medium focus:bg-white focus:outline-hidden focus:border-[#4A7856] transition-all"
                />
                {pickerSearchQuery && (
                  <button
                    onClick={() => setPickerSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 w-8 h-8 flex items-center justify-center rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter pills and Sort favorites button - Buttons nicht kleiner gemacht */}
              <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-0.5 sm:pb-0 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setPickerFilter('all')}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap text-sm font-semibold ${
                    pickerFilter === 'all'
                      ? 'bg-[#2D3E40] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  Alle ({allRecipes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setPickerFilter('favorites')}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1.5 text-sm font-semibold ${
                    pickerFilter === 'favorites'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${pickerFilter === 'favorites' ? 'fill-white' : 'fill-rose-500 text-rose-500'}`} />
                  <span>Gelikt ({favorites.filter((id) => allRecipes.some((r) => r.id === id)).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerFilter('vegan')}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1 text-sm font-semibold ${
                    pickerFilter === 'vegan'
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  <span>🌱</span>
                  <span>Vegan ({allRecipes.filter((r) => r.isVegan).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerFilter(pickerFilter === 'quick' ? 'all' : 'quick')}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1 text-sm font-semibold ${
                    pickerFilter === 'quick'
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  <span>⚡</span>
                  <span>Schnell (&le;30m)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerFilter(pickerFilter === 'protein' ? 'all' : 'protein')}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1 text-sm font-semibold ${
                    pickerFilter === 'protein'
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  <span>💪</span>
                  <span>High Protein</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerSortFavoritesFirst((prev) => !prev)}
                  className={`h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl border transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1.5 text-sm ${
                    pickerSortFavoritesFirst
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                      : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#7A7E7B] hover:bg-[#F1F5F2] font-semibold'
                  }`}
                  title={pickerSortFavoritesFirst ? 'Favoriten werden zuerst angezeigt' : 'Normale Sortierung'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>Favoriten zuerst</span>
                </button>
              </div>
            </div>

            {/* Recipes Grid: Aufgeräumt & modern auf PC (3-Spalten Rezeptkarten mit Headerbild & vollwertigen Buttons) */}
            <div className="overflow-y-auto pr-1 flex-1 overscroll-contain pt-3">
              {filteredPickerRecipes.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <p className="text-base font-semibold text-[#2D3E40]">Keine passenden Rezepte gefunden</p>
                  <p className="text-sm text-[#7A7E7B]">Passe deinen Suchbegriff oder Filter an.</p>
                  {pickerFilter !== 'all' && (
                    <button
                      onClick={() => setPickerFilter('all')}
                      className="mt-2 text-sm font-semibold text-[#4A7856] hover:underline cursor-pointer"
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
                        className={`bg-white rounded-2xl border transition-all cursor-pointer group shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative touch-manipulation active:scale-[0.99] ${
                          isFav 
                            ? 'border-rose-200 hover:border-rose-400' 
                            : 'border-[#ECEBE8] hover:border-[#4A7856]'
                        }`}
                      >
                        {/* Bild-Header mit Badges und Favorit-Button */}
                        <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-[#FAF9F6] shrink-0">
                          <RecipeImage
                            recipe={recipe}
                            imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            alt={recipe.title}
                          />
                          
                          {/* Badges oben links */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                            {recipe.isVegan ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[#4A7856] bg-white/95 backdrop-blur-xs border border-[#ECEBE8] shadow-xs">
                                <span>🌱</span>
                                <span>Vegan</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[#2D3E40] bg-white/95 backdrop-blur-xs border border-[#ECEBE8] shadow-xs">
                                <span>🧀</span>
                                <span>Veggie</span>
                              </span>
                            )}
                          </div>

                          {/* Favoriten-Button oben rechts */}
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(recipe.id);
                              }}
                              className={`absolute top-2.5 right-2.5 w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-xs ${
                                isFav
                                  ? 'bg-rose-500 border-rose-600 text-white'
                                  : 'bg-white/95 hover:bg-white border-[#ECEBE8] text-stone-600 hover:text-rose-500'
                              }`}
                              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                            >
                              <Heart className={`w-5 h-5 ${isFav ? 'fill-white text-white' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Rezept-Details & Nährwerte */}
                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="text-[17px] font-bold text-stone-900 group-hover:text-[#4A7856] leading-snug line-clamp-1 transition-colors">
                              {recipe.title}
                            </h4>
                            <div className="flex items-center justify-between text-[13px] font-medium text-stone-600 mt-2 pt-2 border-t border-[#ECEBE8]">
                              <span>⏱️ {recipe.totalTimeMinutes} Min.</span>
                              <span>🔥 {recipe.nutrients.calories} kcal</span>
                              <span className="text-[#4A7856] font-bold">💪 {recipe.nutrients.protein}g Protein</span>
                            </div>
                          </div>

                          {/* Vollwertiger, großer Auswählen-Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignRecipeToSlot(recipe);
                            }}
                            className="w-full h-11 min-h-[44px] rounded-xl bg-[#4A7856] group-hover:bg-[#3D6447] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-2"
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
      {showAIGeneratorModal && (
        <div 
          onClick={() => setShowAIGeneratorModal(false)}
          className="fixed inset-0 z-50 bg-[#2D3E40]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-[#ECEBE8] animate-in zoom-in-95 duration-200 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain flex flex-col justify-between"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#ECEBE8] pb-3">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF] text-xs font-semibold inline-block">
                  ✨ Gemini KI-Wochenplaner
                </span>
                <h3 className="text-xl font-bold text-[#2D3E40] mt-1 leading-snug">
                  7-Tage-Wochenplan erstellen
                </h3>
              </div>
              <button
                onClick={() => setShowAIGeneratorModal(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-[#7A7E7B] hover:text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Spaltiges Layout auf PC: Kein Scrollen nötig! */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 py-3">
              {/* Linke Spalte */}
              <div className="space-y-3.5">
                {/* 1. Mahlzeiten */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    1. Mahlzeiten einplanen
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiMealOption('lunch')}
                      className={`h-11 min-h-[44px] py-2 px-2 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        aiMealOption === 'lunch'
                          ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      ☀️ Mittag
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMealOption('dinner')}
                      className={`h-11 min-h-[44px] py-2 px-2 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        aiMealOption === 'dinner'
                          ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      🌙 Abend
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMealOption('both')}
                      className={`h-11 min-h-[44px] py-2 px-2 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        aiMealOption === 'both'
                          ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      🍽️ Beides
                    </button>
                  </div>
                </div>

                {/* 2. Ernährungsweise */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    2. Ernährungsweise
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiIsVegan(true)}
                      className={`h-11 min-h-[44px] py-2 px-3 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        aiIsVegan
                          ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      🌱 100% Vegan
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiIsVegan(false)}
                      className={`h-11 min-h-[44px] py-2 px-3 rounded-xl text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        !aiIsVegan
                          ? 'bg-[#2D3E40] text-white border-[#2D3E40] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      🧀 Veggie & Vegan
                    </button>
                  </div>
                </div>

                {/* 3. Portionen / Personen */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    3. Personen / Portionen
                  </label>
                  <HybridPortionStepper
                    value={aiPeopleCount}
                    onChange={setAiPeopleCount}
                    idPrefix="ai-modal-people-count"
                  />
                </div>
              </div>

              {/* Rechte Spalte */}
              <div className="space-y-3.5">
                {/* 4. Max. Zubereitungszeit */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    4. Max. Zubereitungszeit
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[
                      { val: 0, label: '⏱️ Beliebig' },
                      { val: 20, label: '⚡ ≤ 20 Min.' },
                      { val: 35, label: '🍲 ≤ 35 Min.' },
                      { val: 50, label: '🍳 ≤ 50 Min.' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setAiMaxMinutes(opt.val)}
                        className={`py-2 px-1 rounded-xl font-semibold border text-center transition-all cursor-pointer h-11 min-h-[44px] flex items-center justify-center text-sm touch-manipulation active:scale-95 ${
                          aiMaxMinutes === opt.val
                            ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                            : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Nährwerte & Filter: Klare Beschriftungen ohne abgeschnittene Texte */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    5. Nährwerte & Filter
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {/* Kalorien */}
                    <div className="relative">
                      <select
                        id="ai-filter-calories"
                        value={aiCalorieFilter}
                        onChange={(e) => setAiCalorieFilter(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-[13px] font-semibold rounded-xl pl-7 pr-6 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Alle Kalorien</option>
                        <option value="high">High Cal (750+)</option>
                        <option value="low">Leicht (&lt; 500)</option>
                        <option value="moderate">500–700 kcal</option>
                      </select>
                      <Flame className="w-3.5 h-3.5 text-[#7A7E7B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#7A7E7B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Protein */}
                    <div className="relative">
                      <select
                        id="ai-filter-protein"
                        value={aiProteinFilter}
                        onChange={(e) => setAiProteinFilter(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-[13px] font-semibold rounded-xl pl-7 pr-6 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Alle Protein</option>
                        <option value="high">High Prot (30g+)</option>
                        <option value="very-high">Extra Prot (40g+)</option>
                        <option value="medium">20g+ Protein</option>
                      </select>
                      <Dumbbell className="w-3.5 h-3.5 text-[#7A7E7B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#7A7E7B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Schwierigkeit */}
                    <div className="relative">
                      <select
                        id="ai-filter-difficulty"
                        value={aiDifficultyFilter}
                        onChange={(e) => setAiDifficultyFilter(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-[13px] font-semibold rounded-xl pl-7 pr-6 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Alle Levels</option>
                        <option value="Einfach">Einfach</option>
                        <option value="Mittel">Mittel</option>
                        <option value="Anspruchsvoll">Anspruchsvoll</option>
                      </select>
                      <ChefHat className="w-3.5 h-3.5 text-[#7A7E7B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#7A7E7B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 6. Zusätzliche Wünsche & Notizen (optional) */}
                <div>
                  <label className="block font-bold text-[#2D3E40] text-[13px] uppercase tracking-wider mb-1.5">
                    6. Wünsche & Notizen (optional)
                  </label>
                  <input
                    type="text"
                    id="ai-meal-plan-wishes-input"
                    value={aiWishes}
                    onChange={(e) => setAiWishes(e.target.value)}
                    placeholder="z. B. keine Pilze, asiatisch angehaucht..."
                    className="w-full h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] focus:bg-white border border-[#ECEBE8] focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] text-sm text-[#2D3E40] placeholder-[#A0A5A1] transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons - Direkt sichtbar ohne Scrollen auf PC */}
            <div className="flex items-center gap-2 sm:gap-3 pt-3 border-t border-[#ECEBE8]">
              <button
                type="button"
                onClick={() => setShowAIGeneratorModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] font-semibold text-sm cursor-pointer touch-manipulation active:scale-95 h-11 min-h-[44px]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                id="submit-ai-meal-plan-btn"
                disabled={isGeneratingPlan}
                onClick={handleGenerateAIMealPlan}
                className="flex-2 py-2.5 px-5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95 h-11 min-h-[44px]"
              >
                {isGeneratingPlan ? (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                    <span>Generiere Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>Plan automatisch generieren</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal: ONLY for clearing entire week */}
      {showConfirmClearAll && (
        <div 
          id="confirm-clear-all-modal-backdrop"
          onClick={() => setShowConfirmClearAll(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-[#ECEBE8] space-y-4 animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-rose-600 uppercase tracking-wider">
                  Sicherheitsabfrage
                </span>
                <h3 className="text-xl font-bold text-[#2D3E40]">
                  Gesamten Wochenplan leeren?
                </h3>
              </div>
            </div>

            <p className="text-[15px] text-[#7A7E7B] leading-relaxed">
              Möchtest du wirklich alle geplanten Mahlzeiten dieser Woche aus deinem Wochenplan löschen? Du kannst diese Aktion danach über den Rückgängig-Button widerrufen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-clear-plan-btn"
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="min-h-[44px] h-11 px-4 rounded-xl border border-[#ECEBE8] bg-white hover:bg-[#FAF9F6] text-[#2D3E40] font-semibold text-sm transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                id="confirm-clear-plan-btn"
                type="button"
                onClick={handleConfirmClearAll}
                className="min-h-[44px] h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-white" />
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
            className="bg-white rounded-2xl border border-[#ECEBE8] shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ECEBE8]">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-[#F1F5F2] flex items-center justify-center text-[#4A7856] shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3E40]">Alle Wochenpläne</h3>
                  <p className="text-sm font-medium text-[#7A7E7B]">Wähle eine Woche zum Anzeigen & Planen</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAllWeeksModal(false);
                  setConfirmDeleteWeekId(null);
                }}
                className="w-11 h-11 rounded-xl hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                        ? 'bg-[#F1F5F2] border-[#4A7856] shadow-xs ring-1 ring-[#4A7856]'
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-[#2D3E40] truncate">
                          {w.title}
                        </span>
                        {isActive && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#4A7856] text-white">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-[#7A7E7B] mt-0.5">
                        {w.startDate && <span>{w.startDate}</span>}
                        <span>•</span>
                        <span className="font-semibold text-[#4A7856]">{plannedCount} Mahlzeiten</span>
                      </div>
                    </div>

                    {confirmDeleteWeekId === w.id ? (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl animate-in fade-in duration-150 shrink-0"
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
                          className="min-h-[40px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteWeekId(null);
                          }}
                          className="min-h-[40px] px-2.5 rounded-lg bg-white border border-rose-200 text-[#7A7E7B] hover:text-[#2D3E40] text-xs font-medium cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                            className="min-h-[40px] px-3.5 rounded-xl bg-white border border-[#ECEBE8] text-sm font-semibold text-[#2D3E40] hover:bg-[#F1F5F2] cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                            className="w-11 h-11 rounded-xl text-[#7A7E7B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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

            <div className="p-4 border-t border-[#ECEBE8] bg-[#FAF9F6] flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#7A7E7B]">
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
                  className="min-h-[44px] h-11 px-4 py-2 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95"
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
            className="bg-white rounded-2xl border border-[#ECEBE8] shadow-xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-[#F1F5F2] flex items-center justify-center text-[#4A7856] shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3E40]">Neue Woche planen</h3>
                  <p className="text-sm font-medium text-[#7A7E7B]">Leeren 7-Tage-Plan anlegen</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateWeekModal(false)}
                className="w-11 h-11 rounded-xl hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#2D3E40]">Bezeichnung (optional)</label>
              <input
                type="text"
                value={newWeekTitleInput}
                onChange={(e) => setNewWeekTitleInput(e.target.value)}
                placeholder={`z. B. Woche ${(weeks?.length || 0) + 1} oder KW ${(weeks?.length || 0) + 38}`}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-base text-[#2D3E40] placeholder:text-[#7A7E7B] focus:outline-none focus:border-[#4A7856]"
              />
              <p className="text-xs font-medium text-[#7A7E7B]">
                Die bestehende Woche wird gespeichert und du startest mit einem frischen Wochenplan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateWeekModal(false)}
                className="flex-1 min-h-[44px] h-11 py-2.5 rounded-xl border border-[#ECEBE8] text-sm font-semibold text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                className="flex-1 min-h-[44px] h-11 py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-base font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
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
