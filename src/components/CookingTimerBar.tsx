'use client';

import React from 'react';
import { Play, Pause, RotateCcw, Maximize2, ChefHat, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRecipes } from '../context';
import CloseButton from './ui/CloseButton';

export const CookingTimerBar: React.FC = () => {
  const {
    recipes,
    cookingModeRecipe,
    setCookingModeRecipe,
    isCookingMinimized,
    setIsCookingMinimized,
    cookingCurrentStep,
    setCookingCurrentStep,
    cookingTimer,
    setCookingTimer,
  } = useRecipes();

  const isVisible = Boolean(cookingTimer || (cookingModeRecipe && isCookingMinimized));

  if (!isVisible) {
    return null;
  }

  const activeRecipe =
    cookingModeRecipe?.recipe ||
    (cookingTimer ? recipes.find((r) => r.id === cookingTimer.recipeId) || null : null);

  const recipeTitle =
    activeRecipe?.title || cookingTimer?.recipeTitle || 'Kochmodus aktiv';
  const totalSteps = activeRecipe?.steps?.length || 1;
  const stepNumber = cookingModeRecipe
    ? cookingCurrentStep + 1
    : cookingTimer?.stepNumber || 1;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const handleResumeCooking = () => {
    if (!cookingModeRecipe && activeRecipe) {
      setCookingModeRecipe({ recipe: activeRecipe, servings: activeRecipe.servings });
      if (cookingTimer?.stepNumber) {
        setCookingCurrentStep(Math.max(0, cookingTimer.stepNumber - 1));
      }
    }
    setIsCookingMinimized(false);
  };

  const handleToggleTimer = () => {
    if (!cookingTimer) return;
    setCookingTimer({
      ...cookingTimer,
      isRunning: !cookingTimer.isRunning,
    });
  };

  const handleResetTimer = () => {
    if (!cookingTimer) return;
    setCookingTimer({
      ...cookingTimer,
      secondsLeft: cookingTimer.totalSeconds,
      isRunning: false,
    });
  };

  const handleCloseAll = () => {
    setCookingTimer(null);
    setIsCookingMinimized(false);
    setCookingModeRecipe(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-auto sm:min-w-[380px] sm:max-w-md z-50 bg-card/95 backdrop-blur-md text-text-main rounded-2xl shadow-lg border border-border p-3 flex items-center justify-between gap-3"
      >
        {/* Left: Recipe & Step Info (Click to resume cooking mode) */}
        <button
          type="button"
          onClick={handleResumeCooking}
          className="flex items-center gap-3 text-left group min-w-0 flex-1 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-on-accent transition-colors">
            <ChefHat className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-accent">
                Schritt {Math.min(stepNumber, totalSteps)}/{totalSteps}
              </span>
              <span className="text-text-muted/40 text-xs">•</span>
              <span className="text-[11px] font-medium text-text-muted group-hover:text-text-main transition-colors">
                Öffnen
              </span>
            </div>
            <p className="text-sm font-bold text-text-main truncate">
              {recipeTitle}
            </p>
          </div>
        </button>

        {/* Center: Active Timer Controls (if a timer is set) */}
        {cookingTimer && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 ${
              cookingTimer.secondsLeft === 0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-surface border-border text-text-main'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                cookingTimer.secondsLeft === 0
                  ? 'text-amber-600 animate-bounce'
                  : cookingTimer.isRunning
                  ? 'text-accent'
                  : 'text-text-muted'
              }`}
            />
            <span className="font-mono font-bold text-xs sm:text-sm tabular-nums">
              {cookingTimer.secondsLeft === 0
                ? 'Fertig!'
                : formatTime(cookingTimer.secondsLeft)}
            </span>

            {cookingTimer.secondsLeft > 0 ? (
              <button
                type="button"
                onClick={handleToggleTimer}
                className="w-7 h-7 rounded-lg bg-accent-tint text-accent hover:bg-accent hover:text-on-accent flex items-center justify-center transition-colors cursor-pointer ml-1"
                title={cookingTimer.isRunning ? 'Timer pausieren' : 'Timer starten'}
              >
                {cookingTimer.isRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetTimer}
                className="w-7 h-7 rounded-lg bg-amber-200/70 text-amber-900 hover:bg-amber-300 flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Timer zurücksetzen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Right: Maximize & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResumeCooking}
            className="w-9 h-9 rounded-xl bg-surface hover:bg-border/60 border border-border text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
            title="Kochmodus maximieren"
            aria-label="Kochmodus maximieren"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <CloseButton
            onClick={handleCloseAll}
            ariaLabel="Kochmodus beenden"
            size={36}
            iconSize={16}
            className="rounded-xl bg-surface hover:bg-border/60 border border-border text-text-muted hover:text-text-main"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookingTimerBar;
