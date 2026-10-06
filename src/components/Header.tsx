import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Utensils, 
  Sparkles, 
  Calendar, 
  ShoppingCart, 
  BarChart3, 
  Leaf, 
  Heart,
  Search,
  Users,
  Cloud
} from 'lucide-react';
import { SyncConfig } from '../lib/syncService';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { useSync } from '../context/SyncContext';

export type NavTab = 'recipes' | 'fridge' | 'planner' | 'shopping' | 'stats' | 'favorites';

export interface HeaderProps {
  favoritesCount?: number;
  shoppingCount?: number;
  shoppingListCount?: number;
  cookedCount?: number;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  syncConfig?: SyncConfig;
  onOpenSyncModal?: () => void;
  // Optional backwards compatibility if passed anywhere
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const syncCtx = useSync();

  // Directly determine active view via useLocation().pathname
  const getActiveTabFromLocation = (pathname: string): NavTab => {
    if (pathname === '/favorites') return 'favorites';
    if (pathname.startsWith('/fridge')) return 'fridge';
    if (pathname.startsWith('/planner')) return 'planner';
    if (pathname.startsWith('/shopping')) return 'shopping';
    if (pathname.startsWith('/stats')) return 'stats';
    return 'recipes';
  };

  const activeTab = getActiveTabFromLocation(location.pathname);
  const isExplorerRoute = location.pathname === '/' || location.pathname === '/favorites';

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const favoritesCount = props.favoritesCount ?? recipesCtx.favorites.length;
  const shoppingCount = props.shoppingCount ?? props.shoppingListCount ?? shoppingCtx.uncompletedCount;
  const cookedCount = props.cookedCount ?? recipesCtx.cookedLogs.length;
  const searchQuery = props.searchQuery !== undefined ? props.searchQuery : recipesCtx.filters.searchQuery;
  
  const setSearchQuery = props.setSearchQuery ?? ((q: string) => {
    recipesCtx.setFilters((prev) => ({ ...prev, searchQuery: q }));
    if (location.pathname !== '/' && location.pathname !== '/favorites') {
      navigate('/');
    }
  });

