import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  SmilePlus,
  Minus,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Camera,
  Info,
  CheckCircle2,
  FileText,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { Recipe, RecipeIngredient, RecipeStep } from '../types';
import { formatIngredientAmount, generateRecipeIngredientsText, calculateMealSavings } from '../utils/helpers';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useToast } from '../context/ToastContext';

// Subcomponents
import { EcoImpactModal } from '../components/recipe/EcoImpactModal';
import { IngredientSubstituteModal } from '../components/recipe/IngredientSubstituteModal';
import { FullscreenImageViewer } from '../components/recipe/FullscreenImageViewer';
import { EditRecipeModal } from '../components/recipe/EditRecipeModal';

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    recipes,
    favorites,
    toggleFavorite,
    dislikedIds,
    toggleDislike,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    setCookingModeRecipe,
    setIsCookingMinimized,
    setCookingCurrentStep,
    logCooked
  } = useRecipes();

  const { addToShoppingList } = useShopping();
  const { setRecipeToAddToPlan } = usePlanner();
  const { showToast } = useToast();

  const recipe = recipes.find((r) => r.id === id);

  // Local interactive states
  const [servings, setServings] = useState<number>(recipe?.servings || 4);
  const [addedShopping, setAddedShopping] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Sticky header scroll detection
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gallery & Image states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Touch Swipe gesture for Hero Image
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Step-specific image upload state
  const stepFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingStepNumber, setUploadingStepNumber] = useState<number | null>(null);

  // Modals & Menu states
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isEcoModalOpen, setIsEcoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showCookedDialog, setShowCookedDialog] = useState(false);
  const [cookedNotes, setCookedNotes] = useState('');

  // Contextual ingredient substitute modal
  const [substitutingIngredient, setSubstitutingIngredient] = useState<RecipeIngredient | null>(null);

  // Personal notes - default collapsed
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [personalNoteText, setPersonalNoteText] = useState(recipe?.userNotes || '');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Micronutrients accordion state
  const [isMicronutrientsOpen, setIsMicronutrientsOpen] = useState(false);

  // Veganize mode state
  const [isVeganized, setIsVeganized] = useState(false);
  const [veganizedIngredients, setVeganizedIngredients] = useState<RecipeIngredient[] | null>(null);

  // Fallback if recipe not found
  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center text-3xl font-bold">
          🥗
        </div>
        <h2 className="text-2xl font-bold text-[#2D3E40]">Rezept nicht gefunden</h2>
        <p className="text-sm text-[#7A7E7B] max-w-sm">
          Dieses Gericht existiert leider nicht mehr oder der Link ist ungültig.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A7856] text-white font-semibold text-sm shadow-xs hover:bg-[#3D6447] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zur Rezept-Übersicht</span>
        </button>
      </div>
    );
  }

  const isFavorite = favorites.includes(recipe.id);
  const isDisliked = dislikedIds.includes(recipe.id);

  // Build image list: Active cover or primary image, followed by user images
  const allImages = useMemo(() => {
    const list: string[] = [];
    const cover = recipe.activeCoverImage || recipe.image;
    if (cover && cover.trim() !== '' && cover !== 'veggiechef-placeholder') {
      list.push(cover);
    }
    if (recipe.userImages && Array.isArray(recipe.userImages)) {
      recipe.userImages.forEach((img) => {
        if (!list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [recipe.image, recipe.activeCoverImage, recipe.userImages]);

  const hasImages = allImages.length > 0;
  const currentCoverImage = allImages[currentImageIndex] || allImages[0];

  // Touch Swipe Handlers for Hero Image
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      // Swiped left -> next
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    } else if (diff < -45) {
      // Swiped right -> prev
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Handlers
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const toggleCheckIngredient = (name: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCompleteStep = (stepNum: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const handleCopyIngredients = () => {
    const text = generateRecipeIngredientsText(recipe, servings);
    navigator.clipboard.writeText(text);
    setIsOverflowMenuOpen(false);
    showToast(`Zutaten für ${servings} Portionen kopiert! 📋`);
  };

  const handleAddShopping = () => {
    addToShoppingList(recipe, servings);
    setAddedShopping(true);
    showToast(`Zutaten für ${servings} Portionen auf der Einkaufsliste!`);
    setTimeout(() => setAddedShopping(false), 2500);
  };

  // Recipe Cover Photo Upload Handler
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const updatedUserImages = [...(recipe.userImages || []), dataUrl];
      const updated: Recipe = {
        ...recipe,
        userImages: updatedUserImages,
      };

      updateRecipe(updated);
      setCurrentImageIndex(allImages.length);
      showToast('Eigenes Kochfoto hinzugefügt! 📸');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Step-specific photo upload handler
  const handleStepPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingStepNumber === null) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const updatedSteps = recipe.steps.map((step, idx) => {
        const stepNum = typeof step === 'string' ? idx + 1 : step.stepNumber;
        if (stepNum === uploadingStepNumber) {
          const stepObj: RecipeStep = typeof step === 'string' 
            ? { stepNumber: stepNum, title: `Schritt ${stepNum}`, text: step, stepImages: [dataUrl] }
            : { ...step, stepImages: [...(step.stepImages || []), dataUrl] };
          return stepObj;
        }
        return step;
      });

      const updatedRecipe: Recipe = {
        ...recipe,
        steps: updatedSteps,
      };

      updateRecipe(updatedRecipe);
      showToast(`Foto zu Schritt ${uploadingStepNumber} hinzugefügt! 📸`);
      setUploadingStepNumber(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Set selected photo as cover photo
  const handleSetAsCover = (imgUrl: string) => {
    const updated: Recipe = {
      ...recipe,
      activeCoverImage: imgUrl,
    };
    updateRecipe(updated);
    showToast('Neues Titelbild festgelegt!');
  };

  // Duplicate recipe
  const handleDuplicate = () => {
    const copy = duplicateRecipe(recipe);
    setIsOverflowMenuOpen(false);
    navigate(`/recipes/${copy.id}`);
  };

  // Delete recipe
  const handleDeleteConfirm = () => {
    deleteRecipe(recipe.id);
    setIsDeleteConfirmOpen(false);
    navigate('/');
  };

  // Save personal notes
  const handleSaveNotes = () => {
    const updated: Recipe = {
      ...recipe,
      userNotes: personalNoteText.trim(),
    };
    updateRecipe(updated);
    setIsNotesSaved(true);
    showToast('Notiz gespeichert!');
    setTimeout(() => setIsNotesSaved(false), 2500);
  };

  // Apply contextual ingredient substitution
  const handleApplySubstitute = (originalName: string, substituteName: string) => {
    const activeList = (isVeganized && veganizedIngredients) ? veganizedIngredients : recipe.ingredients;
    const modified = activeList.map((ing) => {
      if (ing.name.toLowerCase() === originalName.toLowerCase()) {
        return { ...ing, name: substituteName };
      }
      return ing;
    });

    if (isVeganized) {
      setVeganizedIngredients(modified);
    } else {
      const updatedRecipe: Recipe = {
        ...recipe,
        ingredients: modified,
      };
      updateRecipe(updatedRecipe);
    }
    showToast(`"${originalName}" durch "${substituteName}" ersetzt.`);
  };

  // Veganize recipe
  const handleVeganize = () => {
    if (isVeganized) {
      setIsVeganized(false);
      setVeganizedIngredients(null);
      return;
    }

    const modified = recipe.ingredients.map((ing) => {
      if (ing.veganAlternative) {
        return { ...ing, name: ing.veganAlternative, veganAlternative: undefined };
      }
      const lower = ing.name.toLowerCase();
      let newName = ing.name;
      if (lower.includes('kuhmilch') || lower === 'milch') newName = 'Haferdrink';
      else if (lower.includes('sahne') || lower.includes('rahm')) newName = 'Hafer-Cuisine';
      else if (lower.includes('butter')) newName = 'Vegane Butter';
      else if (lower.includes('parmesan')) newName = 'Hefeflocken & gemahlene Mandeln';
      else if (lower.includes('käse')) newName = 'Veganer Reibegenuss';
      else if (lower.includes('honig')) newName = 'Agavendicksaft';
      else if (lower.includes('joghurt')) newName = 'Soja-Joghurt ungesüßt';
      return { ...ing, name: newName };
    });

    setVeganizedIngredients(modified);
    setIsVeganized(true);
    showToast('Rezept auf 100% vegane Zutaten umgestellt!');
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

    logCooked(recipe, servings, cookedNotes);
    setShowCookedDialog(false);
    showToast('🎉 Großartig! Als gekocht in deiner Statistik erfasst!');
  };

  // Open lightbox with specific images
  const openLightbox = (images: string[], index: number = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsFullscreenImageOpen(true);
  };

  const activeIngredients = (isVeganized && veganizedIngredients) ? veganizedIngredients : recipe.ingredients;
  const savings = calculateMealSavings(servings, recipe.isVegan || isVeganized);

  // Compute utility badges (eliminating generic fluff, focusing on real functional badges)
  const utilityBadges = useMemo(() => {
    const badges: { label: string; tone: 'emerald' | 'amber' | 'slate' }[] = [];
    
    // Time-based utility badge
    if (recipe.totalTimeMinutes <= 25) {
      badges.push({ label: '⚡ Schnell (< 25 Min.)', tone: 'amber' });
    } else if (recipe.totalTimeMinutes <= 35) {
      badges.push({ label: '⏱️ Unter 35 Min.', tone: 'slate' });
    }

    // Protein badge
    if (recipe.nutrients.protein >= 20) {
      badges.push({ label: '💪 High Protein', tone: 'emerald' });
    }

    // One-pot badge check
    const isOnePot = recipe.tags?.some(t => t.toLowerCase().includes('one-pot') || t.toLowerCase().includes('eintopf')) ||
                     recipe.title.toLowerCase().includes('one-pot') ||
                     recipe.title.toLowerCase().includes('eintopf');
    if (isOnePot) {
      badges.push({ label: '🍲 One-Pot', tone: 'emerald' });
    }

    // Calorie lightness
    if (recipe.nutrients.calories < 450) {
      badges.push({ label: '🥗 Kalorienbewusst', tone: 'slate' });
    }

    return badges;
  }, [recipe]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3E40] selection:bg-[#F1F5F2] selection:text-[#4A7856] pb-28">
      {/* Hidden file input for uploading user cover photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadPhoto}
        className="hidden"
      />

      {/* Hidden file input for step photos */}
      <input
        ref={stepFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleStepPhotoUpload}
        className="hidden"
      />

      {/* 1. LIQUID-GLASS STICKY APP BAR ON SCROLL & FLOATING TOP CONTROLS */}
      <nav
        aria-label="Rezept Navigation"
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-md border-b border-[#ECEBE8] shadow-xs py-2.5 px-4 text-[#2D3E40]'
            : 'bg-transparent py-4 px-4 text-white pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Top Left: Back button (Comfortable 44px touch target) */}
          <button
            id="recipe-back-floating-btn"
            type="button"
            onClick={handleGoBack}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isScrolled
                ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] shadow-2xs'
                : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
            }`}
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Center: Truncated recipe title once scrolled past cover image */}
          <div
            className={`flex-1 min-w-0 px-3 text-center transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <span className="font-bold text-sm sm:text-base text-[#2D3E40] truncate block">
              {recipe.title}
            </span>
          </div>

          {/* Top Right: Photo Upload, Favorite, Overflow Menu */}
          <div className="flex items-center gap-2">
            {/* Upload Photo Button */}
            <button
              id="recipe-upload-photo-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isScrolled
                  ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] shadow-2xs'
                  : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
              }`}
              title="Eigenes Foto hochladen"
              aria-label="Eigenes Foto hochladen"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Favorite Toggle Button */}
            <button
              id="recipe-fav-floating-btn"
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isScrolled
                  ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] shadow-2xs'
                  : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
              }`}
              aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : isScrolled ? 'text-[#2D3E40]' : 'text-white'
                }`}
              />
            </button>

            {/* Overflow Menu Button */}
            <div className="relative">
              <button
                id="recipe-overflow-menu-btn"
                type="button"
                onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  isScrolled
                    ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] shadow-2xs'
                    : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
                }`}
                aria-label="Weitere Optionen"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Overflow Dropdown */}
              {isOverflowMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOverflowMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-13 z-50 w-60 bg-white rounded-2xl shadow-xl border border-[#ECEBE8] py-2 animate-in fade-in zoom-in-95 duration-150">
                    {/* Moved 'Zutaten kopieren' to overflow menu as requested */}
                    <button
                      type="button"
                      onClick={handleCopyIngredients}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-[#4A7856]" />
                      <span>Zutaten kopieren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-[#4A7856]" />
                      <span>Rezept bearbeiten</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-[#4A7856]" />
                      <span>Rezept duplizieren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setShowCookedDialog(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <SmilePlus className="w-4 h-4 text-[#4A7856]" />
                      <span>Als gekocht erfassen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        toggleDislike(recipe.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <ThumbsDown className="w-4 h-4 text-stone-400" />
                      <span>{isDisliked ? 'Nicht mehr disliken' : 'Seltener anzeigen'}</span>
                    </button>

                    <div className="my-1 border-t border-[#ECEBE8]" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Rezept löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. EDGE-TO-EDGE MEDIA CONTAINER WITH TOUCH SWIPE & PAGINATION DOTS */}
      <header className="relative w-full overflow-hidden bg-stone-900 select-none">
        {hasImages ? (
          <div 
            className="relative h-80 sm:h-96 md:h-[420px] w-full cursor-pointer group touch-pan-y"
            onClick={() => openLightbox(allImages, currentImageIndex)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={currentCoverImage}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {/* Top & bottom subtle gradient shadows for high contrast floating controls */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/60 pointer-events-none" />

            {/* Subtle, semi-transparent pagination dots at bottom edge */}
            {allImages.length > 1 && (
              <div 
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentImageIndex === idx ? 'w-5 bg-white shadow-xs' : 'w-1.5 bg-white/45 hover:bg-white/80'
                    }`}
                    aria-label={`Bild ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Set as cover button if on a user image */}
            {currentCoverImage !== (recipe.activeCoverImage || recipe.image) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAsCover(currentCoverImage);
                }}
                className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7856]" />
                <span>Als Titelbild wählen</span>
              </button>
            )}
          </div>
        ) : (
          /* Fallback banner for text-only / AI recipes without image */
          <div className="relative h-64 sm:h-72 w-full bg-gradient-to-br from-[#2D3E40] to-[#1F2C2D] flex items-center justify-center p-6 text-white text-center">
            <div className="space-y-2 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-3xl">
                🌱
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{recipe.title}</h2>
              <p className="text-xs text-stone-300">Vegetarisches Chef-Rezept</p>
            </div>
          </div>
        )}
      </header>

      {/* 3. MAIN BODY CONTENT */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-6 sm:space-y-8">
        {/* Title, Functional Badges & Subtitle */}
        <section className="space-y-3">
          {/* Functional Utility Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#4A7856] text-white text-xs font-semibold shadow-2xs">
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
            {/* Real utility badges (One-Pot, Schnell, High Protein, etc.) */}
            {utilityBadges.map((badge, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-white text-[#2D3E40] border border-[#ECEBE8] text-xs font-medium shadow-2xs"
              >
                {badge.label}
              </span>
            ))}
            {recipe.season && (
              <span className="px-2.5 py-1 rounded-full bg-white text-[#7A7E7B] border border-[#ECEBE8] text-xs font-medium">
                ☀️ {recipe.season}
              </span>
            )}
          </div>

          {/* Glanceable Mobile Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2D3E40] leading-tight">
            {recipe.title}
          </h1>

          {/* Subtitle */}
          {recipe.subtitle && (
            <p className="text-sm sm:text-base text-[#7A7E7B] leading-relaxed max-w-3xl">
              {recipe.subtitle}
            </p>
          )}
        </section>

        {/* 4. QUICK-FACTS GRID (2x2 Mobile Hierarchy with Clean Eco-Score Tile) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Time */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#ECEBE8] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">
                Gesamtzeit
              </div>
              <div className="font-bold text-[#2D3E40] text-sm sm:text-base tabular-nums">
                {recipe.totalTimeMinutes} Min.
              </div>
            </div>
          </div>

          {/* Calories */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#ECEBE8] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6F0] text-[#E67E22] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">
                Kalorien
              </div>
              <div className="font-bold text-[#2D3E40] text-sm sm:text-base tabular-nums">
                {recipe.nutrients.calories} kcal
              </div>
            </div>
          </div>

          {/* Protein */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#ECEBE8] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider">
                Protein
              </div>
              <div className="font-bold text-[#4A7856] text-sm sm:text-base tabular-nums">
                {recipe.nutrients.protein}g
              </div>
            </div>
          </div>

          {/* Clean Restructured Eco-Score Tile matching the 2x2 grid hierarchy */}
          <div 
            onClick={() => setIsEcoModalOpen(true)}
            className="p-3.5 bg-white hover:bg-[#F1F5F2]/60 border border-[#ECEBE8] rounded-2xl flex items-center gap-3 shadow-2xs cursor-pointer transition-colors group"
            title="Klicken für Umwelt- & Eco-Score Details"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4A7856] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              A+
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#7A7E7B] uppercase tracking-wider flex items-center gap-1">
                <span>Eco-Score</span>
                <Info className="w-3 h-3 text-[#7A7E7B] group-hover:text-[#4A7856]" />
              </div>
              <div className="font-bold text-[#4A7856] text-sm sm:text-base truncate">
                -85% CO₂
              </div>
            </div>
          </div>
        </section>

        {/* 5. SERVINGS CARD & BALANCED ACTION ROW */}
        <section className="bg-white border border-[#ECEBE8] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Servings Stepper */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#2D3E40] flex items-center gap-1.5 shrink-0">
                <Users className="w-4 h-4 text-[#4A7856]" />
                <span>Portionen:</span>
              </span>

              <div className="inline-flex items-center bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl p-1 shadow-2xs">
                <button
                  id="servings-step-decrease-btn"
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] disabled:opacity-30 text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                  aria-label="Portion verringern"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 sm:px-4 text-sm font-bold text-[#2D3E40] tabular-nums min-w-[85px] text-center select-none">
                  {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                </span>
                <button
                  id="servings-step-increase-btn"
                  type="button"
                  onClick={() => setServings(Math.min(24, servings + 1))}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                  aria-label="Portion erhöhen"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Balanced Action Row: In Wochenplaner + Einkaufsliste + Veganisieren (Zutaten kopieren in Overflow Menu) */}
            <div className="flex flex-wrap items-center gap-2">
              {!recipe.isVegan && (
                <button
                  type="button"
                  onClick={handleVeganize}
                  className={`h-11 px-3.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                    isVeganized
                      ? 'bg-[#4A7856] text-white border-[#4A7856]'
                      : 'bg-[#FAF9F6] text-[#4A7856] border-[#ECEBE8] hover:border-[#4A7856]/40'
                  }`}
                >
                  <Leaf className="w-3.5 h-3.5" />
                  <span>{isVeganized ? '✓ 100% Vegan' : 'Veganisieren'}</span>
                </button>
              )}

              {/* In Wochenplaner Button */}
              <button
                type="button"
                onClick={() => setRecipeToAddToPlan(recipe)}
                className="h-11 px-4 rounded-xl text-xs font-semibold bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-[#4A7856]" />
                <span>+ In Wochenplaner</span>
              </button>

              {/* In Einkaufsliste Button */}
              <button
                type="button"
                onClick={handleAddShopping}
                className="h-11 px-4 rounded-xl text-xs font-semibold bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95"
              >
                {addedShopping ? (
                  <Check className="w-3.5 h-3.5 text-[#4A7856]" />
                ) : (
                  <ShoppingCart className="w-3.5 h-3.5 text-[#7A7E7B]" />
                )}
                <span>{addedShopping ? 'Auf der Liste' : '+ Einkaufsliste'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 6. INGREDIENTS LIST (Zutaten ohne repetitive Icons, mit smarten Brüchen) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2D3E40] flex items-center gap-2">
              <span>Zutaten</span>
              <span className="text-xs font-normal text-[#7A7E7B]">
                ({activeIngredients.length} Positionen für {servings} {servings === 1 ? 'Portion' : 'Portionen'})
              </span>
            </h2>
            <span className="text-xs text-[#7A7E7B] hidden sm:inline">
              Tippe zum Abhaken
            </span>
          </div>

          {/* Clean Flat List with Dividers, No Repetitive Icons, Right-Aligned Quantities */}
          <div className="border border-[#ECEBE8] rounded-2xl overflow-hidden bg-white shadow-2xs">
            <ul className="divide-y divide-[#ECEBE8]">
              {activeIngredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.name];
                const amountStr = formatIngredientAmount(ing, recipe.servings, servings);

                return (
                  <li
                    key={ing.name}
                    className="flex items-center justify-between py-3.5 px-4 sm:px-5 hover:bg-[#FAF9F6] transition-colors select-none group"
                  >
                    {/* Left: Custom Checkbox + Natural Wrapping Ingredient Name */}
                    <div
                      onClick={() => toggleCheckIngredient(ing.name)}
                      className="flex items-start gap-3 flex-1 min-w-0 pr-3 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 transition-all shrink-0 ${
                          isChecked
                            ? 'bg-[#4A7856] border-[#4A7856] text-white'
                            : 'border-[#D1D5DB] bg-white group-hover:border-[#4A7856]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm sm:text-base font-medium break-words leading-snug transition-all ${
                            isChecked ? 'line-through text-[#9BA19D] opacity-60' : 'text-[#2D3E40]'
                          }`}
                        >
                          {ing.name}
                        </span>
                      </div>
                    </div>

                    {/* Right: Contextual Substitute trigger + Right-Aligned Quantities */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Contextual substitute button for THIS specific ingredient */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubstitutingIngredient(ing);
                        }}
                        className="p-1.5 rounded-lg text-[#7A7E7B] hover:text-[#D35400] hover:bg-[#FDF6F0] transition-colors cursor-pointer"
                        title={`Alternative für "${ing.name}" vorschlagen`}
                        aria-label={`Alternative für ${ing.name}`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      {/* Right-aligned column for quantities & units */}
                      <span
                        className={`text-sm sm:text-base font-semibold text-right tabular-nums whitespace-nowrap min-w-[70px] ${
                          isChecked ? 'line-through text-[#9BA19D] opacity-60' : 'text-[#4A7856]'
                        }`}
                      >
                        {amountStr}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 7. NUTRITION MACROS & EXPANDABLE MICRONUTRIENTS ACCORDION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#7A7E7B] uppercase tracking-wider">
              Nährwerte pro Portion ({recipe.nutrients.calories} kcal)
            </h3>
          </div>

          {/* Primary Macro Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-xs font-semibold text-[#7A7E7B]">Protein</div>
              <div className="text-base sm:text-lg font-bold text-[#4A7856] mt-0.5 tabular-nums">
                {recipe.nutrients.protein}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-xs font-semibold text-[#7A7E7B]">Kohlenhydrate</div>
              <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.carbs}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-xs font-semibold text-[#7A7E7B]">Fett</div>
              <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.fat}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-xs font-semibold text-[#7A7E7B]">Ballaststoffe</div>
              <div className="text-base sm:text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.fiber}g
              </div>
            </div>
          </div>

          {/* Expandable Micronutrients Accordion */}
          <div className="bg-white rounded-xl border border-[#ECEBE8] overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMicronutrientsOpen(!isMicronutrientsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Leaf className="w-3.5 h-3.5 text-[#4A7856]" />
                <span>Mikronährstoffe, Vitamine & Mineralien</span>
              </span>
              {isMicronutrientsOpen ? (
                <ChevronUp className="w-4 h-4 text-[#7A7E7B]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#7A7E7B]" />
              )}
            </button>

            {isMicronutrientsOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-[#ECEBE8] bg-[#FAF9F6]/50 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Eisen</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.iron ?? (Math.round((recipe.nutrients.calories / 100) * 0.9 * 10) / 10)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Vitamin B12</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.b12 ?? (recipe.isVegan ? '0 µg (pflanzl.)' : '0.5 µg')}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Calcium</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.calcium ?? Math.round((recipe.nutrients.calories / 100) * 38)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Zink</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.zinc ?? (Math.round((recipe.nutrients.calories / 100) * 0.7 * 10) / 10)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Vitamin C</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.vitaminC ?? 26} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[11px] text-[#7A7E7B]">Magnesium</div>
                    <div className="font-bold text-xs sm:text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.magnesium ?? 68} mg
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 8. PREPARATION STEPS & TIMELINE WITH STEP-BY-STEP MEDIA */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#2D3E40]">
              Zubereitung Schritt für Schritt
            </h3>
            <span className="text-xs text-[#7A7E7B]">Tippe zum Abhaken</span>
          </div>

          <div className="relative pl-1 sm:pl-3 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[#ECEBE8]">
            {recipe.steps.map((step, idx) => {
              const stepObj: RecipeStep =
                typeof step === 'string'
                  ? { stepNumber: idx + 1, title: `Schritt ${idx + 1}`, text: step, timerMinutes: undefined }
                  : step;
              const isStepDone = !!completedSteps[stepObj.stepNumber];
              const stepImages = stepObj.stepImages || [];

              return (
                <div
                  key={stepObj.stepNumber}
                  className="relative flex items-start gap-3.5 sm:gap-4.5 select-none group"
                >
                  {/* Timeline indicator circle */}
                  <div
                    onClick={() => toggleCompleteStep(stepObj.stepNumber)}
                    className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all cursor-pointer ${
                      isStepDone
                        ? 'bg-[#4A7856] text-white shadow-xs ring-4 ring-white'
                        : 'bg-white border-2 border-[#4A7856] text-[#4A7856] group-hover:bg-[#F1F5F2] ring-4 ring-white'
                    }`}
                  >
                    {isStepDone ? <Check className="w-4 h-4 stroke-[3]" /> : stepObj.stepNumber}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                    <div 
                      onClick={() => toggleCompleteStep(stepObj.stepNumber)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-base font-bold transition-colors ${
                            isStepDone ? 'line-through text-[#9BA19D] opacity-60' : 'text-[#2D3E40]'
                          }`}
                        >
                          {stepObj.title || `Schritt ${stepObj.stepNumber}`}
                        </span>

                        {stepObj.timerMinutes && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A7856] bg-[#F1F5F2] px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            {stepObj.timerMinutes} Min.
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-sm sm:text-base leading-relaxed break-words mt-1 transition-colors ${
                          isStepDone ? 'line-through text-[#9BA19D] opacity-60' : 'text-[#2D3E40]'
                        }`}
                      >
                        {stepObj.text}
                      </p>
                    </div>

                    {/* Step-by-Step Media Thumbnails & Add Photo Trigger */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {stepImages.map((img, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() => openLightbox(stepImages, imgIdx)}
                          className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-[#ECEBE8] shadow-2xs cursor-pointer group/thumb"
                        >
                          <img
                            src={img}
                            alt={`Foto zu Schritt ${stepObj.stepNumber}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          />
                        </div>
                      ))}

                      {/* Small subtle + Foto button per step */}
                      <button
                        type="button"
                        onClick={() => {
                          setUploadingStepNumber(stepObj.stepNumber);
                          stepFileInputRef.current?.click();
                        }}
                        className="h-8 px-2.5 rounded-lg bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[#7A7E7B] hover:text-[#4A7856] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                        title="Foto zu diesem Schritt hinzufügen"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>+ Foto</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Smart Chef Tip Callout */}
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
        </section>

        {/* 9. USER NOTES SECTION (Default Collapsed with Clean Trigger) */}
        <section className="bg-white border border-[#ECEBE8] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4A7856]" />
              <h3 className="text-sm sm:text-base font-bold text-[#2D3E40]">
                Persönliche Notizen
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="text-xs text-[#7A7E7B] hover:text-[#2D3E40] font-semibold cursor-pointer"
            >
              {isNotesExpanded ? 'Schließen' : personalNoteText.trim() ? 'Bearbeiten' : '+ Notiz hinzufügen'}
            </button>
          </div>

          {/* Collapsed view with preview or placeholder */}
          {!isNotesExpanded && personalNoteText.trim() && (
            <div 
              onClick={() => setIsNotesExpanded(true)}
              className="p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs sm:text-sm text-[#2D3E40] cursor-pointer hover:border-[#4A7856]/40 transition-colors italic"
            >
              "{personalNoteText}"
            </div>
          )}

          {/* Expanded view for editing */}
          {isNotesExpanded && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <textarea
                value={personalNoteText}
                onChange={(e) => setPersonalNoteText(e.target.value)}
                placeholder="z.B. 'Etwas weniger Salz nehmen, mit gerösteten Pinienkernen toppen. Hat der ganzen Familie geschmeckt!'"
                rows={3}
                className="w-full text-xs sm:text-sm p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden text-[#2D3E40]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7A7E7B] hover:bg-[#FAF9F6] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-2 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  {isNotesSaved ? '✓ Gespeichert' : 'Notiz speichern'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 10. EXCLUSIVE PRIMARY CTA IN PERSISTENT STICKY BOTTOM BAR */}
      <aside
        aria-label="Koch-Modus Schnellzugriff"
        className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#ECEBE8] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Quick portions stepper in sticky bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7A7E7B] hidden sm:inline">Portionen:</span>
            <div className="inline-flex items-center bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
                className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] disabled:opacity-30 text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                title="Portion verringern"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 text-xs sm:text-sm font-bold text-[#2D3E40] tabular-nums min-w-[65px] text-center select-none">
                {servings} Port.
              </span>
              <button
                type="button"
                onClick={() => setServings(Math.min(24, servings + 1))}
                className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] text-[#2D3E40] transition-colors cursor-pointer touch-manipulation"
                title="Portion erhöhen"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Primary CTA: Start Cooking Mode (Exclusive prominent trigger) */}
          <button
            id="sticky-start-cooking-mode-btn"
            type="button"
            onClick={handleLaunchCookingMode}
            className="flex-1 max-w-sm h-12 flex items-center justify-center gap-2.5 px-6 rounded-xl text-sm sm:text-base font-bold bg-[#4A7856] hover:bg-[#3D6447] active:bg-[#34553C] text-white shadow-md transition-all cursor-pointer active:scale-[0.99] touch-manipulation"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Koch-Modus starten</span>
          </button>
        </div>
      </aside>

      {/* MODALS */}
      {/* 1. Eco Impact Modal */}
      <EcoImpactModal
        isOpen={isEcoModalOpen}
        onClose={() => setIsEcoModalOpen(false)}
        savedCO2Kg={savings.savedCO2Kg}
        savedWaterLiters={savings.savedWaterLiters}
        isVegan={recipe.isVegan || isVeganized}
      />

      {/* 2. Fullscreen Lightbox Image Viewer */}
      <FullscreenImageViewer
        isOpen={isFullscreenImageOpen}
        images={lightboxImages.length > 0 ? lightboxImages : allImages}
        currentIndex={lightboxIndex}
        onClose={() => {
          setIsFullscreenImageOpen(false);
          setLightboxImages([]);
          setLightboxIndex(0);
        }}
        onSelectIndex={(idx) => setLightboxIndex(idx)}
        onSetAsCover={handleSetAsCover}
        activeCoverUrl={recipe.activeCoverImage || recipe.image}
        recipeTitle={recipe.title}
      />

      {/* 3. Contextual Ingredient Substitution Modal */}
      <IngredientSubstituteModal
        isOpen={Boolean(substitutingIngredient)}
        ingredient={substitutingIngredient}
        onClose={() => setSubstitutingIngredient(null)}
        onApplySubstitute={handleApplySubstitute}
      />

      {/* 4. Edit Recipe Modal */}
      <EditRecipeModal
        isOpen={isEditModalOpen}
        recipe={recipe}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updated) => updateRecipe(updated)}
      />

      {/* 5. Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-[#ECEBE8] shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[#2D3E40]">Rezept löschen?</h3>
              <p className="text-xs text-[#7A7E7B]">
                Möchtest du "{recipe.title}" wirklich unwiderruflich aus deiner Rezeptsammlung entfernen?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#7A7E7B] bg-[#FAF9F6] hover:bg-[#F1F5F2] cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer active:scale-95"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. "Gericht gekocht" Star & Notes Dialog */}
      {showCookedDialog && (
        <div
          onClick={() => setShowCookedDialog(false)}
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-[#ECEBE8] animate-in zoom-in-95 duration-200"
          >
            <div className="text-center space-y-1">
              <span className="text-3xl">🎉</span>
              <h3 className="text-xl font-bold text-[#2D3E40]">Guten Appetit!</h3>
              <p className="text-xs text-[#7A7E7B]">
                Möchtest du "{recipe.title}" in deiner Kochstatistik erfassen?
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D3E40] mb-1">
                Eigene Notizen / Zubereitungs-Feedback (optional):
              </label>
              <textarea
                value={cookedNotes}
                onChange={(e) => setCookedNotes(e.target.value)}
                placeholder="z.B. 'Super lecker, nächstes Mal noch etwas Chili dazugeben!'"
                rows={3}
                className="w-full text-xs p-3 border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden text-[#2D3E40]"
              />
            </div>

            <div className="p-3.5 bg-[#F1F5F2] rounded-xl text-xs text-[#4A7856] border border-[#ECEBE8]">
              🌱 Durch dieses Gericht hast du ca. <strong>{savings.savedCO2Kg} kg CO₂</strong> und{' '}
              <strong>{savings.savedWaterLiters} Liter Wasser</strong> eingespart!
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
