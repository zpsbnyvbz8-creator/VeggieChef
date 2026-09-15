import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  ChefHat, 
  List, 
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe, CookingTimerState } from '../types';
import { formatIngredientAmount } from '../utils/helpers';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface CookingModeModalProps {
  recipe: Recipe | null;
  servings: number;
  onClose: () => void;
  onFinishCooking: () => void;
  cookingTimer: CookingTimerState | null;
  onUpdateTimer: (timer: CookingTimerState | null) => void;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  recipe,
  servings,
  onClose,
  onFinishCooking,
  cookingTimer,
  onUpdateTimer,
}) => {
  if (!recipe) return null;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState(false);
  const [dismissedSteps, setDismissedSteps] = useState<Record<number, boolean>>({});

  // Lock body scroll while cooking mode modal is open
  useLockBodyScroll(Boolean(recipe));

  const currentStep = recipe.steps[currentStepIndex];
  const stepTimerMinutes = currentStep?.timerMinutes || 0;
  const isStepDismissed = Boolean(dismissedSteps[currentStepIndex]);

  // Check if a timer specifically belongs to this step
  const isTimerForThisStep = Boolean(
    cookingTimer &&
    cookingTimer.recipeId === recipe.id &&
    cookingTimer.stepNumber === currentStepIndex + 1
  );

  // Check if a timer is running in the background for a different step
  const isTimerRunningForOtherStep = Boolean(
    cookingTimer &&
    cookingTimer.recipeId === recipe.id &&
    cookingTimer.stepNumber !== currentStepIndex + 1 &&
    cookingTimer.isRunning &&
    cookingTimer.secondsLeft > 0
  );

  const isTimerRunning = isTimerForThisStep ? (cookingTimer?.isRunning || false) : false;
  const timerSecondsLeft = isTimerForThisStep
    ? (cookingTimer?.secondsLeft ?? stepTimerMinutes * 60)
    : stepTimerMinutes * 60;

  const handleStartTimer = () => {
    setDismissedSteps((prev) => ({ ...prev, [currentStepIndex]: false }));
    if (isTimerForThisStep && cookingTimer) {
      onUpdateTimer({
        ...cookingTimer,
        isRunning: true,
      });
    } else {
      const initSecs = (stepTimerMinutes > 0 ? stepTimerMinutes : 5) * 60;
      onUpdateTimer({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: currentStepIndex + 1,
        stepTitle: currentStep?.title || `Schritt ${currentStepIndex + 1}`,
        totalSeconds: initSecs,
        secondsLeft: initSecs,
        isRunning: true,
      });
    }
  };

  const handlePauseTimer = () => {
    if (cookingTimer) {
      onUpdateTimer({
        ...cookingTimer,
        isRunning: false,
      });
    }
  };

  const handleResetTimer = () => {
    // Clear active timer so it is fully reset and dismissed from other steps
    onUpdateTimer(null);
  };

  const handleDeleteTimer = () => {
    // Completely clear timer and dismiss for current step
    onUpdateTimer(null);
    setDismissedSteps((prev) => ({ ...prev, [currentStepIndex]: true }));
  };

  const handleAdjustTimer = (diffSeconds: number) => {
    setDismissedSteps((prev) => ({ ...prev, [currentStepIndex]: false }));
    if (isTimerForThisStep && cookingTimer) {
      const newSec = Math.max(0, cookingTimer.secondsLeft + diffSeconds);
      onUpdateTimer({
        ...cookingTimer,
        secondsLeft: newSec,
        totalSeconds: Math.max(cookingTimer.totalSeconds, newSec),
      });
    } else if (stepTimerMinutes > 0) {
      const initSec = Math.max(0, stepTimerMinutes * 60 + diffSeconds);
      onUpdateTimer({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: currentStepIndex + 1,
        stepTitle: currentStep?.title || `Schritt ${currentStepIndex + 1}`,
        totalSeconds: initSec,
        secondsLeft: initSec,
        isRunning: false,
      });
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Completed all steps!
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      onFinishCooking();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const progressPercent = Math.round(((currentStepIndex + 1) / recipe.steps.length) * 100);

  return (
    <div className="fixed inset-0 z-60 bg-[#2D3E40] text-white flex flex-col justify-between animate-in fade-in duration-200 overscroll-contain">
      {/* Top Bar */}
      <div className="p-3 sm:p-6 bg-[#243335] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#4A7856] flex items-center justify-center font-semibold text-white shadow-xs shrink-0">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-[#8DB898] font-semibold uppercase tracking-wider">
              Fokus-Kochmodus ({servings} Port.)
            </div>
            <h2 className="text-sm sm:text-lg font-semibold truncate max-w-xs sm:max-w-md">
              {recipe.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ingredients Drawer Toggle */}
          <button
            id="cooking-mode-ingredients-btn"
            type="button"
            onClick={() => setShowIngredientsDrawer(!showIngredientsDrawer)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              showIngredientsDrawer
                ? 'bg-[#4A7856] text-white'
                : 'bg-white/10 text-white/90 hover:bg-white/15'
            }`}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Zutaten</span>
          </button>

          {/* Close Cooking Mode (returns directly to recipe modal) */}
          <button
            id="cooking-mode-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 transition-colors cursor-pointer"
            title="Kochmodus beenden (Zurück zum Rezept)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-1.5">
        <div
          className="bg-[#4A7856] h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Center Step Screen */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-8 flex flex-col justify-center relative overflow-y-auto">
        <div className="space-y-4 sm:space-y-6">
          {/* Step Counter Pill */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 sm:py-1 rounded-full bg-white/10 text-white border border-white/15 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Schritt {currentStepIndex + 1} von {recipe.steps.length}
            </span>
            {currentStep?.title && (
              <span className="text-white/70 text-xs sm:text-sm font-medium">
                • {currentStep.title}
              </span>
            )}
          </div>

          {/* Main Step Instruction Text */}
          <div className="text-lg sm:text-2xl lg:text-3xl font-semibold leading-relaxed text-white">
            {currentStep?.text}
          </div>

          {/* Background Running Timer for another step */}
          {isTimerRunningForOtherStep && cookingTimer && (
            <div className="p-3 bg-white/10 border border-white/15 rounded-2xl max-w-md flex items-center justify-between gap-2 text-xs text-white">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-[#8DB898] animate-pulse shrink-0" />
                <span className="truncate">
                  Timer läuft für Schritt {cookingTimer.stepNumber}: <strong className="font-mono">{formatTime(cookingTimer.secondsLeft)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(cookingTimer.stepNumber - 1)}
                  className="px-2 py-1 rounded-lg bg-[#4A7856] text-[11px] font-semibold hover:bg-[#3D6447] text-white transition-colors"
                >
                  Zu Schritt {cookingTimer.stepNumber}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTimer}
                  className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/30 transition-colors"
                  title="Timer löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Integrated Persistent Timer for Current Step */}
          {!isStepDismissed && (stepTimerMinutes > 0 || isTimerForThisStep) ? (
            <div className="p-3.5 sm:p-5 bg-[#243335] border border-white/10 rounded-2xl max-w-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`p-2.5 sm:p-3 rounded-xl transition-colors ${
                  timerSecondsLeft === 0
                    ? 'bg-amber-500 text-white animate-bounce'
                    : isTimerRunning
                    ? 'bg-[#4A7856] text-white animate-pulse'
                    : 'bg-white/10 text-white/70'
                }`}>
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase font-semibold text-white/70 flex items-center gap-1.5">
                    <span>Küchen-Timer</span>
                    {isTimerForThisStep && cookingTimer && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-white/10 text-[#8DB898]">
                        Schritt {cookingTimer.stepNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider">
                    {timerSecondsLeft === 0 ? 'Fertig!' : formatTime(timerSecondsLeft)}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
                {/* Adjust +/- 1 min */}
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-60)}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs cursor-pointer flex items-center justify-center touch-manipulation active:scale-95"
                  title="1 Minute abziehen"
                >
                  <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(60)}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs cursor-pointer flex items-center justify-center touch-manipulation active:scale-95"
                  title="1 Minute hinzufügen"
                >
                  <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Play / Pause */}
                <button
                  type="button"
                  id="cooking-mode-timer-toggle-btn"
                  onClick={isTimerRunning ? handlePauseTimer : handleStartTimer}
                  className={`w-11 h-11 sm:w-9 sm:h-9 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center touch-manipulation active:scale-95 ${
                    isTimerRunning
                      ? 'bg-[#D35400] hover:bg-[#B94600] text-white'
                      : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
                  }`}
                  title={isTimerRunning ? 'Pause' : 'Start'}
                >
                  {isTimerRunning ? <Pause className="w-5 h-5 sm:w-4 sm:h-4" /> : <Play className="w-5 h-5 sm:w-4 sm:h-4 fill-white" />}
                </button>

                {/* Reset */}
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white cursor-pointer flex items-center justify-center touch-manipulation active:scale-95"
                  title="Timer zurücksetzen & beenden"
                >
                  <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Delete / Dismiss Timer Button */}
                <button
                  type="button"
                  onClick={handleDeleteTimer}
                  className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white cursor-pointer transition-colors flex items-center justify-center touch-manipulation active:scale-95"
                  title="Timer löschen / ausblenden"
                >
                  <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          ) : isStepDismissed && stepTimerMinutes > 0 ? (
            <button
              type="button"
              onClick={() => {
                setDismissedSteps((prev) => ({ ...prev, [currentStepIndex]: false }));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition-colors cursor-pointer w-fit"
            >
              <Clock className="w-3.5 h-3.5 text-[#8DB898]" />
              <span>Timer wieder einblenden ({stepTimerMinutes} Min.)</span>
            </button>
          ) : null}
        </div>

        {/* Slide-over / Overlay Ingredients Drawer */}
        {showIngredientsDrawer && (
          <div className="absolute inset-x-4 top-4 bottom-4 sm:inset-x-auto sm:right-4 sm:w-80 bg-[#243335] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto z-20 space-y-3 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-semibold text-white">Zutaten ({servings} Port.)</h4>
              <button 
                type="button"
                onClick={() => setShowIngredientsDrawer(false)} 
                className="text-white/70 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <div key={ing.name} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                  <span className="text-white/80">{ing.name}</span>
                  <span className="font-semibold text-[#8DB898]">
                    {formatIngredientAmount(ing, recipe.servings, servings)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Control Bar */}
      <div className="p-3.5 sm:p-6 bg-[#243335] border-t border-white/10 flex items-center justify-between">
        <button
          id="cooking-mode-prev-btn"
          type="button"
          disabled={currentStepIndex === 0}
          onClick={handlePrev}
          className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[40px] px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5" />
          <span>Zurück</span>
        </button>

        <span className="text-xs sm:text-xs font-semibold text-white/70">
          {currentStepIndex + 1} / {recipe.steps.length}
        </span>

        <button
          id="cooking-mode-next-btn"
          type="button"
          onClick={handleNext}
          className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[40px] px-5 sm:px-6 py-2.5 sm:py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
        >
          <span>
            {currentStepIndex === recipe.steps.length - 1 ? 'Fertig! 🎉' : 'Weiter'}
          </span>
          <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
