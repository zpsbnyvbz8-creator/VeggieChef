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

// Descriptor, adjective, and unit stop-words that should never trigger an ingredient match on their own
const INGREDIENT_STOP_WORDS = new Set([
  'vegan', 'vegane', 'veganer', 'veganes', 'veganen',
  'vegetarisch', 'vegetarische', 'vegetarischer',
  'bio', 'frisch', 'frische', 'frischer', 'frischem', 'frischen',
  'groß', 'große', 'großer', 'großes', 'großen',
  'klein', 'kleine', 'kleiner', 'kleines', 'kleinen',
  'getrocknet', 'getrocknete', 'getrockneter', 'getrocknetes', 'getrockneten',
  'gemahlen', 'gemahlene', 'gemahlener', 'gemahlenes',
  'fein', 'feine', 'feiner', 'feines', 'feinen',
  'gehackt', 'gehackte', 'gehackter', 'gehacktes', 'gehackten', 'feingehackt', 'feingehackten', 'grobgehackt', 'grobgehackten',
  'gerieben', 'geriebene', 'geriebener', 'geriebenes',
  'kaltgepresst', 'nativ', 'extra', 'raffiniert',
  'pflanzlich', 'pflanzliche', 'pflanzlicher', 'pflanzliches', 'pflanzlichen',
  'scheiben', 'streifen', 'würfel', 'ringe', 'stk', 'stück', 'dose', 'dosen',
  'glas', 'gläser', 'bund', 'packung', 'prise', 'prisen', 'el', 'tl', 'gramm', 'kg', 'ml', 'l',
  'basis', 'ersatz', 'art', 'typ', 'nach', 'geschmack', 'bedarf', 'etwas', 'oder', 'und', 'mit', 'zum', 'zur', 'für',
  'z.b', 'zb', 'z.b.', 'beispiel', 'grob', 'grober', 'grobes', 'feines', 'feinem'
]);

/**
 * Intelligent helper to extract ONLY ingredients explicitly used in the active step.
 */