  const syncConfig = props.syncConfig ?? syncCtx.syncConfig;
  const onOpenSyncModal = props.onOpenSyncModal ?? syncCtx.openSyncModal;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ECEBE8]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18 gap-1.5 sm:gap-4">
          {/* Brand Logo & Name */}
          <div 
            id="brand-logo" 
            onClick={() => handleNavigate('/')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#4A7856] flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#2D3E40]">VeggieChef</span>
                <span className="hidden lg:inline-flex text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] border border-[#ECEBE8]">
                  Veggie & Vegan
                </span>
              </div>
              <p className="text-xs text-[#686E6A] hidden md:block">Smarte vegetarische Küche & Essensplanung</p>
            </div>
          </div>

          {/* Quick Search bar (hidden on explorer routes where the page has its own prominent search) */}
          {isExplorerRoute ? (
            <div className="flex-1" aria-hidden="true" />
          ) : (
          <div className="flex items-center relative flex-1 min-w-0 max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-sm mx-1 sm:mx-4 md:mx-6">
            <Search className="w-4 h-4 text-[#686E6A] absolute left-2.5 sm:left-3 pointer-events-none" />
            <input
              id="header-search-input"
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 sm:pl-9 pr-9 text-[16px] bg-white border border-[#ECEBE8] hover:border-[#4A7856]/50 rounded-full text-[#2D3E40] placeholder-[#686E6A] focus:outline-hidden focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] shadow-2xs transition-all truncate"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center text-xs text-[#686E6A] hover:text-[#2D3E40] hover:bg-black/5 active:bg-black/10 cursor-pointer touch-manipulation active:scale-95"
                title="Suche zurücksetzen"
                aria-label="Suche zurücksetzen"
              >
                ✕
              </button>
            )}
          </div>
          )}

          {/* Action Icons (Sync, Favorites, Shopping) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Family Sync Status Button */}
            {onOpenSyncModal && (
              <button
                id="header-sync-modal-btn"
                type="button"
                onClick={onOpenSyncModal}
                className={`flex items-center gap-1 sm:gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer touch-manipulation active:scale-95 ${
                  syncConfig?.mode === 'family' && syncConfig?.groupId
                    ? 'bg-[#F1F5F2] text-[#4A7856] border-[#4A7856]/40 shadow-2xs hover:bg-[#e4ede6]'
                    : 'bg-white text-[#2D3E40] border-[#ECEBE8] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
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
                    <Users className="w-5 h-5 text-[#4A7856]" />
                    <span className="hidden sm:inline font-medium truncate max-w-[80px]">
                      {syncConfig.groupName || syncConfig.groupId}
                    </span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-5 h-5 text-[#686E6A]" />
                    <span className="hidden sm:inline font-normal">Sync</span>
                  </>
                )}
              </button>
            )}

            {/* Favorites Icon Button - 44x44px touch target (w-11 h-11), 20px icon (w-5 h-5) */}
            <button
              id="nav-tab-favorites"
              type="button"
              onClick={() => handleNavigate('/favorites')}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-[#686E6A] hover:bg-[#F1F5F2] hover:text-[#D35400] transition-colors border cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'favorites' ? 'bg-[#FDF6F0] text-[#D35400] border-[#F5EADF]' : 'bg-white sm:bg-transparent border-[#ECEBE8] sm:border-transparent'
              }`}
              title="Gespeicherte Favoriten"
            >
              <Heart className={`w-5 h-5 ${favoritesCount > 0 && activeTab === 'favorites' ? 'fill-[#D35400] text-[#D35400]' : ''}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#D35400] text-white rounded-full text-xs font-semibold flex items-center justify-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Shopping List Quick Icon Button - 44x44px touch target (w-11 h-11), 20px icon (w-5 h-5) */}
            <button
              id="nav-tab-shopping-badge"
              type="button"
              onClick={() => handleNavigate('/shopping')}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-[#686E6A] hover:bg-[#F1F5F2] hover:text-[#4A7856] transition-colors border cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'shopping' ? 'bg-[#F1F5F2] text-[#4A7856] border-[#4A7856]/30' : 'bg-white sm:bg-transparent border-[#ECEBE8] sm:border-transparent'
              }`}
              title="Liste"
            >
              <ShoppingCart className="w-5 h-5" />
              {shoppingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4A7856] text-white rounded-full text-xs font-semibold flex items-center justify-center shadow-xs">
                  {shoppingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center space-x-1.5 sm:space-x-2 py-2 sm:py-2 overflow-x-auto scrollbar-none border-t border-[#ECEBE8] -mx-1 px-1">
          <button
            id="nav-tab-recipes"
            type="button"
            onClick={() => handleNavigate('/')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-sm sm:text-[15px] font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'recipes'
                ? 'bg-[#F1F5F2] text-[#4A7856] shadow-2xs'
                : 'text-[#686E6A] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
            }`}
          >
            <Utensils className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Rezept-Entdecker</span>
          </button>

          <button
            id="nav-tab-fridge"
            type="button"
            onClick={() => handleNavigate('/fridge')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-sm sm:text-[15px] font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'fridge'
                ? 'bg-[#F1F5F2] text-[#4A7856] shadow-2xs'
                : 'text-[#686E6A] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Vorratskammer & KI</span>
          </button>

          <button
            id="nav-tab-planner"
            type="button"
            onClick={() => handleNavigate('/planner')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-sm sm:text-[15px] font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'planner'
                ? 'bg-[#F1F5F2] text-[#4A7856] shadow-2xs'
                : 'text-[#686E6A] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
            }`}
          >
            <Calendar className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span>Wochenplaner</span>
          </button>

          <button
            id="nav-tab-stats"
            type="button"
            onClick={() => handleNavigate('/stats')}
            className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-sm sm:text-[15px] font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer active:scale-95 ${
              activeTab === 'stats'
                ? 'bg-[#F1F5F2] text-[#4A7856] shadow-2xs'
                : 'text-[#686E6A] hover:bg-[#FAF9F6] hover:text-[#2D3E40]'
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

export default Header;
