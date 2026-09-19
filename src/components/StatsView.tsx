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
  Clock
} from 'lucide-react';
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
        <div className="p-3.5 sm:p-4 bg-[#2D3E40] text-white rounded-2xl shadow-lg border border-[#ECEBE8] flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <RotateCcw className="w-4 h-4 text-[#4A7856] shrink-0" />
            <span className="text-xs sm:text-sm">Statistiken zurückgesetzt ({undoBackup.length} Einträge).</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center"
            >
              Rückgängig
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 text-sm cursor-pointer touch-manipulation active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-7 border border-[#ECEBE8] shadow-xs space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
          <BarChart3 className="w-3.5 h-3.5" />
          Deine Kochstatistik & Umweltbeitrag
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
          Übersicht & Verlauf
        </h2>
        <p className="text-xs sm:text-sm text-[#7A7E7B]">
          {totalCooked === 0
            ? 'Noch keine Gerichte gekocht. Markiere Rezepte als gekocht, um deine Erfolge zu tracken.'
            : `${totalCooked} Mahlzeiten zubereitet • ${totalPortions} Portionen • ${totalCO2Saved} kg CO₂ eingespart`}
        </p>
      </div>

      {/* Confirmation Modal: Achtung */}
      {showConfirmModal && (
        <div 
          onClick={() => setShowConfirmModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs touch-none overscroll-contain animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-[#ECEBE8] space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 overscroll-contain"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Achtung: Bestätigung erforderlich</span>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3E40] leading-snug">
                  Statistiken wirklich löschen?
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#7A7E7B] leading-relaxed">
              Bist du sicher, dass du deinen gesamten Kochverlauf und alle <strong className="text-[#2D3E40]">{logs.length} erfassten Einträge</strong> löschen möchtest? Alle bisher berechneten CO₂- und Wasserersparnisse werden zurückgesetzt.
            </p>

            <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                id="cancel-clear-stats-btn"
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl border border-[#ECEBE8] bg-white hover:bg-[#FAF9F6] text-[#2D3E40] font-semibold text-xs sm:text-sm transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                Abbrechen
              </button>
              <button
                id="confirm-clear-stats-btn"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleClearAllLogs();
                }}
                className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ja, wirklich löschen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Meals */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[#7A7E7B] text-xs font-semibold uppercase tracking-wider">
            <span>Gekocht</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8]">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-[#2D3E40]">{totalCooked}</div>
          <div className="text-xs text-[#7A7E7B] truncate font-medium">{totalPortions} Portionen</div>
        </div>

        {/* CO2 Saved */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[#7A7E7B] text-xs font-semibold uppercase tracking-wider">
            <span>CO₂ gespart</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]">
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-[#4A7856]">{totalCO2Saved} kg</div>
          <div className="text-xs text-[#7A7E7B] truncate font-medium">vs. Mischkost</div>
        </div>

        {/* Water Saved */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[#7A7E7B] text-xs font-semibold uppercase tracking-wider">
            <span>Wasser</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#FAF9F6] text-[#2D3E40] border border-[#ECEBE8]">
              <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-[#2D3E40]">{totalWaterSaved.toLocaleString('de-DE')} L</div>
          <div className="text-xs text-[#7A7E7B] truncate font-medium">virtuelles Wasser</div>
        </div>

        {/* Vegan Share */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[#7A7E7B] text-xs font-semibold uppercase tracking-wider">
            <span>Vegan</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#FDF6F0] text-[#D35400] border border-[#F5EADF]">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-[#2D3E40]">
            {veganCount} <span className="text-xs font-normal text-[#7A7E7B]">/ {totalCooked}</span>
          </div>
          <div className="text-xs text-[#7A7E7B] truncate font-medium">{favoritesCount} Favoriten</div>
        </div>
      </div>

      {/* Mobile Navigation Tabs: Für deutlich mehr Übersicht auf Smartphones */}
      <div className="flex p-1 bg-[#FAF9F6] border border-[#ECEBE8] rounded-2xl md:hidden">
        <button
          type="button"
          onClick={() => setActiveMobileTab('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
            activeMobileTab === 'history'
              ? 'bg-white text-[#2D3E40] shadow-xs border border-[#ECEBE8]'
              : 'text-[#7A7E7B] hover:text-[#2D3E40]'
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
              ? 'bg-white text-[#2D3E40] shadow-xs border border-[#ECEBE8]'
              : 'text-[#7A7E7B] hover:text-[#2D3E40]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-[#D35400]" />
          <span>Erfolge ({unlockedCount}/{achievements.length})</span>
        </button>
      </div>

      {/* ZULETZT GEKOCHT SECTION - KOMPAKT & SCROLLBAR */}
      <div className={`bg-white p-4 sm:p-6 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-3 sm:space-y-4 ${activeMobileTab !== 'history' ? 'hidden md:block' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECEBE8] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#F1F5F2] text-[#4A7856]">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#2D3E40] text-sm sm:text-base">
                  Zuletzt gekocht
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#7A7E7B] border border-[#ECEBE8] text-xs font-semibold">
                  {logs.length}
                </span>
              </div>
              <p className="text-xs text-[#7A7E7B] hidden sm:block">
                Scrollbare Liste aller deiner zubereiteten Mahlzeiten
              </p>
            </div>
          </div>

          {/* Quick Search & Filter if logs exist */}
          {logs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-4 h-4 text-[#7A7E7B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Gericht filtern..."
                  className="w-full pl-10 pr-10 py-2.5 text-base sm:text-sm bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[#2D3E40] placeholder:text-[#7A7E7B] focus:outline-none focus:border-[#4A7856] focus:bg-white transition-all min-h-[44px] sm:min-h-0"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#ECEBE8] rounded-lg flex items-center justify-center cursor-pointer touch-manipulation active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-xs font-semibold border transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
                    historyFilter === 'all'
                      ? 'bg-[#2D3E40] text-white border-[#2D3E40] shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setHistoryFilter('vegan')}
                  className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-xs font-semibold border transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
                    historyFilter === 'vegan'
                      ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
                  }`}
                >
                  🌱 Vegan
                </button>
              </div>
            </div>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#7A7E7B] space-y-1.5">
            <p className="text-sm font-semibold text-[#2D3E40]">Noch keine Einträge vorhanden</p>
            <p>Öffne ein beliebiges Rezept und klicke auf "Ich habe das gekocht!", um es hier aufzulisten.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#7A7E7B] space-y-3">
            <p className="font-semibold text-[#2D3E40]">Keine Treffer für diese Filterung</p>
            <button
              onClick={() => {
                setHistorySearchQuery('');
                setHistoryFilter('all');
              }}
              className="min-h-[42px] px-4 py-2 bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#4A7856] font-semibold text-xs rounded-xl transition-colors cursor-pointer touch-manipulation active:scale-95 inline-flex items-center justify-center"
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
                        : 'bg-[#FAF9F6] border border-[#ECEBE8] px-3.5'
                    }`}
                  >
                    {isFullSwipeDelete ? (
                      /* Apple Full-Swipe: Bei ~70% nimmt das dunklere Rot komplett den Background Space ein */
                      <div className="flex items-center justify-end w-full px-6 gap-2.5 text-white font-semibold text-sm animate-in fade-in zoom-in-95 duration-150">
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
                    className="relative z-10 p-3 sm:p-3.5 bg-white sm:bg-[#FAF9F6] rounded-2xl border border-[#ECEBE8] flex items-center justify-between gap-2.5 sm:gap-3 transition-colors hover:bg-white hover:border-[#DCDAD5] shadow-2xs"
                  >
                    {/* Log Card Body: Clean mobile arrangement */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Row: Title + Badge */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[#2D3E40] text-xs sm:text-sm truncate">
                          {log.recipeTitle}
                        </span>
                        {log.isVegan ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] shrink-0">
                            🌱 Vegan
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#7A7E7B] border border-[#ECEBE8] shrink-0">
                            🧀 Veggie
                          </span>
                        )}
                      </div>

                      {/* Notes (if any) */}
                      {log.notes && (
                        <p className="text-[11px] text-[#7A7E7B] italic truncate">
                          "{log.notes}"
                        </p>
                      )}

                      {/* Clean Scannable Metrics Badges (Apple-Style Clean Pills) */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7A7E7B]">
                        <span className="bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#ECEBE8]">
                          📅 {formattedDate}
                        </span>
                        <span className="bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#ECEBE8]">
                          👥 {log.servingsCooked || 2} Port.
                        </span>
                        <span className="bg-[#F1F5F2] text-[#4A7856] font-medium px-2 py-0.5 rounded-md border border-[#ECEBE8]">
                          🌱 {log.savedCO2Kg} kg CO₂
                        </span>
                        <span className="bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#ECEBE8] hidden xs:inline">
                          💧 {log.savedWaterLiters.toLocaleString('de-DE')} L
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Rezept Button & PC Delete / Inline Confirm */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                      {matchedRecipe && (
                        <button
                          type="button"
                          onClick={() => onSelectRecipe(matchedRecipe)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FAF9F6] sm:bg-white hover:bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer min-h-[38px] sm:min-h-0 touch-manipulation active:scale-95"
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
                          className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl p-1 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <span className="text-[11px] font-semibold text-rose-700 px-1.5 hidden sm:inline whitespace-nowrap">
                            Wirklich löschen?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteSingleLog(log.id);
                              setConfirmDeleteLogId(null);
                              onCopyFeedback(`"${log.recipeTitle}" aus Verlauf entfernt.`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-95 touch-manipulation"
                          >
                            Löschen
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteLogId(null)}
                            className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#ECEBE8] text-[#7A7E7B] hover:text-[#2D3E40] border border-[#ECEBE8] text-xs font-semibold transition-colors cursor-pointer active:scale-95 touch-manipulation"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLogId(log.id)}
                          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-[#FAF9F6] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-[#ECEBE8] transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs shrink-0"
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
      <div className={`bg-white p-4 sm:p-6 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-3 sm:space-y-4 ${activeMobileTab !== 'achievements' ? 'hidden md:block' : ''}`}>
        {/* Header with summary & unlocked badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECEBE8] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FDF6F0] text-[#D35400]">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[#2D3E40] flex items-center gap-2">
                <span>Erfolge & Trophäen</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]">
                  {unlockedCount}/{achievements.length} freigeschaltet
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#7A7E7B] mt-0.5">
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
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none text-xs sm:text-sm">
          <button
            onClick={() => setAchievementTierFilter('all')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'all'
                ? 'bg-[#2D3E40] text-white border-[#2D3E40] shadow-2xs'
                : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
            }`}
          >
            Alle ({achievements.length})
          </button>
          <button
            onClick={() => setAchievementTierFilter('unlocked')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'unlocked'
                ? 'bg-[#4A7856] text-white border-[#4A7856] shadow-2xs'
                : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-white'
            }`}
          >
            ✓ Erreicht ({unlockedCount})
          </button>
          <button
            onClick={() => setAchievementTierFilter('bronze')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'bronze'
                ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            🌱 Bronze
          </button>
          <button
            onClick={() => setAchievementTierFilter('silver')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'silver'
                ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            🥈 Silber
          </button>
          <button
            onClick={() => setAchievementTierFilter('gold')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'gold'
                ? 'bg-yellow-600 text-white border-yellow-600 shadow-2xs'
                : 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100'
            }`}
          >
            🥇 Gold
          </button>
          <button
            onClick={() => setAchievementTierFilter('diamond')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation active:scale-95 ${
              achievementTierFilter === 'diamond'
                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
            }`}
          >
            💎 Diamant
          </button>
          <button
            onClick={() => setAchievementTierFilter('insane')}
            className={`px-4 py-2.5 sm:py-2 rounded-xl font-extrabold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0 touch-manipulation active:scale-95 ${
              achievementTierFilter === 'insane'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-600" />
            <span>🔥 Insane ({insaneCount})</span>
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
                insane: { label: '🔥 Insane', bg: 'bg-rose-100 text-rose-700 border-rose-200 font-bold' },
              }[ach.tier];

              return (
                <div
                  key={ach.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                    ach.unlocked
                      ? ach.tier === 'insane'
                        ? 'bg-rose-50/70 border-rose-200 shadow-2xs'
                        : 'bg-[#F1F5F2] border-[#ECEBE8] shadow-2xs'
                      : 'bg-[#FAF9F6] border-[#ECEBE8] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="text-2xl sm:text-3xl shrink-0 p-1 bg-white rounded-lg border border-[#ECEBE8] shadow-2xs">
                    {ach.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-semibold text-xs sm:text-sm text-[#2D3E40] break-words whitespace-normal leading-snug">
                        {ach.title}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-md border shrink-0 font-medium ${tierBadge.bg}`}>
                        {tierBadge.label}
                      </span>
                    </div>

                    <p className="text-xs text-[#7A7E7B] leading-tight break-words whitespace-normal">
                      {ach.desc}
                    </p>

                    {/* Progress Bar & Counter */}
                    <div className="pt-0.5 space-y-0.5">
                      <div className="w-full bg-[#ECEBE8] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ach.unlocked
                              ? ach.tier === 'insane'
                                ? 'bg-rose-600'
                                : 'bg-[#4A7856]'
                              : ach.tier === 'insane'
                              ? 'bg-rose-400'
                              : 'bg-[#7A7E7B]'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#7A7E7B]">
                        <span className="font-medium">
                          {ach.unlocked
                            ? 'Erreicht ✓'
                            : `${Math.min(ach.current, ach.target).toLocaleString('de-DE')} / ${ach.target.toLocaleString('de-DE')} ${ach.unit}`}
                        </span>
                        <span className="font-bold text-[#2D3E40]">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-semibold text-[#2D3E40]">Kochdaten & Verlauf verwalten</h4>
            <p className="text-xs text-[#7A7E7B]">
              Möchtest du deinen bisherigen Kochverlauf und alle erfassten Ersparnisse zurücksetzen?
            </p>
          </div>
          <button
            id="clear-all-stats-btn"
            onClick={() => setShowConfirmModal(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs sm:text-sm border border-red-200 transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-2 shadow-2xs w-full sm:w-auto shrink-0"
            title="Statistik und Kochverlauf leeren (erfordert Bestätigung)"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Statistik leeren</span>
          </button>
        </div>
      )}
    </div>
  );
};

