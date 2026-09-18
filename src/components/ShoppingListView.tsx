import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingCart, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  CheckCheck, 
  RotateCcw, 
  List, 
  LayoutGrid, 
  AlertTriangle, 
  Pencil, 
  Minus, 
  X,
  ChevronDown,
  Sparkles,
  Users,
  Cloud
} from 'lucide-react';
import { ShoppingItem, IngredientCategory } from '../types';
import { 
  generateShoppingListText, 
  detectIngredientCategory, 
  parseNaturalLanguageGroceryItem 
} from '../utils/helpers';
import { SyncConfig } from '../lib/syncService';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useShopping } from '../context/ShoppingContext';
import { useSync } from '../context/SyncContext';
import { useToast } from '../context/ToastContext';

interface ShoppingListViewProps {
  items?: ShoppingItem[];
  setItems?: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onCopyFeedback?: (msg: string) => void;
  syncConfig?: SyncConfig;
  onOpenSyncModal?: () => void;
}

const CATEGORY_META: Record<
  IngredientCategory,
  { label: string; icon: string; badgeColor: string }
> = {
  gemuese: { label: 'Frisches Gemüse & Kräuter', icon: '🥦', badgeColor: 'bg-[#F1F5F2] text-[#4A7856]' },
  kuehlregal: { label: 'Kühlregal & Pflanzliche Alternativen', icon: '🥛', badgeColor: 'bg-[#FAF9F6] text-[#2D3E40]' },
  huelsenfruechte: { label: 'Hülsenfrüchte & Tofu', icon: '🫘', badgeColor: 'bg-[#FDF6F0] text-[#D35400]' },
  trockenwaren: { label: 'Vorratskammer, Pasta & Getreide', icon: '🌾', badgeColor: 'bg-[#FAF9F6] text-[#7A7E7B]' },
  gewuerze: { label: 'Gewürze, Öle & Dips', icon: '🧂', badgeColor: 'bg-[#F1F5F2] text-[#2D3E40]' },
  sonstiges: { label: 'Sonstiges', icon: '📦', badgeColor: 'bg-[#FAF9F6] text-[#7A7E7B]' },
};

