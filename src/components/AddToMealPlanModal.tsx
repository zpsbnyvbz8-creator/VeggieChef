import React, { useState } from 'react';
import { X, Calendar, Clock, Flame, Dumbbell, Sun, Moon, Check, ChevronDown } from 'lucide-react';
import { Recipe, DayPlan, WeekPlan } from '../types';
import { RecipeImage } from './RecipeImage';
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
        className="bg-white rounded-2xl border border-[#ECEBE8] shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 overscroll-contain"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ECEBE8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F1F5F2] flex items-center justify-center text-[#4A7856]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D3E40]">In Wochenplan einplanen</h3>
              <p className="text-xs text-[#686E6A]">Wähle Tag und Mahlzeit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#FAF9F6] text-[#57534d] hover:text-[#57534d] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Recipe Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8]">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
              <RecipeImage
                recipe={recipe}
                imgClassName="w-full h-full object-cover"
                alt={recipe.title}
                size="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              {recipe.isVegan && (
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1 border border-[#ECEBE8] bg-[#EBF3ED] text-[#4A7856]">
                  🌱 100% Vegan
                </span>
              )}
              <h4 className="text-sm font-semibold text-[#2D3E40] truncate">{recipe.title}</h4>
              <div className="flex items-center gap-2.5 text-[11px] text-[#686E6A] mt-0.5">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {recipe.totalTimeMinutes} Min.
                </span>
                <span className="flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-[#E67E22]" />
                  {recipe.nutrients.calories} kcal
                </span>
                <span className="flex items-center gap-0.5 font-medium text-[#4A7856]">
                  <Dumbbell className="w-3 h-3" />
                  {recipe.nutrients.protein}g Prot.
                </span>
              </div>
            </div>
          </div>

          {/* Week Selector (if multiple weeks available) */}
          {weeks && weeks.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2D3E40]">Woche auswählen</label>
              <div className="relative">
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="appearance-none w-full h-11 min-h-[44px] px-3.5 pr-9 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-[16px] font-medium text-[#2D3E40] focus:outline-none focus:border-[#4A7856] cursor-pointer"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#686E6A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Day Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#2D3E40]">Wochentag wählen</label>
            <div className="grid grid-cols-7 gap-1.5">
              {targetDays.map((day) => {
                const isSelected = day.dayId === selectedDayId;
                const hasLunch = !!day.lunch;
                const hasDinner = !!day.dinner;
                const isFull = hasLunch && hasDinner;

                return (
                  <button
                    key={day.dayId}
                    type="button"
                    onClick={() => setSelectedDayId(day.dayId)}
                    className={`flex flex-col items-center justify-center min-h-[48px] py-2 px-1 rounded-xl text-center border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      isSelected
                        ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs'
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#57534d]'
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">
                      {day.dayName.slice(0, 2)}
                    </span>
                    <div className="flex gap-0.5 mt-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? isFull
                              ? 'bg-amber-300'
                              : 'bg-white/70'
                            : hasLunch || hasDinner
                            ? 'bg-[#4A7856]'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-[#686E6A] flex items-center justify-between pt-0.5">
              <span>Ausgewählt: <strong className="text-[#2D3E40]">{targetDays.find((d) => d.dayId === selectedDayId)?.dayName}</strong></span>
            </div>
          </div>

          {/* Meal Slot Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#2D3E40]">Mahlzeit / Uhrzeit</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMealType('lunch')}
                className={`min-h-[50px] p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedMealType === 'lunch'
                    ? 'bg-[#F1F5F2] border-[#4A7856] text-[#57534d] ring-1 ring-[#4A7856]'
                    : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#686E6A]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  selectedMealType === 'lunch' ? 'bg-[#4A7856] text-white' : 'bg-[#FAF9F6] text-[#E67E22]'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[#2D3E40]">Mittagessen</span>
                  <span className="text-[10px] text-[#686E6A] truncate block">
                    {currentDay?.lunch ? `Belegt: ${currentDay.lunch.recipeTitle}` : 'Noch frei'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMealType('dinner')}
                className={`min-h-[50px] p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedMealType === 'dinner'
                    ? 'bg-[#F1F5F2] border-[#4A7856] text-[#57534d] ring-1 ring-[#4A7856]'
                    : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#686E6A]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  selectedMealType === 'dinner' ? 'bg-[#4A7856] text-white' : 'bg-[#FAF9F6] text-[#686E6A]'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[#2D3E40]">Abendessen</span>
                  <span className="text-[10px] text-[#686E6A] truncate block">
                    {currentDay?.dinner ? `Belegt: ${currentDay.dinner.recipeTitle}` : 'Noch frei'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Conflict Notice if slot occupied */}
          {existingSlot && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              Hinweis: Dieser Slot enthält bereits <strong>"{existingSlot.recipeTitle}"</strong> und wird ersetzt.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] h-12 py-3 rounded-xl border border-[#ECEBE8] text-[#57534d] hover:bg-[#FAF9F6] text-[16px] font-semibold transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] h-12 py-3 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-[16px] font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
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
