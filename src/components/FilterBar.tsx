import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Clock,
  Utensils,
  Flame,
  Salad,
  ChefHat,
  Dumbbell,
  Sun,
  Cookie,
  Star,
  Leaf,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRecipes } from '../context/RecipeContext';
import {
  buildCategoryOptions,
  getActiveSheetFilters,
  SHEET_FILTER_DEFAULTS,
  SheetFilterKey,
} from '../utils/discover';

/**
 * Prioritätsreihenfolge für Desktop (wichtigste zuerst, am ehesten verzichtbare zuletzt).
 * Reicht der Platz in einer Zeile nicht aus, werden von hinten nach vorne die
 * unwichtigsten Tags ausgeblendet, sodass auf Desktop immer exakt eine Zeile entsteht.
 */
const DESKTOP_CATEGORY_PRIORITY: string[] = [
  'all',
  'Schnelle Küche',
  'Pasta & Gnocchi',
  'High Protein',
  'Bowls & Salate',
  'Ofengerichte',
  'Currys & Eintöpfe',
  'Frühstück & Süßes',
  'Snacks & Dips',
  'Festlich',
];

function getCategoryPriority(value: string): number {
  const idx = DESKTOP_CATEGORY_PRIORITY.indexOf(value);
  return idx === -1 ? DESKTOP_CATEGORY_PRIORITY.length : idx;
}

function getCategoryIcon(value: string) {
  switch (value) {
    case 'all':
      return <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Schnelle Küche':
    case 'Schnell':
      return <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Pasta & Gnocchi':
    case 'Pasta':
      return <Utensils className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Currys & Eintöpfe':
      return <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Bowls & Salate':
      return <Salad className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Ofengerichte':
      return <ChefHat className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'High Protein':
      return <Dumbbell className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Frühstück & Süßes':
      return <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Snacks & Dips':
      return <Cookie className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'Festlich':
      return <Star className="w-4 h-4 shrink-0" aria-hidden="true" />;
    default:
      return <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />;
  }
}

