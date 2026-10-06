import { Recipe, RecipeIngredient, CookedLog, ShoppingItem, DayPlan, FilterState, IngredientCategory } from '../types';
import { canonicalCategory, isHighProteinRecipe, HIGH_PROTEIN_CATEGORY } from './discover';

// Helper function to format numbers into clean kitchen fractions or ranges
export function formatFractionOrSmartQuantity(value: number, unit: string): string {
  if (value <= 0) return '0';

  const normalizedUnit = (unit || '').toLowerCase().trim();
  const isPieceUnit = [
    'stk', 'stück', 'stk.', 'zehe', 'zehen', 'knoblauchzehe', 'knoblauchzehen',
    'dose', 'dosen', 'bund', 'packung', 'packungen', 'pck', 'pck.', 'scheibe', 'scheiben',
    'tl', 'teelöffel', 'el', 'esslöffel', 'prise', 'prisen', 'zweig', 'zweige', 'blatt', 'blätter'
  ].includes(normalizedUnit) || normalizedUnit === '';

  // For piece units
  if (isPieceUnit) {
    // If very close to an integer (e.g. 1.02 or 0.98)
    if (Math.abs(value - Math.round(value)) < 0.08) {
      return Math.round(value).toString();
    }

    const intPart = Math.floor(value);
    const frac = value - intPart;

    // Small fraction below 1
    if (intPart === 0) {
      if (frac < 0.18) return '1 Prise';
      if (frac < 0.3) return '¼';
      if (frac < 0.42) return '⅓';
      if (frac < 0.65) return '½';
      if (frac < 0.85) return '¾';
      return '1';
    }

    // Numbers with fraction:
    if (frac < 0.12) {
      return `${intPart}`;
    } else if (frac < 0.28) {
      return `${intPart} ¼`;
    } else if (frac < 0.4) {
      return `${intPart} ⅓`;
    } else if (frac < 0.65) {
      return `${intPart} ½`;
    } else if (frac < 0.85) {
      return `${intPart} ¾`;
    } else {
      return `${intPart + 1}`;
    }
  }

  // For weight & volume (g, ml, kg, l):
  if (normalizedUnit === 'g' || normalizedUnit === 'ml') {
    if (value >= 100) {
      // Round to nearest 5 or 10
      return (Math.round(value / 5) * 5).toString();
    } else if (value >= 10) {
      return Math.round(value).toString();
    } else {
      return (Math.round(value * 10) / 10).toString();
    }
  }

  if (normalizedUnit === 'kg' || normalizedUnit === 'l' || normalizedUnit === 'liter') {
    if (value < 1) {
      // e.g. 0.5 l -> ½ l or 0.5 l
      const frac = value;
      if (Math.abs(frac - 0.5) < 0.05) return '½';
      if (Math.abs(frac - 0.25) < 0.05) return '¼';
      if (Math.abs(frac - 0.75) < 0.05) return '¾';
      return (Math.round(value * 10) / 10).toString();
    }
    return (Math.round(value * 10) / 10).toString();
  }

  // Default fallback for numbers
  if (Number.isInteger(value)) return value.toString();
  const rounded = Math.round(value * 10) / 10;
  return rounded.toString();
}

