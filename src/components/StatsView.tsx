import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Leaf, 
  Droplets, 
  Award, 
  Trash2, 
  RotateCcw, 
  Utensils, 
  Calendar, 
  ArrowRight,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Trophy,
  Star,
  Search,
  CheckCircle2,
  Flame,
  Crown,
  Filter,
  X,
  Clock,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CookedLog, Recipe } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { computeAchievements, AchievementItem } from '../data/achievements';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

export type AchievementFilterTier = 'all' | 'unlocked' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'insane';

interface StatsViewProps {
  logs?: CookedLog[];
  setLogs?: React.Dispatch<React.SetStateAction<CookedLog[]>>;
  favoritesCount?: number;
  allRecipes?: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onCopyFeedback?: (msg: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = (props) => {
  const navigate = useNavigate();
  const recipesCtx = useRecipes();
  const toastCtx = useToast();

  const logs = props.logs ?? recipesCtx.cookedLogs;
  const setLogs = props.setLogs ?? recipesCtx.setCookedLogs;
  const favoritesCount = props.favoritesCount ?? recipesCtx.favorites.length;
  const allRecipes = props.allRecipes ?? recipesCtx.recipes;
  const onSelectRecipe = props.onSelectRecipe ?? ((r: Recipe) => navigate(`/recipes/${r.id}`));
  const onCopyFeedback = props.onCopyFeedback ?? toastCtx.showToast;
  const [undoBackup, setUndoBackup] = useState<CookedLog[] | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filters for Cooked History
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'vegan'>('all');

  // Filter for Achievements
  const [achievementTierFilter, setAchievementTierFilter] = useState<AchievementFilterTier>('all');

  // Mobile clean view toggle: 'history' or 'achievements'
  const [activeMobileTab, setActiveMobileTab] = useState<'history' | 'achievements'>('history');

  // Inline-Bestätigung für PC beim Löschen eines Eintrags (kein Pop-up)
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  // Mobile Swipe-to-Delete state (70% Schwelle & Menü)
  const [swipedLogId, setSwipedLogId] = useState<string | null>(null);
  const [activeTouchLogId, setActiveTouchLogId] = useState<string | null>(null);
  const [touchCurrentOffset, setTouchCurrentOffset] = useState<number>(0);
  const touchStartRef = useRef<{ startX: number; startY: number; baseOffset: number; itemWidth?: number } | null>(null);
  const justClosedSwipeLogMenuRef = useRef<boolean>(false);

  // Auto-close inline confirmation when clicking outside
  useEffect(() => {
    if (!confirmDeleteLogId) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-inline-confirm="true"]')) return;
      setConfirmDeleteLogId(null);
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [confirmDeleteLogId]);

  // Auto-close swiped log menu when clicking or tapping anywhere on screen
  useEffect(() => {
    if (!swipedLogId) return;
    const handleGlobalTap = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-swipe-action="true"]')) return;
      setSwipedLogId(null);
      justClosedSwipeLogMenuRef.current = true;
      setTimeout(() => {
        justClosedSwipeLogMenuRef.current = false;
      }, 300);
    };
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleGlobalTap, true);
    }, 40);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleGlobalTap, true);
    };
  }, [swipedLogId]);

  useLockBodyScroll(showConfirmModal);

  // Auto-dismiss undo banner after 10s
  useEffect(() => {
    if (showUndoBanner) {
      const timer = setTimeout(() => {
        setShowUndoBanner(false);
        setUndoBackup(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showUndoBanner]);

  const totalCooked = logs.length;
  const totalPortions = logs.reduce((acc, log) => acc + (log.servingsCooked || 2), 0);
  const totalCO2Saved = Math.round(logs.reduce((acc, log) => acc + (log.savedCO2Kg || 0), 0) * 10) / 10;
  const totalWaterSaved = Math.round(logs.reduce((acc, log) => acc + (log.savedWaterLiters || 0), 0));
  const veganCount = logs.filter((l) => l.isVegan).length;
  const distinctDishesCount = new Set(
    logs.map((l) => (l.recipeId || l.recipeTitle).toLowerCase().trim())
  ).size;

  const handleClearAllLogs = () => {
    if (logs.length === 0) return;
    setUndoBackup([...logs]);
    setLogs([]);
    setShowUndoBanner(true);
  };

  const handleUndo = () => {
    if (undoBackup && undoBackup.length > 0) {
      setLogs(undoBackup);
      setUndoBackup(null);
      setShowUndoBanner(false);
    }
  };

  const handleDeleteSingleLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDeleteBySwipeLog = (log: CookedLog) => {
    handleDeleteSingleLog(log.id);
    setSwipedLogId(null);
    setActiveTouchLogId(null);
    setTouchCurrentOffset(0);
    onCopyFeedback(`"${log.recipeTitle}" aus Verlauf entfernt.`);
  };

  // Sort logs by date descending
  const sortedLogs = useMemo(() => {
    return [...logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs]);

  // Filtered logs for search & filter tabs
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter((log) => {
      if (historySearchQuery.trim()) {
        const query = historySearchQuery.toLowerCase().trim();
        const matchesTitle = log.recipeTitle.toLowerCase().includes(query);
        const matchesNotes = log.notes?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesNotes) return false;
      }
      if (historyFilter === 'vegan' && !log.isVegan) return false;
      return true;
    });
  }, [sortedLogs, historySearchQuery, historyFilter]);

  // Comprehensive tiered achievements including insane multi-year milestones
  const achievements: AchievementItem[] = useMemo(() => {
    return computeAchievements({
      totalCooked,
      totalPortions,
      totalCO2Saved,
      totalWaterSaved,
      veganCount,
      favoritesCount,
      distinctDishesCount,
    });
  }, [totalCooked, totalCO2Saved, totalWaterSaved, veganCount, favoritesCount, distinctDishesCount, totalPortions]);

  // Filtered achievements by tier
  const filteredAchievements = useMemo(() => {
    if (achievementTierFilter === 'all') return achievements;
    if (achievementTierFilter === 'unlocked') return achievements.filter((a) => a.unlocked);
    return achievements.filter((a) => a.tier === achievementTierFilter);
  }, [achievements, achievementTierFilter]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const insaneCount = achievements.filter((a) => a.tier === 'insane').length;
  const insaneUnlockedCount = achievements.filter((a) => a.tier === 'insane' && a.unlocked).length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Undo Banner */}
      {showUndoBanner && undoBackup && (
        <div className="p-3.5 sm:p-4 bg-text-main text-on-accent rounded-2xl shadow-lg border border-border/20 flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="text-[16px] font-medium text-on-accent/95 truncate">
              Statistiken zurückgesetzt ({undoBackup.length} Einträge).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="h-[44px] min-h-[44px] px-4 sm:px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-[16px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 sm:hidden" />
              <span>Rückgängig</span>
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-on-accent/70 hover:text-on-accent hover:bg-card/10 transition-colors cursor-pointer touch-manipulation active:scale-95"
              title="Schließen"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-2xl p-4 sm:p-7 border border-border shadow-xs space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-tint text-accent text-xs font-semibold border border-border">
          <BarChart3 className="w-3.5 h-3.5" />
          Deine Kochstatistik & Umweltbeitrag
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
          Übersicht & Verlauf
        </h1>
        <p className="text-base text-text-muted leading-relaxed mt-1">
          {totalCooked === 0
            ? 'Noch keine Gerichte gekocht. Markiere Rezepte als gekocht, um deine Erfolge zu tracken.'
            : `${totalCooked} Mahlzeiten zubereitet • ${totalPortions} Portionen • ${totalCO2Saved} kg CO₂ eingespart`}
        </p>
      </div>

      {/* Clean, Subtle Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            key="confirm-clear-stats-backdrop"
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
                Dein gesamter Kochverlauf ({logs.length} {logs.length === 1 ? 'Eintrag' : 'Einträge'}) sowie die berechneten CO₂- und Wasserersparnisse werden zurückgesetzt.
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Meals */}
        <div className="bg-card p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
            <span>Gekocht</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface text-[#57534d] border border-border">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-main">{totalCooked}</div>
          <div className="text-xs text-text-muted truncate font-medium">{totalPortions} Portionen</div>
        </div>

        {/* CO2 Saved */}
        <div className="bg-card p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
            <span>CO₂ gespart</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-accent-tint text-accent border border-border">
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-accent">{totalCO2Saved} kg</div>
          <div className="text-xs text-text-muted truncate font-medium">vs. Mischkost</div>
        </div>

        {/* Water Saved */}
        <div className="bg-card p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
            <span>Wasser</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface text-[#57534d] border border-border">
              <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-main">{totalWaterSaved.toLocaleString('de-DE')} L</div>
          <div className="text-xs text-text-muted truncate font-medium">virtuelles Wasser</div>
        </div>

        {/* Vegan Share */}
        <div className="bg-card p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
            <span>Vegan</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF]">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-main">
            {veganCount} <span className="text-xs font-normal text-text-muted">/ {totalCooked}</span>
          </div>
          <div className="text-xs text-text-muted truncate font-medium">{favoritesCount} Favoriten</div>
        </div>
      </div>

      {/* Mobile Navigation Tabs: Für deutlich mehr Übersicht auf Smartphones */}
      <div className="flex p-1 bg-surface border border-border rounded-2xl md:hidden">
        <button
          type="button"
          onClick={() => setActiveMobileTab('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
            activeMobileTab === 'history'
              ? 'bg-card text-text-main shadow-xs border border-border'
              : 'text-[#57534d] hover:text-accent'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Kochverlauf ({logs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('achievements')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
            activeMobileTab === 'achievements'
              ? 'bg-card text-text-main shadow-xs border border-border'
              : 'text-[#57534d] hover:text-accent'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-[#D35400]" />
          <span>Erfolge ({unlockedCount}/{achievements.length})</span>
        </button>
      </div>

      {/* ZULETZT GEKOCHT SECTION - KOMPAKT & SCROLLBAR */}
      <div className={`bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-xs space-y-3 sm:space-y-4 ${activeMobileTab !== 'history' ? 'hidden md:block' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-tint text-accent">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-main text-base">
                  Zuletzt gekocht
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-surface text-text-muted border border-border text-xs font-semibold">
                  {logs.length}
                </span>
              </div>
              <p className="text-xs text-text-muted hidden sm:block">
                Scrollbare Liste aller deiner zubereiteten Mahlzeiten
              </p>
            </div>
          </div>

          {/* Quick Search & Filter if logs exist */}
          {logs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Gericht filtern..."
                  className="w-full pl-10 pr-10 py-2.5 text-[16px] bg-surface border border-border rounded-xl text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-card transition-all min-h-[44px]"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#57534d] hover:text-accent hover:bg-border rounded-lg flex items-center justify-center cursor-pointer touch-manipulation active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
                    historyFilter === 'all'
                      ? 'bg-text-main text-on-accent border-text-main shadow-2xs'
                      : 'bg-surface text-text-muted border-border hover:bg-card'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setHistoryFilter('vegan')}
                  className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
                    historyFilter === 'vegan'
                      ? 'bg-accent text-on-accent border-accent shadow-2xs'
                      : 'bg-surface text-text-muted border-border hover:bg-card'
                  }`}
                >
                  Vegan
                </button>
              </div>
            </div>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted space-y-1.5">
            <p className="text-sm font-semibold text-text-main">Noch keine Einträge vorhanden</p>
            <p>Öffne ein beliebiges Rezept und klicke auf "Ich habe das gekocht!", um es hier aufzulisten.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-muted space-y-3">
            <p className="font-semibold text-text-main">Keine Treffer für diese Filterung</p>
            <button
              onClick={() => {
                setHistorySearchQuery('');
                setHistoryFilter('all');
              }}
              className="min-h-[42px] px-4 py-2 bg-accent-tint hover:bg-accent-tint text-accent font-semibold text-xs rounded-xl transition-colors cursor-pointer touch-manipulation active:scale-95 inline-flex items-center justify-center"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          /* Scrollable Container so it doesn't take unlimited vertical space */
          <div 
            id="cooked-history-scroll-container"
            className="max-h-[380px] sm:max-h-[440px] overflow-y-auto overscroll-contain pr-1 sm:pr-1.5 space-y-2.5 scrollbar-thin scrollbar-thumb-gray-200"
          >
            {filteredLogs.map((log) => {
              const formattedDate = new Date(log.date).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              // Find matching recipe in collection if available
              const matchedRecipe = allRecipes.find(
                (r) => r.id === log.recipeId || r.title.toLowerCase() === log.recipeTitle.toLowerCase()
              );

              // Mobile Touch & Swipe Offset
              const isSwiped = swipedLogId === log.id;
              const isThisItemTouching = activeTouchLogId === log.id;
              const MENU_SWIPE_OFFSET = 72; // Angenehmer Abstand im geöffneten Zustand
              const currentOffset = isThisItemTouching
                ? touchCurrentOffset
                : isSwiped
                ? -MENU_SWIPE_OFFSET
                : 0;

              const itemWidth = touchStartRef.current?.itemWidth || 360;
              const deleteThreshold = itemWidth * 0.7; // ~70% Schwelle
              const pullDistance = Math.max(0, -currentOffset);
              const isFullSwipeDelete = isThisItemTouching && pullDistance >= deleteThreshold;

              // Wenn weiter links geswipt wird als das Menü
              const isSwipingPastMenu = isThisItemTouching && pullDistance > MENU_SWIPE_OFFSET && !isFullSwipeDelete;
              const extraPull = isSwipingPastMenu ? pullDistance - MENU_SWIPE_OFFSET : 0;
              const expandingTrashWidth = isSwipingPastMenu
                ? Math.min(itemWidth - 28, 40 + extraPull * 1.25)
                : 40;

              return (
                <div
                  key={log.id}
                  data-swipe-log={log.id}
                  className="relative overflow-hidden rounded-2xl select-none group touch-pan-y"
                >
                  {/* Background Action Tray: Im Grundzustand/Swipe #FAF9F6, bei >=70% dunkleres Rot (#C93B2B) */}
                  <div
                    className={`absolute inset-0 z-0 rounded-2xl overflow-hidden flex items-center justify-end transition-[background-color,border-color] duration-150 ease-out ${
                      isFullSwipeDelete
                        ? 'bg-[#C93B2B] border border-[#C93B2B]'
                        : 'bg-surface border border-border px-3.5'
                    }`}
                  >
                    {isFullSwipeDelete ? (
                      /* Apple Full-Swipe: Bei ~70% nimmt das dunklere Rot komplett den Background Space ein */
                      <div className="flex items-center justify-end w-full px-6 gap-2.5 text-on-accent font-semibold text-sm animate-in fade-in zoom-in-95 duration-150">
                        <Trash2 className="w-5 h-5 stroke-[2.5] scale-110 transition-transform" />
                        <span>Löschen</span>
                      </div>
                    ) : (
                      /* Mülleimer wird dynamisch länger, wenn weiter links gewischt wird */
                      <button
                        data-swipe-action="true"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBySwipeLog(log);
                        }}
                        style={{
                          width: isSwipingPastMenu ? `${expandingTrashWidth}px` : '40px',
                          transition: isThisItemTouching ? 'none' : 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s',
                        }}
                        className={`h-10 rounded-xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-90 shadow-2xs shrink-0 transition-colors ${
                          isSwipingPastMenu
                            ? 'bg-rose-100 text-rose-700 border border-rose-300 px-3'
                            : 'w-10 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                        }`}
                        title="Eintrag entfernen"
                        aria-label="Eintrag entfernen"
                      >
                        <Trash2 className="w-4 h-4 shrink-0 stroke-[2.2]" />
                        {isSwipingPastMenu && expandingTrashWidth > 72 && (
                          <span className="text-xs font-semibold whitespace-nowrap animate-in fade-in duration-100">
                            Löschen
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Foreground Log Card */}
                  <div
                    onTouchStart={(e) => {
                      if (swipedLogId && swipedLogId !== log.id) {
                        setSwipedLogId(null);
                      }
                      const touch = e.touches[0];
                      const targetEl = e.currentTarget as HTMLElement;
                      const width = targetEl.offsetWidth || window.innerWidth;
                      touchStartRef.current = {
                        startX: touch.clientX,
                        startY: touch.clientY,
                        baseOffset: swipedLogId === log.id ? -MENU_SWIPE_OFFSET : 0,
                        itemWidth: width,
                      };
                      setActiveTouchLogId(log.id);
                    }}
                    onTouchMove={(e) => {
                      if (!touchStartRef.current) return;
                      const touch = e.touches[0];
                      const diffX = touch.clientX - touchStartRef.current.startX;
                      const diffY = touch.clientY - touchStartRef.current.startY;

                      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffX) < 12) {
                        return;
                      }

                      const width = touchStartRef.current.itemWidth || 360;
                      const rawOffset = touchStartRef.current.baseOffset + diffX;
                      let clamped: number;
                      if (rawOffset > 0) {
                        clamped = Math.min(15, rawOffset * 0.2);
                      } else {
                        clamped = Math.max(-width, rawOffset);
                      }
                      setTouchCurrentOffset(clamped);
                    }}
                    onTouchEnd={() => {
                      if (!touchStartRef.current) return;
                      const width = touchStartRef.current.itemWidth || 360;
                      const deleteThreshold = width * 0.7;
                      touchStartRef.current = null;

                      if (isThisItemTouching) {
                        if (touchCurrentOffset <= -deleteThreshold) {
                          handleDeleteBySwipeLog(log);
                        } else if (touchCurrentOffset < -40) {
                          setSwipedLogId(log.id);
                          setActiveTouchLogId(null);
                          setTouchCurrentOffset(0);
                        } else {
                          setSwipedLogId(null);
                          setActiveTouchLogId(null);
                          setTouchCurrentOffset(0);
                        }
                      }
                    }}
                    onClick={(e) => {
                      if (swipedLogId || justClosedSwipeLogMenuRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSwipedLogId(null);
                      }
                    }}
                    style={{
                      transform: `translate3d(${currentOffset}px, 0, 0)`,
                      transition: isThisItemTouching ? 'none' : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
                      willChange: isThisItemTouching ? 'transform' : 'auto',
                    }}
                    className="relative z-10 p-3 sm:p-3.5 bg-card sm:bg-surface rounded-2xl border border-border flex items-center justify-between gap-2.5 sm:gap-3 transition-colors hover:bg-card hover:border-accent-border shadow-2xs"
                  >
                    {/* Log Card Body: Clean mobile arrangement */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Row: Title */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-text-main text-sm truncate">
                          {log.recipeTitle}
                        </span>
                      </div>

                      {/* Notes (if any) */}
                      {log.notes && (
                        <p className="text-[11px] text-text-muted italic truncate">
                          "{log.notes}"
                        </p>
                      )}

                      {/* Clean Scannable Metrics Badges (Apple-Style Clean Pills) */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                        <span className="bg-surface px-2 py-0.5 rounded-md border border-border inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-text-muted" aria-hidden="true" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="bg-surface px-2 py-0.5 rounded-md border border-border inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-text-muted" aria-hidden="true" />
                          <span>{log.servingsCooked || 2} Port.</span>
                        </span>
                        <span className="bg-accent-tint text-accent font-medium px-2 py-0.5 rounded-md border border-border inline-flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-accent" aria-hidden="true" />
                          <span>{log.savedCO2Kg} kg CO₂</span>
                        </span>
                        <span className="bg-surface px-2 py-0.5 rounded-md border border-border hidden xs:inline-flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-accent" aria-hidden="true" />
                          <span>{log.savedWaterLiters.toLocaleString('de-DE')} L</span>
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Rezept Button & PC Delete / Inline Confirm */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                      {matchedRecipe && (
                        <button
                          type="button"
                          onClick={() => onSelectRecipe(matchedRecipe)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface sm:bg-card hover:bg-accent-tint text-accent border border-border text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer min-h-[38px] sm:min-h-0 touch-manipulation active:scale-95"
                          title="Rezept ansehen"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Rezept</span>
                        </button>
                      )}

                      {/* PC Inline-Bestätigung (Kein Pop-up) */}
                      {confirmDeleteLogId === log.id ? (
                        <div
                          data-inline-confirm="true"
                          className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-1 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <span className="text-xs font-semibold text-rose-700 px-1.5 hidden sm:inline whitespace-nowrap">
                            Wirklich löschen?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteSingleLog(log.id);
                              setConfirmDeleteLogId(null);
                              onCopyFeedback(`"${log.recipeTitle}" aus Verlauf entfernt.`);
                            }}
                            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-on-accent text-[14px] font-semibold shadow-2xs transition-colors cursor-pointer active:scale-95 touch-manipulation flex items-center justify-center"
                          >
                            Löschen
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteLogId(null)}
                            className="min-h-[40px] px-3 py-2 rounded-lg bg-card hover:bg-border text-[#57534d] hover:text-accent border border-border text-[14px] font-semibold transition-colors cursor-pointer active:scale-95 touch-manipulation flex items-center justify-center"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLogId(log.id)}
                          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-surface text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-border transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs shrink-0"
                          title="Eintrag entfernen (Bestätigung erforderlich)"
                          aria-label="Eintrag entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ERFOLGE & TROPHÄEN - MIT INSANE-LEVEL & KOMPAKTER ANSICHT */}
      <div className={`bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-xs space-y-3 sm:space-y-4 ${activeMobileTab !== 'achievements' ? 'hidden md:block' : ''}`}>
        {/* Header with summary & unlocked badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FDF6F0] text-[#D35400]">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base font-semibold text-text-main flex items-center gap-2">
                <span>Erfolge & Trophäen</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-tint text-accent border border-border">
                  {unlockedCount}/{achievements.length} freigeschaltet
                </span>
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Von schnellen Einstiegs-Erfolgen bis hin zu extremen Langzeit-Trophäen (über 1.000 Mahlzeiten & Tonnen CO₂)
            </p>
          </div>

          {/* Insane Milestone Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold self-start sm:self-auto min-h-[38px]">
            <Flame className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Insane Trophäen: {insaneUnlockedCount}/{insaneCount}</span>
          </div>
        </div>

        {/* Tier Filter Tabs - Auf Einkaufslisten-Niveau vergrößert */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none text-sm">
          <button
            onClick={() => setAchievementTierFilter('all')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'all'
                ? 'bg-text-main text-on-accent border-text-main shadow-2xs'
                : 'bg-surface text-text-muted border-border hover:bg-card'
            }`}
          >
            Alle ({achievements.length})
          </button>
          <button
            onClick={() => setAchievementTierFilter('unlocked')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'unlocked'
                ? 'bg-accent text-on-accent border-accent shadow-2xs'
                : 'bg-surface text-text-muted border-border hover:bg-card'
            }`}
          >
            Erreicht ({unlockedCount})
          </button>
          <button
            onClick={() => setAchievementTierFilter('bronze')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'bronze'
                ? 'bg-amber-700 text-on-accent border-amber-700 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            Bronze
          </button>
          <button
            onClick={() => setAchievementTierFilter('silver')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'silver'
                ? 'bg-slate-700 text-on-accent border-slate-700 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Silber
          </button>
          <button
            onClick={() => setAchievementTierFilter('gold')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'gold'
                ? 'bg-yellow-600 text-on-accent border-yellow-600 shadow-2xs'
                : 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100'
            }`}
          >
            Gold
          </button>
          <button
            onClick={() => setAchievementTierFilter('diamond')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'diamond'
                ? 'bg-teal-700 text-on-accent border-teal-700 shadow-2xs'
                : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
            }`}
          >
            Diamant
          </button>
          <button
            onClick={() => setAchievementTierFilter('insane')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-extrabold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0 touch-manipulation active:scale-95 ${
              achievementTierFilter === 'insane'
                ? 'bg-rose-600 text-on-accent border-rose-600 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-600" />
            <span>Insane ({insaneCount})</span>
          </button>
        </div>

        {/* Compact, Scrollable Achievements Grid */}
        <div 
          id="achievements-scroll-container"
          className="max-h-[380px] sm:max-h-[440px] overflow-y-auto overscroll-contain pr-1 sm:pr-1.5 scrollbar-thin scrollbar-thumb-gray-200"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {filteredAchievements.map((ach) => {
              const progressRatio = Math.min(1, ach.current / ach.target);
              const progressPercent = Math.min(100, Math.round(progressRatio * 100));

              // Tier styling
              const tierBadge = {
                bronze: { label: 'Bronze', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
                silver: { label: 'Silber', bg: 'bg-slate-200 text-slate-700 border-slate-300' },
                gold: { label: 'Gold', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                diamond: { label: 'Diamant', bg: 'bg-teal-100 text-teal-800 border-teal-200' },
                insane: { label: 'Insane', bg: 'bg-rose-100 text-rose-700 border-rose-200 font-bold' },
              }[ach.tier];

              return (
                <div
                  key={ach.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                    ach.unlocked
                      ? ach.tier === 'insane'
                        ? 'bg-rose-50/70 border-rose-200 shadow-2xs'
                        : 'bg-accent-tint border-border shadow-2xs'
                      : 'bg-surface border-border opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="text-3xl shrink-0 p-1 bg-card rounded-lg border border-border shadow-2xs">
                    {ach.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-semibold text-sm text-text-main break-words whitespace-normal leading-snug">
                        {ach.title}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-md border shrink-0 font-medium ${tierBadge.bg}`}>
                        {tierBadge.label}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted leading-tight break-words whitespace-normal">
                      {ach.desc}
                    </p>

                    {/* Progress Bar & Counter */}
                    <div className="pt-0.5 space-y-0.5">
                      <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ach.unlocked
                              ? ach.tier === 'insane'
                                ? 'bg-rose-600'
                                : 'bg-accent'
                              : ach.tier === 'insane'
                              ? 'bg-rose-400'
                              : 'bg-text-muted'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span className="font-medium">
                          {ach.unlocked
                            ? 'Erreicht'
                            : `${Math.min(ach.current, ach.target).toLocaleString('de-DE')} / ${ach.target.toLocaleString('de-DE')} ${ach.unit}`}
                        </span>
                        <span className="font-bold text-text-main">
                          {progressPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STATISTIKEN LÖSCHEN - GANZ UNTEN PLATZIERT */}
      {logs.length > 0 && (
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-text-main">Kochdaten & Verlauf verwalten</h4>
            <p className="text-xs text-text-muted">
              Möchtest du deinen bisherigen Kochverlauf und alle erfassten Ersparnisse zurücksetzen?
            </p>
          </div>
          <button
            id="clear-all-stats-btn"
            onClick={() => setShowConfirmModal(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm border border-rose-200 transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-2 shadow-2xs w-full sm:w-auto shrink-0"
            title="Statistik und Kochverlauf leeren (erfordert Bestätigung)"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Statistik leeren</span>
          </button>
        </div>
      )}
    </div>
  );
};

