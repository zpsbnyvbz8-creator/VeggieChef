import React from 'react';
import { 
  Utensils, 
  Sparkles, 
  Calendar,
  CalendarDays, 
  ShoppingCart, 
  BarChart3, 
  Leaf, 
  Heart,
  ChefHat,
  Search,
  Users,
  Cloud
} from 'lucide-react';
import { SyncConfig } from '../lib/syncService';

interface HeaderProps {
  activeTab: 'recipes' | 'fridge' | 'planner' | 'shopping' | 'stats' | 'favorites';
  setActiveTab: (tab: 'recipes' | 'fridge' | 'planner' | 'shopping' | 'stats' | 'favorites') => void;
  favoritesCount: number;
  shoppingCount?: number;
  shoppingListCount?: number;
  cookedCount: number;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  syncConfig?: SyncConfig;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  favoritesCount,
  shoppingCount,
  shoppingListCount,
  cookedCount,
  searchQuery = '',
  setSearchQuery = (_q: string) => {},
  syncConfig,
  onOpenSyncModal,
}) => {
  const actualShoppingCount = shoppingCount !== undefined ? shoppingCount : (shoppingListCount || 0);
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ECEBE8]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18 gap-1.5 sm:gap-4">
          {/* Brand Logo & Name */}
          <div 
            id="brand-logo" 
            onClick={() => setActiveTab('recipes')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#4A7856] flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-xl font-bold tracking-tight text-[#2D3E40]">VeggieChef</span>
                <span className="hidden lg:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]">
                  Veggie & Vegan
                </span>
              </div>
              <p className="text-xs text-[#7A7E7B] hidden md:block">Smarte vegetarische Küche & Essensplanung</p>
            </div>
          </div>

          {/* Quick Search bar (visible on all screens) */}
          {/* Search bar in middle */}
          <div className="flex items-center relative flex-1 min-w-0 max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-sm mx-1 sm:mx-4 md:mx-6">
            <Search className="w-4 h-4 text-[#7A7E7B] absolute left-2.5 sm:left-3 pointer-events-none" />
            <input
              id="header-search-input"
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 sm:pl-9 pr-7 text-xs sm:text-sm bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 rounded-full text-[#2D3E40] placeholder-[#7A7E7B] focus:outline-hidden focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] shadow-2xs transition-all truncate"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-xs text-[#7A7E7B] hover:text-[#2D3E40] p-1"
                title="Suche zurücksetzen"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Icons (Sync, Favorites, Shopping) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Family Sync Status Button */}
            {onOpenSyncModal && (
              <button
                id="header-sync-modal-btn"
                onClick={onOpenSyncModal}
                className={`flex items-center gap-1 sm:gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer touch-manipulation active:scale-95 ${
                  syncConfig?.mode === 'family' && syncConfig?.groupId
                    ? 'bg-[#F1F5F2] text-[#4A7856] border-[#4A7856]/40 shadow-2xs hover:bg-[#e4ede6]'
                    : 'bg-white text-[#7A7E7B] border-[#ECEBE8] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
                }`}
                title={
                  syncConfig?.mode === 'family' && syncConfig?.groupId
                    ? `Live synchronisiert mit ${syncConfig.groupName || syncConfig.groupId}`
                    : 'Familien-Synchronisation einrichten oder lokalen Modus verwalten'
                }
              >
                {syncConfig?.mode === 'family' && syncConfig?.groupId ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#4A7856] animate-pulse shrink-0" />
                    <Users className="w-4 h-4 text-[#4A7856]" />
                    <span className="hidden sm:inline font-medium truncate max-w-[80px]">
                      {syncConfig.groupName || syncConfig.groupId}
                    </span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-[#7A7E7B]" />
                    <span className="hidden sm:inline font-normal">Sync</span>
                  </>
                )}
              </button>
            )}

            {/* Favorites Icon Button (touch friendly 40x40px target) */}
            <button
              id="nav-tab-favorites"
              onClick={() => setActiveTab('favorites')}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-[#7A7E7B] hover:bg-[#F1F5F2] hover:text-[#D35400] transition-colors border border-transparent cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'favorites' ? 'bg-[#FDF6F0] text-[#D35400] border-[#F5EADF]' : 'bg-white sm:bg-transparent border-[#ECEBE8] sm:border-transparent'
              }`}
              title="Gespeicherte Favoriten"
            >
              <Heart className={`w-5 h-5 ${favoritesCount > 0 && activeTab === 'favorites' ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#D35400] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Shopping List Quick Icon Button (touch friendly 40x40px target) */}
            <button
              id="nav-tab-shopping-badge"
              onClick={() => setActiveTab('shopping')}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-[#7A7E7B] hover:bg-[#F1F5F2] hover:text-[#4A7856] transition-colors border border-transparent cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'shopping' ? 'bg-[#F1F5F2] text-[#4A7856] border-[#4A7856]/30' : 'bg-white sm:bg-transparent border-[#ECEBE8] sm:border-transparent'
              }`}
              title="Einkaufsliste"
            >
              <ShoppingCart className="w-5 h-5" />
              {actualShoppingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4A7856] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {actualShoppingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar - comfortably sized touch targets on mobile/tablet, sleek on desktop */}
        <nav className="flex items-center space-x-1.5 sm:space-x-2 py-2 sm:py-2 overflow-x-auto scrollbar-none border-t border-[#ECEBE8] -mx-1 px-1">
          <button
            id="nav-tab-recipes"
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'recipes'
                ? 'bg-[#F1F5F2] text-[#4A7856] font-semibold shadow-2xs'
                : 'text-[#7A7E7B] hover:bg-gray-50 hover:text-[#2D3E40]'
            }`}
          >
            <Utensils className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Rezept-Entdecker</span>
          </button>

          <button
            id="nav-tab-fridge"
            onClick={() => setActiveTab('fridge')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'fridge'
                ? 'bg-[#F1F5F2] text-[#4A7856] font-semibold shadow-2xs'
                : 'text-[#7A7E7B] hover:bg-gray-50 hover:text-[#2D3E40]'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Vorratskammer & KI</span>
          </button>

          <button
            id="nav-tab-planner"
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'planner'
                ? 'bg-[#F1F5F2] text-[#4A7856] font-semibold shadow-2xs'
                : 'text-[#7A7E7B] hover:bg-gray-50 hover:text-[#2D3E40]'
            }`}
          >
            <Calendar className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Wochenplaner</span>
          </button>

          <button
            id="nav-tab-shopping"
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'shopping'
                ? 'bg-[#F1F5F2] text-[#4A7856] font-semibold shadow-2xs'
                : 'text-[#7A7E7B] hover:bg-gray-50 hover:text-[#2D3E40]'
            }`}
          >
            <ShoppingCart className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Einkaufsliste</span>
            {actualShoppingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#4A7856] text-white text-[11px] sm:text-[10px] font-bold shrink-0">
                {actualShoppingCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 py-2 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'stats'
                ? 'bg-[#F1F5F2] text-[#4A7856] font-semibold shadow-2xs'
                : 'text-[#7A7E7B] hover:bg-gray-50 hover:text-[#2D3E40]'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Statistiken</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
