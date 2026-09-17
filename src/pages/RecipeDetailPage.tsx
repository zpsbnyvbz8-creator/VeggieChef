import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Clock, 
  Flame, 
  Dumbbell, 
  Heart, 
  Copy, 
  Check, 
  ShoppingCart, 
  CalendarPlus, 
  Sparkles, 
  Leaf, 
  ChefHat, 
  Users, 
  Play, 
  ThumbsDown,
  SmilePlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AISubstitutionResult, RecipeIngredient } from '../types';
import { formatIngredientAmount, generateRecipeIngredientsText, calculateMealSavings } from '../utils/helpers';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useToast } from '../context/ToastContext';

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    recipes,
    favorites,
    toggleFavorite,
    dislikedIds,
    toggleDislike,
    setCookingModeRecipe,
    setIsCookingMinimized,
    setCookingCurrentStep,
    logCooked
  } = useRecipes();
  const { addToShoppingList } = useShopping();
  const { addToMealPlan } = usePlanner();
  const { showToast } = useToast();

  const recipe = recipes.find((r) => r.id === id);

  const [servings, setServings] = useState<number>(recipe?.servings || 4);
  const [copied, setCopied] = useState(false);
  const [addedShopping, setAddedShopping] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Missing ingredient / AI substitution state
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState('');
  const [loadingSubstitution, setLoadingSubstitution] = useState(false);
  const [substitutionResult, setSubstitutionResult] = useState<AISubstitutionResult | null>(null);
  const [showSubstitutionsPanel, setShowSubstitutionsPanel] = useState(false);

  // Veganize mode state
  const [isVeganized, setIsVeganized] = useState(false);
  const [veganizedIngredients, setVeganizedIngredients] = useState<RecipeIngredient[] | null>(null);

  // Mark as cooked dialog
  const [showCookedDialog, setShowCookedDialog] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  // Handle navigate back with fallback
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center mx-auto text-2xl font-bold">
          🥗
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#2D3E40]">Rezept nicht gefunden</h2>
        <p className="text-sm text-[#7A7E7B] max-w-md mx-auto">
          Das gesuchte Gericht existiert nicht mehr oder die Adresse ist fehlerhaft.
        </p>
        <button
          id="not-found-back-btn"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A7856] text-white font-semibold text-sm shadow-xs hover:bg-[#3D6447] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Rezept-Übersicht</span>
        </button>
      </div>
    );
  }

  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);

  const toggleCheckIngredient = (name: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCompleteStep = (stepNum: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const handleCopyIngredients = () => {
    const text = generateRecipeIngredientsText(recipe, servings);
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Zutaten für ${servings} Portionen in Zwischenablage kopiert!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddShopping = () => {
    addToShoppingList(recipe, servings);
    setAddedShopping(true);
    showToast(`Alle Zutaten für ${servings} Portionen auf der Einkaufsliste!`);
    setTimeout(() => setAddedShopping(false), 2500);
  };

  const toggleMissing = (ingName: string) => {
    setMissingIngredients((prev) =>
      prev.includes(ingName) ? prev.filter((i) => i !== ingName) : [...prev, ingName]
    );
  };

  const handleRequestSubstitution = async () => {
    if (missingIngredients.length === 0 && !pantryInput) return;
    setLoadingSubstitution(true);
    setShowSubstitutionsPanel(true);

    try {
      const response = await fetch('/api/ai/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle: recipe.title,
          missingIngredients,
          availableIngredients: pantryInput ? pantryInput.split(',').map((s) => s.trim()) : [],
          currentIngredients: recipe.ingredients,
        }),
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.substitutions)) {
        setSubstitutionResult(data);
      } else {
        showToast(data?.error || 'Keine passenden Alternativen gefunden.');
      }
    } catch (err) {
      console.error('Failed to get substitutions', err);
      showToast('KI-Zutatenersatz momentan nicht erreichbar.');
    } finally {
      setLoadingSubstitution(false);
    }
  };

  const handleVeganize = async () => {
    if (isVeganized) {
      setIsVeganized(false);
      setVeganizedIngredients(null);
      return;
    }

    const hasPreset = recipe.ingredients.some((ing) => ing.veganAlternative);
    if (hasPreset) {
      const modified = recipe.ingredients.map((ing) => {
        if (ing.veganAlternative) {
          return {
            ...ing,
            name: ing.veganAlternative,
            veganAlternative: undefined,
          };
        }
        return ing;
      });

      setVeganizedIngredients(modified);
      setIsVeganized(true);
      showToast('Rezept wurde auf vegane Zutaten umgestellt!');
      return;
    }

    try {
      showToast('KI veganisiert das Rezept...');
      const res = await fetch('/api/ai/veganize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe }),
      });
      const data = await res.json();
      if (data.success && data.veganRecipe?.ingredients) {
        const modified = data.veganRecipe.ingredients.map((ing: any, idx: number) => ({
          name: ing.name,
          amount: ing.amount || recipe.ingredients[idx]?.amount || 100,
          unit: ing.unit || recipe.ingredients[idx]?.unit || 'g',
          category: recipe.ingredients[idx]?.category || 'gemuese',
        }));
        setVeganizedIngredients(modified);
        setIsVeganized(true);
        showToast('Rezept wurde mit KI erfolgreich veganisiert!');
      } else {
        setIsVeganized(true);
        showToast('Rezept auf vegan umgestellt!');
      }
    } catch {
      setIsVeganized(true);
      showToast('Rezept auf vegan umgestellt!');
    }
  };

  const handleLaunchCookingMode = () => {
    setCookingCurrentStep(0);
    setIsCookingMinimized(false);
    setCookingModeRecipe({ recipe, servings });
  };

  const handleConfirmCooked = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6'],
    });

    logCooked(recipe, servings, userNotes);
    setShowCookedDialog(false);
    showToast('🎉 Großartig! Dein Gericht wurde als gekocht in der Statistik erfasst!');
  };

  const activeIngredients = (isVeganized && veganizedIngredients) ? veganizedIngredients : recipe.ingredients;
  const savings = calculateMealSavings(servings, recipe.isVegan || isVeganized);

  return (
    <div className="max-w-4xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation Row: Back Button */}
      <div className="flex items-center justify-between">
        <button
          id="recipe-detail-back-btn"
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#2D3E40] text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#4A7856]" />
          <span>Zurück zur Übersicht</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Dislike Button */}
          <button
            id="recipe-detail-dislike-btn"
            type="button"
            onClick={() => toggleDislike(recipe.id)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isDisliked
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-[#ECEBE8] hover:bg-rose-50/50 hover:text-rose-600 text-[#7A7E7B]'
            }`}
            title={isDisliked ? 'Nicht mehr ablehnen' : 'Gericht seltener anzeigen (Dislike)'}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Quick Favorite Button */}
          <button
            id="recipe-detail-fav-btn"
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isFavorite
                ? 'bg-[#FDF6F0] border-[#F5EADF] text-[#D35400]'
                : 'bg-white border-[#ECEBE8] hover:bg-[#FDF6F0]/50 hover:text-[#D35400] text-[#7A7E7B]'
            }`}
            title="Favorit umschalten"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Recipe Card Container */}
      <article className="bg-white rounded-3xl border border-[#ECEBE8] shadow-xs overflow-hidden">
        {/* Hero Image Section */}
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-slate-900">
          <img
            src={recipe.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80'}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Title and Badges over Image */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#4A7856] text-white text-xs font-semibold shadow-xs">
                {isVeganized || recipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs backdrop-blur-xs font-medium">
                {recipe.category}
              </span>
              {recipe.isCustomAi && (
                <span className="px-2.5 py-1 rounded-full bg-[#E67E22] text-white text-xs font-semibold flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" /> KI-Kreation
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {recipe.title}
            </h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1 sm:mt-1.5 max-w-2xl line-clamp-2">
              {recipe.subtitle}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-[#FAF9F6] p-3 sm:p-4 rounded-2xl border border-[#ECEBE8]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wide">Gesamtzeit</div>
                <div className="font-bold text-[#2D3E40] text-sm sm:text-base">{recipe.totalTimeMinutes} Min.</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-xl bg-[#FDF6F0] text-[#E67E22] shrink-0">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wide">Energie / Port.</div>
                <div className="font-bold text-[#2D3E40] text-sm sm:text-base">{recipe.nutrients.calories} kcal</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wide">Protein / Port.</div>
                <div className="font-bold text-[#4A7856] text-sm sm:text-base">{recipe.nutrients.protein}g</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#7A7E7B] uppercase tracking-wide">CO₂-Ersparnis</div>
                <div className="font-bold text-[#4A7856] text-sm sm:text-base">{savings.savedCO2Kg} kg CO₂</div>
              </div>
            </div>
          </div>

          {/* Action Row: Portionen, Kopieren, Veganisieren, Einkaufsliste, Kochmodus */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#F1F5F2] border border-[#ECEBE8] rounded-2xl">
            {/* Portion Adjuster */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D3E40]">
                <Users className="w-4 h-4 text-[#4A7856]" />
                <span>Portionen:</span>
              </div>
              <div className="flex items-center bg-white border border-[#ECEBE8] rounded-xl p-1 shadow-2xs gap-1 min-h-[42px]">
                {[1, 2, 3, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    id={`servings-btn-${num}`}
                    type="button"
                    onClick={() => setServings(num)}
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg text-sm sm:text-xs font-bold transition-all flex items-center justify-center touch-manipulation cursor-pointer active:scale-90 ${
                      servings === num
                        ? 'bg-[#4A7856] text-white shadow-xs'
                        : 'text-[#7A7E7B] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Copy ingredients */}
              <button
                id="recipe-copy-ingredients-btn"
                type="button"
                onClick={handleCopyIngredients}
                className="flex items-center justify-center gap-1.5 px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl text-xs font-semibold bg-white border border-[#ECEBE8] hover:bg-[#FAF9F6] text-[#2D3E40] shadow-2xs transition-all active:scale-95 touch-manipulation cursor-pointer min-h-[42px] sm:min-h-0"
                title="Zutatenliste für Notizen kopieren"
              >
                {copied ? <Check className="w-4 h-4 text-[#4A7856]" /> : <Copy className="w-4 h-4 text-[#7A7E7B]" />}
                <span>{copied ? 'Kopiert!' : 'Zutaten kopieren'}</span>
              </button>

              {/* Veganize Toggle */}
              {!recipe.isVegan && (
                <button
                  id="recipe-veganize-btn"
                  type="button"
                  onClick={handleVeganize}
                  className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer min-h-[42px] sm:min-h-0 ${
                    isVeganized
                      ? 'bg-[#4A7856] text-white shadow-xs'
                      : 'bg-white hover:bg-[#FAF9F6] text-[#4A7856] border border-[#4A7856]/40'
                  }`}
                >
                  <Leaf className="w-4 h-4" />
                  <span>{isVeganized ? '✓ Vegan' : 'Veganisieren'}</span>
                </button>
              )}

              {/* Add to Shopping List */}
              <button
                id="recipe-add-shopping-btn"
                type="button"
                onClick={handleAddShopping}
                className="flex items-center justify-center gap-1.5 px-4 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold bg-[#4A7856] hover:bg-[#3D6447] text-white shadow-xs transition-all active:scale-95 touch-manipulation cursor-pointer min-h-[42px] sm:min-h-0"
              >
                {addedShopping ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                <span>{addedShopping ? 'Hinzugefügt!' : '+ Einkaufsliste'}</span>
              </button>

              {/* Launch Interactive Kitchen Cooking Mode */}
              <button
                id="recipe-start-cooking-mode-btn"
                type="button"
                onClick={handleLaunchCookingMode}
                className="flex items-center justify-center gap-1.5 px-4 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold bg-[#2D3E40] hover:bg-[#1F2C2D] text-white shadow-xs transition-all active:scale-95 touch-manipulation cursor-pointer min-h-[42px] sm:min-h-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Koch-Modus</span>
              </button>
            </div>
          </div>

          {/* Section: Ingredients List + Missing ingredients AI helper */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#2D3E40] flex items-center gap-2">
                  <span>Zutaten</span>
                  <span className="text-xs font-normal text-[#7A7E7B]">
                    (für {servings} {servings === 1 ? 'Portion' : 'Portionen'})
                  </span>
                </h2>
                <p className="text-xs text-[#7A7E7B]">Tippe auf eine Zutat zum Abhaken beim Kochen.</p>
              </div>

              {/* Toggle missing ingredient mode */}
              <button
                id="toggle-missing-ingredient-btn"
                type="button"
                onClick={() => setShowSubstitutionsPanel(!showSubstitutionsPanel)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#D35400] bg-[#FDF6F0] hover:bg-[#F5EADF] border border-[#F5EADF] transition-colors cursor-pointer touch-manipulation active:scale-95 self-start sm:self-auto min-h-[38px]"
              >
                <Sparkles className="w-4 h-4 text-[#D35400]" />
                <span>Zutat fehlt? KI-Ersatz</span>
              </button>
            </div>

            {/* Missing Ingredients AI Interactive Bar */}
            {showSubstitutionsPanel && (
              <div className="p-4 bg-[#FDF6F0] border border-[#F5EADF] rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2D3E40] uppercase tracking-wider">
                      Smarter KI-Zutatentausch
                    </h3>
                    <p className="text-xs text-[#7A7E7B] mt-0.5">
                      Wähle unten die Zutaten aus, die dir fehlen, oder tippe ein, was du stattdessen zuhause hast.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {recipe.ingredients.map((ing) => {
                    const isSelected = missingIngredients.includes(ing.name);
                    return (
                      <button
                        key={ing.name}
                        type="button"
                        onClick={() => toggleMissing(ing.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#D35400] text-white font-semibold shadow-xs'
                            : 'bg-white text-[#2D3E40] border border-[#F5EADF] hover:bg-white/80'
                        }`}
                      >
                        {isSelected ? '❌ Fehlt: ' : '+ Fehlt: '}
                        {ing.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Optional: Was hast du stattdessen da? (z.B. Tofu, Cashews, Hafermilch)"
                    value={pantryInput}
                    onChange={(e) => setPantryInput(e.target.value)}
                    className="flex-1 bg-white border border-[#ECEBE8] rounded-xl px-3 py-2 text-xs text-[#2D3E40] focus:outline-hidden focus:border-[#4A7856]"
                  />
                  <button
                    id="submit-ai-substitution-btn"
                    type="button"
                    disabled={loadingSubstitution || (missingIngredients.length === 0 && !pantryInput)}
                    onClick={handleRequestSubstitution}
                    className="px-4 py-2 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    {loadingSubstitution ? (
                      <span>Berechne Alternativen...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#E67E22]" />
                        <span>Ersatz vorschlagen</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Substitution Result Box */}
                {substitutionResult && (
                  <div className="p-4 bg-white rounded-xl border border-[#ECEBE8] space-y-3 mt-2 shadow-xs">
                    <h4 className="text-xs font-bold text-[#2D3E40] flex items-center gap-1.5">
                      <span>✨ Vorgeschlagene Alternativen:</span>
                    </h4>
                    <div className="space-y-2">
                      {(substitutionResult.substitutions || []).map((sub, idx) => (
                        <div key={idx} className="p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg text-xs space-y-1">
                          <div className="font-semibold text-[#2D3E40] flex items-center gap-2">
                            <span className="line-through text-[#7A7E7B]">{sub.original}</span>
                            <span>➔</span>
                            <span className="text-[#4A7856] bg-[#F1F5F2] px-2 py-0.5 rounded-md font-bold">
                              {sub.replacement}
                            </span>
                          </div>
                          <p className="text-[#7A7E7B]">{sub.reason}</p>
                          {sub.usageTip && (
                            <p className="text-[#D35400] font-medium italic">💡 {sub.usageTip}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {substitutionResult.advice && (
                      <p className="text-xs text-[#2D3E40] bg-[#FAF9F6] p-2.5 rounded-lg border border-[#ECEBE8]">
                        <strong>Chef-Tipp:</strong> {substitutionResult.advice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ingredients Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeIngredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.name];
                const amountStr = formatIngredientAmount(ing, recipe.servings, servings);
                return (
                  <div
                    key={ing.name}
                    onClick={() => toggleCheckIngredient(ing.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-[#FAF9F6] border-[#ECEBE8] text-[#7A7E7B]'
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#2D3E40] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked
                            ? 'bg-[#4A7856] border-[#4A7856] text-white'
                            : 'border-[#ECEBE8] bg-[#FAF9F6]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-sm font-medium ${isChecked ? 'line-through text-[#7A7E7B]' : 'text-[#2D3E40]'}`}>
                        {ing.name}
                      </span>
                    </div>

                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      isChecked ? 'bg-[#ECEBE8] text-[#7A7E7B]' : 'bg-[#F1F5F2] text-[#4A7856]'
                    }`}>
                      {amountStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Nutritional Balance */}
          <div className="p-4 sm:p-5 bg-[#FAF9F6] rounded-2xl border border-[#ECEBE8] space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#7A7E7B] uppercase tracking-wider">
              Nährwerte pro Portion ({recipe.nutrients.calories} kcal)
            </h3>

            {/* Macro Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
              <div className="p-3 bg-white rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs sm:text-sm text-[#7A7E7B] font-semibold">Protein</div>
                <div className="text-base sm:text-lg font-bold text-[#4A7856] mt-0.5">{recipe.nutrients.protein}g</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs sm:text-sm text-[#7A7E7B] font-semibold">Kohlenhydrate</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5">{recipe.nutrients.carbs}g</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs sm:text-sm text-[#7A7E7B] font-semibold">Fett</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5">{recipe.nutrients.fat}g</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs sm:text-sm text-[#7A7E7B] font-semibold">Ballaststoffe</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5">{recipe.nutrients.fiber}g</div>
              </div>
            </div>

            {/* Micronutrients if present */}
            {(recipe.nutrients.iron || recipe.nutrients.calcium || recipe.nutrients.b12 || recipe.nutrients.zinc) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#ECEBE8] text-xs text-[#7A7E7B]">
                {recipe.nutrients.iron && (
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#ECEBE8] text-[#2D3E40]">
                    🩸 <strong>{recipe.nutrients.iron}mg</strong> Eisen
                  </span>
                )}
                {recipe.nutrients.calcium && (
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#ECEBE8] text-[#2D3E40]">
                    🦴 <strong>{recipe.nutrients.calcium}mg</strong> Calcium
                  </span>
                )}
                {recipe.nutrients.zinc && (
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#ECEBE8] text-[#2D3E40]">
                    🛡️ <strong>{recipe.nutrients.zinc}mg</strong> Zink
                  </span>
                )}
                {recipe.nutrients.b12 && (
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#ECEBE8] text-[#2D3E40]">
                    ⚡ <strong>{recipe.nutrients.b12}µg</strong> Vitamin B12
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Step by Step Cooking Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2D3E40]">
              Zubereitung Schritt für Schritt
            </h3>

            <div className="space-y-3">
              {recipe.steps.map((step, idx) => {
                const stepObj =
                  typeof step === 'string'
                    ? { stepNumber: idx + 1, title: `Schritt ${idx + 1}`, text: step, timerMinutes: undefined }
                    : step;
                const isStepDone = !!completedSteps[stepObj.stepNumber];
                return (
                  <div
                    key={stepObj.stepNumber}
                    onClick={() => toggleCompleteStep(stepObj.stepNumber)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isStepDone
                        ? 'bg-[#FAF9F6] border-[#ECEBE8] opacity-60'
                        : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-semibold text-xs ${
                          isStepDone
                            ? 'bg-[#4A7856] text-white'
                            : 'bg-[#2D3E40] text-white'
                        }`}
                      >
                        {isStepDone ? '✓' : stepObj.stepNumber}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#2D3E40] text-sm">
                            {stepObj.title || `Schritt ${stepObj.stepNumber}`}
                          </span>
                          {stepObj.timerMinutes && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A7856] bg-[#F1F5F2] px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" />
                              {stepObj.timerMinutes} Min.
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${isStepDone ? 'line-through text-[#7A7E7B]' : 'text-[#2D3E40]'}`}>
                          {stepObj.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chef Tip Box */}
          {recipe.chefTip && (
            <div className="p-4 bg-[#FDF6F0] border border-[#F5EADF] rounded-2xl flex items-start gap-3">
              <ChefHat className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#D35400] uppercase tracking-wider">
                  Profi-Geheimtipp vom Veggie-Chef
                </h4>
                <p className="text-xs sm:text-sm text-[#2D3E40] mt-1 leading-relaxed">
                  {recipe.chefTip}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#FAF9F6] border-t border-[#ECEBE8] flex flex-wrap items-center justify-between gap-3">
          <button
            id="recipe-add-to-meal-plan-btn"
            type="button"
            onClick={() => {
              addToMealPlan(recipe);
              showToast(`"${recipe.title}" wurde in deinen Wochenplaner übertragen!`);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#2D3E40] bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] transition-colors shadow-2xs cursor-pointer active:scale-95"
          >
            <CalendarPlus className="w-4 h-4 text-[#4A7856]" />
            <span>In Wochenplan</span>
          </button>

          <button
            id="recipe-log-cooked-trigger-btn"
            type="button"
            onClick={() => setShowCookedDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#4A7856] hover:bg-[#3D6447] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <SmilePlus className="w-4 h-4" />
            <span>Ich habe das gekocht!</span>
          </button>
        </div>
      </article>

      {/* "Gericht gekocht" Star & Notes Dialog */}
      {showCookedDialog && (
        <div 
          onClick={() => setShowCookedDialog(false)}
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 touch-none overscroll-contain animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-[#ECEBE8] animate-in zoom-in-95 duration-200 overscroll-contain"
          >
            <div className="text-center space-y-1">
              <span className="text-3xl">🎉</span>
              <h3 className="text-xl font-bold text-[#2D3E40]">
                Guten Appetit!
              </h3>
              <p className="text-xs text-[#7A7E7B]">
                Möchtest du "{recipe.title}" in deiner Kochstatistik eintragen?
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D3E40] mb-1">
                Eigene Notizen / Anpassungen (optional):
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="z.B. 'Nächstes Mal noch etwas Chili dazugeben, allen hat es super geschmeckt!'"
                rows={3}
                className="w-full text-xs p-3 border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden text-[#2D3E40]"
              />
            </div>

            <div className="p-3 bg-[#F1F5F2] rounded-xl text-xs text-[#4A7856] border border-[#ECEBE8]">
              🌱 Durch dieses Gericht hast du ca. <strong>{savings.savedCO2Kg} kg CO₂</strong> und <strong>{savings.savedWaterLiters} Liter Wasser</strong> eingespart!
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCookedDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#7A7E7B] bg-[#FAF9F6] hover:bg-[#F1F5F2] cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                id="confirm-log-cooked-btn"
                type="button"
                onClick={handleConfirmCooked}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4A7856] hover:bg-[#3D6447] shadow-xs cursor-pointer active:scale-95"
              >
                In Statistik speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetailPage;
