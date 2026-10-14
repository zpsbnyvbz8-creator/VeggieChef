import { RecipeReview } from '../types';

const REVIEWS_STORAGE_KEY = 'veggiechef_recipe_reviews';
const USER_AUTHOR_NAME_KEY = 'veggiechef_user_author_name';
const HELPFUL_STORAGE_KEY = 'veggiechef_helpful_reviews';

const SEED_REVIEW_TEXTS = [
  'Schmeckt fantastisch! Super schnell zubereitet und voll im Geschmack. Kommt definitiv in unsere Wochenroutine.',
  'Tolles Rezept, hat der ganzen Familie geschmeckt. Werde ich definitiv öfter kochen!',
  'Habe noch etwas frische Kräuter und einen Hauch Chili hinzugefügt – absolute Empfehlung!',
  'Perfekt für den Feierabend, wenig Aufwand und trotzdem richtig sättigend und lecker.',
  'Gelingt auch Kochanfängern problemlos. Wunderbare Konsistenz und tolle Aromen.',
  'Sehr ausgewogen und frisch. Auch die Kids waren total begeistert!',
  'Ein echter Klassiker bei uns geworden. Simpel, gesund und schnell auf dem Tisch.',
];

const SEED_AUTHORS = [
  'Laura M.',
  'Julian K.',
  'Sophie B.',
  'Maximilian W.',
  'Hannah S.',
  'Felix T.',
  'Elena R.',
  'Moritz D.',
];

/**
 * Deterministically generates seed reviews for a given recipe
 */
export function getSeedReviews(recipeId: string): RecipeReview[] {
  let hash = 0;
  for (let i = 0; i < recipeId.length; i++) {
    hash = (hash * 31 + recipeId.charCodeAt(i)) & 0xffffffff;
  }
  const absHash = Math.abs(hash);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const count = 3 + (absHash % 3); // 3 to 5 reviews
  const reviews: RecipeReview[] = [];

  for (let i = 0; i < count; i++) {
    const authorIdx = (absHash + i * 3) % SEED_AUTHORS.length;
    const textIdx = (absHash + i * 2) % SEED_REVIEW_TEXTS.length;
    const daysAgo = 2 + (i * 4) + (absHash % 5);
    const rating = (absHash + i) % 5 === 0 ? 4 : 5; // mostly 5 stars, occasionally 4

    reviews.push({
      id: `seed_${recipeId}_${i}`,
      recipeId,
      authorName: SEED_AUTHORS[authorIdx],
      rating,
      text: SEED_REVIEW_TEXTS[textIdx],
      createdAt: now - daysAgo * dayMs,
      helpfulCount: (absHash + i * 7) % 12,
      isOwn: false,
    });
  }

  // Sort descending by createdAt
  return reviews.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all reviews for a recipe (seed + user created)
 */
export function getReviewsForRecipe(recipeId: string): RecipeReview[] {
  if (typeof window === 'undefined') {
    return getSeedReviews(recipeId);
  }

  let userReviews: RecipeReview[] = [];
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (stored) {
      const all: RecipeReview[] = JSON.parse(stored);
      userReviews = all.filter((r) => r.recipeId === recipeId);
    }
  } catch (e) {
    console.error('Failed to read reviews from localStorage', e);
  }

  // Check which reviews have been marked helpful by this user
  const helpfulSet = getHelpfulReviewsSet();

  const seeds = getSeedReviews(recipeId);

  // If a seed review has updated helpful count in localStorage, apply it
  let storedSeedOverrides: Record<string, { helpfulCount?: number; isDeleted?: boolean }> = {};
  try {
    const rawOverrides = localStorage.getItem(`${REVIEWS_STORAGE_KEY}_seed_overrides`);
    if (rawOverrides) {
      storedSeedOverrides = JSON.parse(rawOverrides);
    }
  } catch {}

  const activeSeeds = seeds
    .filter((s) => !storedSeedOverrides[s.id]?.isDeleted)
    .map((s) => ({
      ...s,
      helpfulCount: storedSeedOverrides[s.id]?.helpfulCount ?? s.helpfulCount,
    }));

  // Combine user reviews and seeds, user reviews on top
  const combined = [...userReviews.map((r) => ({ ...r, isOwn: true })), ...activeSeeds];

  return combined;
}