export const ShoppingListView: React.FC<ShoppingListViewProps> = (props) => {
  const shoppingCtx = useShopping();
  const syncCtx = useSync();
  const toastCtx = useToast();

  const items = props.items ?? shoppingCtx.items;
  const setItems = props.setItems ?? shoppingCtx.setItems;
  const onCopyFeedback = props.onCopyFeedback ?? toastCtx.showToast;
  const syncConfig = props.syncConfig ?? syncCtx.syncConfig;
  const onOpenSyncModal = props.onOpenSyncModal ?? syncCtx.openSyncModal;

  const [copied, setCopied] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState('');
  const [categoryChoice, setCategoryChoice] = useState<'auto' | IngredientCategory>('auto');
  const [viewMode, setViewMode] = useState<'categorized' | 'flat'>('categorized');
  
  // Undo & bulk clear states
  const [undoBackup, setUndoBackup] = useState<ShoppingItem[] | null>(null);
  const [lastDeletedInfo, setLastDeletedInfo] = useState<{ type: 'all' | 'completed'; count: number } | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // Stepper & Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<string>('');
  const editContainerRef = useRef<HTMLDivElement | null>(null);

  // Swipe-to-action mobile state
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Accordion states: completed section & categories
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Safety confirmation modal
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    type: 'all' | 'completed';
  } | null>(null);

  useLockBodyScroll(Boolean(confirmDeleteState));

  // Live parsed preview of natural language quick-add
  const parsedPreview = useMemo(() => {
    return parseNaturalLanguageGroceryItem(quickAddInput);
  }, [quickAddInput]);

  // Detected category from input
  const previewCategory: IngredientCategory = useMemo(() => {
    if (categoryChoice !== 'auto') return categoryChoice;
    return detectIngredientCategory(parsedPreview.name || quickAddInput);
  }, [categoryChoice, parsedPreview.name, quickAddInput]);

  // Auto-save & close inline stepper on click/tap outside
  useEffect(() => {
    if (!editingItemId) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(e.target as Node)) {
        saveEditedAmount(editingItemId);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [editingItemId, editingAmountValue]);

  // Auto-dismiss undo banner after 10 seconds
  useEffect(() => {
    if (showUndoBanner) {
      const timer = setTimeout(() => {
        setShowUndoBanner(false);
        setUndoBackup(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showUndoBanner]);

  // Group items by category
  const grouped = useMemo(() => {
    const map: Record<string, ShoppingItem[]> = {};
    items.forEach((item) => {
      const cat = item.category || 'sonstiges';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [items]);

  // Auto-collapse category when all items in it are completed
  useEffect(() => {
    (Object.keys(CATEGORY_META) as IngredientCategory[]).forEach((catKey) => {
      const catItems = grouped[catKey] || [];
      if (catItems.length > 0) {
        const allCompleted = catItems.every((it) => it.completed);
        if (allCompleted) {
          setCollapsedCategories((prev) => {
            if (prev[catKey]) return prev;
            return { ...prev, [catKey]: true };
          });
        }
      }
    });
  }, [grouped]);

  const activeCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
    if (swipedItemId === id) {
      setSwipedItemId(null);
    }
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (swipedItemId === id) {
      setSwipedItemId(null);
    }
  };

  const startEditingItem = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    const combined = [item.amount, item.unit].filter(Boolean).join(' ').trim();
    setEditingAmountValue(combined || '1');
    setSwipedItemId(null);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingAmountValue('');
  };

  const saveEditedAmount = (itemId: string) => {
    const val = editingAmountValue.trim();
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (!val) {
          return { ...it, amount: '', unit: '' };
        }
        const parsed = parseNaturalLanguageGroceryItem(val);
        if (parsed.amount) {
          return { ...it, amount: parsed.amount, unit: parsed.unit };
        }
        const match = val.match(/^([\d.,]+)\s*(.*)$/);
        if (match && match[1]) {
          return { ...it, amount: match[1], unit: match[2] || '' };
        }
        return { ...it, amount: val, unit: '' };
      })
    );
    setEditingItemId(null);
    setEditingAmountValue('');
    onCopyFeedback('Menge aktualisiert!');
  };

  const stepEditedAmount = (delta: number) => {
    const val = editingAmountValue.trim();
    const match = val.match(/^([\d.,]+)\s*(.*)$/);
    if (match && match[1]) {
      const parsedNum = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(parsedNum)) {
        let step = 1;
        if (parsedNum >= 100) step = 50;
        else if (parsedNum >= 20) step = 10;
        else if (parsedNum >= 10) step = 5;
        else if (parsedNum < 1 && parsedNum > 0) step = 0.5;

        const next = Math.max(0, Math.round((parsedNum + delta * step) * 10) / 10);
        const unit = match[2] || '';
        setEditingAmountValue(unit ? `${next} ${unit}` : `${next}`);
        return;
      }
    }
    if (!val) {
      setEditingAmountValue(delta > 0 ? '1' : '0');
    } else {
      setEditingAmountValue(delta > 0 ? `1 ${val}` : val);
    }
  };

  const clearCompleted = () => {
    const prevItems = [...items];
    const compItems = prevItems.filter((item) => item.completed);
    const count = compItems.length;
    if (count === 0) return;

    setUndoBackup(prevItems);
    setLastDeletedInfo({ type: 'completed', count });
    setItems((prev) => prev.filter((item) => !item.completed));
    setShowUndoBanner(true);
    onCopyFeedback(`${count} erledigte ${count === 1 ? 'Zutat' : 'Zutaten'} entfernt.`);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    const count = items.length;
    setUndoBackup([...items]);
    setLastDeletedInfo({ type: 'all', count });
    setItems([]);
    setShowUndoBanner(true);
    onCopyFeedback(`Einkaufsliste (${count} ${count === 1 ? 'Zutat' : 'Zutaten'}) geleert.`);
  };

  const handleUndo = () => {
    if (undoBackup && undoBackup.length > 0) {
      setItems(undoBackup);
      const count = lastDeletedInfo?.count || undoBackup.length;
      setUndoBackup(null);
      setLastDeletedInfo(null);
      setShowUndoBanner(false);
      onCopyFeedback(`${count} ${count === 1 ? 'Zutat' : 'Zutaten'} wiederhergestellt! 🛒`);
    }
  };

  // Smart Quick-Add: Natural language parsing for name, amount & unit
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickAddInput.trim();
    if (!raw) return;

    const parsed = parseNaturalLanguageGroceryItem(raw);
    const finalName = parsed.name || raw;
    const finalAmount = parsed.amount || '';
    const finalUnit = parsed.unit || '';

    const assignedCategory: IngredientCategory =
      categoryChoice === 'auto'
        ? detectIngredientCategory(finalName)
        : categoryChoice;

    const newItem: ShoppingItem = {
      id: `custom-shop-${Date.now()}`,
      name: finalName,
      amount: finalAmount,
      unit: finalUnit,
      category: assignedCategory,
      completed: false,
    };

    setItems((prev) => [...prev, newItem]);
    setQuickAddInput('');
    setCategoryChoice('auto');
    const catLabel = CATEGORY_META[assignedCategory]?.label || 'Sonstiges';
    const amountStr = [finalAmount, finalUnit].filter(Boolean).join(' ');
    onCopyFeedback(
      amountStr
        ? `"${finalName}" (${amountStr}) hinzugefügt (${catLabel})!`
        : `"${finalName}" hinzugefügt (${catLabel})!`
    );
  };

  const handleConfirmDeleteAction = () => {
    if (!confirmDeleteState) return;
    if (confirmDeleteState.type === 'all') {
      handleClearAll();
    } else if (confirmDeleteState.type === 'completed') {
      clearCompleted();
    }
    setConfirmDeleteState(null);
  };

  const handleCopyFormattedList = () => {
    const text = generateShoppingListText(items);
    navigator.clipboard.writeText(text);
    setCopied(true);
    onCopyFeedback('Einkaufsliste in die Zwischenablage kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategoryCollapse = (catKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Active & completed item partition
  const activeItems = useMemo(() => items.filter((i) => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.completed), [items]);

  // Clean Item Row: Visuelle Ruhe + Inline Stepper + Mobile Swipe-to-Action Gesten
  const renderItemRow = (item: ShoppingItem) => {
    const isEditing = editingItemId === item.id;
    const isSwiped = swipedItemId === item.id;

    return (
      <div
        key={item.id}
        className="relative overflow-hidden rounded-2xl select-none group touch-pan-y"
      >
        {/* Background Action Tray (revealed on swipe-left on mobile) */}
        <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-2 pl-4 z-0 bg-[#FAF9F6] border-y border-r border-[#ECEBE8] rounded-r-2xl">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSwipedItemId(null);
              startEditingItem(item);
            }}
            className="w-10 h-10 rounded-xl bg-white text-[#4A7856] hover:bg-[#E8EFEA] border border-[#ECEBE8] flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-xs"
            title="Menge anpassen"
            aria-label="Menge anpassen"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSwipedItemId(null);
              deleteItem(item.id);
              onCopyFeedback(`"${item.name}" gelöscht.`);
            }}
            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-xs"
            title="Artikel löschen"
            aria-label="Artikel löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Foreground Swipable Row with smooth touch gesture support */}
        <div
          onTouchStart={(e) => {
            if (isEditing) return;
            const touch = e.touches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current || isEditing) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = touch.clientY - touchStartRef.current.y;

            // Only recognize horizontal swipe if not scrolling vertically
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
              if (deltaX < -30) {
                setSwipedItemId(item.id);
              } else if (deltaX > 30) {
                setSwipedItemId(null);
              }
            }
          }}
          onTouchEnd={() => {
            touchStartRef.current = null;
          }}
          onClick={() => {
            if (isSwiped) {
              setSwipedItemId(null);
              return;
            }
            if (!isEditing) {
              toggleItem(item.id);
            }
          }}
          style={{
            transform: isSwiped ? 'translateX(-100px)' : 'translateX(0px)',
          }}
          className={`relative z-10 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ease-out gap-2.5 sm:gap-3 min-h-[58px] ${
            isEditing
              ? 'cursor-default ring-2 ring-[#4A7856]/40 bg-[#FAF9F6]'
              : 'cursor-pointer active:scale-[0.995]'
          } ${
            item.completed
              ? 'bg-[#FAF9F6] border-[#ECEBE8] text-[#7A7E7B]'
              : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#2D3E40] shadow-2xs'
          }`}
        >
          {/* Left: Checkbox & Item Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors shrink-0 ${
                item.completed
                  ? 'bg-[#4A7856] border-[#4A7856] text-white'
                  : 'border-[#D1D5D2] bg-[#FAF9F6]'
              }`}
            >
              {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span
                className={`text-base sm:text-sm font-medium block break-words whitespace-normal leading-tight ${
                  item.completed ? 'line-through text-[#7A7E7B]' : 'text-[#2D3E40]'
                }`}
              >
                {item.name}
              </span>
              {item.recipeSource && (
                <span className="text-[11px] text-[#7A7E7B] truncate">
                  aus {item.recipeSource}
                </span>
              )}
            </div>
          </div>

          {/* Right: Inline Stepper OR Pure Quantity Badge */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditing ? (
              /* Inline Stepper without modal */
              <div
                ref={editContainerRef}
                className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-[#4A7856] shadow-md animate-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  onClick={() => stepEditedAmount(-1)}
                  className="w-8 h-8 rounded-lg bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Menge verringern"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="text"
                  value={editingAmountValue}
                  onChange={(e) => setEditingAmountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEditedAmount(item.id);
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  autoFocus
                  placeholder="1 Stk"
                  className="w-18 sm:w-20 px-1.5 py-1 text-center text-xs font-semibold text-[#2D3E40] bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg focus:border-[#4A7856] focus:outline-hidden"
                />

                <button
                  type="button"
                  onClick={() => stepEditedAmount(1)}
                  className="w-8 h-8 rounded-lg bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Menge erhöhen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => saveEditedAmount(item.id)}
                  className="w-8 h-8 rounded-lg bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Speichern"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-8 h-8 rounded-lg text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#ECEBE8] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90"
                  title="Abbrechen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Visuelle Ruhe: Standardmäßig nur Mengen-Badge */
              <div className="flex items-center gap-1.5">
                {item.amount ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingItem(item);
                    }}
                    className={`text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-lg border select-none inline-flex items-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      item.completed
                        ? 'bg-[#ECEBE8] text-[#7A7E7B] border-[#ECEBE8]'
                        : 'bg-[#F1F5F2] text-[#4A7856] border-[#ECEBE8] hover:bg-[#E3ECE5]'
                    }`}
                    title="Menge anpassen (- / +)"
                  >
                    {item.amount} {item.unit}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingItem(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[11px] text-[#7A7E7B] hover:text-[#4A7856] px-2 py-0.5 rounded-md hover:bg-[#F1F5F2] border border-dashed border-[#ECEBE8] transition-all cursor-pointer"
                    title="Menge hinzufügen"
                  >
                    + Menge
                  </button>
                )}

                {/* Desktop hover actions (diskrete Hilfe auf dem PC) */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingItem(item);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FAF9F6] text-[#4A7856] hover:bg-[#E8EFEA] border border-[#ECEBE8] transition-all cursor-pointer active:scale-95"
                    title="Menge bearbeiten"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                      onCopyFeedback(`"${item.name}" gelöscht.`);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FAF9F6] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-[#ECEBE8] transition-all cursor-pointer active:scale-95"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Undo Floating Notification Banner */}
      {showUndoBanner && undoBackup && (
        <div className="p-3 sm:p-4 bg-[#2D3E40] text-white rounded-2xl shadow-lg border border-[#ECEBE8] flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4A7856] shrink-0" />
            <span className="text-xs">
              {lastDeletedInfo?.type === 'completed'
                ? `${lastDeletedInfo.count} erledigte ${lastDeletedInfo.count === 1 ? 'Zutat' : 'Zutaten'} entfernt.`
                : `Einkaufsliste geleert (${lastDeletedInfo?.count || undoBackup.length} ${lastDeletedInfo?.count === 1 ? 'Zutat' : 'Zutaten'}).`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Rückgängig
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="p-1 text-white/70 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls (Ohne redundante Badges) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-[#ECEBE8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status-Badge: Zeigt die aktiven Artikel ohne Wiederholung */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8]">
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>{activeCount} {activeCount === 1 ? 'Artikel' : 'Artikel'} offen</span>
            </div>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  syncConfig?.mode === 'family' && syncConfig?.groupId
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8] hover:bg-[#F1F5F2]'
                }`}
                title="Synchronisationseinstellungen öffnen"
              >
                {syncConfig?.mode === 'family' && syncConfig?.groupId ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <Users className="w-3 h-3 text-emerald-700" />
                    <span>Familie: {syncConfig.groupName || syncConfig.groupId}</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-[#7A7E7B]" />
                    <span>Lokal • Teilen</span>
                  </>
                )}
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
            Einkaufsliste
          </h2>
          <p className="text-xs sm:text-sm text-[#7A7E7B]">
            Sortiert nach Supermarkt-Regalen oder als Gesamtansicht mit intelligenter Schnelleingabe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          {/* 1. View-Switch: Segmented-Control mit sanfter Slide-Animation (Pill-Slider) */}
          <div className="relative flex items-center p-1 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs font-medium">
            {/* Sanft gleitende Pille */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-xs border border-[#ECEBE8] transition-all duration-250 ease-out pointer-events-none ${
                viewMode === 'categorized' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            />

            <button
              type="button"
              onClick={() => setViewMode('categorized')}
              className={`relative z-10 w-24 sm:w-26 flex items-center justify-center gap-1.5 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[38px] sm:min-h-0 ${
                viewMode === 'categorized'
                  ? 'text-[#2D3E40] font-semibold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40]'
              }`}
              title="Nach Supermarkt-Regalen gruppiert"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Regale</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`relative z-10 w-24 sm:w-26 flex items-center justify-center gap-1.5 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[38px] sm:min-h-0 ${
                viewMode === 'flat'
                  ? 'text-[#2D3E40] font-semibold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40]'
              }`}
              title="Alle Artikel in einer einfachen Liste"
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          {/* Formatted Text Copy Button */}
          <button
            id="copy-entire-shopping-list-btn"
            onClick={handleCopyFormattedList}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] disabled:opacity-40 text-white font-medium text-xs shadow-xs transition-all min-h-[40px] sm:min-h-0 active:scale-95 touch-manipulation cursor-pointer"
            title="Kopiert die Liste formatiert für WhatsApp & Notizen"
          >
            {copied ? <Check className="w-4 h-4 text-[#4A7856]" /> : <Copy className="w-4 h-4 text-white" />}
            <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
          </button>

          {/* Clear All Button */}
          {items.length > 0 && (
            <button
              id="clear-entire-shopping-list-btn"
              onClick={() => setConfirmDeleteState({ type: 'all' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs border border-red-200 transition-colors cursor-pointer min-h-[40px] sm:min-h-0 active:scale-95 touch-manipulation"
              title="Gesamte Liste leeren"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Leeren</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Smart Quick-Add Input (Natürliche Sprache: z.B. "400g Tofu", "2 Hafermilch", "1 Bund Petersilie") */}
      <form
        onSubmit={handleAddItem}
        className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] shadow-xs space-y-2"
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Schnell hinzufügen (z. B. „400g Tofu“, „2 Hafermilch“, „1 Bund Petersilie“)..."
              value={quickAddInput}
              onChange={(e) => setQuickAddInput(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-[16px] sm:text-sm text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden focus:bg-white transition-all min-h-[44px] sm:min-h-0"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Kategorie-Auswahl */}
            <select
              id="shopping-item-category-select"
              value={categoryChoice}
              onChange={(e) => setCategoryChoice(e.target.value as 'auto' | IngredientCategory)}
              className="bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-2.5 sm:px-3 py-2.5 sm:py-2 text-[15px] sm:text-xs text-[#2D3E40] font-semibold cursor-pointer focus:border-[#4A7856] focus:outline-hidden min-h-[44px] sm:min-h-0"
              title="Regal / Kategorie wählen"
            >
              <option value="auto">✨ Auto-Regal</option>
              <option value="gemuese">🥦 Gemüse</option>
              <option value="kuehlregal">🥛 Kühlregal</option>
              <option value="huelsenfruechte">🫘 Hülsenfrüchte</option>
              <option value="trockenwaren">🌾 Vorrat</option>
              <option value="gewuerze">🧂 Gewürze</option>
              <option value="sonstiges">📦 Sonstiges</option>
            </select>

            <button
              type="submit"
              disabled={!quickAddInput.trim()}
              className="px-4 sm:px-5 py-2.5 bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition-colors min-h-[44px] sm:min-h-0 active:scale-95 touch-manipulation cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Hinzufügen</span>
            </button>
          </div>
        </div>

        {/* Live-Erkennungs-Vorschau bei natürlicher Spracheingabe */}
        {quickAddInput.trim() && parsedPreview.amount && (
          <div className="flex items-center gap-2 text-xs text-[#4A7856] bg-[#F1F5F2] px-3 py-1.5 rounded-xl border border-[#ECEBE8] animate-in fade-in duration-150">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#4A7856]" />
            <span className="font-medium">
              Erkannt:{' '}
              <strong className="font-semibold text-[#2D3E40]">
                {parsedPreview.amount} {parsedPreview.unit}
              </strong>{' '}
              {parsedPreview.name || 'Artikel'}
            </span>
            <span className="text-[#7A7E7B]">•</span>
            <span className="text-[#7A7E7B]">
              Regal: {CATEGORY_META[previewCategory]?.label || 'Sonstiges'}
            </span>
          </div>
        )}
      </form>

      {/* Main Content Area */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#ECEBE8] space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center mx-auto text-2xl border border-[#ECEBE8]">
            🛒
          </div>
          <h3 className="text-lg font-semibold text-[#2D3E40]">Deine Einkaufsliste ist leer</h3>
          <p className="text-xs text-[#7A7E7B] max-w-sm mx-auto">
            Füge Zutaten direkt aus Rezepten oder dem Wochenplan hinzu, oder tippe oben z.B. „400g Tofu“ ein.
          </p>
        </div>
      ) : viewMode === 'flat' ? (
        /* Gesamtansicht (Liste) */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#ECEBE8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#ECEBE8] pb-3">
              <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm">
                <List className="w-4 h-4 text-[#4A7856]" />
                <span>Offene Artikel</span>
              </div>
              <span className="text-xs font-medium text-[#7A7E7B]">
                {activeItems.length} offen
              </span>
            </div>

            {activeItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                {activeItems.map(renderItemRow)}
              </div>
            ) : (
              <p className="text-xs text-[#7A7E7B] py-3 text-center italic">
                Alle Artikel sind abgehakt! 🎉
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 4. Regale-Ansicht: Einklappbare Accordion-Karten mit Auto-Collapse bei vollständiger Erledigung */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
          {(Object.keys(CATEGORY_META) as IngredientCategory[]).map((catKey) => {
            const catItems = grouped[catKey] || [];
            if (catItems.length === 0) return null;

            const meta = CATEGORY_META[catKey];
            const isCollapsed = Boolean(collapsedCategories[catKey]);
            const totalInCat = catItems.length;
            const completedInCat = catItems.filter((i) => i.completed).length;
            const allDone = totalInCat > 0 && completedInCat === totalInCat;
            const activeInCat = catItems.filter((i) => !i.completed);

            return (
              <div
                key={catKey}
                className={`bg-white rounded-2xl border border-[#ECEBE8] shadow-xs overflow-hidden transition-all duration-200 ${
                  allDone ? 'opacity-85' : 'opacity-100'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapse(catKey)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors cursor-pointer select-none hover:bg-[#FAF9F6]"
                >
                  <div className="flex items-center gap-2.5 font-semibold text-[#2D3E40] text-sm sm:text-base">
                    <span className="text-xl">{meta.icon}</span>
                    <span className="leading-tight">{meta.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Einziger, klarer Fortschrittszähler */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                        allDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#FAF9F6] text-[#7A7E7B] border-[#ECEBE8]'
                      }`}
                    >
                      {allDone
                        ? `✓ ${totalInCat}/${totalInCat} erledigt`
                        : `${completedInCat} / ${totalInCat} abgehakt`}
                    </span>

                    <ChevronDown
                      className={`w-4 h-4 text-[#7A7E7B] transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Accordion Content with smooth CSS height transition */}
                <div
                  className={`grid transition-all duration-250 ease-in-out ${
                    isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2 border-t border-[#ECEBE8] pt-3">
                      {activeInCat.length > 0 ? (
                        activeInCat.map(renderItemRow)
                      ) : (
                        <p className="text-xs text-[#7A7E7B] py-1.5 text-center italic">
                          Alle Artikel in diesem Regal sind erledigt.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Erledigte Items: Einklappbarer Bereich am Ende („Erledigt (X)“) */}
      {completedCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEBE8] overflow-hidden shadow-xs mt-6">
          <button
            type="button"
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className="w-full flex items-center justify-between p-4 sm:p-5 bg-[#FAF9F6] hover:bg-[#F5F4F0] text-left transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm sm:text-base">
              <CheckCheck className="w-4 h-4 text-[#4A7856]" />
              <span>Erledigt ({completedCount})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteState({ type: 'completed' });
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer mr-1"
                title="Erledigte Zutaten entfernen"
              >
                Entfernen
              </button>

              <ChevronDown
                className={`w-4 h-4 text-[#7A7E7B] transition-transform duration-200 ${
                  showCompletedSection ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <div
            className={`grid transition-all duration-250 ease-in-out ${
              showCompletedSection ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
            style={{
              gridTemplateRows: showCompletedSection ? '1fr' : '0fr',
              opacity: showCompletedSection ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              <div className="p-4 sm:p-5 space-y-2 border-t border-[#ECEBE8] bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                  {completedItems.map(renderItemRow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Deletion */}
      {confirmDeleteState && (
        <div 
          onClick={() => setConfirmDeleteState(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs touch-none overscroll-contain animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-[#ECEBE8] space-y-4 animate-in zoom-in-95 duration-200 overscroll-contain"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Sicherheitsabfrage
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3E40] leading-snug">
                  {confirmDeleteState.type === 'all'
                    ? 'Einkaufsliste wirklich leeren?'
                    : 'Erledigte Zutaten entfernen?'}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#7A7E7B] leading-relaxed">
              {confirmDeleteState.type === 'all'
                ? `Bist du sicher, dass du alle ${items.length} Zutaten von deiner Einkaufsliste löschen möchtest?`
                : `Bist du sicher, dass du alle ${completedCount} erledigten Zutaten löschen möchtest?`}
            </p>

            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2">
              <button
                id="cancel-delete-shopping-btn"
                type="button"
                onClick={() => setConfirmDeleteState(null)}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#ECEBE8] bg-white hover:bg-[#FAF9F6] text-[#2D3E40] font-semibold text-xs transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                id="confirm-delete-shopping-btn"
                type="button"
                onClick={handleConfirmDeleteAction}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Ja, wirklich löschen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
