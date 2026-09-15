import { Recipe, RecipeIngredient, CookedLog, ShoppingItem, DayPlan, FilterState, IngredientCategory } from '../types';

// Format ingredient text with scaled portion amount
export function formatIngredientAmount(ingredient: RecipeIngredient, originalServings: number, currentServings: number): string {
  if (typeof ingredient.amount === 'number') {
    const scaled = (ingredient.amount / originalServings) * currentServings;
    // Format nicely: e.g. 1.5 instead of 1.5000000000000002
    const formatted = Number.isInteger(scaled) ? scaled.toString() : (Math.round(scaled * 10) / 10).toString();
    return `${formatted} ${ingredient.unit}`.trim();
  }
  return `${ingredient.amount} ${ingredient.unit}`.trim();
}

// Generate ready-to-share plain text shopping list for a recipe
export function generateRecipeIngredientsText(recipe: Recipe, servings: number): string {
  let text = `🌱 Zutaten für "${recipe.title}" (${servings} ${servings === 1 ? 'Portion' : 'Portionen'}):\n\n`;
  recipe.ingredients.forEach((ing) => {
    const amountStr = formatIngredientAmount(ing, recipe.servings, servings);
    text += `• ${amountStr} ${ing.name}\n`;
  });
  text += `\n⏱️ Zubereitungszeit: ${recipe.totalTimeMinutes} Min.`;
  text += ` | 🔥 ${Math.round((recipe.nutrients.calories / recipe.servings) * servings)} kcal`;
  text += ` | 💪 ${Math.round((recipe.nutrients.protein / recipe.servings) * servings)}g Protein\n`;
  text += `✨ Aus VeggieChef App`;
  return text;
}

// Generate text for entire shopping list
export function generateShoppingListText(items: ShoppingItem[]): string {
  if (items.length === 0) return 'Deine Einkaufsliste ist leer.';
  let text = `🛒 VeggieChef Einkaufsliste (${items.filter(i => !i.completed).length} offene Artikel):\n\n`;
  
  const grouped: Record<string, ShoppingItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || 'sonstiges';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const catLabels: Record<string, string> = {
    gemuese: '🥦 Frisches Gemüse & Kräuter',
    kuehlregal: '🥛 Kühlregal & Pflanzliche Alternativen',
    huelsenfruechte: '🫘 Hülsenfrüchte & Tofu',
    trockenwaren: '🌾 Vorratskammer, Pasta & Reis',
    gewuerze: '🧂 Gewürze, Öle & Dips',
    sonstiges: '📦 Sonstiges',
  };

  Object.keys(grouped).forEach((catKey) => {
    const catItems = grouped[catKey];
    text += `${catLabels[catKey] || '📦 Sonstiges'}:\n`;
    catItems.forEach((item) => {
      const checkbox = item.completed ? '[x]' : '[ ]';
      const amount = item.amount ? `${item.amount} ${item.unit} ` : '';
      text += `  ${checkbox} ${amount}${item.name}\n`;
    });
    text += '\n';
  });

  return text.trim();
}

// Environmental impact multipliers (averages for veg/vegan vs omnivore meat-heavy meal)
// Average meat meal = ~2.5 kg CO2e, plant-based meal = ~0.6 kg CO2e -> saves ~1.9 kg CO2 per portion
// Average meat meal = ~1800 L water, plant-based meal = ~300 L water -> saves ~1500 L water per portion
export function calculateMealSavings(servings: number, isVegan: boolean) {
  const co2PerServing = isVegan ? 2.1 : 1.7; // kg CO2
  const waterPerServing = isVegan ? 1400 : 1100; // Liters water
  return {
    savedCO2Kg: Math.round(servings * co2PerServing * 10) / 10,
    savedWaterLiters: Math.round(servings * waterPerServing),
  };
}

