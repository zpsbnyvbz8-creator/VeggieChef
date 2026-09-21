import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2, 
  ChevronDown,
  Lightbulb,
  Check,
  AlertTriangle,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Recipe, RecipeIngredient, RecipeStep, CookingTimerState } from '../types';
import { formatIngredientAmount } from '../utils/helpers';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

interface CookingModeModalProps {
  recipe?: Recipe | null;
  servings?: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onFinishCooking?: () => void;
  cookingTimer?: CookingTimerState | null;
  onUpdateTimer?: (timer: CookingTimerState | null) => void;
}

/**
 * Intelligent helper to extract only ingredients and precise quantities needed for a specific step.
 */
function getStepSpecificIngredients(stepText: string, ingredients: RecipeIngredient[]): RecipeIngredient[] {
  if (!stepText || !ingredients || ingredients.length === 0) return [];
  const textLower = stepText.toLowerCase();

  return ingredients.filter((ing) => {
    if (!ing.name) return false;

    // Clean name from parentheticals and extra descriptors
    const cleanName = ing.name
      .replace(/\(.*?\)/g, '')
      .replace(/[\d/½¼¾,.]+/g, '')
      .trim()
      .toLowerCase();

    if (!cleanName) return false;

    // Direct check: whole cleaned name
    if (textLower.includes(cleanName)) return true;

    // Check individual significant words
    const words = cleanName.split(/\s+/).filter((w) => w.length >= 3);
    for (const word of words) {
      // Common German stem match (e.g. "zwiebel" in "zwiebeln", "karotte" in "karotten")
      const stem = word.replace(/(n|en|e|s|es)$/, '');
      if (stem.length >= 3 && textLower.includes(stem)) {
        return true;
      }
      if (textLower.includes(word)) {
        return true;
      }
    }

    // Common synonyms / variants in cooking instructions
    const lowerName = ing.name.toLowerCase();
    if (lowerName.includes('öl') && textLower.includes('öl')) return true;
    if (lowerName.includes('salz') && (textLower.includes('salz') || textLower.includes('abschmecken') || textLower.includes('würzen') || textLower.includes('salzen'))) return true;
    if (lowerName.includes('pfeffer') && (textLower.includes('pfeffer') || textLower.includes('abschmecken') || textLower.includes('würzen'))) return true;
    if (lowerName.includes('knoblauch') && textLower.includes('knoblauch')) return true;
    if (lowerName.includes('brühe') && (textLower.includes('brühe') || textLower.includes('ablöschen'))) return true;
    if (lowerName.includes('kokosmilch') && textLower.includes('kokosmilch')) return true;
    if (lowerName.includes('pasta') && (textLower.includes('nudel') || textLower.includes('pasta') || textLower.includes('spaghetti'))) return true;
    if (lowerName.includes('zitrone') && (textLower.includes('zitrone') || textLower.includes('zitronensaft'))) return true;
    if (lowerName.includes('limette') && (textLower.includes('limette') || textLower.includes('limettensaft'))) return true;

    return false;
  });
}

/**
 * Intelligent helper to extract minutes mentioned in the text if timerMinutes is not explicitly set.
 */
function extractMinutesFromText(text: string): number {
  if (!text) return 0;
  const match = text.match(/(?:ca\.?\s*)?(\d+)(?:\s*-\s*\d+)?\s*(?:minuten|min\b)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0 && val <= 180) {
      return val;
    }
  }
  return 0;
}

/**
 * Intelligent helper to detect or match culinary pro-tips for the current step.
 */
