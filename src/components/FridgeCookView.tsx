import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  X,
  Flame,
  Dumbbell,
  ChefHat,
  Check,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { PANTRY_QUICK_ITEMS } from '../data/recipes';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { RecipePreviewModal } from './RecipePreviewModal';
import { RecipeCardUnified } from './ui/RecipeCardUnified';
import { RecipeCardListRow } from './ui/RecipeCardListRow';
import { safeStorage, detectIngredientCategory } from '../utils/helpers';

interface FridgeCookViewProps {
  allRecipes?: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onSaveCustomRecipe?: (recipe: Recipe) => void;
  onlyVeganGlobal?: boolean;
  onCopyFeedback?: (msg: string) => void;
}

type NutritionDropdownKey = 'calories' | 'protein' | 'difficulty';

const CALORIE_OPTIONS: { value: string; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'Kalorien: Alle', shortLabel: 'Kalorien' },
  { value: 'low', label: '< 500 kcal', shortLabel: '< 500 kcal' },
  { value: 'moderate', label: '500–700 kcal', shortLabel: '500–700 kcal' },
  { value: 'high', label: '750+ kcal', shortLabel: '750+ kcal' },
];

const PROTEIN_OPTIONS: { value: string; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'Protein: Alle', shortLabel: 'Protein' },
  { value: 'medium', label: '20+ g Protein', shortLabel: '20+ g' },
  { value: 'high', label: '30+ g Protein', shortLabel: '30+ g' },
  { value: 'very-high', label: '40+ g Protein', shortLabel: '40+ g' },
];

const DIFFICULTY_OPTIONS: { value: string; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'Anspruch: Alle', shortLabel: 'Anspruch' },
  { value: 'Einfach', label: 'Einfach', shortLabel: 'Einfach' },
  { value: 'Mittel', label: 'Mittel', shortLabel: 'Mittel' },
  { value: 'Anspruchsvoll', label: 'Aufwendig', shortLabel: 'Aufwendig' },
];

