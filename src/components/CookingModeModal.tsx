import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Star,
  Sparkles,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';
import { Recipe, RecipeIngredient, RecipeStep, CookingTimerState } from '../types';
import { formatIngredientAmount, calculateMealSavings } from '../utils/helpers';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

interface CookingModeModalProps {
  recipe?: Recipe | null;
  servings?: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onFinishCooking?: () => void;
  cookingTimer?: CookingTimerState | null;
  onUpdateTimer?: (timer: CookingTimerState | null) => void;
}

interface FloatingTimer {
  id: string;
  label: string;
  stepNumber: number;
  totalSeconds: number;
  secondsLeft: number;
  isRunning: boolean;
}

// Stop-words that should never match an ingredient by itself
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

function getStepSpecificIngredients(stepText: string, ingredients: RecipeIngredient[]): RecipeIngredient[] {
  if (!stepText || !ingredients || ingredients.length === 0) return [];
  const text = stepText.toLowerCase();

  return ingredients.filter((ing) => {
    if (!ing.name) return false;
    const rawClean = ing.name
      .replace(/\(.*?\)/g, '')
      .replace(/[\d/½¼¾,.]+/g, '')
      .trim()
      .toLowerCase();

    if (!rawClean) return false;
    const subParts = rawClean
      .split(/\s+(?:&|\/|oder|plus)\s+/)
      .flatMap((p) => p.split(/\s*&\s*/));

    for (const part of subParts) {
      const words = part
        .split(/[\s,.-]+/)
        .filter((w) => w.length >= 2 && !INGREDIENT_STOP_WORDS.has(w));

      for (const word of words) {
        if (word === 'hack' || word === 'hackfleisch' || word === 'hackbällchen') {
          if (/(?<!(?:feinge|grobge|ge|zer))hack(?:fleisch|bällchen|masse)?(?!t|en)\b/i.test(text) || /\b(?:patty|patties)\b/i.test(text)) return true;
          continue;
        }
        if (word === 'mayo' || word === 'mayonnaise') {
          if (/(?:mayo|mayonnaise)/i.test(text)) return true;
          continue;
        }
        if (word === 'senf') {
          if (/\bsenf\b/i.test(text)) return true;
          continue;
        }
        if (word.includes('gurke')) {
          if (/(?:gurke|gurken|gewürzgurke|essiggurke)/i.test(text)) return true;
          continue;
        }
        if (word === 'bun' || word === 'buns' || word === 'burger') {
          if (/(?:bun|buns|burger-?brötchen|brötchen)/i.test(text)) return true;
          continue;
        }
        if (word === 'käse' || word === 'cheddar' || word === 'schmelzkäse') {
          if (/(?:käse|cheddar|schmelzkäse|parmesan|mozzarella|gouda|feta)/i.test(text)) return true;
          continue;
        }
        if (word.startsWith('zwiebel')) {
          if (/(?:zwiebel|schalotte|schmorzwiebel)/i.test(text)) return true;
          continue;
        }
        if (word === 'öl' || word === 'rapsöl' || word === 'olivenöl' || word === 'bratöl') {
          if (/(?<!(?:ess|tee|essl|teel))öl(?:e|en)?\b|olivenöl|rapsöl|bratöl|pflanzenöl/i.test(text)) return true;
          continue;
        }
        if (word === 'butter') {
          if (/\bbutter\b/i.test(text)) return true;
          continue;
        }
        if (word === 'salz') {
          if (/\bsalz(?:en)?\b/i.test(text)) return true;
          continue;
        }
        if (word === 'pfeffer') {
          if (/\bpfeffer(?:n)?\b/i.test(text)) return true;
          continue;
        }
        if (word.startsWith('knoblauch')) {
          if (/(?:knoblauch|zehe)/i.test(text)) return true;
          continue;
        }
        if (word.startsWith('brühe')) {
          if (/(?:brühe|gemüsebrühe|fond|ablöschen)/i.test(text)) return true;
          continue;
        }
        if (word === 'pasta' || word === 'nudeln' || word === 'spaghetti') {
          if (/(?:nudel|pasta|spaghetti|penne|tagliatelle)/i.test(text)) return true;
          continue;
        }
        if (word.startsWith('zitrone')) {
          if (/(?:zitrone|zitronensaft)/i.test(text)) return true;
          continue;
        }

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
 * Intelligent helper to extract all time mentions from text: "10 Minuten köcheln", "5-8 Min. anbraten", etc.
 */
function parseTimersFromText(text: string): { raw: string; minutes: number }[] {
  if (!text) return [];
  const results: { raw: string; minutes: number }[] = [];
  const regex = /(?:ca\.?\s*)?(\d+)(?:\s*-\s*(\d+))?\s*(minuten|min\b|stunden|std\b|h\b)/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const minVal = parseInt(match[1], 10);
    const maxVal = match[2] ? parseInt(match[2], 10) : minVal;
    const unit = match[3].toLowerCase();

    let minutes = Math.max(minVal, maxVal);
    if (unit.startsWith('std') || unit.startsWith('stunde') || unit === 'h') {
      minutes = minutes * 60;
    }

    if (minutes > 0 && minutes <= 360) {
      results.push({
        raw: match[0].trim(),
        minutes,
      });
    }
  }

  return results;
}

function getStepProTip(stepText: string, recipe: Recipe, stepIndex: number): string | null {
  const inlineTipMatch = stepText.match(/(?:(?:profi[- ]?)?tipp|hinweis)\s*:\s*([^.\n]+(?:\.[^.\n]+)?)/i);
  if (inlineTipMatch && inlineTipMatch[1]) {
    return inlineTipMatch[1].trim();
  }

  if (recipe.chefTip) {
    const stepLower = stepText.toLowerCase();
    const tipLower = recipe.chefTip.toLowerCase();
    const culinaryKeywords = [
      'rösten', 'anbraten', 'köcheln', 'soße', 'sauce', 'tofu', 'nudeln', 'pasta',
      'gewürz', 'abschmecken', 'ofen', 'backen', 'knusprig', 'dünsten', 'marinier',
      'hitze', 'temperatur', 'ruhen lassen'
    ];
    if (culinaryKeywords.some((k) => stepLower.includes(k) && tipLower.includes(k))) {
      return recipe.chefTip;
    }
    if (stepIndex === 0 && (tipLower.includes('vorbereitung') || tipLower.includes('schneiden') || tipLower.includes('marinier'))) {
      return recipe.chefTip;
    }
    if (stepIndex === recipe.steps.length - 1 && (tipLower.includes('servieren') || tipLower.includes('anrichten') || tipLower.includes('garnier') || tipLower.includes('frisch'))) {
      return recipe.chefTip;
    }
  }

  if (recipe.veganVersionTips) {
    const stepLower = stepText.toLowerCase();
    if (stepLower.includes('käse') || stepLower.includes('sahne') || stepLower.includes('butter') || stepLower.includes('milch')) {
      return recipe.veganVersionTips;
    }
  }

  return null;
}

/**
 * Web Audio Synthesizer for Timer completion chime
 */
function playTimerAlarm() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.16);
      osc.stop(ctx.currentTime + idx * 0.16 + 0.4);
    });
  } catch {}
}