function getStepProTip(stepText: string, recipe: Recipe, stepIndex: number): string | null {
  // 1. Check if step text itself contains a "Tipp:" or "Profi-Tipp:"
  const inlineTipMatch = stepText.match(/(?:(?:profi[- ]?)?tipp|hinweis)\s*:\s*([^.\n]+(?:\.[^.\n]+)?)/i);
  if (inlineTipMatch && inlineTipMatch[1]) {
    return inlineTipMatch[1].trim();
  }

  // 2. Check if recipe.chefTip applies to this step's context
  if (recipe.chefTip) {
    const stepLower = stepText.toLowerCase();
    const tipLower = recipe.chefTip.toLowerCase();
    const culinaryKeywords = [
      'rösten', 'anbraten', 'köcheln', 'soße', 'sauce', 'tofu', 'nudeln', 'pasta',
      'gewürz', 'abschmecken', 'ofen', 'backen', 'knusprig', 'dünsten', 'marinier',
      'hitze', 'temperatur', 'ruhen lassen'
    ];
    const hasOverlap = culinaryKeywords.some((k) => stepLower.includes(k) && tipLower.includes(k));
    if (hasOverlap) {
      return recipe.chefTip;
    }

    // Default chefTip to first prep step or last finishing step if general
    if (stepIndex === 0 && (tipLower.includes('vorbereitung') || tipLower.includes('schneiden') || tipLower.includes('marinier'))) {
      return recipe.chefTip;
    }
    if (stepIndex === recipe.steps.length - 1 && (tipLower.includes('servieren') || tipLower.includes('anrichten') || tipLower.includes('garnier') || tipLower.includes('frisch'))) {
      return recipe.chefTip;
    }
  }

  // 3. Check veganVersionTips if relevant to dairy/meat replacements
  if (recipe.veganVersionTips) {
    const stepLower = stepText.toLowerCase();
    if (stepLower.includes('käse') || stepLower.includes('sahne') || stepLower.includes('butter') || stepLower.includes('milch')) {
      return recipe.veganVersionTips;
    }
  }

  return null;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = (props) => {
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const recipe = props.recipe !== undefined ? props.recipe : (recipesCtx.cookingModeRecipe?.recipe ?? null);
  const servings = props.servings !== undefined ? props.servings : (recipesCtx.cookingModeRecipe?.servings ?? 2);

  const onClose = props.onClose ?? (() => {
    recipesCtx.setCookingModeRecipe(null);
    recipesCtx.setIsCookingMinimized(false);
    recipesCtx.setCookingCurrentStep(0);
  });

  const onMinimize = props.onMinimize ?? (() => {
    recipesCtx.setIsCookingMinimized(true);
    toastCtx.showToast('Kochmodus minimiert – Timer & Fortschritt laufen in der Leiste unten weiter.');
  });

  const onFinishCooking = props.onFinishCooking ?? (() => {
    if (recipesCtx.cookingModeRecipe) {
      recipesCtx.logCooked(recipesCtx.cookingModeRecipe.recipe, recipesCtx.cookingModeRecipe.servings);
      recipesCtx.setCookingModeRecipe(null);
      recipesCtx.setIsCookingMinimized(false);
      recipesCtx.setCookingCurrentStep(0);
      toastCtx.showToast('🎉 Bravo! Dein Gericht wurde als gekocht in deiner Statistik gespeichert!');
    }
  });

  const cookingTimer = props.cookingTimer !== undefined ? props.cookingTimer : recipesCtx.cookingTimer;
  const onUpdateTimer = props.onUpdateTimer ?? recipesCtx.setCookingTimer;

  if (!recipe) return null;

  // Local navigation & modal states
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => recipesCtx.cookingCurrentStep || 0);
  const [showIngredientsModal, setShowIngredientsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [activeStepImageIndex, setActiveStepImageIndex] = useState<number>(0);
  const [stepCheckedIngredients, setStepCheckedIngredients] = useState<Record<string, boolean>>({});
  const [fullCheckedIngredients, setFullCheckedIngredients] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [dismissedTimer, setDismissedTimer] = useState<Record<number, boolean>>({});

  // Reset active step photo index when step changes
  useEffect(() => {
    setActiveStepImageIndex(0);
  }, [currentStepIndex]);

  // Synchronize current step index to global context
  useEffect(() => {
    recipesCtx.setCookingCurrentStep(currentStepIndex);
  }, [currentStepIndex]);

  // Screen Wake Lock API to prevent countertop sleep
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('WakeLock not supported or access denied:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        try {
          wakeLockSentinel.release();
        } catch {}
        wakeLockSentinel = null;
      }
    };
  }, []);

  // Lock body scroll while fullscreen cooking mode is active
  useLockBodyScroll(Boolean(recipe));

  // Current normalized step object
  const rawStep = recipe.steps[currentStepIndex];
  const currentStep: RecipeStep = typeof rawStep === 'string'
    ? { stepNumber: currentStepIndex + 1, title: `Schritt ${currentStepIndex + 1}`, text: rawStep }
    : rawStep;

  // Step-specific ingredients
  const stepIngredients = useMemo(
    () => getStepSpecificIngredients(currentStep.text, recipe.ingredients),
    [currentStep.text, recipe.ingredients]
  );

  // Culinary pro-tip for this step
  const stepTip = useMemo(
    () => getStepProTip(currentStep.text, recipe, currentStepIndex),
    [currentStep.text, recipe, currentStepIndex]
  );

  // Photos for current step
  const stepImages = currentStep.stepImages || [];

  // Duration in minutes (either configured or inferred from text)
  const inferredMinutes = useMemo(
    () => currentStep.timerMinutes || extractMinutesFromText(currentStep.text),
    [currentStep.timerMinutes, currentStep.text]
  );

  // Timer association for this specific step
  const isTimerForThisStep = Boolean(
    cookingTimer &&
    cookingTimer.recipeId === recipe.id &&
    cookingTimer.stepNumber === currentStepIndex + 1
  );

  // Background timer running for another step
  const isTimerRunningForOtherStep = Boolean(
    cookingTimer &&
    cookingTimer.recipeId === recipe.id &&
    cookingTimer.stepNumber !== currentStepIndex + 1 &&
    cookingTimer.isRunning &&
    cookingTimer.secondsLeft > 0
  );

  const isTimerRunning = isTimerForThisStep ? (cookingTimer?.isRunning || false) : false;
  const isStepTimerDismissed = Boolean(dismissedTimer[currentStepIndex]);

  const timerSecondsLeft = isTimerForThisStep
    ? (cookingTimer?.secondsLeft ?? (inferredMinutes > 0 ? inferredMinutes * 60 : 300))
    : (inferredMinutes > 0 ? inferredMinutes * 60 : 300);

  const timerTotalSeconds = isTimerForThisStep
    ? (cookingTimer?.totalSeconds ?? (inferredMinutes > 0 ? inferredMinutes * 60 : 300))
    : (inferredMinutes > 0 ? inferredMinutes * 60 : 300);

  const timerProgress = timerTotalSeconds > 0
    ? Math.max(0, Math.min(100, Math.round(((timerTotalSeconds - timerSecondsLeft) / timerTotalSeconds) * 100)))
    : 0;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modal or lightbox is open
      if (showIngredientsModal || showExitConfirm || lightboxImage) return;

      if (e.key === 'ArrowRight') {
        if (currentStepIndex < recipe.steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, recipe.steps.length, showIngredientsModal, showExitConfirm, lightboxImage, isTimerRunning]);

  const handleStartTimer = () => {
    setDismissedTimer((prev) => ({ ...prev, [currentStepIndex]: false }));
    if (isTimerForThisStep && cookingTimer) {
      onUpdateTimer({
        ...cookingTimer,
        isRunning: true,
      });
    } else {
      const initSecs = (inferredMinutes > 0 ? inferredMinutes : 5) * 60;
      onUpdateTimer({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: currentStepIndex + 1,
        stepTitle: currentStep.title || `Schritt ${currentStepIndex + 1}`,
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
    const initSecs = (inferredMinutes > 0 ? inferredMinutes : 5) * 60;
    if (isTimerForThisStep && cookingTimer) {
      onUpdateTimer({
        ...cookingTimer,
        secondsLeft: initSecs,
        totalSeconds: initSecs,
        isRunning: false,
      });
    } else {
      onUpdateTimer(null);
    }
  };

  const handleDeleteTimer = () => {
    onUpdateTimer(null);
    setDismissedTimer((prev) => ({ ...prev, [currentStepIndex]: true }));
  };

  const handleAdjustTimer = (diffSeconds: number) => {
    setDismissedTimer((prev) => ({ ...prev, [currentStepIndex]: false }));
    if (isTimerForThisStep && cookingTimer) {
      const newSec = Math.max(0, cookingTimer.secondsLeft + diffSeconds);
      onUpdateTimer({
        ...cookingTimer,
        secondsLeft: newSec,
        totalSeconds: Math.max(cookingTimer.totalSeconds, newSec),
      });
    } else {
      const baseSec = (inferredMinutes > 0 ? inferredMinutes : 5) * 60;
      const initSec = Math.max(0, baseSec + diffSeconds);
      onUpdateTimer({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: currentStepIndex + 1,
        stepTitle: currentStep.title || `Schritt ${currentStepIndex + 1}`,
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
      import('canvas-confetti')
        .then((module) => {
          const confetti = module.default;
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        })
        .catch(() => {});
      onFinishCooking();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Exit trigger with timer confirmation check
  const handleRequestClose = () => {
    if (isTimerRunning && timerSecondsLeft > 0) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    if (cookingTimer) {
      onUpdateTimer(null);
    }
    setShowExitConfirm(false);
    onClose();
  };

  const toggleStepIngredient = (name: string) => {
    setStepCheckedIngredients((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleFullIngredient = (name: string) => {
    setFullCheckedIngredients((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const totalStepsCount = recipe.steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalStepsCount) * 100);
  const isLastStep = currentStepIndex === totalStepsCount - 1;

  const showTimerSection = !isStepTimerDismissed && (inferredMinutes > 0 || isTimerForThisStep);

  return (
    <div 
      id="cooking-mode-overlay"
      className="fixed inset-0 z-60 bg-[#2D3E40] text-white flex flex-col justify-between animate-in fade-in duration-200 overscroll-contain select-none"
    >
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION & PROGRESS HEADER                                      */}
      {/* ========================================================================= */}
      <header className="shrink-0 bg-[#243335] border-b border-white/10 relative z-10">
        {/* Thin Linear Step Progress Bar at the very top */}
        <div className="w-full bg-white/10 h-1 sm:h-1.5 overflow-hidden">
          <div
            className="bg-[#4A7856] h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Recipe Name & Progress Counter */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#4A7856] flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#8DB898] uppercase tracking-wider">
                  Schritt {currentStepIndex + 1} von {totalStepsCount}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">
                  {servings} Port.
                </span>
                <span 
                  className="w-2 h-2 rounded-full bg-[#4A7856] animate-pulse shrink-0 hidden xs:inline-block" 
                  title="WakeLock aktiv: Display bleibt an" 
                />
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[170px] xs:max-w-xs sm:max-w-md lg:max-w-lg leading-tight">
                {recipe.title}
              </h1>
            </div>
          </div>

          {/* Right: Three Compact Utility Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Full Recipe Ingredient Overview Trigger */}
            <button
              id="cooking-mode-ingredients-btn"
              type="button"
              onClick={() => setShowIngredientsModal(true)}
              className="h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-95 text-xs font-semibold"
              title="Alle Zutaten des Rezepts ansehen"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5 text-[#8DB898]" />
              <span className="hidden sm:inline">Zutaten</span>
            </button>

            {/* 2. Minimize Mode Button */}
            <button
              id="cooking-mode-minimize-btn"
              type="button"
              onClick={onMinimize}
              className="h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-95 text-xs font-semibold"
              title="Kochmodus minimieren (bleibt in der Leiste unten aktiv)"
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Minimieren</span>
            </button>

            {/* 3. Exit/Dismiss Cooking Mode Button */}
            <button
              id="cooking-mode-close-btn"
              type="button"
              onClick={handleRequestClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/90 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95"
              title="Kochmodus beenden"
            >
              <X className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN GLANCEABLE CONTENT AREA                                             */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto space-y-4 sm:space-y-6">
        
        {/* Background Timer Notification for ANOTHER Step (if running concurrently) */}
        {isTimerRunningForOtherStep && cookingTimer && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-100 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse shrink-0" />
              <span className="truncate">
                Timer läuft für Schritt {cookingTimer.stepNumber}: <strong className="font-mono font-bold text-white">{formatTime(cookingTimer.secondsLeft)}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStepIndex(cookingTimer.stepNumber - 1)}
              className="px-3 py-1.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer touch-manipulation active:scale-95"
            >
              Zu Schritt {cookingTimer.stepNumber} springen
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STEP MEDIA (CONDITIONAL)                                              */}
        {/* ========================================================================= */}
        {stepImages.length > 0 && (
          <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-black/40 group max-h-52 sm:max-h-72 transition-all">
            <img
              src={stepImages[activeStepImageIndex] || stepImages[0]}
              alt={currentStep.title || `Schritt ${currentStepIndex + 1}`}
              className="w-full h-44 sm:h-64 object-cover object-center cursor-zoom-in"
              onClick={() => setLightboxImage(stepImages[activeStepImageIndex] || stepImages[0])}
            />

            {/* Click to Zoom Overlay Badge */}
            <button
              type="button"
              onClick={() => setLightboxImage(stepImages[activeStepImageIndex] || stepImages[0])}
              className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md text-white/90 hover:text-white transition-all cursor-pointer"
              title="Großansicht öffnen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Multiple Images Carousel Navigation */}
            {stepImages.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStepImageIndex((prev) => (prev > 0 ? prev - 1 : stepImages.length - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dot Indicators */}
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {stepImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStepImageIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        idx === activeStepImageIndex ? 'bg-[#4A7856] w-4' : 'bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStepImageIndex((prev) => (prev < stepImages.length - 1 ? prev + 1 : 0));
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CONTEXTUAL STEP INGREDIENTS CARD (HIGH PRIORITY)                       */}
        {/* ========================================================================= */}
        {stepIngredients.length > 0 && (
          <section 
            id="cooking-step-ingredients-card"
            className="p-3.5 sm:p-4 bg-[#243335] border border-white/10 rounded-2xl shadow-md space-y-2.5"
            aria-label="Zutaten für diesen Schritt"
          >
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="font-semibold uppercase tracking-wider text-[#8DB898] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8DB898]" />
                Zutaten für diesen Schritt ({stepIngredients.length})
              </span>
              <span className="text-[11px] text-white/50 hidden xs:inline">
                Tippe zum Abhaken
              </span>
            </div>

            {/* Horizontal Scrollable / Responsive Chip Bar */}
            <div className="flex flex-wrap gap-2">
              {stepIngredients.map((ing) => {
                const isChecked = Boolean(stepCheckedIngredients[ing.name]);
                const amountFormatted = formatIngredientAmount(ing, recipe.servings, servings);

                return (
                  <button
                    key={ing.name}
                    type="button"
                    onClick={() => toggleStepIngredient(ing.name)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 border ${
                      isChecked
                        ? 'bg-white/5 border-white/10 text-white/40 line-through'
                        : 'bg-[#2D3E40] border-white/15 text-white hover:border-[#4A7856] hover:bg-[#344749]'
                    }`}
                    title={isChecked ? `${ing.name} als offen markieren` : `${ing.name} als hinzugefügt abhaken`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                      isChecked ? 'bg-[#4A7856] border-[#4A7856] text-white' : 'border-white/30 bg-white/5'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className={isChecked ? 'text-white/40' : 'text-[#8DB898] font-mono font-bold'}>
                      {amountFormatted}
                    </span>

                    <span className="truncate">
                      {ing.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. CORE INSTRUCTION & TIP AREA (GLANCEABLE TYPOGRAPHY)                     */}
        {/* ========================================================================= */}
        <section className="space-y-3 sm:space-y-4">
          {/* Step Title (if defined) */}
          {currentStep.title && (
            <h2 className="text-base sm:text-xl font-bold text-[#8DB898]">
              {currentStep.title}
            </h2>
          )}

          {/* Primary Step Instruction in Large, High-Contrast Typography */}
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-relaxed tracking-normal text-white drop-shadow-xs">
            {currentStep.text}
          </div>

          {/* Integrated Pro-Tip Callout (Conditional) */}
          {stepTip && (
            <aside 
              id="cooking-step-pro-tip"
              className="p-4 sm:p-5 rounded-2xl bg-[#1E2D27] border border-[#4A7856]/40 text-[#D1E7D7] shadow-md flex items-start gap-3.5 animate-in fade-in"
            >
              <div className="p-2 rounded-xl bg-[#4A7856]/30 text-[#8DB898] shrink-0 mt-0.5">
                <Lightbulb className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200">
                  Profi-Tipp vom Küchenchef
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-white/95">
                  {stepTip}
                </p>
              </div>
            </aside>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 4. KITCHEN TIMER INTEGRATION                                             */}
        {/* ========================================================================= */}
        {showTimerSection ? (
          <section 
            id="cooking-step-timer-module"
            className="p-4 sm:p-6 bg-[#243335] border border-white/10 rounded-2xl sm:rounded-3xl shadow-xl space-y-4"
            aria-label="Küchen-Timer für diesen Schritt"
          >
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="font-semibold uppercase tracking-wider text-[#8DB898] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8DB898]" />
                Küchen-Timer • Schritt {currentStepIndex + 1}
              </span>
              <button
                type="button"
                onClick={handleDeleteTimer}
                className="text-white/40 hover:text-rose-300 transition-colors p-1"
                title="Timer für diesen Schritt ausblenden"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Big Digital Readout & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-md transition-all shrink-0 ${
                  timerSecondsLeft === 0
                    ? 'bg-amber-500 animate-bounce'
                    : isTimerRunning
                    ? 'bg-[#4A7856] animate-pulse'
                    : 'bg-white/10 text-white/70'
                }`}>
                  <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <div>
                  <div className="font-mono text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-widest leading-none">
                    {timerSecondsLeft === 0 ? 'FERTIG!' : formatTime(timerSecondsLeft)}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {timerSecondsLeft === 0
                      ? 'Garzeit erreicht 🎉'
                      : isTimerRunning
                      ? 'Timer läuft...'
                      : 'Pausiert'}
                  </div>
                </div>
              </div>

              {/* Primary Controls Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Adjust -1 Min */}
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-60)}
                  className="h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95"
                  title="1 Minute abziehen"
                >
                  <Minus className="w-5 h-5" />
                </button>

                {/* Primary Play/Pause Toggle */}
                <button
                  id="cooking-mode-timer-toggle-btn"
                  type="button"
                  onClick={isTimerRunning ? handlePauseTimer : handleStartTimer}
                  className={`h-12 px-6 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 shadow-md text-base ${
                    isTimerRunning
                      ? 'bg-[#D35400] hover:bg-[#B94600] text-white'
                      : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
                  }`}
                  title={isTimerRunning ? 'Timer pausieren' : 'Timer starten'}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Starten</span>
                    </>
                  )}
                </button>

                {/* Adjust +1 Min */}
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(60)}
                  className="h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95"
                  title="1 Minute hinzufügen"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95"
                  title="Timer zurücksetzen"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Circular / Linear Progress Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  timerSecondsLeft === 0 ? 'bg-amber-400' : 'bg-[#4A7856]'
                }`}
                style={{ width: `${timerProgress}%` }}
              />
            </div>
          </section>
        ) : (
          /* Subtle trigger to manually add/start a timer if none configured */
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setDismissedTimer((prev) => ({ ...prev, [currentStepIndex]: false }));
                handleStartTimer();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <Clock className="w-4 h-4 text-[#8DB898]" />
              <span>Timer für diesen Schritt starten (5 Min.)</span>
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 5. BOTTOM NAVIGATION BAR                                                  */}
      {/* ========================================================================= */}
      <footer className="shrink-0 p-3.5 sm:p-5 bg-[#243335] border-t border-white/10 flex items-center justify-between gap-3">
        {/* Left: Large [ < Zurück ] Button (Disabled on step 1) */}
        <button
          id="cooking-mode-prev-btn"
          type="button"
          disabled={currentStepIndex === 0}
          onClick={handlePrev}
          className="h-12 sm:h-14 px-5 sm:px-7 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-25 disabled:pointer-events-none text-white font-bold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Zurück</span>
        </button>

        {/* Center: Subtle Step Indicator (e.g., 1 / 6) */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs sm:text-sm font-bold text-white/80">
            {currentStepIndex + 1} / {totalStepsCount}
          </span>
          {/* Subtle Visual Step Dots */}
          <div className="flex gap-1 mt-1 hidden xs:flex">
            {recipe.steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'bg-[#8DB898] w-3'
                    : idx < currentStepIndex
                    ? 'bg-[#4A7856]'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right: Prominent Full-Height Primary CTA [ Weiter > ] */}
        <button
          id="cooking-mode-next-btn"
          type="button"
          onClick={handleNext}
          className={`h-12 sm:h-14 px-6 sm:px-9 rounded-2xl font-bold text-base sm:text-lg flex items-center gap-2 shadow-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${
            isLastStep
              ? 'bg-[#4A7856] hover:bg-[#3D6447] text-white shadow-[#4A7856]/30 animate-pulse'
              : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
          }`}
        >
          <span>{isLastStep ? 'Rezept fertiggestellt 🎉' : 'Weiter'}</span>
          {!isLastStep && <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </footer>

      {/* ========================================================================= */}
      {/* FULL RECIPE INGREDIENTS OVERVIEW MODAL                                    */}
      {/* ========================================================================= */}
      {showIngredientsModal && (
        <div 
          className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setShowIngredientsModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#243335] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[85vh] text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4A7856] flex items-center justify-center text-white">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Alle Zutaten
                  </h3>
                  <p className="text-xs text-[#8DB898] font-semibold">
                    Berechnet für {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIngredientsModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2 divide-y divide-white/5">
              {recipe.ingredients.map((ing) => {
                const isChecked = Boolean(fullCheckedIngredients[ing.name]);
                const formatted = formatIngredientAmount(ing, recipe.servings, servings);

                return (
                  <div
                    key={ing.name}
                    onClick={() => toggleFullIngredient(ing.name)}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors cursor-pointer touch-manipulation ${
                      isChecked ? 'bg-white/5 text-white/40' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isChecked ? 'bg-[#4A7856] border-[#4A7856] text-white' : 'border-white/30 bg-white/5'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-sm ${isChecked ? 'line-through text-white/40' : 'text-white/90'}`}>
                        {ing.name}
                      </span>
                    </div>

                    <span className={`text-sm font-mono font-bold ${isChecked ? 'text-white/40' : 'text-[#8DB898]'}`}>
                      {formatted}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowIngredientsModal(false)}
                className="w-full h-12 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-sm transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                Zurück zum Kochmodus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXIT CONFIRMATION DIALOG (IF TIMER RUNNING)                               */}
      {/* ========================================================================= */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="w-full max-w-md bg-[#243335] border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                Aktiver Küchen-Timer läuft noch!
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Für diesen Schritt läuft noch ein aktiver Timer mit{' '}
                <strong className="text-amber-300 font-mono font-bold">{formatTime(timerSecondsLeft)}</strong> verbleibender Zeit.
                Möchtest du den Kochmodus wirklich verlassen? Der Timer wird dabei gestoppt.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                Weiterkochen
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                Kochmodus beenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP PHOTO LIGHTBOX MODAL                                                 */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-80 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Großansicht"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default CookingModeModal;
