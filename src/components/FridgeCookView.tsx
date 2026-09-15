import React, { useState, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import { Recipe } from '../types';
import { PANTRY_QUICK_ITEMS } from '../data/recipes';

interface FridgeCookViewProps {
  allRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onSaveCustomRecipe: (recipe: Recipe) => void;
  onlyVeganGlobal: boolean;
  onCopyFeedback: (msg: string) => void;
}

export const FridgeCookView: React.FC<FridgeCookViewProps> = ({
  allRecipes,
  onSelectRecipe,
  onSaveCustomRecipe,
  onlyVeganGlobal,
  onCopyFeedback,
}) => {
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
  const [maxTime, setMaxTime] = useState(25);
  const [maxExtraIngredients, setMaxExtraIngredients] = useState(2); // AI additional ingredient slider
  const [includeBasics, setIncludeBasics] = useState(true); // Basic staples (oil, salt, pepper, etc.)
  const [extraWishes, setExtraWishes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

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
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.recipe) {
        throw new Error(data.error || 'Die KI-Zubereitung für deine Vorräte ist aktuell leider nicht erreichbar.');
      }

      const raw = data.recipe;
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
        tags: ['KI-Kreation', isVegan ? 'Vegan' : 'Vegetarisch', 'Resteverwertung'],
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
  const matchedExistingRecipes = allRecipes.filter((r) => {
    if (isVegan && !r.isVegan) return false;
    const ingNames = r.ingredients.map((i) => i.name.toLowerCase());
    return selectedIngredients.some((sel) =>
      ingNames.some((ing) => ing.includes(sel.toLowerCase()) || sel.toLowerCase().includes(ing))
    );
  });

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Intro Banner - clean neutral card matching app theme */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 text-[#2D3E40] shadow-xs border border-[#ECEBE8]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-[11px] sm:text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#4A7856]" />
            Vorratskammer & KI-Rezeptsuche
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#2D3E40]">
            Was hast du im Kühlschrank?
          </h2>
          <p className="text-xs sm:text-sm text-[#7A7E7B] leading-relaxed">
            Wähle deine vorhandenen Zutaten aus. Die KI kreiert daraus ein schnelles, einfaches Rezept genau nach deinen Vorräten.
          </p>
        </div>
      </div>

      {/* Main Ingredient Selector Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs space-y-4 sm:space-y-6">
        {/* Selected Items Tags */}
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wider">
              Deine ausgewählten Zutaten ({selectedIngredients.length})
            </h3>
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => setSelectedIngredients([])}
                className="text-[11px] sm:text-xs text-[#7A7E7B] hover:text-[#D35400] font-medium"
              >
                Alle entfernen
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 min-h-11 sm:min-h-12 p-2.5 sm:p-3 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] items-center">
            {selectedIngredients.length === 0 ? (
              <span className="text-[11px] sm:text-xs text-[#7A7E7B] italic">
                Noch keine Zutaten ausgewählt. Klicke unten auf Zutaten oder tippe eigene ein!
              </span>
            ) : (
              selectedIngredients.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#F1F5F2] text-[#4A7856] text-[11px] sm:text-xs font-medium shadow-2xs border border-[#ECEBE8] animate-in zoom-in-95 duration-150"
                >
                  <span>{item}</span>
                  <button
                    onClick={() => togglePantryItem(item)}
                    className="hover:text-[#D35400] transition-colors"
                  >
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleAddCustom} className="flex gap-2">
          <input
            id="custom-ingredient-input"
            type="text"
            placeholder="Zutat eingeben (z.B. Champignons, Cashewkerne)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#2D3E40] focus:outline-hidden focus:border-[#4A7856] focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer touch-manipulation active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Hinzufügen</span>
          </button>
        </form>

        {/* Quick Pantry Item Pills */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="block text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wider">
            Häufige Vorräte & Frischezutaten:
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-40 sm:max-h-44 overflow-y-auto pr-1">
            {PANTRY_QUICK_ITEMS.map((item) => {
              const isSelected = selectedIngredients.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => togglePantryItem(item)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all select-none cursor-pointer touch-manipulation active:scale-95 flex items-center ${
                    isSelected
                      ? 'bg-[#4A7856] text-white shadow-xs'
                      : 'bg-[#FAF9F6] text-[#7A7E7B] hover:bg-[#F1F5F2] hover:text-[#2D3E40] border border-[#ECEBE8]'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipe Preferences Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-[#ECEBE8]">
          {/* Vegan / Veggie Toggle */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-[#2D3E40] mb-1">
              Ernährungsweise
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-[#FAF9F6] border border-[#ECEBE8] p-1 rounded-xl min-h-[44px]">
              <button
                type="button"
                onClick={() => setIsVegan(false)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer ${
                  !isVegan ? 'bg-white text-[#2D3E40] shadow-xs' : 'text-[#7A7E7B]'
                }`}
              >
                🧀 Veggie
              </button>
              <button
                type="button"
                onClick={() => setIsVegan(true)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer ${
                  isVegan ? 'bg-[#4A7856] text-white shadow-xs' : 'text-[#7A7E7B]'
                }`}
              >
                🌱 Vegan
              </button>
            </div>
          </div>

          {/* Time Selector */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-[#2D3E40] mb-1">
              Max. Zeit: {maxTime} Min.
            </label>
            <input
              type="range"
              min="15"
              max="50"
              step="5"
              value={maxTime}
              onChange={(e) => setMaxTime(Number(e.target.value))}
              className="w-full accent-[#4A7856] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] sm:text-[10px] text-[#7A7E7B] mt-0.5">
              <span>15 Min. (Express)</span>
              <span>50 Min.</span>
            </div>
          </div>

          {/* Extra wishes */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-[#2D3E40] mb-1">
              Wünsche (optional)
            </label>
            <input
              type="text"
              placeholder="z.B. cremig, One-Pot..."
              value={extraWishes}
              onChange={(e) => setExtraWishes(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3 py-1.5 text-xs text-[#2D3E40] focus:outline-hidden focus:border-[#4A7856]"
            />
          </div>
        </div>

        {/* AI Ingredient Limit Slider & Kitchen Staples */}
        <div className="p-3 sm:p-4 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] space-y-2.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="ai-extra-ingredients-slider" className="text-xs font-semibold text-[#2D3E40] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#4A7856]" />
                  <span>Zusätzliche Zutaten</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#ECEBE8] text-[#4A7856] font-bold text-[11px] sm:text-xs">
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
              <div className="flex justify-between text-[9px] sm:text-[10px] text-[#7A7E7B] mt-0.5">
                <span>0 (Keine Zukäufe)</span>
                <span>1-2 (Minimal)</span>
                <span>3 (Ausgewogen)</span>
                <span>6 (Frei)</span>
              </div>
            </div>

            <div className="sm:border-l sm:border-[#ECEBE8] sm:pl-4 flex flex-col justify-center shrink-0">
              <label className="flex items-center gap-2 text-xs font-medium text-[#2D3E40] cursor-pointer select-none py-1">
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

        {/* Error notification if AI failed */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start justify-between gap-3 animate-in fade-in duration-200">
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

        {/* Generate Button */}
        <div className="pt-1">
          <button
            id="generate-fridge-recipe-btn"
            disabled={isGenerating || selectedIngredients.length === 0}
            onClick={handleGenerateAI}
            className="w-full min-h-[46px] py-3 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>KI kreiert dein Gericht...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Rezept aus {selectedIngredients.length} Zutaten zaubern</span>
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
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF] text-[10px] sm:text-xs font-semibold uppercase">
                  ✨ KI-Rezept
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-[10px] sm:text-xs font-semibold">
                  {generatedRecipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
                </span>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#ECEBE8] text-[#4A7856] font-medium">
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
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#ECEBE8] text-[#4A7856] text-[10px] font-semibold">
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2D3E40]">
              Oder entdecke passende Rezepte aus unserer Sammlung:
            </h3>
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
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#4A7856]">
                      {recipe.category}
                    </span>
                    <h4 className="font-semibold text-xs sm:text-sm text-[#2D3E40] truncate group-hover:text-[#4A7856]">
                      {recipe.title}
                    </h4>
                  </div>
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