function getFilterChipIcon(key: SheetFilterKey) {
  switch (key) {
    case 'diet':
      return <Leaf className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'maxTime':
      return <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'difficulty':
      return <ChefHat className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'maxCalories':
      return <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'minProtein':
      return <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'minFiber':
      return <Salad className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'selectedTags':
      return <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
}

/**
 * Discovery-Toolbar:
 * - Auf Mobile (< 640px): horizontal scrollbare Kategorie-Zeile mit allen Kategorien.
 * - Auf Desktop (>= 640px): exakt eine Zeile ohne Scrollbalken; je nach Bildschirmbreite
 *   werden die am wenigsten wichtigen Kategorien dynamisch ausgeblendet.
 * - Ausgewählte Tags nutzen den sekundären Akzent-Stil (wie der "Swipen"-Button).
 */
export const FilterBar: React.FC = () => {
  const { filters, setFilters, recipes } = useRecipes();

  const categories = useMemo(() => buildCategoryOptions(recipes), [recipes]);
  const allOptions = useMemo(() => [{ value: 'all', label: 'Alle' }, ...categories], [categories]);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);
  const [visibleValues, setVisibleValues] = useState<Set<string> | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRow = measureRowRef.current;
    if (!container || !measureRow) return;

    const GAP_PX = 8; // gap-2

    const recalculate = () => {
      if (typeof window === 'undefined') return;
      // Auf Mobile (< 640px) wird horizontal gescrollt -> alle Tags anzeigen
      if (window.innerWidth < 640) {
        setVisibleValues(null);
        return;
      }

      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      const chipNodes = Array.from(measureRow.children) as HTMLElement[];
      if (chipNodes.length !== allOptions.length) return;

      const widthMap = new Map<string, number>();
      allOptions.forEach((opt, idx) => {
        const w = Math.ceil(chipNodes[idx]?.getBoundingClientRect().width || 0);
        widthMap.set(opt.value, w);
      });

      // Sortiere Kandidaten nach Wichtigkeit (wichtigste zuerst, "am unnötigsten" zuletzt)
      const prioritized = [...allOptions].sort(
        (a, b) => getCategoryPriority(a.value) - getCategoryPriority(b.value)
      );

      const allowed = new Set<string>();
      let usedWidth = 0;

      // Aktuell ausgewählte Kategorie immer berücksichtigen, damit sie sichtbar bleibt
      const activeOpt = allOptions.find((o) => o.value === filters.category);
      if (activeOpt) {
        const activeWidth = widthMap.get(activeOpt.value) ?? 0;
        allowed.add(activeOpt.value);
        usedWidth += activeWidth;
      }

      for (const opt of prioritized) {
        if (allowed.has(opt.value)) continue;
        const w = widthMap.get(opt.value) ?? 0;
        const gap = allowed.size > 0 ? GAP_PX : 0;
        if (usedWidth + gap + w <= availableWidth) {
          allowed.add(opt.value);
          usedWidth += gap + w;
        }
      }

      setVisibleValues((prev) => {
        if (prev && prev.size === allowed.size && Array.from(allowed).every((v) => prev.has(v))) {
          return prev;
        }
        return allowed;
      });
    };

    recalculate();

    const ro = new ResizeObserver(() => recalculate());
    ro.observe(container);
    window.addEventListener('resize', recalculate);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalculate);
    };
  }, [allOptions, filters.category]);

  // Nach dem ersten Font-Load noch einmal nachmessen
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as any).fonts?.ready?.then(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }, []);

  const displayedOptions = useMemo(() => {
    if (!visibleValues) return allOptions;
    return allOptions.filter((opt) => visibleValues.has(opt.value));
  }, [allOptions, visibleValues]);

  const activeFilters = getActiveSheetFilters(filters);

  const removeFilter = (key: SheetFilterKey) =>
    setFilters((prev) => ({ ...prev, [key]: SHEET_FILTER_DEFAULTS[key] }));

  return (
    <div ref={containerRef} className="space-y-3 relative">
      {/* Unsichtbare Mess-Zeile für exakte Breitenberechnung auf Desktop */}
      <div
        ref={measureRowRef}
        aria-hidden="true"
        className="fixed -top-[9999px] left-0 invisible pointer-events-none flex items-center gap-2 whitespace-nowrap"
      >
        {allOptions.map((cat) => (
          <span
            key={`measure-${cat.value}`}
            className="h-10 px-4 rounded-full border text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2"
          >
            {getCategoryIcon(cat.value)}
            <span>{cat.label}</span>
          </span>
        ))}
      </div>

      {/* Category chips: Mobile horizontal scrollbar, Desktop exakt 1 Zeile */}
      <div className="-mx-3 sm:mx-0">
        <div
          role="group"
          aria-label="Kategorien"
          className="flex items-center gap-2 overflow-x-auto scrollbar-none px-3 sm:px-0 py-0.5 flex-nowrap sm:overflow-hidden mask-fade-x sm:[mask-image:none]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {displayedOptions.map((cat) => {
              const selected = filters.category === cat.value;
              return (
                <motion.button
                  layout="position"
                  key={cat.value}
                  id={`cat-filter-${cat.value}`}
                  type="button"
                  aria-pressed={selected}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat.value }))}
                  className={`relative h-10 px-4 rounded-full border text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors duration-200 cursor-pointer touch-manipulation ${
                    selected
                      ? 'bg-accent-tint border-accent/40 text-accent font-bold shadow-2xs'
                      : 'bg-card border-border text-text-main font-semibold hover:border-accent/40 hover:bg-accent-tint/60'
                  }`}
                >
                  <span className={`transition-transform duration-200 ${selected ? 'scale-105 text-accent' : ''}`}>
                    {getCategoryIcon(cat.value)}
                  </span>
                  <span>{cat.label}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Active filter chips */}
      <AnimatePresence initial={false}>
        {activeFilters.length > 0 && (
          <motion.div
            key="active-filters-row"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-0.5" aria-label="Aktive Filter">
              <AnimatePresence initial={false} mode="popLayout">
                {activeFilters.map((chip) => (
                  <motion.button
                    layout
                    key={chip.key}
                    type="button"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeFilter(chip.key)}
                    aria-label={`Filter entfernen: ${chip.label}`}
                    className="h-9 pl-3 pr-2 rounded-full bg-accent-tint border border-accent/35 text-accent text-xs font-bold flex items-center gap-1.5 hover:border-accent/60 transition-colors cursor-pointer"
                  >
                    {getFilterChipIcon(chip.key)}
                    <span>{chip.label}</span>
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                ))}
              </AnimatePresence>
              <motion.button
                layout
                id="reset-filters-btn"
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setFilters((prev) => ({ ...prev, ...SHEET_FILTER_DEFAULTS }))}
                className="h-9 px-2 text-xs font-bold text-text-muted hover:text-text-main underline-offset-2 hover:underline transition-colors cursor-pointer"
              >
                Alle zurücksetzen
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};