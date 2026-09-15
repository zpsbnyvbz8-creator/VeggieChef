import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  CheckCheck, 
  Share2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  List,
  LayoutGrid,
  AlertTriangle,
  Pencil,
  Minus,
  X
} from 'lucide-react';
import { ShoppingItem, IngredientCategory } from '../types';
import { generateShoppingListText } from '../utils/helpers';
import { SyncConfig } from '../lib/syncService';
import { Users, Cloud } from 'lucide-react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface ShoppingListViewProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onCopyFeedback: (msg: string) => void;
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

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  items,
  setItems,
  onCopyFeedback,
  syncConfig,
  onOpenSyncModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<IngredientCategory>('sonstiges');
  const [viewMode, setViewMode] = useState<'categorized' | 'flat'>('categorized');
  const [undoBackup, setUndoBackup] = useState<ShoppingItem[] | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<string>('');
  const editContainerRef = useRef<HTMLDivElement | null>(null);
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    type: 'all' | 'completed';
  } | null>(null);

  useLockBodyScroll(Boolean(confirmDeleteState));

  // Auto-save & close editor on click/tap outside
  useEffect(() => {
    if (!editingItemId) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(e.target as Node)) {
        // Save automatically on outside tap/click
        saveEditedAmount(editingItemId);
      }
    };

    // Use mousedown and touchstart to catch outside tap anywhere on screen
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

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const startEditingItem = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    const combined = [item.amount, item.unit].filter(Boolean).join(' ').trim();
    setEditingAmountValue(combined);
  };

  const resetViewportZoom = () => {
    // Dismiss virtual keyboard and unfocus active input
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Snap mobile viewport scale back to 1.0
    if (typeof document !== 'undefined') {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        const original = viewport.getAttribute('content') || 'width=device-width, initial-scale=1.0, viewport-fit=cover';
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover');
        setTimeout(() => {
          viewport.setAttribute('content', original);
        }, 150);
      }
    }
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingAmountValue('');
    resetViewportZoom();
  };

  const saveEditedAmount = (itemId: string) => {
    const val = editingAmountValue.trim();
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (!val) {
          return { ...it, amount: '', unit: '' };
        }
        const match = val.match(/^([\d.,]+)\s*(.*)$/);
        if (match && match[1]) {
          const numStr = match[1];
          const unitStr = match[2] || '';
          return { ...it, amount: numStr, unit: unitStr };
        }
        return { ...it, amount: val, unit: '' };
      })
    );
    setEditingItemId(null);
    setEditingAmountValue('');
    resetViewportZoom();
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
    setUndoBackup(prevItems);
    setItems((prev) => prev.filter((item) => !item.completed));
    setShowUndoBanner(true);
    onCopyFeedback('Erledigte Artikel wurden von der Liste gelöscht.');
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    setUndoBackup([...items]);
    setItems([]);
    setShowUndoBanner(true);
    onCopyFeedback('Gesamte Einkaufsliste wurde geleert.');
  };

  const handleUndo = () => {
    if (undoBackup && undoBackup.length > 0) {
      setItems(undoBackup);
      setUndoBackup(null);
      setShowUndoBanner(false);
      onCopyFeedback('Einkaufsliste wiederhergestellt! 🛒');
    }
  };

  const markAllCompleted = () => {
    setItems((prev) => prev.map((item) => ({ ...item, completed: true })));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: `custom-shop-${Date.now()}`,
      name: newItemName.trim(),
      amount: newItemAmount.trim(),
      unit: '',
      category: newItemCategory,
      completed: false,
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemName('');
    setNewItemAmount('');
    setNewItemCategory('sonstiges');
    onCopyFeedback(`"${newItem.name}" zur Einkaufsliste hinzugefügt!`);
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
    onCopyFeedback('Einkaufsliste in Zwischenablage kopiert (fertig für WhatsApp / Notizen)!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Group items by category
  const grouped: Record<string, ShoppingItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || 'sonstiges';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const activeCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;

  // Flattened items sorted: active items first, then completed items
  const sortedFlatItems = [...items].sort((a, b) => {
    if (a.completed === b.completed) return a.name.localeCompare(b.name);
    return a.completed ? 1 : -1;
  });

  const renderItemRow = (item: ShoppingItem) => {
    const isEditing = editingItemId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (!isEditing) toggleItem(item.id);
        }}
        className={`flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all select-none gap-2.5 sm:gap-3 min-h-[60px] ${
          isEditing ? 'cursor-default ring-2 ring-[#4A7856]/40 bg-[#FAF9F6]' : 'cursor-pointer active:scale-[0.99]'
        } ${
          item.completed
            ? 'bg-[#FAF9F6] border-[#ECEBE8] text-[#7A7E7B]'
            : 'bg-white border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#2D3E40] shadow-2xs'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 pr-1">
          {/* Checkbox: großzügig dimensioniert (28px mobil), oben ausgerichtet bei mehrzeiligem Text */}
          <div
            className={`w-7 h-7 sm:w-6 sm:h-6 rounded-lg sm:rounded-md flex items-center justify-center border-2 sm:border transition-colors shrink-0 mt-0.5 sm:mt-0 ${
              item.completed
                ? 'bg-[#4A7856] border-[#4A7856] text-white'
                : 'border-[#D1D5D2] bg-[#FAF9F6]'
            }`}
          >
            {item.completed && <Check className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0">
            <span
              className={`text-base sm:text-sm font-medium block break-words whitespace-normal leading-snug ${
                item.completed ? 'line-through text-[#7A7E7B]' : 'text-[#2D3E40]'
              }`}
            >
              {item.name}
            </span>
            {item.recipeSource && (
              <span className="text-xs sm:text-[11px] text-[#7A7E7B] block break-words whitespace-normal mt-0.5">
                aus {item.recipeSource}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Inline-Mengen-Editor oder Mengen-Badge + Stift + Löschen */}
        <div
          className={`flex items-center gap-2 shrink-0 ${
            isEditing ? 'w-full sm:w-auto justify-end mt-2 sm:mt-0' : 'self-start sm:self-center ml-auto'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <div
              ref={editContainerRef}
              className="flex items-center gap-1.5 sm:gap-1.5 bg-white p-2 rounded-2xl border-2 border-[#4A7856] shadow-md animate-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                onClick={() => stepEditedAmount(-1)}
                className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-[#F1F5F2] hover:bg-[#E8EFEA] border border-[#ECEBE8] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                title="Menge verringern"
                aria-label="Menge verringern"
              >
                <Minus className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
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
                placeholder="Menge..."
                className="w-24 sm:w-24 px-2 py-1.5 sm:py-1 text-center text-[16px] sm:text-xs font-semibold text-[#2D3E40] bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl focus:border-[#4A7856] focus:outline-hidden"
              />

              <button
                type="button"
                onClick={() => stepEditedAmount(1)}
                className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-[#F1F5F2] hover:bg-[#E8EFEA] border border-[#ECEBE8] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                title="Menge erhöhen"
                aria-label="Menge erhöhen"
              >
                <Plus className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => saveEditedAmount(item.id)}
                className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                title="Menge speichern"
                aria-label="Menge speichern"
              >
                <Check className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#ECEBE8] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90"
                title="Abbrechen"
                aria-label="Abbrechen"
              >
                <X className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Reine Mengen-Anzeige ohne Klick-Aktion (Menge wird nur über den Stift bearbeitet) */}
              {item.amount ? (
                <span
                  className={`text-xs sm:text-xs font-semibold px-2.5 sm:px-2 py-1.5 sm:py-0.5 rounded-lg border select-none inline-flex items-center ${
                    item.completed
                      ? 'bg-[#ECEBE8] text-[#7A7E7B] border-[#ECEBE8]'
                      : 'bg-[#F1F5F2] text-[#4A7856] border-[#ECEBE8]'
                  }`}
                >
                  {item.amount} {item.unit}
                </span>
              ) : null}

              {/* Bearbeiten-Stift: Mobil extra groß (42x42px) für präzise Touch-Bedienung */}
              <button
                type="button"
                onClick={() => startEditingItem(item)}
                className="w-10.5 h-10.5 sm:w-8.5 sm:h-8.5 flex items-center justify-center rounded-xl bg-[#FAF9F6] text-[#4A7856] hover:bg-[#E8EFEA] border border-[#ECEBE8] transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs shrink-0"
                title="Menge bearbeiten"
                aria-label="Menge bearbeiten"
              >
                <Pencil className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
              </button>

              {/* Löschen: Mobil extra groß (42x42px) */}
              <button
                type="button"
                onClick={() => {
                  deleteItem(item.id);
                  onCopyFeedback(`"${item.name}" gelöscht.`);
                }}
                className="w-10.5 h-10.5 sm:w-8.5 sm:h-8.5 flex items-center justify-center rounded-xl bg-[#FAF9F6] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-[#ECEBE8] transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs shrink-0"
                title="Artikel löschen"
                aria-label="Artikel löschen"
              >
                <Trash2 className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
              </button>
            </>
          )}
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
            <span className="text-xs">Einkaufsliste geleert ({undoBackup.length} Artikel).</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              Rückgängig
            </button>
            <button
              onClick={() => setShowUndoBanner(false)}
              className="p-1 text-white/70 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#ECEBE8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-[11px] sm:text-xs font-semibold uppercase tracking-wider border border-[#ECEBE8]">
              <ShoppingCart className="w-3.5 h-3.5" />
              Einkaufsliste ({items.length} Artikel)
            </div>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
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
                    <span>Lokal • Mit Familie teilen?</span>
                  </>
                )}
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2D3E40] tracking-tight">
            Deine Einkaufsliste ({activeCount} offen)
          </h2>
          <p className="text-xs sm:text-sm text-[#7A7E7B]">
            Sortiert nach Supermarkt-Regalen oder als einfache Gesamtansicht.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('categorized')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg transition-all min-h-[40px] sm:min-h-0 cursor-pointer touch-manipulation active:scale-95 ${
                viewMode === 'categorized'
                  ? 'bg-white text-[#2D3E40] shadow-xs font-semibold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40]'
              }`}
              title="Nach Supermarkt-Regalen gruppiert"
            >
              <LayoutGrid className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Regale</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg transition-all min-h-[40px] sm:min-h-0 cursor-pointer touch-manipulation active:scale-95 ${
                viewMode === 'flat'
                  ? 'bg-white text-[#2D3E40] shadow-xs font-semibold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40]'
              }`}
              title="Alle Artikel in einer einfachen Liste"
            >
              <List className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          {/* Copy formatted text button */}
          <button
            id="copy-entire-shopping-list-btn"
            onClick={handleCopyFormattedList}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-3.5 py-2 sm:py-2 rounded-xl bg-[#2D3E40] hover:bg-[#1F2C2D] disabled:opacity-40 text-white font-medium text-xs shadow-xs transition-all min-h-[40px] sm:min-h-0 active:scale-95 touch-manipulation cursor-pointer"
            title="Kopiert die gesamte Liste gegliedert nach Gängen"
          >
            {copied ? <Check className="w-4 h-4 text-[#4A7856]" /> : <Copy className="w-4 h-4 text-white" />}
            <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
          </button>

          {/* Clear Completed */}
          {completedCount > 0 && (
            <button
              onClick={() => setConfirmDeleteState({ type: 'completed' })}
              className="flex items-center gap-1.5 px-3 sm:px-3 py-2 sm:py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#FBECE0] text-[#D35400] font-semibold text-xs border border-[#ECEBE8] transition-colors cursor-pointer min-h-[40px] sm:min-h-0 active:scale-95 touch-manipulation"
              title="Erledigte Artikel entfernen"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Erledigte ({completedCount})</span>
            </button>
          )}

          {/* Clear All with Undo */}
          {items.length > 0 && (
            <button
              id="clear-entire-shopping-list-btn"
              onClick={() => setConfirmDeleteState({ type: 'all' })}
              className="flex items-center gap-1.5 px-3 sm:px-3 py-2 sm:py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs border border-red-200 transition-colors cursor-pointer min-h-[40px] sm:min-h-0 active:scale-95 touch-manipulation"
              title="Die gesamte Liste auf einmal löschen"
            >
              <Trash2 className="w-4 h-4" />
              <span>Leeren</span>
            </button>
          )}
        </div>
      </div>

      {/* Add New Item Form */}
      <form
        onSubmit={handleAddItem}
        className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#ECEBE8] flex flex-col sm:flex-row gap-2 sm:gap-2.5 shadow-xs"
      >
        <input
          type="text"
          placeholder="Artikelname (z.B. Bio-Tofu, Basilikum, Hafermilch)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-[16px] sm:text-sm text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden focus:bg-white transition-all min-h-[44px] sm:min-h-0"
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Menge..."
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            className="w-24 sm:w-36 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3 py-2.5 sm:py-2 text-[16px] sm:text-sm text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden focus:bg-white transition-all min-h-[44px] sm:min-h-0"
          />

          {viewMode === 'categorized' && (
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as IngredientCategory)}
              className="flex-1 sm:flex-none bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl px-3 py-2.5 sm:py-2 text-[16px] sm:text-xs text-[#2D3E40] font-medium cursor-pointer focus:border-[#4A7856] focus:outline-hidden min-h-[44px] sm:min-h-0"
              title="Kategorie auswählen"
            >
              <option value="gemuese">🥦 Gemüse</option>
              <option value="kuehlregal">🥛 Kühlregal</option>
              <option value="huelsenfruechte">🫘 Hülsenfrüchte</option>
              <option value="trockenwaren">🌾 Vorrat</option>
              <option value="gewuerze">🧂 Gewürze</option>
              <option value="sonstiges">📦 Sonstiges</option>
            </select>
          )}

          <button
            type="submit"
            className="px-4 sm:px-5 py-2.5 bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition-colors min-h-[44px] sm:min-h-0 active:scale-95 touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Hinzufügen</span>
          </button>
        </div>
      </form>

      {/* Items Display: Either Categorized or Simple Flat List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#ECEBE8] space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#F1F5F2] text-[#4A7856] flex items-center justify-center mx-auto text-2xl border border-[#ECEBE8]">
            🛒
          </div>
          <h3 className="text-lg font-semibold text-[#2D3E40]">Deine Einkaufsliste ist leer</h3>
          <p className="text-xs text-[#7A7E7B] max-w-sm mx-auto">
            Füge Zutaten direkt aus den Rezepten oder dem Wochenplan hinzu, oder tippe oben eigene Artikel ein.
          </p>
        </div>
      ) : viewMode === 'flat' ? (
        /* Simple Flat View (Einfache Gesamtansicht) */
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#ECEBE8] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#ECEBE8] pb-3">
            <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm">
              <List className="w-4 h-4 text-[#4A7856]" />
              <span>Alle Zutaten auf einen Blick ({items.length} gesamt)</span>
            </div>
            <span className="text-xs font-medium text-[#7A7E7B]">
              {activeCount} offen, {completedCount} erledigt
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
            {sortedFlatItems.map(renderItemRow)}
          </div>
        </div>
      ) : (
        /* Categorized Display */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {(Object.keys(CATEGORY_META) as IngredientCategory[]).map((catKey) => {
            const catItems = grouped[catKey] || [];
            if (catItems.length === 0) return null;
            const meta = CATEGORY_META[catKey];

            return (
              <div
                key={catKey}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-[#ECEBE8] shadow-xs space-y-3"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-[#ECEBE8] pb-3">
                  <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm">
                    <span className="text-base">{meta.icon}</span>
                    <span>{meta.label}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#ECEBE8] text-[#7A7E7B]">
                    {catItems.length}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 sm:space-y-1.5">
                  {catItems.map(renderItemRow)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Bulk Deletion (Alle leeren oder erledigte entfernen) */}
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
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Sicherheitsabfrage
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3E40] leading-snug">
                  {confirmDeleteState.type === 'all'
                    ? 'Einkaufsliste wirklich leeren?'
                    : 'Erledigte Artikel entfernen?'}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#7A7E7B] leading-relaxed">
              {confirmDeleteState.type === 'all'
                ? `Bist du sicher, dass du alle ${items.length} Artikel von deiner Einkaufsliste löschen möchtest?`
                : `Bist du sicher, dass du alle ${completedCount} erledigten Artikel löschen möchtest?`}
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
