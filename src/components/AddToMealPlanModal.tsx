import React, { useState } from 'react';
import { X, Calendar, Clock, Flame, Dumbbell, Sun, Moon, Check } from 'lucide-react';
import { Recipe, DayPlan, WeekPlan } from '../types';
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
              <p className="text-xs text-[#7A7E7B]">Wähle Tag und Mahlzeit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#FAF9F6] text-[#7A7E7B] hover:text-[#2D3E40] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Recipe Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8]">
            <img
              src={recipe.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80'}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                recipe.isVegan ? 'bg-[#EBF3ED] text-[#4A7856]' : 'bg-[#FAF2EC] text-[#E67E22]'
              }`}>
                {recipe.isVegan ? '🌱 100% Vegan' : '🧀 Vegetarisch'}
              </span>
              <h4 className="text-sm font-semibold text-[#2D3E40] truncate">{recipe.title}</h4>
              <div className="flex items-center gap-2.5 text-[11px] text-[#7A7E7B] mt-0.5">
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
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] text-xs font-medium text-[#2D3E40] focus:outline-none focus:border-[#4A7856] cursor-pointer"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
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
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/50 text-[#2D3E40]'
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
            <div className="text-[11px] text-[#7A7E7B] flex items-center justify-between pt-0.5">
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
                    ? 'bg-[#F1F5F2] border-[#4A7856] text-[#2D3E40] ring-1 ring-[#4A7856]'
                    : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#7A7E7B]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  selectedMealType === 'lunch' ? 'bg-[#4A7856] text-white' : 'bg-[#FAF9F6] text-[#E67E22]'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[#2D3E40]">Mittagessen</span>
                  <span className="text-[10px] text-[#7A7E7B] truncate block">
                    {currentDay?.lunch ? `Belegt: ${currentDay.lunch.recipeTitle}` : 'Noch frei'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMealType('dinner')}
                className={`min-h-[50px] p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedMealType === 'dinner'
                    ? 'bg-[#F1F5F2] border-[#4A7856] text-[#2D3E40] ring-1 ring-[#4A7856]'
                    : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#7A7E7B]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  selectedMealType === 'dinner' ? 'bg-[#4A7856] text-white' : 'bg-[#FAF9F6] text-[#7A7E7B]'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-[#2D3E40]">Abendessen</span>
                  <span className="text-[10px] text-[#7A7E7B] truncate block">
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
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[#ECEBE8] text-[#7A7E7B] hover:text-[#2D3E40] text-xs font-semibold hover:bg-[#FAF9F6] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
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
