import React, { useState, useEffect, useMemo } from 'react';
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

export type AchievementFilterTier = 'all' | 'unlocked' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'insane';

interface StatsViewProps {
  logs: CookedLog[];
  setLogs: React.Dispatch<React.SetStateAction<CookedLog[]>>;
  favoritesCount: number;
  allRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onCopyFeedback: (msg: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  logs,
  setLogs,
  favoritesCount,
  allRecipes,
  onSelectRecipe,
  onCopyFeedback,
}) => {
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
    onCopyFeedback('Statistiken & Kochverlauf wurden geleert.');
  };

  const handleUndo = () => {
    if (undoBackup && undoBackup.length > 0) {
      setLogs(undoBackup);
      setUndoBackup(null);
      setShowUndoBanner(false);
      onCopyFeedback('Kochverlauf wiederhergestellt! 📊');
    }
  };

  const handleDeleteSingleLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    onCopyFeedback('Eintrag gelöscht.');
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold uppercase tracking-wider border border-[#ECEBE8]">
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
                <span className="px-2 py-0.5 rounded-full bg-[#FAF9F6] text-[#7A7E7B] border border-[#ECEBE8] text-xs font-bold">
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

              return (
                <div
                  key={log.id}
                  className="p-3 sm:p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#ECEBE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-white hover:border-[#DCDAD5]"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold text-[#2D3E40] text-xs sm:text-sm break-words whitespace-normal leading-snug">
                        {log.recipeTitle}
                      </span>
                      {log.isVegan ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] shrink-0">
                          🌱 Vegan
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-[#2D3E40] border border-[#ECEBE8] shrink-0">
                          🧀 Veggie
                        </span>
                      )}
                    </div>

                    {log.notes && (
                      <p className="text-xs text-[#7A7E7B] italic line-clamp-1">
                        "{log.notes}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-[#7A7E7B]">
                      <span>📅 {formattedDate}</span>
                      <span>👥 {log.servingsCooked || 2} Port.</span>
                      <span className="text-[#4A7856] font-medium">🌱 {log.savedCO2Kg} kg CO₂</span>
                      <span>💧 {log.savedWaterLiters.toLocaleString('de-DE')} L</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {matchedRecipe && (
                      <button
                        onClick={() => onSelectRecipe(matchedRecipe)}
                        className="px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-white hover:bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer min-h-[42px] sm:min-h-0 touch-manipulation active:scale-95"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Rezept</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteSingleLog(log.id)}
                      className="w-10.5 h-10.5 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white sm:bg-[#FAF9F6] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-[#ECEBE8] transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs shrink-0"
                      title="Eintrag entfernen"
                      aria-label="Eintrag entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]">
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