export function getUserAuthorName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_AUTHOR_NAME_KEY) || '';
}

export function setUserAuthorName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_AUTHOR_NAME_KEY, name.trim());
}

export function getHelpfulReviewsSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(HELPFUL_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {}
  return new Set();
}

export function toggleReviewHelpful(reviewId: string): { helpfulCount: number; isHelpful: boolean } {
  const helpfulSet = getHelpfulReviewsSet();
  const isCurrentlyHelpful = helpfulSet.has(reviewId);

  if (isCurrentlyHelpful) {
    helpfulSet.delete(reviewId);
  } else {
    helpfulSet.add(reviewId);
  }

  try {
    localStorage.setItem(HELPFUL_STORAGE_KEY, JSON.stringify(Array.from(helpfulSet)));
  } catch {}

  const isHelpful = !isCurrentlyHelpful;
  const delta = isHelpful ? 1 : -1;

  // Update in user reviews if user review
  let updatedCount = 0;
  if (!reviewId.startsWith('seed_')) {
    try {
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (stored) {
        const all: RecipeReview[] = JSON.parse(stored);
        const idx = all.findIndex((r) => r.id === reviewId);
        if (idx !== -1) {
          all[idx].helpfulCount = Math.max(0, (all[idx].helpfulCount || 0) + delta);
          updatedCount = all[idx].helpfulCount;
          localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
        }
      }
    } catch {}
  } else {
    // Seed review override
    try {
      const raw = localStorage.getItem(`${REVIEWS_STORAGE_KEY}_seed_overrides`);
      const overrides: Record<string, { helpfulCount?: number }> = raw ? JSON.parse(raw) : {};
      const current = overrides[reviewId]?.helpfulCount ?? 0;
      const nextCount = Math.max(0, current + delta);
      overrides[reviewId] = { ...overrides[reviewId], helpfulCount: nextCount };
      localStorage.setItem(`${REVIEWS_STORAGE_KEY}_seed_overrides`, JSON.stringify(overrides));
      updatedCount = nextCount;
    } catch {}
  }

  return { helpfulCount: updatedCount, isHelpful };
}

export function saveReview(data: {
  id?: string;
  recipeId: string;
  rating: number;
  text?: string;
  authorName: string;
}): RecipeReview {
  const now = Date.now();
  let all: RecipeReview[] = [];
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (stored) all = JSON.parse(stored);
  } catch {}

  setUserAuthorName(data.authorName);

  if (data.id) {
    // Update existing review
    const idx = all.findIndex((r) => r.id === data.id);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        rating: data.rating,
        text: data.text?.trim() || undefined,
        authorName: data.authorName.trim(),
      };
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
      return all[idx];
    }
  }

  // Create new review
  const newReview: RecipeReview = {
    id: `rev_${now}_${Math.random().toString(36).substring(2, 7)}`,
    recipeId: data.recipeId,
    authorName: data.authorName.trim(),
    rating: data.rating,
    text: data.text?.trim() || undefined,
    createdAt: now,
    helpfulCount: 0,
    isOwn: true,
  };

  all.unshift(newReview);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save review', e);
  }

  return newReview;
}

export function deleteReview(reviewId: string): void {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (stored) {
      const all: RecipeReview[] = JSON.parse(stored);
      const filtered = all.filter((r) => r.id !== reviewId);
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

export function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `vor ${diffMonths} ${diffMonths === 1 ? 'Monat' : 'Monaten'}`;
  const diffYears = Math.floor(diffDays / 365);
  return `vor ${diffYears} ${diffYears === 1 ? 'Jahr' : 'Jahren'}`;
}

const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-blue-600 text-white',
  'bg-purple-600 text-white',
  'bg-rose-600 text-white',
  'bg-teal-600 text-white',
  'bg-orange-600 text-white',
  'bg-indigo-600 text-white',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'VC';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
