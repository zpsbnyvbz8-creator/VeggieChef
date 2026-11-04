import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Recipe, RecipeIngredient } from '../types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Volume2,
  VolumeX,
  Minimize2,
  List,
  AlertTriangle,
  Star,
  Mic,
  MicOff,
  Camera,
  Plus,
  Minus,
  Lightbulb,
  Trash2,
  ChefHat,
  Utensils,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatIngredientAmount } from '../utils/helpers';
import { useRecipes, useToast } from '../context';
import CloseButton from './ui/CloseButton';

export interface CookingModeModalProps {
  recipe?: Recipe;
  servings?: number;
  currentStepIndex?: number;
  timerSeconds?: number | null;
  timerRunning?: boolean;
  onChangeStep?: (index: number) => void;
  onSetTimer?: (seconds: number | null, running: boolean) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onCompleteRecipe?: (servings: number, rating?: number, notes?: string, photoUrl?: string) => void;
}

interface FloatingTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = (props) => {
  const {
    cookingModeRecipe,
    setCookingModeRecipe,
    setIsCookingMinimized,
    cookingCurrentStep,
    setCookingCurrentStep,
    cookingTimer,
    setCookingTimer,
    logCooked,
    updateRecipe,
  } = useRecipes();
  const { showToast } = useToast();

  // Resolve active recipe & servings from props or RecipeContext
  const recipe = props.recipe ?? cookingModeRecipe?.recipe;
  const initialServings = props.servings ?? cookingModeRecipe?.servings ?? recipe?.servings ?? 2;
  const currentStepIndex = props.currentStepIndex ?? cookingCurrentStep;

  const timerSeconds =
    props.timerSeconds !== undefined
      ? props.timerSeconds
      : cookingTimer
      ? cookingTimer.secondsLeft
      : null;

  const timerRunning =
    props.timerRunning !== undefined
      ? props.timerRunning
      : cookingTimer
      ? cookingTimer.isRunning
      : false;

  const onChangeStep = (index: number) => {
    if (props.onChangeStep) {
      props.onChangeStep(index);
    } else {
      setCookingCurrentStep(index);
    }
  };

  const onSetTimer = (seconds: number | null, running: boolean) => {
    if (props.onSetTimer) {
      props.onSetTimer(seconds, running);
      return;
    }
    if (!recipe) return;
    if (seconds === null) {
      setCookingTimer(null);
    } else {
      const stepObj = recipe.steps[currentStepIndex];
      setCookingTimer((prev) => ({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepNumber: currentStepIndex + 1,
        stepTitle: stepObj?.title,
        totalSeconds: prev ? Math.max(prev.totalSeconds, seconds) : seconds,
        secondsLeft: seconds,
        isRunning: running,
      }));
    }
  };