export const CookingModeModal: React.FC<CookingModeModalProps> = (props) => {
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const recipe = props.recipe !== undefined ? props.recipe : (recipesCtx.cookingModeRecipe?.recipe ?? null);
  const [currentServings, setCurrentServings] = useState<number>(() => props.servings !== undefined ? props.servings : (recipesCtx.cookingModeRecipe?.servings ?? 2));

  // Step indices: -1 represents the Mise-en-Place checklist, 0..N-1 are recipe steps, N represents completion screen
  const [stepPhase, setStepPhase] = useState<'prep' | 'steps' | 'finished'>('prep');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => recipesCtx.cookingCurrentStep || 0);

  // Mise-en-Place checklist states
  const [prepChecks, setPrepChecks] = useState<Record<string, boolean>>({});
  const [utensilChecks, setUtensilChecks] = useState<Record<string, boolean>>({
    'Messer & Schneidebrett': false,
    'Topf oder Pfanne auf dem Herd': false,
    'Schüsseln & Kochbesteck': false,
  });

  // Multiple floating timers
  const [floatingTimers, setFloatingTimers] = useState<FloatingTimer[]>([]);

  // Completion view states (Rating, Photo, Notes)
  const [rating, setRating] = useState<number>(5);
  const [cookedNotes, setCookedNotes] = useState<string>('');
  const [cookedPhotoUrl, setCookedPhotoUrl] = useState<string | null>(null);

  // Utility modals
  const [showIngredientsModal, setShowIngredientsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

  // Speech Recognition (Voice Commands) & Text-to-Speech
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const onClose = props.onClose ?? (() => {
    recipesCtx.setCookingModeRecipe(null);
    recipesCtx.setIsCookingMinimized(false);
    recipesCtx.setCookingCurrentStep(0);
  });

  const onMinimize = props.onMinimize ?? (() => {
    recipesCtx.setIsCookingMinimized(true);
    toastCtx.showToast('Kochmodus minimiert – Timer & Fortschritt laufen in der Leiste unten weiter.');
  });

  // Screen WakeLock to keep screen on while cooking
  useEffect(() => {
    let sentinel: any = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          sentinel = await (navigator as any).wakeLock.request('screen');
          setIsWakeLockActive(true);
        }
      } catch (err) {
        console.warn('Screen WakeLock error:', err);
      }
    };

    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinel) {
        try {
          sentinel.release();
        } catch {}
      }
    };
  }, []);

  useLockBodyScroll(Boolean(recipe));

  // Synchronize step index to context
  useEffect(() => {
    recipesCtx.setCookingCurrentStep(currentStepIndex);
  }, [currentStepIndex]);

  // Synchronize primary running timer to global CookingTimerState so minimized bar works
  useEffect(() => {
    if (!recipe) return;
    const primaryTimer = floatingTimers.find((t) => t.isRunning) || floatingTimers[0];
    if (primaryTimer) {
      recipesCtx.setCookingTimer({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: primaryTimer.stepNumber,
        stepTitle: primaryTimer.label,
        totalSeconds: primaryTimer.totalSeconds,
        secondsLeft: primaryTimer.secondsLeft,
        isRunning: primaryTimer.isRunning,
      });
    } else {
      recipesCtx.setCookingTimer(null);
    }
  }, [floatingTimers, recipe]);

  // Multitimer tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      setFloatingTimers((prev) => {
        let hasChanges = false;
        const next = prev.map((timer) => {
          if (!timer.isRunning || timer.secondsLeft <= 0) return timer;
          hasChanges = true;
          const updated = timer.secondsLeft - 1;
          if (updated === 0) {
            playTimerAlarm();
            toastCtx.showToast(`🔔 Timer für "${timer.label}" ist abgelaufen!`);
          }
          return {
            ...timer,
            secondsLeft: Math.max(0, updated),
            isRunning: updated > 0,
          };
        });
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [toastCtx]);

  // Speech Recognition (Freihändige Sprachsteuerung: "weiter", "zurück", "vorlesen")
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognizer = new SpeechRecognitionClass();
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = 'de-DE';

    recognizer.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();
      setLastVoiceCommand(transcript);

      if (transcript.includes('weiter') || transcript.includes('nächster') || transcript.includes('vor')) {
        handleNextStep();
        toastCtx.showToast('Sprachbefehl: "Weiter" ausgeführt 🎙️');
      } else if (transcript.includes('zurück') || transcript.includes('vorheriger')) {
        handlePrevStep();
        toastCtx.showToast('Sprachbefehl: "Zurück" ausgeführt 🎙️');
      } else if (transcript.includes('vorlesen') || transcript.includes('lesen')) {
        speakCurrentStep();
      } else if (transcript.includes('stopp') || transcript.includes('pause')) {
        setFloatingTimers((prev) => prev.map((t) => ({ ...t, isRunning: false })));
        toastCtx.showToast('Sprachbefehl: "Timer pausiert" 🎙️');
      }
    };

    recognizer.onerror = () => {
      setIsVoiceListening(false);
    };

    recognizer.onend = () => {
      if (isVoiceListening) {
        try {
          recognizer.start();
        } catch {}
      }
    };

    recognitionRef.current = recognizer;

    if (isVoiceListening) {
      try {
        recognizer.start();
      } catch {}
    } else {
      try {
        recognizer.stop();
      } catch {}
    }

    return () => {
      try {
        recognizer.stop();
      } catch {}
    };
  }, [isVoiceListening, stepPhase, currentStepIndex]);

  // Read step aloud via Text-to-Speech (Web Speech Synthesis)
  const speakCurrentStep = () => {
    if (!('speechSynthesis' in window) || !recipe) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const rawStep = recipe.steps[currentStepIndex];
    const textToRead = typeof rawStep === 'string' ? rawStep : `${rawStep.title ? rawStep.title + '. ' : ''}${rawStep.text}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!recipe) return null;

  const rawStep = recipe.steps[currentStepIndex];
  const currentStep: RecipeStep = typeof rawStep === 'string'
    ? { stepNumber: currentStepIndex + 1, title: `Schritt ${currentStepIndex + 1}`, text: rawStep }
    : rawStep;

  // Step-specific ingredients
  const stepIngredients = getStepSpecificIngredients(currentStep?.text || '', recipe.ingredients);
  const stepTip = getStepProTip(currentStep?.text || '', recipe, currentStepIndex);
  const smartTimersInText = parseTimersFromText(currentStep?.text || '');

  // Add a new floating timer
  const handleStartSmartTimer = (minutes: number, label?: string) => {
    const id = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const totalSec = minutes * 60;
    const newTimer: FloatingTimer = {
      id,
      label: label || `${minutes} Min. (Schritt ${currentStepIndex + 1})`,
      stepNumber: currentStepIndex + 1,
      totalSeconds: totalSec,
      secondsLeft: totalSec,
      isRunning: true,
    };
    setFloatingTimers((prev) => [...prev, newTimer]);
    toastCtx.showToast(`⏱️ Timer gestartet: ${minutes} Min.`);
  };

  const handleToggleTimer = (id: string) => {
    setFloatingTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setFloatingTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAdjustTimer = (id: string, diffSeconds: number) => {
    setFloatingTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newSec = Math.max(0, t.secondsLeft + diffSeconds);
        return {
          ...t,
          secondsLeft: newSec,
          totalSeconds: Math.max(t.totalSeconds, newSec),
        };
      })
    );
  };

  const formatTimerDigits = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step navigation
  const handleNextStep = () => {
    if (stepPhase === 'prep') {
      setStepPhase('steps');
      setCurrentStepIndex(0);
      return;
    }
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Finished all steps -> show celebration screen!
      setStepPhase('finished');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#4A7856', '#C86D3B', '#E67E22', '#F1F5F2']
      });
    }
  };

  const handlePrevStep = () => {
    if (stepPhase === 'finished') {
      setStepPhase('steps');
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setStepPhase('prep');
    }
  };

  // Completion logging
  const handleFinishAndSave = () => {
    recipesCtx.logCooked(recipe, currentServings, cookedNotes, rating, cookedPhotoUrl || undefined);
    recipesCtx.setCookingModeRecipe(null);
    recipesCtx.setIsCookingMinimized(false);
    recipesCtx.setCookingCurrentStep(0);
    toastCtx.showToast('🎉 Bravo! Dein Gericht wurde mit Foto & Bewertung in deiner Statistik gespeichert!');
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setCookedPhotoUrl(result);
      toastCtx.showToast('📸 Foto erfolgreich hinzugefügt!');
    };
    reader.readAsDataURL(file);
  };

  const totalStepsCount = recipe.steps.length;
  const progressPercent = stepPhase === 'prep' 
    ? 5 
    : stepPhase === 'finished' 
    ? 100 
    : Math.round(((currentStepIndex + 1) / totalStepsCount) * 100);

  const savings = calculateMealSavings(currentServings, recipe.isVegan);

  return (
    <div 
      id="cooking-mode-overlay"
      className="fixed inset-0 z-60 bg-[#1A2526] text-white flex flex-col justify-between overscroll-contain select-none"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MULTI-TIMER FLOATING BUBBLES BAR                         */}
      {/* ========================================================================= */}
      <header className="shrink-0 bg-[#223133] border-b border-white/10 relative z-20">
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 overflow-hidden">
          <div
            className="bg-[#4A7856] h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Top Navbar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Recipe info & WakeLock indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#4A7856] flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <ChefHat className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-[#8DB898] uppercase tracking-wider">
                  {stepPhase === 'prep'
                    ? 'Schritt 0 • Vorbereitung'
                    : stepPhase === 'finished'
                    ? 'Fertig gekocht! 🎉'
                    : `Schritt ${currentStepIndex + 1} von ${totalStepsCount}`}
                </span>

                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 font-bold">
                  {currentServings} Port.
                </span>

                {/* WakeLock Active Badge */}
                {isWakeLockActive && (
                  <span 
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    title="Screen WakeLock aktiv: Dein Display dunkelt beim Kochen nicht ab"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Display aktiv</span>
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white truncate max-w-[200px] xs:max-w-xs sm:max-w-md leading-tight">
                {recipe.title}
              </h1>
            </div>
          </div>

          {/* Right: Freihand Voice Toggle, TTS, Ingredients, Minimize & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Freihand Voice Command Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isVoiceListening;
                setIsVoiceListening(nextState);
                toastCtx.showToast(
                  nextState 
                    ? '🎙️ Freihand-Mikrofon aktiv! Sage "weiter", "zurück" oder "vorlesen".' 
                    : 'Mikrofon pausiert'
                );
              }}
              className={`h-11 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isVoiceListening
                  ? 'bg-rose-600 text-white shadow-md animate-pulse border border-rose-400'
                  : 'bg-white/10 hover:bg-white/20 text-white/90'
              }`}
              title={isVoiceListening ? 'Sprachsteuerung beenden' : 'Freihändige Sprachsteuerung starten'}
            >
              {isVoiceListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white/70" />}
              <span className="hidden md:inline">
                {isVoiceListening ? 'Hört zu...' : 'Freihand'}
              </span>
            </button>

            {/* Read Aloud TTS button */}
            <button
              type="button"
              onClick={speakCurrentStep}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isSpeaking
                  ? 'bg-[#4A7856] text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-white/90'
              }`}
              title={isSpeaking ? 'Vorlesen stoppen' : 'Diesen Schritt vorlesen'}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* All Ingredients Overview */}
            <button
              type="button"
              onClick={() => setShowIngredientsModal(true)}
              className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
              title="Alle Zutaten des Rezepts ansehen"
            >
              <List className="w-4 h-4 text-[#8DB898]" />
              <span className="hidden sm:inline">Zutaten</span>
            </button>

            {/* Minimize */}
            <button
              type="button"
              onClick={onMinimize}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Minimieren"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                if (floatingTimers.some((t) => t.isRunning)) {
                  setShowExitConfirm(true);
                } else {
                  onClose();
                }
              }}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/90 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Kochmodus beenden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FLOATING TIMER BUBBLES ROW (MULTITIMER SUPPORT)                           */}
        {/* ========================================================================= */}
        {floatingTimers.length > 0 && (
          <div className="px-3 sm:px-6 py-2 bg-[#1A2526]/80 border-t border-white/5 flex items-center gap-2.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Aktive Timer ({floatingTimers.length}):
            </span>

            {floatingTimers.map((timer) => {
              const isFinished = timer.secondsLeft === 0;
              return (
                <div
                  key={timer.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-md transition-all shrink-0 ${
                    isFinished
                      ? 'bg-amber-500 text-black border-amber-300 animate-bounce font-bold'
                      : timer.isRunning
                      ? 'bg-[#2D4036] text-white border-[#4A7856] shadow-[#4A7856]/20'
                      : 'bg-white/10 text-white/80 border-white/20'
                  }`}
                >
                  <span className="text-xs font-semibold max-w-[120px] truncate">
                    {timer.label}
                  </span>

                  <span className="font-mono text-sm font-black tracking-wider">
                    {isFinished ? 'FERTIG!' : formatTimerDigits(timer.secondsLeft)}
                  </span>

                  {/* Play/Pause */}
                  <button
                    type="button"
                    onClick={() => handleToggleTimer(timer.id)}
                    className="p-1 rounded-full hover:bg-white/20 cursor-pointer active:scale-90"
                    title={timer.isRunning ? 'Pause' : 'Start'}
                  >
                    {timer.isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  </button>

                  {/* Adjust +1m */}
                  <button
                    type="button"
                    onClick={() => handleAdjustTimer(timer.id, 60)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white/20 cursor-pointer"
                    title="1 Minute hinzufügen"
                  >
                    +1m
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTimer(timer.id)}
                    className="p-1 rounded-full hover:bg-rose-500/30 text-white/60 hover:text-white cursor-pointer"
                    title="Timer schließen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEW: 3 PHASES (PREP / STEPS / FINISHED)                            */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto flex flex-col justify-center">

        {/* ----------------------------------------------------------------------- */}
        {/* PHASE 0: MISE-EN-PLACE CHECKLISTE (VORBEREITUNG VOR DEM START)          */}
        {/* ----------------------------------------------------------------------- */}
        {stepPhase === 'prep' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-[#4A7856]/20 border border-[#4A7856] text-[#8DB898] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Mise-en-Place Checkliste
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Alles bereitgestellt?
              </h2>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                Nimm dir 2 Minuten für die Vorbereitung. Wenn alles abgewogen und parat liegt, kochst du entspannt ohne Stress!
              </p>
            </div>

            {/* Servings Tuner */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between max-w-lg mx-auto">
              <div>
                <span className="text-xs uppercase font-bold text-white/60 tracking-wider">Portionen für dieses Kochen:</span>
                <div className="text-lg font-bold text-white mt-0.5">{currentServings} Personen</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentServings((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentServings((prev) => prev + 1)}
                  className="w-10 h-10 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Ingredients & Utensils Checklists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Ingredients Checklist */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-xl">🥗</span>
                    <span>Zutaten abgemessen</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const allChecked = recipe.ingredients.every((i) => prepChecks[i.name]);
                      const next: Record<string, boolean> = {};
                      recipe.ingredients.forEach((i) => {
                        next[i.name] = !allChecked;
                      });
                      setPrepChecks(next);
                    }}
                    className="text-xs text-[#8DB898] hover:underline font-semibold cursor-pointer"
                  >
                    Alle abhaken
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {recipe.ingredients.map((ing) => {
                    const isChecked = Boolean(prepChecks[ing.name]);
                    const amountFormatted = formatIngredientAmount(ing, recipe.servings, currentServings);
                    return (
                      <div
                        key={ing.name}
                        onClick={() => setPrepChecks((prev) => ({ ...prev, [ing.name]: !prev[ing.name] }))}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? 'bg-white/10 text-white/40' : 'bg-white/5 hover:bg-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isChecked ? 'bg-[#4A7856] border-[#4A7856] text-white' : 'border-white/30 bg-white/5'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? 'line-through text-white/50' : ''}`}>
                            {ing.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#8DB898]">
                          {amountFormatted}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen Utensils Checklist */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-xl">🔪</span>
                    <span>Werkzeuge bereitgelegt</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {Object.entries(utensilChecks).map(([item, isChecked]) => (
                    <div
                      key={item}
                      onClick={() => setUtensilChecks((prev) => ({ ...prev, [item]: !prev[item] }))}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-white/10 text-white/40' : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked ? 'bg-[#4A7856] border-[#4A7856] text-white' : 'border-white/30 bg-white/5'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`text-sm font-medium ${isChecked ? 'line-through text-white/50' : ''}`}>
                          {item}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
                    💡 <strong>Tipp:</strong> Stelle deine Gewürze & Öle in Reichweite des Herdes.
                  </div>
                </div>
              </div>
            </div>

            {/* Giant Start Button */}
            <div className="text-center pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full h-16 min-h-[64px] rounded-2xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-extrabold text-xl shadow-xl hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Alles bereit – Koch-Modus starten!</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PHASE 1: EINZELSCHRITT (1-METER-GROßSCHRIFT, SMARTE TIMER & ZUTATEN)     */}
        {/* ----------------------------------------------------------------------- */}
        {stepPhase === 'steps' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* 1. Step Specific Ingredients (scaled for current servings) */}
            {stepIngredients.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-extrabold text-[#8DB898] tracking-wider block">
                  Zutaten für diesen Schritt:
                </span>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {stepIngredients.map((ing) => {
                    const amountFormatted = formatIngredientAmount(ing, recipe.servings, currentServings);
                    return (
                      <span
                        key={ing.name}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm sm:text-base font-semibold text-white shadow-xs"
                      >
                        <span className="font-bold font-mono text-[#8DB898]">
                          {amountFormatted}
                        </span>
                        <span>{ing.name}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Step Title & GIANT 1-METER TYPOGRAPHY */}
            <div className="space-y-3">
              {currentStep.title && (
                <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-[#8DB898]">
                  {currentStep.title}
                </h2>
              )}

              {/* Ultra-large, high contrast text readable from 1 meter distance */}
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-snug sm:leading-tight text-white tracking-normal select-text">
                {currentStep.text}
              </div>

              {/* Culinary Pro-Tip */}
              {stepTip && (
                <div className="pt-2 flex items-start gap-2.5 text-base sm:text-lg text-emerald-200 font-medium">
                  <Lightbulb className="w-5 h-5 text-amber-300 shrink-0 mt-1" />
                  <p className="leading-relaxed">
                    <strong className="text-amber-200 font-bold">Profi-Tipp: </strong>
                    {stepTip}
                  </p>
                </div>
              )}

              {/* Step Photos */}
              {currentStep.stepImages && currentStep.stepImages.length > 0 && (
                <div className="pt-3">
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 max-h-60 sm:max-h-80 bg-black/40">
                    <img
                      src={currentStep.stepImages[0]}
                      alt="Schritt Foto"
                      className="w-full h-48 sm:h-72 object-cover cursor-zoom-in"
                      onClick={() => setLightboxImage(currentStep.stepImages![0])}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxImage(currentStep.stepImages![0])}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-xs text-white"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SMARTE TIMER ZUM ANTIPPEN (AUS DEM SCHRITT-TEXT ERKANNT) */}
            {smartTimersInText.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span className="text-sm font-bold text-amber-200">
                    Im Text erwähnte Zeitangaben (Antippen zum Starten):
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {smartTimersInText.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleStartSmartTimer(t.minutes, `${t.raw} (Schritt ${currentStepIndex + 1})`)}
                      className="h-11 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>{t.raw} Timer starten</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PHASE 2: ABSCHLUSS-SCREEN (KONFETTI, BEWERTUNG, FOTO & LOG)             */}
        {/* ----------------------------------------------------------------------- */}
        {stepPhase === 'finished' && (
          <div className="space-y-6 sm:space-y-8 max-w-xl mx-auto text-center animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="text-6xl select-none animate-bounce">🎉</div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Fantastisch gekocht!
              </h2>
              <p className="text-base sm:text-lg text-white/80">
                Du hast <strong className="text-white font-bold">{recipe.title}</strong> meisterhaft zubereitet. Guten Appetit!
              </p>
            </div>

            {/* Sustainability Badge */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-xs sm:text-sm">
              <div className="text-center">
                <span className="text-xl block">🌍</span>
                <span className="font-bold text-emerald-300">~{savings.savedCO2Kg} kg</span>
                <span className="text-white/60 block text-[11px]">CO2 gespart</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <span className="text-xl block">💧</span>
                <span className="font-bold text-cyan-300">~{savings.savedWaterLiters} L</span>
                <span className="text-white/60 block text-[11px]">Wasser geschont</span>
              </div>
            </div>

            {/* 5-Star Rating */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <span className="text-xs uppercase font-extrabold text-[#8DB898] tracking-wider block">
                Wie hat es dir geschmeckt?
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-white/20 hover:text-white/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture / Upload */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
              <span className="text-xs uppercase font-extrabold text-[#8DB898] tracking-wider block">
                Foto vom Ergebnis festhalten:
              </span>

              {cookedPhotoUrl ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/20">
                  <img
                    src={cookedPhotoUrl}
                    alt="Ergebnis Foto"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCookedPhotoUrl(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#4A7856] rounded-xl cursor-pointer transition-colors bg-white/5 hover:bg-white/10">
                  <Camera className="w-8 h-8 text-[#8DB898] mb-2" />
                  <span className="text-sm font-bold text-white">Foto aufnehmen oder hochladen</span>
                  <span className="text-xs text-white/60 mt-0.5">Schnappschuss für deine Koch-Historie</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Notes textarea */}
            <div className="text-left space-y-1.5">
              <label className="text-xs uppercase font-bold text-white/60 tracking-wider">
                Optionale Notiz zum Kochen:
              </label>
              <textarea
                value={cookedNotes}
                onChange={(e) => setCookedNotes(e.target.value)}
                placeholder="z. B. Beim nächsten Mal etwas mehr Chili hinzufügen..."
                rows={2}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-hidden focus:border-[#4A7856] text-sm"
              />
            </div>

            {/* Final Action CTA */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleFinishAndSave}
                className="w-full h-16 min-h-[64px] rounded-2xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-extrabold text-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <span>🎉 Als gekocht erfassen & abschließen</span>
              </button>

              <button
                type="button"
                onClick={() => setStepPhase('steps')}
                className="text-xs text-white/60 hover:text-white underline cursor-pointer"
              >
                Nochmal die Schritte ansehen
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FOOTER NAVIGATION (EXTRAGROßE TOUCH-BUTTONS MIN 48x48 / 64px)             */}
      {/* ========================================================================= */}
      <footer className="shrink-0 p-3.5 sm:p-5 bg-[#223133] border-t border-white/10 flex items-center justify-between gap-3">
        {/* Left: Prev Button */}
        <button
          id="cooking-mode-prev-btn"
          type="button"
          onClick={handlePrevStep}
          disabled={stepPhase === 'prep'}
          className="h-14 sm:h-16 px-5 sm:px-7 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-20 disabled:pointer-events-none text-white font-extrabold text-base sm:text-lg flex items-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
          <span>Zurück</span>
        </button>

        {/* Center: Step indicators */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-sm sm:text-base font-extrabold text-white/90">
            {stepPhase === 'prep'
              ? 'Vorbereitung'
              : stepPhase === 'finished'
              ? 'Fertig!'
              : `${currentStepIndex + 1} / ${totalStepsCount}`}
          </span>
          {stepPhase === 'steps' && (
            <div className="flex gap-1 mt-1 hidden xs:flex">
              {recipe.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'bg-[#8DB898] w-4'
                      : idx < currentStepIndex
                      ? 'bg-[#4A7856] w-2'
                      : 'bg-white/20 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Giant Next Button */}
        <button
          id="cooking-mode-next-btn"
          type="button"
          onClick={handleNextStep}
          className={`h-14 sm:h-16 px-6 sm:px-9 rounded-2xl font-extrabold text-lg sm:text-xl flex items-center gap-2 shadow-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
            stepPhase === 'steps' && currentStepIndex === totalStepsCount - 1
              ? 'bg-[#4A7856] hover:bg-[#3D6447] text-white animate-pulse'
              : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
          }`}
        >
          <span>
            {stepPhase === 'prep'
              ? 'Kochen starten'
              : stepPhase === 'steps' && currentStepIndex === totalStepsCount - 1
              ? 'Rezept fertiggestellt 🎉'
              : 'Weiter'}
          </span>
          <ChevronRight className="w-6 h-6" />
        </button>
      </footer>

      {/* ========================================================================= */}
      {/* ALL INGREDIENTS OVERVIEW MODAL                                            */}
      {/* ========================================================================= */}
      {showIngredientsModal && (
        <div 
          className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setShowIngredientsModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#223133] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[85vh] text-white animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4A7856] flex items-center justify-center text-white">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Alle Zutaten</h3>
                  <p className="text-xs text-[#8DB898] font-semibold">Berechnet für {currentServings} Portionen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIngredientsModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {recipe.ingredients.map((ing) => {
                const formatted = formatIngredientAmount(ing, recipe.servings, currentServings);
                return (
                  <div key={ing.name} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5">
                    <span className="text-sm text-white/90">{ing.name}</span>
                    <span className="text-sm font-mono font-bold text-[#8DB898]">{formatted}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowIngredientsModal(false)}
              className="w-full h-12 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-sm"
            >
              Zurück zum Kochen
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXIT CONFIRMATION MODAL                                                   */}
      {/* ========================================================================= */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="w-full max-w-md bg-[#223133] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Laufende Küchen-Timer aktiv!</h3>
              <p className="text-sm text-white/80 mt-1">
                Es laufen noch Küchen-Timer im Hintergrund. Möchtest du den Kochmodus wirklich beenden?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Weiterkochen
              </button>
              <button
                type="button"
                onClick={() => {
                  setFloatingTimers([]);
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Beenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP PHOTO LIGHTBOX                                                       */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-80 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Großansicht"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default CookingModeModal;
