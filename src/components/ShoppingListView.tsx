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
  Cloud,
  GripVertical
} from 'lucide-react';
import { ShoppingItem, IngredientCategory } from '../types';
import { 
  generateShoppingListText, 
  detectIngredientCategory, 
  parseNaturalLanguageGroceryItem,
  mergeOrAddShoppingItem,
  areIngredientsEquivalent,
  loadFromLocalStorage,
  saveToLocalStorage,
  formatRecipeSource,
  safeCopyToClipboard
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
  { label: string; icon: string }
> = {
  gemuese: { label: 'Frisches Gemüse & Kräuter', icon: '🥦' },
  kuehlregal: { label: 'Kühlregal & Alternativen', icon: '🥛' },
  huelsenfruechte: { label: 'Hülsenfrüchte & Tofu', icon: '🫘' },
  trockenwaren: { label: 'Vorratskammer & Pasta', icon: '🌾' },
  gewuerze: { label: 'Gewürze, Öle & Dips', icon: '🧂' },
  sonstiges: { label: 'Sonstiges', icon: '📦' },
};

const DEFAULT_SHELF_ORDER: IngredientCategory[] = [
  'gemuese',
  'kuehlregal',
  'huelsenfruechte',
  'trockenwaren',
  'gewuerze',
  'sonstiges',
];

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

  // Shelf (Category) reorder state via drag and drop
  const [shelfOrder, setShelfOrder] = useState<IngredientCategory[]>(() =>
    loadFromLocalStorage('veggiechef_shelf_order', DEFAULT_SHELF_ORDER)
  );
  const [draggedShelf, setDraggedShelf] = useState<IngredientCategory | null>(null);
  const [dragOverShelf, setDragOverShelf] = useState<IngredientCategory | null>(null);

  // Item reorder state via drag and drop
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | null>(null);
  const [isDragOverDelete, setIsDragOverDelete] = useState(false);
  
  // Undo & bulk delete states
  const [undoBackup, setUndoBackup] = useState<ShoppingItem[] | null>(null);
  const [lastDeletedInfo, setLastDeletedInfo] = useState<{
    type: 'all' | 'completed' | 'category' | 'single';
    count: number;
    name?: string;
  } | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // Stepper & Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<string>('');
  const editContainerRef = useRef<HTMLDivElement | null>(null);

  // Swipe-to-action mobile state (iOS Full Swipe Delete & Reveal)
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [activeTouchItemId, setActiveTouchItemId] = useState<string | null>(null);
  const [touchCurrentOffset, setTouchCurrentOffset] = useState<number>(0);
  const touchStartRef = useRef<{ startX: number; startY: number; baseOffset: number; itemWidth?: number } | null>(null);
  const justClosedSwipeMenuRef = useRef<boolean>(false);
  const didSwipeRef = useRef<boolean>(false);
  const lastSwipedTimeRef = useRef<number>(0);
  const lastTouchOffsetRef = useRef<number>(0);

  // Auto-close swiped menu when tapping anywhere on the screen
  useEffect(() => {
    if (!swipedItemId) return;

    const handleGlobalTap = (e: MouseEvent | TouchEvent) => {
      // Wenn das Menü erst vor kurzem (< 400ms) aufgeswipt wurde, nicht durch auslaufende Events schließen
      if (Date.now() - lastSwipedTimeRef.current < 400) {
        return;
      }
      const target = e.target as HTMLElement | null;
      // Falls auf einen Aktionsbutton im Menü geklickt wird, Aktion ausführen lassen
      if (target?.closest('[data-swipe-action="true"]')) {
        return;
      }
      // Ansonsten schließt jeder Klick/Tap irgendwo auf den Bildschirm das Menü
      setSwipedItemId(null);
      justClosedSwipeMenuRef.current = true;
      setTimeout(() => {
        justClosedSwipeMenuRef.current = false;
      }, 300);
    };

    // Leichte Verzögerung damit nicht das Loslassen des Touches sofort schließt
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleGlobalTap, true);
    }, 40);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleGlobalTap, true);
    };
  }, [swipedItemId]);

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

  const activeCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;

  // Active categories: Categories that have AT LEAST ONE uncompleted item.
  // When all items in a category are completed, it disappears completely from the shelves!
  const activeCategories = useMemo(() => {
    return shelfOrder.filter((catKey) => {
      const catItems = grouped[catKey] || [];
      return catItems.some((it) => !it.completed);
    });
  }, [shelfOrder, grouped]);

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

  // Leeren/Löschen der gesamten Einkaufsliste
  const handleDeleteAll = () => {
    if (items.length === 0) return;
    const count = items.length;
    setUndoBackup([...items]);
    setLastDeletedInfo({ type: 'all', count });
    setItems([]);
    setShowUndoBanner(true);
    onCopyFeedback(`Einkaufsliste (${count} ${count === 1 ? 'Zutat' : 'Zutaten'}) gelöscht.`);
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

  // Smart Quick-Add: Merges duplicates if same item name exists!
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

    const existingMatch = items.find(
      (it) => !it.completed && areIngredientsEquivalent(it.name, finalName)
    );

    setItems((prev) => mergeOrAddShoppingItem(prev, newItem));
    setQuickAddInput('');
    setCategoryChoice('auto');
    const catLabel = CATEGORY_META[assignedCategory]?.label || 'Sonstiges';

    if (existingMatch) {
      onCopyFeedback(`Menge für "${finalName}" erhöht!`);
    } else {
      const amountStr = [finalAmount, finalUnit].filter(Boolean).join(' ');
      onCopyFeedback(
        amountStr
          ? `"${finalName}" (${amountStr}) hinzugefügt (${catLabel})!`
          : `"${finalName}" hinzugefügt (${catLabel})!`
      );
    }
  };

  const handleConfirmDeleteAction = () => {
    if (!confirmDeleteState) return;
    if (confirmDeleteState.type === 'all') {
      handleDeleteAll();
    } else if (confirmDeleteState.type === 'completed') {
      clearCompleted();
    }
    setConfirmDeleteState(null);
  };

  const handleCopyFormattedList = async () => {
    const text = generateShoppingListText(items);
    await safeCopyToClipboard(text);
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

  // --- Drag and Drop: Regale (Kategorien) ---
  const handleDragStartShelf = (e: React.DragEvent, catKey: IngredientCategory) => {
    e.dataTransfer.setData('text/plain', catKey);
    setDraggedShelf(catKey);
  };

  const handleDragOverShelf = (e: React.DragEvent, _catKey: IngredientCategory) => {
    e.preventDefault();
  };

  const handleDropShelf = (e: React.DragEvent, targetCatKey: IngredientCategory) => {
    e.preventDefault();

    // 1. Wenn ein ARTIKEL auf ein Regal fallen gelassen wird:
    if (draggedItemId) {
      const item = items.find((i) => i.id === draggedItemId);
      if (item) {
        setItems((prev) =>
          prev.map((it) => (it.id === draggedItemId ? { ...it, category: targetCatKey } : it))
        );
        onCopyFeedback(`"${item.name}" in Regal "${CATEGORY_META[targetCatKey].label}" verschoben!`);
      }
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // 2. Wenn ein REGAL verschoben wird (alle dahinter rücken nach hinten):
    if (!draggedShelf || draggedShelf === targetCatKey) {
      setDraggedShelf(null);
      setDragOverShelf(null);
      return;
    }

    const remaining = shelfOrder.filter((k) => k !== draggedShelf);
    const toIdx = remaining.indexOf(targetCatKey);
    if (toIdx !== -1) {
      remaining.splice(toIdx, 0, draggedShelf);
      setShelfOrder(remaining);
      saveToLocalStorage('veggiechef_shelf_order', remaining);
      onCopyFeedback('Regale-Reihenfolge gespeichert!');
    }
    setDraggedShelf(null);
    setDragOverShelf(null);
  };

  // --- Drag and Drop: Items (Artikel) - Geschmeidiges Verschieben & Nachrücken ---
  const handleDragStartItem = (e: React.DragEvent, itemId: string) => {
    // Ein Item mit geöffnetem Menü oder solange ein Menü offen ist, kann nicht verschoben werden
    if (swipedItemId !== null) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(itemId);
  };

  const handleDragOverItem = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY > midY ? 'after' : 'before';

    if (dragOverItemId !== itemId || dragDropPosition !== pos) {
      setDragOverItemId(itemId);
      setDragDropPosition(pos);
    }
  };

  const handleDropItem = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDragDropPosition(null);
      return;
    }

    const draggedItem = items.find((i) => i.id === draggedItemId);
    const targetItem = items.find((i) => i.id === targetItemId);

    if (!draggedItem || !targetItem) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDragDropPosition(null);
      return;
    }

    // Falls auf ein Item einer anderen Kategorie gezogen, Kategorie übernehmen
    const updatedDraggedItem: ShoppingItem = {
      ...draggedItem,
      category: targetItem.category || draggedItem.category,
    };

    // Gezogenen Artikel aus Array filtern
    const remaining = items.filter((i) => i.id !== draggedItemId);
    // Position des Ziel-Items ermitteln
    const targetIndex = remaining.findIndex((i) => i.id === targetItemId);

    if (targetIndex !== -1) {
      // Vor oder nach dem Ziel-Item einfügen: sauberes Nachrücken aller Elemente
      const insertIndex = dragDropPosition === 'after' ? targetIndex + 1 : targetIndex;
      remaining.splice(insertIndex, 0, updatedDraggedItem);
      setItems(remaining);
      onCopyFeedback(`"${draggedItem.name}" verschoben!`);
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragDropPosition(null);
  };

  // Helper für Apple iOS Swipe-to-Delete
  const handleDeleteBySwipe = (item: ShoppingItem) => {
    setUndoBackup([...items]);
    setLastDeletedInfo({
      type: 'single',
      count: 1,
      name: item.name,
    });
    setShowUndoBanner(true);
    deleteItem(item.id);
    onCopyFeedback(`"${item.name}" gelöscht.`);
    setSwipedItemId(null);
    setActiveTouchItemId(null);
    setTouchCurrentOffset(0);
  };

  // --- Drag and Drop: Drop auf den "Löschen"-Button ---
  const handleDropOnDelete = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverDelete(false);

    // A. Regal (Kategorie) löschen
    if (draggedShelf) {
      const catKey = draggedShelf;
      const catMeta = CATEGORY_META[catKey];
      const itemsInCat = items.filter((it) => (it.category || 'sonstiges') === catKey);

      if (itemsInCat.length > 0) {
        setUndoBackup([...items]);
        setLastDeletedInfo({
          type: 'category',
          count: itemsInCat.length,
          name: catMeta?.label || catKey,
        });
        setItems((prev) => prev.filter((it) => (it.category || 'sonstiges') !== catKey));
        setShowUndoBanner(true);
        onCopyFeedback(
          `Regal "${catMeta?.label || catKey}" (${itemsInCat.length} ${
            itemsInCat.length === 1 ? 'Artikel' : 'Artikel'
          }) gelöscht.`
        );
      } else {
        onCopyFeedback(`Regal "${catMeta?.label || catKey}" ist bereits leer.`);
      }

      setDraggedShelf(null);
      setDragOverShelf(null);
      setDragDropPosition(null);
      return;
    }

    // B. Einzelnen Artikel löschen
    if (draggedItemId) {
      const item = items.find((it) => it.id === draggedItemId);
      if (item) {
        setUndoBackup([...items]);
        setLastDeletedInfo({
          type: 'single',
          count: 1,
          name: item.name,
        });
        setItems((prev) => prev.filter((it) => it.id !== draggedItemId));
        setShowUndoBanner(true);
        onCopyFeedback(`"${item.name}" gelöscht.`);
      }
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDragDropPosition(null);
      return;
    }

    setDraggedShelf(null);
    setDragOverShelf(null);
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragDropPosition(null);
  };

  // Active & completed item partition
  const activeItems = useMemo(() => items.filter((i) => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.completed), [items]);

  // Clean Item Row: Checkbox, Name, Desktop Actions LINKS von der Mengenangabe, Mengenangabe GANZ RECHTS, Drag Handle, iOS Full-Swipe
  const renderItemRow = (item: ShoppingItem) => {
    const isEditing = editingItemId === item.id;
    const isSwiped = swipedItemId === item.id;
    const isAnySwiped = swipedItemId !== null;
    const isBeingDragged = draggedItemId === item.id;
    const isDragOver = dragOverItemId === item.id;

    // Mobile Touch & Swipe Offset
    const isThisItemTouching = activeTouchItemId === item.id;
    const MENU_SWIPE_OFFSET = 124; // Großzügiger Abstand zwischen Stift und Item im geöffneten Menü
    const currentOffset = isThisItemTouching
      ? touchCurrentOffset
      : isSwiped
      ? -MENU_SWIPE_OFFSET
      : 0;

    // Mindestens 70% der Breite nach links ziehen, um direkt zu löschen
    const itemWidth = touchStartRef.current?.itemWidth || 360;
    const deleteThreshold = itemWidth * 0.7;
    const pullDistance = Math.max(0, -currentOffset);
    const isFullSwipeDelete = isThisItemTouching && pullDistance >= deleteThreshold;

    // Wenn weiter links geswipt wird als das geöffnete Menü (pullDistance > 124px)
    const isSwipingPastMenu = isThisItemTouching && pullDistance > MENU_SWIPE_OFFSET && !isFullSwipeDelete;
    const extraPull = isSwipingPastMenu ? pullDistance - MENU_SWIPE_OFFSET : 0;

    // Stift verblasst geschmeidig, sobald der Mülleimer sich verlängert
    const pencilOpacity = isSwipingPastMenu
      ? Math.max(0, 1 - extraPull / 24)
      : isFullSwipeDelete
      ? 0
      : 1;

    // Mülleimer wird dynamisch immer länger, bis er bei ~70% vollflächig wird
    const expandingTrashWidth = isSwipingPastMenu
      ? Math.min(itemWidth - 24, 44 + extraPull * 1.25)
      : 44;

    const recipeSourceText = formatRecipeSource(item.recipeSource);
    const hasSecondaryText = Boolean(recipeSourceText);

    return (
      <div
        key={item.id}
        data-swipe-item={item.id}
        draggable={!isEditing && !isSwiped && !isAnySwiped}
        onDragStart={(e) => handleDragStartItem(e, item.id)}
        onDragOver={(e) => handleDragOverItem(e, item.id)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverItemId === item.id) {
              setDragOverItemId(null);
              setDragDropPosition(null);
            }
          }
        }}
        onDrop={(e) => handleDropItem(e, item.id)}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverItemId(null);
          setDragDropPosition(null);
          setIsDragOverDelete(false);
        }}
        className={`relative overflow-hidden select-none group touch-pan-y transition-all ${
          isBeingDragged
            ? 'opacity-40 border-dashed border-[#4A7856]'
            : 'opacity-100'
        }`}
      >
        {/* Drop Insertion Line (Geschmeidige Vorschau ohne Layout-Shift) */}
        {isDragOver && dragDropPosition === 'before' && (
          <div className="absolute top-0 left-2 right-2 h-1 bg-[#4A7856] rounded-full z-30 pointer-events-none shadow-xs" />
        )}
        {isDragOver && dragDropPosition === 'after' && (
          <div className="absolute bottom-0 left-2 right-2 h-1 bg-[#4A7856] rounded-full z-30 pointer-events-none shadow-xs" />
        )}

        {/* Background Action Tray: Für Mobile-Swipe (nicht durch sm:hidden verstecken) */}
        <div
          className={`absolute inset-0 z-0 overflow-hidden flex items-center justify-end transition-[background-color,border-color] duration-150 ease-out ${
            isFullSwipeDelete
              ? 'bg-[#C93B2B]'
              : 'bg-[#FAF9F6] pr-2.5 pl-3'
          }`}
        >
          {isFullSwipeDelete ? (
            /* Apple Full-Swipe: Bei ~70% nimmt das dunklere Rot komplett den Background Space ein (Zeichen für Löschen) */
            <div className="flex items-center justify-end w-full px-6 gap-2.5 text-white font-semibold text-sm animate-in fade-in zoom-in-95 duration-150">
              <Trash2 className="w-5 h-5 stroke-[2.5] scale-110 transition-transform" />
              <span>Löschen</span>
            </div>
          ) : (
            /* Standard-Tray mit 44x44px Stift und dynamisch länger werdendem 44px Mülleimer */
            <div className="flex items-center justify-end gap-2 h-full">
              {/* Stift: Verblasst, wenn man über das Menü hinaus swipt */}
              <button
                data-swipe-action="true"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSwipedItemId(null);
                  startEditingItem(item);
                }}
                style={{
                  opacity: pencilOpacity,
                  transform: `scale(${0.85 + 0.15 * pencilOpacity})`,
                  pointerEvents: pencilOpacity < 0.2 ? 'none' : 'auto',
                  transition: isThisItemTouching ? 'none' : 'opacity 0.2s, transform 0.2s',
                }}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white text-[#4A7856] hover:bg-[#E8EFEA] border border-[#ECEBE8] flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 shadow-2xs shrink-0"
                title="Menge anpassen"
                aria-label="Menge anpassen"
              >
                <Pencil className="w-4.5 h-4.5" />
              </button>

              {/* Mülleimer: Mindestens 44px, wird dynamisch länger, je weiter man nach links zieht */}
              <button
                data-swipe-action="true"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBySwipe(item);
                }}
                style={{
                  width: isSwipingPastMenu ? `${expandingTrashWidth}px` : '44px',
                  transition: isThisItemTouching ? 'none' : 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s',
                }}
                className={`h-11 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-90 shadow-2xs shrink-0 transition-colors ${
                  isSwipingPastMenu
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 px-3'
                    : 'w-11 min-w-[44px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                }`}
                title="Artikel löschen"
                aria-label="Artikel löschen"
              >
                <Trash2 className="w-4.5 h-4.5 shrink-0 stroke-[2.2]" />
                {isSwipingPastMenu && expandingTrashWidth > 72 && (
                  <span className="text-xs font-semibold whitespace-nowrap animate-in fade-in duration-100">
                    Löschen
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Foreground Row */}
        <div
          onTouchStart={(e) => {
            if (isEditing) return;
            // Falls bereits ein anderes Menü offen ist, dieses zuerst schließen
            if (swipedItemId && swipedItemId !== item.id) {
              setSwipedItemId(null);
            }
            const touch = e.touches[0];
            const targetEl = e.currentTarget as HTMLElement;
            const width = targetEl.offsetWidth || window.innerWidth;
            touchStartRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              baseOffset: swipedItemId === item.id ? -MENU_SWIPE_OFFSET : 0,
              itemWidth: width,
            };
            lastTouchOffsetRef.current = swipedItemId === item.id ? -MENU_SWIPE_OFFSET : 0;
            didSwipeRef.current = false;
            setActiveTouchItemId(item.id);
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current || isEditing) return;
            const touch = e.touches[0];
            const diffX = touch.clientX - touchStartRef.current.startX;
            const diffY = touch.clientY - touchStartRef.current.startY;

            // Vertikales Scrollen durchlassen falls mehr vertikal als horizontal
            if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffX) < 10) {
              return;
            }

            if (Math.abs(diffX) > 8) {
              didSwipeRef.current = true;
            }

            const width = touchStartRef.current.itemWidth || 360;
            const rawOffset = touchStartRef.current.baseOffset + diffX;
            // Nach links swipen (bis zum linken Bildschirmrand: -width) und nach rechts mit Dämpfung (Rubber-Banding)
            let clamped: number;
            if (rawOffset > 0) {
              // Elastisches Rubber-Banding beim Ziehen nach rechts
              clamped = Math.min(15, rawOffset * 0.2);
            } else {
              clamped = Math.max(-width, rawOffset);
            }
            lastTouchOffsetRef.current = clamped;
            setTouchCurrentOffset(clamped);
          }}
          onTouchEnd={() => {
            if (!touchStartRef.current) return;
            const width = touchStartRef.current.itemWidth || 360;
            const deleteThreshold = width * 0.7; // Exakt ~70% der Breite
            const offset = lastTouchOffsetRef.current;
            touchStartRef.current = null;

            if (isThisItemTouching) {
              if (offset <= -deleteThreshold) {
                // Erst wenn bis ca. 70% der Breite gezogen wurde: direkt löschen
                handleDeleteBySwipe(item);
              } else if (offset < -40) {
                // Menü öffnet sich (-124px) mit angenehmer Lücke zum Stift
                setSwipedItemId(item.id);
                lastSwipedTimeRef.current = Date.now();
                setActiveTouchItemId(null);
                setTouchCurrentOffset(0);
              } else {
                // Unter 40px: geschmeidig zurückfedern (0px)
                setSwipedItemId(null);
                setActiveTouchItemId(null);
                setTouchCurrentOffset(0);
              }
            }
          }}
          onTouchCancel={() => {
            touchStartRef.current = null;
            setActiveTouchItemId(null);
            setTouchCurrentOffset(0);
            didSwipeRef.current = false;
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse' || isEditing) return;
            if ((e.target as HTMLElement).closest('button, input')) return;
            if (swipedItemId && swipedItemId !== item.id) {
              setSwipedItemId(null);
            }
            const targetEl = e.currentTarget as HTMLElement;
            const width = targetEl.offsetWidth || 360;
            touchStartRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              baseOffset: swipedItemId === item.id ? -MENU_SWIPE_OFFSET : 0,
              itemWidth: width,
            };
            lastTouchOffsetRef.current = swipedItemId === item.id ? -MENU_SWIPE_OFFSET : 0;
            didSwipeRef.current = false;
            setActiveTouchItemId(item.id);
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== 'mouse' || !touchStartRef.current || isEditing) return;
            const diffX = e.clientX - touchStartRef.current.startX;
            if (Math.abs(diffX) > 6) {
              didSwipeRef.current = true;
            }
            const width = touchStartRef.current.itemWidth || 360;
            const rawOffset = touchStartRef.current.baseOffset + diffX;
            const clamped = rawOffset > 0 ? Math.min(15, rawOffset * 0.2) : Math.max(-width, rawOffset);
            lastTouchOffsetRef.current = clamped;
            setTouchCurrentOffset(clamped);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'mouse' || !touchStartRef.current) return;
            const width = touchStartRef.current.itemWidth || 360;
            const deleteThreshold = width * 0.7;
            const offset = lastTouchOffsetRef.current;
            touchStartRef.current = null;

            if (offset <= -deleteThreshold) {
              handleDeleteBySwipe(item);
            } else if (offset < -40) {
              setSwipedItemId(item.id);
              lastSwipedTimeRef.current = Date.now();
              setActiveTouchItemId(null);
              setTouchCurrentOffset(0);
            } else {
              setSwipedItemId(null);
              setActiveTouchItemId(null);
              setTouchCurrentOffset(0);
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerType !== 'mouse') return;
            touchStartRef.current = null;
            setActiveTouchItemId(null);
            setTouchCurrentOffset(0);
            didSwipeRef.current = false;
          }}
          onClick={(e) => {
            // Wenn gerade erst geswipt wurde, den anschließenden Klick ignorieren (Menü bleibt offen!)
            if (Date.now() - lastSwipedTimeRef.current < 450 || didSwipeRef.current) {
              didSwipeRef.current = false;
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            // Wenn ein Menü bereits offen war und die Zeile angetippt wird: Menü schließen
            if (swipedItemId !== null) {
              e.preventDefault();
              e.stopPropagation();
              setSwipedItemId(null);
              return;
            }
            if (!isEditing) {
              toggleItem(item.id);
            }
          }}
          style={{
            transform: `translate3d(${currentOffset}px, 0, 0)`,
            transition: isThisItemTouching ? 'none' : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: isThisItemTouching ? 'transform' : 'auto',
          }}
          className={`relative z-10 w-full flex justify-between py-2.5 sm:py-3 px-3.5 sm:px-4 gap-2.5 sm:gap-3 min-h-[52px] sm:min-h-[46px] touch-pan-y transition-colors ${
            hasSecondaryText ? 'items-start' : 'items-center'
          } ${
            isEditing
              ? 'cursor-default bg-[#FAF9F6]'
              : item.completed
              ? 'cursor-pointer bg-white hover:bg-[#FAF9F6] text-[#7A7E7B]'
              : 'cursor-pointer bg-white hover:bg-[#FAF9F6] active:bg-[#F5F4F0] text-[#2D3E40]'
          }`}
        >
          {/* LEFT SIDE: Checkbox -> Name & Quelle */}
          <div className={`flex flex-1 min-w-0 gap-2.5 sm:gap-3 ${
            hasSecondaryText ? 'items-start' : 'items-center'
          }`}>
            {/* Square Checkbox Indicator: mt-0.5 verankert ihn bei Sekundärtext exakt neben der ersten Zeile */}
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors shrink-0 ${
                hasSecondaryText ? 'mt-0.5' : ''
              } ${
                item.completed
                  ? 'bg-[#4A7856] border-[#4A7856] text-white'
                  : 'border-[#D1D5D2] bg-white group-hover:border-[#4A7856]'
              }`}
            >
              {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
            </div>

            {/* Name & Quelle */}
            <div className={`flex-1 min-w-0 flex flex-col ${
              hasSecondaryText ? 'justify-start' : 'justify-center'
            }`}>
              <span
                className={`text-base font-medium block break-words leading-tight ${
                  item.completed ? 'line-through text-stone-400' : 'text-stone-800'
                }`}
              >
                {item.name}
              </span>
              {recipeSourceText && (
                <span 
                  className="text-[13px] font-normal text-stone-500 break-words leading-normal mt-0.5 line-clamp-2"
                  title={item.recipeSource}
                >
                  {recipeSourceText}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: [Desktop Actions: Pencil & Trash (LINKS)] -> [Menge (GANZ RECHTS) / Stepper] -> [Drag Handle] */}
          <div className={`flex items-center gap-2 shrink-0 ml-auto ${
            hasSecondaryText ? 'self-start mt-0.5' : 'self-center'
          }`} onClick={(e) => e.stopPropagation()}>
            {/* Desktop hover actions: LINKS von der Mengenangabe */}
            {!isEditing && (
              <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => startEditingItem(item)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FAF9F6] text-[#4A7856] hover:bg-[#E8EFEA] border border-[#ECEBE8] transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Menge bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteItem(item.id);
                    onCopyFeedback(`"${item.name}" gelöscht.`);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FAF9F6] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-[#ECEBE8] transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Menge ganz rechts / Inline Stepper */}
            {isEditing ? (
              /* Inline Stepper */
              <div
                ref={editContainerRef}
                className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-[#4A7856] shadow-md animate-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  onClick={() => stepEditedAmount(-1)}
                  className="w-7 h-7 rounded-lg bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Menge verringern"
                >
                  <Minus className="w-3 h-3" />
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
                  className="w-16 sm:w-18 px-1 py-0.5 text-center text-sm sm:text-base font-semibold text-[#2D3E40] bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg focus:border-[#4A7856] focus:outline-hidden"
                />

                <button
                  type="button"
                  onClick={() => stepEditedAmount(1)}
                  className="w-7 h-7 rounded-lg bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#2D3E40] flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Menge erhöhen"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => saveEditedAmount(item.id)}
                  className="w-7 h-7 rounded-lg bg-[#4A7856] hover:bg-[#3D6447] text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  title="Speichern"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-7 h-7 rounded-lg text-[#7A7E7B] hover:text-[#2D3E40] hover:bg-[#ECEBE8] flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90"
                  title="Abbrechen"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : item.amount ? (
              /* Mengenangabe ganz rechts: Exakt wie in der Rezept-Detailansicht (font-semibold tabular-nums text-[#4A7856]) */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingItem(item);
                }}
                className={`text-sm sm:text-base font-semibold tabular-nums select-none text-right transition-colors cursor-pointer touch-manipulation whitespace-nowrap px-1 py-0.5 rounded-sm hover:underline ${
                  item.completed
                    ? 'text-[#9BA19D] line-through opacity-60'
                    : 'text-[#4A7856] hover:text-[#3D6447]'
                }`}
                title="Menge anpassen (- / +)"
              >
                {item.amount} {item.unit}
              </button>
            ) : null}

            {/* Drag Handle am äußersten rechten Rand */}
            <div
              className={`p-1 transition-colors hidden sm:flex items-center justify-center ${
                isAnySwiped
                  ? 'text-[#E0E2E0] opacity-30 cursor-not-allowed pointer-events-none'
                  : 'text-[#B5B9B6] hover:text-[#2D3E40] cursor-grab active:cursor-grabbing'
              }`}
              title={isAnySwiped ? 'Verschieben gesperrt' : 'Gedrückt halten zum Verschieben'}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 lg:p-6 border border-[#ECEBE8] shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Einheitliches Status-Badge: Zeigt aktive Artikel ohne Redundanz */}
            <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F2] text-[#4A7856] text-xs font-semibold border border-[#ECEBE8] whitespace-nowrap">
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>{activeCount} offen</span>
            </div>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Einkaufsliste
          </h1>
          <p className="text-xs sm:text-sm font-medium text-stone-500">
            Alles für deine Woche – geordnet nach Supermarkt-Regal.
          </p>
        </div>

        {/* Unified Action Row: single horizontal row with consistent sizing and alignment */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#ECEBE8]">
          {/* Left side: View switcher ([ Regale ] / [ Liste ]) styled as cohesive segmented control pill */}
          <div className="relative flex items-center p-1 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-xs font-semibold select-none shadow-2xs h-[44px]">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#4A7856] rounded-lg shadow-xs transition-all duration-200 ease-out pointer-events-none ${
                viewMode === 'categorized' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            />

            <button
              type="button"
              onClick={() => setViewMode('categorized')}
              className={`relative z-10 px-3.5 sm:px-3 h-full flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation select-none ${
                viewMode === 'categorized'
                  ? 'text-white font-bold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40] font-medium'
              }`}
              title="Nach Supermarkt-Regalen gruppiert"
            >
              <LayoutGrid className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Regale</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`relative z-10 px-3.5 sm:px-3 h-full flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation select-none ${
                viewMode === 'flat'
                  ? 'text-white font-bold'
                  : 'text-[#7A7E7B] hover:text-[#2D3E40] font-medium'
              }`}
              title="Alle Artikel in einer sortierbaren Liste"
            >
              <List className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          {/* Right side: Unified matching neutral action buttons ([ Kopieren ] and [ Löschen ]) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="copy-entire-shopping-list-btn"
              type="button"
              onClick={handleCopyFormattedList}
              disabled={items.length === 0}
              className="h-[44px] px-3.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] text-[#2D3E40] hover:text-[#1F2C2D] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#FAF9F6] font-medium text-xs shadow-2xs transition-all active:scale-95 touch-manipulation cursor-pointer group"
              title="Kopiert die Liste formatiert für WhatsApp & Notizen"
            >
              {copied ? (
                <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#4A7856]" />
              ) : (
                <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#7A7E7B] group-hover:text-[#2D3E40] transition-colors" />
              )}
              <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>

            <button
              id="delete-entire-shopping-list-btn"
              type="button"
              onClick={() => {
                if (items.length > 0) {
                  setConfirmDeleteState({ type: 'all' });
                }
              }}
              onDragOver={(e) => {
                if (draggedShelf || draggedItemId) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (!isDragOverDelete) setIsDragOverDelete(true);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOverDelete(false);
              }}
              onDrop={handleDropOnDelete}
              disabled={items.length === 0 && !draggedShelf && !draggedItemId}
              className={`h-[44px] px-3.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl font-medium text-xs border transition-all select-none touch-manipulation group shadow-2xs ${
                isDragOverDelete
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400'
                  : items.length > 0
                  ? 'bg-[#FAF9F6] hover:bg-[#F1F5F2] text-[#2D3E40] hover:text-rose-700 border-[#ECEBE8] hover:border-rose-200 active:scale-95 cursor-pointer'
                  : 'bg-[#FAF9F6] text-[#A0A5A2] border-[#ECEBE8] opacity-40 cursor-not-allowed'
              }`}
              title={
                draggedShelf
                  ? 'Regal hier ablegen zum Löschen'
                  : draggedItemId
                  ? 'Artikel hier ablegen zum Löschen'
                  : 'Gesamte Einkaufsliste löschen'
              }
            >
              <Trash2
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 transition-colors ${
                  isDragOverDelete
                    ? 'text-white animate-bounce'
                    : items.length > 0
                    ? 'text-rose-500/80 group-hover:text-rose-600'
                    : 'text-[#A0A5A2]'
                }`}
              />
              <span>Löschen</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact 1-Row Quick Add Module */}
      <form
        onSubmit={handleAddItem}
        className="bg-white p-1.5 sm:p-2 rounded-2xl border border-[#ECEBE8] shadow-xs flex items-center gap-1.5 sm:gap-2"
      >
        {/* Left/Flexible: Text input field */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Schnell hinzufügen (z. B. 400g Tofu)..."
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            className="w-full bg-[#FAF9F6] hover:bg-[#F5F4F0] focus:bg-white border border-[#ECEBE8] focus:border-[#4A7856] rounded-xl px-3 sm:px-3.5 py-2 text-[15px] sm:text-sm text-[#2D3E40] placeholder:text-[#9BA09C] focus:outline-hidden transition-all h-12 sm:h-10"
          />
        </div>

        {/* Middle: Compact dropdown selector (Auto-Regal ▾) */}
        <div className="relative shrink-0">
          <select
            id="shopping-item-category-select"
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value as 'auto' | IngredientCategory)}
            className="bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] rounded-xl pl-2.5 pr-6 py-2 text-xs font-semibold text-[#2D3E40] cursor-pointer focus:border-[#4A7856] focus:outline-hidden h-12 sm:h-10 min-h-[48px] sm:min-h-0 appearance-none transition-colors"
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
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#7A7E7B]">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Right: Square or compact icon button (+) */}
        <button
          type="submit"
          disabled={!quickAddInput.trim()}
          className="w-12 h-12 sm:w-10 sm:h-10 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 bg-[#4A7856] hover:bg-[#3D6447] disabled:opacity-40 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer"
          title="Zutat hinzufügen"
          aria-label="Zutat hinzufügen"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
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
          {(() => {
            const backup = loadFromLocalStorage<ShoppingItem[]>('veggiechef_shopping_backup', []);
            if (backup && backup.length > 0) {
              return (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItems(backup);
                      onCopyFeedback(`${backup.length} Zutaten wiederhergestellt! 🛒`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#E8EFEA] border border-[#ECEBE8] text-[#4A7856] text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Gesicherte Liste wiederherstellen ({backup.length} {backup.length === 1 ? 'Zutat' : 'Zutaten'})</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}
        </div>
      ) : viewMode === 'flat' ? (
        /* Gesamtansicht (Liste mit Drag & Drop Sortierung) */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#ECEBE8] shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#ECEBE8] bg-[#FAF9F6]">
              <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm">
                <List className="w-4 h-4 text-[#4A7856]" />
                <span>Offene Artikel</span>
              </div>
              <span className="text-[12px] font-medium text-[#7A7E7B] bg-[#F4F3F0] px-2.5 py-0.5 rounded-full whitespace-nowrap select-none tabular-nums border border-[#ECEBE8]">
                {activeItems.length} offen
              </span>
            </div>

            {activeItems.length > 0 ? (
              <div className="divide-y divide-[#F0EFEB]">
                {activeItems.map(renderItemRow)}
              </div>
            ) : (
              <p className="text-xs text-[#7A7E7B] py-6 text-center italic">
                Alle Artikel sind abgehakt! 🎉
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Regale-Ansicht: Nur Kategorien anzeigen, die noch offene Artikel haben.
           Kategorien können per Drag & Drop sortiert werden! */
        activeCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            {activeCategories.map((catKey) => {
              const catItems = grouped[catKey] || [];
              const activeInCat = catItems.filter((i) => !i.completed);
              if (activeInCat.length === 0) return null;

              const meta = CATEGORY_META[catKey];
              const isCollapsed = Boolean(collapsedCategories[catKey]);
              const isBeingDragged = draggedShelf === catKey;
              const isDragOver = dragOverShelf === catKey;

              return (
                <div
                  key={catKey}
                  onDragOver={(e) => handleDragOverShelf(e, catKey)}
                  onDrop={(e) => handleDropShelf(e, catKey)}
                  className={`bg-white rounded-2xl border border-[#ECEBE8] shadow-xs overflow-hidden transition-opacity duration-150 ${
                    isBeingDragged ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  {/* Shelf Header (Entire header is draggable for shelf re-ordering) */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStartShelf(e, catKey)}
                    onDragEnd={() => {
                      setDraggedShelf(null);
                      setDragOverShelf(null);
                      setIsDragOverDelete(false);
                    }}
                    className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#FAF9F6] transition-colors border-b border-[#ECEBE8] cursor-grab active:cursor-grabbing select-none"
                    title="Gedrückt halten und ziehen, um das Regal zu sortieren oder auf 'Löschen' zu ziehen"
                  >
                    {/* Category Title & Drag Handle */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="p-1 text-[#B5B9B6] shrink-0 pointer-events-none"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryCollapse(catKey);
                        }}
                        className="flex items-center gap-2 text-left cursor-pointer select-none flex-1 min-w-0"
                      >
                        <span className="text-xl shrink-0 pointer-events-none">{meta.icon}</span>
                        <span className="font-semibold text-[#2D3E40] text-sm sm:text-base truncate pointer-events-none">
                          {meta.label}
                        </span>
                      </button>
                    </div>

                    {/* Clean & minimal count pill + chevron */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-xs font-semibold text-stone-500 bg-[#F4F3F0] px-2.5 py-0.5 rounded-full whitespace-nowrap select-none tabular-nums border border-[#ECEBE8]">
                        {activeInCat.length} offen
                      </span>

                      <div className="p-1 text-[#9BA09C] group-hover:text-[#2D3E40] transition-colors">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shelf Content */}
                  <div
                    className={`grid transition-all duration-250 ease-in-out ${
                      isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="divide-y divide-[#F0EFEB]">
                        {activeInCat.map(renderItemRow)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#ECEBE8] shadow-xs space-y-2">
            <span className="text-2xl">🎉</span>
            <h3 className="text-base font-semibold text-[#2D3E40]">Alle Regale sind abgehakt!</h3>
            <p className="text-xs text-[#7A7E7B]">
              Alle Artikel wurden erledigt und befinden sich im erledigten Bereich unten.
            </p>
          </div>
        )
      )}

      {/* 3. Erledigte Items: Einklappbarer Bereich am Ende („Erledigt (X)“) */}
      {completedCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEBE8] overflow-hidden shadow-xs mt-6">
          <div
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className="w-full flex items-center justify-between p-4 sm:p-5 bg-[#FAF9F6] hover:bg-[#F5F4F0] text-left transition-colors cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowCompletedSection(!showCompletedSection);
              }
            }}
          >
            <div className="flex items-center gap-2 font-semibold text-[#2D3E40] text-sm sm:text-base">
              <CheckCheck className="w-4 h-4 text-[#4A7856]" />
              <span>Erledigt ({completedCount})</span>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setConfirmDeleteState({ type: 'completed' })}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer mr-1"
                title="Erledigte Zutaten entfernen"
              >
                Entfernen
              </button>

              <button
                type="button"
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="p-1 text-[#7A7E7B] hover:text-[#2D3E40] cursor-pointer"
                title={showCompletedSection ? 'Zuklappen' : 'Aufklappen'}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showCompletedSection ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div
            className={`grid transition-all duration-250 ease-in-out ${
              showCompletedSection ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
            style={{
              gridTemplateRows: showCompletedSection ? '1fr' : '0fr',
              opacity: showCompletedSection ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[#ECEBE8] divide-y divide-[#F0EFEB] bg-white">
                {completedItems.map(renderItemRow)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Notification Banner (Nach unten gerückt: hinter 'Erledigt', sowohl Mobile als auch PC) */}
      {showUndoBanner && undoBackup && (
        <div className="p-3 sm:p-4 bg-[#2D3E40] text-white rounded-2xl shadow-lg border border-[#ECEBE8] flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-bottom duration-200 mt-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4A7856] shrink-0" />
            <span className="text-xs">
              {lastDeletedInfo?.type === 'completed'
                ? `${lastDeletedInfo.count} erledigte ${lastDeletedInfo.count === 1 ? 'Zutat' : 'Zutaten'} entfernt.`
                : lastDeletedInfo?.type === 'category'
                ? `Regal "${lastDeletedInfo.name}" gelöscht (${lastDeletedInfo.count} ${lastDeletedInfo.count === 1 ? 'Artikel' : 'Artikel'}).`
                : lastDeletedInfo?.type === 'single'
                ? `"${lastDeletedInfo.name}" gelöscht.`
                : `Einkaufsliste gelöscht (${lastDeletedInfo?.count || undoBackup.length} ${lastDeletedInfo?.count === 1 ? 'Zutat' : 'Zutaten'}).`}
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
                    ? 'Einkaufsliste wirklich löschen?'
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