  const onClose = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      setIsCookingMinimized(false);
      setCookingModeRecipe(null);
    }
  };

  const onMinimize = () => {
    if (props.onMinimize) {
      props.onMinimize();
    } else {
      setIsCookingMinimized(true);
    }
  };

  // Phase state: 'prep' (Vorbereitung) -> 'steps' (Kochschritte) -> 'finished' (Abschluss)
  const [stepPhase, setStepPhase] = useState<'prep' | 'steps' | 'finished'>(() =>
    currentStepIndex > 0 ? 'steps' : 'prep'
  );
  const [stepDirection, setStepDirection] = useState<number>(1);
  const [currentServings, setCurrentServings] = useState<number>(initialServings);

  // Checklists
  const [checkedPrepIngredients, setCheckedPrepIngredients] = useState<Record<string, boolean>>({});
  const [checkedStepIngredients, setCheckedStepIngredients] = useState<Record<string, boolean>>({});

  // Modals & Overlays
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Audio & Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [showVoiceHint, setShowVoiceHint] = useState(false);

  // Completion Screen States
  const [rating, setRating] = useState<number>(5);
  const [cookedNotes, setCookedNotes] = useState<string>('');
  const [cookedPhotoUrl, setCookedPhotoUrl] = useState<string | null>(null);

  // Multi-Timer State
  const [floatingTimers, setFloatingTimers] = useState<FloatingTimer[]>([]);

  // Touch Swipe Refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  const steps = recipe?.steps ?? [];
  const ingredients = recipe?.ingredients ?? [];
  const totalStepsCount = steps.length;
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), Math.max(0, totalStepsCount - 1));
  const currentStep = steps[safeStepIndex];

  // Overall progress percentage (0% at prep, up to 100% at finished)
  const progressPercentage = useMemo(() => {
    if (stepPhase === 'prep') return 6;
    if (stepPhase === 'finished') return 100;
    return Math.round(((safeStepIndex + 1) / (totalStepsCount + 1)) * 100);
  }, [stepPhase, safeStepIndex, totalStepsCount]);

  // ---------------------------------------------------------------------------
  // 1. Acoustic Chime (Web Audio API)
  // ---------------------------------------------------------------------------
  const playAlarmChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(587.33, now, 0.22); // D5
      playTone(783.99, now + 0.24, 0.22); // G5
      playTone(1174.66, now + 0.48, 0.45); // D6
    } catch {
      // Ignore audio context errors if blocked
    }
  };

  // ---------------------------------------------------------------------------
  // 2. WakeLock & Scroll Lock
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Silently ignore if unsupported or blocked in iframe
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Hands-Free Voice Control (Web Speech Recognition API)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!voiceControlEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceControlEnabled(false);
      showToast('Sprachsteuerung wird von diesem Browser nicht unterstützt.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult.isFinal) return;
      const transcript = lastResult[0].transcript.trim().toLowerCase();

      if (transcript.includes('weiter') || transcript.includes('nächster')) {
        setLastVoiceCommand('„Weiter“');
        document.getElementById('cooking-mode-next-btn')?.click();
      } else if (transcript.includes('zurück') || transcript.includes('vorheriger')) {
        setLastVoiceCommand('„Zurück“');
        document.getElementById('cooking-mode-prev-btn')?.click();
      } else if (transcript.includes('vorlesen') || transcript.includes('wiederholen')) {
        setLastVoiceCommand('„Vorlesen“');
        document.getElementById('cooking-mode-tts-btn')?.click();
      } else if (transcript.includes('timer') || transcript.includes('start')) {
        setLastVoiceCommand('„Timer starten“');
        document.getElementById('cooking-mode-timer-btn')?.click();
      } else if (transcript.includes('stopp') || transcript.includes('pause')) {
        setLastVoiceCommand('„Pause“');
        onSetTimer(timerSeconds, false);
      }

      setTimeout(() => setLastVoiceCommand(null), 2500);
    };

    recognition.onend = () => {
      if (voiceControlEnabled) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [voiceControlEnabled, timerSeconds]);

  // ---------------------------------------------------------------------------
  // 4. Multi-Timer Tick Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setFloatingTimers((prev) =>
        prev.map((t) => {
          if (!t.running || t.remainingSeconds <= 0) return t;
          const next = t.remainingSeconds - 1;
          if (next === 0) {
            playAlarmChime();
            return { ...t, remainingSeconds: 0, running: false };
          }
          return { ...t, remainingSeconds: next };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // 5. Auto-Speak on Step Change (if enabled)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (autoSpeakEnabled && stepPhase === 'steps' && currentStep) {
      const timer = setTimeout(() => {
        speakStepText(
          currentStep.title ? `${currentStep.title}. ${currentStep.text}` : currentStep.text
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [safeStepIndex, stepPhase, autoSpeakEnabled]);

  // ---------------------------------------------------------------------------
  // 6. Keyboard Navigation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showIngredientsModal || showExitConfirm || lightboxImage) {
        if (e.key === 'Escape') {
          setShowIngredientsModal(false);
          setShowExitConfirm(false);
          setLightboxImage(null);
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseAttempt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    stepPhase,
    safeStepIndex,
    totalStepsCount,
    showIngredientsModal,
    showExitConfirm,
    lightboxImage,
    timerRunning,
    floatingTimers,
  ]);

  // ---------------------------------------------------------------------------
  // 7. Smart Detection: Step Ingredients, Timers & Chef Tip
  // ---------------------------------------------------------------------------
  const stepIngredients = useMemo<RecipeIngredient[]>(() => {
    if (!currentStep) return [];
    const textLower = `${currentStep.title || ''} ${currentStep.text}`.toLowerCase();
    return ingredients.filter((ing) => {
      const cleanName = ing.name.toLowerCase().trim();
      if (textLower.includes(cleanName)) return true;
      const words = cleanName
        .split(/[\s,()/-]+/)
        .filter(
          (w) =>
            w.length >= 4 &&
            !['oder', 'nach', 'wahl', 'frisch', 'fein', 'grob', 'etwas'].includes(w)
        );
      return words.some((word) => textLower.includes(word));
    });
  }, [currentStep, ingredients]);

  const smartTimersInText = useMemo<{ label: string; minutes: number; raw: string }[]>(() => {
    if (!currentStep) return [];
    const results: { label: string; minutes: number; raw: string }[] = [];
    const regex =
      /(\d+)(?:\s*(?:-|bis)\s*(\d+))?\s*(Minuten|Minute|Min\.|Min|Stunden|Stunde|Std\.)/gi;
    let match;
    while ((match = regex.exec(currentStep.text)) !== null) {
      const val1 = parseInt(match[1], 10);
      const val2 = match[2] ? parseInt(match[2], 10) : null;
      const unit = match[3].toLowerCase();
      const baseNum = val2 ? Math.round((val1 + val2) / 2) : val1;
      const minutes = unit.startsWith('st') ? baseNum * 60 : baseNum;
      if (minutes > 0 && minutes <= 600) {
        if (!results.some((r) => r.minutes === minutes)) {
          results.push({
            label: `${match[0]} (Schritt ${safeStepIndex + 1})`,
            minutes,
            raw: match[0],
          });
        }
      }
    }
    return results;
  }, [currentStep, safeStepIndex]);

  const currentStepTip = useMemo<string | null>(() => {
    if (!currentStep) return null;
    if ((currentStep as any).tip) return (currentStep as any).tip;
    const tipMatch = currentStep.text.match(/(?:Tipp|Hinweis|Geheimtipp):\s*([^.!?]+[.!?])/i);
    if (tipMatch) return tipMatch[1].trim();
    if (safeStepIndex === totalStepsCount - 1 && recipe?.chefTip) {
      return recipe.chefTip;
    }
    return null;
  }, [currentStep, safeStepIndex, totalStepsCount, recipe?.chefTip]);

  const currentStepImages = useMemo<string[]>(() => {
    if (!currentStep) return [];
    return currentStep.stepImages || (currentStep as any).images || [];
  }, [currentStep]);

  if (!recipe) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // 8. Handlers
  // ---------------------------------------------------------------------------
  const speakStepText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.96;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setAutoSpeakEnabled(false);
      return;
    }

    setAutoSpeakEnabled(true);
    if (stepPhase === 'prep') {
      const ingText = ingredients
        .map((i) => `${formatIngredientAmount(i, recipe.servings, currentServings)} ${i.name}`.trim())
        .join(', ');
      speakStepText(`Vorbereitung für ${recipe.title}. Du benötigst: ${ingText}`);
    } else if (stepPhase === 'steps' && currentStep) {
      speakStepText(
        currentStep.title ? `${currentStep.title}. ${currentStep.text}` : currentStep.text
      );
    }
  };

  const handleStartSmartTimer = (minutes: number, label: string) => {
    const seconds = minutes * 60;
    if (timerSeconds === null) {
      onSetTimer(seconds, true);
    } else {
      const id = `timer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setFloatingTimers((prev) => [
        ...prev,
        {
          id,
          label,
          totalSeconds: seconds,
          remainingSeconds: seconds,
          running: true,
        },
      ]);
    }
  };

  const handleToggleFloatingTimer = (id: string) => {
    setFloatingTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, running: !t.running } : t))
    );
  };

  const handleAddMinuteToFloatingTimer = (id: string) => {
    setFloatingTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              remainingSeconds: t.remainingSeconds + 60,
              totalSeconds: t.totalSeconds + 60,
            }
          : t
      )
    );
  };

  const handleDeleteFloatingTimer = (id: string) => {
    setFloatingTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePrevStep = () => {
    setStepDirection(-1);
    if (stepPhase === 'finished') {
      setStepPhase('steps');
      return;
    }
    if (stepPhase === 'steps') {
      if (safeStepIndex > 0) {
        onChangeStep(safeStepIndex - 1);
      } else {
        setStepPhase('prep');
      }
    }
  };

  const handleNextStep = () => {
    setStepDirection(1);
    if (stepPhase === 'prep') {
      setStepPhase('steps');
      return;
    }
    if (stepPhase === 'steps') {
      if (safeStepIndex < totalStepsCount - 1) {
        onChangeStep(safeStepIndex + 1);
      } else {
        setStepPhase('finished');
      }
    }
  };

  const handleJumpToStep = (index: number) => {
    setStepDirection(index >= safeStepIndex ? 1 : -1);
    setStepPhase('steps');
    onChangeStep(index);
  };

  const handleCloseAttempt = () => {
    const anyTimerRunning = timerRunning || floatingTimers.some((t) => t.running);
    if (anyTimerRunning && stepPhase !== 'finished') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCookedPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinishAndSave = () => {
    if (props.onCompleteRecipe) {
      props.onCompleteRecipe(
        currentServings,
        rating,
        cookedNotes.trim() || undefined,
        cookedPhotoUrl || undefined
      );
      return;
    }

    logCooked(
      recipe,
      currentServings,
      cookedNotes.trim() || undefined,
      rating,
      cookedPhotoUrl || undefined
    );

    if (cookedPhotoUrl) {
      const updatedUserImages = [cookedPhotoUrl, ...(recipe.userImages || [])];
      updateRecipe({
        ...recipe,
        userImages: updatedUserImages,
      });
    }

    setCookingTimer(null);
    setFloatingTimers([]);
    showToast(`„${recipe.title}“ als gekocht gespeichert!`);
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 75) {
      handleNextStep();
    } else if (distance < -75) {
      handlePrevStep();
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSecs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const hasActiveTimers = timerSeconds !== null || floatingTimers.length > 0;
  const allPrepChecked =
    ingredients.length > 0 && ingredients.every((ing) => !!checkedPrepIngredients[ing.name]);

  return (
    <div
      className="fixed inset-0 z-60 bg-page text-text-main flex flex-col select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Progress Line */}
      <div className="w-full h-1 bg-border shrink-0 overflow-hidden">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* ========================================================================= */}
      {/* HEADER                                                                    */}
      {/* ========================================================================= */}
      <header className="shrink-0 bg-card/90 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Recipe Title & Phase Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-accent">
                  {stepPhase === 'prep'
                    ? 'Vorbereitung'
                    : stepPhase === 'finished'
                    ? 'Abgeschlossen'
                    : `Schritt ${safeStepIndex + 1} von ${totalStepsCount}`}
                </span>
                <span className="text-text-muted/40 text-xs">•</span>
                <span className="text-xs text-text-muted font-medium">
                  {currentServings} {currentServings === 1 ? 'Portion' : 'Portionen'}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-text-main truncate">
                {recipe.title}
              </h1>
            </div>
          </div>

          {/* Right: Clean Tool Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice Command Feedback Toast */}
            <AnimatePresence>
              {lastVoiceCommand && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9, x: 8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-tint text-accent text-xs font-semibold"
                >
                  {lastVoiceCommand}
                </motion.span>
              )}
            </AnimatePresence>

            {/* All Ingredients Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowIngredientsModal(true)}
              className="h-10 px-3 rounded-xl bg-surface hover:bg-border/60 border border-border text-text-main text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Zutatenliste öffnen"
            >
              <List className="w-4 h-4 text-accent" />
              <span className="hidden sm:inline">Zutaten</span>
            </button>

            {/* Read Aloud (TTS) Button */}
            <button
              id="cooking-mode-tts-btn"
              type="button"
              onClick={handleToggleSpeech}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isSpeaking || autoSpeakEnabled
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface hover:bg-border/60 border-border text-text-main'
              }`}
              title={isSpeaking || autoSpeakEnabled ? 'Vorlesen beenden' : 'Schritt vorlesen'}
              aria-label="Vorlesen umschalten"
            >
              {isSpeaking || autoSpeakEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {/* Voice Control (Hands-free) Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = !voiceControlEnabled;
                  setVoiceControlEnabled(next);
                  setShowVoiceHint(next);
                }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  voiceControlEnabled
                    ? 'bg-accent text-on-accent border-accent'
                    : 'bg-surface hover:bg-border/60 border-border text-text-main'
                }`}
                title="Sprachsteuerung (Weiter, Zurück, Vorlesen, Timer)"
                aria-label="Sprachsteuerung umschalten"
              >
                {voiceControlEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4 text-text-muted" />
                )}
              </button>

              <AnimatePresence>
                {showVoiceHint && voiceControlEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="absolute right-0 top-12 z-30 w-64 p-3 rounded-2xl bg-card border border-border shadow-lg text-xs text-text-main"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-accent flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5" /> Sprachbefehle aktiv
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVoiceHint(false)}
                        className="text-text-muted hover:text-text-main p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-text-muted leading-relaxed">
                      Sage <span className="font-semibold text-text-main">„Weiter“</span>,{' '}
                      <span className="font-semibold text-text-main">„Zurück“</span>,{' '}
                      <span className="font-semibold text-text-main">„Vorlesen“</span> oder{' '}
                      <span className="font-semibold text-text-main">„Timer“</span>.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Minimize Button */}
            <button
              type="button"
              onClick={onMinimize}
              className="w-10 h-10 rounded-xl bg-surface hover:bg-border/60 border border-border text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
              title="Kochmodus minimieren"
              aria-label="Kochmodus minimieren"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <CloseButton
              onClick={handleCloseAttempt}
              ariaLabel="Kochmodus schließen"
              size={40}
              iconSize={18}
              className="rounded-xl bg-surface hover:bg-border/60 border border-border text-text-muted hover:text-text-main"
            />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ACTIVE TIMERS BAR (SHOWN ONLY WHEN TIMERS EXIST)                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {hasActiveTimers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-surface border-b border-border overflow-hidden"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
              {/* Primary Step Timer */}
              {timerSeconds !== null && (
                <div
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border shrink-0 transition-colors ${
                    timerSeconds === 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-card border-border text-text-main shadow-2xs'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 shrink-0 ${
                      timerSeconds === 0
                        ? 'text-amber-600 animate-bounce'
                        : timerRunning
                        ? 'text-accent'
                        : 'text-text-muted'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted">Timer</span>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {timerSeconds === 0 ? 'Fertig!' : formatTimer(timerSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pl-1 border-l border-border">
                    <button
                      type="button"
                      onClick={() => onSetTimer(timerSeconds + 60, timerRunning)}
                      className="px-2 py-1 rounded-lg hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
                      title="+1 Minute"
                    >
                      +1m
                    </button>
                    {timerSeconds > 0 && (
                      <button
                        type="button"
                        onClick={() => onSetTimer(timerSeconds, !timerRunning)}
                        className="w-7 h-7 rounded-lg bg-accent-tint text-accent hover:bg-accent hover:text-on-accent flex items-center justify-center transition-colors cursor-pointer"
                        title={timerRunning ? 'Pausieren' : 'Fortsetzen'}
                      >
                        {timerRunning ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSetTimer(null, false)}
                      className="w-7 h-7 rounded-lg hover:bg-surface text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
                      title="Timer entfernen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Floating Timers */}
              {floatingTimers.map((ft) => (
                <div
                  key={ft.id}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border shrink-0 transition-colors ${
                    ft.remainingSeconds === 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-card border-border text-text-main shadow-2xs'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 shrink-0 ${
                      ft.remainingSeconds === 0
                        ? 'text-amber-600 animate-bounce'
                        : ft.running
                        ? 'text-accent'
                        : 'text-text-muted'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted max-w-[120px] truncate">
                      {ft.label}
                    </span>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {ft.remainingSeconds === 0 ? 'Fertig!' : formatTimer(ft.remainingSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pl-1 border-l border-border">
                    <button
                      type="button"
                      onClick={() => handleAddMinuteToFloatingTimer(ft.id)}
                      className="px-2 py-1 rounded-lg hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
                      title="+1 Minute"
                    >
                      +1m
                    </button>
                    {ft.remainingSeconds > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleFloatingTimer(ft.id)}
                        className="w-7 h-7 rounded-lg bg-accent-tint text-accent hover:bg-accent hover:text-on-accent flex items-center justify-center transition-colors cursor-pointer"
                        title={ft.running ? 'Pausieren' : 'Fortsetzen'}
                      >
                        {ft.running ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFloatingTimer(ft.id)}
                      className="w-7 h-7 rounded-lg hover:bg-surface text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
                      title="Timer entfernen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* ------------------------------------------------------------------- */}
            {/* PHASE 1: VORBEREITUNG (MISE-EN-PLACE)                               */}
            {/* ------------------------------------------------------------------- */}
            {stepPhase === 'prep' && (
              <motion.div
                key="phase-prep"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Header & Quick Skip */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                      Mise-en-Place
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-main mt-0.5">
                      Zutaten bereitstellen
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                      Hake ab, was schon bereitsteht, oder starte direkt mit dem ersten Schritt.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStepPhase('steps')}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-header-top hover:bg-header-top/80 text-text-main text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Direkt zu Schritt 1</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Servings & Ingredient Checklist Card */}
                <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-text-main">
                        Zutaten ({ingredients.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (allPrepChecked) {
                            setCheckedPrepIngredients({});
                          } else {
                            const next: Record<string, boolean> = {};
                            ingredients.forEach((i) => {
                              next[i.name] = true;
                            });
                            setCheckedPrepIngredients(next);
                          }
                        }}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer ml-1"
                      >
                        {allPrepChecked ? 'Auswahl aufheben' : 'Alle abhaken'}
                      </button>
                    </div>

                    {/* Servings Stepper */}
                    <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setCurrentServings((s) => Math.max(1, s - 1))}
                        className="w-8 h-8 rounded-lg hover:bg-card text-text-main flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Portionen verringern"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-text-main tabular-nums">
                        {currentServings} {currentServings === 1 ? 'Portion' : 'Portionen'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentServings((s) => Math.min(24, s + 1))}
                        className="w-8 h-8 rounded-lg hover:bg-card text-text-main flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Portionen erhöhen"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ingredients Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ingredients.map((ing) => {
                      const isChecked = !!checkedPrepIngredients[ing.name];
                      const formattedAmount = formatIngredientAmount(
                        ing,
                        recipe.servings,
                        currentServings
                      );
                      return (
                        <button
                          key={ing.name}
                          type="button"
                          onClick={() =>
                            setCheckedPrepIngredients((prev) => ({
                              ...prev,
                              [ing.name]: !prev[ing.name],
                            }))
                          }
                          className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-accent-tint/60 border-accent/25 text-text-muted'
                              : 'bg-surface hover:bg-surface/80 border-border text-text-main'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-accent text-on-accent'
                                  : 'border border-text-muted/40 bg-card'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </div>
                            <span
                              className={`text-sm font-medium truncate ${
                                isChecked ? 'line-through text-text-muted' : 'text-text-main'
                              }`}
                            >
                              {ing.name}
                            </span>
                          </div>
                          {formattedAmount && (
                            <span
                              className={`text-xs font-semibold tabular-nums shrink-0 ${
                                isChecked ? 'text-text-muted/70 line-through' : 'text-accent'
                              }`}
                            >
                              {formattedAmount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* PHASE 2: SCHRITT-FÜR-SCHRITT                                        */}
            {/* ------------------------------------------------------------------- */}
            {stepPhase === 'steps' && currentStep && (
              <motion.div
                key={`step-${safeStepIndex}`}
                initial={{ opacity: 0, x: stepDirection * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-5"
              >
                {/* Main Step Card */}
                <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xs space-y-6">
                  {/* Step Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-accent-tint text-accent text-xs font-bold">
                        Schritt {safeStepIndex + 1} von {totalStepsCount}
                      </span>
                      {currentStep.title && (
                        <h2 className="text-base sm:text-lg font-bold text-text-main">
                          {currentStep.title}
                        </h2>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        speakStepText(
                          currentStep.title
                            ? `${currentStep.title}. ${currentStep.text}`
                            : currentStep.text
                        )
                      }
                      className="w-9 h-9 rounded-xl bg-surface hover:bg-border/60 border border-border text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Diesen Schritt vorlesen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step Instruction Text */}
                  <p className="text-xl sm:text-2xl lg:text-[26px] font-medium text-text-main leading-relaxed">
                    {currentStep.text}
                  </p>

                  {/* Step Timer Actions (Explicit Step Timer + Detected Smart Timers) */}
                  {(currentStep.timerMinutes || smartTimersInText.length > 0) && (
                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      {currentStep.timerMinutes && (
                        <button
                          id="cooking-mode-timer-btn"
                          type="button"
                          onClick={() =>
                            onSetTimer((currentStep.timerMinutes || 1) * 60, true)
                          }
                          className="h-11 px-4 rounded-2xl bg-header-top hover:bg-header-top/80 text-text-main font-semibold text-sm flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-accent" />
                          <span>Timer starten ({currentStep.timerMinutes} Min.)</span>
                        </button>
                      )}

                      {smartTimersInText
                        .filter((t) => t.minutes !== currentStep.timerMinutes)
                        .map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleStartSmartTimer(t.minutes, t.label)}
                            className="h-11 px-4 rounded-2xl bg-header-top hover:bg-header-top/80 text-text-main font-semibold text-sm flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
                          >
                            <Clock className="w-4 h-4 text-accent" />
                            <span>{t.raw} Timer</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Chef Tip (if present) */}
                  {currentStepTip && (
                    <div className="p-4 rounded-2xl bg-header-top/40 border border-header-top flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-sm text-text-main leading-relaxed">
                        <span className="font-bold">Hinweis: </span>
                        {currentStepTip}
                      </p>
                    </div>
                  )}

                  {/* Step Photos (if present) */}
                  {currentStepImages.length > 0 && (
                    <div className="pt-2">
                      <div
                        className={`grid gap-3 ${
                          currentStepImages.length === 1
                            ? 'grid-cols-1 max-w-md'
                            : 'grid-cols-2 sm:grid-cols-3'
                        }`}
                      >
                        {currentStepImages.map((imgUrl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightboxImage(imgUrl)}
                            className="group relative aspect-video rounded-2xl overflow-hidden border border-border bg-surface cursor-pointer"
                          >
                            <img
                              src={imgUrl}
                              alt={`Schritt ${safeStepIndex + 1} Foto ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-Specific Ingredients Card */}
                {stepIngredients.length > 0 && (
                  <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-accent" />
                        Zutaten in diesem Schritt
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stepIngredients.map((ing) => {
                        const key = `${safeStepIndex}-${ing.name}`;
                        const isChecked = !!checkedStepIngredients[key];
                        const formatted = formatIngredientAmount(
                          ing,
                          recipe.servings,
                          currentServings
                        );
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setCheckedStepIngredients((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-accent-tint/50 border-accent/20 text-text-muted'
                                : 'bg-surface hover:bg-surface/80 border-border text-text-main'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
                                  isChecked
                                    ? 'bg-accent text-on-accent'
                                    : 'border border-text-muted/40 bg-card'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </div>
                              <span
                                className={`text-sm font-medium truncate ${
                                  isChecked ? 'line-through text-text-muted' : 'text-text-main'
                                }`}
                              >
                                {ing.name}
                              </span>
                            </div>
                            {formatted && (
                              <span
                                className={`text-xs font-semibold tabular-nums shrink-0 ${
                                  isChecked ? 'line-through text-text-muted/70' : 'text-accent'
                                }`}
                              >
                                {formatted}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* PHASE 3: ABSCHLUSS-SCREEN (CLEAN, FACTUAL, NO FAKE METRICS)          */}
            {/* ------------------------------------------------------------------- */}
            {stepPhase === 'finished' && (
              <motion.div
                key="phase-finished"
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="max-w-xl mx-auto"
              >
                <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6 text-center">
                  {/* Icon & Heading */}
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-accent-tint text-accent flex items-center justify-center mx-auto mb-3">
                      <Check className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-main">
                      Guten Appetit!
                    </h2>
                    <p className="text-sm sm:text-base text-text-muted">
                      Du hast <span className="font-semibold text-text-main">{recipe.title}</span>{' '}
                      für {currentServings} {currentServings === 1 ? 'Portion' : 'Portionen'} zubereitet.
                    </p>
                  </div>

                  {/* Star Rating */}
                  <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                      Wie hat es geschmeckt?
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="w-11 h-11 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          aria-label={`${star} Sterne`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-border hover:text-text-muted/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Photo & Notes */}
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                        Foto festhalten (optional)
                      </label>
                      {cookedPhotoUrl ? (
                        <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-border">
                          <img
                            src={cookedPhotoUrl}
                            alt="Ergebnis"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setCookedPhotoUrl(null)}
                            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-xl bg-black/60 text-white hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Foto entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-3 p-4 border border-dashed border-border hover:border-accent rounded-2xl cursor-pointer transition-colors bg-surface hover:bg-accent-tint/30">
                          <Camera className="w-5 h-5 text-accent" />
                          <span className="text-sm font-semibold text-text-main">
                            Foto aufnehmen oder auswählen
                          </span>
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

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                        Notiz für das nächste Mal (optional)
                      </label>
                      <textarea
                        value={cookedNotes}
                        onChange={(e) => setCookedNotes(e.target.value)}
                        placeholder="z. B. Etwas mehr Zitrone oder kürzere Backzeit..."
                        rows={2}
                        className="w-full p-3.5 rounded-2xl bg-surface border border-border text-text-main placeholder:text-text-muted/60 focus:outline-hidden focus:border-accent text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Save & Finish Actions */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleFinishAndSave}
                      className="w-full h-13 rounded-2xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-base shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      <Check className="w-5 h-5" />
                      <span>Als gekocht speichern</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStepPhase('steps')}
                      className="text-xs font-semibold text-text-muted hover:text-text-main py-1.5 cursor-pointer"
                    >
                      Zurück zu den Schritten
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <footer className="shrink-0 bg-card border-t border-border px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back Button */}
          <button
            id="cooking-mode-prev-btn"
            type="button"
            onClick={handlePrevStep}
            disabled={stepPhase === 'prep'}
            className="h-12 sm:h-13 px-4 sm:px-6 rounded-2xl bg-surface hover:bg-border/60 border border-border disabled:opacity-35 disabled:pointer-events-none text-text-main font-semibold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Zurück</span>
          </button>

          {/* Center: Interactive Step Dots */}
          <div className="flex flex-col items-center justify-center min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs py-1 no-scrollbar">
              {/* Prep Dot */}
              <button
                type="button"
                onClick={() => setStepPhase('prep')}
                className={`h-2 rounded-full transition-all cursor-pointer shrink-0 ${
                  stepPhase === 'prep'
                    ? 'bg-accent w-5'
                    : 'bg-accent/35 hover:bg-accent/60 w-2'
                }`}
                title="Vorbereitung"
                aria-label="Zur Vorbereitung"
              />

              {/* Step Dots */}
              {steps.map((_, idx) => {
                const isActive = stepPhase === 'steps' && idx === safeStepIndex;
                const isCompleted =
                  stepPhase === 'finished' ||
                  (stepPhase === 'steps' && idx < safeStepIndex);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToStep(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-accent w-5'
                        : isCompleted
                        ? 'bg-accent/45 hover:bg-accent/70 w-2'
                        : 'bg-border hover:bg-text-muted/40 w-2'
                    }`}
                    title={`Schritt ${idx + 1}`}
                    aria-label={`Gehe zu Schritt ${idx + 1}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Primary Next / Finish Button */}
          {stepPhase !== 'finished' ? (
            <button
              id="cooking-mode-next-btn"
              type="button"
              onClick={handleNextStep}
              className="h-12 sm:h-13 px-5 sm:px-7 rounded-2xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-sm sm:text-base flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <span>
                {stepPhase === 'prep'
                  ? 'Mit Schritt 1 starten'
                  : safeStepIndex === totalStepsCount - 1
                  ? 'Abschließen'
                  : 'Weiter'}
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishAndSave}
              className="h-12 sm:h-13 px-5 sm:px-7 rounded-2xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-sm sm:text-base flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>Speichern</span>
            </button>
          )}
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* ALL INGREDIENTS MODAL                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showIngredientsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowIngredientsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col max-h-[80vh] text-text-main"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3.5 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-text-main">
                    Alle Zutaten ({ingredients.length})
                  </h3>
                  <p className="text-xs text-text-muted">
                    Für {currentServings} {currentServings === 1 ? 'Portion' : 'Portionen'}
                  </p>
                </div>
                <CloseButton
                  onClick={() => setShowIngredientsModal(false)}
                  ariaLabel="Zutatenliste schließen"
                  size={36}
                  iconSize={18}
                />
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-1.5">
                {ingredients.map((ing) => {
                  const formatted = formatIngredientAmount(
                    ing,
                    recipe.servings,
                    currentServings
                  );
                  return (
                    <div
                      key={ing.name}
                      className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-surface"
                    >
                      <span className="text-sm font-medium text-text-main">{ing.name}</span>
                      <span className="text-xs font-bold text-accent tabular-nums">
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowIngredientsModal(false)}
                className="mt-2 w-full h-11 rounded-xl bg-header-top hover:bg-header-top/80 text-text-main font-semibold text-sm cursor-pointer transition-colors"
              >
                Schließen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* EXIT CONFIRMATION MODAL (IF TIMERS RUNNING)                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4 text-text-main"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Timer läuft noch</h3>
                <p className="text-sm text-text-muted mt-1">
                  Möchtest du den Kochmodus minimieren, damit der Timer weiterläuft, oder ganz beenden?
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onMinimize();
                  }}
                  className="w-full sm:flex-1 h-11 rounded-xl bg-header-top hover:bg-header-top/80 text-text-main font-semibold text-sm cursor-pointer transition-colors"
                >
                  Minimieren
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFloatingTimers([]);
                    onSetTimer(null, false);
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="w-full sm:flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm cursor-pointer transition-colors"
                >
                  Beenden
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* STEP PHOTO LIGHTBOX                                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-80 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <CloseButton
              onClick={() => setLightboxImage(null)}
              ariaLabel="Großansicht schließen"
              className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 text-white"
            />
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={lightboxImage}
              alt="Schritt Großansicht"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CookingModeModal;