// Format ingredient text with scaled portion amount and smart kitchen fractions
export function formatIngredientAmount(ingredient: RecipeIngredient, originalServings: number, currentServings: number): string {
  if (typeof ingredient.amount === 'number') {
    const scaled = (ingredient.amount / originalServings) * currentServings;
    const formatted = formatFractionOrSmartQuantity(scaled, ingredient.unit);
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
      const formatted = formatDisplayGrocery(item.amount, item.unit, item.name);
      let amountStr = '';
      if (formatted.formattedAmount) {
        amountStr = `${formatted.formattedAmount} ${formatted.formattedUnit}`.trim();
        if (formatted.hintBadge) {
          amountStr += ` (${formatted.hintBadge})`;
        }
        amountStr += ' ';
      }
      text += `  ${checkbox} ${amountStr}${item.name}\n`;
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

export interface ParsedGroceryInput {
  name: string;
  amount: string | number;
  unit: string;
}

const COMMON_UNITS_MAP: Record<string, string> = {
  g: 'g',
  gramm: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilogramm: 'kg',
  mg: 'mg',
  ml: 'ml',
  milliliter: 'ml',
  l: 'l',
  liter: 'l',
  cl: 'cl',
  dl: 'dl',
  el: 'EL',
  esslöffel: 'EL',
  tl: 'TL',
  teelöffel: 'TL',
  msp: 'Msp.',
  messerspitze: 'Msp.',
  prise: 'Prise',
  prisen: 'Prisen',
  bund: 'Bund',
  bunde: 'Bund',
  bündel: 'Bund',
  dose: 'Dose',
  dosen: 'Dosen',
  glas: 'Glas',
  gläser: 'Gläser',
  flasche: 'Flasche',
  flaschen: 'Flaschen',
  fl: 'Flasche',
  packung: 'Packung',
  packungen: 'Packungen',
  pck: 'Pck.',
  'pck.': 'Pck.',
  pkg: 'Pkg.',
  tüte: 'Tüte',
  tüten: 'Tüten',
  beutel: 'Beutel',
  zehe: 'Zehe',
  zehen: 'Zehen',
  knoblauchzehe: 'Zehe',
  knoblauchzehen: 'Zehen',
  kopf: 'Kopf',
  köpfe: 'Köpfe',
  stück: 'Stk.',
  stk: 'Stk.',
  'stk.': 'Stk.',
  scheibe: 'Scheibe',
  scheiben: 'Scheiben',
  becher: 'Becher',
  zweig: 'Zweig',
  zweige: 'Zweige',
  stange: 'Stange',
  stangen: 'Stangen',
  portion: 'Portion',
  portionen: 'Portionen',
};

// Diskrete, zählbare Verpackungs- und Stückeinheiten, die beim Einkaufen nicht fraktioniert werden
export const DISCRETE_COUNTABLE_UNITS: Set<string> = new Set([
  'stk.', 'stk', 'stück', 'stueck',
  'dose', 'dosen',
  'glas', 'gläser', 'glaeser',
  'packung', 'packungen', 'pck.', 'pck', 'pkg.', 'pkg',
  'bund', 'bünde', 'buende',
  'kopf', 'köpfe', 'koepfe',
  'knolle', 'knollen',
  'zehe', 'zehen', 'knoblauchzehe', 'knoblauchzehen',
  'stange', 'stangen',
  'tüte', 'tüten', 'tuete', 'tueten', 'beutel',
  'flasche', 'flaschen', 'fl',
  'scheibe', 'scheiben',
]);

// Typische zählbare Stück-Gemüse/Obst-Sorten, die im Supermarkt typischerweise als Ganzes gekauft werden
export const COUNTABLE_PRODUCE_REGEX = /\b(zwiebel|paprika|gurke|avocado|zitrone|limette|apfel|birne|banane|orange|mango|aubergine|zucchini|knoblauch|granatapfel|blumenkohl|brokkoli|salatkopf|kohlrabi|fenchel|grapefruit|kiwi|kartoffel|s[üu]ßkartoffel)\b/i;

/**
 * Standard-Konservengröße für Kichererbsen, Bohnen und Linsen (Abtropfgewicht ~240-265g je Standarddose/Glas).
 */
export const LEGUME_CAN_DRAINED_WEIGHT_G = 240;

/**
 * Prüft, ob es sich um typische Hülsenfrüchte in Dosen/Gläsern handelt (Kichererbsen, Kidneybohnen, weiße Bohnen, Linsen etc.)
 */
export function isCannedLegumeProduce(name?: string): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase();
  // Kichererbsenmehl oder Trockenerbsen ausschließen
  if (clean.includes('mehl') || clean.includes('trocken') || clean.includes('falafel')) return false;
  return /\b(kichererbse|kichererbsen|kidneybohne|kidneybohnen|schwarze bohne|schwarze bohnen|weiße bohne|weisse bohne|weiße bohnen|weisse bohnen|cannellini|edamame|linsen|tellerlinsen|berglinsen|belugalinsen)\b/i.test(clean);
}

/**
 * Wandelt krumme oder unpraktische Mengenangaben in alltagstaugliche Einheiten um:
 * 1. Krumme Löffel-Einheiten (EL/TL):
 *    - Ab 4 EL Ingwer/Knoblauch -> Umrechnung in g (1 EL ~ 15g) oder Knollen/Stk (1 Knolle ~ 45-50g / 3 EL gerieben)
 *    - Generell bei EL/TL: Rundung auf ganze Zahlen (z. B. 12.8 EL -> 13 EL bzw. bei Ingwer 190 g / 4 Knollen)
 * 2. Einheiten-Skalierung:
 *    - Gramm ab 1.000 g -> automatische Umrechnung in kg (z. B. 5760 g -> 5,8 kg)
 *    - Kichererbsen / Bohnen: Bei größeren Grammmengen (ab ca. 480 g) zusätzlich oder direkt in handliche Dosen/Gläser (z. B. 5760 g -> 5,8 kg bzw. ~24 Dosen)
 *    - Milliliter ab 1.000 ml -> automatische Umrechnung in Liter (z. B. 1500 ml -> 1,5 l)
 * 3. Diskrete Stückeinheiten: Ganze Zahlen (Math.ceil)
 */
export function normalizeAndScaleGroceryQuantity(
  amount: number,
  unit?: string,
  name?: string
): { amount: number | string; unit: string } {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { amount, unit: unit || '' };
  }

  const cleanUnit = (unit || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();

  // A. Spezialfall: Ingwer mit Löffel-Einheiten (z. B. "12.8 EL geriebener Ingwer")
  const isGinger = cleanName.includes('ingwer');
  if (isGinger && (cleanUnit === 'el' || cleanUnit === 'tl')) {
    // 1 EL geriebener Ingwer entspricht ca. 15 Gramm frischem Ingwer
    // 1 TL geriebener Ingwer entspricht ca. 5 Gramm
    const grams = cleanUnit === 'el' ? amount * 15 : amount * 5;
    if (amount >= 4) {
      // Ab 4 EL ist ein Löffelmaß unpraktisch. In Gramm oder Knollen angeben:
      if (grams >= 1000) {
        const kg = Math.round((grams / 1000) * 10) / 10;
        return { amount: kg, unit: 'kg' };
      }
      // Bis 1000g: auf glatte 5g oder 10g runden
      const roundedGrams = Math.round(grams / 5) * 5;
      return { amount: roundedGrams, unit: 'g' };
    }
    // Bei kleineren Mengen (< 4 EL): Auf halbe oder ganze EL runden
    const roundedSpoons = Math.round(amount * 2) / 2;
    return { amount: roundedSpoons, unit: cleanUnit === 'el' ? 'EL' : 'TL' };
  }

  // B. Generelle EL / TL: Krumme Kommazahlen (wie 12.8 EL) auf ganze Zahlen runden
  if (cleanUnit === 'el' || cleanUnit === 'tl') {
    if (amount >= 3) {
      // Größere Löffelmengen immer auf ganze Zahlen runden (z. B. 12.8 EL -> 13 EL)
      return { amount: Math.round(amount), unit: cleanUnit === 'el' ? 'EL' : 'TL' };
    }
    // Kleinere Löffelmengen auf halbe Einheiten runden (z. B. 1.3 EL -> 1.5 EL)
    const roundedHalf = Math.round(amount * 2) / 2;
    return { amount: roundedHalf, unit: cleanUnit === 'el' ? 'EL' : 'TL' };
  }

  // C. Diskrete Stück- & Packungs-Einheiten (Stk, Dosen, Gläser, Köpfe, Bünde)
  const isDiscreteUnit = DISCRETE_COUNTABLE_UNITS.has(cleanUnit);
  const isCountableProduce =
    (!cleanUnit || cleanUnit === 'stk.' || cleanUnit === 'stk' || cleanUnit === 'stück') &&
    COUNTABLE_PRODUCE_REGEX.test(cleanName);

  if (isDiscreteUnit || isCountableProduce) {
    const whole = Math.ceil(amount);
    let outUnit = unit || '';
    if (cleanUnit === 'dose' || cleanUnit === 'dosen') {
      outUnit = whole === 1 ? 'Dose' : 'Dosen';
    } else if (cleanUnit === 'glas' || cleanUnit === 'gläser' || cleanUnit === 'glaeser') {
      outUnit = whole === 1 ? 'Glas' : 'Gläser';
    } else if (cleanUnit === 'kopf' || cleanUnit === 'köpfe') {
      outUnit = whole === 1 ? 'Kopf' : 'Köpfe';
    } else if (cleanUnit === 'stange' || cleanUnit === 'stangen') {
      outUnit = whole === 1 ? 'Stange' : 'Stangen';
    } else if (cleanUnit === 'knolle' || cleanUnit === 'knollen') {
      outUnit = whole === 1 ? 'Knolle' : 'Knollen';
    } else if (cleanUnit === 'bund' || cleanUnit === 'bünde') {
      outUnit = whole === 1 ? 'Bund' : 'Bünde';
    } else if (cleanUnit === 'packung' || cleanUnit === 'packungen') {
      outUnit = whole === 1 ? 'Packung' : 'Packungen';
    } else if (cleanUnit === 'flasche' || cleanUnit === 'flaschen') {
      outUnit = whole === 1 ? 'Flasche' : 'Flaschen';
    }
    return { amount: whole, unit: outUnit };
  }

  // D. Gewichtsskalierung: Gramm (g) ab 1.000 g automatisch in Kilogramm (kg)
  if (cleanUnit === 'g' || cleanUnit === 'gramm') {
    if (amount >= 1000) {
      // z. B. 5760 g -> 5,8 kg
      const kg = Math.round((amount / 1000) * 10) / 10;
      return { amount: kg, unit: 'kg' };
    }
    // Unter 1.000 g: Ganze Gramm ohne Kommastellen (z. B. 480.3 g -> 480 g)
    return { amount: Math.round(amount), unit: 'g' };
  }

  // E. Kilogramm (kg)
  if (cleanUnit === 'kg' || cleanUnit === 'kilo' || cleanUnit === 'kilogramm') {
    const roundedKg = Math.round(amount * 10) / 10;
    return { amount: roundedKg, unit: 'kg' };
  }

  // F. Volumenskalierung: Milliliter (ml) ab 1.000 ml in Liter (l)
  if (cleanUnit === 'ml' || cleanUnit === 'milliliter') {
    if (amount >= 1000) {
      const liters = Math.round((amount / 1000) * 10) / 10;
      return { amount: liters, unit: 'l' };
    }
    // Unter 1.000 ml auf glatte 5er oder ganze ml runden
    return { amount: Math.round(amount), unit: 'ml' };
  }

  // G. Liter (l)
  if (cleanUnit === 'l' || cleanUnit === 'liter') {
    const roundedL = Math.round(amount * 10) / 10;
    return { amount: roundedL, unit: 'l' };
  }

  // Standard-Rundung für sonstige Einheiten (maximal 1 Dezimalstelle)
  const fallback = Math.round(amount * 10) / 10;
  return { amount: fallback, unit: unit || '' };
}

/**
 * Intelligentes Aufrunden von Mengenangaben beim Einkaufen:
 * - Zählbare Stückgüter & Gemüse/Obst (z. B. 1.5 Zwiebeln -> 2 Stk, 0.5 Bund -> 1 Bund, 1.2 Dosen -> 2 Dosen)
 * - Kontinuierliche Maße (EL, TL, g, kg, ml, l etc.) werden praxisnah gerundet.
 */
export function smartRoundGroceryAmount(
  amount: number,
  unit?: string,
  name?: string
): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return amount;
  }

  const scaled = normalizeAndScaleGroceryQuantity(amount, unit, name);
  if (typeof scaled.amount === 'number') {
    return scaled.amount;
  }
  const parsed = parseFloat(String(scaled.amount).replace(',', '.'));
  return isNaN(parsed) ? amount : parsed;
}