function getStepSpecificIngredients(stepText: string, ingredients: RecipeIngredient[]): RecipeIngredient[] {
  if (!stepText || !ingredients || ingredients.length === 0) return [];
  const text = stepText.toLowerCase();

  return ingredients.filter((ing) => {
    if (!ing.name) return false;

    // Clean name from parentheticals and amounts
    const rawClean = ing.name
      .replace(/\(.*?\)/g, '')
      .replace(/[\d/½¼¾,.]+/g, '')
      .trim()
      .toLowerCase();

    if (!rawClean) return false;

    // Split compound items like "Trüffelöl & Senf" or "Butter oder Rapsöl"
    const subParts = rawClean
      .split(/\s+(?:&|\/|oder|plus)\s+/)
      .flatMap((p) => p.split(/\s*&\s*/));

    for (const part of subParts) {
      const words = part
        .split(/[\s,.-]+/)
        .filter((w) => w.length >= 2 && !INGREDIENT_STOP_WORDS.has(w));

      for (const word of words) {
        // Strict boundary: "Hack" (meat substitute) must NOT match "feingehackt", "gehackt", etc.
        if (word === 'hack' || word === 'hackfleisch' || word === 'hackbällchen') {
          if (
            /(?<!(?:feinge|grobge|ge|zer))hack(?:fleisch|bällchen|masse)?(?!t|en)\b/i.test(text) ||
            /\b(?:patty|patties)\b/i.test(text)
          ) {
            return true;
          }
          continue;
        }

        // Mayo / Mayonnaise
        if (word === 'mayo' || word === 'mayonnaise') {
          if (/(?:mayo|mayonnaise)/i.test(text)) return true;
          continue;
        }

        // Mustard
        if (word === 'senf') {
          if (/\bsenf\b/i.test(text)) return true;
          continue;
        }

        // Pickles / Pickled cucumbers
        if (word.includes('gurke')) {
          if (/(?:gurke|gurken|gewürzgurke|essiggurke)/i.test(text)) return true;
          continue;
        }

        // Buns / Burger buns
        if (word === 'bun' || word === 'buns' || word === 'burger') {
          if (/(?:bun|buns|burger-?brötchen|brötchen)/i.test(text)) return true;
          continue;
        }

        // Cheese / Cheddar
        if (word === 'käse' || word === 'cheddar' || word === 'schmelzkäse') {
          if (/(?:käse|cheddar|schmelzkäse|parmesan|mozzarella|gouda|feta)/i.test(text)) return true;
          continue;
        }

        // Onions
        if (word.startsWith('zwiebel')) {
          if (/(?:zwiebel|schalotte|schmorzwiebel)/i.test(text)) return true;
          continue;
        }

        // Specific oils vs generic cooking oil
        if (word === 'trüffelöl') {
          if (text.includes('trüffel')) return true;
          continue;
        }
        if (word === 'sesamöl') {
          if (text.includes('sesam')) return true;
          continue;
        }
        if (word === 'öl' || word === 'rapsöl' || word === 'olivenöl' || word === 'bratöl' || word === 'speiseöl') {
          if (/(?<!(?:ess|tee|essl|teel))öl(?:e|en)?\b|olivenöl|rapsöl|bratöl|pflanzenöl/i.test(text)) return true;
          continue;
        }

        // Butter
        if (word === 'butter') {
          if (/\bbutter\b/i.test(text)) return true;
          continue;
        }

        // Salt / Pepper
        if (word === 'salz') {
          if (/\bsalz(?:en)?\b/i.test(text)) return true;
          continue;
        }
        if (word === 'pfeffer') {
          if (/\bpfeffer(?:n)?\b/i.test(text)) return true;
          continue;
        }

        // Garlic
        if (word.startsWith('knoblauch')) {
          if (/(?:knoblauch|zehe)/i.test(text)) return true;
          continue;
        }

        // Broth
        if (word.startsWith('brühe')) {
          if (/(?:brühe|gemüsebrühe|fond|ablöschen)/i.test(text)) return true;
          continue;
        }

        // Pasta / Noodles
        if (word === 'pasta' || word === 'nudeln' || word === 'spaghetti') {
          if (/(?:nudel|pasta|spaghetti|penne|tagliatelle)/i.test(text)) return true;
          continue;
        }

        // Lemons / Limes
        if (word.startsWith('zitrone')) {
          if (/(?:zitrone|zitronensaft)/i.test(text)) return true;
          continue;
        }
        if (word.startsWith('limette')) {
          if (/(?:limette|limettensaft)/i.test(text)) return true;
          continue;
        }

        // Generic German stem matching for non-stop words (with word boundary)
        const stem = word.replace(/(n|en|e|s|es)$/, '');
        if (stem.length >= 3) {
          const regex = new RegExp('\\b' + stem, 'i');
          if (regex.test(text)) return true;
        }
      }
    }

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
      className="fixed inset-0 z-60 bg-[#57534d] text-white flex flex-col justify-between animate-in fade-in duration-200 overscroll-contain select-none"
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#8DB898] uppercase tracking-wider">
                  Schritt {currentStepIndex + 1} von {totalStepsCount}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">
                  {servings} Port.
                </span>

                {/* Streamlined Slim Background Timer Status Chip */}
                {isTimerRunningForOtherStep && cookingTimer && (
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(cookingTimer.stepNumber - 1)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 animate-pulse"
                    title={`Zu Schritt ${cookingTimer.stepNumber} wechseln`}
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Schritt {cookingTimer.stepNumber}: <strong className="font-mono">{formatTime(cookingTimer.secondsLeft)}</strong></span>
                  </button>
                )}

                <span 
                  className="w-2 h-2 rounded-full bg-[#4A7856] animate-pulse shrink-0 hidden xs:inline-block" 
                  title="WakeLock aktiv: Display bleibt an" 
                />
              </div>
              <h1 className="text-base font-bold text-white truncate max-w-[170px] xs:max-w-xs sm:max-w-md lg:max-w-lg leading-tight">
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
      {/* MAIN GLANCEABLE CONTENT AREA - FLAT, SPACIOUS & DISTRACTION-FREE           */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto flex flex-col justify-center space-y-6 sm:space-y-8">
        
        {/* ========================================================================= */}
        {/* 2. CLEAN STEP INGREDIENTS ROW (SMALL, GLANCEABLE BADGES)                  */}
        {/* ========================================================================= */}
        {stepIngredients.length > 0 && (
          <div 
            id="cooking-step-ingredients"
            className="flex flex-wrap items-center gap-2"
            aria-label="Zutaten für diesen Schritt"
          >
            {stepIngredients.map((ing) => {
              const amountFormatted = formatIngredientAmount(ing, recipe.servings, servings);
              return (
                <span
                  key={ing.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm font-medium text-white/95"
                >
                  <span className="font-bold font-mono text-[#8DB898]">
                    {amountFormatted}
                  </span>
                  <span>{ing.name}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PRIMARY INSTRUCTION HEADER & TEXT (CLEAR VISUAL HERO)                 */}
        {/* ========================================================================= */}
        <section className="space-y-3 sm:space-y-4">
          {currentStep.title && (
            <h2 className="text-base font-bold uppercase tracking-wider text-[#8DB898]">
              {currentStep.title}
            </h2>
          )}

          {/* Primary Step Instruction in Large, High-Contrast Typography free of Enclosing Box Borders */}
          <div className="text-4xl font-bold leading-relaxed text-white tracking-normal select-text">
            {currentStep.text}
          </div>

          {/* Integrated Culinary Pro-Tip (Understated callout, no heavy card) */}
          {stepTip && (
            <div className="pt-2 flex items-start gap-2.5 text-sm text-emerald-200/90 font-medium">
              <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-amber-200 font-semibold">Tipp: </strong>
                {stepTip}
              </p>
            </div>
          )}

          {/* Step Photo (Conditional, clean & unboxed) */}
          {stepImages.length > 0 && (
            <div className="pt-2">
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 relative bg-black/40 max-h-52 sm:max-h-72">
                <img
                  src={stepImages[activeStepImageIndex] || stepImages[0]}
                  alt={currentStep.title || `Schritt ${currentStepIndex + 1}`}
                  className="w-full h-44 sm:h-64 object-cover object-center cursor-zoom-in"
                  onClick={() => setLightboxImage(stepImages[activeStepImageIndex] || stepImages[0])}
                />
                <button
                  type="button"
                  onClick={() => setLightboxImage(stepImages[activeStepImageIndex] || stepImages[0])}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md text-white/90 hover:text-white transition-all cursor-pointer"
                  title="Großansicht öffnen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 4. COMPACT INLINE TIMER (NO HEAVY CONTAINER CARD)                         */}
        {/* ========================================================================= */}
        {showTimerSection ? (
          <div 
            id="cooking-step-timer-inline"
            className="pt-4 sm:pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4"
            aria-label="Küchen-Timer für diesen Schritt"
          >
            {/* Left: Large Digital Countdown */}
            <div className="flex items-center gap-3.5">
              <Clock className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${
                timerSecondsLeft === 0
                  ? 'text-amber-400 animate-bounce'
                  : isTimerRunning
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-white/40'
              }`} />
              <div>
                <div className="font-mono text-5xl font-black text-white tracking-widest leading-none">
                  {timerSecondsLeft === 0 ? 'FERTIG!' : formatTime(timerSecondsLeft)}
                </div>
                <div className="text-[11px] text-white/50 mt-1 font-medium">
                  {timerSecondsLeft === 0
                    ? 'Garzeit erreicht 🎉'
                    : isTimerRunning
                    ? 'Timer läuft...'
                    : 'Pausiert'}
                </div>
              </div>
            </div>

            {/* Right: Inline Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleAdjustTimer(-60)}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="1 Minute abziehen"
              >
                -1m
              </button>

              {/* Prominent Play/Pause Toggle */}
              <button
                id="cooking-mode-timer-toggle-btn"
                type="button"
                onClick={isTimerRunning ? handlePauseTimer : handleStartTimer}
                className={`h-11 px-5 sm:px-6 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 text-sm shadow-sm ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
                }`}
                title={isTimerRunning ? 'Timer pausieren' : 'Timer starten'}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAdjustTimer(60)}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="1 Minute hinzufügen"
              >
                +1m
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 ml-1"
                title="Timer zurücksetzen"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Subtle text trigger to add a timer if desired */
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setDismissedTimer((prev) => ({ ...prev, [currentStepIndex]: false }));
                handleStartTimer();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[#8DB898] transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
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
          className="h-12 sm:h-14 px-5 sm:px-7 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-25 disabled:pointer-events-none text-white font-bold text-base flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Zurück</span>
        </button>

        {/* Center: Subtle Step Indicator (e.g., 1 / 6) */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-white/80">
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
          className={`h-12 sm:h-14 px-6 sm:px-9 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${
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
                  <h3 className="text-lg font-bold text-white">
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
              <h3 className="text-xl font-bold text-white">
                Aktiver Küchen-Timer läuft noch!
              </h3>
              <p className="text-[16px] text-white/90 leading-relaxed">
                Für diesen Schritt läuft noch ein aktiver Timer mit{' '}
                <strong className="text-amber-300 font-mono font-bold">{formatTime(timerSecondsLeft)}</strong> verbleibender Zeit.
                Möchtest du den Kochmodus wirklich verlassen? Der Timer wird dabei gestoppt.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-[16px] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Weiterkochen
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[16px] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
