/**
 * Domain helpers for the "Rezept-Entdecker" (recipe discovery) start page.
 * Single source of truth for categories, filter options, sort options,
 * active-filter counting, seasons and greetings.
 */
import { FilterState, Recipe, RecipeDiet } from '../types';

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Recipe data historically uses several spellings for the same category
 * (e.g. "Schnelle Feierabendküche" vs. "Schnelle Küche"). Everything is mapped
 * to one canonical label so filters never silently return 0 results.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  'Schnelle Feierabendküche': 'Schnelle Küche',
  'Süßes & Frühstück': 'Frühstück & Süßes',
  'Gourmet & Festlich': 'Festlich',
};

export function canonicalCategory(category: string | undefined | null): string {
  if (!category) return '';
  return CATEGORY_ALIASES[category] ?? category;
}

export const HIGH_PROTEIN_CATEGORY = 'High Protein';
export const HIGH_PROTEIN_MIN_GRAMS = 25;

export function isHighProteinRecipe(recipe: Recipe): boolean {
  return (
    recipe.category === HIGH_PROTEIN_CATEGORY ||
    (Array.isArray(recipe.tags) && recipe.tags.some((t) => (t || '').toLowerCase().includes('high protein'))) ||
    (recipe.nutrients?.protein || 0) >= HIGH_PROTEIN_MIN_GRAMS
  );
}

export interface CategoryMeta {
  value: string;
  label: string;
  emoji?: string;
}

/** Display order for known canonical categories. Unknown ones are appended. */
const CATEGORY_META: CategoryMeta[] = [
  { value: 'Schnelle Küche', label: 'Schnell' },
  { value: 'Pasta & Gnocchi', label: 'Pasta' },
  { value: 'Currys & Eintöpfe', label: 'Currys & Eintöpfe' },
  { value: 'Bowls & Salate', label: 'Bowls & Salate' },
  { value: 'Ofengerichte', label: 'Ofengerichte' },
  { value: HIGH_PROTEIN_CATEGORY, label: 'High Protein' },
  { value: 'Frühstück & Süßes', label: 'Frühstück & Süßes' },
  { value: 'Snacks & Dips', label: 'Snacks & Dips' },
  { value: 'Festlich', label: 'Festlich' },
];

export interface CategoryOption extends CategoryMeta {
  count: number;
}

/**
 * Builds the category chip list from the actual recipe pool (only categories
 * that contain at least one recipe are shown, each with its count).
 */
