import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Leaf,
  Heart,
  ShoppingCart,
  Menu,
  Search,
  X,
  Utensils,
  Refrigerator,
  Calendar,
  BarChart3,
  User,
  Cloud,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { useShopping } from '../context/ShoppingContext';
import { useSync } from '../context/SyncContext';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

export type NavTab = 'recipes' | 'fridge' | 'planner';

export interface HeaderProps {
  /** Wird true, sobald Suche oder Menü offen sind (verhindert das Ausblenden beim Scrollen). */
  onPinnedChange?: (pinned: boolean) => void;
}

interface HeaderTab {
  id: NavTab;
  label: string;
  path: string;
}

const HEADER_TABS: HeaderTab[] = [
  { id: 'recipes', label: 'Entdecker', path: '/' },
  { id: 'fridge', label: 'Vorratskammer', path: '/fridge' },
  { id: 'planner', label: 'Wochenplaner', path: '/planner' },
];

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  big?: boolean;
  onClick?: () => void;
  badge?: number;
  status?: string;
  connected?: boolean;
  placeholder?: boolean;
}

/** Menü-Zeile: groß & fett für Hauptbereiche (20–22 px), normal für „Mehr" (16–17 px). */
const MenuRow: React.FC<MenuRowProps> = ({
  icon: Icon,
  label,
  big,
  onClick,
  badge,
  status,
  connected,
  placeholder,
}) => (
  <button
    type="button"
    onClick={placeholder ? undefined : onClick}
    aria-disabled={placeholder || undefined}
    tabIndex={placeholder ? -1 : undefined}
    className={`flex items-center gap-3 w-full text-left rounded-xl transition-colors ${
      big ? 'min-h-[52px] px-3 text-[20px] font-bold' : 'min-h-[48px] px-3 text-[17px] font-medium'
    } ${
      placeholder
        ? 'opacity-55 cursor-not-allowed text-header-fg'
        : 'cursor-pointer text-header-fg hover:bg-card/40 hover:text-accent-hover'
    }`}
  >
    <Icon className={`${big ? 'w-[22px] h-[22px]' : 'w-5 h-5'} shrink-0 text-header-icon`} aria-hidden="true" />
    <span className="flex-1 truncate">{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-bold flex items-center justify-center leading-none">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {status !== undefined && (
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {connected && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />}
        <span className={connected ? 'text-accent' : 'text-text-muted'}>{status}</span>
      </span>
    )}
    {placeholder && <span className="text-xs text-text-muted whitespace-nowrap">Bald verfügbar</span>}
  </button>
);