/**
 * Formatiert die Anzeige einer Zutat für Einkaufsliste und Export:
 * - Skaliert Gramm ab 1.000 g automatisch in kg (z.B. 5760 g -> 5,8 kg)
 * - Runder krumme Löffel-Angaben (12.8 EL Ingwer -> 190 g bzw. gerundet)
 * - Zeigt bei Kichererbsen/Bohnen ab ~480g die passende Anzahl an Standard-Dosen/Gläsern an (z. B. "5,8 kg (~24 Dosen)" oder "4 Dosen")
 */
export function formatDisplayGrocery(
  amount: number | string | undefined | null,
  unit: string | undefined | null,
  name?: string
): { formattedAmount: string; formattedUnit: string; hintBadge?: string } {
  if (amount === undefined || amount === null || amount === '') {
    return { formattedAmount: '', formattedUnit: unit || '' };
  }

  // Helper zum Parsen von Zahlen
  const str = String(amount).trim().replace(',', '.');
  let numVal: number | null = null;
  if (str.includes('/')) {
    const parts = str.split('/');
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    if (!isNaN(n) && !isNaN(d) && d !== 0) numVal = n / d;
  } else {
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) numVal = parsed;
  }

  if (numVal === null || isNaN(numVal)) {
    return { formattedAmount: String(amount), formattedUnit: unit || '' };
  }

  const scaled = normalizeAndScaleGroceryQuantity(numVal, unit || '', name);
  const outUnit = scaled.unit;
  let outAmountStr = typeof scaled.amount === 'number'
    ? scaled.amount.toLocaleString('de-DE', { maximumFractionDigits: 1 })
    : String(scaled.amount).replace('.', ',');

  // Zusatz-Hinweis (Dosen/Gläser) bei Kichererbsen & Hülsenfrüchten
  let hintBadge: string | undefined = undefined;
  if (isCannedLegumeProduce(name)) {
    // Falls in Gramm oder kg angegeben: berechne Dosen (ca. 240g Abtropfgewicht je Dose)
    let totalGrams: number | null = null;
    const cleanUnit = (outUnit || '').toLowerCase();
    if (cleanUnit === 'kg') {
      const kgVal = typeof scaled.amount === 'number' ? scaled.amount : parseFloat(String(scaled.amount));
      totalGrams = kgVal * 1000;
    } else if (cleanUnit === 'g') {
      totalGrams = typeof scaled.amount === 'number' ? scaled.amount : parseFloat(String(scaled.amount));
    }

    if (totalGrams !== null && totalGrams >= 400) {
      const canCount = Math.round(totalGrams / LEGUME_CAN_DRAINED_WEIGHT_G);
      if (canCount >= 2) {
        hintBadge = `ca. ${canCount} Dosen`;
      }
    }
  }

  return {
    formattedAmount: outAmountStr,
    formattedUnit: outUnit,
    hintBadge,
  };
}

