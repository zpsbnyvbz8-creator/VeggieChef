import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { DayPlan, Recipe, WeekPlan } from '../types';
import { INITIAL_MEAL_PLAN } from '../data/recipes';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  createEmptyWeekDays 
} from '../utils/helpers';
import { subscribeToFamilyMealPlan } from '../lib/syncService';
import { useToast } from './ToastContext';
import { useSync } from './SyncContext';

export interface PlannerContextType {
  weeks: WeekPlan[];
  setWeeks: React.Dispatch<React.SetStateAction<WeekPlan[]>>;
  activeWeekId: string;
  setActiveWeekId: (id: string) => void;
  activeWeek: WeekPlan;
  mealPlan: DayPlan[];
  setMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  recipeToAddToPlan: Recipe | null;
  setRecipeToAddToPlan: (recipe: Recipe | null) => void;
  addToMealPlan: (recipe: Recipe) => void;
  confirmAddToMealPlan: (dayId: string, mealType: 'lunch' | 'dinner', targetWeekId?: string) => void;
  createNewWeek: (customTitle?: string) => void;
  deleteWeek: (weekId: string) => void;
  selectWeek: (weekId: string) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { syncConfig, syncMealPlanDays, registerDomainSync } = useSync();

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

  // Sync state with localStorage
  useEffect(() => {
    saveToLocalStorage('veggiechef_weeks_v2', weeks);
    saveToLocalStorage('veggiechef_active_week_id', activeWeekId);
    if (activeWeek) {
      saveToLocalStorage('veggiechef_mealplan', activeWeek.days);
    }
  }, [weeks, activeWeekId, activeWeek]);

  // Register with SyncContext for non-destructive merge updates on join
  useEffect(() => {
    const unregister = registerDomainSync({
      onMergeMealPlan: (mergedPlan) => {
        setWeeks((prev) =>
          prev.map((w) => (w.id === activeWeekId ? { ...w, days: mergedPlan } : w))
        );
      },
    });
    return unregister;
  }, [registerDomainSync, activeWeekId]);

  // Realtime Family Sync Subscriptions
  useEffect(() => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;

    const unsubPlan = subscribeToFamilyMealPlan(syncConfig.groupId, (cloudPlan) => {
      setWeeks((prev) =>
        prev.map((w) => (w.id === activeWeekId ? { ...w, days: cloudPlan } : w))
      );
    });

    return () => {
      unsubPlan();
    };
  }, [syncConfig.mode, syncConfig.groupId, activeWeekId]);

  // Synchronized setter (updates local state and delegates debounced upload to SyncContext)
  const setMealPlan: React.Dispatch<React.SetStateAction<DayPlan[]>> = (updater) => {
    setWeeks((prev) => {
      // Find the target week id: activeWeekId or the first week
      const targetId = prev.some((w) => w.id === activeWeekId) ? activeWeekId : prev[0]?.id;
      return prev.map((w) => {
        if (w.id === targetId) {
          const nextDays = typeof updater === 'function' ? updater(w.days) : updater;
          syncMealPlanDays(nextDays, false);
          return { ...w, days: nextDays };
        }
        return w;
      });
    });
  };

  const addToMealPlan = (r: Recipe) => {
    setRecipeToAddToPlan(r);
  };

  const confirmAddToMealPlan = (dayId: string, mealType: 'lunch' | 'dinner', targetWeekId?: string) => {
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
          syncMealPlanDays(updatedDays, false);
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

  const createNewWeek = (customTitle?: string) => {
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

  const deleteWeek = (weekId: string) => {
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

  const selectWeek = (weekId: string) => {
    setActiveWeekId(weekId);
  };

  return (
    <PlannerContext.Provider
      value={{
        weeks,
        setWeeks,
        activeWeekId,
        setActiveWeekId,
        activeWeek,
        mealPlan,
        setMealPlan,
        recipeToAddToPlan,
        setRecipeToAddToPlan,
        addToMealPlan,
        confirmAddToMealPlan,
        createNewWeek,
        deleteWeek,
        selectWeek,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export function usePlanner(): PlannerContextType {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}
