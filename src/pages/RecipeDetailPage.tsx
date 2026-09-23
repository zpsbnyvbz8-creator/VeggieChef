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
  CheckCircle2,
  FileText,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ArrowLeftRight,
  UploadCloud,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { Recipe, RecipeIngredient, RecipeStep } from '../types';
import { formatIngredientAmount, generateRecipeIngredientsText, calculateMealSavings, safeCopyToClipboard } from '../utils/helpers';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useToast } from '../context/ToastContext';

// Subcomponents
import { EcoImpactModal } from '../components/recipe/EcoImpactModal';
import { IngredientSubstituteModal } from '../components/recipe/IngredientSubstituteModal';
import { FullscreenImageViewer } from '../components/recipe/FullscreenImageViewer';
import { EditRecipeModal } from '../components/recipe/EditRecipeModal';
import { StepImageSwiper } from '../components/recipe/StepImageSwiper';

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

  // Global Step Images Toggle & Step Photo Management Mode
  const [showStepImages, setShowStepImages] = useState(true);
  const [isManagingStepPhotos, setIsManagingStepPhotos] = useState(false);
  const [targetStepForPhoto, setTargetStepForPhoto] = useState<number | null>(null);
  const stepFileInputRef = useRef<HTMLInputElement | null>(null);

  // Explicit Ingredient Customization Mode
  const [isCustomizingIngredients, setIsCustomizingIngredients] = useState(false);
  const [customizedIngredientNames, setCustomizedIngredientNames] = useState<Record<string, boolean>>({});

  // Modals & Menu states
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isEcoModalOpen, setIsEcoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showCookedDialog, setShowCookedDialog] = useState(false);
  const [cookedNotes, setCookedNotes] = useState('');

  // Section & Dropdown refs for click-outside dismissal
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const stepsSectionRef = useRef<HTMLElement | null>(null);
  const ingredientsSectionRef = useRef<HTMLElement | null>(null);

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
        <p className="text-sm text-[#686E6A] max-w-sm">
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

  const handleCopyIngredients = async () => {
    const text = generateRecipeIngredientsText(recipe, servings);
    await safeCopyToClipboard(text);
    setIsOverflowMenuOpen(false);
    showToast(`Zutaten für ${servings} Portionen kopiert! 📋`);
  };

  const handleAddShopping = () => {
    addToShoppingList(recipe, servings);
    setAddedShopping(true);
    showToast(`Zutaten für ${servings} Portionen auf der Einkaufsliste!`);
    setTimeout(() => setAddedShopping(false), 2500);
  };

  // Global click-outside dismissal for overflow menu, step photos edit mode & ingredient replace mode
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Node;

      // Close overflow menu if clicked outside
      if (isOverflowMenuOpen && overflowMenuRef.current && !overflowMenuRef.current.contains(target)) {
        setIsOverflowMenuOpen(false);
      }

      // Close ingredient customize mode if clicked outside ingredients section
      if (
        isCustomizingIngredients &&
        ingredientsSectionRef.current &&
        !ingredientsSectionRef.current.contains(target) &&
        !substitutingIngredient
      ) {
        setIsCustomizingIngredients(false);
      }

      // Close step photos manage mode if clicked outside steps section
      if (
        isManagingStepPhotos &&
        stepsSectionRef.current &&
        !stepsSectionRef.current.contains(target)
      ) {
        setIsManagingStepPhotos(false);
      }
    };

    document.addEventListener('pointerdown', handleGlobalClick);
    return () => {
      document.removeEventListener('pointerdown', handleGlobalClick);
    };
  }, [isOverflowMenuOpen, isCustomizingIngredients, isManagingStepPhotos, substitutingIngredient]);

  // Disable background body scroll whenever any modal/popup is open
  const isAnyModalOpen = Boolean(
    isFullscreenImageOpen ||
    substitutingIngredient ||
    isEditModalOpen ||
    isDeleteConfirmOpen ||
    showCookedDialog ||
    isEcoModalOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // Recipe Cover Photo Upload Handler (supports multiple files)
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const readPromises = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) resolve(dataUrl);
          else resolve('');
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    const newUrls = (await Promise.all(readPromises)).filter(Boolean);
    if (newUrls.length === 0) return;

    const updatedUserImages = [...(recipe.userImages || []), ...newUrls];
    const updated: Recipe = {
      ...recipe,
      userImages: updatedUserImages,
    };

    updateRecipe(updated);
    setCurrentImageIndex(allImages.length);
    showToast(newUrls.length > 1 ? `${newUrls.length} Fotos hinzugefügt! 📸` : 'Eigenes Kochfoto hinzugefügt! 📸');
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

    // Track customized ingredient name so "(angepasst)" hint displays
    setCustomizedIngredientNames((prev) => ({
      ...prev,
      [substituteName.toLowerCase()]: true,
      [originalName.toLowerCase()]: true,
    }));

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

  // Step Photo Handlers: trigger file input for a specific step
  const handleTriggerAddStepPhoto = (stepNumber: number) => {
    setTargetStepForPhoto(stepNumber);
    stepFileInputRef.current?.click();
  };

  const handleStepPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || targetStepForPhoto === null) return;

    const stepNumTarget = targetStepForPhoto;
    const fileList = Array.from(files) as File[];
    const readPromises = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) resolve(dataUrl);
          else resolve('');
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    const newUrls = (await Promise.all(readPromises)).filter(Boolean);
    if (newUrls.length === 0) return;

    const updatedSteps = recipe.steps.map((step, idx) => {
      const stepNum = typeof step === 'string' ? idx + 1 : step.stepNumber;
      if (stepNum === stepNumTarget) {
        const baseStep: RecipeStep = typeof step === 'string'
          ? { stepNumber: stepNum, title: `Schritt ${stepNum}`, text: step }
          : { ...step };
        const existingImages = baseStep.stepImages || [];
        return {
          ...baseStep,
          stepImages: [...existingImages, ...newUrls]
        };
      }
      return step;
    });

    const updated: Recipe = {
      ...recipe,
      steps: updatedSteps,
    };
    updateRecipe(updated);
    setShowStepImages(true);
    showToast(newUrls.length > 1 ? `${newUrls.length} Fotos zu Schritt ${stepNumTarget} hinzugefügt! 📸` : `Foto zu Schritt ${stepNumTarget} hinzugefügt! 📸`);
    setTargetStepForPhoto(null);
    e.target.value = '';
  };

  // Remove photo from a step
  const handleRemoveStepPhoto = (stepNumber: number, imageIndex: number) => {
    const updatedSteps = recipe.steps.map((step, idx) => {
      const stepNum = typeof step === 'string' ? idx + 1 : step.stepNumber;
      if (stepNum === stepNumber && typeof step !== 'string' && step.stepImages) {
        const newImages = step.stepImages.filter((_, i) => i !== imageIndex);
        return {
          ...step,
          stepImages: newImages
        };
      }
      return step;
    });

    const updated: Recipe = {
      ...recipe,
      steps: updatedSteps,
    };
    updateRecipe(updated);
    showToast('Schritt-Foto entfernt.');
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3E40] selection:bg-[#F1F5F2] selection:text-[#4A7856] pb-28">
      {/* Hidden file input for uploading user cover photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUploadPhoto}
        className="hidden"
      />

      {/* Hidden file input for uploading individual step photos */}
      <input
        ref={stepFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleStepPhotoUpload}
        className="hidden"
      />

      {/* 1. LIQUID-GLASS STICKY APP BAR ON SCROLL & FLOATING TOP CONTROLS */}
      <nav
        aria-label="Rezept Navigation"
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-[#ECEBE8] shadow-xs py-2.5 px-4 text-[#2D3E40]'
            : 'bg-transparent py-4 px-4 text-white pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Top Left: Back button (48x48px comfortable touch target) */}
          <button
            id="recipe-back-floating-btn"
            type="button"
            onClick={handleGoBack}
            className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isScrolled
                ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] border border-[#ECEBE8] shadow-2xs'
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
            <span className="font-bold text-base text-[#2D3E40] truncate block">
              {recipe.title}
            </span>
          </div>

          {/* Top Right: Photo Upload, Favorite, Overflow Menu */}
          <div className="flex items-center gap-2">
            {/* Upload Recipe Cover Photo Button */}
            <button
              id="recipe-upload-photo-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isScrolled
                  ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] border border-[#ECEBE8] shadow-2xs'
                  : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
              }`}
              title="Rezept-Titelbild / Foto hochladen"
              aria-label="Rezept-Titelbild / Foto hochladen"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Favorite Toggle Button */}
            <button
              id="recipe-fav-floating-btn"
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isScrolled
                  ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] border border-[#ECEBE8] shadow-2xs'
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
            <div ref={overflowMenuRef} className="relative">
              {/* Native iOS / Mobile Dropdown Select */}
              <select
                aria-label="Rezept Optionen"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'copy') handleCopyIngredients();
                  else if (val === 'edit') setIsEditModalOpen(true);
                  else if (val === 'duplicate') handleDuplicate();
                  else if (val === 'cooked') setShowCookedDialog(true);
                  else if (val === 'dislike') toggleDislike(recipe.id);
                  else if (val === 'delete') setIsDeleteConfirmOpen(true);
                  e.target.value = '';
                }}
                className="sm:hidden absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer text-[16px]"
              >
                <option value="" disabled>Rezept-Optionen...</option>
                <option value="copy">📋 Zutaten kopieren</option>
                <option value="edit">✏️ Rezept bearbeiten</option>
                <option value="duplicate">📑 Rezept duplizieren</option>
                <option value="cooked">🍳 Als gekocht erfassen</option>
                <option value="dislike">{isDisliked ? '👍 Nicht mehr disliken' : '👎 Seltener anzeigen'}</option>
                <option value="delete">🗑️ Rezept löschen</option>
              </select>

              <button
                id="recipe-overflow-menu-btn"
                type="button"
                onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  isScrolled
                    ? 'bg-[#F1F5F2] hover:bg-[#E2ECE4] text-[#2D3E40] border border-[#ECEBE8] shadow-2xs'
                    : 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-white shadow-md'
                }`}
                aria-label="Weitere Optionen"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Desktop Overflow Dropdown */}
              {isOverflowMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOverflowMenuOpen(false)}
                  />
                  <div className="hidden sm:block absolute right-0 top-14 z-50 w-64 bg-white rounded-2xl shadow-xl border border-[#ECEBE8] py-2 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={handleCopyIngredients}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Copy className="w-5 h-5 text-[#4A7856]" />
                      <span>Kopieren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-5 h-5 text-[#4A7856]" />
                      <span>Rezept bearbeiten</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Copy className="w-5 h-5 text-[#4A7856]" />
                      <span>Rezept duplizieren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setShowCookedDialog(true);
                      }}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <SmilePlus className="w-5 h-5 text-[#4A7856]" />
                      <span>Als gekocht erfassen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        toggleDislike(recipe.id);
                      }}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-[#2D3E40] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <ThumbsDown className="w-5 h-5 text-[#686e6a]" />
                      <span>{isDisliked ? 'Nicht mehr disliken' : 'Seltener anzeigen'}</span>
                    </button>

                    <div className="my-1 border-t border-[#ECEBE8]" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-[16px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600" />
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
          </div>
        ) : (
          /* Fallback banner for text-only / AI recipes without image */
          <div className="relative h-64 sm:h-72 w-full bg-gradient-to-br from-[#2D3E40] to-[#1F2C2D] flex items-center justify-center p-6 text-white text-center">
            <div className="space-y-2 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-3xl">
                🌱
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{recipe.title}</h2>
              <p className="text-xs text-stone-300">Vegetarisches Chef-Rezept</p>
            </div>
          </div>
        )}
      </header>

      {/* 3. MAIN BODY CONTENT */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-6 sm:space-y-8">
        {/* Title, Badges (Strictly max 2) & Subtitle */}
        <section className="space-y-3">
          {/* Metadata Badges: Strictly max 2 badges, no metric duplicates or generic fluff */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#4A7856] text-white text-xs font-semibold shadow-2xs">
              {isVeganized || recipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
            </span>
            {recipe.category && (
              <span className="px-3 py-1 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold">
                {recipe.category}
              </span>
            )}
          </div>

          {/* Glanceable Mobile Title */}
          <h1 className="text-4xl font-bold tracking-tight text-[#2D3E40] leading-tight">
            {recipe.title}
          </h1>

          {/* Subtitle */}
          {recipe.subtitle && (
            <p id="recipe-detail-subtitle" className="text-base text-[#686E6A] leading-relaxed max-w-3xl">
              {recipe.subtitle}
            </p>
          )}
        </section>

        {/* 4. QUICK-FACTS GRID (2x2 Mobile Hierarchy with Schwierigkeit Metric) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Time */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#ECEBE8] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#686E6A] uppercase tracking-wider">
                Gesamtzeit
              </div>
              <div className="font-bold text-[#2D3E40] text-base tabular-nums">
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
              <div className="text-[14px] font-semibold text-[#686E6A] uppercase tracking-wider">
                Kalorien
              </div>
              <div className="font-bold text-[#2D3E40] text-base tabular-nums">
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
              <div className="text-[14px] font-semibold text-[#686E6A] uppercase tracking-wider">
                Protein
              </div>
              <div className="font-bold text-[#4A7856] text-base tabular-nums">
                {recipe.nutrients.protein}g
              </div>
            </div>
          </div>

          {/* Schwierigkeit (Replaces Eco-Score with matching typography and weight) */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#ECEBE8] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#686E6A] uppercase tracking-wider">
                Schwierigkeit
              </div>
              <div className="font-bold text-[#2D3E40] text-base truncate">
                {recipe.difficulty || 'Einfach'}
              </div>
            </div>
          </div>
        </section>

        {/* 5. SERVINGS CARD & BALANCED 3-COLUMN ACTION ROW */}
        <section className="bg-white border border-[#ECEBE8] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Servings Stepper */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#4A7856]" />
              <span className="text-[16px] font-semibold text-[#2D3E40]">Portionen anpassen:</span>
            </div>

            <div className="flex items-center gap-2.5">
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
                  <span>{isVeganized ? '✓ Vegan' : 'Veganisieren'}</span>
                </button>
              )}

              <div className="inline-flex items-center bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl p-1 shadow-2xs">
                <button
                  id="servings-step-decrease-btn"
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] disabled:opacity-30 text-[#57534d] transition-colors cursor-pointer touch-manipulation"
                  aria-label="Portion verringern"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 sm:px-4 text-[16px] font-bold text-[#57534d] tabular-nums min-w-[85px] text-center select-none">
                  {servings} {servings === 1 ? 'Portion' : 'Portionen'}
                </span>
                <button
                  id="servings-step-increase-btn"
                  type="button"
                  onClick={() => setServings(Math.min(24, servings + 1))}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] text-[#57534d] transition-colors cursor-pointer touch-manipulation"
                  aria-label="Portion erhöhen"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Under servings counter: Clean 3-Column Action Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 border-t border-[#ECEBE8]/70">
            {/* 1. [ + Planer ] */}
            <button
              id="servings-add-to-plan-btn"
              type="button"
              onClick={() => setRecipeToAddToPlan(recipe)}
              className="h-11 px-2 sm:px-3 rounded-xl text-[16px] font-semibold bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#57534d] flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 text-center min-w-0"
            >
              <CalendarPlus className="w-4 h-4 text-[#4A7856] shrink-0" />
              <span className="text-[16px] truncate">+ Planer</span>
            </button>

            {/* 2. [ + Liste ] */}
            <button
              id="servings-add-to-shopping-btn"
              type="button"
              onClick={handleAddShopping}
              className="h-11 px-2 sm:px-3 rounded-xl text-[16px] font-semibold bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#57534d] flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 text-center min-w-0"
            >
              {addedShopping ? (
                <Check className="w-4 h-4 text-[#4A7856] shrink-0" />
              ) : (
                <ShoppingCart className="w-4 h-4 text-[#4A7856] shrink-0" />
              )}
              <span className="text-[16px] truncate">{addedShopping ? 'Auf Liste' : '+ Liste'}</span>
            </button>

            {/* 3. [ Kopieren ] */}
            <button
              id="servings-copy-ingredients-btn"
              type="button"
              onClick={handleCopyIngredients}
              className="h-11 px-2 sm:px-3 rounded-xl text-[16px] font-semibold bg-[#FAF9F6] border border-[#ECEBE8] hover:bg-[#F1F5F2] hover:border-[#4A7856]/40 text-[#57534d] flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 text-center min-w-0"
            >
              <Copy className="w-4 h-4 text-[#4A7856] shrink-0" />
              <span className="text-[16px] truncate">Kopieren</span>
            </button>
          </div>
        </section>

        {/* 6. INGREDIENTS LIST (Zutaten mit explizitem Anpassungs-Modus) */}
        <section ref={ingredientsSectionRef} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#2D3E40] flex items-center gap-2">
                <span>Zutaten</span>
                <span className="text-xs font-normal text-[#686E6A]">
                  ({activeIngredients.length} Positionen für {servings} {servings === 1 ? 'Portion' : 'Portionen'})
                </span>
              </h2>
              <span className="text-xs text-[#686E6A] hidden sm:inline">
                {isCustomizingIngredients ? 'Tippe auf Ersetzen für Alternativen' : 'Tippe zum Abhaken'}
              </span>
            </div>

            {/* Explicit Ingredient Customization Mode Toggle Button */}
            <button
              id="toggle-ingredient-customize-btn"
              type="button"
              onClick={() => setIsCustomizingIngredients(!isCustomizingIngredients)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[16px] font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
                isCustomizingIngredients
                  ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-xs hover:bg-[#3D6447]'
                  : 'bg-white hover:bg-[#F1F5F2] border-[#ECEBE8] text-[#57534d] shadow-2xs'
              }`}
              title={isCustomizingIngredients ? 'Zutatenanpassung beenden' : 'Zutaten anpassen'}
            >
              {isCustomizingIngredients ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[16px]">Fertig</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#4A7856]" />
                  <span className="text-[16px]">Zutaten anpassen</span>
                </>
              )}
            </button>
          </div>

          {/* Flat List with Dividers; Clean in Default State, Explicit Replace Buttons in Edit State */}
          <div className="border border-[#ECEBE8] rounded-2xl overflow-hidden bg-white shadow-2xs">
            <ul className="divide-y divide-[#ECEBE8]">
              {activeIngredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.name];
                const amountStr = formatIngredientAmount(ing, recipe.servings, servings);
                const isCustomized = !!customizedIngredientNames[ing.name.toLowerCase()];

                return (
                  <li
                    key={ing.name}
                    onClick={() => {
                      if (!isCustomizingIngredients) {
                        toggleCheckIngredient(ing.name);
                      }
                    }}
                    className={`flex items-center justify-between py-3.5 px-4 sm:px-5 hover:bg-[#FAF9F6] transition-colors select-none group ${
                      isCustomizingIngredients ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {/* Left: Custom Checkbox + Natural Wrapping Ingredient Name + "(angepasst)" hint */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div
                        onClick={(e) => {
                          if (isCustomizingIngredients) {
                            e.stopPropagation();
                            toggleCheckIngredient(ing.name);
                          }
                        }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          isCustomizingIngredients ? 'cursor-pointer' : ''
                        } ${
                          isChecked
                            ? 'bg-[#4A7856] border-[#4A7856] text-white'
                            : 'border-[#D1D5DB] bg-white group-hover:border-[#4A7856]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-base font-medium break-words leading-normal transition-all ${
                              isChecked ? 'line-through text-[#686e6a] opacity-60' : 'text-[#2D3E40]'
                            }`}
                          >
                            {ing.name}
                          </span>

                          {/* Non-intrusive inline adaptation hint */}
                          {isCustomized && (
                            <span className="inline-flex items-center text-[10px] font-bold text-[#4A7856] bg-[#F1F5F2] px-1.5 py-0.5 rounded-md shrink-0">
                              (angepasst)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quantity + Action */}
                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      <span
                        className={`text-base font-semibold text-right tabular-nums whitespace-nowrap ${
                          isChecked ? 'line-through text-[#686e6a] opacity-60' : 'text-[#4A7856]'
                        }`}
                      >
                        {amountStr}
                      </span>

                      {/* Explicit [ Ersetzen ] Button only shown during customization mode */}
                      {isCustomizingIngredients && (
                        <button
                          type="button"
                          id={`replace-ingredient-${ing.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubstitutingIngredient(ing);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] hover:border-[#4A7856]/40 text-[14px] font-semibold text-[#4A7856] transition-all cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
                            isChecked ? 'opacity-40 hover:opacity-80' : ''
                          }`}
                          title={`${ing.name} ersetzen`}
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          <span className="text-[14px]">Ersetzen</span>
                        </button>
                      )}
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
            <h3 className="text-[16px] font-bold text-[#57534d] uppercase tracking-wider">
              Nährwerte pro Portion ({recipe.nutrients.calories} kcal)
            </h3>
          </div>

          {/* Primary Macro Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-[16px] font-semibold text-[#686E6A]">Protein</div>
              <div className="text-lg font-bold text-[#4A7856] mt-0.5 tabular-nums">
                {recipe.nutrients.protein}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-[16px] font-semibold text-[#686E6A]">Kohlenhydrate</div>
              <div className="text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.carbs}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-[16px] font-semibold text-[#686E6A]">Fett</div>
              <div className="text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.fat}g
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#ECEBE8] text-center shadow-2xs">
              <div className="text-[16px] font-semibold text-[#686E6A]">Ballaststoffe</div>
              <div className="text-lg font-bold text-[#2D3E40] mt-0.5 tabular-nums">
                {recipe.nutrients.fiber}g
              </div>
            </div>
          </div>

          {/* Expandable Micronutrients Accordion */}
          <div className="bg-white rounded-xl border border-[#ECEBE8] overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMicronutrientsOpen(!isMicronutrientsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-[14px] font-semibold text-[#57534d] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Leaf className="w-3.5 h-3.5 text-[#4A7856]" />
                <span className="text-[14px]">Mikronährstoffe, Vitamine & Mineralien</span>
              </span>
              {isMicronutrientsOpen ? (
                <ChevronUp className="w-4 h-4 text-[#686E6A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#686E6A]" />
              )}
            </button>

            {isMicronutrientsOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-[#ECEBE8] bg-[#FAF9F6]/50 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Eisen</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.iron ?? (Math.round((recipe.nutrients.calories / 100) * 0.9 * 10) / 10)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Vitamin B12</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.b12 ?? (recipe.isVegan ? '0 µg (pflanzl.)' : '0.5 µg')}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Calcium</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.calcium ?? Math.round((recipe.nutrients.calories / 100) * 38)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Zink</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.zinc ?? (Math.round((recipe.nutrients.calories / 100) * 0.7 * 10) / 10)} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Vitamin C</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.vitaminC ?? 26} mg
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#ECEBE8]">
                    <div className="text-[12px] text-[#686E6A]">Magnesium</div>
                    <div className="font-bold text-sm text-[#2D3E40] tabular-nums">
                      {recipe.nutrients.magnesium ?? 68} mg
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 8. PREPARATION STEPS & TIMELINE WITH DYNAMIC STEP-BY-STEP MEDIA */}
        <section ref={stepsSectionRef} className="space-y-4">
          {(() => {
            const hasStepPhotos = recipe.steps.some((s) => {
              if (typeof s === 'string') return false;
              return s.stepImages && s.stepImages.length > 0;
            });

            return (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#2D3E40]">
                      Zubereitung Schritt für Schritt
                    </h3>
                    <span className="text-xs text-[#686E6A]">Tippe zum Abhaken</span>
                  </div>

                  {/* Header Actions for Step Photos */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isManagingStepPhotos ? (
                      /* In management mode: ONLY show [ Fertig ] button */
                      <button
                        id="finish-step-photos-btn"
                        type="button"
                        onClick={() => setIsManagingStepPhotos(false)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[16px] font-semibold bg-[#4A7856] text-white border border-[#4A7856] hover:bg-[#3D6447] transition-colors shadow-2xs cursor-pointer touch-manipulation active:scale-95 shrink-0"
                        title="Bearbeitung beenden"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[16px]">Fertig</span>
                      </button>
                    ) : hasStepPhotos ? (
                      /* Not in management mode & photos exist: show [ Fotos aus-/einblenden ] and [ Verwalten (Stift) ] */
                      <>
                        <button
                          id="toggle-step-images-btn"
                          type="button"
                          onClick={() => setShowStepImages(!showStepImages)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[16px] font-semibold text-[#57534d] transition-colors shadow-2xs cursor-pointer touch-manipulation active:scale-95 shrink-0"
                          title={showStepImages ? 'Schritt-Fotos ausblenden' : 'Schritt-Fotos einblenden'}
                        >
                          {showStepImages ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-[#686E6A]" />
                              <span className="text-[16px]">Fotos ausblenden</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-[#4A7856]" />
                              <span className="text-[16px]">Fotos einblenden</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsManagingStepPhotos(true);
                            setShowStepImages(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[16px] font-semibold bg-white hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
                          title="Fotos verwalten"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[16px]">Verwalten</span>
                        </button>
                      </>
                    ) : (
                      /* Not in management mode & no photos exist: show [ + Fotos hinzufügen ] */
                      <button
                        id="manage-step-photos-btn"
                        type="button"
                        onClick={() => {
                          setIsManagingStepPhotos(true);
                          setShowStepImages(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[16px] font-semibold bg-white hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[#57534d] transition-colors shadow-2xs cursor-pointer touch-manipulation active:scale-95 shrink-0"
                        title="Schritt-Fotos hinzufügen"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#4A7856]" />
                        <span className="text-[16px]">Fotos hinzufügen</span>
                      </button>
                    )}
                  </div>
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
                          className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all cursor-pointer ${
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
                                  isStepDone ? 'line-through text-[#686e6a] opacity-60' : 'text-[#2D3E40]'
                                }`}
                              >
                                {stepObj.title || `Schritt ${stepObj.stepNumber}`}
                              </span>

                              {stepObj.timerMinutes && (
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#457250] bg-[#E8EFEA] border border-[#D8E3DA] px-2.5 py-0.5 rounded-full transition-opacity ${
                                    isStepDone ? 'opacity-40' : ''
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 text-[#4A7856]" />
                                  {stepObj.timerMinutes} Min.
                                </span>
                              )}
                            </div>

                            <p
                              className={`text-base leading-relaxed break-words mt-1 transition-colors ${
                                isStepDone ? 'line-through text-[#686e6a] opacity-60' : 'text-[#2D3E40]'
                              }`}
                            >
                              {stepObj.text}
                            </p>
                          </div>

                          {/* Step Images Layout: Swipeable carousel matching the main recipe gallery */}
                          {showStepImages && stepImages.length > 0 && (
                            <div className={`transition-opacity duration-200 ${isStepDone ? 'opacity-40 grayscale-[15%]' : ''}`}>
                              <StepImageSwiper
                                stepNumber={stepObj.stepNumber}
                                images={stepImages}
                                stepTitle={stepObj.title || `Schritt ${stepObj.stepNumber}`}
                                isManagingPhotos={isManagingStepPhotos}
                                onRemovePhoto={handleRemoveStepPhoto}
                                onOpenLightbox={openLightbox}
                              />
                            </div>
                          )}

                          {/* Explicit Step Photo Upload Trigger Target in photo management mode */}
                          {isManagingStepPhotos && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerAddStepPhoto(stepObj.stepNumber)}
                                className="w-full py-3 px-4 rounded-xl border border-dashed border-[#4A7856]/50 hover:border-[#4A7856] bg-[#F1F5F2]/60 hover:bg-[#F1F5F2] text-xs font-semibold text-[#4A7856] flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-[0.99]"
                              >
                                <Plus className="w-4 h-4 text-[#4A7856]" />
                                <span>Foto zu Schritt {stepObj.stepNumber} hinzufügen</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Smart Chef Tip Callout */}
          {recipe.chefTip && (
            <div className="p-4 bg-[#FDF6F0] border-l-4 border-[#BD4800] rounded-r-2xl flex items-start gap-3 mt-4">
              <ChefHat className="w-5 h-5 text-[#BD4800] shrink-0 mt-0.5" />
              <div>
                <h4 id="chef-tip-heading" className="text-[16px] leading-[24px] font-bold text-[#BD4800] uppercase tracking-wider">
                  Profi-Tipp vom Veggie-Chef
                </h4>
                <p className="text-[16px] leading-[26px] text-[#2D3E40] mt-1">
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
              <h3 className="text-base font-bold text-[#2D3E40]">
                Persönliche Notizen
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="text-[16px] text-[#57534d] hover:text-[#4A7856] font-semibold cursor-pointer"
            >
              {isNotesExpanded ? 'Schließen' : personalNoteText.trim() ? 'Bearbeiten' : '+ Notiz hinzufügen'}
            </button>
          </div>

          {/* Collapsed view with preview or placeholder */}
          {!isNotesExpanded && personalNoteText.trim() && (
            <div 
              onClick={() => setIsNotesExpanded(true)}
              className="p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-base text-[#2D3E40] cursor-pointer hover:border-[#4A7856]/40 transition-colors italic"
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
                className="w-full text-base p-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden text-[#2D3E40]"
              />

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  id="cancel-personal-notes-btn"
                  type="button"
                  onClick={() => setIsNotesExpanded(false)}
                  className="h-11 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-[#57534d] hover:text-[#4A7856] hover:bg-[#FAF9F6] border border-transparent hover:border-[#ECEBE8] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                >
                  Abbrechen
                </button>
                <button
                  id="save-personal-notes-btn"
                  type="button"
                  onClick={handleSaveNotes}
                  className="h-11 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-sm font-bold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
            <span className="text-xs font-semibold text-[#686E6A] hidden sm:inline">Portionen:</span>
            <div className="inline-flex items-center bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl p-1">
              <button
                id="sticky-servings-decrease-btn"
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] disabled:opacity-30 text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="Portion verringern"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-[16px] font-bold text-[#57534d] tabular-nums min-w-[65px] text-center select-none">
                {servings} Port.
              </span>
              <button
                id="sticky-servings-increase-btn"
                type="button"
                onClick={() => setServings(Math.min(24, servings + 1))}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white active:bg-[#ECEBE8] text-[#57534d] transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="Portion erhöhen"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary CTA: Start Cooking Mode (Exclusive prominent trigger) */}
          <button
            id="sticky-start-cooking-mode-btn"
            type="button"
            onClick={handleLaunchCookingMode}
            className="flex-1 max-w-sm h-12 flex items-center justify-center gap-2.5 px-6 rounded-xl text-base font-bold bg-[#4A7856] hover:bg-[#3D6447] active:bg-[#34553C] text-white shadow-md transition-all cursor-pointer active:scale-[0.99] touch-manipulation"
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
        recipeTitle={recipe.title}
        recipeIngredients={activeIngredients}
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
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-bold text-[#2D3E40]">Rezept löschen?</h3>
              <p className="text-[16px] text-[#57534d] leading-relaxed">
                Möchtest du "{recipe.title}" wirklich unwiderruflich aus deiner Rezeptsammlung entfernen?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-[16px] font-semibold text-[#57534d] bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-[16px] font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
            <div className="text-center space-y-1.5">
              <span className="text-3xl">🎉</span>
              <h3 className="text-xl font-bold text-[#2D3E40]">Guten Appetit!</h3>
              <p className="text-[16px] text-[#57534d] leading-relaxed">
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
                className="w-full text-[16px] p-3 border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden text-[#2D3E40]"
              />
            </div>

            <div className="p-3.5 bg-[#F1F5F2] rounded-xl text-xs text-[#4A7856] border border-[#ECEBE8]">
              🌱 Durch dieses Gericht hast du ca. <strong>{savings.savedCO2Kg} kg CO₂</strong> und{' '}
              <strong>{savings.savedWaterLiters} Liter Wasser</strong> eingespart!
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCookedDialog(false)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-[16px] font-semibold text-[#57534d] bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmCooked}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-[16px] font-semibold text-white bg-[#4A7856] hover:bg-[#3D6447] shadow-xs cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
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