// Intelligenter Natural Language Parser für Einkaufslisten-Eingaben
// Unterstützt sowohl vorangestellte Mengen ("400g Tofu", "1.5 Zwiebeln") als auch
// nachgestellte Mengen ("Tofu 400g", "Tofu 400 g", "Zwiebeln 2", "Zwiebeln 2 Stk", "Hafermilch 1l", "Olivenöl 1.8 EL")
export function parseNaturalLanguageGroceryItem(rawInput: string): ParsedGroceryInput {
  const trimmed = rawInput.trim();
  if (!trimmed) return { name: '', amount: '', unit: '' };

  // 1. Ziffern am ANFANG erfassen (z. B. 400, 1.5, 1,5, 1/2, 3/4)
  const leadingRegex = /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-ZäöüÄÖÜß.]+)?(?:\s+(.*))?$/;
  const match = trimmed.match(leadingRegex);

  if (match) {
    const rawNum = match[1].replace(',', '.');
    const attachedOrFirstWord = (match[2] || '').trim();
    const rest = (match[3] || '').trim();

    let numVal: number | null = null;
    if (rawNum.includes('/')) {
      const parts = rawNum.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) numVal = num / den;
    } else {
      const parsed = parseFloat(rawNum);
      if (!isNaN(parsed)) numVal = parsed;
    }

    if (attachedOrFirstWord) {
      const lowerWord = attachedOrFirstWord.toLowerCase();

      // Multiplikator wie "2x Hafermilch"
      if (lowerWord === 'x') {
        const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, '', rest) : rawNum;
        return {
          amount: finalAmount,
          unit: '',
          name: rest || '',
        };
      }

      // Bekannte Einheit direkt am Wort (z. B. "400g Tofu" oder "1 Bund Petersilie")
      const matchedUnit = COMMON_UNITS_MAP[lowerWord];
      if (matchedUnit) {
        const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, matchedUnit, rest) : rawNum;
        return {
          amount: finalAmount,
          unit: matchedUnit,
          name: rest || '',
        };
      }

      // Falls Wort keine bekannte Einheit ist, aber Rest leer ist (z. B. "2 Hafermilch")
      if (!rest) {
        const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, '', attachedOrFirstWord) : rawNum;
        return {
          amount: finalAmount,
          unit: '',
          name: attachedOrFirstWord,
        };
      }

      // Kein bekanntes Einheitswort, aber Text folgt (z. B. "2 Bio Hafermilch")
      const combinedName = `${attachedOrFirstWord} ${rest}`.trim();
      const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, '', combinedName) : rawNum;
      return {
        amount: finalAmount,
        unit: '',
        name: combinedName,
      };
    }

    // Wenn hinter der Zahl ein Leerzeichen war (z. B. "1 Bund Petersilie" oder "2 Hafermilch")
    if (rest) {
      const parts = rest.split(/\s+/);
      const firstToken = parts[0];
      const tokenLower = firstToken.toLowerCase();

      const matchedUnit = COMMON_UNITS_MAP[tokenLower];
      if (matchedUnit) {
        const ingName = parts.slice(1).join(' ').trim();
        const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, matchedUnit, ingName) : rawNum;
        return {
          amount: finalAmount,
          unit: matchedUnit,
          name: ingName,
        };
      }

      // Kein Einheits-Token: Das ganze 'rest' ist der Name (z. B. "2 Hafermilch", "1.5 Zwiebeln")
      const finalAmount = numVal !== null ? smartRoundGroceryAmount(numVal, '', rest) : rawNum;
      return {
        amount: finalAmount,
        unit: '',
        name: rest,
      };
    }

    // Nur Zahl eingegeben
    return {
      amount: rawNum,
      unit: '',
      name: '',
    };
  }

  // 2. Falls kein führender Zahlenwert, prüfen ob Menge & Einheit am ENDE stehen
  // z. B. "Tofu 400g", "Tofu 400 g", "Zwiebeln 2", "Zwiebeln 2 Stk", "Hafermilch 1l", "Olivenöl 1.8 EL", "Bananen 3x", "Tomaten, 2 Stück"
  const trailingRegex = /^(.*?)(?:,\s*|\s+)(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-ZäöüÄÖÜß.]+)?$/;
  const trailingMatch = trimmed.match(trailingRegex);

  if (trailingMatch) {
    const rawName = trailingMatch[1].trim();
    const rawNum = trailingMatch[2].replace(',', '.');
    const rawUnitToken = (trailingMatch[3] || '').trim();

    if (rawName) {
      let numVal: number | null = null;
      if (rawNum.includes('/')) {
        const parts = rawNum.split('/');
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) numVal = num / den;
      } else {
        const parsed = parseFloat(rawNum);
        if (!isNaN(parsed)) numVal = parsed;
      }

      let parsedUnit = '';
      if (rawUnitToken) {
        const lowerToken = rawUnitToken.toLowerCase();
        if (lowerToken !== 'x') {
          parsedUnit = COMMON_UNITS_MAP[lowerToken] || rawUnitToken;
        }
      }

      const finalAmount = numVal !== null
        ? smartRoundGroceryAmount(numVal, parsedUnit, rawName)
        : rawNum;

      return {
        amount: finalAmount,
        unit: parsedUnit,
        name: rawName,
      };
    }
  }

  // Kein Zahlenwert gefunden -> Reine Textbezeichnung
  return {
    amount: '',
    unit: '',
    name: trimmed,
  };
}

