export type MilestoneIconKey =
  | 'utensils'
  | 'flame'
  | 'compass'
  | 'leaf'
  | 'clock'
  | 'dumbbell'
  | 'users'
  | 'chef';

export interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  iconName: MilestoneIconKey;
  accentTone: 'sage' | 'apricot' | 'terracotta';
  current: number;
  target: number;
  unit: string;
  unlocked: boolean;
}

export interface UserStatsMetrics {
  totalCooked: number;
  totalPortions: number;
  veganCount: number;
  distinctDishesCount: number;
  quickMealsCount: number;
  highProteinMealsCount: number;
}

export interface CookingStageInfo {
  level: number;
  title: string;
  subtitle: string;
  currentMeals: number;
  nextLevelMeals: number | null;
  progressPercent: number;
}

const COOKING_STAGES: { minMeals: number; title: string; subtitle: string }[] = [
  { minMeals: 0, title: 'Einsteiger', subtitle: 'Bereit für dein erstes gekochtes Gericht' },
  { minMeals: 1, title: 'Frisch am Herd', subtitle: 'Der Anfang deiner eigenen Kochstatistik' },
  { minMeals: 5, title: 'Hobbykoch', subtitle: 'Selbst kochen gehört fest zu deiner Woche' },
  { minMeals: 12, title: 'Routinier', subtitle: 'Abwechslungsreiche Küche mit sicherer Hand' },
  { minMeals: 25, title: 'Stammkoch', subtitle: 'Beachtliche Sammlung an gekochten Mahlzeiten' },
  { minMeals: 50, title: 'Küchenchef', subtitle: 'Erfahrene Routine über viele Wochen hinweg' },
];

export function computeCookingStage(totalCooked: number): CookingStageInfo {
  let currentIdx = 0;
  for (let i = 0; i < COOKING_STAGES.length; i++) {
    if (totalCooked >= COOKING_STAGES[i].minMeals) {
      currentIdx = i;
    }
  }

  const currentStage = COOKING_STAGES[currentIdx];
  const nextStage = COOKING_STAGES[currentIdx + 1] || null;

  if (!nextStage) {
    return {
      level: currentIdx + 1,
      title: currentStage.title,
      subtitle: currentStage.subtitle,
      currentMeals: totalCooked,
      nextLevelMeals: null,
      progressPercent: 100,
    };
  }

  const span = Math.max(1, nextStage.minMeals - currentStage.minMeals);
  const progressed = Math.max(0, totalCooked - currentStage.minMeals);
  const progressPercent = Math.min(100, Math.round((progressed / span) * 100));

  return {
    level: currentIdx + 1,
    title: currentStage.title,
    subtitle: currentStage.subtitle,
    currentMeals: totalCooked,
    nextLevelMeals: nextStage.minMeals,
    progressPercent,
  };
}

/**
 * 8 ehrliche, auf echten Rezept- und Kochdaten basierende Meilensteine (ohne erfundene Umwelt-Formeln)
 */
export function computeAchievements(metrics: UserStatsMetrics): AchievementItem[] {
  const {
    totalCooked,
    totalPortions,
    veganCount,
    distinctDishesCount,
    quickMealsCount,
    highProteinMealsCount,
  } = metrics;

  return [
    {
      id: 'first_cook',
      title: 'Erstes Gericht',
      desc: '1 Rezept selbst zubereitet und erfasst.',
      iconName: 'utensils',
      accentTone: 'sage',
      current: totalCooked,
      target: 1,
      unit: 'Gericht',
      unlocked: totalCooked >= 1,
    },
    {
      id: 'routine_5',
      title: 'Frische Routine',
      desc: '5 Mahlzeiten frisch selbst gekocht.',
      iconName: 'flame',
      accentTone: 'terracotta',
      current: totalCooked,
      target: 5,
      unit: 'Gerichte',
      unlocked: totalCooked >= 5,
    },
    {
      id: 'variety_5',
      title: 'Rezept-Entdecker',
      desc: '5 verschiedene Rezepte aus der Sammlung probiert.',
      iconName: 'compass',
      accentTone: 'apricot',
      current: distinctDishesCount,
      target: 5,
      unit: 'Rezepte',
      unlocked: distinctDishesCount >= 5,
    },
    {
      id: 'vegan_5',
      title: 'Rein pflanzlich',
      desc: '5 rein vegane Mahlzeiten zubereitet.',
      iconName: 'leaf',
      accentTone: 'sage',
      current: veganCount,
      target: 5,
      unit: 'Gerichte',
      unlocked: veganCount >= 5,
    },
    {
      id: 'quick_3',
      title: 'Schnelle Küche',
      desc: '3 schnelle Gerichte (bis 25 Min. Gesamtzeit) gekocht.',
      iconName: 'clock',
      accentTone: 'apricot',
      current: quickMealsCount,
      target: 3,
      unit: 'Gerichte',
      unlocked: quickMealsCount >= 3,
    },
    {
      id: 'protein_3',
      title: 'Protein-Fokus',
      desc: '3 proteinreiche Gerichte (ab 20 g Protein/Port.) gekocht.',
      iconName: 'dumbbell',
      accentTone: 'terracotta',
      current: highProteinMealsCount,
      target: 3,
      unit: 'Gerichte',
      unlocked: highProteinMealsCount >= 3,
    },
    {
      id: 'portions_25',
      title: 'Große Tafel',
      desc: 'Insgesamt 25 Portionen zubereitet.',
      iconName: 'users',
      accentTone: 'apricot',
      current: totalPortions,
      target: 25,
      unit: 'Portionen',
      unlocked: totalPortions >= 25,
    },
    {
      id: 'cook_20',
      title: 'Stammgast am Herd',
      desc: '20 Mahlzeiten erfolgreich selbst gekocht.',
      iconName: 'chef',
      accentTone: 'sage',
      current: totalCooked,
      target: 20,
      unit: 'Gerichte',
      unlocked: totalCooked >= 20,
    },
  ];
}
