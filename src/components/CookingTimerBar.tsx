import React from 'react';
import { Clock, Play, Pause, RotateCcw, X, ChevronUp, ChefHat } from 'lucide-react';
import { CookingTimerState } from '../types';
import { useRecipes } from '../context/RecipeContext';

interface CookingTimerBarProps {
  timer?: CookingTimerState | null;
  onTogglePlay?: () => void;
  onReset?: () => void;
  onDismiss?: () => void;
  onOpenCookingMode?: () => void;
  /** Raise the bar above the bottom navigation (non-detail pages). */
  offsetForBottomNav?: boolean;
}

export const CookingTimerBar: React.FC<CookingTimerBarProps> = (props) => {
  const recipesCtx = useRecipes();

  const timer = props.timer !== undefined ? props.timer : recipesCtx.cookingTimer;
  const cookingModeRecipe = recipesCtx.cookingModeRecipe;
  const isCookingMinimized = recipesCtx.isCookingMinimized;
  const cookingCurrentStep = recipesCtx.cookingCurrentStep;

  // Render when there is an active timer OR when cooking mode is minimized
  if (!timer && (!cookingModeRecipe || !isCookingMinimized)) {
    return null;
  }

  const onTogglePlay = props.onTogglePlay ?? (() => {
    recipesCtx.setCookingTimer((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : null));
  });

  const onReset = props.onReset ?? (() => {
    recipesCtx.setCookingTimer((prev) => (prev ? { ...prev, secondsLeft: prev.totalSeconds, isRunning: false } : null));
  });

  const onDismiss = props.onDismiss ?? (() => {
    recipesCtx.setCookingTimer(null);
    if (recipesCtx.isCookingMinimized) {
      recipesCtx.setIsCookingMinimized(false);
      recipesCtx.setCookingModeRecipe(null);
      recipesCtx.setCookingCurrentStep(0);
    }
  });

  const onOpenCookingMode = props.onOpenCookingMode ?? (() => {
    if (cookingModeRecipe) {
      recipesCtx.setIsCookingMinimized(false);
    } else if (timer) {
      const target = recipesCtx.recipes.find((r) => r.id === timer.recipeId);
      if (target) {
        recipesCtx.setCookingModeRecipe({ recipe: target, servings: 2 });
        recipesCtx.setCookingCurrentStep(Math.max(0, timer.stepNumber - 1));
        recipesCtx.setIsCookingMinimized(false);
      }
    }
  });

  const recipeTitle = cookingModeRecipe?.recipe.title || timer?.recipeTitle || 'Rezept';
  const stepNumber = timer?.stepNumber ?? (cookingCurrentStep + 1);
  const totalSteps = cookingModeRecipe?.recipe.steps.length;

  const mins = timer ? Math.floor(timer.secondsLeft / 60) : 0;
  const secs = timer ? timer.secondsLeft % 60 : 0;
  const timeFormatted = timer ? `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : null;
  const isFinished = timer ? timer.secondsLeft === 0 : false;
  const progressPercent = timer && timer.totalSeconds > 0
    ? Math.max(0, Math.min(100, Math.round(((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100)))
    : 0;

  return (
    <aside
      id="persistent-cooking-timer-bar"
      className={`fixed inset-x-0 ${props.offsetForBottomNav ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]' : 'bottom-0'} z-50 bg-[#57534d] text-white border-t border-[#3D5254] px-3 sm:px-6 py-2.5 shadow-2xl animate-in slide-in-from-bottom duration-200`}
      aria-label="Aktiver Kochmodus und Timer"
    >
      {/* Top Countdown Progress Indicator */}
      {timer && timer.totalSeconds > 0 && (
        <div className="absolute top-0 inset-x-0 h-1 bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFinished ? 'bg-amber-400' : timer.isRunning ? 'bg-[#4A7856]' : 'bg-[#4A7856]/60'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left info & time / step */}
        <div 
          onClick={onOpenCookingMode} 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
          title="Klicken, um den Kochmodus im Vollbild zu öffnen"
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isFinished
              ? 'bg-amber-500 text-white animate-bounce'
              : timer?.isRunning
              ? 'bg-[#4A7856] text-white animate-pulse'
              : 'bg-white/10 text-white/90 group-hover:bg-[#4A7856] group-hover:text-white'
          }`}>
            {timer ? <Clock className="w-5 h-5" /> : <ChefHat className="w-5 h-5 text-[#8DB898]" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {timeFormatted ? (
                <span className="text-lg font-mono font-bold tracking-wider text-white">
                  {isFinished ? 'Fertig!' : timeFormatted}
                </span>
              ) : (
                <span className="text-sm font-semibold text-[#8DB898]">
                  Kochmodus aktiv
                </span>
              )}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-[#8DB898] truncate">
                Schritt {stepNumber}{totalSteps ? ` / ${totalSteps}` : ''}
              </span>
            </div>
            <p className="text-xs text-white/70 truncate max-w-[130px] xs:max-w-[200px] sm:max-w-xs md:max-w-md group-hover:text-white transition-colors">
              {recipeTitle}
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {timer && (
            <>
              <button
                type="button"
                onClick={onTogglePlay}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  timer.isRunning
                    ? 'bg-[#D35400] hover:bg-[#B94600] text-white'
                    : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
                }`}
                title={timer.isRunning ? 'Timer pausieren' : 'Timer starten'}
              >
                {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span className="hidden sm:inline">{timer.isRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
                title="Timer zurücksetzen"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Re-open / Maximize Cooking Mode */}
          <button
            type="button"
            id="cooking-timer-bar-open-btn"
            onClick={onOpenCookingMode}
            className="min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-95 shadow-xs"
            title="Kochmodus im Vollbild fortsetzen"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Vollbild</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
            title="Kochleiste beenden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookingTimerBar;
