import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Leaf,
  Heart,
  ShoppingCart,
  Search,
  X,
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
import { getActiveSheetFilters } from '../utils/discover';

export type NavTab = 'recipes' | 'fridge' | 'planner';

export interface HeaderProps {
  /** Wird true, sobald Suche oder Menü offen sind (verhindert das Ausblenden beim Scrollen). */
  onPinnedChange?: (pinned: boolean) => void;
  /** Vom Scroll-Wrapper gemeldet: Header ist komplett ausgeblendet (für Favoriten-Puls). */
  hidden?: boolean;
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

/* -------------------------------------------------------------------------- */
/* Suchfeld (Punkt 4): Lupe + Feld + Löschen + Filter-Icon + Schließen-Button. */
/* -------------------------------------------------------------------------- */
interface SearchFieldProps {
  fieldId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  placeholder: string;
  onValueChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filterCount: number;
  onFilterOpen: () => void;
  onClose: () => void;
}

const SearchField: React.FC<SearchFieldProps> = ({
  fieldId,
  inputRef,
  value,
  placeholder,
  onValueChange,
  onKeyDown,
  filterCount,
  onFilterOpen,
  onClose,
}) => (
  <div className="flex items-center gap-2 w-full">
    <div className="relative flex-1 min-w-0">
      <Search
        className="w-[18px] h-[18px] text-header-icon absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={fieldId}
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Rezepte durchsuchen"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="vc-search-input w-full h-11 pl-10 pr-[90px] rounded-xl bg-card border-2 border-header-line/70 focus:border-accent transition-colors text-text-main placeholder:text-text-muted shadow-2xs [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Suche leeren"
          className="absolute right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-accent-tint cursor-pointer touch-manipulation"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
      <button
        id="header-search-filter-btn"
        type="button"
        onClick={onFilterOpen}
        aria-label={filterCount > 0 ? `Filter öffnen, ${filterCount} aktiv` : 'Filter öffnen'}
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation ${
          filterCount > 0 ? 'text-accent' : 'text-text-muted hover:bg-accent-tint hover:text-text-main'
        }`}
      >
        <SlidersHorizontal className="w-5 h-5" aria-hidden="true" />
        {filterCount > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
        )}
      </button>
    </div>
    <button
      id="header-search-close-btn"
      type="button"
      onClick={onClose}
      aria-label="Suche schließen"
      title="Schließen"
      className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
    >
      <X className="w-5 h-5" aria-hidden="true" />
    </button>
  </div>
);

export const Header: React.FC<HeaderProps> = ({ onPinnedChange, hidden = false }) => {
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
  const activeFilterCount = useMemo(() => getActiveSheetFilters(recipesCtx.filters).length, [recipesCtx.filters]);
  const searchPlaceholder =
    location.pathname === '/favorites' ? 'In Favoriten suchen …' : 'Rezept oder Zutat suchen …';

  /* ----- Badge-Aktionen: Herz-Puls bei neuem Favoriten, Cart-Bump bei Zunahme ----- */
  const [heartPulse, setHeartPulse] = useState(0);
  const prevFavCount = useRef(favoritesCount);
  useEffect(() => {
    if (favoritesCount > prevFavCount.current && !hidden) {
      setHeartPulse((n) => n + 1);
    }
    prevFavCount.current = favoritesCount;
  }, [favoritesCount, hidden]);

  const [cartBump, setCartBump] = useState(0);
  const prevCartCount = useRef(shoppingCount);
  useEffect(() => {
    if (shoppingCount > prevCartCount.current) setCartBump((n) => n + 1);
    prevCartCount.current = shoppingCount;
  }, [shoppingCount]);

  const setSearchQuery = useCallback(
    (q: string) => {
      recipesCtx.setFilters((prev) => ({ ...prev, searchQuery: q }));
    },
    [recipesCtx]
  );

  /* ----------------------------- Suche ----------------------------- */
  const searchMobileRef = useRef<HTMLInputElement>(null);
  const searchDesktopRef = useRef<HTMLInputElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeSearch = useCallback((clear: boolean) => {
    setIsSearchOpen(false);
    if (clear) {
      recipesCtx.setFilters((prev) => ({ ...prev, searchQuery: '' }));
    }
  }, [recipesCtx]);

  const openSearch = useCallback(() => {
    setIsMenuOpen(false);
    menuRef.current?.close();
    setIsSearchOpen(true);
  }, []);

  // Beim Wechsel der Unterroute Suche zuklappen (Suchbegriff bleibt erhalten).
  useEffect(() => {
    setIsSearchOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const raf = requestAnimationFrame(() => {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      const el = isDesktop ? searchDesktopRef.current : searchMobileRef.current;
      el?.focus();
      el?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeSearch(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Tastatur ausblenden, Feld bleibt offen.
      e.currentTarget.blur();
      // Von Vorratskammer/Wochenplaner führt Enter zur Entdecker-Seite.
      if (!isExplorerRoute) navigate('/');
    }
  };

  const openFilterSheetFromHeader = useCallback(() => {
    if (!isExplorerRoute) navigate('/');
    recipesCtx.openFilterSheet();
  }, [isExplorerRoute, navigate, recipesCtx]);

  /* ----------------------------- Menü ----------------------------- */
  const menuRef = useRef<HTMLDialogElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const touchStartY = useRef(0);

  useLockBodyScroll(isMenuOpen);

  const openMenu = useCallback(() => {
    closeSearch(true);
    setIsMenuOpen(true);
    menuRef.current?.show();
  }, [closeSearch]);
  const closeMenu = useCallback(() => menuRef.current?.close(), []);

  // Zustand synchron halten + Fokus zurück zum Burger (nicht-modales Dialog:
  // Esc wird NICHT vom Browser behandelt – siehe handleMenuKeyDown).
  useEffect(() => {
    const dialog = menuRef.current;
    const onClose = () => {
      setIsMenuOpen(false);
      document.getElementById('header-menu-btn')?.focus();
    };
    dialog?.addEventListener('close', onClose);
    return () => dialog?.removeEventListener('close', onClose);
  }, []);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      const dialog = menuRef.current;
      if (!dialog) return;
      const focusables: HTMLElement[] = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

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
    <>
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

          {/* Desktop-Tabs (eine Zeile ab 768 px); im offenen Suchzustand wechselt das
              Feld per Crossfade an dieselbe Stelle. */}
          <div className="relative hidden md:block ml-2">
            <nav
              aria-label="Hauptbereiche"
              className={`flex items-center gap-0.5 transition-all duration-[220ms] ease-out ${
                isSearchOpen ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
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
            <div
              className={`absolute inset-0 flex items-center transition-all duration-[220ms] ease-out ${
                isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <SearchField
                fieldId="header-search-input-lg"
                inputRef={searchDesktopRef}
                value={searchQuery}
                placeholder={searchPlaceholder}
                onValueChange={setSearchQuery}
                onKeyDown={handleSearchKeyDown}
                filterCount={activeFilterCount}
                onFilterOpen={openFilterSheetFromHeader}
                onClose={() => closeSearch(true)}
              />
            </div>
          </div>

          <div className="flex-1" aria-hidden="true" />

          {/* Aktionen: Lupe · Herz · Einkaufswagen · Menü (je ≥ 44×44) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              id="header-search-btn"
              type="button"
              onClick={() => (isSearchOpen ? closeSearch(true) : openSearch())}
              aria-pressed={isSearchOpen}
              aria-label={isSearchOpen ? 'Suche schließen' : 'Suche öffnen'}
              title="Suchen"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                isSearchOpen ? 'bg-card/40 text-accent' : 'text-header-icon hover:bg-card/40'
              }`}
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
              <span
                key={heartPulse}
                className={`flex items-center justify-center ${heartPulse > 0 ? 'vc-icon-pulse' : ''}`}
              >
                <Heart className="w-6 h-6" aria-hidden="true" />
              </span>
            </button>

            <button
              id="nav-tab-shopping-badge"
              type="button"
              onClick={() => handleNavigate('/shopping')}
              aria-label={shoppingCount > 0 ? `Einkaufswagen, ${shoppingCount} Artikel` : 'Einkaufswagen'}
              title="Einkaufsliste"
              className="relative w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <ShoppingCart className="w-6 h-6" aria-hidden="true" />
              {shoppingCount > 0 && (
                <span
                  key={cartBump}
                  className={`absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent text-[11px] font-bold flex items-center justify-center leading-none ring-2 ring-header-top ${
                    cartBump > 0 ? 'vc-badge-bump' : ''
                  }`}
                >
                  {shoppingCount >= 10 ? '9+' : shoppingCount}
                </span>
              )}
            </button>

            <button
              id="header-menu-btn"
              type="button"
              onClick={isMenuOpen ? closeMenu : openMenu}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
              title={isMenuOpen ? 'Menü schließen' : 'Menü'}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              {/* Burger→X-Morph: Linien rotieren ±45°, Mitte blendet aus (Punkt 5) */}
              <span className="relative w-6 h-6 block" aria-hidden="true">
                <span
                  className={`vc-burger-line absolute left-0 w-6 h-[2px] rounded-full bg-current ${
                    isMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-[6px]'
                  }`}
                />
                <span
                  className={`vc-burger-line absolute left-0 top-1/2 -translate-y-1/2 w-6 h-[2px] rounded-full bg-current transition-[opacity] ${
                    isMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`vc-burger-line absolute left-0 w-6 h-[2px] rounded-full bg-current ${
                    isMenuOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-[6px]'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Zeile 2 (nur mobil): Tabs bzw. Suchfeld an derselben Stelle (Crossfade, kein Layoutsprung) */}
      <div className="md:hidden bg-header-panel">
        <div className="relative h-11 max-w-[1280px] mx-auto px-3 sm:px-6">
          <nav
            aria-label="Hauptbereiche"
            className={`absolute inset-0 flex items-stretch transition-all duration-[220ms] ease-out ${
              isSearchOpen ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
          >
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
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-t-full bg-accent"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          <div
            className={`absolute inset-0 flex items-center transition-all duration-[220ms] ease-out ${
              isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <SearchField
              fieldId="header-search-input"
              inputRef={searchMobileRef}
              value={searchQuery}
              placeholder={searchPlaceholder}
              onValueChange={setSearchQuery}
              onKeyDown={handleSearchKeyDown}
              filterCount={activeFilterCount}
              onFilterOpen={openFilterSheetFromHeader}
              onClose={() => closeSearch(true)}
            />
          </div>
        </div>
      </div>

      {/* Übergang zum Inhalt: Fade (mobil & 768–1023) bzw. Trennlinie (≥ 1024) */}
      <div className="vc-header-fade md:hidden" aria-hidden="true" />
      <div className="vc-header-fade hidden md:block lg:hidden" aria-hidden="true" />
      <div className="hidden lg:block h-px bg-header-line" aria-hidden="true" />

      {/* Menü als nicht-modales Top-Sheet unterhalb des Headers (Punkt 5):
          das einzige Schließen-Symbol ist der Burger→X-Morph im Header. */}
      <dialog
        ref={menuRef}
        aria-label="Hauptmenü"
        className="vc-topsheet"
        onKeyDown={handleMenuKeyDown}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchStartY.current < -40) closeMenu();
        }}
      >
        <div className="flex items-center h-12 sm:h-14 pl-5 pr-2 border-b border-header-line">
          <span className="text-lg font-extrabold tracking-tight text-header-fg">Menü</span>
        </div>
        {isMenuOpen && (
          <div className="p-2.5 sm:p-3 space-y-1">
            <nav aria-label="Hauptbereiche">
              {[
                { icon: ShoppingCart, label: 'Einkaufswagen', big: true, onClick: () => go('/shopping'), badge: shoppingCount },
                { icon: Refrigerator, label: 'Vorratskammer', big: true, onClick: () => go('/fridge') },
                { icon: Calendar, label: 'Wochenplaner', big: true, onClick: () => go('/planner') },
                { icon: BarChart3, label: 'Statistiken', big: true, onClick: () => go('/stats') },
              ].map((row, i) => (
                <div key={row.label} className="vc-menu-row" style={{ animationDelay: `${i * 30}ms` }}>
                  <MenuRow icon={row.icon} label={row.label} big={row.big} onClick={row.onClick} badge={row.badge} />
                </div>
              ))}
            </nav>
            <div className="h-px bg-header-line my-2 vc-menu-row" style={{ animationDelay: '120ms' }} role="separator" />
            <nav aria-label="Mehr">
              {[
                { icon: User, label: 'Profil', placeholder: true },
                {
                  icon: Cloud,
                  label: 'Synchronisation',
                  onClick: openSyncFromMenu,
                  status: isFamilyConnected ? syncConfig.groupName || 'Verbunden' : 'Lokal',
                  connected: isFamilyConnected,
                },
                { icon: Settings, label: 'Einstellungen', placeholder: true },
                { icon: SlidersHorizontal, label: 'Präferenzen', placeholder: true },
              ].map((row, i) => (
                <div key={row.label} className="vc-menu-row" style={{ animationDelay: `${(i + 4) * 30}ms` }}>
                  <MenuRow
                    icon={row.icon}
                    label={row.label}
                    placeholder={row.placeholder}
                    onClick={row.onClick}
                    status={row.status}
                    connected={row.connected}
                  />
                </div>
              ))}
            </nav>
          </div>
        )}
      </dialog>
    </header>

    {/* Scrim unter dem Header: Klick schließt das Menü (Punkt 5) */}
    {isMenuOpen && <div className="vc-menu-scrim" onClick={closeMenu} aria-hidden="true" />}
  </>
  );
};

export default Header;