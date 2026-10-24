import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Check,
  ChefHat,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep, IngredientCategory } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useRecipes } from '../context/RecipeContext';
import { CloseButton } from './ui/CloseButton';

interface AddRecipeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onRecipeAdded?: (recipe: Recipe) => void;
}

/**
 * Extracts a candidate title from plain text input
 */
function extractTitleCandidate(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return 'Neues Rezept';
  const firstLine = lines[0]
    .replace(/^[#*_\-\s:]+/, '')
    .replace(/^rezept(?:\s*name)?[:\s]*/i, '')
    .replace(/^gericht[:\s]*/i, '')
    .trim();
  return firstLine.slice(0, 80) || 'Neues Rezept';
}

function inferIngredientCategory(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  if (/tofu|hafermilch|soja|seidentofu|vegane butter|joghurt|frischkäse/i.test(lower)) return 'kuehlregal';
  if (/salz|pfeffer|paprikapulver|kurkuma|kreuzkümmel|oregano|basilikum|chili|zimt|muskat/i.test(lower)) return 'gewuerze';
  if (/kichererbsen|linsen|bohnen|edamame/i.test(lower)) return 'huelsenfruechte';
  if (/nudeln|pasta|reis|mehl|haferflocken|quinoa|couscous|öl|olivenöl|kokosmilch|sesam/i.test(lower)) return 'trockenwaren';
  if (/zwiebel|knoblauch|tomate|zucchini|paprika|karotte|spinat|champignon|pilz|brokkoli|gurke|avocado|ingwer|zitrone|limette/i.test(lower)) return 'gemuese';
  return 'sonstiges';
}

/**
 * Deterministically parses a user description or pasted recipe into a Recipe object
 */
function parseRecipeFromDescription(text: string, imageBase64?: string | null): Recipe {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const title = extractTitleCandidate(text);
  const ingredients: RecipeIngredient[] = [];
  const rawStepTexts: string[] = [];
  let isIngredientSection = false;
  let isStepSection = false;
  let chefTip = '';
  let foundMinutes: number | undefined;

  const ingredientPattern = /^[-*•–]\s*(.+)$/;
  const amountUnitPattern = /^(\d+(?:[.,]\d+)?|\d+\/\d+)?\s*(g|kg|ml|l|tl|el|prise|dosen?|dose|zehen?|zehe|bund|stk|stück|scheiben?|packung|glas)?\s+(.+)$/i;
  const numberedStepPattern = /^(?:schritt\s*\d+[:.]?|\d+[.)])\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:zutaten|einkaufsliste|was du brauchst)[:\s]*$/i.test(line)) {
      isIngredientSection = true;
      isStepSection = false;
      continue;
    }
    if (/^(?:zubereitung|schritte|anleitung|so geht's|kochen)[:\s]*$/i.test(line)) {
      isIngredientSection = false;
      isStepSection = true;
      continue;
    }
    if (/^(?:tipp|chefkoch-tipp|hinweis|profitipp)[:\s]*(.*)$/i.test(line)) {
      const match = line.match(/^(?:tipp|chefkoch-tipp|hinweis|profitipp)[:\s]*(.*)$/i);
      chefTip = match && match[1] ? match[1].trim() : lines[i + 1] || '';
      continue;
    }

    const timeMatch = line.match(/(?:zubereitungszeit|kochzeit|dauer|zeit|fertig in)[:\s]*(\d+)\s*(?:min|minuten)/i);
    if (timeMatch && !foundMinutes) {
      foundMinutes = parseInt(timeMatch[1], 10);
    }

    if (isIngredientSection) {
      const cleanLine = line.replace(/^[-*•–]\s*/, '').trim();
      const match = cleanLine.match(amountUnitPattern);
      if (match) {
        const rawAmount = match[1] ? match[1].replace(',', '.') : '';
        const parsedAmount = rawAmount ? (isNaN(Number(rawAmount)) ? rawAmount : Number(rawAmount)) : '';
        const unit = match[2] || '';
        const name = match[3].trim();
        ingredients.push({
          name: name || cleanLine,
          amount: parsedAmount,
          unit,
          category: inferIngredientCategory(name || cleanLine),
          isEssential: true
        });
      } else {
        ingredients.push({
          name: cleanLine,
          amount: '',
          unit: '',
          category: inferIngredientCategory(cleanLine),
          isEssential: true
        });
      }
      continue;
    }

    if (isStepSection) {
      const cleanLine = line.replace(numberedStepPattern, '$1').trim();
      if (cleanLine) {
        rawStepTexts.push(cleanLine);
      }
      continue;
    }

    if (ingredientPattern.test(line)) {
      const cleanLine = line.replace(ingredientPattern, '$1').trim();
      const match = cleanLine.match(amountUnitPattern);
      if (match) {
        const rawAmount = match[1] ? match[1].replace(',', '.') : '';
        const parsedAmount = rawAmount ? (isNaN(Number(rawAmount)) ? rawAmount : Number(rawAmount)) : '';
        ingredients.push({
          name: match[3].trim(),
          amount: parsedAmount,
          unit: match[2] || '',
          category: inferIngredientCategory(match[3]),
          isEssential: true
        });
      } else {
        ingredients.push({
          name: cleanLine,
          amount: '',
          unit: '',
          category: inferIngredientCategory(cleanLine),
          isEssential: true
        });
      }
    } else if (numberedStepPattern.test(line)) {
      const cleanLine = line.replace(numberedStepPattern, '$1').trim();
      rawStepTexts.push(cleanLine);
    }
  }

  if (ingredients.length === 0 && rawStepTexts.length === 0) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length > 1) {
      paragraphs.slice(1).forEach((p) => rawStepTexts.push(p));
    } else if (paragraphs.length === 1 && paragraphs[0] !== title) {
      rawStepTexts.push(paragraphs[0]);
    }
  }

  const steps: RecipeStep[] = rawStepTexts.map((textItem, idx) => {
    const timerMatch = textItem.match(/(\d+)\s*(?:min|minuten)/i);
    const timerMinutes = timerMatch ? parseInt(timerMatch[1], 10) : undefined;
    return {
      stepNumber: idx + 1,
      title: `Schritt ${idx + 1}`,
      text: textItem,
      timerMinutes
    };
  });

  let totalTime = foundMinutes || 0;
  if (!totalTime && steps.length > 0) {
    const stepTimers = steps.map((s) => s.timerMinutes || 0).filter((m) => m > 0);
    if (stepTimers.length > 0) {
      totalTime = stepTimers.reduce((a, b) => a + b, 0);
    }
  }
  if (!totalTime) totalTime = 25;

  let category: RecipeCategory = 'Schnelle Küche';
  const lower = text.toLowerCase();
  if (/pasta|spaghetti|penne|fusilli|gnocchi|nudel/i.test(lower)) category = 'Pasta & Gnocchi';
  else if (/curry|eintopf|dahl|dal|suppe/i.test(lower)) category = 'Currys & Eintöpfe';
  else if (/bowl|salat/i.test(lower)) category = 'Bowls & Salate';
  else if (/ofen|auflauf|pizza|quiche/i.test(lower)) category = 'Ofengerichte';
  else if (/frühstück|müsli|porridge|pancake|waffel/i.test(lower)) category = 'Süßes & Frühstück';
  else if (/snack|dip|hummus|chips/i.test(lower)) category = 'Snacks & Dips';
  else if (/protein/i.test(lower)) category = 'High Protein';

  const servingsMatch = text.match(/(\d+)\s*(?:portion|portionen|pers|personen)/i);
  const servings = servingsMatch ? parseInt(servingsMatch[1], 10) : 2;

  const calMatch = text.match(/(\d+)\s*(?:kcal|kalorien)/i);
  const protMatch = text.match(/(\d+(?:[.,]\d+)?)\s*g?\s*protein/i);
  const calories = calMatch ? parseInt(calMatch[1], 10) : 520;
  const protein = protMatch ? Math.round(parseFloat(protMatch[1].replace(',', '.'))) : 18;

  return {
    id: `recipe-${Date.now()}`,
    title,
    subtitle: 'Aus deiner Beschreibung erstellt',
    category,
    isVegan: true,
    isVegetarian: true,
    diet: 'vegan',
    prepTimeMinutes: Math.round(totalTime * 0.4),
    cookTimeMinutes: Math.round(totalTime * 0.6),
    totalTimeMinutes: totalTime,
    difficulty: totalTime > 35 ? 'Mittel' : 'Einfach',
    servings,
    rating: 5.0,
    reviewCount: 1,
    image: imageBase64 || '',
    nutrients: {
      calories,
      protein,
      carbs: 55,
      fat: 16,
      fiber: 7
    },
    ingredients: ingredients.length > 0 ? ingredients : [
      { name: 'Gemüse nach Wahl', amount: 250, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Hülsenfrüchte oder Tofu', amount: 150, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Pflanzliches Öl', amount: 2, unit: 'EL', category: 'sonstiges', isEssential: false },
      { name: 'Gewürze & Kräuter', amount: 1, unit: 'TL', category: 'gewuerze', isEssential: false }
    ],
    steps: steps.length > 0 ? steps : [
      { stepNumber: 1, title: 'Zutaten vorbereiten', text: 'Alle Zutaten waschen, schneiden und bereitstellen.', timerMinutes: 5 },
      { stepNumber: 2, title: 'Zubereitung & Garen', text: 'Die Zutaten in einer Pfanne oder im Topf wie gewünscht anbraten und garen.', timerMinutes: 15 },
      { stepNumber: 3, title: 'Abschmecken & Servieren', text: 'Mit Salz, Pfeffer und frischen Kräutern verfeinern und genießen.' }
    ],
    chefTip: chefTip || 'Profitipp: Schmecke zum Schluss mit etwas Zitrone oder frischen Kräutern ab.',
    tags: ['Eigenkreation', 'Pflanzlich'],
    isCustomAi: true,
    createdAt: Date.now()
  };
}

