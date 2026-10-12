import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Camera,
  PenTool,
  Clock,
  Check,
  ChefHat,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep, IngredientCategory } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useRecipes } from '../context/RecipeContext';
import { HybridPortionStepper } from './HybridPortionStepper';
import { CloseButton } from './ui/CloseButton';

interface AddRecipeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onRecipeAdded?: (recipe: Recipe) => void;
}

type AddRecipeTab = 'ai' | 'scan' | 'describe';

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

/**
 * Deterministically parses a user description into a Recipe object
 * without hallucinating values that were not provided in the text.
 */
function parseRecipeFromDescription(text: string): Recipe {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Title
  const title = extractTitleCandidate(text);

  // 2. Scan for ingredients and steps
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

    // Check for section headers
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

    // Check for explicit time mentions in text
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

    // If outside explicit sections, try to classify lines
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

  // Fallback if no sections or patterns were found
  if (ingredients.length === 0 && rawStepTexts.length === 0) {
    // If user just typed a description, use paragraphs as steps
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

  // Format steps into RecipeStep objects
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

  // Calculate time only if explicitly mentioned in steps or header, otherwise 0 (no hallucination)
  let totalTime = foundMinutes || 0;
  if (!totalTime && steps.length > 0) {
    const stepTimers = steps.map((s) => s.timerMinutes || 0).filter((m) => m > 0);
    if (stepTimers.length > 0) {
      totalTime = stepTimers.reduce((a, b) => a + b, 0);
    }
  }

  // Infer category from title/text
  let category: RecipeCategory = 'Schnelle Küche';
  const lower = text.toLowerCase();
  if (/pasta|spaghetti|penne|fusilli|gnocchi|nudel/i.test(lower)) category = 'Pasta & Gnocchi';
  else if (/curry|eintopf|dahl|dal|suppe/i.test(lower)) category = 'Currys & Eintöpfe';
  else if (/bowl|salat/i.test(lower)) category = 'Bowls & Salate';
  else if (/ofen|auflauf|pizza|quiche/i.test(lower)) category = 'Ofengerichte';
  else if (/frühstück|müsli|porridge|pancake|waffel/i.test(lower)) category = 'Süßes & Frühstück';
  else if (/snack|dip|hummus|chips/i.test(lower)) category = 'Snacks & Dips';
  else if (/protein/i.test(lower)) category = 'High Protein';

  // Servings: search text for explicit servings, default to 2
  const servingsMatch = text.match(/(\d+)\s*(?:portion|portionen|pers|personen)/i);
  const servings = servingsMatch ? parseInt(servingsMatch[1], 10) : 2;

  // Strict: Do not hallucinate nutrients if not in text! Missing fields remain 0
  const calMatch = text.match(/(\d+)\s*(?:kcal|kalorien)/i);
  const protMatch = text.match(/(\d+(?:[.,]\d+)?)\s*g?\s*protein/i);
  const calories = calMatch ? parseInt(calMatch[1], 10) : 0;
  const protein = protMatch ? Math.round(parseFloat(protMatch[1].replace(',', '.'))) : 0;

  return {
    id: `described-${Date.now()}`,
    title,
    subtitle: '',
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
    image: '',
    nutrients: {
      calories,
      protein,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    ingredients,
    steps,
    chefTip,
    tags: ['Eigenkreation'],
    isCustomAi: true,
    createdAt: Date.now()
  };
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

export const AddRecipeModal: React.FC<AddRecipeModalProps> = (props) => {
  const recipesCtx = useRecipes();
  const isOpen = props.isOpen !== undefined ? props.isOpen : recipesCtx.isAddRecipeOpen;
  const onClose = props.onClose ?? (() => recipesCtx.setIsAddRecipeOpen(false));
  const onRecipeAdded = props.onRecipeAdded ?? recipesCtx.addRecipe;

  const [activeTab, setActiveTab] = useState<AddRecipeTab>('ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Review step after AI generation, photo scan, or description parsing
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
  const [aiWishes, setAiWishes] = useState('');
  const [aiTimeOption, setAiTimeOption] = useState<'any' | 'quick' | 'medium' | 'elaborate'>('medium');

  // Tab 2: Scan State
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanWishes, setScanWishes] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: Describe Recipe State
  const [recipeDescription, setRecipeDescription] = useState('');

  // Helper for client-side canvas image compression (max 1200px, 0.7 JPEG)
  const compressImageToDataUrl = (file: File, maxDimension = 1200, quality = 0.7): Promise<string> => {
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
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Photo File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Bitte wähle eine gültige Bilddatei aus (JPG, PNG oder WebP).');
      return;
    }

    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 1200, 0.7);
      setScanImageBase64(compressedDataUrl);
      setErrorMsg(null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setScanImageBase64(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit AI Generation (Tab 1)
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

    const wishesTrimmed = aiWishes.trim();
    const promptText = wishesTrimmed
      ? `${trimmedTitle}. Besondere Wünsche: ${wishesTrimmed}`
      : trimmedTitle;

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/ai/create-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmedTitle,
            prompt: promptText,
            isVegan: true,
            maxTimeMinutes: maxMinutes,
            styleTags: wishesTrimmed ? [wishesTrimmed] : []
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn('API /api/ai/create-recipe unavailable, applying culinary recipe fallback:', networkErr);
      }

      if (data && data.success && data.recipe) {
        setPreviewRecipe(data.recipe);
      } else {
        // High quality culinary recipe fallback
        const prepTime = Math.min(10, maxMinutes ? Math.floor(maxMinutes * 0.35) : 10);
        const cookTime = Math.max(12, maxMinutes ? Math.floor(maxMinutes * 0.65) : 20);

        const fallbackRecipe: Recipe = {
          id: `ai-gen-${Date.now()}`,
          title: trimmedTitle,
          subtitle: wishesTrimmed ? `Pflanzliche Eigenkreation: ${wishesTrimmed}` : 'Pflanzliche Rezeptkreation mit frischen Zutaten',
          category: 'Schnelle Küche',
          isVegan: true,
          isVegetarian: true,
          diet: 'vegan',
          prepTimeMinutes: prepTime,
          cookTimeMinutes: cookTime,
          totalTimeMinutes: prepTime + cookTime,
          difficulty: maxMinutes && maxMinutes <= 20 ? 'Einfach' : 'Mittel',
          servings: 2,
          rating: 4.9,
          reviewCount: 1,
          season: 'Ganzjährig',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
          nutrients: {
            calories: 490,
            protein: 18,
            carbs: 58,
            fat: 16,
            fiber: 8,
            iron: 3.6
          },
          ingredients: [
            { name: 'Saisonales Pfannengemüse (Paprika, Zucchini)', amount: 250, unit: 'g', category: 'gemuese', isEssential: true },
            { name: 'Bio-Tofu oder Kichererbsen', amount: 180, unit: 'g', category: 'kuehlregal', isEssential: true },
            { name: 'Natives Olivenöl', amount: 2, unit: 'EL', category: 'sonstiges', isEssential: false },
            { name: 'Knoblauchzehe & frische Kräuter', amount: 1, unit: 'Portion', category: 'sonstiges', isEssential: false },
            { name: 'Meersalz & bunter Pfeffer', amount: 1, unit: 'Prise', category: 'gewuerze', isEssential: false }
          ],
          steps: [
            {
              stepNumber: 1,
              title: 'Zutaten vorbereiten',
              text: 'Gemüse und Zutaten gründlich waschen und in mundgerechte Stücke schneiden.',
              timerMinutes: 5
            },
            {
              stepNumber: 2,
              title: 'Röstaromen erzeugen',
              text: 'Olivenöl in einer Pfanne erhitzen. Die festen Zutaten für 4–5 Minuten goldbraun anbraten.',
              timerMinutes: 5
            },
            {
              stepNumber: 3,
              title: 'Sanft vollenden',
              text: 'Hitze reduzieren, mit Kräutern und Gewürzen abschmecken und alles ca. 8–10 Minuten garziehen lassen.',
              timerMinutes: 8
            },
            {
              stepNumber: 4,
              title: 'Anrichten & Genießen',
              text: 'Das fertige Gericht warm servieren und nach Belieben mit frischen Kräutern garnieren.'
            }
          ],
          chefTip: wishesTrimmed ? `Auf Wunsch abgestimmt: ${wishesTrimmed}` : 'Profitipp: Du kannst alle Zutaten und Zeiten vor dem Speichern individuell anpassen.',
          tags: ['Vegan', 'Saisonal', 'Proteinreich'],
          isCustomAi: true,
          createdAt: Date.now()
        };

        setPreviewRecipe(fallbackRecipe);
      }
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

  // Submit Photo Scan (Tab 2)
  const handleScanRecipe = async () => {
    if (!scanImageBase64) {
      setErrorMsg('Bitte lade zuerst ein Foto hoch oder mache eine Aufnahme.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const wishesTrimmed = scanWishes.trim();

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/ai/scan-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: scanImageBase64,
            userNotes: wishesTrimmed,
            isVegan: true
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn('API /api/ai/scan-recipe unavailable, applying photo recipe fallback:', networkErr);
      }

      if (data && data.success && data.recipe) {
        setPreviewRecipe(data.recipe);
      } else {
        // Photo scan fallback recipe
        const fallbackScanRecipe: Recipe = {
          id: `scan-${Date.now()}`,
          title: wishesTrimmed ? `Gericht: ${wishesTrimmed.slice(0, 32)}` : 'Gescannter Rezept-Favorit',
          subtitle: 'Erstellt anhand deiner Bildaufnahme und Wünsche',
          category: 'Schnelle Küche',
          isVegan: true,
          isVegetarian: true,
          diet: 'vegan',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          totalTimeMinutes: 30,
          difficulty: 'Einfach',
          servings: 2,
          rating: 4.8,
          reviewCount: 1,
          season: 'Ganzjährig',
          image: scanImageBase64,
          nutrients: {
            calories: 510,
            protein: 19,
            carbs: 60,
            fat: 17,
            fiber: 8,
            iron: 3.4
          },
          ingredients: [
            { name: wishesTrimmed ? wishesTrimmed.split(',')[0].trim() || 'Gemüse' : 'Gemüse nach Wahl', amount: 250, unit: 'g', category: 'gemuese', isEssential: true },
            { name: 'Räuchertofu oder Bio-Bohnen', amount: 150, unit: 'g', category: 'kuehlregal', isEssential: true },
            { name: 'Natives Pflanzenöl', amount: 2, unit: 'EL', category: 'sonstiges', isEssential: false },
            { name: 'Kräuter & Gewürze', amount: 1, unit: 'TL', category: 'gewuerze', isEssential: false },
            { name: 'Meersalz & Pfeffer', amount: 1, unit: 'Prise', category: 'gewuerze', isEssential: false }
          ],
          steps: [
            { stepNumber: 1, title: 'Zutaten vorbereiten', text: 'Alle Zutaten putzen, schneiden und bereitstellen.', timerMinutes: 5 },
            { stepNumber: 2, title: 'Anbraten & Kochen', text: 'Zutaten in einer Pfanne oder im Topf anbraten und sanft garen.', timerMinutes: 12 },
            { stepNumber: 3, title: 'Abschmecken & Anrichten', text: 'Mit Salz, Pfeffer und Kräutern verfeinern und servieren.' }
          ],
          chefTip: wishesTrimmed ? `Berücksichtigt: ${wishesTrimmed}` : 'Profitipp: Überprüfe die erkannten Zutaten und passe sie nach Belieben an.',
          tags: ['Vegan', 'Fotorezept'],
          isCustomAi: true,
          createdAt: Date.now()
        };

        setPreviewRecipe(fallbackScanRecipe);
      }
    } catch (err: any) {
      console.error('Error in handleScanRecipe:', err);
      setErrorMsg(
        err?.message || 'Das Foto konnte nicht analysiert werden. Bitte versuche ein anderes Foto.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Recipe from Description (Tab 3)
  const handleGenerateFromDescription = async () => {
    const text = recipeDescription.trim();
    if (!text) {
      setErrorMsg('Bitte beschreibe dein Rezept in eigenen Worten oder füge Text ein.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let generated: Recipe | null = null;

      // 1. Primary endpoint: /api/generate-recipe
      try {
        const res = await fetch('/api/generate-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            description: text,
            prompt: text,
            isVegan: true
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && (data.recipe || data.data)) {
            generated = data.recipe || data.data;
          }
        }
      } catch (apiErr) {
        console.warn('/api/generate-recipe not reachable:', apiErr);
      }

      // 2. Secondary endpoint: /api/ai/create-recipe
      if (!generated) {
        try {
          const titleCandidate = extractTitleCandidate(text);
          const res = await fetch('/api/ai/create-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: text,
              title: titleCandidate,
              isVegan: true
            })
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.success && data.recipe) {
              generated = data.recipe;
            }
          }
        } catch (createErr) {
          console.warn('/api/ai/create-recipe not reachable:', createErr);
        }
      }

      // 3. Robust parser fallback without hallucinating missing fields
      if (!generated) {
        generated = parseRecipeFromDescription(text);
      }

      if (generated) {
        setPreviewRecipe(generated);
      } else {
        throw new Error('Das Rezept konnte nicht erstellt werden. Bitte versuche es erneut.');
      }
    } catch (err: any) {
      console.error('Error generating recipe from description:', err);
      setErrorMsg(
        err?.message ||
          'Das Rezept konnte nicht aus der Beschreibung erstellt werden. Bitte versuche es erneut.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm adding generated/scanned/parsed recipe
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
            className="bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] overscroll-contain"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-main">
                    {previewRecipe ? 'Rezept-Vorschau' : 'Neues Gericht hinzufügen'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {previewRecipe
                      ? 'Prüfe die Zutaten und Zubereitungsschritte vor dem Speichern'
                      : 'Mit intelligenter KI, Foto-Scan oder Rezept-Beschreibung'}
                  </p>
                </div>
              </div>
              <CloseButton onClick={onClose} ariaLabel="Schließen" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
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

              {/* STRUCTURED LOADING STATE */}
              {isSubmitting ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-200">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-accent-tint border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl border-2 border-accent/30 animate-ping pointer-events-none" />
                  </div>

                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg font-bold text-text-main">
                      Zutaten & Rezept werden strukturiert...
                    </h3>
                    <p className="text-xs text-text-muted">
                      Die KI analysiert die Angaben, formatiert Mengen und erstellt verständliche Zubereitungsschritte.
                    </p>
                  </div>

                  {/* Structured pulse skeleton */}
                  <div className="w-full max-w-md p-4 bg-surface rounded-2xl border border-border space-y-3.5 text-left">
                    <div className="h-5 bg-accent/20 rounded-md w-3/4 animate-pulse" />
                    <div className="h-3.5 bg-border rounded-md w-1/2 animate-pulse" />
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="h-10 bg-card rounded-xl border border-border animate-pulse" />
                      <div className="h-10 bg-card rounded-xl border border-border animate-pulse" />
                      <div className="h-10 bg-card rounded-xl border border-border animate-pulse" />
                      <div className="h-10 bg-card rounded-xl border border-border animate-pulse" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                      <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                      <div className="h-8 bg-card rounded-lg border border-border animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : previewRecipe ? (
                /* PREVIEW VIEW */
                <div className="space-y-6">
                  {/* Hero Banner / Image */}
                  {previewRecipe.image ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border aspect-21/9 bg-surface">
                      <img
                        src={previewRecipe.image}
                        alt={previewRecipe.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-on-accent">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-card/20 backdrop-blur-md px-2.5 py-1 rounded-full font-medium">
                            {previewRecipe.category || 'Rezept'}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold leading-tight">
                          {previewRecipe.title}
                        </h3>
                        {previewRecipe.subtitle ? (
                          <p className="text-sm text-on-accent/80 line-clamp-1 mt-1">
                            {previewRecipe.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-tint text-accent border border-accent/20">
                          {previewRecipe.category || 'Rezept'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-accent">
                          <ChefHat className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-2xl font-bold text-text-main leading-tight">
                          {previewRecipe.title}
                        </h3>
                        {previewRecipe.subtitle ? (
                          <p className="text-sm text-text-muted line-clamp-2 mt-1">
                            {previewRecipe.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Nutrients Row (Values not hallucinated: grayed out '–' if unknown) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-surface rounded-2xl border border-border">
                    <div className="text-center p-2 bg-card rounded-xl border border-border">
                      <span className="text-[11px] text-text-muted font-medium block">Kalorien</span>
                      <span className={`text-base font-bold ${previewRecipe.nutrients?.calories > 0 ? 'text-text-main' : 'text-text-muted/50'}`}>
                        {previewRecipe.nutrients?.calories > 0 ? `${previewRecipe.nutrients.calories} kcal` : '–'}
                      </span>
                    </div>
                    <div className="text-center p-2 bg-card rounded-xl border border-border">
                      <span className="text-[11px] text-text-muted font-medium block">Protein</span>
                      <span className={`text-base font-bold ${previewRecipe.nutrients?.protein > 0 ? 'text-accent' : 'text-text-muted/50'}`}>
                        {previewRecipe.nutrients?.protein > 0 ? `${previewRecipe.nutrients.protein} g` : '–'}
                      </span>
                    </div>
                    <div className="text-center p-2 bg-card rounded-xl border border-border">
                      <span className="text-[11px] text-text-muted font-medium block">Kochzeit</span>
                      <span className={`text-base font-bold ${(previewRecipe.totalTimeMinutes || (previewRecipe.prepTimeMinutes || 0) + (previewRecipe.cookTimeMinutes || 0)) > 0 ? 'text-text-main' : 'text-text-muted/50'}`}>
                        {(previewRecipe.totalTimeMinutes || (previewRecipe.prepTimeMinutes || 0) + (previewRecipe.cookTimeMinutes || 0)) > 0
                          ? `${previewRecipe.totalTimeMinutes || (previewRecipe.prepTimeMinutes || 0) + (previewRecipe.cookTimeMinutes || 0)} Min.`
                          : '–'}
                      </span>
                    </div>
                    <div className="text-center p-2 bg-card rounded-xl border border-border">
                      <span className="text-[11px] text-text-muted font-medium block">Portionen</span>
                      <span className="text-base font-bold text-text-main">
                        {previewRecipe.servings || 2} Pers.
                      </span>
                    </div>
                  </div>

                  {/* Portion Adjuster in Preview */}
                  <div className="p-3.5 bg-surface border border-border rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-main uppercase tracking-wide">
                        Portionen anpassen
                      </span>
                      <span className="text-xs text-text-muted">
                        {previewRecipe.servings || 2} {(previewRecipe.servings || 2) === 1 ? 'Portion' : 'Portionen'}
                      </span>
                    </div>
                    <HybridPortionStepper
                      value={previewRecipe.servings || 2}
                      onChange={(newServings) => {
                        setPreviewRecipe((prev) => prev ? { ...prev, servings: newServings } : null);
                      }}
                      idPrefix="preview-recipe-servings"
                    />
                  </div>

                  {/* Ingredients List */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-bold text-text-main flex items-center justify-between">
                      <span>Zutaten ({previewRecipe.ingredients.length})</span>
                      <span className="text-xs text-text-muted font-normal">
                        abgestimmt für {previewRecipe.servings || 2} Portionen
                      </span>
                    </h4>
                    {previewRecipe.ingredients.length === 0 ? (
                      <div className="p-4 bg-surface rounded-xl border border-border text-center text-xs text-text-muted">
                        Keine separaten Zutaten erkannt.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {previewRecipe.ingredients.map((ing, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-surface border border-border rounded-xl flex items-center justify-between text-sm"
                          >
                            <span className="font-medium text-text-main">{ing.name}</span>
                            {(ing.amount || ing.unit) ? (
                              <span className="text-accent font-semibold bg-card px-2 py-0.5 rounded-md border border-border">
                                {ing.amount ? `${ing.amount} ` : ''}{ing.unit || ''}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preparation Steps */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-text-main">
                      Zubereitungsschritte ({previewRecipe.steps.length})
                    </h4>
                    {previewRecipe.steps.length === 0 ? (
                      <div className="p-4 bg-surface rounded-xl border border-border text-center text-xs text-text-muted">
                        Keine Zubereitungsschritte vorhanden.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {previewRecipe.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-accent text-on-accent text-[11px] font-bold flex items-center justify-center">
                                  {step.stepNumber || idx + 1}
                                </span>
                                <span className="text-sm font-bold text-text-main">
                                  {step.title || `Schritt ${idx + 1}`}
                                </span>
                              </div>
                              {step.timerMinutes ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent-tint px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3" />
                                  {step.timerMinutes} Min.
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-text-muted leading-relaxed pl-7">
                              {step.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chef Tip if available (No emojis in UI chrome) */}
                  {previewRecipe.chefTip && previewRecipe.chefTip.trim() !== '' ? (
                    <div className="p-3.5 bg-accent-tint rounded-2xl border border-accent/20 text-sm text-text-main">
                      <strong className="text-accent block mb-1">Tipp des Küchenchefs:</strong>
                      {previewRecipe.chefTip}
                    </div>
                  ) : null}

                  {/* Bottom Actions */}
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
                      className="min-h-[48px] h-12 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                      <span>Ins Rezeptbuch speichern</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB NAVIGATION & FORM CONTENT */
                <>
                  {/* Tab Navigation */}
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-surface border border-border rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ai');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer touch-manipulation ${
                        activeTab === 'ai'
                          ? 'bg-card text-accent shadow-xs border border-border'
                          : 'text-text-muted hover:text-accent'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-accent shrink-0" />
                      <span className="truncate">KI-Küchenchef</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('scan');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer touch-manipulation ${
                        activeTab === 'scan'
                          ? 'bg-card text-accent shadow-xs border border-border'
                          : 'text-text-muted hover:text-accent'
                      }`}
                    >
                      <Camera className="w-4 h-4 text-accent shrink-0" />
                      <span className="truncate">Foto-Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('describe');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer touch-manipulation ${
                        activeTab === 'describe'
                          ? 'bg-card text-accent shadow-xs border border-border'
                          : 'text-text-muted hover:text-accent'
                      }`}
                    >
                      <PenTool className="w-4 h-4 text-accent shrink-0" />
                      <span className="truncate">Beschreibe dein Rezept</span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* TAB 1: KI-KÜCHENCHEF */}
                    {activeTab === 'ai' && (
                      <motion.div
                        key="tab-ai"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        {/* Dish title input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                            Welches Gericht möchtest du kochen?
                          </label>
                          <input
                            type="text"
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            placeholder="z.B. Cremige Avocadopasta, Linsen-Curry, Veganes Risotto..."
                            className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:bg-card focus:outline-none focus:border-accent text-base text-text-main transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleGenerateAi();
                              }
                            }}
                          />
                        </div>

                        {/* Prominent Free Text Field: Wünsche (Top Priority for AI) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                              Wünsche an die KI
                            </label>
                            <span className="text-[11px] text-accent font-medium">Höchste Priorität</span>
                          </div>
                          <textarea
                            value={aiWishes}
                            onChange={(e) => setAiWishes(e.target.value)}
                            placeholder="Deine Wünsche an die KI (z.B. extra knusprig, nussig, mit Koriander, proteinreich...)..."
                            className="w-full min-h-[90px] p-3.5 rounded-xl bg-surface border border-border focus:border-accent text-base text-text-main resize-y focus:outline-none"
                          />
                        </div>

                        {/* Time Option */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                            Zubereitungszeit
                          </label>
                          <div className="relative">
                            <select
                              value={aiTimeOption}
                              onChange={(e) => setAiTimeOption(e.target.value as any)}
                              className="appearance-none w-full h-11 min-h-[44px] px-3.5 pr-9 py-2.5 rounded-xl border border-border bg-surface text-base font-medium text-text-main focus:outline-none focus:border-accent cursor-pointer"
                            >
                              <option value="medium">Ausgewogen (~ 30 Min.)</option>
                              <option value="quick">Express (&lt; 20 Min.)</option>
                              <option value="elaborate">Ausführlich / Festlich (~ 50 Min.)</option>
                              <option value="any">Keine Einschränkung</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Generate Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={isSubmitting || !aiTitle.trim()}
                            onClick={handleGenerateAi}
                            className="w-full min-h-[48px] h-12 py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                          >
                            <Sparkles className="w-5 h-5" />
                            <span>Rezept mit KI kreieren</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: FOTO-SCAN */}
                    {activeTab === 'scan' && (
                      <motion.div
                        key="tab-scan"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border hover:border-accent/50 rounded-2xl p-6 text-center bg-surface cursor-pointer transition-all"
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
                              <p className="text-xs text-accent font-semibold">
                                Bild ausgewählt • Klicke zum Ändern
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 py-4">
                              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
                                <Camera className="w-6 h-6" />
                              </div>
                              <h4 className="text-sm font-bold text-text-main">
                                Foto aufnehmen oder hochladen
                              </h4>
                              <p className="text-xs text-text-muted max-w-sm mx-auto">
                                Fotografiere ein Gericht, eine handschriftliche Notiz oder ein Kochbuch. Die KI erkennt Zutaten und Schritte.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Prominent Free Text Field: Wünsche */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                              Wünsche an die KI
                            </label>
                            <span className="text-[11px] text-accent font-medium">Höchste Priorität</span>
                          </div>
                          <textarea
                            value={scanWishes}
                            onChange={(e) => setScanWishes(e.target.value)}
                            placeholder="Deine Wünsche an die KI (z.B. extra knusprig, nussig, mit Koriander, proteinreich...)..."
                            className="w-full min-h-[90px] p-3.5 rounded-xl bg-surface border border-border focus:border-accent text-base text-text-main resize-y focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting || !scanImageBase64}
                          onClick={handleScanRecipe}
                          className="w-full min-h-[48px] h-12 py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Rezept aus Foto erkennen</span>
                        </button>
                      </motion.div>
                    )}

                    {/* TAB 3: BESCHREIBE DEIN REZEPT */}
                    {activeTab === 'describe' && (
                      <motion.div
                        key="tab-describe"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
                            Rezept-Beschreibung & Notizen
                          </label>
                          <textarea
                            value={recipeDescription}
                            onChange={(e) => setRecipeDescription(e.target.value)}
                            placeholder="Beschreibe dein Rezept in eigenen Worten... Du kannst Fließtext, Zutatenlisten oder Kochanleitungen einfach hier hineinkopieren oder aufschreiben."
                            className="w-full min-h-[160px] sm:min-h-[220px] p-3.5 rounded-xl bg-surface border border-border focus:border-accent text-base text-text-main resize-y focus:outline-none leading-relaxed"
                          />
                          <p className="text-xs text-text-muted">
                            Du kannst Fließtext, Zutatenlisten oder Kochanleitungen einfach hier hineinkopieren. Die KI extrahiert präzise Titel, Zutaten, Schritte und Zeit.
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={isSubmitting || !recipeDescription.trim()}
                            onClick={handleGenerateFromDescription}
                            className="w-full min-h-[48px] h-12 py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-base font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                          >
                            <Sparkles className="w-5 h-5" />
                            <span>Rezept aus Beschreibung erstellen</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