/**
 * Bereinigt einen Zutatennamen für die Einkaufsliste:
 * Entfernt Schnittformen, Zubereitungshinweise und Vorbereitungszustände
 * wie z. B. "(in Ringen)", ", fein gehackt", "(gewürfelt)", "(geschält)", "(in Streifen)".
 */
export function cleanIngredientNameForShopping(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  let name = rawName.trim();

  // 1. Zubereitungshinweise in Klammern entfernen:
  // z.B. (in Ringen), (in feinen Ringen), (in Scheiben), (in Spalten), (gewürfelt), (fein gehackt), (abgetropft), (entkernt), (in Röllchen) etc.
  const prepInParentheses = /\s*\((?:[^)]*(?:ring|würfel|wuerfel|hack|schnitt|schneid|schäl|schael|reib|rasp|tropf|koch|brat|back|gar|streif|scheib|spalt|stif|viertel|halb|zerdrück|zerdrueck|zupf|röllchen|roellchen|saft|abrieb|geputzt|vorgekocht|aufgetaut|mariniert|gewaschen|warm|kalt|heiß|heiss|zimmerwarm|optional|nach\s+belieben|nach\s+geschmack|entsteint|geviertelt|halbiert|gepresst|entkernt|zerkleinert|grob|fein|dünn|duenn)[^)]*)\)/gi;
  name = name.replace(prepInParentheses, '');

  // 2. Generelle Klammern mit reinen Zubereitungszuständen oder Herkunftsnotizen
  name = name.replace(/\s*\((?:fein|grob|frisch|geputzt|halbiert|geviertelt|gegart|gebraten|vorgegart|blanchiert|gepresst|abgespült|abgespuelt|gewaschen)\)/gi, '');

  // 3. Zubereitungshinweise nach Komma entfernen:
  // z.B. "Zwiebel, in Ringen", "Tofu, gewürfelt", "Knoblauch, fein gehackt"
  const prepAfterComma = /,\s*(?:in\s+[^,]+|fein\s+[^,]+|grob\s+[^,]+|dünn\s+[^,]+|duenn\s+[^,]+|gewürfelt|wuerfelt|gehackt|geschnitten|geschält|geschaelt|gerieben|geraspelt|abgetropft|entkernt|entsteint|zerdrückt|zerdrueckt|in\s+Ringen|in\s+Scheiben|in\s+Streifen|in\s+Würfeln?|in\s+Röllchen|in\s+Spalten|in\s+Stiften|geputzt|halbiert|geviertelt|gepresst|nach\s+Belieben|nach\s+Geschmack)\s*$/i;
  name = name.replace(prepAfterComma, '');

  // 4. Zubereitungszustand am Zeilenende ohne Komma oder Klammern (z. B. "große Zwiebel in Ringen", "Tofu gewürfelt", "Knoblauch fein gehackt")
  const prepAtEnd = /\s+(?:in\s+(?:feinen?\s+)?(?:Ringen?|Scheiben?|Streifen?|Würfeln?|Wuerfeln?|Spalten?|Röllchen?|Stiften?)|fein\s+(?:gehackt|geschnitten|gerieben|geraspelt|gewürfelt)|grob\s+(?:gehackt|geschnitten|geraspelt)|gewürfelt|wuerfelt|fein\s+gehackt|gehackt|geschält|geschaelt|gerieben|geraspelt|abgetropft|entkernt|entsteint|zerdrückt|zerdrueckt)$/i;
  name = name.replace(prepAtEnd, '');

  // 5. Mehrfache Leerzeichen und verwaiste Satzzeichen bereinigen
  name = name.replace(/\s{2,}/g, ' ').trim();
  name = name.replace(/[,;:-]$/, '').trim();

  return name || rawName.trim();
}