// Automatische Erkennung des Supermarkt-Regals anhand des Zutatennamens
export function detectIngredientCategory(name: string): IngredientCategory {
  if (!name || typeof name !== 'string') return 'sonstiges';
  const clean = name.toLowerCase().trim();

  // 1. Hülsenfrüchte & Tofu / Fleischalternativen
  const huelsenfruechteKeywords = [
    'kichererbse', 'kichererbsen', 'linse', 'linsen', 'beluga', 'chana',
    'bohne', 'bohnen', 'kidney', 'kidneybohne', 'kidneybohnen', 'edamame',
    'tofu', 'räuchertofu', 'seidentofu', 'tempeh', 'sojaschnetzel', 'sojagranulat',
    'soja-schnetzel', 'lupine', 'lupinen', 'erbse', 'erbsen', 'kichererbsenmehl'
  ];
  if (huelsenfruechteKeywords.some((kw) => clean.includes(kw))) {
    return 'huelsenfruechte';
  }

  // 2. Frisches Gemüse, Obst & Kräuter
  const gemueseKeywords = [
    'spinat', 'blattspinat', 'tomate', 'tomaten', 'kirschtomate', 'kirschtomaten',
    'gurke', 'salat', 'feldsalat', 'rucola', 'kopfsalat', 'paprika',
    'zwiebel', 'zwiebeln', 'schalotte', 'schalotten', 'knoblauch', 'knoblauchzehe',
    'karotte', 'karotten', 'möhre', 'möhren', 'zucchini', 'aubergine',
    'brokkoli', 'broccoli', 'blumenkohl', 'kartoffel', 'kartoffeln', 'süßkartoffel', 'süßkartoffeln',
    'pilz', 'pilze', 'champignon', 'champignons', 'shiitake', 'kräuterseitling', 'pfifferling',
    'lauch', 'porree', 'frühlingszwiebel', 'frühlingszwiebeln', 'sellerie', 'knollensellerie', 'staudensellerie',
    'kohl', 'weißkohl', 'rotkohl', 'rosenkohl', 'wirsing', 'grünkohl', 'chinakohl', 'pak choi',
    'kürbis', 'hokkaido', 'butternut', 'avocado', 'ingwer', 'chili', 'chilischote',
    'zitrone', 'zitronen', 'limette', 'limetten', 'apfel', 'äpfel', 'birne', 'birnen',
    'banane', 'bananen', 'beere', 'beeren', 'blaubeere', 'himbeere', 'erdbeere',
    'basilikum', 'petersilie', 'koriander', 'schnittlauch', 'rosmarin', 'thymian',
    'dill', 'minze', 'salbei', 'oregano frisch', 'majoran', 'kerbel'
  ];
  if (gemueseKeywords.some((kw) => clean.includes(kw))) {
    return 'gemuese';
  }

  // 3. Kühlregal & Pflanzliche Alternativen / Milchprodukte
  const kuehlregalKeywords = [
    'milch', 'hafermilch', 'sojamilch', 'mandelmilch', 'erbsenmilch',
    'joghurt', 'sojajoghurt', 'haferjoghurt', 'quark', 'skyr',
    'käse', 'feta', 'parmesan', 'mozzarella', 'gouda', 'cheddar', 'geriebener',
    'frischkäse', 'veganer käse', 'hefe-schmelz',
    'butter', 'margarine', 'albfett', 'kokosöl gekühlt',
    'sahne', 'hafercreme', 'sojasahne', 'kokoscreme gekühlt', 'creme fraiche', 'crème fraîche',
    'schmand', 'saure sahne', 'hummus', 'veganer aufstrich', 'aufstrich',
    'seitan', 'vegane wurst', 'vegane bratwurst', 'veganes hack'
  ];
  if (kuehlregalKeywords.some((kw) => clean.includes(kw))) {
    return 'kuehlregal';
  }

  // 4. Vorratskammer, Pasta, Reis, Getreide, Nüsse & Backzutaten
  const trockenwarenKeywords = [
    'pasta', 'nudel', 'nudeln', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'lasagne',
    'reis', 'basmati', 'jasmin', 'vollkornreis', 'risotto',
    'quinoa', 'bulgur', 'couscous', 'polenta', 'hirse', 'haferflocken', 'flocken',
    'mehl', 'weizenmehl', 'dinkelmehl', 'mandelmehl', 'speisestärke', 'stärke',
    'hefe', 'trockenhefe', 'hefeflocken', 'nährhefe', 'backpulver', 'natron', 'zucker', 'puderzucker',
    'erdnussmus', 'mandelmus', 'cashewmus', 'tahin', 'sesammus',
    'kokosmilch', 'erdnuss', 'erdnüsse', 'walnuss', 'walnüsse', 'mandel', 'mandeln',
    'cashew', 'cashews', 'haselnuss', 'haselnüsse', 'pinienkerne',
    'sesam', 'chiasamen', 'chia', 'leinsamen', 'sonnenblumenkerne', 'kürbiskerne',
    'tomatenmark', 'gehackte tomaten', 'passierte tomaten', 'dosentomaten', 'passata',
    'tortilla', 'wraps', 'brot', 'toast', 'brötchen', 'knäckebrot'
  ];
  if (trockenwarenKeywords.some((kw) => clean.includes(kw))) {
    return 'trockenwaren';
  }

  // 5. Gewürze, Öle, Essig & Dips
  const gewuerzeKeywords = [
    'salz', 'meersalz', 'pfeffer', 'schwarzpfeffer', 'paprikapulver', 'edelsüß', 'rosenscharf',
    'kreuzkümmel', 'kumin', 'curry', 'currypulver', 'currypaste', 'kurkuma',
    'zimt', 'muskat', 'muskatnuss', 'kardamom', 'nelken', 'oregano',
    'chiliflocken', 'cayennepfeffer', 'garam masala', 'senfkörner',
    'öl', 'olivenöl', 'rapsöl', 'sesamöl', 'sonnenblumenöl', 'kokosöl', 'leinöl',
    'essig', 'apfelessig', 'balsamico', 'weißweinessig', 'rotweinessig', 'reisessig',
    'sojasauce', 'sojasoße', 'tamari', 'shoyu', 'senf', 'dijonsenf', 'ketchup', 'mayo', 'mayonnaise',
    'ahornsirup', 'agavendicksaft', 'dattelsirup', 'honig', 'sirup',
    'brühe', 'gemüsebrühe', 'bouillon', 'fond'
  ];
  if (gewuerzeKeywords.some((kw) => clean.includes(kw))) {
    return 'gewuerze';
  }

  // Fallback: nicht erkannt -> sonstiges
  return 'sonstiges';
}