export const AddRecipeModal: React.FC<AddRecipeModalProps> = (props) => {
  const recipesCtx = useRecipes();
  const isOpen = props.isOpen !== undefined ? props.isOpen : recipesCtx.isAddRecipeOpen;
  const onClose = props.onClose ?? (() => recipesCtx.setIsAddRecipeOpen(false));
  const onRecipeAdded = props.onRecipeAdded ?? recipesCtx.addRecipe;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Single text field for everything (ideas, pasted recipes, notes, instructions)
  const [recipeText, setRecipeText] = useState('');

  // Attached photo (optional)
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview step
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setPreviewRecipe(null);
      setErrorMsg(null);
      setIsSubmitting(false);
      setRecipeText('');
      setAttachedImageBase64(null);
    }
  }, [isOpen]);

  // Client-side image compressor
  const compressImage = (file: File, maxDimension = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Bitte wähle eine gültige Bilddatei aus (JPG, PNG oder WebP).');
      return;
    }

    try {
      const compressed = await compressImage(file, 1200, 0.7);
      setAttachedImageBase64(compressed);
      setErrorMsg(null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImageBase64(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Main Unified Submit Action
  const handleCreateRecipe = async () => {
    const textTrimmed = recipeText.trim();
    if (!textTrimmed && !attachedImageBase64) {
      setErrorMsg('Bitte beschreibe dein Gericht im Textfeld oder lade ein Foto hoch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let created: Recipe | null = null;
      let apiErrorMessage: string | null = null;

      // Case 1: Photo attached -> use scan endpoint with user text as notes
      if (attachedImageBase64) {
        try {
          const res = await fetch('/api/ai/scan-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: attachedImageBase64,
              userNotes: textTrimmed,
              isVegan: true,
            }),
          });

          const data = await res.json().catch(() => null);
          if (res.ok && data?.success && data?.recipe) {
            created = data.recipe;
            if (!created.image) {
              created.image = attachedImageBase64;
            }
          } else {
            apiErrorMessage = data?.error || 'Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.';
          }
        } catch {
          apiErrorMessage = 'Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.';
        }
      } else if (textTrimmed) {
        // Case 2: Only text -> call recipe creation endpoint
        try {
          const titleCandidate = extractTitleCandidate(textTrimmed);
          const res = await fetch('/api/ai/create-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: textTrimmed,
              title: titleCandidate,
              isVegan: true,
            }),
          });

          const data = await res.json().catch(() => null);
          if (res.ok && data?.success && data?.recipe) {
            created = data.recipe;
            if (attachedImageBase64 && created) {
              created.image = attachedImageBase64;
            }
          } else {
            apiErrorMessage = data?.error || 'Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.';
          }
        } catch {
          apiErrorMessage = 'Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.';
        }
      }

      if (created) {
        if (attachedImageBase64 && !created.image) {
          created.image = attachedImageBase64;
        }
        setPreviewRecipe(created);
        setErrorMsg(null);
      } else {
        setErrorMsg(apiErrorMessage || 'Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.');
      }
    } catch (err: any) {
      console.error('Error in handleCreateRecipe:', err);
      setErrorMsg('Die KI-Funktion ist gerade nicht verfügbar. Bitte versuche es später noch einmal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPreview = () => {
    if (!previewRecipe) return;
    onRecipeAdded(previewRecipe);
    onClose();
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="add-recipe-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 touch-none overscroll-contain"
        >
          <motion.div
            key="add-recipe-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] overscroll-contain"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-main">
                    {previewRecipe ? 'Rezept-Vorschau' : 'Gericht hinzufügen'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {previewRecipe
                      ? 'Prüfe Zutaten und Zubereitung vor dem Speichern'
                      : 'Beschreibe dein Gericht oder lade ein Foto hoch'}
                  </p>
                </div>
              </div>
              <CloseButton onClick={onClose} ariaLabel="Schließen" size="lg" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              {/* Error Banner */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Hinweis</span>
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="text-rose-700 hover:text-rose-900 p-1 cursor-pointer touch-manipulation"
                    aria-label="Fehlermeldung schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {isSubmitting ? (
                  <motion.div
                    key="add-recipe-submitting"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="py-12 px-4 flex flex-col items-center justify-center space-y-6 text-center"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-accent-tint border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div className="absolute -inset-1 rounded-2xl border-2 border-accent/30 animate-ping pointer-events-none" />
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <h3 className="text-lg font-bold text-text-main">
                        Rezept wird analysiert & strukturiert...
                      </h3>
                      <p className="text-xs text-text-muted">
                        Titel, Beschreibung und Zutaten mit Mengen werden für dich aufbereitet.
                      </p>
                    </div>

                    <div className="w-full max-w-md p-4 bg-surface rounded-2xl border border-border space-y-3 text-left">
                      <div className="h-5 bg-accent/20 rounded-md w-3/4 animate-pulse" />
                      <div className="h-3.5 bg-border rounded-md w-1/2 animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                        <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ) : previewRecipe ? (
                  /* DEUTLICH VERKÜRZTE REZEPT-VORSCHAU: NUR TITEL, BESCHREIBUNG & ZUTATEN (UNGEFÄHRE MENGE) */
                  <motion.div
                    key="add-recipe-preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                  >
                    {/* Titel & Beschreibung */}
                    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-3">
                      {previewRecipe.image ? (
                        <div className="relative rounded-xl overflow-hidden border border-border aspect-21/9 bg-card max-h-48">
                          <img
                            src={previewRecipe.image}
                            alt={previewRecipe.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-tint text-accent border border-accent/20 inline-block mb-2">
                          {previewRecipe.category || 'Rezept'}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-text-main leading-tight">
                          {previewRecipe.title}
                        </h3>
                        {previewRecipe.subtitle ? (
                          <p className="text-sm sm:text-base text-text-muted leading-relaxed mt-1.5">
                            {previewRecipe.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Zutaten mit ungefähren Mengen */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-bold text-text-main">
                          Zutaten <span className="text-xs font-normal text-text-muted">(ungefähre Mengen)</span>
                        </h4>
                        <span className="text-xs text-text-muted font-medium">
                          {previewRecipe.ingredients.length} {previewRecipe.ingredients.length === 1 ? 'Zutat' : 'Zutaten'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {previewRecipe.ingredients.map((ing, idx) => {
                          const rawAmount = ing.amount !== undefined && ing.amount !== null ? String(ing.amount).trim() : '';
                          const unit = ing.unit ? ing.unit.trim() : '';
                          let formattedAmount = '';

                          if (rawAmount) {
                            if (rawAmount.toLowerCase().startsWith('ca.') || rawAmount.toLowerCase().startsWith('etwa')) {
                              formattedAmount = `${rawAmount} ${unit}`.trim();
                            } else {
                              formattedAmount = `ca. ${rawAmount} ${unit}`.trim();
                            }
                          } else if (unit) {
                            formattedAmount = `ca. 1 ${unit}`;
                          } else {
                            formattedAmount = 'nach Geschmack';
                          }

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-sm gap-2"
                            >
                              <span className="font-medium text-text-main truncate">{ing.name}</span>
                              <span className="text-accent font-semibold bg-card px-2.5 py-1 rounded-lg border border-border shrink-0 text-xs sm:text-sm">
                                {formattedAmount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewRecipe(null)}
                        className="min-h-[48px] h-12 px-5 py-2.5 rounded-xl border border-border hover:bg-surface text-base font-semibold text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                      >
                        Zurück & Anpassen
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmPreview}
                        className="min-h-[48px] h-12 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Check className="w-5 h-5" />
                        <span>Ins Rezeptbuch speichern</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* GERICHT HINZUFÜGEN EINGABE-ANSICHT */
                  <motion.div
                    key="add-recipe-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                  >
                    {/* Text Input Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main block">
                        Beschreibe dein Gericht
                      </label>

                      <textarea
                        value={recipeText}
                        onChange={(e) => setRecipeText(e.target.value)}
                        placeholder="Rezept, Zutaten oder Idee eingeben..."
                        className="w-full min-h-[160px] sm:min-h-[200px] p-4 rounded-2xl bg-surface border border-border focus:border-accent text-base text-text-main resize-y focus:outline-none leading-relaxed transition-colors placeholder:text-text-muted/60"
                      />
                    </div>

                    {/* Photo Attachment Section */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                        Foto beifügen
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {attachedImageBase64 ? (
                        /* Attached image preview card */
                        <div className="relative rounded-2xl border border-border bg-surface p-3 sm:p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={attachedImageBase64}
                              alt="Angehängtes Foto"
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-border shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-accent bg-accent-tint px-2.5 py-0.5 rounded-full mb-1">
                                <Check className="w-3.5 h-3.5" /> Foto beigefügt
                              </span>
                              <p className="text-xs text-text-muted truncate">
                                Wird für die Rezeptanalyse & als Titelbild verwendet
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-12 min-h-[48px] px-4 rounded-xl border border-border bg-card hover:bg-surface text-sm font-semibold text-text-main transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
                            >
                              Ändern
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttachedImageBase64(null)}
                              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border border-border bg-card hover:bg-rose-50 text-text-muted hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                              title="Foto entfernen"
                              aria-label="Foto entfernen"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Upload trigger button */
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full min-h-[48px] p-3.5 rounded-2xl border border-dashed border-border hover:border-accent/50 bg-surface hover:bg-card flex items-center justify-center gap-2.5 text-sm font-semibold text-text-main transition-all cursor-pointer touch-manipulation active:scale-98"
                        >
                          <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span>Foto aufnehmen oder hochladen</span>
                        </button>
                      )}
                    </div>

                    {/* Primary Submit Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isSubmitting || (!recipeText.trim() && !attachedImageBase64)}
                        onClick={handleCreateRecipe}
                        className="w-full min-h-[48px] h-12 py-3 px-6 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-manipulation active:scale-98"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span>Gericht erstellen</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddRecipeModal;
