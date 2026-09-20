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
import { Recipe } from '../types';
import { PANTRY_QUICK_ITEMS } from '../data/recipes';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

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
  // Load and persist ingredients properly so deleted items stay deleted across reloads
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('veggiechef_pantry_ingredients');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('veggiechef_pantry_ingredients', JSON.stringify(selectedIngredients));
    } catch (e) {
      console.error(e);
    }
  }, [selectedIngredients]);

  const [customInput, setCustomInput] = useState('');
  const [isVegan, setIsVegan] = useState(onlyVeganGlobal);
  const [nutritionGoal, setNutritionGoal] = useState<'balanced' | 'high_protein' | 'high_calorie'>('balanced');
  const [maxTime, setMaxTime] = useState(25);
  const [maxExtraIngredients, setMaxExtraIngredients] = useState(2); // AI additional ingredient slider
  const [includeBasics, setIncludeBasics] = useState(true); // Basic staples (oil, salt, pepper, etc.)
  const [extraWishes, setExtraWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [isPreferencesOpenOnMobile, setIsPreferencesOpenOnMobile] = useState(false);

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

  const handleGenerateAI = async () => {
    if (selectedIngredients.length === 0) return;
    setIsGenerating(true);
    setGeneratedRecipe(null);
    setHasSaved(false);
    setErrorMessage(null);

    try {
      let raw: any = null;

      try {
        const response = await fetch('/api/ai/fridge-cook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: selectedIngredients,
            isVegan,
            maxTimeMinutes: maxTime,
            difficulty: 'Einfach',
            mealType: 'Hauptgericht',
            extraWishes,
            maxAdditionalIngredients: maxExtraIngredients,
            includeBasics,
            nutritionGoal,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          if (data && data.success && data.recipe) {
            raw = data.recipe;
          }
        }
      } catch (fetchErr) {
        console.warn('API /api/ai/fridge-cook unavailable, applying local recipe fallback:', fetchErr);
      }

      // Robust local fallback if cloud function is unreachable or returns non-JSON/error
      if (!raw) {
        const primaryIng = selectedIngredients[0] || 'Frischem Gemüse';
        const otherIngs = selectedIngredients.slice(1);
        const prefix = nutritionGoal === 'high_protein' ? 'High-Protein ' : nutritionGoal === 'high_calorie' ? 'Herzhafte ' : '';
        const titleType = isVegan ? `${prefix}Veggie-Pfanne` : `${prefix}Marktgemüse-Pfanne`;
        const cal = nutritionGoal === 'high_calorie' ? 740 : nutritionGoal === 'high_protein' ? 520 : 430;
        const prot = nutritionGoal === 'high_protein' ? 34 : nutritionGoal === 'high_calorie' ? 22 : (isVegan ? 18 : 21);
        const fat = nutritionGoal === 'high_calorie' ? 28 : 14;
        const carbs = nutritionGoal === 'high_calorie' ? 84 : 48;
        
        raw = {
          title: `${titleType} mit ${primaryIng}`,
          subtitle: `Kreiert aus deinen Vorräten (${selectedIngredients.slice(0, 3).join(', ')})`,
          category: 'Schnelle Küche',
          isVegan,
          prepTimeMinutes: Math.min(maxTime > 15 ? 10 : 5, maxTime),
          cookTimeMinutes: Math.max(10, maxTime - 10),
          difficulty: 'Einfach',
          servings: 2,
          calories: cal,
          protein: prot,
          carbs,
          fat,
          fiber: 8,
          iron: 3.8,
          ingredients: [
            ...selectedIngredients.map((ing) => ({
              name: ing,
              amount: 150,
              unit: 'g',
              origin: 'pantry',
            })),
            ...(includeBasics
              ? [
                  { name: 'Natives Olivenöl', amount: 2, unit: 'EL', origin: 'pantry' },
                  { name: 'Meersalz & bunter Pfeffer', amount: 1, unit: 'Prise', origin: 'pantry' },
                  { name: 'Frischer Knoblauch', amount: 1, unit: 'Zehe', origin: 'pantry' },
                ]
              : []),
          ],
          steps: [
            {
              stepNumber: 1,
              title: 'Zutaten vorbereiten',
              text: `${selectedIngredients.join(', ')} gründlich säubern, waschen und in gleichmäßige mundgerechte Stücke schneiden.`,
              timerMinutes: 5,
            },
            {
              stepNumber: 2,
              title: 'Röstaromen erzeugen',
              text: `Etwas Öl in einer weiten Pfanne auf mittlerer bis hoher Stufe erhitzen. ${primaryIng} und feste Zutaten zuerst für 3–4 Minuten anbraten.`,
              timerMinutes: 4,
            },
            {
              stepNumber: 3,
              title: 'Sanft garen & würzen',
              text: `${otherIngs.length > 0 ? otherIngs.join(', ') + ' und die' : 'Die'} restlichen Zutaten untermengen. Mit Salz und Pfeffer abschmecken und bei mittlerer Hitze zugedeckt ca. 8–10 Minuten bissfest köcheln lassen.`,
              timerMinutes: 8,
            },
            {
              stepNumber: 4,
              title: 'Anrichten & Verfeinern',
              text: 'Heiß auf Tellern anrichten. Nach Geschmack mit einem Spritzer Zitrone oder frischen Kräutern abrunden.',
            },
          ],
          chefTips: 'Profitipp: Ein Schuss Pflanzensahne oder ein Teelöffel Hefeflocken verleiht der Soße noch mehr sämige Fülle!',
        };
      }
      const newRec: Recipe = {
        id: `ai-rec-${Date.now()}`,
        title: raw.title || 'Kreative Veggie-Pfanne',
        subtitle: raw.subtitle || `Gekocht mit ${selectedIngredients.slice(0, 3).join(', ')}`,
        image: raw.image || (isVegan 
          ? 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80'),
        category: raw.category || 'Schnelle Küche',
        isVegan: !!raw.isVegan,
        isVegetarian: true,
        prepTimeMinutes: raw.prepTimeMinutes || 10,
        cookTimeMinutes: raw.cookTimeMinutes || 15,
        totalTimeMinutes: (raw.prepTimeMinutes || 10) + (raw.cookTimeMinutes || 15),
        difficulty: raw.difficulty || 'Einfach',
        servings: raw.servings || 2,
        rating: 5.0,
        reviewCount: 1,
        tags: [isVegan ? 'Vegan' : 'Vegetarisch', 'Resteverwertung', 'Schnelle Küche'],
        nutrients: {
          calories: raw.calories || 450,
          protein: raw.protein || 20,
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
        chefTip: raw.chefTips || raw.chefTip || 'Frische Kräuter und Zitronensaft heben das Aroma auf das nächste Level!',
        isCustomAi: true,
      };

      setGeneratedRecipe(newRec);
      // Automatically save to the global recipe collection so it appears in the recipe list!
      onSaveCustomRecipe(newRec);
      setHasSaved(true);
      onCopyFeedback(`"${newRec.title}" wurde automatisch in deiner Rezeptsammlung gespeichert! 🌱`);
    } catch (err: any) {
      console.error('Failed to generate fridge recipe', err);
      setErrorMessage(err?.message || 'Die KI-Zubereitung für deine Vorräte ist aktuell leider nicht erreichbar. Bitte versuche es in wenigen Augenblicken noch einmal.');
    } finally {
      setIsGenerating(false);
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
      if (nutritionGoal === 'high_protein') {
        return (b.nutrients?.protein || 0) - (a.nutrients?.protein || 0);
      }
      if (nutritionGoal === 'high_calorie') {
        return (b.nutrients?.calories || 0) - (a.nutrients?.calories || 0);
      }
      const aMatches = selectedIngredients.filter((sel) =>
        a.ingredients.some((i) => i.name.toLowerCase().includes(sel.toLowerCase()))
      ).length;
      const bMatches = selectedIngredients.filter((sel) =>
        b.ingredients.some((i) => i.name.toLowerCase().includes(sel.toLowerCase()))
      ).length;
      return bMatches - aMatches;
    });

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Intro Banner - clean neutral card matching app theme */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 text-stone-900 shadow-xs border border-[#ECEBE8]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#4A7856]" />
            Vorratskammer & KI-Rezeptsuche
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Was hast du im Kühlschrank?
          </h1>
          <p className="text-sm font-medium text-stone-500">
            Vorhandene Zutaten wählen und passende Gerichte oder KI-Rezepte entdecken.
          </p>
        </div>
      </div>

      {/* Main Ingredient Selector Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs space-y-4">
        {/* Selected Items Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Deine ausgewählten Zutaten ({selectedIngredients.length})
            </h2>
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => setSelectedIngredients([])}
                className="text-xs text-[#7A7E7B] hover:text-[#D35400] font-medium"
              >
                Alle entfernen
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 min-h-[48px] p-3 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] items-center">
            {selectedIngredients.length === 0 ? (
              <span className="text-sm font-medium text-stone-500 italic">
                Noch keine Zutaten ausgewählt. Klicke unten auf Zutaten oder tippe eigene ein!
              </span>
            ) : (
              selectedIngredients.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 h-10 min-h-[40px] px-3.5 py-2 rounded-lg bg-[#F1F5F2] text-[#4A7856] text-sm font-medium shadow-2xs border border-[#ECEBE8] animate-in zoom-in-95 duration-150"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => togglePantryItem(item)}
                    className="hover:text-[#D35400] transition-colors p-1"
                    aria-label={`${item} entfernen`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleAddCustom} className="flex gap-2.5">
          <input
            id="custom-ingredient-input"
            type="text"
            placeholder="Zutat eingeben (z.B. Champignons, Cashewkerne)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 h-12 min-h-[48px] bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-4 py-2.5 text-base font-medium text-stone-800 focus:outline-hidden focus:border-[#4A7856] focus:bg-white transition-all placeholder:text-stone-400"
          />
          <button
            type="submit"
            className="h-12 min-h-[48px] px-5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-base font-semibold flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer touch-manipulation active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Hinzufügen</span>
          </button>
        </form>

        {/* Quick Pantry Item Pills */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7E7B]">
            Häufige Vorräte & Frischezutaten:
          </label>
          <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto pr-1">
            {PANTRY_QUICK_ITEMS.map((item) => {
              const isSelected = selectedIngredients.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => togglePantryItem(item)}
                  className={`h-10 min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium transition-all select-none cursor-pointer touch-manipulation active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#4A7856] text-white shadow-xs font-semibold'
                      : 'bg-[#FAF9F6] text-[#7A7E7B] hover:bg-[#F1F5F2] hover:text-[#2D3E40] border border-[#ECEBE8]'
                  }`}
                >
                  <span className={isSelected ? 'text-white' : 'text-[#7A7E7B]'}>{isSelected ? '✓' : '+'}</span>
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Accordion Toggle: ab Ernährungsweise einklappbar (standardmäßig eingeklappt) */}
        <div className="sm:hidden pt-3 border-t border-[#ECEBE8]">
          <button
            type="button"
            id="mobile-fridge-preferences-toggle"
            onClick={() => setIsPreferencesOpenOnMobile((prev) => !prev)}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] flex items-center justify-between text-left transition-colors cursor-pointer touch-manipulation active:scale-98"
            aria-expanded={isPreferencesOpenOnMobile}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sliders className="w-4 h-4 text-[#4A7856] shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-[#2D3E40] block">
                  Ernährungsweise & Feintuning
                </span>
                <span className="text-xs text-[#7A7E7B] truncate block">
                  {isVegan ? '🌱 Vegan' : '🧀 Veggie'} • {maxTime} Min. • {nutritionGoal === 'high_protein' ? 'High Protein' : nutritionGoal === 'high_calorie' ? 'Viele Kalorien' : 'Ausgewogen'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="text-xs font-semibold text-[#4A7856]">
                {isPreferencesOpenOnMobile ? 'Schließen' : 'Anpassen'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#7A7E7B] transition-transform duration-200 ${
                  isPreferencesOpenOnMobile ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Recipe Preferences Block: ab Ernährungsweise auf Mobile einklappbar (standardmäßig eingeklappt), auf Desktop immer sichtbar */}
        <div className={`${isPreferencesOpenOnMobile ? 'block' : 'hidden sm:block'} space-y-3 sm:space-y-4`}>
          {/* Recipe Preferences Grid (Ernährungsweise, Feintuning, Zeit, Wünsche) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1 sm:pt-4 border-t-0 sm:border-t sm:border-[#ECEBE8]">
            {/* 1. Vegan / Veggie Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7E7B] mb-1.5">
                Ernährungsweise
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-[#FAF9F6] border border-[#ECEBE8] p-1 rounded-xl h-12 min-h-[48px] items-center">
                <button
                  type="button"
                  id="fridge-diet-veggie-btn"
                  onClick={() => setIsVegan(false)}
                  className={`h-10 text-sm font-semibold rounded-lg transition-all flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer ${
                    !isVegan ? 'bg-white text-stone-900 shadow-2xs border border-[#ECEBE8]' : 'text-[#7A7E7B]'
                  }`}
                >
                  🧀 Veggie
                </button>
                <button
                  type="button"
                  id="fridge-diet-vegan-btn"
                  onClick={() => setIsVegan(true)}
                  className={`h-10 text-sm font-semibold rounded-lg transition-all flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer ${
                    isVegan ? 'bg-[#4A7856] text-white shadow-2xs' : 'text-[#7A7E7B]'
                  }`}
                >
                  🌱 Vegan
                </button>
              </div>
            </div>

            {/* 2. Dezent Feintuning Option (Beliebig / High Protein / Viele Kalorien) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7E7B] mb-1.5">
                Feintuning (Nährwerte)
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#FAF9F6] border border-[#ECEBE8] p-1 rounded-xl h-12 min-h-[48px] items-center">
                <button
                  type="button"
                  id="fridge-tuning-balanced-btn"
                  onClick={() => setNutritionGoal('balanced')}
                  className={`h-10 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center text-center touch-manipulation active:scale-95 cursor-pointer ${
                    nutritionGoal === 'balanced'
                      ? 'bg-white text-stone-900 shadow-2xs border border-[#ECEBE8]'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                  title="Ausgewogene, normale Nährwerte"
                >
                  Beliebig
                </button>
                <button
                  type="button"
                  id="fridge-tuning-high-protein-btn"
                  onClick={() => setNutritionGoal('high_protein')}
                  className={`h-10 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1 text-center touch-manipulation active:scale-95 cursor-pointer ${
                    nutritionGoal === 'high_protein'
                      ? 'bg-[#4A7856] text-white shadow-2xs'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                  title="Mindestens 25g-35g+ Eiweiß pro Portion"
                >
                  <Dumbbell className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                  <span className="truncate">Protein</span>
                </button>
                <button
                  type="button"
                  id="fridge-tuning-high-calorie-btn"
                  onClick={() => setNutritionGoal('high_calorie')}
                  className={`h-10 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1 text-center touch-manipulation active:scale-95 cursor-pointer ${
                    nutritionGoal === 'high_calorie'
                      ? 'bg-stone-800 text-white shadow-2xs'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                  title="Energiereich & sättigend (650+ kcal)"
                >
                  <Flame className="w-3.5 h-3.5 shrink-0 hidden sm:inline text-amber-400" />
                  <span className="truncate">Kalorien</span>
                </button>
              </div>
            </div>

            {/* 3. Time Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7E7B] mb-1.5">
                Max. Zeit: {maxTime} Min.
              </label>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                className="w-full accent-[#4A7856] cursor-pointer mt-2"
              />
              <div className="flex justify-between text-xs text-[#7A7E7B] mt-1">
                <span>15 Min. (Express)</span>
                <span>50 Min.</span>
              </div>
            </div>

            {/* 4. Extra wishes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7E7B] mb-1.5">
                Wünsche (optional)
              </label>
              <input
                type="text"
                placeholder="z.B. cremig, One-Pot..."
                value={extraWishes}
                onChange={(e) => setExtraWishes(e.target.value)}
                className="w-full h-12 min-h-[48px] bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3.5 text-sm font-medium text-stone-800 focus:outline-hidden focus:border-[#4A7856]"
              />
            </div>
          </div>

          {/* AI Ingredient Limit Slider & Kitchen Staples */}
          <div className="p-3 sm:p-4 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="ai-extra-ingredients-slider" className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#4A7856]" />
                    <span>Zusätzliche Zutaten</span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#ECEBE8] text-[#4A7856] font-bold text-xs">
                      {maxExtraIngredients === 0 ? '0 (Nur Vorräte)' : `Max. ${maxExtraIngredients}`}
                    </span>
                  </label>
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
                <div className="flex justify-between text-xs text-[#7A7E7B] mt-1">
                  <span>0 (Keine Zukäufe)</span>
                  <span>1-2 (Minimal)</span>
                  <span>3 (Ausgewogen)</span>
                  <span>6 (Frei)</span>
                </div>
              </div>

              <div className="sm:border-l sm:border-[#ECEBE8] sm:pl-4 flex flex-col justify-center shrink-0">
                <label className="flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={includeBasics}
                    onChange={(e) => setIncludeBasics(e.target.checked)}
                    className="rounded text-[#4A7856] focus:ring-[#4A7856] w-4 h-4"
                  />
                  <span>Küchen-Basics vorhanden (Öl, Salz, Pfeffer)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

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
            onClick={handleGenerateAI}
            className="w-full h-12 min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {nutritionGoal === 'high_protein'
                    ? 'KI kreiert dein High-Protein-Gericht...'
                    : nutritionGoal === 'high_calorie'
                    ? 'KI kreiert dein energiereiches Gericht...'
                    : 'KI kreiert dein Gericht...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-white" />
                <span>
                  {selectedIngredients.length === 0
                    ? 'Wähle mindestens 1 Zutat aus'
                    : nutritionGoal === 'high_protein'
                    ? `High-Protein-Rezept aus ${selectedIngredients.length} Vorratszutat${selectedIngredients.length > 1 ? 'en' : ''} generieren`
                    : nutritionGoal === 'high_calorie'
                    ? `Kalorienreiches Rezept aus ${selectedIngredients.length} Vorratszutat${selectedIngredients.length > 1 ? 'en' : ''} generieren`
                    : `Gericht aus ${selectedIngredients.length} Vorratszutat${selectedIngredients.length > 1 ? 'en' : ''} generieren`}
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                  {generatedRecipe.isVegan ? '🌱 Vegan' : '🧀 Veggie'}
                </span>
                {nutritionGoal === 'high_protein' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                    <Dumbbell className="w-3 h-3" />
                    High Protein
                  </span>
                )}
                {nutritionGoal === 'high_calorie' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8] text-xs font-semibold">
                    <Flame className="w-3 h-3 text-amber-500" />
                    Viele Kalorien
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
                {generatedRecipe.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#7A7E7B] mt-0.5">
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
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold bg-[#FAF9F6] border border-[#ECEBE8] text-[#2D3E40] hover:bg-[#F1F5F2] shadow-xs"
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
              <Zap className="w-4 h-4 text-[#2D3E40]" />
              <span className="text-xs text-[#2D3E40]"><strong>{generatedRecipe.nutrients.fiber}g</strong> Ballaststoffe</span>
            </div>
          </div>

          {/* Ingredients & Steps Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ingredients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#7A7E7B] uppercase tracking-wider">
                  Zutaten ({generatedRecipe.ingredients.length})
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
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-white text-[#7A7E7B] border border-[#ECEBE8] shrink-0 font-medium">
                            Basic
                          </span>
                        )}
                        {src === 'pantry' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] shrink-0 font-medium">
                            Vorrat
                          </span>
                        )}
                      </div>
                      <span className="text-[#7A7E7B] font-semibold shrink-0">{ing.amount} {ing.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="text-xs font-semibold text-[#7A7E7B] uppercase tracking-wider">
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
                      <p className="text-xs sm:text-sm text-[#2D3E40] leading-relaxed">
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
              <h3 className="text-base sm:text-lg font-semibold text-[#2D3E40]">
                Oder entdecke passende Rezepte aus unserer Sammlung:
              </h3>
              {nutritionGoal === 'high_protein' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                  <Dumbbell className="w-3 h-3" />
                  Nach Protein sortiert
                </span>
              )}
              {nutritionGoal === 'high_calorie' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#2D3E40] text-xs font-semibold border border-[#ECEBE8]">
                  <Flame className="w-3 h-3 text-amber-500" />
                  Nach Kalorien sortiert
                </span>
              )}
            </div>
            <span className="text-xs text-[#7A7E7B]">{matchedExistingRecipes.length} Treffer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedExistingRecipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                className="flex gap-3 bg-white p-3 rounded-2xl border border-[#ECEBE8] hover:border-[#4A7856]/40 hover:shadow-xs transition-all cursor-pointer group"
              >
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover shrink-0 group-hover:scale-103 transition-transform"
                />
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
                      {recipe.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-[#2D3E40] truncate group-hover:text-[#4A7856]">
                    {recipe.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-[#7A7E7B]">
                    <span>⏱️ {recipe.totalTimeMinutes} Min.</span>
                    <span className="text-[#4A7856] font-medium">💪 {recipe.nutrients.protein}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