// LocalStorage helpers
const STORAGE_KEYS = {
  FAVORITES: 'veggie_favorites_v1',
  COOKED_LOGS: 'veggie_cooked_logs_v1',
  SHOPPING_LIST: 'veggie_shopping_list_v1',
  MEAL_PLAN: 'veggie_meal_plan_v1',
  CUSTOM_RECIPES: 'veggie_custom_recipes_v1',
  ONLY_VEGAN: 'veggie_only_vegan_v1',
};

export function loadStoredFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : ['rec-1', 'rec-3'];
  } catch {
    return ['rec-1', 'rec-3'];
  }
}

export function saveStoredFavorites(favs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  } catch {}
}

export function loadStoredCookedLogs(): CookedLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COOKED_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Initial starter history so stats look appealing immediately
  const now = new Date();
  const past1 = new Date(now.getTime() - 86400000 * 1).toISOString();
  const past2 = new Date(now.getTime() - 86400000 * 3).toISOString();
  const past3 = new Date(now.getTime() - 86400000 * 5).toISOString();

  return [
    {
      id: 'log-1',
      recipeId: 'rec-1',
      recipeTitle: 'Cremiges Kichererbsen-Kokos-Curry mit Spinat',
      date: past1,
      notes: 'Super lecker! Habe noch etwas extra Ingwer reingemacht.',
      servingsCooked: 4,
      isVegan: true,
      savedCO2Kg: 8.4,
      savedWaterLiters: 5600,
    },
    {
      id: 'log-2',
      recipeId: 'rec-3',
      recipeTitle: 'Vegane Peanut-Tofu Bowl mit Edamame & Quinoa',
      date: past2,
      notes: 'Die Erdnusssauce war ein Traum!',
      servingsCooked: 2,
      isVegan: true,
      savedCO2Kg: 4.2,
      savedWaterLiters: 2800,
    },
    {
      id: 'log-3',
      recipeId: 'rec-2',
      recipeTitle: 'Mediterrane Ofen-Gnocchi mit Feta & Kirschtomaten',
      date: past3,
      notes: 'So schnell und kein Abwasch.',
      servingsCooked: 3,
      isVegan: false,
      savedCO2Kg: 5.1,
      savedWaterLiters: 3300,
    },
  ];
}

export function saveStoredCookedLogs(logs: CookedLog[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.COOKED_LOGS, JSON.stringify(logs));
  } catch {}
}

