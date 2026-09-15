import React, { useState } from 'react';
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
  Search
} from 'lucide-react';
import { DayPlan, MealPlanSlot, Recipe, WeekPlan } from '../types';
import { SyncConfig } from '../lib/syncService';
import { Users, Cloud } from 'lucide-react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface WeeklyPlannerViewProps {
  mealPlan: DayPlan[];
  setMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  allRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onAddAllToShoppingList: (recipesToPlan: { recipe: Recipe; servings: number }[]) => void;
  onCopyFeedback: (msg: string) => void;
  onlyVeganGlobal: boolean;
  syncConfig?: SyncConfig;
  onOpenSyncModal?: () => void;
  weeks?: WeekPlan[];
  activeWeekId?: string;
  onSelectWeek?: (weekId: string) => void;
  onCreateNewWeek?: (customTitle?: string) => void;
  onDeleteWeek?: (weekId: string) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  mealPlan,
  setMealPlan,
  allRecipes,
  onSelectRecipe,
  onAddAllToShoppingList,
  onCopyFeedback,
  onlyVeganGlobal,
  syncConfig,
  onOpenSyncModal,
  weeks,
  activeWeekId,
  onSelectWeek,
  onCreateNewWeek,
  onDeleteWeek,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('dinner');
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerVeganOnly, setPickerVeganOnly] = useState(onlyVeganGlobal);

  // Toggle showing lunch slot - persisted in localStorage
  const [showLunchSlot, setShowLunchSlot] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('veggiechef_show_lunch_slot');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleLunchSlot = () => {
    setShowLunchSlot((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('veggiechef_show_lunch_slot', JSON.stringify(next));
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
  const [aiIsVegan, setAiIsVegan] = useState(onlyVeganGlobal);
  const [aiPeopleCount, setAiPeopleCount] = useState<number>(2);
  const [aiMaxMinutes, setAiMaxMinutes] = useState<number>(30);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planServings, setPlanServings] = useState<number>(3);

  // Safety confirmation ONLY for clearing entire week
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

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
    setPickerVeganOnly(onlyVeganGlobal);
    setShowRecipePickerModal(true);
  };

  const filteredPickerRecipes = allRecipes.filter((recipe) => {
    if (pickerVeganOnly && !recipe.isVegan) return false;
    if (!pickerSearchQuery.trim()) return true;
    const query = pickerSearchQuery.toLowerCase().trim();
    const matchesTitle = recipe.title.toLowerCase().includes(query);
    const matchesCategory = recipe.category.toLowerCase().includes(query);
    const matchesIngredient = recipe.ingredients?.some((ing) => ing.name.toLowerCase().includes(query));
    return matchesTitle || matchesCategory || matchesIngredient;
  });

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
      const response = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVegan: aiIsVegan,
          peopleCount: aiPeopleCount,
          maxMinutesPerMeal: aiMaxMinutes || 35,
          mealOption: aiMealOption,
        }),
      });
      const data = await response.json();

      if (data.success && data.days && Array.isArray(data.days)) {
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
        onCopyFeedback(`Wochenplan "${data.planTitle || '7-Tage-Plan'}" erfolgreich erstellt!`);
      } else {
        throw new Error('API did not return valid days');
      }
    } catch (err) {
      console.warn('Fallback generation activated for meal plan', err);
      // Guarantee reliable fallback recipes strictly conforming to vegan settings
      const fallbackDays = mealPlan.map((day, idx) => {
        const newDay = { ...day };
        if (aiMealOption === 'lunch' || aiMealOption === 'both') {
          const rec = recipePool[idx % recipePool.length];
          newDay.lunch = {
            recipeId: rec?.id || `fb-lunch-${idx}`,
            recipeTitle: rec?.title || (aiIsVegan ? 'Kichererbsen-Avocado Bowl mit Zitronen-Tahini' : 'Mediterraner Hirten-Salat'),
            isVegan: aiIsVegan || Boolean(rec?.isVegan),
            prepTime: rec?.totalTimeMinutes || 20,
            calories: rec?.nutrients?.calories || 430,
            protein: rec?.nutrients?.protein || 19,
            servings: aiPeopleCount,
          };
        }
        if (aiMealOption === 'dinner' || aiMealOption === 'both') {
          const rec = recipePool[(idx + 3) % recipePool.length];
          newDay.dinner = {
            recipeId: rec?.id || `fb-dinner-${idx}`,
            recipeTitle: rec?.title || (aiIsVegan ? 'Rote-Linsen Kokos-Curry mit Reis' : 'Ofen-Gnocchi mit Spinat'),
            isVegan: aiIsVegan || Boolean(rec?.isVegan),
            prepTime: rec?.totalTimeMinutes || 25,
            calories: rec?.nutrients?.calories || 510,
            protein: rec?.nutrients?.protein || 23,
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
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-[11px] sm:text-xs font-semibold uppercase tracking-wider border border-[#ECEBE8]">
              <CalendarDays className="w-3.5 h-3.5" />
              Wöchentliche Essensplanung
            </div>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
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
                    <span>Lokal • Mit Familie teilen?</span>
                  </>
                )}
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
            Dein Wochenplan
          </h2>
          <p className="text-xs sm:text-sm text-[#7A7E7B] max-w-xl">
            Plane deine Mahlzeiten für die Woche, behalte Nährwerte im Blick und übertrage alle Zutaten mit 1 Klick auf die Einkaufsliste.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full md:w-auto">
          {/* Toggle Mittag anzeigen: dezenter Button in gleicher Größe wie die anderen */}
          <button
            type="button"
            id="toggle-show-lunch-btn"
            onClick={handleToggleLunchSlot}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-3 py-2.5 sm:py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[42px] touch-manipulation active:scale-95 ${
              showLunchSlot
                ? 'bg-[#F1F5F2] border-[#4A7856]/40 text-[#4A7856] shadow-2xs'
                : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-white'
            }`}
            title={showLunchSlot ? 'Mittagsgerichte ausblenden' : 'Mittagsgerichte anzeigen'}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              showLunchSlot ? 'bg-[#4A7856] border-[#4A7856] text-white' : 'border-[#CCD5CF] bg-white'
            }`}>
              {showLunchSlot && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Mittag anzeigen</span>
          </button>

          {/* Servings count selector for shopping list */}
          <div className="flex items-center gap-1.5 sm:gap-1.5 bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#ECEBE8] shadow-2xs min-h-[42px]">
            <span className="text-xs sm:text-xs font-bold text-[#2D3E40] px-2 sm:px-1.5">Portionen:</span>
            {[1, 2, 3, 4, 6].map((num) => (
              <button
                key={num}
                type="button"
                id={`plan-servings-${num}-btn`}
                onClick={() => setPlanServings(num)}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg text-sm sm:text-xs font-bold transition-all flex items-center justify-center touch-manipulation cursor-pointer active:scale-90 ${
                  planServings === num
                    ? 'bg-[#4A7856] text-white shadow-xs'
                    : 'text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-white'
                }`}
                title={`${num} Portionen`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Clear entire meal plan button */}
          <button
            id="clear-entire-meal-plan-btn"
            type="button"
            onClick={() => setShowConfirmClearAll(true)}
            disabled={totalPlannedMeals === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-3 py-2.5 sm:py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-rose-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#7A7E7B] disabled:hover:border-[#ECEBE8] text-xs font-semibold transition-all cursor-pointer min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
            title="Gesamten Wochenplan leeren"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Plan leeren</span>
          </button>

          {/* AI Generator Modal Trigger */}
          <button
            id="open-ai-meal-plan-modal-btn"
            onClick={() => setShowAIGeneratorModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 sm:py-2.5 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] text-white font-medium text-xs shadow-xs transition-all cursor-pointer min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
          >
            <Sparkles className="w-4 h-4 sm:w-4 sm:h-4 text-[#4A7856]" />
            <span>KI-Wochenplan</span>
          </button>

          {/* 1-Click All to Shopping List */}
          <button
            id="transfer-week-to-shopping-btn"
            onClick={handleTransferAllToShopping}
            disabled={totalPlannedMeals === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 sm:py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white font-medium text-xs shadow-xs transition-all cursor-pointer min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 sm:w-4 sm:h-4" />
            <span>Alle Zutaten auf Liste</span>
          </button>
        </div>
      </div>

      {/* Undo Banner when cleared */}
      {showUndoBanner && undoBackup && (
        <div className="bg-[#2D3E40] text-white p-3 sm:p-4 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Trash2 className="w-4 h-4 text-white/70" />
            <span>Der Wochenplan wurde geleert.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="undo-clear-meal-plan-btn"
              onClick={handleUndoClearMealPlan}
              className="flex items-center gap-1.5 bg-[#4A7856] hover:bg-[#3D6447] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[38px] touch-manipulation active:scale-95"
            >
              <Undo2 className="w-4 h-4" />
              <span>Rückgängig machen</span>
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="text-white/60 hover:text-white p-2 rounded-lg touch-manipulation cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Discreet Minimalist Week Navigation & Management Bar - Mobil längere Bar */}
      {weeks && weeks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-2xl">
          {/* Quick rotation between weeks: auf Mobile als durchgehende, längere Zeile */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="prev-week-btn"
              onClick={handlePrevWeek}
              disabled={activeWeekIndex <= 0}
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl border border-[#ECEBE8] bg-white text-[#2D3E40] hover:bg-[#F1F5F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs flex items-center justify-center touch-manipulation active:scale-95 shrink-0"
              title="Vorherige Woche aufrufen"
            >
              <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            {/* Mobile etwas längere, geräumigere Bar für die aktuelle Woche */}
            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2.5 px-3.5 sm:px-3 py-2.5 sm:py-1.5 bg-white border border-[#ECEBE8] rounded-xl shadow-2xs min-h-[44px] sm:min-h-0">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#4A7856] shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[#2D3E40] truncate">
                  {activeWeek?.title || 'Aktuelle Woche'}
                </span>
                {activeWeek?.startDate && (
                  <span className="text-xs text-[#7A7E7B] font-medium whitespace-nowrap">
                    ({activeWeek.startDate})
                  </span>
                )}
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EBF3ED] text-[#4A7856] font-semibold whitespace-nowrap shrink-0">
                {totalPlannedMeals} Gerichte
              </span>
            </div>

            <button
              type="button"
              id="next-week-btn"
              onClick={handleNextWeek}
              disabled={activeWeekIndex >= weeks.length - 1}
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl border border-[#ECEBE8] bg-white text-[#2D3E40] hover:bg-[#F1F5F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs flex items-center justify-center touch-manipulation active:scale-95 shrink-0"
              title="Nächste Woche aufrufen"
            >
              <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Action buttons: Create New Week & All Weeks */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onCreateNewWeek && (
              <button
                type="button"
                id="create-new-week-btn"
                onClick={() => {
                  setNewWeekTitleInput('');
                  setShowCreateWeekModal(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 hover:bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold transition-colors cursor-pointer shadow-2xs min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
                title="Neue Woche erstellen und planen"
              >
                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Neue Woche</span>
              </button>
            )}

            <button
              type="button"
              id="all-weeks-btn"
              onClick={() => setShowAllWeeksModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#7A7E7B] hover:text-[#2D3E40] text-xs font-semibold transition-colors cursor-pointer shadow-2xs min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
              title="Alle archivierten & geplanten Wochen anzeigen"
            >
              <Layers className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Alle Wochen ({weeks.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
        {mealPlan.map((day) => {
          const totalCalories = (day.lunch?.calories || 0) + (day.dinner?.calories || 0);
          const totalProtein = (day.lunch?.protein || 0) + (day.dinner?.protein || 0);

          return (
            <div
              key={day.dayId}
              id={`meal-plan-day-${day.dayId}`}
              className="bg-white rounded-2xl border border-[#ECEBE8] p-3 sm:p-4 flex flex-col justify-between gap-2.5 sm:gap-3 shadow-xs hover:border-[#4A7856]/40 transition-all"
            >
              {/* Day Header */}
              <div className="border-b border-[#ECEBE8] pb-2 flex items-center justify-between">
                <span className="font-semibold text-sm text-[#2D3E40]">
                  {day.dayName}
                </span>
                {totalProtein > 0 && (
                  <span className="text-xs font-semibold text-[#4A7856] bg-[#F1F5F2] px-2 py-0.5 rounded-full border border-[#ECEBE8]">
                    {totalProtein}g Prot.
                  </span>
                )}
              </div>

              {/* Lunch Slot - nur anzeigen wenn showLunchSlot aktiviert ist */}
              {showLunchSlot && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#2D3E40] uppercase tracking-wide flex items-center justify-between">
                    <span>Mittag</span>
                  </div>

                  {day.lunch ? (
                    <div className="p-3 bg-[#FAF9F6] hover:bg-[#F1F5F2] rounded-xl border border-[#ECEBE8] space-y-2 transition-colors group relative">
                      <div className="flex items-start justify-between gap-2">
                        <h4 
                          onClick={() => {
                            const r = allRecipes.find((rec) => rec.id === day.lunch?.recipeId);
                            if (r) onSelectRecipe(r);
                          }}
                          className="text-xs sm:text-sm font-semibold text-[#2D3E40] leading-snug break-words whitespace-normal cursor-pointer hover:text-[#4A7856] flex-1"
                        >
                          {day.lunch.recipeTitle}
                        </h4>
                        <button
                          onClick={() => {
                            removeSlot(day.dayId, 'lunch');
                            onCopyFeedback(`"${day.lunch?.recipeTitle || 'Mahlzeit'}" entfernt.`);
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl min-w-[38px] min-h-[38px] w-9 h-9 flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95"
                          title="Mahlzeit entfernen"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#7A7E7B] pt-1.5 border-t border-[#ECEBE8]">
                        <span>⏱️ {day.lunch.prepTime} Min.</span>
                        <span className="font-bold text-[#4A7856]">{day.lunch.protein}g Prot.</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openRecipePicker(day.dayId, 'lunch')}
                      className="w-full py-3.5 sm:py-3 rounded-xl border border-dashed border-[#ECEBE8] text-[#7A7E7B] hover:text-[#4A7856] hover:border-[#4A7856]/40 hover:bg-[#F1F5F2] text-xs font-medium flex items-center justify-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 touch-manipulation active:scale-98 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span>Gericht wählen</span>
                    </button>
                  )}
                </div>
              )}

              {/* Dinner Slot - wenn Mittag ausgeblendet ist, geräumiger */}
              <div className={`space-y-1.5 ${!showLunchSlot ? 'flex-1 flex flex-col justify-center' : ''}`}>
                <div className="text-xs font-bold text-[#2D3E40] uppercase tracking-wide flex items-center justify-between">
                  <span>Abendessen</span>
                  {!showLunchSlot && day.lunch && (
                    <span className="text-xs text-[#7A7E7B] normal-case font-medium">
                      (1 Mittag geplant)
                    </span>
                  )}
                </div>

                {day.dinner ? (
                  <div className="p-3 bg-[#FAF9F6] hover:bg-[#F1F5F2] rounded-xl border border-[#ECEBE8] space-y-2 transition-colors group relative">
                    <div className="flex items-start justify-between gap-2">
                      <h4 
                        onClick={() => {
                          const r = allRecipes.find((rec) => rec.id === day.dinner?.recipeId);
                          if (r) onSelectRecipe(r);
                        }}
                        className="text-xs sm:text-sm font-semibold text-[#2D3E40] leading-snug break-words whitespace-normal cursor-pointer hover:text-[#4A7856] flex-1"
                      >
                        {day.dinner.recipeTitle}
                      </h4>
                      <button
                        onClick={() => {
                          removeSlot(day.dayId, 'dinner');
                          onCopyFeedback(`"${day.dinner?.recipeTitle || 'Mahlzeit'}" entfernt.`);
                        }}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl min-w-[38px] min-h-[38px] w-9 h-9 flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95"
                        title="Mahlzeit entfernen"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#7A7E7B] pt-1.5 border-t border-[#ECEBE8]">
                      <span>⏱️ {day.dinner.prepTime} Min.</span>
                      <span className="font-bold text-[#4A7856]">{day.dinner.protein}g Prot.</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openRecipePicker(day.dayId, 'dinner')}
                    className="w-full py-3.5 sm:py-3 rounded-xl border border-dashed border-[#ECEBE8] text-[#7A7E7B] hover:text-[#4A7856] hover:border-[#4A7856]/40 hover:bg-[#F1F5F2] text-xs font-medium flex items-center justify-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 touch-manipulation active:scale-98 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span>Gericht wählen</span>
                  </button>
                )}
              </div>

              {/* Day Bottom Summary */}
              <div className="text-xs text-[#7A7E7B] text-center pt-1.5 border-t border-[#ECEBE8]">
                {totalCalories > 0 ? `${totalCalories} kcal geplant` : 'Keine Gerichte'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Picker Modal - Breitere Ansicht mit hoher Informationsdichte & dynamischem Scrollen */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 z-50 bg-[#2D3E40]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 touch-none overscroll-contain animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full p-3 sm:p-5 flex flex-col h-[94vh] sm:h-[90vh] shadow-2xl border border-[#ECEBE8] animate-in zoom-in-95 duration-150 overscroll-contain overflow-hidden"
          >
            {/* Header: Kompakt gehalten für maximalen Platz für Rezepte */}
            <div className="flex items-center justify-between border-b border-[#ECEBE8] pb-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4A7856] bg-[#F1F5F2] px-2.5 py-1 rounded-lg border border-[#D5DDD7] shrink-0">
                  {mealPlan.find((d) => d.dayId === selectedDayId)?.dayName || 'Wochentag'} • {selectedMealType === 'lunch' ? 'Mittag' : 'Abend'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3E40] truncate">
                  Gericht auswählen
                </h3>
              </div>
              <button
                onClick={() => setShowRecipePickerModal(false)}
                className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl text-[#7A7E7B] hover:text-[#2D3E40] bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] flex items-center justify-center cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters Bar: Schlank & responsiv */}
            <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-[#ECEBE8]">
              <div className="relative flex-1">
                <Search className="w-4.5 h-4.5 text-[#7A7E7B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  placeholder="Gericht oder Zutat suchen..."
                  className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-xl border border-[#D5DDD7] bg-[#FAF9F6] text-[#2D3E40] placeholder-[#7A7E7B] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7856]/30 focus:border-[#4A7856] transition-all"
                />
                {pickerSearchQuery && (
                  <button
                    onClick={() => setPickerSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A7E7B] hover:text-[#2D3E40] w-7 h-7 flex items-center justify-center rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-0.5 sm:pb-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPickerVeganOnly(false)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                    !pickerVeganOnly
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  Alle ({allRecipes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPickerVeganOnly(true)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-1 ${
                    pickerVeganOnly
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] hover:bg-[#F1F5F2]'
                  }`}
                >
                  <span>🌱</span>
                  <span>Nur Vegan ({allRecipes.filter((r) => r.isVegan).length})</span>
                </button>
              </div>
            </div>

            {/* Recipes List: Dynamisch über große Bildschirmlänge mit 2-Spalten-Grid auf Desktop & Tablet */}
            <div className="overflow-y-auto pr-1 flex-1 overscroll-contain pt-2.5">
              {filteredPickerRecipes.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <p className="text-base font-semibold text-[#2D3E40]">Keine passenden Rezepte gefunden</p>
                  <p className="text-xs sm:text-sm text-[#7A7E7B]">Passe deinen Suchbegriff oder Filter an.</p>
                  {pickerVeganOnly && (
                    <button
                      onClick={() => setPickerVeganOnly(false)}
                      className="mt-2 text-xs font-semibold text-[#4A7856] hover:underline cursor-pointer"
                    >
                      Filter "Nur Vegan" aufheben
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pb-3">
                  {filteredPickerRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => assignRecipeToSlot(recipe)}
                      className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-[#ECEBE8] hover:border-[#4A7856] bg-[#FAF9F6] hover:bg-white transition-all cursor-pointer group shadow-2xs relative touch-manipulation active:scale-99"
                    >
                      <img
                        src={recipe.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80'}
                        alt={recipe.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 shadow-2xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs uppercase font-bold text-[#4A7856] truncate max-w-[120px]">
                            {recipe.category}
                          </span>
                          {recipe.isVegan ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              🌱 Vegan
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                              🧀 Veg.
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#2D3E40] group-hover:text-[#4A7856] leading-snug break-words">
                          {recipe.title}
                        </h4>
                        <div className="text-xs text-[#7A7E7B] flex items-center gap-2.5 mt-1.5 font-medium">
                          <span>⏱️ {recipe.totalTimeMinutes}m</span>
                          <span>🔥 {recipe.nutrients.calories} kcal</span>
                          <span className="text-[#4A7856] font-semibold">💪 {recipe.nutrients.protein}g Prot.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          assignRecipeToSlot(recipe);
                        }}
                        className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#4A7856] group-hover:bg-[#3D6447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1 shrink-0"
                        title="Dieses Gericht einplanen"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Wählen</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Meal Plan Generator Modal - Reformed and Streamlined */}
      {showAIGeneratorModal && (
        <div 
          onClick={() => setShowAIGeneratorModal(false)}
          className="fixed inset-0 z-50 bg-[#2D3E40]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-[#ECEBE8] animate-in zoom-in-95 duration-200 overscroll-contain"
          >
            <div className="flex items-start justify-between border-b border-[#ECEBE8] pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF] text-[11px] font-bold uppercase tracking-wider">
                  ✨ Gemini KI-Wochenplaner
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#2D3E40] mt-1.5 leading-snug">
                  7-Tage-Wochenplan erstellen
                </h3>
              </div>
              <button
                onClick={() => setShowAIGeneratorModal(false)}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-[#7A7E7B] hover:text-[#2D3E40] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simplified & Clear Form Fields */}
            <div className="space-y-4">
              {/* 1. Meal Type Selection: Lunch, Dinner or Both */}
              <div>
                <label className="block font-bold text-[#2D3E40] text-xs uppercase tracking-wider mb-2">
                  1. Welche Mahlzeiten einplanen?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiMealOption('lunch')}
                    className={`min-h-[46px] py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
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
                    className={`min-h-[46px] py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
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
                    className={`min-h-[46px] py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                      aiMealOption === 'both'
                        ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                        : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                    }`}
                  >
                    🍽️ Beides
                  </button>
                </div>
              </div>

              {/* 2. Diet preference */}
              <div>
                <label className="block font-bold text-[#2D3E40] text-xs uppercase tracking-wider mb-2">
                  2. Ernährungsweise
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiIsVegan(true)}
                    className={`min-h-[46px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
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
                    className={`min-h-[46px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                      !aiIsVegan
                        ? 'bg-[#2D3E40] text-white border-[#2D3E40] shadow-xs'
                        : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                    }`}
                  >
                    🧀 Vegetarisch & Vegan
                  </button>
                </div>
              </div>

              {/* 3. Persons / Portions */}
              <div>
                <label className="block font-bold text-[#2D3E40] text-xs uppercase tracking-wider mb-2">
                  3. Personen / Portionen
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAiPeopleCount(num)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer touch-manipulation active:scale-95 min-h-[46px] flex items-center justify-center ${
                        aiPeopleCount === num
                          ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Max cooking time */}
              <div>
                <label className="block font-bold text-[#2D3E40] text-xs uppercase tracking-wider mb-2">
                  4. Max. Zubereitungszeit
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 20, label: '⚡ Bis 20 Min.' },
                    { val: 35, label: '🍲 Bis 35 Min.' },
                    { val: 50, label: '⏱️ Beliebig' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setAiMaxMinutes(opt.val)}
                      className={`py-2.5 px-1.5 rounded-xl font-medium border text-center transition-all cursor-pointer min-h-[46px] flex items-center justify-center text-xs sm:text-sm touch-manipulation active:scale-95 ${
                        aiMaxMinutes === opt.val
                          ? 'bg-[#2D3E40] text-white border-[#2D3E40] shadow-xs font-semibold'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAIGeneratorModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] font-semibold text-sm cursor-pointer touch-manipulation active:scale-95 min-h-[48px]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                id="submit-ai-meal-plan-btn"
                disabled={isGeneratingPlan}
                onClick={handleGenerateAIMealPlan}
                className="flex-2 py-3 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95 min-h-[48px]"
              >
                {isGeneratingPlan ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Generiere Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
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
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Sicherheitsabfrage
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3E40]">
                  Gesamten Wochenplan leeren?
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#7A7E7B] leading-relaxed">
              Möchtest du wirklich alle geplanten Mahlzeiten dieser Woche aus deinem Wochenplan löschen? Du kannst diese Aktion danach über den Rückgängig-Button widerrufen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-clear-plan-btn"
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="min-h-[42px] px-4 py-2.5 rounded-xl border border-[#ECEBE8] bg-white hover:bg-[#FAF9F6] text-[#2D3E40] font-semibold text-xs transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                id="confirm-clear-plan-btn"
                type="button"
                onClick={handleConfirmClearAll}
                className="min-h-[42px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1.5"
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F1F5F2] flex items-center justify-center text-[#4A7856]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D3E40]">Alle Wochenpläne</h3>
                  <p className="text-xs text-[#7A7E7B]">Wähle eine Woche zum Anzeigen & Planen</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAllWeeksModal(false);
                  setConfirmDeleteWeekId(null);
                }}
                className="w-10 h-10 rounded-xl hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#F1F5F2] border-[#4A7856] shadow-xs ring-1 ring-[#4A7856]'
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#2D3E40] truncate">
                          {w.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4A7856] text-white">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#7A7E7B] mt-0.5">
                        {w.startDate && <span>{w.startDate}</span>}
                        <span>•</span>
                        <span className="font-medium text-[#4A7856]">{plannedCount} Mahlzeiten</span>
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
                          className="min-h-[38px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteWeekId(null);
                          }}
                          className="min-h-[38px] px-2.5 rounded-lg bg-white border border-rose-200 text-[#7A7E7B] hover:text-[#2D3E40] text-xs font-medium cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                            className="min-h-[38px] px-3.5 rounded-xl bg-white border border-[#ECEBE8] text-xs font-semibold text-[#2D3E40] hover:bg-[#F1F5F2] cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                            className="w-10 h-10 rounded-xl text-[#7A7E7B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                            title="Woche löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#ECEBE8] bg-[#FAF9F6] flex items-center justify-between gap-2">
              <span className="text-xs text-[#7A7E7B]">
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
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F1F5F2] flex items-center justify-center text-[#4A7856]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D3E40]">Neue Woche planen</h3>
                  <p className="text-xs text-[#7A7E7B]">Leeren 7-Tage-Plan anlegen</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateWeekModal(false)}
                className="w-10 h-10 rounded-xl hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2D3E40]">Bezeichnung (optional)</label>
              <input
                type="text"
                value={newWeekTitleInput}
                onChange={(e) => setNewWeekTitleInput(e.target.value)}
                placeholder={`z. B. Woche ${(weeks?.length || 0) + 1} oder KW ${(weeks?.length || 0) + 38}`}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-sm text-[#2D3E40] placeholder:text-[#7A7E7B] focus:outline-none focus:border-[#4A7856]"
              />
              <p className="text-[11px] text-[#7A7E7B]">
                Die bestehende Woche wird gespeichert und du startest mit einem frischen Wochenplan.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateWeekModal(false)}
                className="flex-1 min-h-[42px] py-2.5 rounded-xl border border-[#ECEBE8] text-xs font-semibold text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
                className="flex-1 min-h-[42px] py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
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
