import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Plus, 
  X, 
  Clock, 
  Dumbbell, 
  Flame, 
  Check, 
  ArrowRight,
  BookOpen,
  RotateCcw,
  Sliders,
  Zap,
  ChevronDown,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, FridgeCookIdea } from '../types';
import { PANTRY_QUICK_ITEMS } from '../data/recipes';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { FridgeIdeaModal } from './FridgeIdeaModal';
import { RecipeImage } from './RecipeImage';
import { safeStorage } from '../utils/helpers';

interface FridgeCookViewProps {
  allRecipes?: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onSaveCustomRecipe?: (recipe: Recipe) => void;
  onlyVeganGlobal?: boolean;
  onCopyFeedback?: (msg: string) => void;
}

export const FridgeCookView: React.FC<FridgeCookViewProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const allRecipes = props.allRecipes ?? recipesCtx.recipes;
  const onSelectRecipe = props.onSelectRecipe ?? ((r: Recipe) => navigate(`/recipes/${r.id}`));
  const onSaveCustomRecipe = props.onSaveCustomRecipe ?? recipesCtx.saveCustomRecipe;
  const onlyVeganGlobal = props.onlyVeganGlobal ?? recipesCtx.onlyVegan;
  const onCopyFeedback = props.onCopyFeedback ?? toastCtx.showToast;
  // Load and persist ingredients properly using safeStorage (prevents iframe SecurityError)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(() => {
    try {
      const stored = safeStorage.getItem('veggiechef_pantry_ingredients');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      safeStorage.setItem('veggiechef_pantry_ingredients', JSON.stringify(selectedIngredients));
    } catch {
      // Fallback
    }
  }, [selectedIngredients]);

  const [customInput, setCustomInput] = useState('');
  const [isVegan, setIsVegan] = useState(true);
  const [calorieFilter, setCalorieFilter] = useState<string>('all'); // 'all', 'high', 'low', 'moderate'
  const [proteinFilter, setProteinFilter] = useState<string>('all'); // 'all', 'high', 'very-high', 'medium'
  const [difficulty, setDifficulty] = useState<string>('all');
  const [maxTime, setMaxTime] = useState(25);
  const [maxExtraIngredients, setMaxExtraIngredients] = useState(2); // AI additional ingredient slider
  const [includeBasics, setIncludeBasics] = useState(true); // Basic staples (oil, salt, pepper, etc.) - standardmäßig aktiv
  const [extraWishes, setExtraWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [isPreferencesOpenOnMobile, setIsPreferencesOpenOnMobile] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<FridgeCookIdea | null>(null);
  const [isLoadingIdea, setIsLoadingIdea] = useState(false);
  const [isCreatingFinalRecipe, setIsCreatingFinalRecipe] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [rejectedIdeaTitles, setRejectedIdeaTitles] = useState<string[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [showAllPantryItems, setShowAllPantryItems] = useState(false);
  const [showAllMatchedRecipes, setShowAllMatchedRecipes] = useState(false);
  const [isTimeSliderActive, setIsTimeSliderActive] = useState(false);
  const [isExtraSliderActive, setIsExtraSliderActive] = useState(false);

  useEffect(() => {
    if (!isTimeSliderActive) return;
    const handleRelease = () => setIsTimeSliderActive(false);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    window.addEventListener('touchend', handleRelease);
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
      window.removeEventListener('touchend', handleRelease);
    };
  }, [isTimeSliderActive]);

  useEffect(() => {
    if (!isExtraSliderActive) return;
    const handleRelease = () => setIsExtraSliderActive(false);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    window.addEventListener('touchend', handleRelease);
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
      window.removeEventListener('touchend', handleRelease);
    };
  }, [isExtraSliderActive]);

  const nutritionGoal =
    proteinFilter === 'high' || proteinFilter === 'very-high'
      ? 'high_protein'
      : calorieFilter === 'high'
      ? 'high_calorie'
      : 'balanced';

  const activeCustomSettingsCount = [
    extraWishes.trim().length > 0,
    maxExtraIngredients !== 2,
    calorieFilter !== 'all',
    proteinFilter !== 'all',
    difficulty !== 'all',
  ].filter(Boolean).length;

  const getFilterSummary = () => {
    const parts: string[] = [];
    if (calorieFilter === 'high') parts.push('750+ kcal');
    else if (calorieFilter === 'low') parts.push('< 500 kcal');
    else if (calorieFilter === 'moderate') parts.push('500–700 kcal');

    if (proteinFilter === 'high') parts.push('30+ g Protein');
    else if (proteinFilter === 'very-high') parts.push('40+ g Protein');
    else if (proteinFilter === 'medium') parts.push('20+ g Protein');

    if (parts.length === 0) return 'Ausgewogen';
    return parts.join(' • ');
  };

  const togglePantryItem = (item: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients((prev) => [...prev, trimmed]);
      setCustomInput('');
    }
  };

  // Step 1: Lightweight Idea Generation (saves token usage)
  const fetchIdea = async (exclude: string[]) => {
    try {
      setModalErrorMessage(null);
      const response = await fetch('/api/ai/fridge-cook-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          isVegan,
          maxTimeMinutes: maxTime,
          difficulty: difficulty === 'all' ? 'Beliebig' : difficulty,
          mealType: 'Hauptgericht',
          extraWishes,
          maxAdditionalIngredients: maxExtraIngredients,
          calorieFilter,
          proteinFilter,
          excludeTitles: exclude,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.idea) {
        const errorDetail = data?.error || 'Die Rezeptidee konnte nicht generiert werden. Bitte versuche es noch einmal.';
        throw new Error(errorDetail);
      }

      setCurrentIdea(data.idea);
    } catch (err: any) {
      console.error('Failed to get fridge cook idea:', err);
      setModalErrorMessage(err?.message || 'Die Rezeptidee konnte nicht geladen werden. Bitte versuche es noch einmal.');
    } finally {
      setIsLoadingIdea(false);
      setIsGenerating(false);
    }
  };

  const handleStartIdeaGeneration = async () => {
    if (selectedIngredients.length === 0) return;
    setIsGenerating(true);
    setIsIdeaModalOpen(true);
    setIsLoadingIdea(true);
    setErrorMessage(null);
    setModalErrorMessage(null);
    setAttemptNumber(1);
    setRejectedIdeaTitles([]);

    await fetchIdea([]);
  };

  const handleRetryIdea = async () => {
    if (!currentIdea) return;
    const updatedRejected = [...rejectedIdeaTitles, currentIdea.title];
    setRejectedIdeaTitles(updatedRejected);
    setAttemptNumber((prev) => prev + 1);
    setIsLoadingIdea(true);
    setModalErrorMessage(null);

    await fetchIdea(updatedRejected);
  };

  // Step 2: Final Recipe Generation based on chosen idea
  const handleConfirmCreateFinalRecipe = async (approvedExtras: string[] = []) => {
    if (!currentIdea || selectedIngredients.length === 0) return;
    setIsCreatingFinalRecipe(true);
    setErrorMessage(null);
    setModalErrorMessage(null);

    const proposed = currentIdea.additionalIngredientsProposed || [];
    const excludedExtras = proposed.filter((item) => !approvedExtras.includes(item));

    try {
      const response = await fetch('/api/ai/fridge-cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          isVegan,
          maxTimeMinutes: maxTime,
          difficulty: difficulty === 'all' ? 'Beliebig' : difficulty,
          mealType: 'Hauptgericht',
          extraWishes,
          maxAdditionalIngredients: maxExtraIngredients,
          includeBasics,
          nutritionGoal,
          calorieFilter,
          proteinFilter,
          chosenIdeaTitle: currentIdea.title,
          chosenIdeaPitch: currentIdea.pitch,
          chosenIdeaCategory: currentIdea.category,
          approvedAdditionalIngredients: approvedExtras,
          excludedAdditionalIngredients: excludedExtras,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.recipe) {
        const errorDetail = data?.error || 'Das finale Rezept konnte nicht erstellt werden. Bitte versuche es noch einmal.';
        throw new Error(errorDetail);
      }

      const raw = data.recipe;

      const newRec: Recipe = {
        id: `ai-rec-${Date.now()}`,
        title: raw.title || currentIdea.title,
        subtitle: raw.subtitle || `Gekocht mit ${selectedIngredients.slice(0, 3).join(', ')}`,
        image: '', // Keine Bilder für neu generierte Gerichte (spart Token & API-Usage wie gefordert)
        category: raw.category || currentIdea.category || 'Schnelle Küche',
        isVegan: !!raw.isVegan,
        isVegetarian: true,
        prepTimeMinutes: raw.prepTimeMinutes || 10,
        cookTimeMinutes: raw.cookTimeMinutes || 15,
        totalTimeMinutes: (raw.prepTimeMinutes || 10) + (raw.cookTimeMinutes || 15),
        difficulty: raw.difficulty || 'Einfach',
        servings: 2,
        rating: 5.0,
        reviewCount: 1,
        tags: [isVegan ? 'Vegan' : 'Vegetarisch', 'Resteverwertung', currentIdea.category || 'Schnelle Küche'],
        nutrients: {
          calories: raw.calories || currentIdea.estimatedCalories || 450,
          protein: raw.protein || currentIdea.estimatedProtein || 20,
          carbs: raw.carbs || 50,
          fat: raw.fat || 15,
          fiber: raw.fiber || 9,
          iron: raw.iron || 4.0,
        },
        ingredients: (raw.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: ing.amount || 'nach Bedarf',
          unit: ing.unit || '',
          category: 'gemuese',
          source: ing.origin || (ing.isExtra ? 'extra' : 'pantry'),
        })),
        steps: (raw.steps || []).map((step: any, index: number) => {
          if (typeof step === 'string') {
            return {
              stepNumber: index + 1,
              title: `Schritt ${index + 1}`,
              text: step,
            };
          }
          return {
            stepNumber: step.stepNumber || index + 1,
            title: step.title || `Schritt ${index + 1}`,
            text: step.text || '',
            timerMinutes: typeof step.timerMinutes === 'number' ? step.timerMinutes : undefined,
          };
        }),
        chefTip: raw.chefTips || raw.chefTip || currentIdea.pitch,
        isCustomAi: true,
      };

      setGeneratedRecipe(newRec);
      onSaveCustomRecipe(newRec);
      setHasSaved(true);
      setIsIdeaModalOpen(false);
      onCopyFeedback(`"${newRec.title}" erfolgreich erstellt! 🌱`);

      // Navigiere direkt auf die Seite des neu erstellten Rezepts mit passender URL (/recipes/:id)
      navigate(`/recipes/${newRec.id}`);
    } catch (err: any) {
      console.error('Failed to create final recipe:', err);
      setModalErrorMessage(err?.message || 'Das finale Rezept konnte nicht erstellt werden. Bitte versuche es noch einmal.');
    } finally {
      setIsCreatingFinalRecipe(false);
    }
  };

  const handleRetryAfterError = async () => {
    setModalErrorMessage(null);
    if (currentIdea) {
      await handleConfirmCreateFinalRecipe();
    } else {
      setIsLoadingIdea(true);
      await fetchIdea(rejectedIdeaTitles);
    }
  };

  const handleSaveToCollection = () => {
    if (generatedRecipe) {
      onSaveCustomRecipe(generatedRecipe);
      setHasSaved(true);
      onCopyFeedback(`"${generatedRecipe.title}" wurde in deine Rezeptsammlung gespeichert!`);
    }
  };

  // Find matching existing recipes
  const matchedExistingRecipes = allRecipes
    .filter((r) => {
      if (isVegan && !r.isVegan) return false;
      const ingNames = r.ingredients.map((i) => i.name.toLowerCase());
      return selectedIngredients.some((sel) =>
        ingNames.some((ing) => ing.includes(sel.toLowerCase()) || sel.toLowerCase().includes(ing))
      );
    })
    .sort((a, b) => {
      if (proteinFilter === 'high' || proteinFilter === 'very-high') {
        const diff = (b.nutrients?.protein || 0) - (a.nutrients?.protein || 0);
        if (Math.abs(diff) > 4) return diff;
      }
      if (calorieFilter === 'high') {
        const diff = (b.nutrients?.calories || 0) - (a.nutrients?.calories || 0);
        if (Math.abs(diff) > 60) return diff;
      }
      if (calorieFilter === 'low') {
        const diff = (a.nutrients?.calories || 0) - (b.nutrients?.calories || 0);
        if (Math.abs(diff) > 60) return diff;
      }
      const aMatches = selectedIngredients.filter((sel) =>
        a.ingredients.some((i) => i.name.toLowerCase().includes(sel.toLowerCase()))
      ).length;
      const bMatches = selectedIngredients.filter((sel) =>
        b.ingredients.some((i) => i.name.toLowerCase().includes(sel.toLowerCase()))
      ).length;
      return bMatches - aMatches;
    });

  const availablePantryItems = PANTRY_QUICK_ITEMS.filter((item) => !selectedIngredients.includes(item));
  const displayedPantryItems = showAllPantryItems ? availablePantryItems : availablePantryItems.slice(0, 14);

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Intro Banner - clean neutral card matching app theme */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 text-[#2D3E40] shadow-xs border border-[#ECEBE8]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#4A7856]" />
            Vorratskammer &amp; KI-Rezeptsuche
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2D3E40] leading-tight">
            Was hast du im Kühlschrank?
          </h1>
          <p className="text-base text-[#686E6A] leading-relaxed">
            Zutaten wählen und passende Rezepte finden.
          </p>
        </div>
      </div>

      {/* Main Ingredient Selector Section - 2 Ebenen: Äußere weiße Karte → Eingabeelemente */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs space-y-5 sm:space-y-6">
        {/* Selected Items Tags */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#686E6A]">
              Deine ausgewählten Zutaten
            </h2>
            {selectedIngredients.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIngredients([])}
                className="text-xs text-[#686E6A] hover:text-[#D35400] font-medium cursor-pointer"
              >
                Alle entfernen
              </button>
            )}
          </div>

          <motion.div
            layoutRoot
            layout
            className="flex flex-wrap gap-2.5 min-h-[44px] items-center relative py-1"
          >
            {selectedIngredients.length === 0 ? (
              <div className="w-full py-3 px-4 rounded-xl border border-dashed border-[#ECEBE8] bg-[#FAF9F6] flex items-center justify-center text-xs text-[#686E6A] font-medium text-center">
                Noch keine Zutaten gewählt. Tippe unten auf Vorräte oder gib eigene ein.
              </div>
            ) : (
              selectedIngredients.map((item) => (
                <motion.button
                  layout="position"
                  layoutId={`ingredient-token-${item}`}
                  key={item}
                  type="button"
                  onClick={() => togglePantryItem(item)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{
                    layout: {
                      type: 'spring',
                      stiffness: 650,
                      damping: 32,
                      mass: 0.5,
                    },
                    default: {
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      mass: 0.6,
                    },
                  }}
                  className="inline-flex items-center gap-2 h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F1F5F2] text-[#4A7856] text-sm font-semibold border border-[#4A7856]/40 hover:border-[#4A7856] cursor-pointer touch-manipulation transition-colors select-none group"
                  title={`${item} wieder zurücklegen / entfernen`}
                >
                  <span>{item}</span>
                  <X className="w-4 h-4 text-[#4A7856]/80 group-hover:text-[#D35400] transition-colors" />
                </motion.button>
              ))
            )}
          </motion.div>
        </div>

        {/* Custom Input Form - mit getöntem Hintergrund und Akzent '+' Button */}
        <form onSubmit={handleAddCustom} className="flex gap-2.5">
          <input
            id="custom-ingredient-input"
            type="text"
            placeholder="Zutat eingeben (z.B. Champignons, Cashewkerne)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 h-12 min-h-[48px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] rounded-xl px-4 py-2.5 text-base font-medium text-[#2D3E40] focus:outline-hidden transition-all placeholder:text-[#686E6A]"
          />
          <button
            type="submit"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation active:scale-95 transition-colors shadow-2xs"
            title="Zutat hinzufügen"
            aria-label="Zutat hinzufügen"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Pantry Item Pills - leicht getönter Hintergrund, linksbündiges 'Mehr anzeigen' */}
        <div className="space-y-2">
          <label className="block text-[16px] font-bold text-[#2D3E40]">
            Häufige Vorräte &amp; Frischezutaten
          </label>
          <motion.div
            layoutRoot
            layout
            className="flex flex-wrap gap-2.5 py-0.5"
          >
            {displayedPantryItems.map((item) => (
              <motion.button
                layout="position"
                layoutId={`ingredient-token-${item}`}
                key={item}
                type="button"
                onClick={() => togglePantryItem(item)}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{
                  layout: {
                    type: 'spring',
                    stiffness: 650,
                    damping: 32,
                    mass: 0.5,
                  },
                  default: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 0.6,
                  },
                }}
                className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors select-none cursor-pointer touch-manipulation flex items-center gap-1.5 bg-[#FAF9F6] text-[#686E6A] hover:border-[#4A7856]/50 hover:text-[#2D3E40] border border-[#ECEBE8] group"
              >
                <span className="text-[#686E6A] group-hover:text-[#4A7856] font-bold">+</span>
                <span>{item}</span>
              </motion.button>
            ))}
          </motion.div>
          {availablePantryItems.length > 14 && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAllPantryItems((prev) => !prev)}
                className="text-xs font-semibold text-[#686E6A] hover:text-[#2D3E40] flex items-center gap-1.5 py-1 px-0 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[36px]"
              >
                <span>{showAllPantryItems ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#686E6A] transition-transform duration-200 ${showAllPantryItems ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Dünne Trennlinie */}
        <div className="border-t border-[#ECEBE8]" />

        {/* Zeile 1: Ernährungsweise als Segmented Control (links) & Schieberegler für Zeit (rechts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 items-start">
          {/* Ernährungsweise Segmented Control */}
          <div>
            <label className="block text-[16px] font-bold text-[#2D3E40] mb-2">
              Ernährungsweise
            </label>
            <div className="bg-[#FAF9F6] p-1 rounded-xl grid grid-cols-2 gap-1.5 h-12 min-h-[48px] items-center border border-[#ECEBE8]">
              <button
                type="button"
                id="fridge-diet-veggie-btn"
                onClick={() => setIsVegan(false)}
                className={`h-10 min-h-[40px] px-3 text-[16px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                  !isVegan
                    ? 'bg-[#4A7856] text-white shadow-2xs font-semibold'
                    : 'text-[#57534d] hover:text-[#2D3E40] border-0 bg-transparent font-medium'
                }`}
              >
                <span style={{ color: !isVegan ? '#ffffff' : '#57534d', fontSize: '16px' }}>Veggie</span>
              </button>
              <button
                type="button"
                id="fridge-diet-vegan-btn"
                onClick={() => setIsVegan(true)}
                className={`h-10 min-h-[40px] px-3 text-[16px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                  isVegan
                    ? 'bg-[#4A7856] text-white shadow-2xs font-semibold'
                    : 'text-[#57534d] hover:text-[#2D3E40] border-0 bg-transparent font-medium'
                }`}
              >
                <Leaf className="w-4 h-4 shrink-0" />
                <span style={{ color: isVegan ? '#ffffff' : '#57534d', fontSize: '16px' }}>Vegan</span>
              </button>
            </div>
          </div>

          {/* Schieberegler für Zeit - ohne Icon im Label, 22px Thumb & Track-Füllung */}
          <div className="flex flex-col justify-center min-h-[48px]">
            <div className="flex items-center justify-between mb-2 min-h-[26px]">
              <label htmlFor="fridge-time-slider" className="text-[16px] font-bold text-[#2D3E40]">
                Max. Zeit:
              </label>
              <AnimatePresence>
                {!isTimeSliderActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="px-2 py-0.5 rounded-full bg-[#F1F5F2] border border-[#ECEBE8] text-[#4A7856] font-bold text-xs tabular-nums"
                  >
                    {maxTime} Min.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative py-2.5 flex items-center">
              {/* Dynamische iOS-Wert-Pille */}
              <AnimatePresence>
                {isTimeSliderActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 7, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.88 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      left: `calc(${((maxTime - 15) / (50 - 15)) * 100}% + ${(0.5 - (maxTime - 15) / (50 - 15)) * 24}px)`,
                    }}
                    className="absolute bottom-[calc(50%+26px)] -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center select-none"
                  >
                    <div className="px-4 py-1 rounded-full bg-white border border-[#D3DCD5] shadow-lg text-[#355F40] font-extrabold text-[17px] tabular-nums whitespace-nowrap">
                      {maxTime} Min.
                    </div>
                    <div className="w-3 h-3 bg-white border-r border-b border-[#D3DCD5] rotate-45 -mt-1.5 shadow-xs" />
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                id="fridge-time-slider"
                type="range"
                min="15"
                max="50"
                step="5"
                value={maxTime}
                onPointerDown={() => setIsTimeSliderActive(true)}
                onPointerUp={() => setIsTimeSliderActive(false)}
                onPointerCancel={() => setIsTimeSliderActive(false)}
                onTouchStart={() => setIsTimeSliderActive(true)}
                onTouchEnd={() => setIsTimeSliderActive(false)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val !== maxTime && typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  setMaxTime(val);
                }}
                className="ios-slider"
                style={{
                  background: `linear-gradient(to right, #4A7856 ${((maxTime - 15) / (50 - 15)) * 100}%, #E3E8E5 ${((maxTime - 15) / (50 - 15)) * 100}%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[13px] text-[#686E6A] font-medium tabular-nums px-0.5">
              <span>15 Min.</span>
              <span>50 Min.</span>
            </div>
          </div>
        </div>

        {/* Dünne Trennlinie vor Wünsche & Feineinstellungen */}
        <div className="border-t border-[#ECEBE8]" />

        {/* Wünsche & Feineinstellungen - Gestaltete Kopfzeile mit App-Tint & 2px Linie links */}
        <div className="space-y-3">
          {/* Accordion Toggle Header */}
          <button
            type="button"
            id="fridge-toggle-wishes-mobile-btn"
            onClick={() => setIsPreferencesOpenOnMobile((prev) => !prev)}
            aria-expanded={isPreferencesOpenOnMobile}
            aria-controls="fridge-extra-wishes-section"
            className="w-full min-h-[48px] p-3 sm:p-4 rounded-xl bg-[#F1F5F2] hover:bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/40 flex items-center justify-between text-left cursor-pointer select-none touch-manipulation transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center text-[#4A7856] shrink-0">
                <Sliders className="w-5 h-5 text-[#4A7856]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#2D3E40]">
                    Wünsche &amp; Feineinstellungen
                  </span>
                </div>
                {/* Untertitel / Zusammenfassung */}
                <p className="text-xs text-[#686E6A] truncate mt-0.5">
                  {extraWishes.trim()
                    ? extraWishes.trim().length > 20
                      ? `"${extraWishes.trim().slice(0, 18)}..."`
                      : `"${extraWishes.trim()}"`
                    : 'Keine Wünsche'}
                  {' · '}
                  {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients} Extras`}
                  {calorieFilter !== 'all' && ` · ${calorieFilter === 'high' ? '750+ kcal' : calorieFilter === 'low' ? '< 500 kcal' : '500–700 kcal'}`}
                  {proteinFilter !== 'all' && ` · ${proteinFilter === 'very-high' ? '40+ g' : proteinFilter === 'high' ? '30+ g' : '20+ g'}`}
                  {difficulty !== 'all' && ` · ${difficulty}`}
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#686E6A] group-hover:text-[#4A7856] transition-colors shrink-0 ml-2">
              <ChevronDown
                className={`w-5 h-5 text-[#4A7856] transition-transform duration-200 shrink-0 ${
                  isPreferencesOpenOnMobile ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          {/* Accordion Content mit Schritt-für-Schritt Timeline wie in der Rezept-Detailansicht */}
          <div
            id="fridge-extra-wishes-section"
            className={`grid transition-all duration-250 ease-in-out ${
              isPreferencesOpenOnMobile ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="pt-3 pb-1">
                <div className="relative pl-1 sm:pl-3 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[#ECEBE8]">
                  {/* Schritt 1: Wünsche */}
                  <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                    {/* Timeline indicator circle */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-white ${
                        extraWishes.trim()
                          ? 'bg-[#4A7856] text-white shadow-2xs'
                          : 'bg-white border-2 border-[#4A7856] text-[#4A7856]'
                      }`}
                    >
                      {extraWishes.trim() ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[16px] font-bold text-[#2D3E40]">
                          Wünsche
                        </h4>
                        {extraWishes.trim() && (
                          <span className="text-[11px] font-semibold text-[#4A7856] bg-[#F1F5F2] px-2 py-0.5 rounded-full border border-[#ECEBE8]">
                            Aktiv
                          </span>
                        )}
                      </div>

                      <textarea
                        rows={1}
                        placeholder="z.B. cremig, One-Pot, ohne Zwiebeln..."
                        value={extraWishes}
                        onChange={(e) => {
                          setExtraWishes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                        }}
                        onInput={(e) => {
                          const target = e.currentTarget;
                          target.style.height = 'auto';
                          target.style.height = `${Math.max(48, target.scrollHeight)}px`;
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${Math.max(48, el.scrollHeight)}px`;
                          }
                        }}
                        className="w-full min-h-[48px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] rounded-xl px-4 py-3 text-base font-medium text-[#2D3E40] focus:outline-hidden transition-colors placeholder:text-[#686E6A] resize-none overflow-hidden leading-normal"
                      />
                    </div>
                  </div>

                  {/* Schritt 2: Zusätzliche Zutaten */}
                  <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                    {/* Timeline indicator circle */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-white ${
                        maxExtraIngredients !== 2
                          ? 'bg-[#4A7856] text-white shadow-2xs'
                          : 'bg-white border-2 border-[#4A7856] text-[#4A7856]'
                      }`}
                    >
                      {maxExtraIngredients !== 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                      <div className="flex items-center justify-between gap-2 min-h-[26px]">
                        <h4 className="text-[16px] font-bold text-[#2D3E40]">
                          Zusätzliche Zutaten
                        </h4>
                        <AnimatePresence>
                          {!isExtraSliderActive && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="px-2.5 py-0.5 rounded-full bg-[#F1F5F2] border border-[#ECEBE8] text-[#4A7856] font-bold text-xs tabular-nums shrink-0"
                            >
                              {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients}`}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="pt-1">
                        <div className="relative py-2.5 flex items-center">
                          {/* Dynamische iOS-Wert-Pille */}
                          <AnimatePresence>
                            {isExtraSliderActive && (
                              <motion.div
                                initial={{ opacity: 0, y: 7, scale: 0.85 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.88 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                  left: `calc(${(maxExtraIngredients / 6) * 100}% + ${(0.5 - maxExtraIngredients / 6) * 24}px)`,
                                }}
                                className="absolute bottom-[calc(50%+26px)] -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center select-none"
                              >
                                <div className="px-4 py-1 rounded-full bg-white border border-[#D3DCD5] shadow-lg text-[#355F40] font-extrabold text-[17px] tabular-nums whitespace-nowrap">
                                  {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients}`}
                                </div>
                                <div className="w-3 h-3 bg-white border-r border-b border-[#D3DCD5] rotate-45 -mt-1.5 shadow-xs" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <input
                            id="ai-extra-ingredients-slider"
                            type="range"
                            min="0"
                            max="6"
                            step="1"
                            value={maxExtraIngredients}
                            onPointerDown={() => setIsExtraSliderActive(true)}
                            onPointerUp={() => setIsExtraSliderActive(false)}
                            onPointerCancel={() => setIsExtraSliderActive(false)}
                            onTouchStart={() => setIsExtraSliderActive(true)}
                            onTouchEnd={() => setIsExtraSliderActive(false)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val !== maxExtraIngredients && typeof window !== 'undefined' && 'vibrate' in navigator) {
                                try { navigator.vibrate(8); } catch {}
                              }
                              setMaxExtraIngredients(val);
                            }}
                            className="ios-slider"
                            style={{
                              background: `linear-gradient(to right, #4A7856 ${(maxExtraIngredients / 6) * 100}%, #E3E8E5 ${(maxExtraIngredients / 6) * 100}%)`,
                            }}
                          />
                        </div>
                        {/* Mobile: gerade Zahlen (0, 2, 4, 6) auf der X-Achse */}
                        <div className="sm:hidden flex justify-between text-[13px] text-[#686E6A] mt-1.5 font-semibold tabular-nums px-1 select-none">
                          <span>0</span>
                          <span aria-hidden="true" className="invisible">1</span>
                          <span>2</span>
                          <span aria-hidden="true" className="invisible">3</span>
                          <span>4</span>
                          <span aria-hidden="true" className="invisible">5</span>
                          <span>6</span>
                        </div>
                        {/* Desktop: Bezeichner */}
                        <div className="hidden sm:flex justify-between text-[13px] text-[#686E6A] mt-1.5 font-medium tabular-nums px-0.5">
                          <span>Keine Zukäufe</span>
                          <span>1–2 Zutaten</span>
                          <span>3 Zutaten</span>
                          <span>Bis zu 6</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schritt 3: Nährwerte & Feintuning */}
                  <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                    {/* Timeline indicator circle */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-white ${
                        calorieFilter !== 'all' || proteinFilter !== 'all' || difficulty !== 'all'
                          ? 'bg-[#4A7856] text-white shadow-2xs'
                          : 'bg-white border-2 border-[#4A7856] text-[#4A7856]'
                      }`}
                    >
                      {calorieFilter !== 'all' || proteinFilter !== 'all' || difficulty !== 'all' ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        '3'
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5 space-y-2.5">
                      <h4 className="text-[16px] font-bold text-[#2D3E40]">
                        Nährwerte &amp; Anspruch
                      </h4>

                      {/* 3 Dropdowns in einer Reihe - Labels direkt in den Boxen */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {/* Kalorien */}
                        <div className="relative">
                          <select
                            id="fridge-filter-calories"
                            aria-label="Kalorien"
                            value={calorieFilter}
                            onChange={(e) => setCalorieFilter(e.target.value)}
                            style={{ color: '#57534d' }}
                            className={`w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                              calorieFilter === 'all' ? '' : 'font-semibold'
                            }`}
                          >
                            <option value="all">Kalorien: Alle</option>
                            <option value="low">&lt; 500 kcal</option>
                            <option value="moderate">500–700 kcal</option>
                            <option value="high">750+ kcal</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Proteine */}
                        <div className="relative">
                          <select
                            id="fridge-filter-protein"
                            aria-label="Proteine"
                            value={proteinFilter}
                            onChange={(e) => setProteinFilter(e.target.value)}
                            style={{ color: '#57534d' }}
                            className={`w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                              proteinFilter === 'all' ? '' : 'font-semibold'
                            }`}
                          >
                            <option value="all">Protein: Alle</option>
                            <option value="medium">20+ g</option>
                            <option value="high">30+ g</option>
                            <option value="very-high">40+ g</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Schwierigkeit */}
                        <div className="relative">
                          <select
                            id="fridge-filter-difficulty"
                            aria-label="Schwierigkeit"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            style={{ color: '#57534d' }}
                            className={`w-full appearance-none h-11 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] text-[13px] sm:text-sm font-medium rounded-xl pl-2.5 sm:pl-3 pr-6 py-2 cursor-pointer focus:outline-none transition-colors text-[#57534d] ${
                              difficulty === 'all' ? '' : 'font-semibold'
                            }`}
                          >
                            <option value="all">Schwierigkeit: Alle</option>
                            <option value="Einfach">Einfach</option>
                            <option value="Mittel">Mittel</option>
                            <option value="Anspruchsvoll">Anspruchsvoll</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dünne Trennlinie vor dem Generate Button */}
        <div className="border-t border-[#ECEBE8]" />

        {/* Error notification if AI failed */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <div>
                <div className="font-semibold text-red-800">Rezept-Generierung fehlgeschlagen</div>
                <div className="text-red-700 text-xs mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-red-800 hover:underline shrink-0"
            >
              Schließen
            </button>
          </div>
        )}

        {/* Generate Button - Primary CTA: Immer h-12 (48px), rounded-xl, text-base, font-semibold */}
        <div className="pt-1">
          <button
            id="generate-fridge-recipe-btn"
            disabled={isGenerating || selectedIngredients.length === 0}
            onClick={handleStartIdeaGeneration}
            className="w-full h-12 min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Kombiniere Vorräte zu einer Rezeptidee...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-white" />
                <span>
                  {selectedIngredients.length === 0
                    ? 'Wähle mindestens 1 Zutat aus'
                    : proteinFilter === 'high' || proteinFilter === 'very-high'
                    ? `High-Protein-Idee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : calorieFilter === 'high'
                    ? `Kalorienreiche Rezeptidee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : calorieFilter === 'low'
                    ? `Leichte Rezeptidee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : `Rezeptidee aus ${selectedIngredients.length} Vorratszutat${selectedIngredients.length > 1 ? 'en' : ''} vorschlagen`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated AI Recipe Result Card */}
      {generatedRecipe && (
        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-md space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#ECEBE8] pb-3 sm:pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FDF6F0] text-[#D35400] border border-[#ECEBE8] text-xs font-semibold">
                  ✨ KI-Rezept
                </span>
                {generatedRecipe.isVegan && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                    🌱 Vegan
                  </span>
                )}
                {(proteinFilter === 'high' || proteinFilter === 'very-high') && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                    <Dumbbell className="w-3 h-3" />
                    {proteinFilter === 'very-high' ? '40+ g Protein' : '30+ g Protein'}
                  </span>
                )}
                {proteinFilter === 'medium' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                    <Dumbbell className="w-3 h-3" />
                    20+ g Protein
                  </span>
                )}
                {calorieFilter === 'high' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    <Flame className="w-3 h-3 text-amber-500" />
                    750+ kcal
                  </span>
                )}
                {calorieFilter === 'low' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <Flame className="w-3 h-3 text-emerald-600" />
                    &lt; 500 kcal
                  </span>
                )}
                {calorieFilter === 'moderate' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#57534d] border border-[#ECEBE8] text-xs font-semibold">
                    500–700 kcal
                  </span>
                )}
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-[#2D3E40] tracking-tight leading-tight">
                {generatedRecipe.title}
              </h3>
              <p className="text-base text-[#686E6A] leading-relaxed mt-1">
                {generatedRecipe.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="save-custom-ai-recipe-btn"
                onClick={handleSaveToCollection}
                disabled={hasSaved}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                  hasSaved
                    ? 'bg-[#4A7856] text-white'
                    : 'bg-[#2D3E40] hover:bg-[#1F2C2D] text-white'
                }`}
              >
                {hasSaved ? <Check className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                <span>{hasSaved ? 'Gespeichert' : 'Speichern'}</span>
              </button>

              <button
                onClick={() => onSelectRecipe(generatedRecipe)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold bg-[#FAF9F6] border border-[#ECEBE8] text-[#57534d] hover:bg-[#F1F5F2] shadow-xs"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#4A7856]" />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF9F6] p-4 rounded-xl border border-[#ECEBE8]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4A7856]" />
              <span className="text-xs text-[#2D3E40]"><strong>{generatedRecipe.totalTimeMinutes} Min.</strong> Zeit</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#E67E22]" />
              <span className="text-xs text-[#2D3E40]"><strong>{generatedRecipe.nutrients.calories}</strong> kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#4A7856]" />
              <span className="text-xs text-[#2D3E40]"><strong>{generatedRecipe.nutrients.protein}g</strong> Protein</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#57534d]" />
              <span className="text-xs text-[#2D3E40]"><strong>{generatedRecipe.nutrients.fiber}g</strong> Ballaststoffe</span>
            </div>
          </div>

          {/* Ingredients & Steps Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ingredients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#57534d] uppercase tracking-wider">
                  Zutaten · {generatedRecipe.ingredients.length}
                </h4>
                {(() => {
                  const extraCount = generatedRecipe.ingredients.filter((i) => (i as any).source === 'extra').length;
                  return (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#ECEBE8] text-[#4A7856] font-semibold">
                      {extraCount === 0 ? '0 Extras' : `${extraCount} Zusatz-Zutat${extraCount > 1 ? 'en' : ''}`}
                    </span>
                  );
                })()}
              </div>
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#ECEBE8] space-y-1.5">
                {generatedRecipe.ingredients.map((ing, idx) => {
                  const src = (ing as any).source;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#ECEBE8] last:border-0 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[#2D3E40] truncate">{ing.name}</span>
                        {src === 'extra' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF] shrink-0 font-medium">
                            Zusatz
                          </span>
                        )}
                        {src === 'basic' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-white text-[#686E6A] border border-[#ECEBE8] shrink-0 font-medium">
                            Basic
                          </span>
                        )}
                        {src === 'pantry' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] shrink-0 font-medium">
                            Vorrat
                          </span>
                        )}
                      </div>
                      <span className="text-[#686E6A] font-semibold shrink-0">{ing.amount} {ing.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="text-xs font-semibold text-[#57534d] uppercase tracking-wider">
                Zubereitung
              </h4>
              <div className="space-y-2.5">
                {generatedRecipe.steps.map((step) => (
                  <div key={step.stepNumber} className="flex items-start gap-3 p-3 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8]">
                    <div className="w-6 h-6 rounded-md bg-[#2D3E40] text-white flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      {step.title && (
                        <h5 className="font-semibold text-xs text-[#2D3E40] mb-0.5">
                          {step.title}
                        </h5>
                      )}
                      <p className="text-sm text-[#2D3E40] leading-relaxed">
                        {step.text}
                      </p>
                      {step.timerMinutes && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#ECEBE8] text-[#4A7856] text-xs font-semibold">
                          <Clock className="w-3 h-3" />
                          Timer: {step.timerMinutes} Min.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chef Tip */}
          {generatedRecipe.chefTip && (
            <div className="p-4 bg-[#FDF6F0] rounded-xl border border-[#F5EADF] text-xs text-[#2D3E40]">
              <strong className="text-[#D35400]">💡 Chefkoch-Tipp:</strong> {generatedRecipe.chefTip}
            </div>
          )}
        </div>
      )}

      {/* Matched Database Recipes */}
      {matchedExistingRecipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2D3E40]">
                Oder entdecke passende Rezepte aus unserer Sammlung:
              </h3>
              {(proteinFilter === 'high' || proteinFilter === 'very-high') && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                  <Dumbbell className="w-3 h-3" />
                  Nach Protein sortiert
                </span>
              )}
              {calorieFilter === 'high' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#57534d] text-xs font-semibold border border-[#ECEBE8]">
                  <Flame className="w-3 h-3 text-amber-500" />
                  Nach Kalorien sortiert
                </span>
              )}
              {calorieFilter === 'low' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <Flame className="w-3 h-3 text-emerald-600" />
                  Nach leichten Rezepten sortiert
                </span>
              )}
            </div>
            <span className="text-xs text-[#686E6A]">{matchedExistingRecipes.length} Treffer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAllMatchedRecipes ? matchedExistingRecipes : matchedExistingRecipes.slice(0, 3)).map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                className="flex gap-3.5 bg-white p-3.5 rounded-2xl border border-[#ECEBE8] hover:border-[#4A7856]/40 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0">
                  <RecipeImage
                    recipe={recipe}
                    alt={recipe.title}
                    imgClassName="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    size="sm"
                  />
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                      {recipe.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-[16px] text-[#2D3E40] truncate group-hover:text-[#4A7856] transition-colors leading-snug">
                    {recipe.title}
                  </h4>
                  <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-[#686E6A] font-medium mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#8A918D]" />
                      <span>{recipe.totalTimeMinutes} Min.</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-600/80" />
                      <span>{recipe.nutrients.calories} kcal</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#4A7856] font-bold">
                      <Dumbbell className="w-3.5 h-3.5 text-[#4A7856]" />
                      <span>{recipe.nutrients.protein}g</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {matchedExistingRecipes.length > 3 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllMatchedRecipes((prev) => !prev)}
                className="text-xs sm:text-sm font-semibold text-[#686E6A] hover:text-[#2D3E40] flex items-center gap-1.5 py-2 px-1 bg-transparent border-0 transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                <span>{showAllMatchedRecipes ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#686E6A] transition-transform duration-200 ${
                    showAllMatchedRecipes ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Two-step Fridge Cook Idea Modal (pitch approval before full generation to save AI tokens) */}
      <FridgeIdeaModal
        isOpen={isIdeaModalOpen}
        onClose={() => {
          setIsIdeaModalOpen(false);
          setModalErrorMessage(null);
        }}
        idea={currentIdea}
        isLoadingIdea={isLoadingIdea}
        isCreatingFinalRecipe={isCreatingFinalRecipe}
        errorMessage={modalErrorMessage}
        onConfirmCreate={handleConfirmCreateFinalRecipe}
        onRetryIdea={handleRetryIdea}
        onRetryAfterError={handleRetryAfterError}
        onCancel={() => {
          setIsIdeaModalOpen(false);
          setModalErrorMessage(null);
        }}
        isVegan={isVegan}
        attemptNumber={attemptNumber}
      />
    </div>
  );
};
