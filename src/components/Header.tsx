import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Leaf,
  Compass,
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

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
  status?: string;
  connected?: boolean;
  placeholder?: boolean;
  tabIndex?: number;
}

/** Menü-Zeile: groß & fett für Hauptbereiche (20–22 px, 700), normal für Gruppe 2 (16–17 px, 500). */
const MenuRow: React.FC<MenuRowProps> = ({
  icon: Icon,
  label,
  big,
  isActive,
  onClick,
  badge,
  status,
  connected,
  placeholder,
  tabIndex,
}) => (
  <button
    type="button"
    onClick={placeholder ? undefined : onClick}
    aria-disabled={placeholder || undefined}
    aria-current={isActive ? 'page' : undefined}
    tabIndex={placeholder ? -1 : tabIndex}
    style={
      isActive
        ? { backgroundColor: 'color-mix(in oklab, var(--accent) 10%, transparent)' }
        : undefined
    }
    className={`flex items-center gap-3 w-full text-left rounded-xl transition-colors ${
      big
        ? 'min-h-[52px] px-3.5 text-[20px] sm:text-[21px] font-bold'
        : 'min-h-[46px] px-3.5 text-[16px] sm:text-[17px] font-medium'
    } ${
      placeholder
        ? 'opacity-55 cursor-not-allowed text-header-fg'
        : isActive
          ? 'text-header-active cursor-pointer'
          : 'cursor-pointer text-header-fg hover:bg-card/40 hover:text-accent-hover'
    }`}
  >
    <Icon
      className={`${big ? 'w-6 h-6' : 'w-5 h-5'} shrink-0 text-header-icon stroke-[1.8]`}
      strokeWidth={1.8}
      aria-hidden="true"
    />
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
  <div className="flex items-center gap-2 w-full h-[52px]">
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

/* -------------------------------------------------------------------------- */
/* Tab-Navigation mit gleitender Unterstreichung (Punkt 9.1): Ein gemeinsamer
   Indikator fährt per transform (~250 ms) zwischen den Tabs; Press-Feedback
   (Punkt 9.2) über .vc-press (nur Touch-Geräte). Scroll-top bei aktivem Tab
   übernimmt handleNavigate (Punkt 9.3). */
/* -------------------------------------------------------------------------- */
interface TabNavProps {
  tabs: HeaderTab[];
  active: NavTab | null;
  onNavigate: (path: string) => void;
  idPrefix: string;
  /** true → mobil (Zeile 2), false → Desktop (Zeile 1) */
  mobile?: boolean;
  /** Suche oder Menü offen → Nav ausgeblendet (Crossfade 180–200 ms) */
  hidden?: boolean;
}

const TabNav: React.FC<TabNavProps> = ({ tabs, active, onNavigate, idPrefix, mobile = false, hidden = false }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [ind, setInd] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx === -1) {
      setInd({ left: 0, width: 0 });
      return;
    }
    const el = refs.current[idx];
    if (!el) return;
    const spanEl = labelRefs.current[idx];
    const textWidth = spanEl ? spanEl.offsetWidth : el.offsetWidth;
    const width = textWidth + 16;
    const left = el.offsetLeft + (el.offsetWidth - width) / 2;
    setInd({ left, width });
  }, [tabs, active]);

  useIsomorphicLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  return (
    <nav
      aria-label="Hauptbereiche"
      className={`vc-fade-swap transition-all ease-out ${
        mobile ? 'absolute inset-0 flex items-stretch' : 'flex items-center gap-0.5'
      } ${hidden ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}
    >
      {tabs.map((tab, i) => {
        const isActive = active !== null && active === tab.id;
        return (
          <button
            key={tab.id}
            id={`${idPrefix}${tab.id}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            onClick={() => onNavigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={hidden ? -1 : undefined}
            className={`vc-press ${
              mobile
                ? 'flex-1 min-w-0 min-h-[52px] flex items-center justify-center px-1 text-[15px] max-[380px]:text-[14px]'
                : 'flex items-center h-10 px-3 text-sm'
            } font-semibold whitespace-nowrap rounded-lg cursor-pointer touch-manipulation ${
              isActive ? 'text-header-active' : 'text-header-fg hover:text-header-active'
            }`}
          >
            <span
              ref={(span) => {
                labelRefs.current[i] = span;
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[3px] rounded-full bg-accent vc-underline pointer-events-none ${
          active === null || ind.width === 0 ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ width: ind.width, transform: `translateX(${ind.left}px)` }}
      />
    </nav>
  );
};

export const Header: React.FC<HeaderProps> = ({ onPinnedChange, hidden = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recipesCtx = useRecipes();
  const shoppingCtx = useShopping();
  const syncCtx = useSync();

  const isExplorerRoute =
    location.pathname === '/' ||
    location.pathname === '/favorites' ||
    location.pathname === '/bookmarks' ||
    location.pathname === '/cooked';
  const isFavoritesRoute = location.pathname === '/favorites';
  const isShoppingRoute = location.pathname.startsWith('/shopping');

  const handleNavigate = useCallback(
    (path: string) => {
      if (location.pathname !== path) {
        navigate(path);
      } else {
        // Klick auf den aktiven Tab bzw. das Logo → sanft nach oben scrollen (Punkt 9.3).
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [location.pathname, navigate]
  );

  const favoritesCount = recipesCtx.favorites.length;
  const shoppingCount = shoppingCtx.uncompletedCount;
  const searchQuery = recipesCtx.filters.searchQuery;
  const activeFilterCount = useMemo(() => getActiveSheetFilters(recipesCtx.filters).length, [recipesCtx.filters]);
  const searchPlaceholder =
    location.pathname === '/favorites'
      ? 'In Favoriten suchen …'
      : location.pathname === '/bookmarks'
      ? 'In Merkliste suchen …'
      : location.pathname === '/cooked'
      ? 'In zuletzt gekocht suchen …'
      : 'Rezept oder Zutat suchen …';

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

  const activeTab: NavTab | null = isSearchOpen
    ? null
    : location.pathname === '/'
      ? 'recipes'
      : location.pathname.startsWith('/fridge')
        ? 'fridge'
        : location.pathname.startsWith('/planner')
          ? 'planner'
          : null;

  const closeSearch = useCallback((clear: boolean) => {
    setIsSearchOpen(false);
    if (clear) {
      recipesCtx.setFilters((prev) => ({ ...prev, searchQuery: '' }));
    }
  }, [recipesCtx]);

  /* ----------------------------- Menü ----------------------------- */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [menuContentHeight, setMenuContentHeight] = useState<number>(0);
  const headerRootRef = useRef<HTMLElement>(null);
  const stageMenuRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const el = stageMenuRef.current;
    if (!el) return;
    const updateHeight = () => {
      if (el) {
        setMenuContentHeight(el.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLockBodyScroll(isMenuOpen);

  const closeMenu = useCallback((returnFocus = true) => {
    setIsMenuOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => {
        document.getElementById('header-menu-btn')?.focus();
      });
    }
  }, []);

  const openMenu = useCallback(() => {
    // Ist die Suche offen und das Menü wird getippt, schließt die Suche zuerst (ohne Query zu leeren).
    if (isSearchOpen) {
      closeSearch(false);
    }
    setIsMenuOpen(true);
  }, [isSearchOpen, closeSearch]);

  const handleMenuToggle = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isMenuOpen, closeMenu, openMenu]);

  const openSearch = useCallback(() => {
    if (isMenuOpen) {
      closeMenu(false);
    }
    setIsSearchOpen(true);
  }, [isMenuOpen, closeMenu]);

  // Beim Wechsel der Unterroute Suche zuklappen (Suchbegriff bleibt erhalten) & Menü schließen
  useEffect(() => {
    setIsSearchOpen(false);
    if (isMenuOpen) {
      closeMenu(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Esc schließt die Suche auch, wenn das Feld nicht fokussiert ist.
  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSearchOpen, closeSearch]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const raf = requestAnimationFrame(() => {
      const isDesktopMatch = window.matchMedia('(min-width: 768px)').matches;
      const el = isDesktopMatch ? searchDesktopRef.current : searchMobileRef.current;
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
      e.currentTarget.blur();
      if (!isExplorerRoute) navigate('/');
    }
  };

  const openFilterSheetFromHeader = useCallback(() => {
    if (!isExplorerRoute) navigate('/');
    recipesCtx.openFilterSheet();
  }, [isExplorerRoute, navigate, recipesCtx]);

  // Fokusfalle im Header + Panel & Esc-Taste beim geöffneten Menü
  useEffect(() => {
    if (!isMenuOpen) return;

    // Initialer Fokus auf ersten interaktiven Menüeintrag
    const raf = requestAnimationFrame(() => {
      const firstMenuItem = document.querySelector<HTMLElement>(
        '#header-stage-menu button:not([aria-disabled="true"]):not([disabled])'
      );
      firstMenuItem?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
        return;
      }

      if (e.key === 'Tab') {
        const root = headerRootRef.current;
        if (!root) return;

        const focusables: HTMLElement[] = (
          Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not([disabled]):not([aria-disabled="true"]):not([tabindex="-1"]), [href], input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
            )
          ) as HTMLElement[]
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);

        if (focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !root.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  // Klicks außerhalb des Menüs (#header-stage-menu) und Menü-Buttons (#header-menu-btn) schließen das Menü sofort
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const stageMenuEl = document.getElementById('header-stage-menu');
      const menuBtnEl = document.getElementById('header-menu-btn');

      if (stageMenuEl?.contains(target) || menuBtnEl?.contains(target)) {
        return;
      }

      closeMenu();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMenuOpen, closeMenu]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current < -40) {
      closeMenu();
    }
  };

  const go = useCallback(
    (path: string) => {
      closeMenu(false);
      handleNavigate(path);
    },
    [closeMenu, handleNavigate]
  );

  const openSyncFromMenu = useCallback(() => {
    closeMenu(false);
    syncCtx.openSyncModal();
  }, [closeMenu, syncCtx]);

  // Suche/Menü offen → Header ist „gepinnt" und wird beim Scrollen nicht ausgeblendet.
  useEffect(() => {
    onPinnedChange?.(isSearchOpen || isMenuOpen);
  }, [isSearchOpen, isMenuOpen, onPinnedChange]);

  const syncConfig = syncCtx.syncConfig;
  const isFamilyConnected = syncConfig?.mode === 'family' && Boolean(syncConfig.groupId);

  const stageGroup1 = useMemo(
    () => [
      {
        icon: Compass,
        label: 'Entdecker',
        path: '/',
        isActive: location.pathname === '/',
        onClick: () => go('/'),
      },
      {
        icon: Refrigerator,
        label: 'Vorratskammer',
        path: '/fridge',
        isActive: location.pathname.startsWith('/fridge'),
        onClick: () => go('/fridge'),
      },
      {
        icon: Calendar,
        label: 'Wochenplaner',
        path: '/planner',
        isActive: location.pathname.startsWith('/planner'),
        onClick: () => go('/planner'),
      },
      {
        icon: ShoppingCart,
        label: 'Einkaufswagen',
        path: '/shopping',
        isActive: location.pathname.startsWith('/shopping'),
        badge: shoppingCount,
        onClick: () => go('/shopping'),
      },
    ],
    [go, location.pathname, shoppingCount]
  );

  const stageGroup2 = useMemo(
    () => [
      {
        icon: User,
        label: 'Profil',
        placeholder: true,
      },
      {
        icon: Cloud,
        label: 'Synchronisation',
        onClick: openSyncFromMenu,
        status: isFamilyConnected ? syncConfig?.groupName || 'Verbunden' : 'Lokal',
        connected: isFamilyConnected,
      },
      {
        icon: Settings,
        label: 'Einstellungen',
        placeholder: true,
      },
      {
        icon: SlidersHorizontal,
        label: 'Präferenzen',
        placeholder: true,
      },
      {
        icon: BarChart3,
        label: 'Statistiken',
        path: '/stats',
        isActive: location.pathname.startsWith('/stats'),
        onClick: () => go('/stats'),
      },
    ],
    [go, isFamilyConnected, openSyncFromMenu, syncConfig?.groupName, location.pathname]
  );

  /* ------------------------------ UI ------------------------------ */
  return (
    <>
      <header ref={headerRootRef} className="vc-header-root relative z-40">
        {/* Zeile 1: Logo + Tabs (ab md) + Aktionen – Zitronen-/Aprikosenfläche mit Blattmotiv */}
        <div className="relative bg-header-top">
          <div className="relative mx-auto w-full max-w-[1280px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 lg:px-8 h-14 md:h-16">
            {/* Wortmarke */}
            <button
              id="brand-logo"
              type="button"
              onClick={() => handleNavigate('/')}
              aria-label="VeggieChef – zur Startseite"
              className="vc-press flex items-center gap-2 shrink-0 cursor-pointer touch-manipulation"
            >
              <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-accent text-on-accent flex items-center justify-center shadow-xs shrink-0">
                <Leaf className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              </span>
              <span className="hidden min-[380px]:inline text-xl md:text-2xl font-extrabold tracking-tight text-header-fg leading-none">
                VeggieChef
              </span>
            </button>

            {/* Desktop-Tabs (eine Zeile ab 768 px); im offenen Suchzustand wechselt das
                Feld per Crossfade an dieselbe Stelle. Bei offenem Menü ausgeblendet. */}
            <div className="relative hidden md:block ml-2">
              <TabNav
                tabs={HEADER_TABS}
                active={activeTab}
                onNavigate={handleNavigate}
                idPrefix="nav-tab-"
                hidden={isSearchOpen || isMenuOpen}
              />
              <div
                className={`absolute left-0 inset-y-0 w-[480px] lg:w-[560px] max-w-[calc(100vw-380px)] flex items-center vc-fade-swap transition-all ease-out z-10 ${
                  isSearchOpen && !isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
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

            {/* Flexibler Zwischenraum */}
            <div className="flex-1 self-stretch relative min-w-6" aria-hidden="true">
              <div className="vc-leaf-pattern vc-leaf-fade absolute inset-y-0 left-0 right-0 opacity-[0.09] pointer-events-none" />
            </div>

            {/* Aktionen: Lupe · Herz · Einkaufswagen · Menü (je ≥ 44×44) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                id="header-search-btn"
                type="button"
                onClick={() => {
                  if (isSearchOpen) {
                    closeSearch(true);
                  } else {
                    openSearch();
                  }
                }}
                aria-pressed={isSearchOpen}
                aria-label={isSearchOpen ? 'Suche schließen' : 'Suche öffnen'}
                title="Suchen"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation vc-press ${
                  isSearchOpen ? 'bg-card/60 text-accent' : 'text-header-icon hover:bg-card/40'
                }`}
              >
                <Search className="w-6 h-6" aria-hidden="true" />
              </button>

              <button
                id="nav-tab-favorites"
                type="button"
                onClick={() => handleNavigate('/favorites')}
                aria-current={isFavoritesRoute ? 'page' : undefined}
                aria-label={favoritesCount > 0 ? `Favoriten, ${favoritesCount} gespeichert` : 'Favoriten'}
                title="Favoriten"
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation vc-press ${
                  isFavoritesRoute ? 'bg-card/60 text-favorite' : 'text-header-icon hover:bg-card/40'
                }`}
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
                aria-current={isShoppingRoute ? 'page' : undefined}
                aria-label={shoppingCount > 0 ? `Einkaufswagen, ${shoppingCount} Artikel` : 'Einkaufswagen'}
                title="Einkaufsliste"
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation vc-press ${
                  isShoppingRoute ? 'bg-card/60 text-accent' : 'text-header-icon hover:bg-card/40'
                }`}
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
                onClick={handleMenuToggle}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                aria-controls="header-stage-menu"
                aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
                title={isMenuOpen ? 'Menü schließen' : 'Menü'}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-header-icon hover:bg-card/40 transition-colors cursor-pointer touch-manipulation vc-press"
              >
                {/* Burger→X-Morph: Linien rotieren ±45°, Mitte blendet aus */}
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

        {/* Zone 2 (Bühne): 3 Zustände: 'tabs', 'search', 'menu' */}
        <div
          className={`w-full overflow-hidden transition-[height] duration-[var(--dur-base)] ease-[var(--ease-standard)] ${
            isMenuOpen
              ? 'flex justify-center bg-transparent pointer-events-none'
              : isDesktop
                ? 'pointer-events-none md:h-0'
                : 'bg-header-panel pointer-events-auto'
          }`}
          style={{
            height: isMenuOpen
              ? (menuContentHeight > 0 ? `${menuContentHeight}px` : 'auto')
              : (isDesktop ? '0px' : '52px'),
          }}
        >
          <div
            className={`w-full transition-[border-radius,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-standard)] ${
              isMenuOpen
                ? 'bg-header-panel rounded-b-[24px] shadow-2xl md:max-w-xl md:mx-auto pointer-events-auto'
                : 'bg-header-panel max-w-[1280px] mx-auto'
            }`}
          >
            <div className="relative w-full">
              {/* Zustand 1 & 2: mobil Tabs (~52px) bzw. Suchfeld (~52px) */}
              <div
                className={`w-full h-[52px] px-3 sm:px-6 relative flex items-center transition-all duration-[180ms] ease-[var(--ease-standard)] ${
                  !isMenuOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <TabNav
                  tabs={HEADER_TABS}
                  active={activeTab}
                  onNavigate={handleNavigate}
                  idPrefix="nav-tab-mobile-"
                  mobile
                  hidden={isSearchOpen || isMenuOpen}
                />
                <div
                  className={`absolute inset-x-3 sm:inset-x-6 inset-y-0 flex items-center transition-all duration-[180ms] ease-[var(--ease-standard)] ${
                    isSearchOpen && !isMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
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

              {/* Zustand 3: Menü in der Bühne (id="header-stage-menu") */}
              <div
                ref={stageMenuRef}
                id="header-stage-menu"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`absolute top-0 left-0 right-0 p-3 sm:p-4 space-y-1 max-h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain scrollbar-none transition-all duration-[180ms] ease-[var(--ease-standard)] ${
                  isMenuOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <nav aria-label="Hauptbereiche" className="space-y-1">
                  {stageGroup1.map((item, i) => (
                    <div
                      key={item.label}
                      className={isMenuOpen ? 'vc-menu-row' : ''}
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <MenuRow
                        icon={item.icon}
                        label={item.label}
                        big
                        isActive={item.isActive}
                        onClick={item.onClick}
                        badge={item.badge}
                        tabIndex={isMenuOpen ? 0 : -1}
                      />
                    </div>
                  ))}
                </nav>

                <div className="h-px bg-header-line my-2.5 mx-2" role="separator" />

                <nav aria-label="Weitere Optionen" className="space-y-1">
                  {stageGroup2.map((item, i) => (
                    <div
                      key={item.label}
                      className={isMenuOpen ? 'vc-menu-row' : ''}
                      style={{ animationDelay: `${(i + 4) * 25}ms` }}
                    >
                      <MenuRow
                        icon={item.icon}
                        label={item.label}
                        isActive={item.isActive}
                        placeholder={item.placeholder}
                        onClick={item.onClick}
                        status={item.status}
                        connected={item.connected}
                        tabIndex={isMenuOpen ? 0 : -1}
                      />
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Übergang zum Inhalt: Fade / Trennlinie wird bei offenem Menü NICHT gerendert */}
        {!isMenuOpen && (
          <>
            <div className="vc-header-fade md:hidden" aria-hidden="true" />
            <div className="vc-header-fade hidden md:block lg:hidden" aria-hidden="true" />
            <div className="hidden lg:block h-px bg-header-line" aria-hidden="true" />
          </>
        )}
      </header>

      {/* Scrim via Portal auf document.body: Tippen oder Wischen nach oben schließt */}
      {typeof document !== 'undefined' &&
        isMenuOpen &&
        createPortal(
          <div
            className="vc-menu-scrim"
            onClick={() => closeMenu()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-hidden="true"
          />,
          document.body
        )}
    </>
  );
};

export default Header;