function doesIngredientMatch(recipeIngredientName: string, selectedItem: string): boolean {
  const a = recipeIngredientName.toLowerCase().trim();
  const b = selectedItem.toLowerCase().trim();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export const FridgeCookView: React.FC<FridgeCookViewProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const allRecipes = props.allRecipes ?? recipesCtx.recipes;
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
  const isVeganForAi = true;
  const [calorieFilter, setCalorieFilter] = useState<string>('all'); // 'all', 'high', 'low', 'moderate'
  const [proteinFilter, setProteinFilter] = useState<string>('all'); // 'all', 'high', 'very-high', 'medium'
  const [difficulty, setDifficulty] = useState<string>('all'); // 'all', 'Einfach', 'Mittel', 'Anspruchsvoll'
  const [maxTime, setMaxTime] = useState(25);
  const [maxExtraIngredients, setMaxExtraIngredients] = useState(2);
  const [includeBasics] = useState(true);
  const [extraWishes, setExtraWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [accordionOverflowVisible, setAccordionOverflowVisible] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<NutritionDropdownKey | null>(null);
  const dropdownsContainerRef = useRef<HTMLDivElement>(null);

  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [showAllPantryItems, setShowAllPantryItems] = useState(false);
  const [showAllMatchedRecipes, setShowAllMatchedRecipes] = useState(false);
  const [isExtraSliderActive, setIsExtraSliderActive] = useState(false);
  const [isTimeSliderActive, setIsTimeSliderActive] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSavingFullRecipe, setIsSavingFullRecipe] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  // Close custom dropdowns on outside click or Escape
  useEffect(() => {
    if (!activeDropdown) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (dropdownsContainerRef.current && !dropdownsContainerRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdown]);

  // Ensure dropdown closes and overflow locks before accordion collapses
  const handleTogglePreferences = () => {
    setIsPreferencesOpen((prev) => {
      const next = !prev;
      if (!next) {
        setAccordionOverflowVisible(false);
        setActiveDropdown(null);
      }
      return next;
    });
  };

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

  const togglePantryItem = (item: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Case-insensitive duplicate check & canonical name matching with quick items
    const canonicalQuickItem = PANTRY_QUICK_ITEMS.find(
      (q) => q.toLowerCase() === trimmed.toLowerCase()
    );
    const finalName = canonicalQuickItem || trimmed;

    const alreadyExists = selectedIngredients.some(
      (i) => i.toLowerCase() === finalName.toLowerCase()
    );

    if (!alreadyExists) {
      setSelectedIngredients((prev) => [...prev, finalName]);
    }
    setCustomInput('');
  };

  // Rezeptidee aus Vorräten erstellen & zur Rezept-Vorschau leiten
  const handleStartIdeaGeneration = async () => {
    if (selectedIngredients.length === 0) return;
    setIsGenerating(true);
    setIsPreviewModalOpen(true);
    setPreviewRecipe(null);
    setErrorMessage(null);
    setModalErrorMessage(null);

    try {
      const response = await fetch('/api/ai/fridge-cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          isVegan: isVeganForAi,
          maxTimeMinutes: maxTime,
          difficulty: difficulty === 'all' ? 'Beliebig' : difficulty,
          mealType: 'Hauptgericht',
          extraWishes,
          maxAdditionalIngredients: maxExtraIngredients,
          includeBasics,
          nutritionGoal,
          calorieFilter,
          proteinFilter,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.recipe) {
        const errorDetail = data?.error || 'Das Rezept konnte nicht generiert werden.';
        throw new Error(errorDetail);
      }

      const raw = data.recipe;

      const candidateRecipe: Recipe = {
        id: `ai-rec-${Date.now()}`,
        title: raw.title || `Vorrats-Kreation mit ${selectedIngredients.slice(0, 2).join(' & ')}`,
        subtitle: raw.subtitle || `Pflanzliche Gourmet-Kreation aus deinen Vorratszutaten.`,
        image: '',
        category: raw.category || 'Schnelle Küche',
        isVegan: !!raw.isVegan,
        isVegetarian: true,
        prepTimeMinutes: raw.prepTimeMinutes || 10,
        cookTimeMinutes: raw.cookTimeMinutes || 15,
        totalTimeMinutes: (raw.prepTimeMinutes || 10) + (raw.cookTimeMinutes || 15),
        difficulty: raw.difficulty || (difficulty === 'all' ? 'Einfach' : (difficulty as Recipe['difficulty'])),
        servings: 2,
        rating: 5.0,
        reviewCount: 1,
        tags: [isVeganForAi ? 'Vegan' : 'Vegetarisch', 'Resteverwertung', raw.category || 'Schnelle Küche'],
        nutrients: {
          calories: raw.calories || raw.nutrients?.calories || 480,
          protein: raw.protein || raw.nutrients?.protein || 24,
          carbs: raw.carbs || raw.nutrients?.carbs || 52,
          fat: raw.fat || raw.nutrients?.fat || 14,
          fiber: raw.fiber || raw.nutrients?.fiber || 8,
          iron: raw.iron || raw.nutrients?.iron || 3.8,
        },
        ingredients: (raw.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: ing.amount || 'nach Bedarf',
          unit: ing.unit || '',
          category: detectIngredientCategory(ing.name),
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
        chefTip: raw.chefTips || raw.chefTip || 'Tipp: Vor dem Servieren noch mit etwas frischem Pfeffer oder Kräutern abschmecken.',
        isCustomAi: true,
        createdAt: Date.now(),
      };

      setPreviewRecipe(candidateRecipe);
    } catch (err: any) {
      console.error('Failed to generate fridge recipe:', err);
      const fallbackDifficulty: Recipe['difficulty'] =
        difficulty === 'Mittel' || difficulty === 'Anspruchsvoll' ? difficulty : 'Einfach';
      const fallbackRecipe: Recipe = {
        id: `ai-rec-${Date.now()}`,
        title: `${selectedIngredients.slice(0, 2).join(' & ')}-Pfanne`,
        subtitle: `Schnelle, gesunde Resteverwertung mit deinen Vorräten.`,
        image: '',
        category: 'Schnelle Küche',
        isVegan: isVeganForAi,
        isVegetarian: true,
        prepTimeMinutes: 10,
        cookTimeMinutes: Math.max(10, maxTime - 10),
        totalTimeMinutes: maxTime,
        difficulty: fallbackDifficulty,
        servings: 2,
        rating: 5.0,
        reviewCount: 1,
        tags: [isVeganForAi ? 'Vegan' : 'Vegetarisch', 'Resteverwertung'],
        nutrients: {
          calories: calorieFilter === 'high' ? 780 : calorieFilter === 'low' ? 420 : 540,
          protein: proteinFilter === 'high' || proteinFilter === 'very-high' ? 32 : 22,
          carbs: 55,
          fat: 16,
          fiber: 9,
          iron: 4.1,
        },
        ingredients: selectedIngredients.map((name) => ({
          name,
          amount: '150',
          unit: 'g',
          category: detectIngredientCategory(name),
        })),
        steps: [
          {
            stepNumber: 1,
            title: 'Vorbereitung',
            text: 'Die Vorratszutaten gründlich waschen, putzen und in mundgerechte Stücke schneiden.',
          },
          {
            stepNumber: 2,
            title: 'Anbraten & Garen',
            text: 'Etwas Öl in einer Pfanne erhitzen, Zutaten nacheinander anbraten und ca. 10–12 Minuten bissfest garen.',
            timerMinutes: 10,
          },
          {
            stepNumber: 3,
            title: 'Abschmecken & Anrichten',
            text: 'Mit Salz, Pfeffer und Kräutern nach Wunsch würzen und warm servieren.',
          },
        ],
        chefTip: 'Für noch mehr Geschmack etwas Zitronensaft oder geröstete Nüsse darübergeben.',
        isCustomAi: true,
        createdAt: Date.now(),
      };
      setPreviewRecipe(fallbackRecipe);
    } finally {
      setIsGenerating(false);
    }
  };

  // Finales Speichern nach Rezept-Vorschau mit Ladeanimation & Weiterleitung zur Detailansicht
  const handleConfirmSavePreviewRecipe = async (recipeToSave: Recipe, chosenServings: number) => {
    setIsSavingFullRecipe(true);
    setModalErrorMessage(null);

    try {
      const baseServings = recipeToSave.servings || 2;
      const scaledIngredients = recipeToSave.ingredients.map((ing) => {
        const raw = ing.amount;
        const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0 && baseServings > 0) {
          const scaled = (parsed / baseServings) * chosenServings;
          return { ...ing, amount: Math.round(scaled * 10) / 10 };
        }
        return ing;
      });

      const finalRecipe: Recipe = {
        ...recipeToSave,
        servings: chosenServings,
        ingredients: scaledIngredients,
        createdAt: Date.now(),
      };

      await new Promise((resolve) => setTimeout(resolve, 1400));

      onSaveCustomRecipe(finalRecipe);
      setIsSavingFullRecipe(false);
      setIsPreviewModalOpen(false);
      setPreviewRecipe(null);
      onCopyFeedback(`"${finalRecipe.title}" erfolgreich erstellt! 🌱`);

      navigate(`/recipes/${finalRecipe.id}`);
    } catch (err: any) {
      console.error('Failed to save recipe:', err);
      setIsSavingFullRecipe(false);
      setModalErrorMessage('Das Rezept konnte nicht gespeichert werden.');
    }
  };

  // Passende bestehende Rezepte finden & intelligent nach Vorrats-Treffern, Zeit, Anspruch und Nährwerten sortieren
  const matchedExistingRecipes = allRecipes
    .filter((r) => {
      if (onlyVeganGlobal && !r.isVegan) return false;
      if (difficulty !== 'all' && r.difficulty !== difficulty) return false;
      return selectedIngredients.some((sel) =>
        r.ingredients.some((ing) => doesIngredientMatch(ing.name, sel))
      );
    })
    .sort((a, b) => {
      // 1. Rezepte bevorzugen, die in die gewählte Max. Zeit passen
      const aInTime = a.totalTimeMinutes <= maxTime ? 1 : 0;
      const bInTime = b.totalTimeMinutes <= maxTime ? 1 : 0;
      if (aInTime !== bInTime) return bInTime - aInTime;

      // 2. Spezifische Nährwert-Sortierung falls aktiv
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

      // 3. Anzahl der übereinstimmenden Vorratszutaten
      const aMatches = selectedIngredients.filter((sel) =>
        a.ingredients.some((i) => doesIngredientMatch(i.name, sel))
      ).length;
      const bMatches = selectedIngredients.filter((sel) =>
        b.ingredients.some((i) => doesIngredientMatch(i.name, sel))
      ).length;
      if (bMatches !== aMatches) return bMatches - aMatches;

      // 4. Schnellere Rezepte zuerst
      return a.totalTimeMinutes - b.totalTimeMinutes;
    });

  const availablePantryItems = PANTRY_QUICK_ITEMS.filter((item) => !selectedIngredients.includes(item));
  const initialPantryItems = availablePantryItems.slice(0, 14);
  const extraPantryItems = availablePantryItems.slice(14);

  const selectedCalorieOpt = CALORIE_OPTIONS.find((o) => o.value === calorieFilter) || CALORIE_OPTIONS[0];
  const selectedProteinOpt = PROTEIN_OPTIONS.find((o) => o.value === proteinFilter) || PROTEIN_OPTIONS[0];
  const selectedDifficultyOpt = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty) || DIFFICULTY_OPTIONS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 sm:space-y-8"
    >
      {/* Intro Banner - clean neutral card matching app theme */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 text-text-main shadow-xs border border-border">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
            Was hast du im Kühlschrank?
          </h1>
          <p className="text-base text-text-muted leading-relaxed">
            Zutaten wählen und passende Rezepte finden.
          </p>
        </div>
      </div>

      {/* Main Ingredient Selector Section */}
      <div className="bg-card rounded-2xl p-4 sm:p-8 border border-border shadow-xs space-y-5 sm:space-y-6">
        {/* Selected Items Tags */}
        <div>
          <div className="flex items-center justify-between mb-2.5 min-h-[20px]">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Deine ausgewählten Zutaten
            </h2>
            <AnimatePresence>
              {selectedIngredients.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setSelectedIngredients([])}
                  className="text-xs text-text-muted hover:text-[#D35400] font-semibold cursor-pointer transition-colors"
                >
                  Alle entfernen
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            layoutRoot
            layout
            className="flex flex-wrap gap-2.5 min-h-[44px] items-center relative py-1"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {selectedIngredients.length === 0 ? (
                <motion.div
                  key="empty-ingredients-hint"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-border bg-surface flex items-center justify-center text-xs text-text-muted font-medium text-center"
                >
                  Noch keine Zutaten gewählt. Tippe unten auf Vorräte oder gib eigene ein.
                </motion.div>
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
                    className="inline-flex items-center gap-2 h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-accent-tint text-accent text-sm font-semibold border border-accent/40 hover:border-accent cursor-pointer touch-manipulation transition-colors select-none group shadow-2xs"
                    title={`${item} wieder zurücklegen / entfernen`}
                  >
                    <span>{item}</span>
                    <X className="w-4 h-4 text-accent/80 group-hover:text-[#D35400] transition-colors" />
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleAddCustom} className="flex gap-2.5">
          <input
            id="custom-ingredient-input"
            type="text"
            placeholder="Zutat eingeben (z.B. Champignons, Cashewkerne)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 h-12 min-h-[48px] bg-surface border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-base font-medium text-text-main focus:outline-hidden transition-all placeholder:text-text-muted"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.93 }}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent flex items-center justify-center shrink-0 cursor-pointer touch-manipulation transition-colors shadow-2xs"
            title="Zutat hinzufügen"
            aria-label="Zutat hinzufügen"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        </form>

        {/* Quick Pantry Item Pills */}
        <div className="space-y-2">
          <label className="block text-[16px] font-bold text-text-main">
            Häufige Vorräte &amp; Frischezutaten
          </label>
          <motion.div
            layoutRoot
            layout
            className="flex flex-wrap gap-2.5 py-0.5"
          >
            {initialPantryItems.map((item) => (
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
                className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors select-none cursor-pointer touch-manipulation flex items-center gap-1.5 bg-surface text-text-muted hover:border-accent/50 hover:text-text-main border border-border group"
              >
                <span className="text-text-muted group-hover:text-accent font-bold">+</span>
                <span>{item}</span>
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence initial={false}>
            {showAllPantryItems && extraPantryItems.length > 0 && (
              <motion.div
                key="extra-pantry-items"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2.5 pt-1.5 pb-0.5">
                  {extraPantryItems.map((item) => (
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
                      className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors select-none cursor-pointer touch-manipulation flex items-center gap-1.5 bg-surface text-text-muted hover:border-accent/50 hover:text-text-main border border-border group"
                    >
                      <span className="text-text-muted group-hover:text-accent font-bold">+</span>
                      <span>{item}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {availablePantryItems.length > 14 && (
            <div className="pt-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowAllPantryItems((prev) => !prev)}
                className="text-xs font-semibold text-text-muted hover:text-text-main flex items-center gap-1.5 py-1 px-0 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[36px]"
              >
                <span>{showAllPantryItems ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                <motion.span
                  animate={{ rotate: showAllPantryItems ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex items-center justify-center"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                </motion.span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Dünne Trennlinie */}
        <div className="border-t border-border" />

        {/* Zubereitungszeit Schieberegler */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 h-7">
            <label htmlFor="fridge-time-slider" className="text-[16px] font-bold text-text-main">
              Max. Zeit
            </label>
            <AnimatePresence>
              {!isTimeSliderActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="px-2.5 py-0.5 rounded-full bg-accent-tint border border-accent/30 text-accent font-bold text-xs tabular-nums shrink-0"
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
                  <div className="px-4 py-1 rounded-full bg-card border border-[#D3DCD5] shadow-lg text-[#355F40] font-extrabold text-[17px] tabular-nums whitespace-nowrap">
                    {maxTime} Min.
                  </div>
                  <div className="w-3 h-3 bg-card border-r border-b border-[#D3DCD5] rotate-45 -mt-1.5 shadow-xs" />
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
                  try {
                    navigator.vibrate(8);
                  } catch {}
                }
                setMaxTime(val);
              }}
              className="ios-slider w-full cursor-pointer touch-manipulation"
              style={{
                background: `linear-gradient(to right, #4A7856 ${((maxTime - 15) / (50 - 15)) * 100}%, #E3E8E5 ${((maxTime - 15) / (50 - 15)) * 100}%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-[13px] text-text-muted font-medium tabular-nums px-0.5">
            <span>15 Min.</span>
            <span>50 Min.</span>
          </div>
        </div>

        {/* Dünne Trennlinie vor Wünsche & Feineinstellungen */}
        <div className="border-t border-border" />

        {/* Wünsche & Feineinstellungen - im sekundären Button-Stil (wie der "Swipen"-Button) */}
        <div className="space-y-3">
          <motion.button
            type="button"
            id="fridge-toggle-wishes-mobile-btn"
            whileTap={{ scale: 0.985 }}
            onClick={handleTogglePreferences}
            aria-expanded={isPreferencesOpen}
            aria-controls="fridge-extra-wishes-section"
            className={`group w-full min-h-[60px] p-3.5 sm:p-4 rounded-2xl border bg-accent-tint flex items-center justify-between text-left cursor-pointer select-none touch-manipulation transition-all ${
              isPreferencesOpen
                ? 'border-accent/45 shadow-2xs'
                : 'border-accent/25 hover:border-accent/50 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Sliders className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-text-main leading-tight">
                    Wünsche &amp; Feineinstellungen
                  </span>
                  <AnimatePresence>
                    {activeCustomSettingsCount > 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.18 }}
                        className="px-2 py-0.5 rounded-full bg-card/90 border border-accent/30 text-accent text-[11px] font-bold tabular-nums"
                      >
                        {activeCustomSettingsCount} aktiv
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {/* Untertitel / Zusammenfassung */}
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {extraWishes.trim()
                    ? extraWishes.trim().length > 20
                      ? `"${extraWishes.trim().slice(0, 18)}..."`
                      : `"${extraWishes.trim()}"`
                    : 'Keine Wünsche'}
                  {' · '}
                  {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients} Extras`}
                  {calorieFilter !== 'all' &&
                    ` · ${
                      calorieFilter === 'high'
                        ? '750+ kcal'
                        : calorieFilter === 'low'
                        ? '< 500 kcal'
                        : '500–700 kcal'
                    }`}
                  {proteinFilter !== 'all' &&
                    ` · ${
                      proteinFilter === 'very-high'
                        ? '40+ g'
                        : proteinFilter === 'high'
                        ? '30+ g'
                        : '20+ g'
                    }`}
                  {difficulty !== 'all' && ` · ${selectedDifficultyOpt.shortLabel}`}
                </p>
              </div>
            </div>

            <motion.div
              animate={{ rotate: isPreferencesOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-accent shrink-0 ml-2"
            >
              <ChevronDown className="w-5 h-5 text-accent shrink-0" />
            </motion.div>
          </motion.button>

          {/* Animiertes Akkordeon mit freiem Overflow im geöffneten Zustand für die Custom-Dropdowns */}
          <AnimatePresence initial={false}>
            {isPreferencesOpen && (
              <motion.div
                id="fridge-extra-wishes-section"
                key="fridge-extra-wishes-accordion"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => {
                  if (isPreferencesOpen) {
                    setAccordionOverflowVisible(true);
                  }
                }}
                className={accordionOverflowVisible ? 'overflow-visible' : 'overflow-hidden'}
              >
                <div className="pt-3 pb-1">
                  <div className="relative pl-1 sm:pl-3 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
                    {/* Schritt 1: Wünsche */}
                    <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                      <div
                        className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                          extraWishes.trim()
                            ? 'bg-accent text-on-accent shadow-2xs'
                            : 'bg-card border-2 border-accent text-accent'
                        }`}
                      >
                        {extraWishes.trim() ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[16px] font-bold text-text-main">Wünsche</h4>
                          <AnimatePresence>
                            {extraWishes.trim() && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                className="text-[11px] font-semibold text-accent bg-accent-tint px-2 py-0.5 rounded-full border border-accent/30"
                              >
                                Aktiv
                              </motion.span>
                            )}
                          </AnimatePresence>
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
                          className="w-full min-h-[48px] bg-surface border border-border hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-base font-medium text-text-main focus:outline-hidden transition-colors placeholder:text-text-muted resize-none overflow-hidden leading-normal"
                        />
                      </div>
                    </div>

                    {/* Schritt 2: Zusätzliche Zutaten */}
                    <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                      <div
                        className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                          maxExtraIngredients !== 2
                            ? 'bg-accent text-on-accent shadow-2xs'
                            : 'bg-card border-2 border-accent text-accent'
                        }`}
                      >
                        {maxExtraIngredients !== 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                        <div className="flex items-center justify-between gap-2 min-h-[26px]">
                          <h4 className="text-[16px] font-bold text-text-main">
                            Zusätzliche Zutaten
                          </h4>
                          <AnimatePresence>
                            {!isExtraSliderActive && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="px-2.5 py-0.5 rounded-full bg-accent-tint border border-accent/30 text-accent font-bold text-xs tabular-nums shrink-0"
                              >
                                {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients}`}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="pt-1">
                          <div className="relative py-2.5 flex items-center">
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
                                  <div className="px-4 py-1 rounded-full bg-card border border-[#D3DCD5] shadow-lg text-[#355F40] font-extrabold text-[17px] tabular-nums whitespace-nowrap">
                                    {maxExtraIngredients === 0 ? 'Nur Vorräte' : `Max. ${maxExtraIngredients}`}
                                  </div>
                                  <div className="w-3 h-3 bg-card border-r border-b border-[#D3DCD5] rotate-45 -mt-1.5 shadow-xs" />
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
                                  try {
                                    navigator.vibrate(8);
                                  } catch {}
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
                          <div className="sm:hidden flex justify-between text-[13px] text-text-muted mt-1.5 font-semibold tabular-nums px-1 select-none">
                            <span>0</span>
                            <span aria-hidden="true" className="invisible">1</span>
                            <span>2</span>
                            <span aria-hidden="true" className="invisible">3</span>
                            <span>4</span>
                            <span aria-hidden="true" className="invisible">5</span>
                            <span>6</span>
                          </div>
                          {/* Desktop: Bezeichner */}
                          <div className="hidden sm:flex justify-between text-[13px] text-text-muted mt-1.5 font-medium tabular-nums px-0.5">
                            <span>Keine Zukäufe</span>
                            <span>1–2 Zutaten</span>
                            <span>3 Zutaten</span>
                            <span>Bis zu 6</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schritt 3: Nährwerte & Anspruch (Eigene UI/UX-animierte Dropdown-Menüs auf Desktop & Mobile) */}
                    <div className="relative flex items-start gap-3.5 sm:gap-4.5 group">
                      <div
                        className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ring-4 ring-on-accent ${
                          calorieFilter !== 'all' || proteinFilter !== 'all' || difficulty !== 'all'
                            ? 'bg-accent text-on-accent shadow-2xs'
                            : 'bg-card border-2 border-accent text-accent'
                        }`}
                      >
                        {calorieFilter !== 'all' || proteinFilter !== 'all' || difficulty !== 'all' ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          '3'
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5 space-y-2.5" ref={dropdownsContainerRef}>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[16px] font-bold text-text-main">
                            Nährwerte &amp; Anspruch
                          </h4>
                          <AnimatePresence>
                            {(calorieFilter !== 'all' || proteinFilter !== 'all' || difficulty !== 'all') && (
                              <motion.button
                                type="button"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setCalorieFilter('all');
                                  setProteinFilter('all');
                                  setDifficulty('all');
                                  setActiveDropdown(null);
                                }}
                                className="text-xs font-semibold text-text-muted hover:text-accent cursor-pointer transition-colors"
                              >
                                Zurücksetzen
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* 3 Custom Animated Dropdowns in einer Reihe */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {/* 1. Kalorien Dropdown */}
                          <div className="relative min-w-0">
                            <motion.button
                              type="button"
                              id="fridge-filter-calories"
                              whileTap={{ scale: 0.96 }}
                              onClick={() =>
                                setActiveDropdown((prev) => (prev === 'calories' ? null : 'calories'))
                              }
                              aria-expanded={activeDropdown === 'calories'}
                              aria-haspopup="listbox"
                              aria-label="Kalorien wählen"
                              className={`w-full h-11 min-h-[44px] px-2.5 sm:px-3 rounded-xl border flex items-center justify-between gap-1.5 text-[13px] sm:text-sm transition-all cursor-pointer touch-manipulation select-none ${
                                activeDropdown === 'calories'
                                  ? 'bg-accent-tint border-accent/45 text-accent font-bold ring-2 ring-accent/15 shadow-2xs'
                                  : calorieFilter !== 'all'
                                  ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                                  : 'bg-surface border-border hover:border-accent/40 text-text-main font-semibold'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                                <Flame
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    calorieFilter !== 'all' || activeDropdown === 'calories'
                                      ? 'text-accent'
                                      : 'text-[#E67E22]'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="sm:hidden truncate">{selectedCalorieOpt.shortLabel}</span>
                                <span className="hidden sm:inline truncate">{selectedCalorieOpt.label}</span>
                              </span>
                              <motion.span
                                animate={{ rotate: activeDropdown === 'calories' ? 180 : 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="inline-flex items-center justify-center shrink-0 text-text-muted"
                              >
                                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                              </motion.span>
                            </motion.button>

                            <AnimatePresence>
                              {activeDropdown === 'calories' && (
                                <motion.div
                                  role="listbox"
                                  aria-label="Kalorien-Optionen"
                                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                  className="absolute left-0 top-full mt-2 w-48 sm:w-52 origin-top-left bg-card rounded-2xl border border-border shadow-xl p-1.5 z-40 space-y-0.5"
                                >
                                  {CALORIE_OPTIONS.map((opt) => {
                                    const isSelected = calorieFilter === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        type="button"
                                        onClick={() => {
                                          setCalorieFilter(opt.value);
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                                          isSelected
                                            ? 'bg-accent-tint text-accent font-bold'
                                            : 'text-text-main hover:bg-surface'
                                        }`}
                                      >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && (
                                          <motion.span
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.15 }}
                                          >
                                            <Check className="w-4 h-4 text-accent shrink-0 stroke-[2.5]" />
                                          </motion.span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 2. Protein Dropdown */}
                          <div className="relative min-w-0">
                            <motion.button
                              type="button"
                              id="fridge-filter-protein"
                              whileTap={{ scale: 0.96 }}
                              onClick={() =>
                                setActiveDropdown((prev) => (prev === 'protein' ? null : 'protein'))
                              }
                              aria-expanded={activeDropdown === 'protein'}
                              aria-haspopup="listbox"
                              aria-label="Proteine wählen"
                              className={`w-full h-11 min-h-[44px] px-2.5 sm:px-3 rounded-xl border flex items-center justify-between gap-1.5 text-[13px] sm:text-sm transition-all cursor-pointer touch-manipulation select-none ${
                                activeDropdown === 'protein'
                                  ? 'bg-accent-tint border-accent/45 text-accent font-bold ring-2 ring-accent/15 shadow-2xs'
                                  : proteinFilter !== 'all'
                                  ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                                  : 'bg-surface border-border hover:border-accent/40 text-text-main font-semibold'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                                <Dumbbell className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden="true" />
                                <span className="sm:hidden truncate">{selectedProteinOpt.shortLabel}</span>
                                <span className="hidden sm:inline truncate">{selectedProteinOpt.label}</span>
                              </span>
                              <motion.span
                                animate={{ rotate: activeDropdown === 'protein' ? 180 : 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="inline-flex items-center justify-center shrink-0 text-text-muted"
                              >
                                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                              </motion.span>
                            </motion.button>

                            <AnimatePresence>
                              {activeDropdown === 'protein' && (
                                <motion.div
                                  role="listbox"
                                  aria-label="Protein-Optionen"
                                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 sm:w-52 origin-top bg-card rounded-2xl border border-border shadow-xl p-1.5 z-40 space-y-0.5"
                                >
                                  {PROTEIN_OPTIONS.map((opt) => {
                                    const isSelected = proteinFilter === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        type="button"
                                        onClick={() => {
                                          setProteinFilter(opt.value);
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                                          isSelected
                                            ? 'bg-accent-tint text-accent font-bold'
                                            : 'text-text-main hover:bg-surface'
                                        }`}
                                      >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && (
                                          <motion.span
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.15 }}
                                          >
                                            <Check className="w-4 h-4 text-accent shrink-0 stroke-[2.5]" />
                                          </motion.span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 3. Anspruch / Schwierigkeit Dropdown */}
                          <div className="relative min-w-0">
                            <motion.button
                              type="button"
                              id="fridge-filter-difficulty"
                              whileTap={{ scale: 0.96 }}
                              onClick={() =>
                                setActiveDropdown((prev) =>
                                  prev === 'difficulty' ? null : 'difficulty'
                                )
                              }
                              aria-expanded={activeDropdown === 'difficulty'}
                              aria-haspopup="listbox"
                              aria-label="Anspruch wählen"
                              className={`w-full h-11 min-h-[44px] px-2.5 sm:px-3 rounded-xl border flex items-center justify-between gap-1.5 text-[13px] sm:text-sm transition-all cursor-pointer touch-manipulation select-none ${
                                activeDropdown === 'difficulty'
                                  ? 'bg-accent-tint border-accent/45 text-accent font-bold ring-2 ring-accent/15 shadow-2xs'
                                  : difficulty !== 'all'
                                  ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                                  : 'bg-surface border-border hover:border-accent/40 text-text-main font-semibold'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                                <ChefHat
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    difficulty !== 'all' || activeDropdown === 'difficulty'
                                      ? 'text-accent'
                                      : 'text-text-muted'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="sm:hidden truncate">{selectedDifficultyOpt.shortLabel}</span>
                                <span className="hidden sm:inline truncate">{selectedDifficultyOpt.label}</span>
                              </span>
                              <motion.span
                                animate={{ rotate: activeDropdown === 'difficulty' ? 180 : 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="inline-flex items-center justify-center shrink-0 text-text-muted"
                              >
                                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                              </motion.span>
                            </motion.button>

                            <AnimatePresence>
                              {activeDropdown === 'difficulty' && (
                                <motion.div
                                  role="listbox"
                                  aria-label="Anspruch-Optionen"
                                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                  className="absolute right-0 top-full mt-2 w-48 sm:w-52 origin-top-right bg-card rounded-2xl border border-border shadow-xl p-1.5 z-40 space-y-0.5"
                                >
                                  {DIFFICULTY_OPTIONS.map((opt) => {
                                    const isSelected = difficulty === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        type="button"
                                        onClick={() => {
                                          setDifficulty(opt.value);
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                                          isSelected
                                            ? 'bg-accent-tint text-accent font-bold'
                                            : 'text-text-main hover:bg-surface'
                                        }`}
                                      >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && (
                                          <motion.span
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.15 }}
                                          >
                                            <Check className="w-4 h-4 text-accent shrink-0 stroke-[2.5]" />
                                          </motion.span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dünne Trennlinie vor dem Generate Button */}
        <div className="border-t border-border" />

        {/* Error notification if AI failed */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <div>
                  <div className="font-semibold text-red-800">Rezept-Generierung fehlgeschlagen</div>
                  <div className="text-red-700 text-xs mt-0.5">{errorMessage}</div>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-bold text-red-800 hover:underline shrink-0 cursor-pointer"
              >
                Schließen
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button - Primary CTA */}
        <div className="pt-1">
          <motion.button
            id="generate-fridge-recipe-btn"
            type="button"
            whileTap={isGenerating || selectedIngredients.length === 0 ? undefined : { scale: 0.98 }}
            disabled={isGenerating || selectedIngredients.length === 0}
            onClick={handleStartIdeaGeneration}
            className="w-full h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer touch-manipulation"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
                <span>Kombiniere Vorräte zu einer Rezeptidee...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-on-accent shrink-0" />
                <span className="truncate">
                  {selectedIngredients.length === 0
                    ? 'Wähle mindestens 1 Zutat aus'
                    : proteinFilter === 'high' || proteinFilter === 'very-high'
                    ? `High-Protein-Idee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : calorieFilter === 'high'
                    ? `Kalorienreiche Rezeptidee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : calorieFilter === 'low'
                    ? `Leichte Rezeptidee aus ${selectedIngredients.length} Vorräten vorschlagen`
                    : `Rezeptidee aus ${selectedIngredients.length} Vorratszutat${
                        selectedIngredients.length > 1 ? 'en' : ''
                      } vorschlagen`}
                </span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Matched Database Recipes */}
      <AnimatePresence initial={false}>
        {matchedExistingRecipes.length > 0 && (
          <motion.div
            key="matched-recipes-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">
                  Oder entdecke passende Rezepte aus unserer Sammlung:
                </h3>
                {(proteinFilter === 'high' || proteinFilter === 'very-high') && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-tint text-accent text-xs font-semibold border border-accent/30">
                    <Dumbbell className="w-3 h-3" />
                    Nach Protein sortiert
                  </span>
                )}
                {calorieFilter === 'high' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface text-[#57534d] text-xs font-semibold border border-border">
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
              <span className="text-xs text-text-muted">{matchedExistingRecipes.length} Treffer</span>
            </div>

            {/* Basis-Anzeige (erste 3 Rezepte) - Mobil: Listenansicht der Startseite, PC: Rasteransicht der Startseite */}
            <div className="sm:hidden space-y-3">
              {matchedExistingRecipes.slice(0, 3).map((recipe, idx) => (
                <RecipeCardListRow key={recipe.id} recipe={recipe} index={idx} />
              ))}
            </div>

            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {matchedExistingRecipes.slice(0, 3).map((recipe, idx) => (
                <RecipeCardUnified key={recipe.id} recipe={recipe} variant="regular" index={idx} />
              ))}
            </div>

            {/* Dynamisch animiertes Ein-/Ausfahren für weitere Rezepte */}
            <AnimatePresence initial={false}>
              {showAllMatchedRecipes && matchedExistingRecipes.length > 3 && (
                <motion.div
                  key="more-matched-recipes-container"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {/* Mobile erweiterte Rezepte */}
                  <div className="sm:hidden space-y-3 pt-3">
                    {matchedExistingRecipes.slice(3).map((recipe, idx) => (
                      <RecipeCardListRow key={recipe.id} recipe={recipe} index={3 + idx} />
                    ))}
                  </div>

                  {/* Desktop erweiterte Rezepte */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4">
                    {matchedExistingRecipes.slice(3).map((recipe, idx) => (
                      <RecipeCardUnified key={recipe.id} recipe={recipe} variant="regular" index={3 + idx} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {matchedExistingRecipes.length > 3 && (
              <div className="flex justify-center pt-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowAllMatchedRecipes((prev) => !prev)}
                  className="text-xs sm:text-sm font-semibold text-text-muted hover:text-text-main flex items-center gap-1.5 py-2 px-1 bg-transparent border-0 transition-colors cursor-pointer touch-manipulation min-h-[44px]"
                >
                  <span>{showAllMatchedRecipes ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                  <motion.span
                    animate={{ rotate: showAllMatchedRecipes ? 180 : 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center justify-center"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                  </motion.span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Preview Modal with multi-stage loading, preview and saving animations */}
      <RecipePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewRecipe(null);
          setModalErrorMessage(null);
        }}
        isLoading={isGenerating}
        isSaving={isSavingFullRecipe}
        recipe={previewRecipe}
        onConfirmSave={handleConfirmSavePreviewRecipe}
        onDiscard={() => {
          setIsPreviewModalOpen(false);
          setPreviewRecipe(null);
          setModalErrorMessage(null);
        }}
        errorMessage={modalErrorMessage}
        onClearError={() => setModalErrorMessage(null)}
      />
    </motion.div>
  );
};
