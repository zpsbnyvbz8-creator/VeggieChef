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
  SmilePlus,
  Minus,
  Plus
} from 'lucide-react';
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
      let data: any = null;

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

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          data = await response.json();
        }
      } catch (fetchErr) {
        console.warn('API /api/ai/substitute unavailable, using local culinary fallback:', fetchErr);
      }

      if (data && data.success && Array.isArray(data.substitutions) && data.substitutions.length > 0) {
        setSubstitutionResult(data);
      } else {
        // High quality local culinary substitutions fallback
        const fallbackSubs = missingIngredients.map((missing) => {
          const mLower = missing.toLowerCase();
          let suggestion = 'Pflanzliche Kochalternative';
          let explanation = 'Lässt sich 1:1 im Gericht ersetzen und erhält Konsistenz & Geschmack.';
          let tags = ['Pflanzlich', 'Alltagstauglich'];

          if (mLower.includes('milch')) {
            suggestion = 'Hafermilch oder Mandelmilch';
            explanation = 'Beste Allround-Alternative mit natürlicher leichter Süße.';
            tags = ['100% Vegan', 'Getreidebasis'];
          } else if (mLower.includes('sahne') || mLower.includes('rahm')) {
            suggestion = 'Hafersahne (Cuisine) oder Kokosmilch';
            explanation = 'Sorgt für cremige Bindung und sämige Textur in Saucen.';
            tags = ['100% Vegan', 'Cremig'];
          } else if (mLower.includes('butter')) {
            suggestion = 'Vegane Butter oder Rapsöl / Olivenöl';
            explanation = '80 g natives Pflanzenöl ersetzen ca. 100 g Butter hervorragend.';
            tags = ['Cholesterinfrei', 'Gesunde Fette'];
          } else if (mLower.includes('ei')) {
            suggestion = '1 EL geschrotete Leinsamen (mit 3 EL Wasser) oder 60 g Apfelmus';
            explanation = 'Hervorragendes pflanzliches Bindemittel ohne Beigeschmack.';
            tags = ['Reich an Ballaststoffen', 'Bindung'];
          } else if (mLower.includes('parmesan') || mLower.includes('käse')) {
            suggestion = 'Würzige Hefeflocken oder Cashew-Parmesan';
            explanation = 'Liefert den typischen nussig-käsigen Umami-Geschmack.';
            tags = ['Umami', 'Vitamin B'];
          } else if (mLower.includes('tofu') || mLower.includes('fleisch')) {
            suggestion = 'Räuchertofu, Kichererbsen oder braune Champignons';
            explanation = 'Gibt herzhaften Biss und liefert hochwertiges pflanzliches Protein.';
            tags = ['Proteinreich', 'Bissfest'];
          }

          return {
            originalIngredient: missing,
            substitute: suggestion,
            ratio: '1:1',
            flavorImpact: 'Sehr harmonisch',
            explanation,
            tags,
          };
        });

        setSubstitutionResult({
          recipeTitle: recipe.title,
          substitutions: fallbackSubs,
          culinaryTip: 'Pflanzliche Alternativen haben oft weniger Eigenfett – bei Bedarf mit einem Schuss Olivenöl abschmecken.',
          overallMatchScore: 92,
        });
      }
    } catch (err) {
      console.error('Failed to get substitutions', err);
      showToast('Zutaten-Alternativen aus der Speisekammer aktiviert.');
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
      showToast('Rezept wird veganisiert...');
      let data: any = null;

      try {
        const res = await fetch('/api/ai/veganize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch (fetchErr) {
        console.warn('API /api/ai/veganize unavailable, using local culinary veganizer:', fetchErr);
      }

      if (data && data.success && data.veganRecipe?.ingredients) {
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
        // Smart culinary veganization map
        const modified = recipe.ingredients.map((ing) => {
          const lower = ing.name.toLowerCase();
          let newName = ing.name;
          if (lower.includes('kuhmilch') || lower === 'milch') newName = 'Haferdrink';
          else if (lower.includes('sahne') || lower.includes('rahm')) newName = 'Hafer-Cuisine';
          else if (lower.includes('butter')) newName = 'Vegane Butter';
          else if (lower.includes('parmesan')) newName = 'Hefeflocken & gemahlene Mandeln';
          else if (lower.includes('käse')) newName = 'Veganer Reibegenuss';
          else if (lower.includes('honig')) newName = 'Agavendicksaft';
          else if (lower.includes('joghurt')) newName = 'Soja-Joghurt ungesüßt';
          else if (lower.includes('quark')) newName = 'Sojaprodukt nach Quark-Art';
          else if (lower.includes('ei')) newName = 'Kichererbsen-Bindung';
          return { ...ing, name: newName };
        });
        setVeganizedIngredients(modified);
        setIsVeganized(true);
        showToast('Rezept auf 100% pflanzlich umgestellt!');
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
    import('canvas-confetti').then((module) => {
      const confetti = module.default;
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6'],
      });
    }).catch(() => {});

    logCooked(recipe, servings, userNotes);
    setShowCookedDialog(false);
    showToast('🎉 Großartig! Dein Gericht wurde als gekocht in der Statistik erfasst!');
  };

  const activeIngredients = (isVeganized && veganizedIngredients) ? veganizedIngredients : recipe.ingredients;
  const savings = calculateMealSavings(servings, recipe.isVegan || isVeganized);

  return (
    <div className="max-w-4xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-5 sm:space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Top Navigation Row: Back Button & Secondary Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          id="recipe-detail-back-btn"
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#2D3E40] text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer touch-manipulation active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#4A7856]" />
          <span>Zurück zur Übersicht</span>
        </button>

        {/* Secondary Header Actions (Meal Plan, Log Cooked, Dislike, Favorite) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Add to Weekly Plan */}
          <button
            id="recipe-header-add-to-meal-plan-btn"
            type="button"
            onClick={() => {
              addToMealPlan(recipe);
              showToast(`"${recipe.title}" wurde in deinen Wochenplaner übertragen!`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] text-xs font-semibold shadow-2xs transition-all cursor-pointer touch-manipulation active:scale-95"
            title="In den Wochenplan eintragen"
          >
            <CalendarPlus className="w-4 h-4 text-[#4A7856]" />
            <span className="hidden sm:inline">Wochenplan</span>
          </button>

          {/* Mark as Cooked */}
          <button
            id="recipe-header-log-cooked-btn"
            type="button"
            onClick={() => setShowCookedDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] text-xs font-semibold shadow-2xs transition-all cursor-pointer touch-manipulation active:scale-95"
            title="Als gekocht in Statistik erfassen"
          >
            <SmilePlus className="w-4 h-4 text-[#4A7856]" />
            <span className="hidden sm:inline">Gekocht!</span>
          </button>

          {/* Quick Dislike Button */}
          <button
            id="recipe-detail-dislike-btn"
            type="button"
            onClick={() => toggleDislike(recipe.id)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isDisliked
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-[#ECEBE8] hover:bg-rose-50/50 hover:text-rose-600 text-stone-500'
            }`}
            title={isDisliked ? 'Nicht mehr ablehnen' : 'Gericht seltener anzeigen (Dislike)'}
            aria-label="Gericht seltener anzeigen"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Quick Favorite Button */}
          <button
            id="recipe-detail-fav-btn"
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isFavorite
                ? 'bg-[#FDF6F0] border-[#F5EADF] text-[#D35400]'
                : 'bg-white border-[#ECEBE8] hover:bg-[#FDF6F0]/50 hover:text-[#D35400] text-stone-500'
            }`}
            title="Favorit umschalten"
            aria-label="Favorit umschalten"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Recipe Card Container */}
      <article className="bg-white rounded-3xl border border-[#ECEBE8] shadow-xs overflow-hidden">
        {/* 1. Hero / Image Header (Full-bleed edge-to-edge container) */}
        {recipe.isCustomAi || !recipe.image || recipe.image.trim() === '' || recipe.image === 'veggiechef-placeholder' ? (
          <div className="relative w-full bg-gradient-to-b from-[#FAF9F6] to-white border-b border-[#ECEBE8] p-6 sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden">
            {/* Background watermark */}
            <div className="absolute right-4 -bottom-6 sm:right-8 sm:-bottom-8 opacity-15 pointer-events-none select-none">
              <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-3xl bg-[#ECEBE8] flex items-center justify-center">
                <Leaf className="w-20 h-20 sm:w-28 sm:h-28 text-[#7A7E7B]" />
              </div>
            </div>

            {/* Subtle Brand pill */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-[#ECEBE8] flex items-center justify-center text-[#7A7E7B] shadow-2xs">
                <Leaf className="w-4 h-4 text-[#7A7E7B]" />
              </div>
              <span className="text-xs font-bold tracking-tight text-[#7A7E7B]">VeggieChef</span>
              <span className="text-xs text-[#9BA19D] font-medium">• Aus deiner Vorratskammer</span>
            </div>

            {/* Badges, Title and Subtitle */}
            <div className="relative z-10 space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#4A7856] text-white text-xs font-semibold shadow-xs">
                  {isVeganized || recipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                  {recipe.category}
                </span>
                {recipe.difficulty && (
                  <span className="px-2.5 py-1 rounded-full bg-white text-[#7A7E7B] border border-[#ECEBE8] text-xs font-medium">
                    {recipe.difficulty}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2D3E40] leading-tight">
                {recipe.title}
              </h1>
              {recipe.subtitle && (
                <p className="text-[#7A7E7B] text-sm sm:text-base leading-relaxed max-w-2xl">
                  {recipe.subtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative h-72 sm:h-88 md:h-[400px] w-full overflow-hidden bg-stone-900">
            <img
              src={recipe.image}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

            {/* Title, Subtitle and Badges overlaid on bottom of Hero Image */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-2 max-w-3xl">
              {/* Subtle Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#4A7856] text-white text-xs font-semibold shadow-xs">
                  {isVeganized || recipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs backdrop-blur-md font-medium border border-white/10">
                  {recipe.category}
                </span>
                {recipe.difficulty && (
                  <span className="px-2.5 py-1 rounded-full bg-black/30 text-white/90 text-xs backdrop-blur-md font-medium border border-white/10">
                    {recipe.difficulty}
                  </span>
                )}
              </div>

              {/* Main Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight drop-shadow-xs">
                {recipe.title}
              </h1>

              {/* Subtitle */}
              {recipe.subtitle && (
                <p className="text-white/85 text-xs sm:text-sm leading-relaxed max-w-2xl line-clamp-2">
                  {recipe.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* 2. Quick-Facts Container */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF9F6] p-4 rounded-2xl border border-[#ECEBE8]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">Gesamtzeit</div>
                <div className="font-bold text-[#2D3E40] text-sm sm:text-base tabular-nums">{recipe.totalTimeMinutes} Min.</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FDF6F0] text-[#E67E22] shrink-0">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">Kalorien</div>
                <div className="font-bold text-[#2D3E40] text-sm sm:text-base tabular-nums">{recipe.nutrients.calories} kcal</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">Protein</div>
                <div className="font-bold text-[#4A7856] text-sm sm:text-base tabular-nums">{recipe.nutrients.protein}g</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F1F5F2] text-[#4A7856] shrink-0">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">CO₂-Ersparnis</div>
                <div className="font-bold text-[#4A7856] text-sm sm:text-base tabular-nums">{savings.savedCO2Kg} kg CO₂</div>
              </div>
            </div>
          </div>

          {/* 3. Servings & Quick Actions Section */}
          <div className="bg-[#FAF9F6] border border-[#ECEBE8] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              {/* Servings Stepper: Single clear plus/minus stepper */}
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold text-[#2D3E40] shrink-0 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#4A7856]" />
                  <span>Portionen:</span>
                </span>
                <div className="inline-flex items-center bg-white border border-[#ECEBE8] rounded-xl p-1 shadow-2xs">
                  <button
                    id="servings-decrease-btn"
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    disabled={servings <= 1}
                    className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[#F1F5F2] active:bg-[#ECEBE8] disabled:opacity-30 text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                    aria-label="Portion um 1 verringern"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 sm:px-4 text-sm font-bold text-[#2D3E40] tabular-nums min-w-[90px] text-center select-none">
                    {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                  </span>
                  <button
                    id="servings-increase-btn"
                    type="button"
                    onClick={() => setServings(Math.min(24, servings + 1))}
                    className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[#F1F5F2] active:bg-[#ECEBE8] text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                    aria-label="Portion um 1 erhöhen"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secondary Actions: Subtle button variants */}
              <div className="flex flex-wrap items-center gap-2">
                {!recipe.isVegan && (
                  <button
                    id="recipe-veganize-btn"
                    type="button"
                    onClick={handleVeganize}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                      isVeganized
                        ? 'bg-[#4A7856] text-white border-[#4A7856]'
                        : 'bg-white text-[#4A7856] border-[#ECEBE8] hover:border-[#4A7856]/40'
                    }`}
                  >
                    <Leaf className="w-3.5 h-3.5" />
                    <span>{isVeganized ? '✓ Vegan' : 'Veganisieren'}</span>
                  </button>
                )}

                <button
                  id="recipe-add-shopping-btn"
                  type="button"
                  onClick={handleAddShopping}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  {addedShopping ? <Check className="w-3.5 h-3.5 text-[#4A7856]" /> : <ShoppingCart className="w-3.5 h-3.5 text-[#7A7E7B]" />}
                  <span>{addedShopping ? 'Auf der Liste' : '+ Einkaufsliste'}</span>
                </button>

                <button
                  id="recipe-copy-ingredients-btn"
                  type="button"
                  onClick={handleCopyIngredients}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#4A7856]" /> : <Copy className="w-3.5 h-3.5 text-[#7A7E7B]" />}
                  <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
                </button>
              </div>
            </div>

            {/* Primary CTA: Start Cooking Mode Button (full-width prominent styling) */}
            <button
              id="recipe-start-cooking-mode-btn"
              type="button"
              onClick={handleLaunchCookingMode}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-base font-bold bg-[#4A7856] hover:bg-[#3D6447] active:bg-[#34553C] text-white shadow-xs transition-all cursor-pointer active:scale-[0.99] touch-manipulation"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Koch-Modus starten</span>
            </button>
          </div>

          {/* 4. Ingredients List (Zutaten) - Simple vertical list with dividers and no individual card borders */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-[#2D3E40] flex items-center gap-2">
                  <span>Zutaten</span>
                  <span className="text-xs font-normal text-[#7A7E7B]">
                    (für {servings} {servings === 1 ? 'Portion' : 'Portionen'})
                  </span>
                </h2>
                <p className="text-xs text-[#7A7E7B] mt-0.5">Tippe auf eine Zutat zum Abhaken beim Kochen.</p>
              </div>

              {/* Toggle missing ingredient AI mode */}
              <button
                id="toggle-missing-ingredient-btn"
                type="button"
                onClick={() => setShowSubstitutionsPanel(!showSubstitutionsPanel)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#D35400] bg-[#FDF6F0] hover:bg-[#F5EADF] border border-[#F5EADF] transition-colors cursor-pointer active:scale-95 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D35400]" />
                <span>Zutat fehlt? KI-Ersatz</span>
              </button>
            </div>

            {/* Missing Ingredients AI Helper Panel */}
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

            {/* Clean vertical list with divider lines between items (no cards) */}
            <div className="border border-[#ECEBE8] rounded-2xl overflow-hidden bg-white">
              <ul className="divide-y divide-[#ECEBE8]">
                {activeIngredients.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.name];
                  const amountStr = formatIngredientAmount(ing, recipe.servings, servings);
                  return (
                    <li
                      key={ing.name}
                      onClick={() => toggleCheckIngredient(ing.name)}
                      className="flex items-center justify-between py-3.5 px-4 sm:px-5 hover:bg-[#FAF9F6] transition-colors cursor-pointer select-none group"
                    >
                      {/* Left: Checkbox + Ingredient Name */}
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isChecked
                              ? 'bg-[#4A7856] border-[#4A7856] text-white'
                              : 'border-[#D1D5DB] bg-white group-hover:border-[#4A7856]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-sm sm:text-base font-medium truncate ${
                            isChecked ? 'line-through text-[#9BA19D]' : 'text-[#2D3E40]'
                          }`}
                        >
                          {ing.name}
                        </span>
                      </div>

                      {/* Right: Quantity and Unit perfectly right-aligned */}
                      <span
                        className={`text-sm sm:text-base font-semibold text-right tabular-nums shrink-0 whitespace-nowrap ${
                          isChecked ? 'line-through text-[#9BA19D]' : 'text-[#4A7856]'
                        }`}
                      >
                        {amountStr}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* 5. Nutrition Container (Nährwerte) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#7A7E7B] uppercase tracking-wider">
              Nährwerte pro Portion ({recipe.nutrients.calories} kcal)
            </h3>

            {/* Main Macros: 2x2 grid (or 4 on desktop), flat clean presentation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs font-semibold text-[#7A7E7B]">Protein</div>
                <div className="text-base sm:text-lg font-bold text-[#4A7856] mt-0.5 tabular-nums">{recipe.nutrients.protein}g</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs font-semibold text-[#7A7E7B]">Kohlenhydrate</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">{recipe.nutrients.carbs}g</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs font-semibold text-[#7A7E7B]">Fett</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">{recipe.nutrients.fat}g</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEBE8] text-center">
                <div className="text-xs font-semibold text-[#7A7E7B]">Ballaststoffe</div>
                <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">{recipe.nutrients.fiber}g</div>
              </div>
            </div>

            {/* Micros: linear list below main grid with clean spacing */}
            {(recipe.nutrients.iron || recipe.nutrients.calcium || recipe.nutrients.b12 || recipe.nutrients.zinc) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs text-[#7A7E7B]">
                <span className="font-semibold text-[#2D3E40]">Mikronährstoffe:</span>
                {recipe.nutrients.iron && (
                  <span>Eisen: <strong className="text-[#2D3E40]">{recipe.nutrients.iron}mg</strong></span>
                )}
                {recipe.nutrients.calcium && (
                  <span>Calcium: <strong className="text-[#2D3E40]">{recipe.nutrients.calcium}mg</strong></span>
                )}
                {recipe.nutrients.zinc && (
                  <span>Zink: <strong className="text-[#2D3E40]">{recipe.nutrients.zinc}mg</strong></span>
                )}
                {recipe.nutrients.b12 && (
                  <span>Vitamin B12: <strong className="text-[#2D3E40]">{recipe.nutrients.b12}µg</strong></span>
                )}
              </div>
            )}
          </div>

          {/* 6. Preparation Steps (Zubereitung Schritt für Schritt) - Vertical timeline (no cards) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xl font-bold text-[#2D3E40]">
              Zubereitung Schritt für Schritt
            </h3>

            <div className="relative pl-1 sm:pl-3 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[#ECEBE8]">
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
                    className="relative flex items-start gap-3.5 sm:gap-4.5 cursor-pointer select-none group"
                  >
                    {/* Timeline indicator: Consistent numbered circle on the left */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all ${
                        isStepDone
                          ? 'bg-[#4A7856] text-white shadow-xs ring-4 ring-white'
                          : 'bg-white border-2 border-[#4A7856] text-[#4A7856] group-hover:bg-[#F1F5F2] ring-4 ring-white'
                      }`}
                    >
                      {isStepDone ? <Check className="w-4 h-4 stroke-[3]" /> : stepObj.stepNumber}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-base font-bold transition-colors ${
                          isStepDone ? 'line-through text-[#9BA19D]' : 'text-[#2D3E40]'
                        }`}>
                          {stepObj.title || `Schritt ${stepObj.stepNumber}`}
                        </span>

                        {stepObj.timerMinutes && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A7856] bg-[#F1F5F2] px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            {stepObj.timerMinutes} Min.
                          </span>
                        )}
                      </div>

                      <p className={`text-sm sm:text-base leading-relaxed transition-colors ${
                        isStepDone ? 'line-through text-[#9BA19D]' : 'text-[#2D3E40]'
                      }`}>
                        {stepObj.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chef Tip Callout (flat, clean accent instead of heavy card-in-card) */}
            {recipe.chefTip && (
              <div className="p-4 bg-[#FDF6F0] border-l-4 border-[#D35400] rounded-r-2xl flex items-start gap-3 mt-4">
                <ChefHat className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#D35400] uppercase tracking-wider">
                    Profi-Tipp vom Veggie-Chef
                  </h4>
                  <p className="text-xs sm:text-sm text-[#2D3E40] mt-1 leading-relaxed">
                    {recipe.chefTip}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* 7. Permanent Simplified Sticky Bottom Bar */}
      <aside aria-label="Koch-Modus Schnellzugriff" className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#ECEBE8] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Quick servings control in sticky bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7A7E7B] hidden sm:inline">Portionen:</span>
            <div className="inline-flex items-center bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] disabled:opacity-30 text-[#2D3E40] transition-colors cursor-pointer"
                title="Portion verringern"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 text-xs sm:text-sm font-bold text-[#2D3E40] tabular-nums min-w-[65px] text-center">
                {servings} {servings === 1 ? 'Port.' : 'Port.'}
              </span>
              <button
                type="button"
                onClick={() => setServings(Math.min(24, servings + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] text-[#2D3E40] transition-colors cursor-pointer"
                title="Portion erhöhen"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Primary CTA: Start Cooking Mode */}
          <button
            id="sticky-start-cooking-mode-btn"
            type="button"
            onClick={handleLaunchCookingMode}
            className="flex-1 max-w-sm flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm sm:text-base font-bold bg-[#4A7856] hover:bg-[#3D6447] active:bg-[#34553C] text-white shadow-xs transition-all cursor-pointer active:scale-[0.99] touch-manipulation"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Koch-Modus starten</span>
          </button>
        </div>
      </aside>

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