export function loadStoredShoppingList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [
    { id: 'shop-1', name: 'Kichererbsen', amount: 480, unit: 'g', category: 'huelsenfruechte', completed: false, recipeSource: 'Cremiges Kichererbsen-Kokos-Curry' },
    { id: 'shop-2', name: 'Kokosmilch (cremig)', amount: 400, unit: 'ml', category: 'trockenwaren', completed: false, recipeSource: 'Cremiges Kichererbsen-Kokos-Curry' },
    { id: 'shop-3', name: 'Blattspinat (frisch)', amount: 200, unit: 'g', category: 'gemuese', completed: true, recipeSource: 'Cremiges Kichererbsen-Kokos-Curry' },
    { id: 'shop-4', name: 'Räuchertofu', amount: 350, unit: 'g', category: 'kuehlregal', completed: false, recipeSource: 'Peanut-Tofu Bowl' },
    { id: 'shop-5', name: 'Erdnussmus', amount: 1, unit: 'Glas', category: 'trockenwaren', completed: false },
  ];
}

export function saveStoredShoppingList(items: ShoppingItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  } catch {}
}

export function loadStoredCustomRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_RECIPES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomRecipes(recipes: Recipe[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(recipes));
  } catch {}
}

export function getInitialMealPlan(): DayPlan[] {
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return dayNames.map((name, index) => {
    let lunch = null;
    let dinner = null;

    if (index === 0) {
      dinner = {
        recipeId: 'rec-1',
        recipeTitle: 'Cremiges Kichererbsen-Kokos-Curry mit Spinat',
        isVegan: true,
        prepTime: 25,
        calories: 460,
        protein: 21,
        servings: 2,
      };
    } else if (index === 1) {
      dinner = {
        recipeId: 'rec-2',
        recipeTitle: 'Mediterrane Ofen-Gnocchi mit Feta & Kirschtomaten',
        isVegan: false,
        prepTime: 25,
        calories: 520,
        protein: 19,
        servings: 2,
      };
    } else if (index === 2) {
      lunch = {
        recipeId: 'rec-10',
        recipeTitle: 'Vegane Overnight Chia-Oats',
        isVegan: true,
        prepTime: 5,
        calories: 390,
        protein: 17,
        servings: 1,
      };
      dinner = {
        recipeId: 'rec-3',
        recipeTitle: 'Vegane Peanut-Tofu Bowl mit Edamame',
        isVegan: true,
        prepTime: 30,
        calories: 580,
        protein: 34,
        servings: 2,
      };
    }

    return {
      dayId: dayIds[index],
      dayName: name,
      dateStr: `Tag ${index + 1}`,
      lunch,
      dinner,
    };
  });
}

export function createEmptyWeekDays(startDate?: Date): DayPlan[] {
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return dayNames.map((name, index) => {
    let dateStr = `Tag ${index + 1}`;
    if (startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + index);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      dateStr = `${day}.${month}.`;
    }
    return {
      dayId: dayIds[index],
      dayName: name,
      dateStr,
      lunch: null,
      dinner: null,
    };
  });
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error loading ${key} from localStorage`, e);
    return defaultValue;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error saving ${key} to localStorage`, e);
  }
}

function normalizeGermanSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/["'„“«»]/g, ' ')
    .replace(/[-_]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterAndSortRecipes(
  recipes: Recipe[],
  filters: FilterState,
  onlyVeganGlobal: boolean,
  cookedLogs?: CookedLog[]
): Recipe[] {
  if (!Array.isArray(recipes)) return [];

  return recipes
    .filter((recipe) => {
      if (!recipe || typeof recipe !== 'object') return false;

      // Global Vegan switch or filter
      if ((onlyVeganGlobal || filters.onlyVegan) && !recipe.isVegan) {
        return false;
      }

      // Search Query filter (fuzzy, normalized, German-aware, word-by-word)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const rawQuery = filters.searchQuery.toLowerCase().trim();
        const normQuery = normalizeGermanSearch(rawQuery);
        const searchWords = normQuery.split(/\s+/).filter(Boolean);

        // Build a searchable corpus for this recipe
        const titleNorm = normalizeGermanSearch(recipe.title || '');
        const subtitleNorm = normalizeGermanSearch(recipe.subtitle || '');
        const chefTipNorm = normalizeGermanSearch(recipe.chefTip || '');
        const categoryNorm = normalizeGermanSearch(recipe.category || '');
        const tagsNorm = Array.isArray(recipe.tags)
          ? recipe.tags.map((t) => normalizeGermanSearch(t || '')).join(' ')
          : '';
        const ingredientsNorm = Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing) => normalizeGermanSearch(ing?.name || '')).join(' ')
          : '';

        const fullCorpus = `${titleNorm} ${subtitleNorm} ${categoryNorm} ${tagsNorm} ${ingredientsNorm} ${chefTipNorm}`;

        // Every search word entered by the user must match somewhere in the recipe corpus
        const allWordsMatch = searchWords.every((word) => fullCorpus.includes(word));
        if (!allWordsMatch) {
          return false;
        }
      }

      // Category filter (support 'all' and 'High Protein' flexibly)
      if (filters.category && filters.category !== 'all') {
        if (filters.category === 'High Protein') {
          const isHighProt =
            recipe.category === 'High Protein' ||
            (Array.isArray(recipe.tags) && recipe.tags.some((t) => (t || '').toLowerCase().includes('high protein'))) ||
            ((recipe.nutrients?.protein || 0) >= 25);
          if (!isHighProt) return false;
        } else if (recipe.category !== filters.category) {
          return false;
        }
      }

      // Time filter
      if (filters.maxTime > 0 && (recipe.totalTimeMinutes || 0) > filters.maxTime) {
        return false;
      }

      // Nutrients safe access
      const nutrients = recipe.nutrients || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

      // Protein filter
      if (filters.minProtein > 0 && (nutrients.protein || 0) < filters.minProtein) {
        return false;
      }

      // Calories filter
      if (filters.maxCalories > 0 && (nutrients.calories || 0) > filters.maxCalories) {
        return false;
      }

      // Fiber filter
      if (filters.minFiber > 0 && (nutrients.fiber || 0) < filters.minFiber) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty && filters.difficulty !== 'all' && recipe.difficulty !== filters.difficulty) {
        return false;
      }

      // Tags filter
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        const hasAllTags = filters.selectedTags.every((t) =>
          Array.isArray(recipe.tags) && recipe.tags.some((rt) => (rt || '').toLowerCase().includes(t.toLowerCase()))
        );
        if (!hasAllTags) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aNutrients = a.nutrients || { calories: 0, protein: 0, fiber: 0 };
      const bNutrients = b.nutrients || { calories: 0, protein: 0, fiber: 0 };

      switch (filters.sortBy) {
        case 'recentlyCooked': {
          if (!cookedLogs || cookedLogs.length === 0) {
            return (b.rating || 0) - (a.rating || 0);
          }
          const getLatestCookedTime = (recId: string) => {
            let maxTime = 0;
            for (const log of cookedLogs) {
              if (log.recipeId === recId) {
                const t = new Date(log.date).getTime();
                if (t > maxTime) maxTime = t;
              }
            }
            return maxTime;
          };
          const aTime = getLatestCookedTime(a.id);
          const bTime = getLatestCookedTime(b.id);
          if (bTime !== aTime) return bTime - aTime;
          return (b.rating || 0) - (a.rating || 0);
        }
        case 'recentlyAdded': {
          const getAddedTimestamp = (r: Recipe) => {
            if (r.createdAt) {
              return typeof r.createdAt === 'number' ? r.createdAt : new Date(r.createdAt).getTime();
            }
            const numMatch = r.id.match(/\d{10,}/);
            if (numMatch) return parseInt(numMatch[0], 10);
            const idNum = parseInt(r.id.replace(/\D/g, ''), 10);
            return isNaN(idNum) ? 0 : idNum;
          };
          const aTime = getAddedTimestamp(a);
          const bTime = getAddedTimestamp(b);
          if (bTime !== aTime) return bTime - aTime;
          return (b.rating || 0) - (a.rating || 0);
        }
        case 'timeAsc':
          return (a.totalTimeMinutes || 0) - (b.totalTimeMinutes || 0);
        case 'proteinDesc':
          return (bNutrients.protein || 0) - (aNutrients.protein || 0);
        case 'caloriesAsc':
          return (aNutrients.calories || 0) - (bNutrients.calories || 0);
        case 'fiberDesc':
          return (bNutrients.fiber || 0) - (aNutrients.fiber || 0);
        case 'ratingDesc':
          return (b.rating || 0) - (a.rating || 0);
        case 'featured':
        default:
          return (b.rating || 0) * (b.reviewCount || 1) - (a.rating || 0) * (a.reviewCount || 1);
      }
    });
}
