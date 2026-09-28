import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Plus, 
  X, 
  ChefHat, 
  Clock, 
  Dumbbell, 
  Flame, 
  Check, 
  ArrowRight,
  BookOpen,
  RotateCcw,
  Sliders,
  Zap,
  ChevronDown
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
  const [isPreferencesOpenOnMobile, setIsPreferencesOpenOnMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<FridgeCookIdea | null>(null);
  const [isLoadingIdea, setIsLoadingIdea] = useState(false);
  const [isCreatingFinalRecipe, setIsCreatingFinalRecipe] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [rejectedIdeaTitles, setRejectedIdeaTitles] = useState<string[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [showAllPantryItems, setShowAllPantryItems] = useState(false);

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
  const handleConfirmCreateFinalRecipe = async () => {
    if (!currentIdea || selectedIngredients.length === 0) return;
    setIsCreatingFinalRecipe(true);
    setErrorMessage(null);
    setModalErrorMessage(null);

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
            Vorhandene Zutaten wählen und passende Gerichte oder KI-Rezepte entdecken.
          </p>
        </div>
      </div>

      {/* Main Ingredient Selector Section - 2 Ebenen: Äußere weiße Karte → Eingabeelemente */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs space-y-7 sm:space-y-8">
        {/* Selected Items Tags */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#686E6A]">
                Deine ausgewählten Zutaten
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#E3EBE5] text-[#4A7856] text-xs font-bold tabular-nums">
                {selectedIngredients.length}
              </span>
            </div>
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
              <div className="w-full py-3 px-4 rounded-xl border border-dashed border-[#CCD5CF] bg-[#FAF9F6] flex items-center justify-center text-xs text-[#686E6A] font-medium text-center">
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
                  className="inline-flex items-center gap-2 h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F1F5F2] hover:bg-[#E8F0EA] text-[#4A7856] text-sm font-semibold border border-[#CCD5CF] cursor-pointer touch-manipulation transition-colors select-none group"
                  title={`${item} wieder zurücklegen / entfernen`}
                >
                  <span>{item}</span>
                  <X className="w-4 h-4 text-[#4A7856]/70 group-hover:text-[#D35400] transition-colors" />
                </motion.button>
              ))
            )}
          </motion.div>
        </div>

        {/* Custom Input Form - mit dezentem '+' Button (hellgrüne Füllung, grünes Icon) */}
        <form onSubmit={handleAddCustom} className="flex gap-2.5">
          <input
            id="custom-ingredient-input"
            type="text"
            placeholder="Zutat eingeben (z.B. Champignons, Cashewkerne)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 h-12 min-h-[48px] bg-white border border-[#ECEBE8] hover:border-[#CCD5CF] focus:border-[#4A7856] rounded-xl px-4 py-2.5 text-base font-medium text-[#2D3E40] focus:outline-hidden transition-all placeholder:text-[#686e6a]"
          />
          <button
            type="submit"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-[#E3EBE5] hover:bg-[#D4E2D7] text-[#4A7856] border border-[#CCD5CF] flex items-center justify-center shrink-0 cursor-pointer touch-manipulation active:scale-95 transition-colors"
            title="Zutat hinzufügen"
            aria-label="Zutat hinzufügen"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Pantry Item Pills - fließend, ohne hart abgeschnittenen Bereich, mit 'Mehr / Weniger anzeigen' */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#686E6A]">
            Häufige Vorräte &amp; Frischezutaten:
          </label>
          <motion.div
            layoutRoot
            layout
            className="flex flex-wrap gap-2.5 py-1"
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
                className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors select-none cursor-pointer touch-manipulation flex items-center gap-1.5 bg-white text-[#57534d] hover:bg-[#F1F5F2] hover:text-[#2D3E40] border border-[#ECEBE8] hover:border-[#CCD5CF]"
              >
                <span className="text-[#4A7856] font-bold">+</span>
                <span>{item}</span>
              </motion.button>
            ))}
          </motion.div>
          {availablePantryItems.length > 14 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAllPantryItems((prev) => !prev)}
                className="text-xs font-semibold text-[#4A7856] hover:text-[#3D6447] flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-[#F1F5F2] transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                <span>{showAllPantryItems ? 'Weniger anzeigen' : `Mehr anzeigen (${availablePantryItems.length - 14} weitere)`}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllPantryItems ? 'rotate-180' : ''}`} />
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#686E6A] mb-2">
              Ernährungsweise
            </label>
            <div className="bg-[#F1F5F2] p-1 rounded-xl grid grid-cols-2 gap-1.5 h-12 min-h-[48px] items-center">
              <button
                type="button"
                id="fridge-diet-veggie-btn"
                onClick={() => setIsVegan(false)}
                className={`h-10 min-h-[40px] px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                  !isVegan
                    ? 'bg-[#E3EBE5] text-[#2D3E40] shadow-2xs border border-[#CCD5CF]'
                    : 'text-[#686E6A] hover:text-[#2D3E40] hover:bg-white/40'
                }`}
              >
                {!isVegan && <Check className="w-3.5 h-3.5 text-[#4A7856] stroke-[2.5]" />}
                <span>🧀 Veggie</span>
              </button>
              <button
                type="button"
                id="fridge-diet-vegan-btn"
                onClick={() => setIsVegan(true)}
                className={`h-10 min-h-[40px] px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                  isVegan
                    ? 'bg-[#E3EBE5] text-[#2D3E40] shadow-2xs border border-[#CCD5CF]'
                    : 'text-[#686E6A] hover:text-[#2D3E40] hover:bg-white/40'
                }`}
              >
                {isVegan && <Check className="w-3.5 h-3.5 text-[#4A7856] stroke-[2.5]" />}
                <span>🌱 Vegan</span>
              </button>
            </div>
          </div>

          {/* Schieberegler für Zeit - einheitlich gestylt */}
          <div className="flex flex-col justify-center min-h-[48px]">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="fridge-time-slider" className="text-[11px] font-bold uppercase tracking-wider text-[#686E6A] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#4A7856]" />
                <span>Max. Zeit:</span>
              </label>
              <span className="px-2 py-0.5 rounded-full bg-[#E3EBE5] border border-[#CCD5CF] text-[#4A7856] font-bold text-xs tabular-nums">
                {maxTime} Min.
              </span>
            </div>
            <input
              id="fridge-time-slider"
              type="range"
              min="15"
              max="50"
              step="5"
              value={maxTime}
              onChange={(e) => setMaxTime(Number(e.target.value))}
              className="w-full accent-[#4A7856] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[#686E6A] mt-1.5 font-medium tabular-nums px-0.5">
              <span>15 Min.</span>
              <span>50 Min.</span>
            </div>
          </div>
        </div>

        {/* Dünne Trennlinie vor Wünsche & Feineinstellungen */}
        <div className="border-t border-[#ECEBE8]" />

        {/* Wünsche & Feineinstellungen - Gestaltete Kopfzeile mit Untertitel */}
        <div className="space-y-4">
          {/* Accordion Toggle Header */}
          <button
            type="button"
            id="fridge-toggle-wishes-mobile-btn"
            onClick={() => setIsPreferencesOpenOnMobile((prev) => !prev)}
            aria-expanded={isPreferencesOpenOnMobile}
            aria-controls="fridge-extra-wishes-section"
            className="w-full min-h-[48px] p-3 sm:p-4 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] hover:border-[#CCD5CF] flex items-center justify-between text-left cursor-pointer select-none touch-manipulation transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#E3EBE5] flex items-center justify-center text-[#4A7856] shrink-0">
                <Sliders className="w-4 h-4 text-[#4A7856]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#2D3E40]">
                    Wünsche &amp; Feineinstellungen
                  </span>
                  {activeCustomSettingsCount > 0 && (
                    <span className="text-[11px] font-semibold text-[#4A7856] bg-[#E3EBE5] px-2 py-0.5 rounded-full border border-[#CCD5CF] tabular-nums">
                      {activeCustomSettingsCount} aktiv
                    </span>
                  )}
                </div>
                {/* Untertitel / Zusammenfassung */}
                <p className="text-xs text-[#686E6A] truncate mt-0.5">
                  {extraWishes.trim() ? `"${extraWishes.trim()}"` : 'Keine Wünsche'}
                  {' · '}
                  {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients} Extras`}
                  {calorieFilter !== 'all' && ` · ${calorieFilter === 'high' ? '750+ kcal' : calorieFilter === 'low' ? '< 500 kcal' : '500–700 kcal'}`}
                  {proteinFilter !== 'all' && ` · ${proteinFilter === 'very-high' ? '40+ g Protein' : proteinFilter === 'high' ? '30+ g Protein' : '20+ g Protein'}`}
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

          {/* Accordion Content */}
          <div
            id="fridge-extra-wishes-section"
            className={`grid transition-all duration-250 ease-in-out ${
              isPreferencesOpenOnMobile ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-6 pt-2">
                {/* Zeile 2: Wünsche (links) & Zusätzliche Zutaten (rechts) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 items-start">
                  {/* Wünsche */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#686E6A] mb-2">
                      Wünsche
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. cremig, One-Pot, ohne Zwiebeln..."
                      value={extraWishes}
                      onChange={(e) => setExtraWishes(e.target.value)}
                      className="w-full h-12 min-h-[48px] bg-white border border-[#ECEBE8] hover:border-[#CCD5CF] focus:border-[#4A7856] rounded-xl px-4 text-base font-medium text-[#2D3E40] focus:outline-hidden transition-colors"
                    />
                  </div>

                  {/* Zusätzliche Zutaten Schieberegler - einheitlich gestylt */}
                  <div className="flex flex-col justify-center min-h-[48px]">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="ai-extra-ingredients-slider" className="text-[11px] font-bold uppercase tracking-wider text-[#686E6A] flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#4A7856]" />
                        <span>Zusätzliche Zutaten:</span>
                      </label>
                      <span className="px-2 py-0.5 rounded-full bg-[#E3EBE5] border border-[#CCD5CF] text-[#4A7856] font-bold text-xs tabular-nums">
                        {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients}`}
                      </span>
                    </div>
                    <input
                      id="ai-extra-ingredients-slider"
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={maxExtraIngredients}
                      onChange={(e) => setMaxExtraIngredients(Number(e.target.value))}
                      className="w-full accent-[#4A7856] cursor-pointer"
                    />
                    {/* Mobile: gerade Zahlen (0, 2, 4, 6) auf der X-Achse */}
                    <div className="sm:hidden flex justify-between text-xs text-[#686E6A] mt-1.5 font-semibold tabular-nums px-1 select-none">
                      <span>0</span>
                      <span aria-hidden="true" className="invisible">1</span>
                      <span>2</span>
                      <span aria-hidden="true" className="invisible">3</span>
                      <span>4</span>
                      <span aria-hidden="true" className="invisible">5</span>
                      <span>6</span>
                    </div>
                    {/* Desktop: Bezeichner */}
                    <div className="hidden sm:flex justify-between text-xs text-[#686E6A] mt-1.5 font-medium tabular-nums px-0.5">
                      <span>Keine Zukäufe</span>
                      <span>1–2 Zutaten</span>
                      <span>3 Zutaten</span>
                      <span>Bis zu 6</span>
                    </div>
                  </div>
                </div>

                {/* Zeile 3: Nährwerte & Feintuning: Kalorien, Proteine und Schwierigkeit - Kompakt im Grid */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#686E6A]">
                    Nährwerte &amp; Schwierigkeit
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Kalorien Filter */}
                    <div className="relative">
                      <select
                        id="fridge-filter-calories"
                        value={calorieFilter}
                        onChange={(e) => setCalorieFilter(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-sm font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Kalorien: Alle</option>
                        <option value="low">&lt; 500 kcal</option>
                        <option value="moderate">500–700 kcal</option>
                        <option value="high">750+ kcal</option>
                      </select>
                      <Flame className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Protein Filter */}
                    <div className="relative">
                      <select
                        id="fridge-filter-protein"
                        value={proteinFilter}
                        onChange={(e) => setProteinFilter(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-sm font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Proteine: Alle</option>
                        <option value="medium">20+ g Protein</option>
                        <option value="high">30+ g Protein</option>
                        <option value="very-high">40+ g Protein</option>
                      </select>
                      <Dumbbell className="w-3.5 h-3.5 text-[#4A7856] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Schwierigkeit Selector - auf Mobile 2. Zeile über volle 2 Spalten, auf Desktop 3. Spalte */}
                    <div className="relative col-span-2 sm:col-span-1">
                      <select
                        id="fridge-filter-difficulty"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full appearance-none h-11 min-h-[44px] bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 focus:border-[#4A7856] text-[#2D3E40] text-sm font-medium rounded-xl pl-8 pr-7 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4A7856] transition-colors"
                      >
                        <option value="all">Schwierigkeit: Alle</option>
                        <option value="Einfach">Einfach</option>
                        <option value="Mittel">Mittel</option>
                        <option value="Anspruchsvoll">Anspruchsvoll</option>
                      </select>
                      <ChefHat className="w-3.5 h-3.5 text-[#4A7856] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-3.5 h-3.5 text-[#686E6A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            {matchedExistingRecipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                className="flex gap-3 bg-white p-3 rounded-2xl border border-[#ECEBE8] hover:border-[#4A7856]/40 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <RecipeImage
                    recipe={recipe}
                    alt={recipe.title}
                    imgClassName="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    size="sm"
                  />
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                      {recipe.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-[#2D3E40] truncate group-hover:text-[#4A7856]">
                    {recipe.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-[#686E6A]">
                    <span>⏱️ {recipe.totalTimeMinutes} Min.</span>
                    <span className="text-[#4A7856] font-medium">💪 {recipe.nutrients.protein}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