/**
 * Normalisiert einen Zutatennamen für den intelligenten Abgleich (z. B. Plural/Singular, Artikel, Adjektive)
 */
export function normalizeIngredientName(raw: string): string {
  if (!raw) return '';
  let s = raw.trim().toLowerCase();

  // Entferne typische Füllwörter und Adjektive am Anfang
  s = s.replace(/^(ein|eine|einen|einer|einem|etwas|frische[srn]?|bio|reife[srn]?|große[srn]?|kleine[srn]?|getrocknete[srn]?)\s+/i, '');

  // Sonderfälle Deutsch Singular / Plural
  const map: Record<string, string> = {
    tomaten: 'tomate',
    gurken: 'gurke',
    zwiebeln: 'zwiebel',
    karotten: 'karotte',
    möhren: 'möhre',
    kartoffeln: 'kartoffel',
    paprikas: 'paprika',
    avocados: 'avocado',
    bananen: 'banane',
    zitronen: 'zitrone',
    limetten: 'limette',
    äpfel: 'apfel',
    birnen: 'birne',
    champignons: 'champignon',
    pilze: 'pilz',
    knoblauchzehen: 'knoblauchzehe',
    zehen: 'zehe',
    dosen: 'dose',
    gläser: 'glas',
    packungen: 'packung',
    becher: 'becher',
    kichererbsen: 'kichererbsen',
  };

  const words = s.split(/\s+/);
  const normalizedWords = words.map((w) => {
    if (map[w]) return map[w];
    if (w.endsWith('en') && w.length > 4) {
      const candidate = w.slice(0, -2);
      if (candidate.endsWith('e')) return candidate;
      return w.slice(0, -1);
    }
    if (w.endsWith('n') && w.length > 4 && /[aeiouäöü]n$/i.test(w)) {
      return w.slice(0, -1);
    }
    return w;
  });

  return normalizedWords.join(' ').trim();
}