export function buildCategoryOptions(recipes: Recipe[]): CategoryOption[] {
  const counts = new Map<string, number>();
  let highProteinCount = 0;

  for (const recipe of recipes) {
    const cat = canonicalCategory(recipe.category);
    if (cat && cat !== HIGH_PROTEIN_CATEGORY) {
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    if (isHighProteinRecipe(recipe)) highProteinCount++;
  }

  const options: CategoryOption[] = [];
  for (const meta of CATEGORY_META) {
    const count = meta.value === HIGH_PROTEIN_CATEGORY ? highProteinCount : counts.get(meta.value) || 0;
    if (count > 0) options.push({ ...meta, count });
    counts.delete(meta.value);
  }
  // Unknown / user-defined categories (e.g. from AI-generated recipes)
  for (const [value, count] of counts) {
    options.push({ value, label: value, count });
  }
  return options;
}

/* -------------------------------------------------------------------------- */
/* Filter options                                                              */
/* -------------------------------------------------------------------------- */

export interface Option<T> {
  id?: string;
  label: string;
  value: T;
}

export const TIME_OPTIONS: Option<number>[] = [
  { label: 'Egal', value: 0 },
  { label: 'bis 20 Min.', value: 20 },
  { label: 'bis 30 Min.', value: 30 },
  { label: 'bis 45 Min.', value: 45 },
];

export const DIFFICULTY_OPTIONS: Option<string>[] = [
  { label: 'Alle', value: 'all' },
  { label: 'Einfach', value: 'Einfach' },
  { label: 'Mittel', value: 'Mittel' },
  { label: 'Anspruchsvoll', value: 'Anspruchsvoll' },
];

export const DIET_OPTIONS: Option<'all' | 'vegan' | 'vegetarisch'>[] = [
  { label: 'Alle', value: 'all' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Vegetarisch', value: 'vegetarisch' },
];

export const CALORIE_OPTIONS: Option<number>[] = [
  { label: 'Egal', value: 0 },
  { label: 'unter 500 kcal', value: 500 },
  { label: 'unter 650 kcal', value: 650 },
  { label: 'unter 850 kcal', value: 850 },
];

export const PROTEIN_OPTIONS: Option<number>[] = [
  { label: 'Egal', value: 0 },
  { label: 'ab 20 g', value: 20 },
  { label: 'ab 30 g', value: 30 },
  { label: 'ab 40 g', value: 40 },
];

export interface SortOptionItem extends Option<FilterState['sortBy']> {
  id: FilterState['sortBy'];
  value: FilterState['sortBy'];
  label: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { id: 'featured', value: 'featured', label: 'Beliebt' },
  { id: 'timeAsc', value: 'timeAsc', label: 'Schnellste zuerst' },
  { id: 'proteinDesc', value: 'proteinDesc', label: 'Meiste Proteine' },
  { id: 'caloriesDesc', value: 'caloriesDesc', label: 'Meiste Kalorien' },
  { id: 'ratingDesc', value: 'ratingDesc', label: 'Beste Bewertung' },
  { id: 'recentlyAdded', value: 'recentlyAdded', label: 'Neu hinzugefügt' },
  { id: 'recentlyCooked', value: 'recentlyCooked', label: 'Zuletzt gekocht' },
];

export const PICKER_SORT_OPTIONS: SortOptionItem[] = [
  { id: 'featured', value: 'featured', label: 'Beliebt' },
  { id: 'recentlyAdded', value: 'recentlyAdded', label: 'Neu hinzugefügt' },
  { id: 'recentlyCooked', value: 'recentlyCooked', label: 'Zuletzt gekocht' },
  { id: 'timeAsc', value: 'timeAsc', label: 'Schnellste zuerst' },
  { id: 'proteinDesc', value: 'proteinDesc', label: 'Meiste Proteine' },
  { id: 'caloriesDesc', value: 'caloriesDesc', label: 'Meiste Kalorien' },
  { id: 'ratingDesc', value: 'ratingDesc', label: 'Beste Bewertung' },
];

/* -------------------------------------------------------------------------- */
/* Active filters                                                              */
/* -------------------------------------------------------------------------- */

export type SheetFilterKey = 'diet' | 'maxTime' | 'difficulty' | 'maxCalories' | 'minProtein' | 'minFiber' | 'selectedTags';

/**
 * Liefert die kanonische Ernährungsform eines Rezepts. Bevorzugt das neue
 * `diet`-Datenfeld; bei Rezepten ohne dieses Feld (z. B. KI-generiert oder
 * importiert) wird aus `isVegan` abgeleitet.
 */
export function getRecipeDiet(recipe: Pick<Recipe, 'diet' | 'isVegan'>): RecipeDiet {
  if (recipe.diet === 'vegan' || recipe.diet === 'vegetarisch') return recipe.diet;
  return recipe.isVegan ? 'vegan' : 'vegetarisch';
}

export interface ActiveFilterChip {
  key: SheetFilterKey;
  label: string;
}

/**
 * Filters that live inside the filter sheet (NOT search, category or sort).
 * Used for the filter-button badge and the removable chip row.
 */
export function getActiveSheetFilters(filters: FilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.diet && filters.diet !== 'all') chips.push({ key: 'diet', label: filters.diet === 'vegan' ? 'Vegan' : 'Vegetarisch' });
  if (filters.maxTime > 0) chips.push({ key: 'maxTime', label: `bis ${filters.maxTime} Min.` });
  if (filters.difficulty && filters.difficulty !== 'all') chips.push({ key: 'difficulty', label: filters.difficulty });
  if (filters.maxCalories > 0) chips.push({ key: 'maxCalories', label: `unter ${filters.maxCalories} kcal` });
  if (filters.minProtein > 0) chips.push({ key: 'minProtein', label: `ab ${filters.minProtein} g Protein` });
  if (filters.minFiber > 0) chips.push({ key: 'minFiber', label: `ab ${filters.minFiber} g Ballaststoffe` });
  if (filters.selectedTags.length > 0) chips.push({ key: 'selectedTags', label: filters.selectedTags.join(', ') });
  return chips;
}

export const SHEET_FILTER_DEFAULTS: Pick<FilterState, SheetFilterKey> = {
  diet: 'all',
  maxTime: 0,
  difficulty: 'all',
  maxCalories: 0,
  minProtein: 0,
  minFiber: 0,
  selectedTags: [],
};

/** True if anything narrows the result list (search, category or sheet filters). */
export function hasAnyNarrowingFilter(filters: FilterState): boolean {
  return (
    filters.searchQuery.trim() !== '' ||
    (filters.category !== '' && filters.category !== 'all') ||
    getActiveSheetFilters(filters).length > 0
  );
}

/* -------------------------------------------------------------------------- */
/* Seasons                                                                     */
/* -------------------------------------------------------------------------- */

export type SeasonName = 'Frühling' | 'Sommer' | 'Herbst' | 'Winter';

export interface SeasonInfo {
  name: SeasonName;
  emoji: string;
  headline: string;
  description: string;
  keywords: string[];
}

const SEASONS: Record<SeasonName, SeasonInfo> = {
  Frühling: {
    name: 'Frühling',
    emoji: '🌱',
    headline: 'Frisch in den Frühling',
    description: 'Spargel, Bärlauch, Erbsen & junge Kräuter – leicht und knackig.',
    keywords: ['spargel', 'bärlauch', 'erbse', 'radieschen', 'rhabarber', 'spinat', 'kräuter', 'frühlingszwiebel'],
  },
  Sommer: {
    name: 'Sommer',
    emoji: '☀️',
    headline: 'Sommerküche',
    description: 'Tomaten, Zucchini, Beeren & Grillgemüse – sonnengereift und unkompliziert.',
    keywords: ['tomate', 'zucchini', 'aubergine', 'paprika', 'beere', 'gurke', 'mais', 'wassermelone', 'basilikum'],
  },
  Herbst: {
    name: 'Herbst',
    emoji: '🍂',
    headline: 'Jetzt im Herbst',
    description: 'Kürbis, Waldpilze & Äpfel – wärmende Wohlfühlgerichte zur Erntezeit.',
    keywords: ['kürbis', 'pilz', 'steinpilz', 'champignon', 'shiitake', 'apfel', 'marone', 'walnuss', 'rote bete', 'wirsing'],
  },
  Winter: {
    name: 'Winter',
    emoji: '❄️',
    headline: 'Wintergenuss',
    description: 'Kohl, Wurzelgemüse & Linsen – deftig, wärmend und nährstoffreich.',
    keywords: ['grünkohl', 'rosenkohl', 'rotkohl', 'wirsing', 'pastinake', 'sellerie', 'linse', 'steckrübe', 'rote bete', 'orange'],
  },
};

export function getSeasonInfo(date: Date = new Date()): SeasonInfo {
  const month = date.getMonth(); // 0 = Jan
  if (month >= 2 && month <= 4) return SEASONS['Frühling'];
  if (month >= 5 && month <= 7) return SEASONS['Sommer'];
  if (month >= 8 && month <= 10) return SEASONS['Herbst'];
  return SEASONS['Winter'];
}

export function getSeasonalRecipes(recipes: Recipe[], season: SeasonInfo, limit = 12): Recipe[] {
  const matches = recipes.filter((r) => {
    if (r.season === season.name) return true;
    const corpus = [
      r.title,
      r.subtitle || '',
      ...(r.tags || []),
      ...(r.ingredients || []).map((i) => i.name),
    ]
      .join(' ')
      .toLowerCase();
    return season.keywords.some((k) => corpus.includes(k));
  });
  // Explicitly tagged seasonal recipes first, then best rated
  return matches
    .sort((a, b) => {
      const aTagged = a.season === season.name ? 1 : 0;
      const bTagged = b.season === season.name ? 1 : 0;
      if (aTagged !== bTagged) return bTagged - aTagged;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Greeting                                                                    */
/* -------------------------------------------------------------------------- */

export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  return 'Guten Abend';
}

export function formatTodayLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Fisher–Yates shuffle (non-mutating). */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const RECIPES_PAGE_SIZE = 12;