export const Header: React.FC<HeaderProps> = ({ onPinnedChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const syncCtx = useSync();

  const isExplorerRoute = location.pathname === '/' || location.pathname === '/favorites';
  const activeTab: NavTab = location.pathname.startsWith('/fridge')
    ? 'fridge'
    : location.pathname.startsWith('/planner')
      ? 'planner'
      : 'recipes';

  const handleNavigate = useCallback(
    (path: string) => {
      if (location.pathname !== path) navigate(path);
    },
    [location.pathname, navigate]
  );

  const favoritesCount = recipesCtx.favorites.length;
  const shoppingCount = shoppingCtx.uncompletedCount;
  const searchQuery = recipesCtx.filters.searchQuery;

  const setSearchQuery = useCallback(
    (q: string) => {
      recipesCtx.setFilters((prev) => ({ ...prev, searchQuery: q }));
      // Von anderen Seiten führt die Suche zur Entdecker-Seite mit dem Begriff.
      if (location.pathname !== '/' && location.pathname !== '/favorites') {
        navigate('/');
      }
    },
    [recipesCtx, location.pathname, navigate]
  );

  /* ----------------------------- Suche ----------------------------- */
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const raf = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeSearch();
    }
  };

  // Schließen, sobald der Fokus das Suchpanel verlässt (nicht beim Klick in der Leiste/auf Funk).
  const handleSearchBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (searchPanelRef.current && !searchPanelRef.current.contains(next)) {
      closeSearch();
    }
  };

  /* ----------------------------- Menü ----------------------------- */
  const menuRef = useRef<HTMLDialogElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const touchStartY = useRef(0);

  useLockBodyScroll(isMenuOpen);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
    menuRef.current?.showModal();
  }, []);
  const closeMenu = useCallback(() => menuRef.current?.close(), []);

  // Zustand synchron halten (Esc / Scrim / X → natives close-Event).
  useEffect(() => {
    const dialog = menuRef.current;
    const onClose = () => setIsMenuOpen(false);
    dialog?.addEventListener('close', onClose);
    return () => dialog?.removeEventListener('close', onClose);
  }, []);

  const go = useCallback(
    (path: string) => {
      closeMenu();
      handleNavigate(path);
    },
    [closeMenu, handleNavigate]
  );

  const openSyncFromMenu = useCallback(() => {
    closeMenu();
    syncCtx.openSyncModal();
  }, [closeMenu, syncCtx]);

  // Suche/Menü offen → Header ist „gepinnt" und wird beim Scrollen nicht ausgeblendet.
  useEffect(() => {
    onPinnedChange?.(isSearchOpen || isMenuOpen);
  }, [isSearchOpen, isMenuOpen, onPinnedChange]);

  const syncConfig = syncCtx.syncConfig;
  const isFamilyConnected = syncConfig?.mode === 'family' && Boolean(syncConfig.groupId);

  /* ------------------------------ UI ------------------------------ */
  return (
    <header className="vc-header-root relative z-40">
      {/* Zeile 1: Logo + Tabs (ab md) + Aktionen – Zitronen-/Aprikosenfläche mit Blattmotiv */}
      <div className="relative bg-header-top">
        <div
          aria-hidden="true"
          className="vc-leaf-pattern absolute inset-0 opacity-10 pointer-events-none"
        />
        <div className="relative mx-auto w-full max-w-[1280px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 lg:px-8 h-14 md:h-16">
          {/* Wortmarke */}
          <button
            id="brand-logo"
            type="button"
            onClick={() => handleNavigate('/')}
            aria-label="VeggieChef – zur Startseite"
            className="flex items-center gap-2 shrink-0 cursor-pointer touch-manipulation active:scale-95 transition-transform"
          >
            <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-accent text-on-accent flex items-center justify-center shadow-xs shrink-0">
              <Leaf className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
            </span>
            <span className="hidden min-[380px]:inline text-xl md:text-2xl font-extrabold tracking-tight text-header-icon leading-none">
              VeggieChef
            </span>
          </button>

          {/* Desktop-Tabs (eine Zeile ab 768 px) */}
          <nav aria-label="Hauptbereiche" className="hidden md:flex items-center gap-0.5 ml-2">
            {HEADER_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  type="button"
                  onClick={() => handleNavigate(tab.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center h-10 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                    active ? 'text-accent-hover' : 'text-header-fg hover:text-accent-hover'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex-1" aria-hidden="true" />

          {/* Aktionen: Lupe · Herz · Einkaufswagen · Menü (je ≥ 44×44) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              id="header-search-btn"
              type="button"
              onClick={openSearch}
              aria-label="Suche öffnen"
              title="Suchen"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <Search className="w-6 h-6" aria-hidden="true" />
            </button>

            <button
              id="nav-tab-favorites"
              type="button"
              onClick={() => handleNavigate('/favorites')}
              aria-label={favoritesCount > 0 ? `Favoriten, ${favoritesCount} gespeichert` : 'Favoriten'}
              title="Favoriten"
              className="relative w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <Heart className="w-6 h-6" aria-hidden="true" />
              {favoritesCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D35400] text-on-accent text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-header-top">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-shopping-badge"
              type="button"
              onClick={() => handleNavigate('/shopping')}
              aria-label={shoppingCount > 0 ? `Einkaufsliste, ${shoppingCount} offen` : 'Einkaufsliste'}
              title="Einkaufsliste"
              className="relative w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <ShoppingCart className="w-6 h-6" aria-hidden="true" />
              {shoppingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-header-top">
                  {shoppingCount > 99 ? '99+' : shoppingCount}
                </span>
              )}
            </button>

            <button
              id="header-menu-btn"
              type="button"
              onClick={isMenuOpen ? closeMenu : openMenu}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              aria-label="Menü öffnen"
              title="Menü"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Zeile 2: drei Text-Tabs (nur mobil) */}
      <div className="md:hidden bg-header-panel">
        <nav aria-label="Hauptbereiche" className="max-w-[1280px] mx-auto flex px-3 sm:px-6">
          {HEADER_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-mobile-${tab.id}`}
                type="button"
                onClick={() => handleNavigate(tab.path)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex-1 min-w-0 min-h-[44px] flex items-center justify-center px-1 text-[15px] max-[380px]:text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                  active ? 'text-accent-hover' : 'text-header-fg hover:text-accent-hover'
                }`}
              >
                {tab.label}
                {active && (
                  <span aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-t-full bg-accent" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Übergang zum Inhalt: Fade (mobil & 768–1023) bzw. Trennlinie (≥ 1024) */}
      <div className="vc-header-fade md:hidden" aria-hidden="true" />
      <div className="vc-header-fade hidden md:block lg:hidden" aria-hidden="true" />
      <div className="hidden lg:block h-px bg-header-line" aria-hidden="true" />

      {/* Suchleiste: fährt unter der Tab-Zeile herunter (Tesla-Stil) */}
      {isSearchOpen && (
        <div
          ref={searchPanelRef}
          onBlur={handleSearchBlur}
          className="vc-search-panel absolute inset-x-0 top-full z-50"
        >
          <div className="bg-header-panel px-3 sm:px-6 lg:px-8 py-3 pb-4">
            <div className="max-w-[1280px] mx-auto flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-5 h-5 text-header-icon absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="header-search-input"
                  ref={searchInputRef}
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  aria-label="Rezepte durchsuchen"
                  placeholder={isExplorerRoute ? 'Rezept oder Zutat suchen …' : 'Suche nach Rezepten…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full h-12 pl-11 pr-12 rounded-2xl bg-card text-text-main placeholder:text-text-muted border border-header-line focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-xs transition-shadow [&::-webkit-search-cancel-button]:hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Suche leeren"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-accent-tint cursor-pointer touch-manipulation"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Suche schließen"
                title="Schließen"
                className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menü als natives Top-Sheet */}
      <dialog
        ref={menuRef}
        aria-label="Hauptmenü"
        className="vc-topsheet"
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchStartY.current < -40) closeMenu();
        }}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 pr-2 pl-5 border-b border-header-line">
          <span className="text-lg font-extrabold tracking-tight text-header-fg">Menü</span>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Menü schließen"
            className="w-11 h-11 rounded-full flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-2.5 sm:p-3 space-y-1">
          <nav aria-label="Hauptbereiche">
            <MenuRow icon={ShoppingCart} label="Einkaufswagen" big onClick={() => go('/shopping')} badge={shoppingCount} />
            <MenuRow icon={Refrigerator} label="Vorratskammer" big onClick={() => go('/fridge')} />
            <MenuRow icon={Calendar} label="Wochenplaner" big onClick={() => go('/planner')} />
            <MenuRow icon={BarChart3} label="Statistiken" big onClick={() => go('/stats')} />
          </nav>
          <div className="h-px bg-header-line my-2" role="separator" />
          <nav aria-label="Mehr">
            <MenuRow icon={User} label="Profil" placeholder />
            <MenuRow
              icon={Cloud}
              label="Synchronisation"
              onClick={openSyncFromMenu}
              status={isFamilyConnected ? syncConfig.groupName || 'Verbunden' : 'Lokal'}
              connected={isFamilyConnected}
            />
            <MenuRow icon={Settings} label="Einstellungen" placeholder />
            <MenuRow icon={SlidersHorizontal} label="Präferenzen" placeholder />
          </nav>
        </div>
      </dialog>
    </header>
  );
};

export default Header;