/**
 * Prüft, ob zwei Zutatenbezeichnungen dasselbe Lebensmittel meinen
 */
export function areIngredientsEquivalent(nameA: string, nameB: string): boolean {
  const cleanA = nameA.trim().toLowerCase();
  const cleanB = nameB.trim().toLowerCase();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const normA = normalizeIngredientName(cleanA);
  const normB = normalizeIngredientName(cleanB);
  if (normA === normB) return true;

  if (normA.length >= 4 && normB.length >= 4) {
    if (normA.includes(normB) || normB.includes(normA)) {
      return true;
    }
  }

  return false;
}

/**
 * Erhöht die Menge eines bestehenden Einkaufsartikels intelligent oder fügt einen neuen hinzu.
 * Verhindert redundante doppelte Einträge und summiert Mengen auch bei Einheiten und impliziten Zählungen.
 */
export function mergeOrAddShoppingItem(
  existingItems: ShoppingItem[],
  newItem: ShoppingItem
): ShoppingItem[] {
  const cleanedNewName = cleanIngredientNameForShopping(newItem.name);
  const sanitizedItem: ShoppingItem = {
    ...newItem,
    name: cleanedNewName || newItem.name.trim(),
  };
  const newName = sanitizedItem.name;
  if (!newName) return existingItems;

  // Suche vorrangig nach einem noch nicht abgehakten Artikel mit gleichem oder äquivalentem Namen
  const existingIdx = existingItems.findIndex(
    (it) => !it.completed && areIngredientsEquivalent(it.name, newName)
  );

  if (existingIdx === -1) {
    return [...existingItems, sanitizedItem];
  }

  const existing = existingItems[existingIdx];

  // Helper zum Parsen von Zahlen inklusive Kommas und Brüchen (1/2 etc.)
  const parseNum = (val: string | number | undefined): number | null => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const str = String(val).trim().replace(',', '.');
    if (str.includes('/')) {
      const parts = str.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
  };

  const numA = parseNum(existing.amount);
  const numB = parseNum(newItem.amount);

  const unitA = (existing.unit || '').trim().toLowerCase();
  const unitB = (newItem.unit || '').trim().toLowerCase();

  let combinedAmount: string | number = '';
  let combinedUnit = existing.unit || newItem.unit || '';

  // Fall 1: Beide haben explizite Zahlenwerte
  if (numA !== null && numB !== null) {
    if (unitA === unitB || !unitA || !unitB) {
      const targetUnit = existing.unit || newItem.unit || '';
      const scaled = normalizeAndScaleGroceryQuantity(numA + numB, targetUnit, existing.name);
      combinedAmount = scaled.amount;
      combinedUnit = scaled.unit;
    } else if ((unitA === 'kg' && unitB === 'g') || (unitA === 'g' && unitB === 'kg')) {
      const totalG = unitA === 'kg' ? numA * 1000 + numB : numA + numB * 1000;
      const scaled = normalizeAndScaleGroceryQuantity(totalG, 'g', existing.name);
      combinedAmount = scaled.amount;
      combinedUnit = scaled.unit;
    } else if ((unitA === 'l' && unitB === 'ml') || (unitA === 'ml' && unitB === 'l')) {
      const totalMl = unitA === 'l' ? numA * 1000 + numB : numA + numB * 1000;
      const scaled = normalizeAndScaleGroceryQuantity(totalMl, 'ml', existing.name);
      combinedAmount = scaled.amount;
      combinedUnit = scaled.unit;
    } else {
      // Inkompatible Einheiten (z.B. "1 Dose + 200g")
      combinedAmount = `${existing.amount} ${existing.unit || ''} + ${newItem.amount} ${newItem.unit || ''}`.trim();
      combinedUnit = '';
    }
  } 
  // Fall 2: Nur B hat eine Zahl (A hatte keine Menge -> implizit 1)
  else if (numA === null && numB !== null) {
    const targetUnit = newItem.unit || existing.unit || '';
    const targetAmount = unitB ? numB : 1 + numB;
    const scaled = normalizeAndScaleGroceryQuantity(targetAmount, targetUnit, existing.name);
    combinedAmount = scaled.amount;
    combinedUnit = scaled.unit;
  } 
  // Fall 3: Nur A hat eine Zahl (B wurde ohne Zahl hinzugefügt -> implizit +1)
  else if (numA !== null && numB === null) {
    const targetUnit = existing.unit || '';
    const scaled = normalizeAndScaleGroceryQuantity(numA + 1, targetUnit, existing.name);
    combinedAmount = scaled.amount;
    combinedUnit = scaled.unit;
  } 
  // Fall 4: Weder A noch B haben eine Zahl (z. B. "Tofu" hinzugefügt wenn "Tofu" schon existiert -> 1 + 1 = 2)
  else {
    combinedAmount = 2;
    combinedUnit = existing.unit || newItem.unit || '';
  }

  // Deduplicate and combine recipe sources
  const rawSources = [existing.recipeSource, newItem.recipeSource]
    .filter(Boolean)
    .flatMap((s) => (s as string).split(/,\s*/).map((t) => t.trim()))
    .filter(Boolean);
  const combinedRecipeSource = Array.from(new Set(rawSources)).join(', ');

  const updatedItem: ShoppingItem = {
    ...existing,
    amount: combinedAmount,
    unit: combinedUnit,
    category: existing.category || newItem.category,
    recipeSource: combinedRecipeSource || existing.recipeSource,
  };

  const nextList = [...existingItems];
  nextList[existingIdx] = updatedItem;
  return nextList;
}

