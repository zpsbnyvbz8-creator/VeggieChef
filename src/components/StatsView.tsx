import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  Trash2,
  RotateCcw,
  Utensils,
  Check,
  Flame,
  X,
  Users,
  Clock,
  Dumbbell,
  ChefHat,
  Compass,
  History,
  MoreHorizontal,
  Heart,
  Bookmark,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CookedLog, Recipe } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import {
  computeAchievements,
  computeCookingStage,
  AchievementItem,
  MilestoneIconKey,
} from '../data/achievements';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

interface StatsViewProps {
  logs?: CookedLog[];
  setLogs?: React.Dispatch<React.SetStateAction<CookedLog[]>>;
  favoritesCount?: number;
  allRecipes?: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onCopyFeedback?: (msg: string) => void;
}

const MILESTONE_ICONS: Record<MilestoneIconKey, React.FC<{ className?: string }>> = {
  utensils: Utensils,
  flame: Flame,
  compass: Compass,
  leaf: Leaf,
  clock: Clock,
  dumbbell: Dumbbell,
  users: Users,
  chef: ChefHat,
};

function formatTotalCookingTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 Min.';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} Min.`;
  if (mins === 0) return `${hours} Std.`;
  return `${hours} Std. ${mins} Min.`;
}

export const StatsView: React.FC<StatsViewProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const logs = props.logs ?? recipesCtx.cookedLogs;
  const setLogs = props.setLogs ?? recipesCtx.setCookedLogs;
  const favoritesCount = props.favoritesCount ?? recipesCtx.favorites.length;
  const bookmarksCount = recipesCtx.bookmarks.length;
  const allRecipes = props.allRecipes ?? recipesCtx.recipes;
  const onCopyFeedback = props.onCopyFeedback ?? toastCtx.showToast;

  const [undoBackup, setUndoBackup] = useState<CookedLog[] | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Activity Range Toggle: '7days' vs '4weeks'
  const [activityRange, setActivityRange] = useState<'7days' | '4weeks'>('7days');

  // Milestones Filter Toggle: 'all' vs 'unlocked'
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'unlocked'>('all');

  useLockBodyScroll(showConfirmModal);

  useEffect(() => {
    if (!showContextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowContextMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showContextMenu]);

  useEffect(() => {
    if (showUndoBanner) {
      const timer = setTimeout(() => {
        setShowUndoBanner(false);
        setUndoBackup(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showUndoBanner]);

  // Match each log entry to its recipe in the collection for factual time, nutrition & category data
  const enrichedLogs = useMemo(() => {
    return logs.map((log) => {
      const matchedRecipe = allRecipes.find(
        (r) => r.id === log.recipeId || r.title.toLowerCase() === log.recipeTitle.toLowerCase()
      );
      return {
        log,
        recipe: matchedRecipe,
      };
    });
  }, [logs, allRecipes]);

  // Core Factual Metrics
  const totalCooked = logs.length;
  const totalPortions = logs.reduce((acc, log) => acc + (log.servingsCooked || 2), 0);
  const veganCount = logs.filter((l) => l.isVegan).length;
  const vegetarianCount = Math.max(0, totalCooked - veganCount);
  const veganSharePercent = totalCooked > 0 ? Math.round((veganCount / totalCooked) * 100) : 0;
  const distinctDishesCount = new Set(
    logs.map((l) => (l.recipeId || l.recipeTitle).toLowerCase().trim())
  ).size;

  // Real Cooking Time & Nutrition derived from matched recipes
  const {
    totalCookingMinutes,
    avgCookingMinutes,
    avgProteinPerServing,
    avgCaloriesPerServing,
    quickMealsCount,
    highProteinMealsCount,
  } = useMemo(() => {
    let sumMinutes = 0;
    let countWithTime = 0;
    let sumProtein = 0;
    let sumCalories = 0;
    let countWithNutrients = 0;
    let quickCount = 0;
    let highProteinCount = 0;

    enrichedLogs.forEach(({ recipe }) => {
      if (recipe) {
        if (recipe.totalTimeMinutes > 0) {
          sumMinutes += recipe.totalTimeMinutes;
          countWithTime += 1;
          if (recipe.totalTimeMinutes <= 25) {
            quickCount += 1;
          }
        }
        if (recipe.nutrients) {
          sumProtein += recipe.nutrients.protein || 0;
          sumCalories += recipe.nutrients.calories || 0;
          countWithNutrients += 1;
          if ((recipe.nutrients.protein || 0) >= 20) {
            highProteinCount += 1;
          }
        }
      }
    });

    return {
      totalCookingMinutes: sumMinutes,
      avgCookingMinutes: countWithTime > 0 ? Math.round(sumMinutes / countWithTime) : 0,
      avgProteinPerServing: countWithNutrients > 0 ? Math.round(sumProtein / countWithNutrients) : 0,
      avgCaloriesPerServing: countWithNutrients > 0 ? Math.round(sumCalories / countWithNutrients) : 0,
      quickMealsCount: quickCount,
      highProteinMealsCount: highProteinCount,
    };
  }, [enrichedLogs]);

  // Cooking Stage (Erfahrungsstufe)
  const cookingStage = useMemo(() => computeCookingStage(totalCooked), [totalCooked]);

  // 7-Days Activity Data
  const last7DaysActivity = useMemo(() => {
    const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const bars: {
      key: string;
      label: string;
      subLabel: string;
      isCurrent: boolean;
      mealsCount: number;
      portionsCount: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const dayNum = d.getDate();

      const dayLogs = logs.filter((l) => {
        const ld = new Date(l.date);
        return ld.getFullYear() === y && ld.getMonth() === m && ld.getDate() === dayNum;
      });

      bars.push({
        key: `${y}-${m + 1}-${dayNum}`,
        label: weekdayNames[d.getDay()],
        subLabel: `${dayNum}.${m + 1}.`,
        isCurrent: i === 0,
        mealsCount: dayLogs.length,
        portionsCount: dayLogs.reduce((s, l) => s + (l.servingsCooked || 2), 0),
      });
    }
    return bars;
  }, [logs]);

  // 4-Weeks Activity Data
  const last4WeeksActivity = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const msPerDay = 86400000;

    const weeks: {
      key: string;
      label: string;
      subLabel: string;
      isCurrent: boolean;
      mealsCount: number;
      portionsCount: number;
    }[] = [];

    for (let w = 3; w >= 0; w--) {
      const endMs = now.getTime() - w * 7 * msPerDay;
      const startMs = endMs - 7 * msPerDay;

      const weekLogs = logs.filter((l) => {
        const t = new Date(l.date).getTime();
        return t > startMs && t <= endMs;
      });

      weeks.push({
        key: `week-${w}`,
        label: w === 0 ? 'Diese Wo.' : w === 1 ? 'Letzte Wo.' : `Vor ${w} Wo.`,
        subLabel: `${weekLogs.length}× gekocht`,
        isCurrent: w === 0,
        mealsCount: weekLogs.length,
        portionsCount: weekLogs.reduce((s, l) => s + (l.servingsCooked || 2), 0),
      });
    }
    return weeks;
  }, [logs]);

  const activeChartData = activityRange === '7days' ? last7DaysActivity : last4WeeksActivity;
  const maxChartMeals = Math.max(1, ...activeChartData.map((d) => d.mealsCount));
  const activeDaysLast7 = last7DaysActivity.filter((d) => d.mealsCount > 0).length;

  // Top Cooked Categories
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedLogs.forEach(({ log, recipe }) => {
      const cat = recipe?.category || (log.isVegan ? 'Vegane Gerichte' : 'Vegetarische Gerichte');
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const entries = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const maxCatCount = Math.max(1, ...entries.map((e) => e.count));
    return entries.map((e) => ({
      ...e,
      percent: Math.round((e.count / maxCatCount) * 100),
    }));
  }, [enrichedLogs]);

  // 8 Factual Milestones
  const achievements: AchievementItem[] = useMemo(() => {
    return computeAchievements({
      totalCooked,
      totalPortions,
      veganCount,
      distinctDishesCount,
      quickMealsCount,
      highProteinMealsCount,
    });
  }, [
    totalCooked,
    totalPortions,
    veganCount,
    distinctDishesCount,
    quickMealsCount,
    highProteinMealsCount,
  ]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const visibleAchievements = useMemo(() => {
    if (milestoneFilter === 'unlocked') {
      return achievements.filter((a) => a.unlocked);
    }
    return achievements;
  }, [achievements, milestoneFilter]);

  const handleClearAllLogs = () => {
    if (logs.length === 0) return;
    setUndoBackup([...logs]);
    setLogs([]);
    setShowUndoBanner(true);
    onCopyFeedback('Statistiken wurden zurückgesetzt.');
  };

  const handleUndo = () => {
    if (undoBackup && undoBackup.length > 0) {
      setLogs(undoBackup);
      setUndoBackup(null);
      setShowUndoBanner(false);
      onCopyFeedback('Statistiken wiederhergestellt!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Undo Banner */}
      <AnimatePresence>
        {showUndoBanner && undoBackup && (
          <motion.div
            key="stats-undo-banner"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="p-3.5 sm:p-4 bg-text-main text-on-accent rounded-2xl shadow-lg border border-border/20 flex items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
              <span className="text-[15px] sm:text-[16px] font-medium text-on-accent/95 truncate">
                Statistiken zurückgesetzt ({undoBackup.length}{' '}
                {undoBackup.length === 1 ? 'Eintrag' : 'Einträge'}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                className="h-[44px] min-h-[44px] px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-[15px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center"
              >
                <span>Rückgängig</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUndoBanner(false)}
                className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-on-accent/70 hover:text-on-accent hover:bg-card/10 transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="Schließen"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER & KOCH-FORTSCHRITT */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
              Statistiken
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              Deine echten Kochdaten, Gewohnheiten und Meilensteine im Überblick.
            </p>
          </div>

          {/* Right Controls: Secondary Button to "Zuletzt gekocht" + 3-Dots Overflow Menu */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/cooked')}
              className="h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-header-top hover:bg-[#EDD2AA] text-text-main border border-header-line font-semibold text-sm sm:text-[15px] flex items-center gap-2 shadow-2xs transition-colors cursor-pointer touch-manipulation"
              title="Deine zuletzt gekochten Rezepte ansehen"
            >
              <History className="w-4 h-4 text-text-main shrink-0" />
              <span>Zuletzt gekocht</span>
            </motion.button>

            <div className="relative" ref={contextMenuRef}>
              <button
                type="button"
                id="stats-context-menu-btn"
                onClick={() => setShowContextMenu((prev) => !prev)}
                aria-label="Weitere Optionen"
                aria-expanded={showContextMenu}
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs border ${
                  showContextMenu
                    ? 'bg-accent-tint text-text-main border-accent-border ring-2 ring-accent/25'
                    : 'bg-surface hover:bg-accent-tint text-text-main border-border hover:border-accent-border'
                }`}
              >
                <motion.div
                  animate={{ rotate: showContextMenu ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showContextMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowContextMenu(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 w-60 origin-top-right bg-card rounded-2xl border border-border shadow-xl p-1.5 z-50"
                    >
                      <button
                        type="button"
                        disabled={logs.length === 0}
                        onClick={() => {
                          setShowContextMenu(false);
                          setShowConfirmModal(true);
                        }}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-[15px] font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100/70 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span className="truncate">Statistiken zurücksetzen</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sleek, Grounded Cooking Experience Strip */}
        <div className="pt-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-tint border border-accent-border text-accent flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-text-main">
                  {cookingStage.title}
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs font-semibold text-accent">
                  Stufe {cookingStage.level}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted truncate">
                {cookingStage.subtitle}
              </p>
            </div>
          </div>

          <div className="sm:w-64 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-text-muted">
              <span>
                {cookingStage.nextLevelMeals
                  ? `${totalCooked} / ${cookingStage.nextLevelMeals} Mahlzeiten`
                  : 'Alle Stufen gemeistert'}
              </span>
              <span className="font-bold text-accent tabular-nums">
                {cookingStage.progressPercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-surface border border-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cookingStage.progressPercent}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. DIE 4 ECHTEN KERN-KENNZAHLEN (KEINE ERFUNDENEN UMWELTWERTE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Gekochte Mahlzeiten */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-text-muted">
              Gekochte Gerichte
            </span>
            <div className="w-9 h-9 rounded-xl bg-accent-tint border border-accent-border text-accent flex items-center justify-center shrink-0">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-text-main tabular-nums tracking-tight">
              {totalCooked}
            </div>
            <div className="text-xs text-text-muted mt-1 truncate">
              {distinctDishesCount} {distinctDishesCount === 1 ? 'unterschiedliches Rezept' : 'verschiedene Rezepte'}
            </div>
          </div>
        </motion.div>

        {/* Card 2: Zubereitete Portionen */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-text-muted">
              Portionen
            </span>
            <div className="w-9 h-9 rounded-xl bg-header-top/55 border border-header-line text-text-main flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-text-main tabular-nums tracking-tight">
              {totalPortions}
            </div>
            <div className="text-xs text-text-muted mt-1 truncate">
              {totalCooked > 0
                ? `Ø ${Math.round((totalPortions / totalCooked) * 10) / 10} pro Kochvorgang`
                : 'Noch keine Portionen'}
            </div>
          </div>
        </motion.div>

        {/* Card 3: Echte Zeit am Herd */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-text-muted">
              Zeit am Herd
            </span>
            <div className="w-9 h-9 rounded-xl bg-stat-kcal-bg border border-[#F2E4D6] text-season-autumn-text flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-text-main tabular-nums tracking-tight">
              {formatTotalCookingTime(totalCookingMinutes)}
            </div>
            <div className="text-xs text-text-muted mt-1 truncate">
              {avgCookingMinutes > 0
                ? `Ø ${avgCookingMinutes} Min. pro Gericht`
                : 'Aus Rezeptzeiten berechnet'}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Echte Ø Nährwerte pro Portion */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-text-muted">
              Ø Protein / Port.
            </span>
            <div className="w-9 h-9 rounded-xl bg-accent-tint border border-accent-border text-accent flex items-center justify-center shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-accent tabular-nums tracking-tight">
              {avgProteinPerServing} g
            </div>
            <div className="text-xs text-text-muted mt-1 truncate">
              {avgCaloriesPerServing > 0
                ? `Ø ${avgCaloriesPerServing} kcal pro Portion`
                : 'Noch keine Nährwertdaten'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. KOCH-AKTIVITÄT & KULINARISCHES PROFIL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left: Koch-Aktivität (Umschaltbar 7 Tage / 4 Wochen) */}
        <section className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-text-main">
                Koch-Aktivität
              </h2>
              <p className="text-xs sm:text-sm text-text-muted">
                {activityRange === '7days'
                  ? activeDaysLast7 === 0
                    ? 'In den letzten 7 Tagen noch kein Eintrag'
                    : `An ${activeDaysLast7} der letzten 7 Tage gekocht`
                  : `${last4WeeksActivity.reduce((s, w) => s + w.mealsCount, 0)} Gerichte in den letzten 4 Wochen`}
              </p>
            </div>

            {/* Secondary Segmented Toggle: [ 7 Tage ] / [ 4 Wochen ] */}
            <div
              role="group"
              aria-label="Zeitraum wählen"
              className="relative inline-flex items-center p-1 bg-surface border border-border rounded-xl select-none shadow-2xs h-[40px] shrink-0"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setActivityRange('7days')}
                aria-pressed={activityRange === '7days'}
                className={`relative z-10 px-3 h-full flex items-center justify-center rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer touch-manipulation ${
                  activityRange === '7days'
                    ? 'text-accent font-bold'
                    : 'text-text-muted hover:text-text-main font-semibold'
                }`}
              >
                {activityRange === '7days' && (
                  <motion.span
                    layoutId="stats-activity-range-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-accent-tint border border-accent/35 shadow-2xs -z-10"
                  />
                )}
                <span>7 Tage</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setActivityRange('4weeks')}
                aria-pressed={activityRange === '4weeks'}
                className={`relative z-10 px-3 h-full flex items-center justify-center rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer touch-manipulation ${
                  activityRange === '4weeks'
                    ? 'text-accent font-bold'
                    : 'text-text-muted hover:text-text-main font-semibold'
                }`}
              >
                {activityRange === '4weeks' && (
                  <motion.span
                    layoutId="stats-activity-range-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-accent-tint border border-accent/35 shadow-2xs -z-10"
                  />
                )}
                <span>4 Wochen</span>
              </motion.button>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activityRange}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`grid ${
                activityRange === '7days' ? 'grid-cols-7' : 'grid-cols-4'
              } gap-2.5 sm:gap-3 pt-2 items-end h-36`}
            >
              {activeChartData.map((bar, idx) => {
                const heightPercent =
                  bar.mealsCount > 0
                    ? Math.max(26, Math.round((bar.mealsCount / maxChartMeals) * 100))
                    : 12;

                return (
                  <div
                    key={bar.key}
                    className="flex flex-col items-center justify-end h-full gap-2"
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{
                          duration: 0.42,
                          delay: idx * 0.03,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        title={
                          bar.mealsCount > 0
                            ? `${bar.mealsCount} ${bar.mealsCount === 1 ? 'Gericht' : 'Gerichte'} (${bar.portionsCount} Port.)`
                            : 'Kein Eintrag'
                        }
                        className={`w-full ${
                          activityRange === '7days' ? 'max-w-[38px]' : 'max-w-[56px]'
                        } rounded-xl flex items-start justify-center pt-1.5 transition-colors ${
                          bar.mealsCount > 0
                            ? 'bg-accent text-on-accent shadow-2xs'
                            : 'bg-surface border border-border'
                        }`}
                      >
                        {bar.mealsCount > 0 && (
                          <span className="text-[11px] font-bold leading-none tabular-nums">
                            {bar.mealsCount}
                          </span>
                        )}
                      </motion.div>
                    </div>

                    <div className="text-center">
                      <span
                        className={`block text-xs font-semibold ${
                          bar.isCurrent ? 'text-accent font-bold' : 'text-text-muted'
                        }`}
                      >
                        {bar.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Right: Kulinarisches Profil (Ernährung, Top-Kategorien & Sammlung) */}
        <section className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-text-main">
              Kulinarisches Profil
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Deine gekochten Kategorien und deine Rezeptsammlung
            </p>
          </div>

          {/* Vegan vs. Vegetarisch Balance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-accent">
                Vegan · {veganSharePercent}% ({veganCount})
              </span>
              <span className="text-text-muted">
                Vegetarisch · {totalCooked > 0 ? 100 - veganSharePercent : 0}% ({vegetarianCount})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface border border-border overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${veganSharePercent}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-accent"
              />
            </div>
          </div>

          {/* Top 3 Categories */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Lieblings-Kategorien
            </div>

            {topCategories.length === 0 ? (
              <p className="text-xs text-text-muted py-1">
                Sobald du Gerichte kochst, siehst du hier deine meistgekochten Kategorien.
              </p>
            ) : (
              <div className="space-y-2">
                {topCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-text-main truncate">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-24 sm:w-32 h-2 rounded-full bg-surface border border-border overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percent}%` }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-accent/80"
                        />
                      </div>
                      <span className="text-xs font-bold text-text-muted tabular-nums w-6 text-right">
                        {cat.count}×
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collection Mini-Footprint (Favorites & Bookmarks) */}
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/favorites')}
              className="p-2.5 rounded-xl bg-surface hover:bg-accent-tint/60 border border-border flex items-center justify-between transition-colors cursor-pointer touch-manipulation text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <Heart className="w-3.5 h-3.5 text-favorite" />
                <span>Favoriten</span>
              </span>
              <span className="text-sm font-bold text-text-main tabular-nums">
                {favoritesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/bookmarks')}
              className="p-2.5 rounded-xl bg-surface hover:bg-accent-tint/60 border border-border flex items-center justify-between transition-colors cursor-pointer touch-manipulation text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <Bookmark className="w-3.5 h-3.5 text-accent" />
                <span>Merkliste</span>
              </span>
              <span className="text-sm font-bold text-text-main tabular-nums">
                {bookmarksCount}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* 4. MEILENSTEINE (8 KURATIERTE KOCH-ZIELE MIT FILTER-UMSCHALTER) */}
      <section className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-text-main">
                Meilensteine
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-text-muted tabular-nums">
                ({unlockedCount} von {achievements.length})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted">
              Acht Etappen rund um deine gekochten Rezepte.
            </p>
          </div>

          {/* Secondary Segmented Toggle: [ Alle ] / [ Erreicht ] */}
          <div
            role="group"
            aria-label="Meilensteine filtern"
            className="relative inline-flex items-center p-1 bg-surface border border-border rounded-xl select-none shadow-2xs h-[40px] shrink-0"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setMilestoneFilter('all')}
              aria-pressed={milestoneFilter === 'all'}
              className={`relative z-10 px-3 h-full flex items-center justify-center rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer touch-manipulation ${
                milestoneFilter === 'all'
                  ? 'text-accent font-bold'
                  : 'text-text-muted hover:text-text-main font-semibold'
              }`}
            >
              {milestoneFilter === 'all' && (
                <motion.span
                  layoutId="stats-milestone-filter-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-accent-tint border border-accent/35 shadow-2xs -z-10"
                />
              )}
              <span>Alle ({achievements.length})</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setMilestoneFilter('unlocked')}
              aria-pressed={milestoneFilter === 'unlocked'}
              className={`relative z-10 px-3 h-full flex items-center justify-center rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer touch-manipulation ${
                milestoneFilter === 'unlocked'
                  ? 'text-accent font-bold'
                  : 'text-text-muted hover:text-text-main font-semibold'
              }`}
            >
              {milestoneFilter === 'unlocked' && (
                <motion.span
                  layoutId="stats-milestone-filter-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-accent-tint border border-accent/35 shadow-2xs -z-10"
                />
              )}
              <span>Erreicht ({unlockedCount})</span>
            </motion.button>
          </div>
        </div>

        {visibleAchievements.length === 0 ? (
          <div className="py-8 text-center space-y-2.5">
            <p className="text-sm sm:text-base font-semibold text-text-main">
              Noch kein Meilenstein freigeschaltet
            </p>
            <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">
              Sobald du dein erstes Gericht als gekocht markierst, schaltest du hier den ersten Erfolg frei.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleAchievements.map((ach) => {
                const IconComponent = MILESTONE_ICONS[ach.iconName] || Utensils;
                const progressRatio = Math.min(1, ach.current / ach.target);
                const progressPercent = Math.min(100, Math.round(progressRatio * 100));

                const iconBadgeStyles = ach.unlocked
                  ? ach.accentTone === 'apricot'
                    ? 'bg-header-top/70 border-header-line text-text-main'
                    : ach.accentTone === 'terracotta'
                    ? 'bg-stat-kcal-bg border-[#F2E4D6] text-season-autumn-text'
                    : 'bg-accent-tint border-accent-border text-accent'
                  : 'bg-card border-border text-text-muted';

                return (
                  <motion.div
                    layout
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                      ach.unlocked
                        ? 'bg-accent-tint/45 border-accent-border shadow-2xs'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconBadgeStyles}`}
                      >
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>

                      {ach.unlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-on-accent text-[11px] font-bold inline-flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3 stroke-[2.8]" />
                          <span>Erreicht</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-text-muted tabular-nums">
                          {Math.min(ach.current, ach.target)} / {ach.target}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-sm sm:text-[15px] text-text-main">
                        {ach.title}
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {ach.desc}
                      </p>
                    </div>

                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full ${
                          ach.unlocked ? 'bg-accent' : 'bg-text-muted/50'
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Confirmation Modal for Resetting Stats */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            key="confirm-clear-stats-backdrop"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowConfirmModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs touch-none overscroll-contain"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-xl border border-border space-y-3.5 overscroll-contain"
            >
              <h3 className="text-lg font-bold text-text-main leading-snug">
                Statistiken zurücksetzen?
              </h3>

              <p className="text-[15px] text-text-muted leading-relaxed">
                Deine gesamten Kochdaten ({logs.length}{' '}
                {logs.length === 1 ? 'Eintrag' : 'Einträge'}) werden auf null gesetzt.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1.5">
                <button
                  id="cancel-clear-stats-btn"
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-border bg-surface hover:bg-accent-tint text-text-main font-semibold text-[15px] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                >
                  Abbrechen
                </button>
                <button
                  id="confirm-clear-stats-btn"
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleClearAllLogs();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-on-accent font-semibold text-[15px] shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zurücksetzen</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
