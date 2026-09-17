import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Camera,
  PenTool,
  Plus,
  Trash2,
  Clock,
  Flame,
  Dumbbell,
  Check,
  Upload,
  ChefHat,
  ArrowRight,
  Leaf,
  AlertCircle,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useRecipes } from '../context/RecipeContext';

interface AddRecipeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onRecipeAdded?: (recipe: Recipe) => void;
}

const CATEGORIES: RecipeCategory[] = [
  'Pasta & Gnocchi',
  'Bowls & Salate',
  'Currys & Eintöpfe',
  'Ofengerichte',
  'Schnelle Feierabendküche',
  'Süßes & Frühstück',
  'Snacks & Dips',
  'High Protein',
  'Gourmet & Festlich'
];

const QUICK_INSPIRATIONS = [
  'Vegane Linsen-Bolognese',
  'Cremiges Kichererbsen-Tikka-Masala',
  'Bunte Quinoa-Power-Bowl',
  'Knusprige Tofu-Gyoza mit Sesam-Dip',
  'Mexican Black Bean Burrito',
  'Cremiges Steinpilz-Risotto',
  'Miso-Ramen mit Kräuterseitlingen'
];

export const AddRecipeModal: React.FC<AddRecipeModalProps> = (props) => {
  const recipesCtx = useRecipes();
  const isOpen = props.isOpen !== undefined ? props.isOpen : recipesCtx.isAddRecipeOpen;
  const onClose = props.onClose ?? (() => recipesCtx.setIsAddRecipeOpen(false));
  const onRecipeAdded = props.onRecipeAdded ?? recipesCtx.addRecipe;

  const [activeTab, setActiveTab] = useState<'ai' | 'scan' | 'manual'>('ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Review step after AI generation or photo scan
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  // Lock background scroll when open
  useLockBodyScroll(isOpen);

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setPreviewRecipe(null);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Tab 1: AI Generator State
  const [aiTitle, setAiTitle] = useState('');
  const [aiIsVegan, setAiIsVegan] = useState(true);
  const [aiCategory, setAiCategory] = useState<RecipeCategory | ''>('');
  const [aiTimeOption, setAiTimeOption] = useState<'any' | 'quick' | 'medium' | 'elaborate'>('medium');
  const [aiExtraIngredients, setAiExtraIngredients] = useState('');

  // Tab 2: Scan State
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanNotes, setScanNotes] = useState('');
  const [scanIsVegan, setScanIsVegan] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: Manual Recipe State
  const [manualTitle, setManualTitle] = useState('');
  const [manualSubtitle, setManualSubtitle] = useState('');
  const [manualCategory, setManualCategory] = useState<RecipeCategory>('Pasta & Gnocchi');
  const [manualIsVegan, setManualIsVegan] = useState(true);
  const [manualPrepTime, setManualPrepTime] = useState<number>(10);
  const [manualCookTime, setManualCookTime] = useState<number>(20);
  const [manualServings, setManualServings] = useState<number>(2);
  const [manualDifficulty, setManualDifficulty] = useState<'Einfach' | 'Mittel' | 'Anspruchsvoll'>('Einfach');
  const [manualCalories, setManualCalories] = useState<number>(550);
  const [manualProtein, setManualProtein] = useState<number>(24);
  const [manualCarbs, setManualCarbs] = useState<number>(65);
  const [manualFat, setManualFat] = useState<number>(18);
  const [manualFiber, setManualFiber] = useState<number>(8);
  const [manualChefTip, setManualChefTip] = useState('');
  const [manualIngredients, setManualIngredients] = useState<RecipeIngredient[]>([
    { name: '', amount: 150, unit: 'g', category: 'gemuese', isEssential: true },
    { name: '', amount: 200, unit: 'g', category: 'trockenwaren', isEssential: true }
  ]);
  const [manualSteps, setManualSteps] = useState<RecipeStep[]>([
    { stepNumber: 1, title: 'Vorbereitung', text: '', timerMinutes: undefined },
    { stepNumber: 2, title: 'Anbraten & Kochen', text: '', timerMinutes: 10 }
  ]);

  if (!isOpen) return null;

  // Handle Photo File Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Bitte wähle eine gültige Bilddatei aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScanImageBase64(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit AI Generation
  const handleGenerateAi = async () => {
    const trimmedTitle = aiTitle.trim();
    if (!trimmedTitle) {
      setErrorMsg('Bitte gib den Namen oder die Idee deines Gerichts ein.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const maxMinutes =
      aiTimeOption === 'quick' ? 20 : aiTimeOption === 'medium' ? 30 : aiTimeOption === 'elaborate' ? 50 : undefined;

    const includedIngredients = aiExtraIngredients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/ai/create-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          isVegan: aiIsVegan,
          category: aiCategory || undefined,
          maxTimeMinutes: maxMinutes,
          includedIngredients
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.recipe) {
        throw new Error(data.error || 'Gericht konnte von der KI nicht erstellt werden.');
      }

      setPreviewRecipe(data.recipe);
    } catch (err: any) {
      console.error('Error in handleGenerateAi:', err);
      setErrorMsg(
        err?.message ||
          'Die KI konnte dieses Rezept gerade nicht erstellen. Bitte prüfe die Eingabe oder versuche es erneut.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Photo Scan
  const handleScanRecipe = async () => {
    if (!scanImageBase64) {
      setErrorMsg('Bitte lade zuerst ein Foto hoch oder mache eine Aufnahme.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/scan-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: scanImageBase64,
          userNotes: scanNotes,
          isVegan: scanIsVegan
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.recipe) {
        throw new Error(data.error || 'Rezept konnte aus dem Bild nicht erkannt werden.');
      }

      setPreviewRecipe(data.recipe);
    } catch (err: any) {
      console.error('Error in handleScanRecipe:', err);
      setErrorMsg(
        err?.message || 'Das Foto konnte nicht analysiert werden. Bitte versuche ein anderes Foto.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Manual Recipe
  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      setErrorMsg('Bitte gib einen Titel für das Rezept an.');
      return;
    }

    const validIngredients = manualIngredients.filter((ing) => ing.name.trim() !== '');
    if (validIngredients.length === 0) {
      setErrorMsg('Bitte gib mindestens eine Zutat an.');
      return;
    }

    const validSteps = manualSteps
      .filter((step) => step.text.trim() !== '')
      .map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
        title: step.title?.trim() || `Schritt ${idx + 1}`
      }));

    if (validSteps.length === 0) {
      setErrorMsg('Bitte gib mindestens einen Zubereitungsschritt an.');
      return;
    }

    const newRecipe: Recipe = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      subtitle: manualSubtitle.trim() || 'Selbst erstelltes Lieblingsgericht',
      category: manualCategory,
      isVegan: manualIsVegan,
      isVegetarian: true,
      prepTimeMinutes: manualPrepTime || 10,
      cookTimeMinutes: manualCookTime || 15,
      totalTimeMinutes: (manualPrepTime || 10) + (manualCookTime || 15),
      difficulty: manualDifficulty,
      servings: manualServings || 2,
      rating: 5.0,
      reviewCount: 1,
      season: 'Ganzjährig',
      image: manualIsVegan
        ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
      nutrients: {
        calories: manualCalories || 520,
        protein: manualProtein || 22,
        carbs: manualCarbs || 60,
        fat: manualFat || 18,
        fiber: manualFiber || 8
      },
      tags: [manualIsVegan ? '100% Vegan' : 'Vegetarisch', 'Eigenkreation'],
      ingredients: validIngredients,
      steps: validSteps,
      chefTip: manualChefTip.trim() || undefined
    };

    onRecipeAdded(newRecipe);
    onClose();
  };

  // Confirm adding generated/scanned recipe
  const handleConfirmPreview = () => {
    if (!previewRecipe) return;
    onRecipeAdded(previewRecipe);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 touch-none overscroll-contain animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#ECEBE8] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] overscroll-contain"
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[#ECEBE8] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4A7856]/10 flex items-center justify-center text-[#4A7856]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2D3E40]">
                {previewRecipe ? 'Rezept-Vorschau' : 'Neues Gericht hinzufügen'}
              </h2>
              <p className="text-xs text-[#7A7E7B]">
                {previewRecipe
                  ? 'Prüfe die Zutaten und Zubereitungsschritte vor dem Speichern'
                  : 'Mit intelligenter KI, Foto-Scan oder klassisch Schritt für Schritt'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center text-[#7A7E7B] hover:text-[#2D3E40] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Hinweis</span>
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-amber-700 hover:text-amber-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PREVIEW VIEW */}
          {previewRecipe ? (
            <div className="space-y-6">
              {/* Hero Image & Metadata */}
              <div className="relative rounded-2xl overflow-hidden border border-[#ECEBE8] aspect-21/9 bg-[#FAF9F6]">
                <img
                  src={previewRecipe.image}
                  alt={previewRecipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        previewRecipe.isVegan
                          ? 'bg-[#4A7856] text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {previewRecipe.isVegan ? '🌱 100% Vegan' : '🧀 Vegetarisch'}
                    </span>
                    <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full font-medium">
                      {previewRecipe.category}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                    {previewRecipe.title}
                  </h3>
                  {previewRecipe.subtitle && (
                    <p className="text-xs sm:text-sm text-white/80 line-clamp-1 mt-1">
                      {previewRecipe.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Nutrients Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#ECEBE8]">
                <div className="text-center p-2 bg-white rounded-xl border border-[#ECEBE8]">
                  <span className="text-[11px] text-[#7A7E7B] font-medium block">Kalorien</span>
                  <span className="text-base font-bold text-[#2D3E40]">
                    {previewRecipe.nutrients.calories} kcal
                  </span>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-[#ECEBE8]">
                  <span className="text-[11px] text-[#7A7E7B] font-medium block">Protein</span>
                  <span className="text-base font-bold text-[#4A7856]">
                    {previewRecipe.nutrients.protein} g
                  </span>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-[#ECEBE8]">
                  <span className="text-[11px] text-[#7A7E7B] font-medium block">Kochzeit</span>
                  <span className="text-base font-bold text-[#2D3E40]">
                    {(previewRecipe.prepTimeMinutes || 0) + (previewRecipe.cookTimeMinutes || 0)} Min
                  </span>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-[#ECEBE8]">
                  <span className="text-[11px] text-[#7A7E7B] font-medium block">Portionen</span>
                  <span className="text-base font-bold text-[#2D3E40]">
                    {previewRecipe.servings || 2} Pers.
                  </span>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2.5">
                <h4 className="text-sm font-bold text-[#2D3E40] flex items-center justify-between">
                  <span>Zutaten ({previewRecipe.ingredients.length})</span>
                  <span className="text-xs text-[#7A7E7B] font-normal">
                    abgestimmt für {previewRecipe.servings || 2} Portionen
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewRecipe.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span className="font-medium text-[#2D3E40]">{ing.name}</span>
                      <span className="text-[#4A7856] font-semibold bg-white px-2 py-0.5 rounded-md border border-[#ECEBE8]">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HelloFresh Preparation Steps */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#2D3E40]">
                  Zubereitungsschritte ({previewRecipe.steps.length})
                </h4>
                <div className="space-y-2.5">
                  {previewRecipe.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-[#ECEBE8] rounded-xl space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#4A7856] text-white text-[11px] font-bold flex items-center justify-center">
                            {step.stepNumber || idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[#2D3E40]">
                            {step.title || `Schritt ${idx + 1}`}
                          </span>
                        </div>
                        {step.timerMinutes && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A7856] bg-[#F1F5F2] px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            {step.timerMinutes} Min.
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[#2D3E40]/90 leading-relaxed pl-7">
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chef Tip if available */}
              {previewRecipe.chefTip && (
                <div className="p-3.5 bg-[#F1F5F2] rounded-2xl border border-[#4A7856]/20 text-xs sm:text-sm text-[#2D3E40]">
                  <strong className="text-[#4A7856] block mb-1">👨‍🍳 Tipp des Küchenchefs:</strong>
                  {previewRecipe.chefTip}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#ECEBE8] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewRecipe(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#ECEBE8] hover:bg-[#FAF9F6] text-sm font-semibold text-[#2D3E40] transition-colors"
                >
                  ← Zurück & Anpassen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPreview}
                  className="px-6 py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-sm font-bold shadow-md shadow-[#4A7856]/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Ins Rezeptbuch speichern
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'ai'
                      ? 'bg-white text-[#4A7856] shadow-xs border border-[#ECEBE8]'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#4A7856]" />
                  <span>KI-Küchenchef</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('scan')}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'scan'
                      ? 'bg-white text-[#4A7856] shadow-xs border border-[#ECEBE8]'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                >
                  <Camera className="w-4 h-4 text-[#4A7856]" />
                  <span>Foto-Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'manual'
                      ? 'bg-white text-[#4A7856] shadow-xs border border-[#ECEBE8]'
                      : 'text-[#7A7E7B] hover:text-[#2D3E40]'
                  }`}
                >
                  <PenTool className="w-4 h-4 text-[#4A7856]" />
                  <span>Eigenes Rezept</span>
                </button>
              </div>

              {/* TAB 1: AI GENERATOR */}
              {activeTab === 'ai' && (
                <div className="space-y-5">
                  {/* Dish title input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#2D3E40]">
                      Welches Gericht möchtest du kochen?
                    </label>
                    <input
                      type="text"
                      value={aiTitle}
                      onChange={(e) => setAiTitle(e.target.value)}
                      placeholder="z.B. Vegane Linsen-Bolognese, Cremiges Pilz-Risotto, Tofu Tikka..."
                      className="w-full px-4 py-3 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#4A7856] text-sm text-[#2D3E40] transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGenerateAi();
                        }
                      }}
                    />
                  </div>

                  {/* Quick Inspirations */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#7A7E7B] font-medium">Inspirationen:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_INSPIRATIONS.map((dish) => (
                        <button
                          key={dish}
                          type="button"
                          onClick={() => setAiTitle(dish)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#FAF9F6] hover:bg-[#F1F5F2] hover:text-[#4A7856] border border-[#ECEBE8] text-[#2D3E40] transition-colors"
                        >
                          {dish}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diet Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                      Ernährungsform
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAiIsVegan(true)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          aiIsVegan
                            ? 'bg-[#F1F5F2] border-[#4A7856] text-[#4A7856] shadow-xs'
                            : 'bg-white border-[#ECEBE8] text-[#7A7E7B] hover:border-[#4A7856]/40'
                        }`}
                      >
                        <Leaf className="w-4 h-4" />
                        <span>100% Vegan (Rein pflanzlich)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiIsVegan(false)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          !aiIsVegan
                            ? 'bg-[#F1F5F2] border-[#4A7856] text-[#4A7856] shadow-xs'
                            : 'bg-white border-[#ECEBE8] text-[#7A7E7B] hover:border-[#4A7856]/40'
                        }`}
                      >
                        <span>🧀 Vegetarisch (mit Käse/Ei)</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional Options: Category & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                        Kategorie (Optional)
                      </label>
                      <select
                        value={aiCategory}
                        onChange={(e) => setAiCategory(e.target.value as RecipeCategory)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs sm:text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                      >
                        <option value="">Automatisch erkennen</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                        Zubereitungszeit
                      </label>
                      <select
                        value={aiTimeOption}
                        onChange={(e) => setAiTimeOption(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs sm:text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                      >
                        <option value="medium">Ausgewogen (~ 30 Min.)</option>
                        <option value="quick">Express (&lt; 20 Min.)</option>
                        <option value="elaborate">Ausführlich / Festlich (~ 50 Min.)</option>
                        <option value="any">Keine Einschränkung</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional extra ingredients */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                      Bestimmte Zutaten einbauen? (Optional)
                    </label>
                    <input
                      type="text"
                      value={aiExtraIngredients}
                      onChange={(e) => setAiExtraIngredients(e.target.value)}
                      placeholder="z.B. Champignons, Spinat, Cashewmus..."
                      className="w-full px-3 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs sm:text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting || !aiTitle.trim()}
                      onClick={handleGenerateAi}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold shadow-md shadow-[#4A7856]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>KI berechnet Rezept & Zubereitungsschritte...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Rezept mit KI kreieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PHOTO SCAN */}
              {activeTab === 'scan' && (
                <div className="space-y-5">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#ECEBE8] hover:border-[#4A7856]/50 rounded-2xl p-6 text-center bg-[#FAF9F6] cursor-pointer transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {scanImageBase64 ? (
                      <div className="space-y-3">
                        <img
                          src={scanImageBase64}
                          alt="Vorschau"
                          className="max-h-48 mx-auto rounded-xl shadow-xs object-cover"
                        />
                        <p className="text-xs text-[#4A7856] font-semibold">
                          Bild ausgewählt • Klicke zum Ändern
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#4A7856]/10 text-[#4A7856] flex items-center justify-center mx-auto">
                          <Camera className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-[#2D3E40]">
                          Foto aufnehmen oder hochladen
                        </h4>
                        <p className="text-xs text-[#7A7E7B] max-w-sm mx-auto">
                          Fotografiere ein Gericht, eine handschriftliche Notiz oder ein Kochbuch. Die KI erkennt Zutaten und Schritte.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Scan Diet selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                      Ernährungsform
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScanIsVegan(true)}
                        className={`p-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                          scanIsVegan
                            ? 'bg-[#F1F5F2] border-[#4A7856] text-[#4A7856]'
                            : 'bg-white border-[#ECEBE8] text-[#7A7E7B]'
                        }`}
                      >
                        <Leaf className="w-4 h-4" />
                        <span>100% Vegan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanIsVegan(false)}
                        className={`p-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                          !scanIsVegan
                            ? 'bg-[#F1F5F2] border-[#4A7856] text-[#4A7856]'
                            : 'bg-white border-[#ECEBE8] text-[#7A7E7B]'
                        }`}
                      >
                        <span>Vegetarisch</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                      Zusätzliche Notizen (Optional)
                    </label>
                    <input
                      type="text"
                      value={scanNotes}
                      onChange={(e) => setScanNotes(e.target.value)}
                      placeholder="z.B. Bitte ohne Koriander, mild gewürzt"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs sm:text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || !scanImageBase64}
                    onClick={handleScanRecipe}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold shadow-md shadow-[#4A7856]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Foto wird analysiert...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span>Rezept aus Foto erkennen</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 3: MANUAL FORM */}
              {activeTab === 'manual' && (
                <form onSubmit={handleSaveManual} className="space-y-6">
                  {/* Title & Subtitle */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Gerichtsname *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="z.B. Cremige Avocadopasta mit Kirschtomaten"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] focus:bg-white text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Kurzbeschreibung (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualSubtitle}
                        onChange={(e) => setManualSubtitle(e.target.value)}
                        placeholder="z.B. Herrlich cremig, nussig und in 15 Minuten fertig"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-sm text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                      />
                    </div>
                  </div>

                  {/* Category, Diet, Times, Portions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Kategorie
                      </label>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value as RecipeCategory)}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs font-medium text-[#2D3E40]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Ernährung
                      </label>
                      <select
                        value={manualIsVegan ? 'vegan' : 'vegetarian'}
                        onChange={(e) => setManualIsVegan(e.target.value === 'vegan')}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs font-medium text-[#2D3E40]"
                      >
                        <option value="vegan">100% Vegan</option>
                        <option value="vegetarian">Vegetarisch</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Vorbereitung (Min.)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={manualPrepTime}
                        onChange={(e) => setManualPrepTime(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs font-medium text-[#2D3E40]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#7A7E7B] uppercase tracking-wider block mb-1">
                        Kochzeit (Min.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={manualCookTime}
                        onChange={(e) => setManualCookTime(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs font-medium text-[#2D3E40]"
                      />
                    </div>
                  </div>

                  {/* Nutrients per Portion */}
                  <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#ECEBE8] space-y-2">
                    <label className="text-[11px] font-bold text-[#7A7E7B] uppercase tracking-wider block">
                      Nährwerte pro Portion
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      <div>
                        <span className="text-[10px] text-[#7A7E7B] block">Kalorien (kcal)</span>
                        <input
                          type="number"
                          value={manualCalories}
                          onChange={(e) => setManualCalories(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#2D3E40]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7A7E7B] block">Protein (g)</span>
                        <input
                          type="number"
                          value={manualProtein}
                          onChange={(e) => setManualProtein(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#4A7856]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7A7E7B] block">Carbs (g)</span>
                        <input
                          type="number"
                          value={manualCarbs}
                          onChange={(e) => setManualCarbs(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#2D3E40]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7A7E7B] block">Fett (g)</span>
                        <input
                          type="number"
                          value={manualFat}
                          onChange={(e) => setManualFat(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#2D3E40]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7A7E7B] block">Ballaststoffe (g)</span>
                        <input
                          type="number"
                          value={manualFiber}
                          onChange={(e) => setManualFiber(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#2D3E40]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                        Zutaten
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setManualIngredients((prev) => [
                            ...prev,
                            { name: '', amount: 100, unit: 'g', category: 'gemuese', isEssential: false }
                          ])
                        }
                        className="text-xs font-bold text-[#4A7856] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Zutat hinzufügen
                      </button>
                    </div>

                    <div className="space-y-2">
                      {manualIngredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualIngredients((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                              );
                            }}
                            placeholder="Zutat (z.B. Kichererbsen)"
                            className="flex-1 px-3 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs text-[#2D3E40]"
                          />
                          <input
                            type="text"
                            value={ing.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualIngredients((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                              );
                            }}
                            placeholder="Menge"
                            className="w-20 px-2 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs text-[#2D3E40] text-center"
                          />
                          <input
                            type="text"
                            value={ing.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualIngredients((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                              );
                            }}
                            placeholder="Einheit"
                            className="w-16 px-2 py-2 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs text-[#2D3E40] text-center"
                          />
                          {manualIngredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setManualIngredients((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-2 text-[#7A7E7B] hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HelloFresh Preparation Steps Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider">
                        Zubereitungsschritte (HelloFresh-Stil)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setManualSteps((prev) => [
                            ...prev,
                            {
                              stepNumber: prev.length + 1,
                              title: `Schritt ${prev.length + 1}`,
                              text: '',
                              timerMinutes: undefined
                            }
                          ])
                        }
                        className="text-xs font-bold text-[#4A7856] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Schritt hinzufügen
                      </button>
                    </div>

                    <div className="space-y-3">
                      {manualSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-5 h-5 rounded-full bg-[#4A7856] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={step.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualSteps((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                                  );
                                }}
                                placeholder="Schritt-Titel (z.B. Gemüse vorbereiten)"
                                className="px-2.5 py-1.5 bg-white border border-[#ECEBE8] rounded-lg text-xs font-bold text-[#2D3E40] w-full max-w-xs"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#7A7E7B]" />
                                <input
                                  type="number"
                                  min="1"
                                  value={step.timerMinutes || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    setManualSteps((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, timerMinutes: val } : s))
                                    );
                                  }}
                                  placeholder="Timer (Min.)"
                                  className="w-24 px-2 py-1 bg-white border border-[#ECEBE8] rounded-lg text-[11px] text-[#2D3E40] text-center"
                                />
                              </div>

                              {manualSteps.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualSteps((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1 text-[#7A7E7B] hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            value={step.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, text: val } : s))
                              );
                            }}
                            placeholder="Erkläre die Zubereitung für diesen Schritt genau..."
                            className="w-full px-3 py-2 bg-white border border-[#ECEBE8] rounded-xl text-xs text-[#2D3E40] focus:outline-none focus:border-[#4A7856]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chef Tip */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#7A7E7B] uppercase tracking-wider block">
                      Tipp des Kochs (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualChefTip}
                      onChange={(e) => setManualChefTip(e.target.value)}
                      placeholder="z.B. Zum Schluss einen Spritzer Limette oder Hefeflocken darübergeben..."
                      className="w-full px-3 py-2.5 rounded-xl border border-[#ECEBE8] bg-[#FAF9F6] text-xs sm:text-sm text-[#2D3E40]"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-sm sm:text-base font-bold shadow-md shadow-[#4A7856]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      <span>Rezept speichern</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