/**
 * Deduplicates and formats recipe source titles cleanly for display.
 * Displays max 2 titles, e.g.:
 * - 1 title: "aus Gnocchi Pfanne"
 * - 2 titles: "aus Gnocchi Pfanne, Tikka Masala"
 * - 3+ titles: "aus Gnocchi Pfanne, Tikka Masala + [X] weitere"
 */
export function formatRecipeSource(source?: string): string | null {
  if (!source || !source.trim()) return null;
  const titles = Array.from(
    new Set(
      source
        .split(/,\s*/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
  if (titles.length === 0) return null;
  if (titles.length === 1) {
    return `aus ${titles[0]}`;
  }
  if (titles.length === 2) {
    return `aus ${titles[0]}, ${titles[1]}`;
  }
  return `aus ${titles[0]}, ${titles[1]} + ${titles.length - 2} weitere`;
}

export function mergeOrAddShoppingItems(
  existingItems: ShoppingItem[],
  newItems: ShoppingItem[]
): ShoppingItem[] {
  let result = [...existingItems];
  for (const item of newItems) {
    result = mergeOrAddShoppingItem(result, item);
  }
  return result;
}

// Safe Storage abstraction preventing SecurityError ("The operation is insecure") in iframes/private browsing
class SafeStorage {
  private memory = new Map<string, string>();

  getItem(key: string): string | null {
    if (this.memory.has(key)) {
      return this.memory.get(key) ?? null;
    }
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          this.memory.set(key, val);
          return val;
        }
      }
    } catch {
      // Storage access blocked or insecure in sandboxed iframe / third-party context
    }
    return null;
  }

  setItem(key: string, value: string): void {
    // Keep in memory map so current session state is always accurate
    this.memory.set(key, value);
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (err) {
      console.warn(`[SafeStorage] Failed to save "${key}" to localStorage, attempting cleanup:`, err);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('veggiechef_mealplan_old');
          window.localStorage.removeItem('veggiechef_weeks');
          window.localStorage.setItem(key, value);
        }
      } catch {
        // Kept safely in this.memory
      }
    }
  }

  removeItem(key: string): void {
    this.memory.delete(key);
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access blocked
    }
  }
}

export const safeStorage = new SafeStorage();

// Client-side canvas image compression to keep photo size small (~35-60KB) and safely within localStorage quotas
export function compressImageToDataUrl(file: File, maxDimension = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve('');
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
          resolve((reader.result as string) || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = (reader.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}

// Safe Clipboard Copy abstraction preventing DOMException "The operation is insecure" in iframes
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern navigator.clipboard API with safety guards
  try {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'clipboard' in navigator &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[VeggieChef] navigator.clipboard.writeText not permitted, using fallback:', err);
  }

  // Method 2: Document execCommand('copy') fallback (safe in sandboxed iframes)
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) return true;
    }
  } catch (fallbackErr) {
    console.warn('[VeggieChef] Fallback copy also failed:', fallbackErr);
  }

  return false;
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
    const raw = safeStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : ['rec-1', 'rec-3'];
  } catch {
    return ['rec-1', 'rec-3'];
  }
}

export function saveStoredFavorites(favs: string[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  } catch {}
}

export function loadStoredCookedLogs(): CookedLog[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.COOKED_LOGS);
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
    safeStorage.setItem(STORAGE_KEYS.COOKED_LOGS, JSON.stringify(logs));
  } catch {}
}

export function loadStoredShoppingList(): ShoppingItem[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
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
    safeStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  } catch {}
}

export function loadStoredCustomRecipes(): Recipe[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CUSTOM_RECIPES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomRecipes(recipes: Recipe[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(recipes));
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
    const item = safeStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error loading ${key} from storage`, e);
    return defaultValue;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error saving ${key} to storage`, e);
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

      // Category filter (support 'all' and 'High Protein' flexibly; aliases are canonicalized)
      if (filters.category && filters.category !== 'all') {
        if (filters.category === HIGH_PROTEIN_CATEGORY) {
          if (!isHighProteinRecipe(recipe)) return false;
        } else if (canonicalCategory(recipe.category) !== canonicalCategory(filters.category)) {
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
