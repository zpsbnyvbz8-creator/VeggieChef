import React, { useState } from 'react';
import { Calendar, ChevronDown, Sun, Moon, Check } from 'lucide-react';
import { Recipe, DayPlan, WeekPlan } from '../types';
import { RecipeCardListRow } from './ui/RecipeCardListRow';
import { CloseButton } from './ui/CloseButton';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { usePlanner } from '../context/PlannerContext';

interface AddToMealPlanModalProps {
  recipe?: Recipe | null;
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: (dayId: string, mealType: 'lunch' | 'dinner', weekId?: string) => void;
  currentMealPlan?: DayPlan[];
  weeks?: WeekPlan[];
  activeWeekId?: string;
}

export const AddToMealPlanModal: React.FC<AddToMealPlanModalProps> = (props) => {
  const plannerCtx = usePlanner();

  const recipe = props.recipe !== undefined ? props.recipe : plannerCtx.recipeToAddToPlan;
  const isOpen = props.isOpen !== undefined ? props.isOpen : !!plannerCtx.recipeToAddToPlan;
  const onClose = props.onClose ?? (() => plannerCtx.setRecipeToAddToPlan(null));
  const onConfirm = props.onConfirm ?? plannerCtx.confirmAddToMealPlan;
  const currentMealPlan = props.currentMealPlan ?? plannerCtx.mealPlan;
  const weeks = props.weeks ?? plannerCtx.weeks;
  const activeWeekId = props.activeWeekId ?? plannerCtx.activeWeekId;
  const [selectedDayId, setSelectedDayId] = useState<string>('mon');
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('dinner');
  const [selectedWeekId, setSelectedWeekId] = useState<string>(activeWeekId || weeks?.[0]?.id || 'current');

  useLockBodyScroll(isOpen);

  if (!isOpen || !recipe) return null;

  // Active days list based on chosen week if weeks exist
  const targetDays = weeks?.find((w) => w.id === selectedWeekId)?.days || currentMealPlan;
  const currentDay = targetDays.find((d) => d.dayId === selectedDayId);
  const existingSlot = currentDay ? currentDay[selectedMealType] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedDayId, selectedMealType, selectedWeekId);
    onClose();
  };

  return (
    <div
      id="add-to-meal-plan-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
    >
      <div
        id="add-to-meal-plan-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 overscroll-contain max-h-[92vh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-tint flex items-center justify-center text-accent">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">In Wochenplan einplanen</h3>
              <p className="text-xs text-text-muted">Wähle Tag und Mahlzeit</p>
            </div>
          </div>
          <CloseButton onClick={onClose} ariaLabel="Planer schließen" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-64px)]">
          {/* Target Recipe Preview: EXACT RecipeCardListRow with existing grey tone (bg-page) for clear contrast against white modal */}
          <div className="w-full overflow-hidden [&_a]:pointer-events-none">
            <RecipeCardListRow
              recipe={recipe}
              className="bg-page border-border shadow-xs hover:border-accent/40"
            />
          </div>

          {/* Week Selector (if multiple weeks available) */}
          {weeks && weeks.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-main">Woche auswählen</label>
              <div className="relative">
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="appearance-none w-full h-11 min-h-[44px] px-3.5 pr-9 py-2.5 rounded-xl bg-surface border border-border text-[16px] font-medium text-text-main focus:outline-none focus:border-accent cursor-pointer"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Day Selector */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg font-bold text-text-main block">Wochentag wählen</label>
            <div className="grid grid-cols-7 gap-1.5">
              {targetDays.map((day) => {
                const isSelected = day.dayId === selectedDayId;
                const hasLunch = !!day.lunch;
                const hasDinner = !!day.dinner;

                return (
                  <button
                    key={day.dayId}
                    type="button"
                    onClick={() => setSelectedDayId(day.dayId)}
                    className={`flex flex-col items-center justify-center min-h-[48px] py-2 px-1 rounded-xl text-center border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      isSelected
                        ? 'bg-accent text-on-accent border-accent shadow-xs'
                        : 'bg-card border-border hover:border-accent/50 text-[#57534d]'
                    }`}
                  >
                    <span className="text-sm font-bold leading-none">
                      {day.dayName.slice(0, 2)}
                    </span>
                    {!isSelected && (hasLunch || hasDinner) && (
                      <div className="flex gap-0.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time / Slot Selector */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg font-bold text-text-main block">Uhrzeit</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMealType('lunch')}
                className={`min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedMealType === 'lunch'
                    ? 'bg-accent-tint border-accent text-accent ring-1 ring-accent'
                    : 'bg-card border-border hover:border-accent/40 text-text-muted'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedMealType === 'lunch' ? 'bg-accent text-on-accent' : 'bg-surface text-[#E67E22]'
                }`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-base font-bold block text-text-main">Mittagessen</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMealType('dinner')}
                className={`min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedMealType === 'dinner'
                    ? 'bg-accent-tint border-accent text-accent ring-1 ring-accent'
                    : 'bg-card border-border hover:border-accent/40 text-text-muted'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedMealType === 'dinner' ? 'bg-accent text-on-accent' : 'bg-surface text-text-muted'
                }`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-base font-bold block text-text-main">Abendessen</span>
                </div>
              </button>
            </div>
          </div>

          {/* Occupied Slot Notice - Fixed height container so the popup never changes vertical height when toggling meals */}
          <div className="min-h-[46px] flex items-center">
            {existingSlot ? (
              <div className="w-full min-h-[46px] p-2.5 px-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[14px] font-medium leading-normal flex items-center">
                <span className="truncate">
                  Belegt: <strong className="font-bold">{existingSlot.recipeTitle}</strong>
                </span>
              </div>
            ) : (
              <div className="w-full min-h-[46px] p-2.5 px-3 rounded-xl bg-surface/60 border border-border/70 text-text-muted text-[14px] font-medium leading-normal flex items-center">
                <span>Slot noch frei</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] h-12 py-3 rounded-xl border border-border text-[#57534d] hover:bg-surface text-[16px] font-semibold transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] h-12 py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-[16px] font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Jetzt einplanen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
