import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  CheckCheck, 
  RotateCcw, 
  List, 
  LayoutGrid, 
  Pencil, 
  Minus, 
  X,
  ChevronDown,
  Sparkles,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  safeCopyToClipboard,
  formatDisplayGrocery,
  normalizeAndScaleGroceryQuantity
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

  const [copied, setCopied] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState('');
  const [categoryChoice, setCategoryChoice] = useState<'auto' | IngredientCategory>('auto');
  const [viewMode, setViewMode] = useState<'categorized' | 'flat'>('categorized');

  // Toggleable Recipe Source ("Herkunft der Zutat")
  const [showRecipeSource, setShowRecipeSource] = useState<boolean>(() =>
    loadFromLocalStorage('veggiechef_show_recipe_source', true)
  );

  const toggleShowRecipeSource = () => {
    setShowRecipeSource((prev) => {
      const next = !prev;
      saveToLocalStorage('veggiechef_show_recipe_source', next);
      onCopyFeedback(next ? 'Rezept-Herkunft eingeblendet' : 'Rezept-Herkunft ausgeblendet');
      return next;
    });
  };

  // Delayed Check-Off (~3 seconds) so accidental taps can be undone before disappearing
  const [pendingCompleteIds, setPendingCompleteIds] = useState<Record<string, boolean>>({});
  const pendingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(pendingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

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
  const swipedItemIdRef = useRef<string | null>(null);
  swipedItemIdRef.current = swipedItemId;
  const [activeTouchItemId, setActiveTouchItemId] = useState<string | null>(null);
  const [touchCurrentOffset, setTouchCurrentOffset] = useState<number>(0);
  const touchStartRef = useRef<{ startX: number; startY: number; baseOffset: number; itemWidth?: number } | null>(null);
  const justClosedSwipeMenuRef = useRef<boolean>(false);
  const swipeOpenAtTouchStartRef = useRef<boolean>(false);
  const lastClosedSwipeMenuTimeRef = useRef<number>(0);
  const didSwipeRef = useRef<boolean>(false);
  const lastSwipedTimeRef = useRef<number>(0);
  const lastTouchOffsetRef = useRef<number>(0);

  const closeSwipeMenu = () => {
    if (swipedItemIdRef.current !== null || swipedItemId !== null) {
      setSwipedItemId(null);
      justClosedSwipeMenuRef.current = true;
      lastClosedSwipeMenuTimeRef.current = Date.now();
      setActiveTouchItemId(null);
      setTouchCurrentOffset(0);
      setTimeout(() => {
        justClosedSwipeMenuRef.current = false;
      }, 450);
    }
  };

  // Auto-close swiped menu ONLY on a genuine tap/click outside (NOT when starting a scroll!)
  useEffect(() => {
    if (!swipedItemId) return;

    let pointerStart: { x: number; y: number; target: EventTarget | null } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      if (Date.now() - lastSwipedTimeRef.current < 300) return;
      pointerStart = { x: e.clientX, y: e.clientY, target: e.target };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerStart) return;
      const dist = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y);
      const target = (e.target || pointerStart.target) as HTMLElement | null;
      pointerStart = null;

      // Nur schließen, wenn es ein echtes Tippen war (< 10px Bewegung) und kein Scrollen
      if (dist < 10) {
        if (target?.closest('[data-swipe-action="true"]')) {
          return;
        }
        closeSwipeMenu();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, true);
      window.addEventListener('pointerup', handlePointerUp, true);
    }, 40);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [swipedItemId]);

  // Accordion states: completed section & categories
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Safety confirmation modal
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    type: 'all' | 'completed';
  } | null>(null);

  // 3-Punkte-Menü state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showContextMenu) return;
    let startPos: { x: number; y: number } | null = null;
    const handleDown = (e: PointerEvent) => {
      startPos = { x: e.clientX, y: e.clientY };
    };
    const handleUp = (e: PointerEvent) => {
      if (!startPos) return;
      const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
      startPos = null;
      if (dist < 10 && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleDown);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointerdown', handleDown);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [showContextMenu]);

  // Custom Category Dropdown in quick add form
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;
    let startPos: { x: number; y: number } | null = null;
    const handleDown = (e: PointerEvent) => {
      startPos = { x: e.clientX, y: e.clientY };
    };
    const handleUp = (e: PointerEvent) => {
      if (!startPos) return;
      const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
      startPos = null;
      if (dist < 10 && categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleDown);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointerdown', handleDown);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [isCategoryDropdownOpen]);

  useLockBodyScroll(Boolean(confirmDeleteState));

  // Auto-save & close inline stepper ONLY on a genuine tap/click outside (NOT when scrolling!)
  useEffect(() => {
    if (!editingItemId) return;

    let pointerStart: { x: number; y: number; target: EventTarget | null } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      pointerStart = { x: e.clientX, y: e.clientY, target: e.target };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerStart) return;
      const dist = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y);
      const target = (e.target || pointerStart.target) as Node | null;
      pointerStart = null;

      if (dist < 10 && editContainerRef.current && target && !editContainerRef.current.contains(target)) {
        saveEditedAmount(editingItemId);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
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

  const completedCount = items.filter((i) => i.completed).length;

  // Active categories: Categories that have AT LEAST ONE uncompleted item.
  const activeCategories = useMemo(() => {
    return shelfOrder.filter((catKey) => {
      const catItems = grouped[catKey] || [];
      return catItems.some((it) => !it.completed);
    });
  }, [shelfOrder, grouped]);

  const toggleItem = (id: string) => {
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    if (swipedItemId === id) {
      setSwipedItemId(null);
    }

    // 1. Bereits erledigtes Item im "Erledigt"-Bereich -> sofort wieder aktivieren
    if (targetItem.completed) {
      if (pendingTimeoutsRef.current[id]) {
        clearTimeout(pendingTimeoutsRef.current[id]);
        delete pendingTimeoutsRef.current[id];
      }
      setPendingCompleteIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed: false } : item))
      );
      return;
    }

    // 2. Item befindet sich gerade in der ~3 Sekunden Verzögerung -> Klick bricht das Abhaken sofort ab!
    if (pendingCompleteIds[id]) {
      if (pendingTimeoutsRef.current[id]) {
        clearTimeout(pendingTimeoutsRef.current[id]);
        delete pendingTimeoutsRef.current[id];
      }
      setPendingCompleteIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    // 3. Offenes Item -> Sofort visuell abhaken (grau & durchgestrichen), langsam verblassen und erst nach 3 Sek. verschieben
    setPendingCompleteIds((prev) => ({ ...prev, [id]: true }));
    pendingTimeoutsRef.current[id] = setTimeout(() => {
      delete pendingTimeoutsRef.current[id];
      setPendingCompleteIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed: true } : item))
      );
    }, 3000);
  };

  const deleteItem = (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (!itemToDelete) return;
    setUndoBackup([...items]);
    setLastDeletedInfo({
      type: 'single',
      count: 1,
      name: itemToDelete.name,
    });
    setShowUndoBanner(true);
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
          const num = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount).replace(',', '.'));
          if (!isNaN(num)) {
            const scaled = normalizeAndScaleGroceryQuantity(num, parsed.unit, it.name);
            return { ...it, amount: scaled.amount, unit: scaled.unit };
          }
          return { ...it, amount: parsed.amount, unit: parsed.unit };
        }
        const match = val.match(/^([\d.,]+)\s*(.*)$/);
        if (match && match[1]) {
          const num = parseFloat(match[1].replace(',', '.'));
          const unit = match[2] || '';
          if (!isNaN(num)) {
            const scaled = normalizeAndScaleGroceryQuantity(num, unit, it.name);
            return { ...it, amount: scaled.amount, unit: scaled.unit };
          }
          return { ...it, amount: match[1], unit };
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
      onCopyFeedback(`${count} ${count === 1 ? 'Zutat' : 'Zutaten'} wiederhergestellt`);
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

  // Clean Item Row: Checkbox, Name, Desktop Actions LINKS von der Mengenangabe, Mengenangabe GANZ RECHTS (ohne 6-Punkte-Griff & ohne Hint-Badge)
  const renderItemRow = (item: ShoppingItem) => {
    const isEditing = editingItemId === item.id;
    const isSwiped = swipedItemId === item.id;
    const isAnySwiped = swipedItemId !== null;
    const isBeingDragged = draggedItemId === item.id;
    const isDragOver = dragOverItemId === item.id;
    const isPendingComplete = Boolean(pendingCompleteIds[item.id]);
    const isVisuallyCompleted = item.completed || isPendingComplete;

    // Mobile Touch & Swipe Offset
    const isThisItemTouching = activeTouchItemId === item.id;
    const MENU_SWIPE_OFFSET = 132; // Komfortabler Abstand für 48px Stift & Mülleimer
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

    // Wenn weiter links geswipt wird als das geöffnete Menü (pullDistance > 132px)
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
      ? Math.min(itemWidth - 24, 48 + extraPull * 1.25)
      : 48;

    const rawRecipeSourceText = formatRecipeSource(item.recipeSource);
    const recipeSourceText = showRecipeSource ? rawRecipeSourceText : '';
    const hasSecondaryText = Boolean(recipeSourceText);

    return (
      <motion.div
        layout="position"
        key={item.id}
        initial={{ opacity: 0, y: 6 }}
        animate={
          isPendingComplete
            ? { opacity: [1, 0.78, 0.32], y: 0, scale: 0.99 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        exit={{ opacity: 0, height: 0, scale: 0.97, overflow: 'hidden' }}
        transition={
          isPendingComplete
            ? {
                opacity: { duration: 2.9, times: [0, 0.35, 1], ease: 'easeInOut' },
                scale: { duration: 0.2 },
                layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              }
            : {
                layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }
        }
        data-swipe-item={item.id}
        draggable={!isEditing && !isSwiped && !isAnySwiped}
        onDragStart={(e: any) => handleDragStartItem(e, item.id)}
        onDragOver={(e: any) => handleDragOverItem(e, item.id)}
        onDragLeave={(e: any) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverItemId === item.id) {
              setDragOverItemId(null);
              setDragDropPosition(null);
            }
          }
        }}
        onDrop={(e: any) => handleDropItem(e, item.id)}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverItemId(null);
          setDragDropPosition(null);
          setIsDragOverDelete(false);
        }}
        className={`relative overflow-hidden select-none group touch-pan-y transition-colors ${
          isBeingDragged
            ? 'opacity-40 border-dashed border-accent'
            : 'opacity-100'
        }`}
      >
        {/* Drop Insertion Line (Geschmeidige Vorschau ohne Layout-Shift) */}
        {isDragOver && dragDropPosition === 'before' && (
          <div className="absolute top-0 left-2 right-2 h-1 bg-accent rounded-full z-30 pointer-events-none shadow-xs" />
        )}
        {isDragOver && dragDropPosition === 'after' && (
          <div className="absolute bottom-0 left-2 right-2 h-1 bg-accent rounded-full z-30 pointer-events-none shadow-xs" />
        )}

        {/* Background Action Tray: Für Mobile-Swipe */}
        <div
          className={`absolute inset-0 z-0 overflow-hidden flex items-center justify-end transition-[background-color,border-color] duration-150 ease-out ${
            isFullSwipeDelete
              ? 'bg-[#C93B2B]'
              : 'bg-surface pr-2.5 pl-3'
          }`}
        >
          {isFullSwipeDelete ? (
            <div className="flex items-center justify-end w-full px-6 gap-2.5 text-on-accent font-semibold text-sm animate-in fade-in zoom-in-95 duration-150">
              <Trash2 className="w-5 h-5 stroke-[2.5] scale-110 transition-transform" />
              <span>Löschen</span>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 h-full">
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
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-card text-accent hover:bg-[#E8EFEA] border border-border flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 shadow-2xs shrink-0"
                title="Menge anpassen"
                aria-label="Menge anpassen"
              >
                <Pencil className="w-5 h-5" />
              </button>

              <button
                data-swipe-action="true"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBySwipe(item);
                }}
                style={{
                  width: isSwipingPastMenu ? `${expandingTrashWidth}px` : '48px',
                  transition: isThisItemTouching ? 'none' : 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s',
                }}
                className={`h-12 min-h-[48px] rounded-xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-90 shadow-2xs shrink-0 transition-colors ${
                  isSwipingPastMenu
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 px-3.5'
                    : 'w-12 min-w-[48px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                }`}
                title="Artikel löschen"
                aria-label="Artikel löschen"
              >
                <Trash2 className="w-5 h-5 shrink-0 stroke-[2.2]" />
                {isSwipingPastMenu && expandingTrashWidth > 76 && (
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
            // Falls ein anderes Swipe-Menü offen ist: NICHT sofort beim Berühren schließen (damit man normal scrollen kann!),
            // sondern erst beim echten Tippen (ohne Scrollen) oder wenn dieses Item horizontal gewischt wird.
            if (swipedItemIdRef.current !== null && swipedItemIdRef.current !== item.id) {
              swipeOpenAtTouchStartRef.current = true;
            } else if (swipedItemIdRef.current === item.id) {
              swipeOpenAtTouchStartRef.current = true;
            } else {
              swipeOpenAtTouchStartRef.current = false;
            }

            const touch = e.touches[0];
            const targetEl = e.currentTarget as HTMLElement;
            const width = targetEl.offsetWidth || window.innerWidth;
            touchStartRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              baseOffset: swipedItemIdRef.current === item.id ? -MENU_SWIPE_OFFSET : 0,
              itemWidth: width,
            };
            lastTouchOffsetRef.current = swipedItemIdRef.current === item.id ? -MENU_SWIPE_OFFSET : 0;
            didSwipeRef.current = false;
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current || isEditing) return;
            const touch = e.touches[0];
            const diffX = touch.clientX - touchStartRef.current.startX;
            const diffY = touch.clientY - touchStartRef.current.startY;

            // Vertikales Scrollen durchlassen, falls primär vertikal gescrollt wird
            if (!didSwipeRef.current && Math.abs(diffY) > 10 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
              touchStartRef.current = null;
              return;
            }

            if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
              if (!didSwipeRef.current) {
                didSwipeRef.current = true;
                if (swipedItemIdRef.current !== null && swipedItemIdRef.current !== item.id) {
                  setSwipedItemId(null);
                }
                setActiveTouchItemId(item.id);
              }
            }

            if (!didSwipeRef.current) return;

            const width = touchStartRef.current.itemWidth || 360;
            const rawOffset = touchStartRef.current.baseOffset + diffX;
            let clamped: number;
            if (rawOffset > 0) {
              clamped = Math.min(15, rawOffset * 0.2);
            } else {
              clamped = Math.max(-width, rawOffset);
            }
            lastTouchOffsetRef.current = clamped;
            setTouchCurrentOffset(clamped);
          }}
          onTouchEnd={() => {
            if (!touchStartRef.current) {
              setActiveTouchItemId(null);
              setTouchCurrentOffset(0);
              return;
            }
            const width = touchStartRef.current.itemWidth || 360;
            const deleteThreshold = width * 0.7;
            const offset = lastTouchOffsetRef.current;
            const didActuallySwipe = didSwipeRef.current;
            touchStartRef.current = null;

            if (didActuallySwipe && activeTouchItemId === item.id) {
              if (offset <= -deleteThreshold) {
                handleDeleteBySwipe(item);
              } else if (offset < -35) {
                setSwipedItemId(item.id);
                lastSwipedTimeRef.current = Date.now();
                setActiveTouchItemId(null);
                setTouchCurrentOffset(0);
              } else {
                closeSwipeMenu();
              }
            } else {
              setActiveTouchItemId(null);
              setTouchCurrentOffset(0);
            }
          }}
          onTouchCancel={() => {
            touchStartRef.current = null;
            setActiveTouchItemId(null);
            setTouchCurrentOffset(0);
            didSwipeRef.current = false;
          }}
          onClick={(e) => {
            if (Date.now() - lastSwipedTimeRef.current < 400 || didSwipeRef.current) {
              didSwipeRef.current = false;
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            if (
              swipedItemId !== null ||
              swipedItemIdRef.current !== null ||
              swipeOpenAtTouchStartRef.current ||
              justClosedSwipeMenuRef.current ||
              Date.now() - lastClosedSwipeMenuTimeRef.current < 450
            ) {
              e.preventDefault();
              e.stopPropagation();
              swipeOpenAtTouchStartRef.current = false;
              justClosedSwipeMenuRef.current = false;
              closeSwipeMenu();
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
          className={`relative z-10 w-full flex justify-between py-2.5 sm:py-2.5 px-3.5 sm:px-4 gap-2.5 sm:gap-3 min-h-[52px] sm:min-h-[52px] touch-pan-y transition-colors ${
            isEditing
              ? 'cursor-default bg-surface items-stretch'
              : hasSecondaryText
              ? 'items-start'
              : 'items-center'
          } ${
            isEditing
              ? ''
              : isVisuallyCompleted
              ? 'cursor-pointer bg-card hover:bg-surface text-text-muted'
              : 'cursor-pointer bg-card hover:bg-surface active:bg-[#F5F4F0] text-text-main'
          }`}
        >
          {isEditing ? (
            /* Smart, compact editing view with 44px touch targets and full-width text protection */
            <motion.div
              ref={editContainerRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full flex flex-col gap-2.5 py-1"
            >
              {/* Header row: Checkbox/Pencil icon, item name and status badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center border-2 border-accent bg-card text-accent shrink-0">
                    <Pencil className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-base font-semibold text-text-main truncate">
                      {item.name}
                    </span>
                    {recipeSourceText && (
                      <span className="text-[13px] text-text-muted truncate">
                        {recipeSourceText}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-accent bg-accent-tint px-2.5 py-0.5 rounded-full shrink-0 border border-[#D5DDD7]">
                  Menge anpassen
                </span>
              </div>

              {/* Controls row: Stepper (- / input / +) and actions (Cancel / Save) */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex items-center bg-card border border-[#D1D5D2] rounded-xl shadow-2xs overflow-hidden h-[44px]">
                  <button
                    type="button"
                    onClick={() => stepEditedAmount(-1)}
                    className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface hover:bg-accent-tint text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95 border-r border-border"
                    title="Menge verringern (-1)"
                    aria-label="Menge verringern"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
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
                    placeholder="1 Stk"
                    className="w-20 sm:w-24 h-full px-2 text-center text-[16px] font-semibold text-text-main bg-card focus:outline-hidden focus:bg-surface"
                  />

                  <button
                    type="button"
                    onClick={() => stepEditedAmount(1)}
                    className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface hover:bg-accent-tint text-text-main transition-colors cursor-pointer touch-manipulation active:scale-95 border-l border-border"
                    title="Menge erhöhen (+1)"
                    aria-label="Menge erhöhen"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-xl border border-border bg-surface hover:bg-accent-tint text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shadow-2xs"
                    title="Abbrechen"
                    aria-label="Abbrechen"
                  >
                    <X className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => saveEditedAmount(item.id)}
                    className="h-[44px] min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent flex items-center justify-center gap-1.5 font-semibold text-[14px] sm:text-[15px] shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
                    title="Speichern"
                    aria-label="Speichern"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Fertig</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* LEFT SIDE: Checkbox -> Name & Quelle */}
              <div className={`flex flex-1 min-w-0 gap-2.5 sm:gap-3 ${
                hasSecondaryText ? 'items-start' : 'items-center'
              }`}>
                {/* Square Checkbox Indicator */}
                <motion.div
                  animate={isVisuallyCompleted ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors duration-200 shrink-0 ${
                    hasSecondaryText ? 'mt-0.5' : ''
                  } ${
                    isVisuallyCompleted
                      ? 'bg-accent border-accent text-on-accent'
                      : 'border-[#D1D5D2] bg-card group-hover:border-accent'
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isVisuallyCompleted && (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Name & Quelle */}
                <div className={`flex-1 min-w-0 flex flex-col ${
                  hasSecondaryText ? 'justify-start' : 'justify-center'
                }`}>
                  <span
                    className={`text-base font-medium block break-words leading-tight transition-colors duration-200 ${
                      isVisuallyCompleted ? 'line-through text-text-muted' : 'text-text-main'
                    }`}
                  >
                    {item.name}
                  </span>
                  <AnimatePresence initial={false}>
                    {recipeSourceText && (
                      <motion.span
                        key="recipe-source"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`text-[13px] font-normal break-words leading-normal mt-0.5 line-clamp-2 transition-colors duration-200 ${
                          isVisuallyCompleted ? 'text-text-muted/70 line-through' : 'text-text-muted'
                        }`}
                        title={item.recipeSource}
                      >
                        {recipeSourceText}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: [Desktop Actions: Pencil & Trash (LINKS)] -> [Menge (GANZ RECHTS)] */}
              <div className={`flex items-center gap-2 shrink-0 ml-auto ${
                hasSecondaryText ? 'self-start mt-0.5' : 'self-center'
              }`} onClick={(e) => {
                if (
                  swipedItemIdRef.current !== null ||
                  justClosedSwipeMenuRef.current ||
                  Date.now() - lastClosedSwipeMenuTimeRef.current < 450
                ) {
                  e.stopPropagation();
                  closeSwipeMenu();
                  return;
                }
                e.stopPropagation();
              }}>
                {/* Desktop hover actions: LINKS von der Mengenangabe */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEditingItem(item)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface text-accent hover:bg-[#E8EFEA] hover:text-accent-hover border border-border transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Menge bearbeiten"
                    aria-label="Menge bearbeiten"
                  >
                    <Pencil className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteItem(item.id);
                      onCopyFeedback(`"${item.name}" gelöscht.`);
                    }}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-border transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Löschen"
                    aria-label="Löschen"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                {item.amount ? (() => {
                  const display = formatDisplayGrocery(item.amount, item.unit, item.name);
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          swipedItemIdRef.current !== null ||
                          justClosedSwipeMenuRef.current ||
                          Date.now() - lastClosedSwipeMenuTimeRef.current < 450
                        ) {
                          closeSwipeMenu();
                          return;
                        }
                        startEditingItem(item);
                      }}
                      className={`text-base font-semibold tabular-nums select-none text-right transition-colors duration-200 cursor-pointer touch-manipulation whitespace-nowrap px-1 py-0.5 rounded-sm hover:underline flex items-baseline gap-1.5 ${
                        isVisuallyCompleted
                          ? 'text-text-muted line-through opacity-60'
                          : 'text-accent hover:text-accent-hover'
                      }`}
                      title="Menge anpassen (- / +)"
                    >
                      <span>
                        {display.formattedAmount} {display.formattedUnit}
                      </span>
                    </button>
                  );
                })() : null}
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 lg:p-6 border border-border shadow-[0_6px_24px_-4px_rgba(45,62,64,0.07),0_2px_8px_-2px_rgba(45,62,64,0.04)] space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main leading-tight">
            Einkaufsliste
          </h1>
          <p className="text-base text-text-muted leading-relaxed mt-1">
            Alles für deine Woche – geordnet nach Supermarkt-Regal.
          </p>
        </div>

        {/* Unified Action Row: Auf Mobile steht das 3-Punkte-Menü rechtsbündig gegenüber dem Regale/Liste-Schalter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border">
          {/* Left side: View switcher ([ Regale ] / [ Liste ]) */}
          <div className="order-1 relative flex items-center p-1 bg-surface border border-border rounded-xl text-[16px] select-none shadow-2xs h-[44px]">
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent rounded-lg shadow-xs pointer-events-none ${
                viewMode === 'categorized' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            />

            <button
              type="button"
              onClick={() => setViewMode('categorized')}
              className={`relative z-10 px-3.5 sm:px-4 h-full flex items-center justify-center gap-2 rounded-lg text-[16px] transition-colors cursor-pointer touch-manipulation select-none ${
                viewMode === 'categorized'
                  ? 'text-on-accent font-bold'
                  : 'text-[#57534d] hover:text-accent font-semibold'
              }`}
              title="Nach Supermarkt-Regalen gruppiert"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Regale</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`relative z-10 px-3.5 sm:px-4 h-full flex items-center justify-center gap-2 rounded-lg text-[16px] transition-colors cursor-pointer touch-manipulation select-none ${
                viewMode === 'flat'
                  ? 'text-on-accent font-bold'
                  : 'text-[#57534d] hover:text-accent font-semibold'
              }`}
              title="Alle Artikel in einer sortierbaren Liste"
            >
              <List className="w-4 h-4" />
              <span>Liste</span>
            </button>
          </div>

          {/* 3-Punkte-Menü Button: Auf Mobile direkt rechtsbündig gegenüber dem Regale/Liste-Schalter (order-2), auf Desktop neben den Aktionsbuttons */}
          <div className="order-2 sm:order-2 relative shrink-0 ml-auto" ref={contextMenuRef}>
            <button
              type="button"
              id="shopping-list-context-menu-btn"
              onClick={() => setShowContextMenu((prev) => !prev)}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs border ${
                showContextMenu
                  ? 'bg-[#E5EBE6] text-text-main border-accent-border ring-2 ring-accent/25'
                  : 'bg-surface hover:bg-accent-tint text-text-main hover:text-text-main border-border hover:border-accent-border'
              }`}
              title="Weitere Optionen"
              aria-label="Weitere Optionen"
              aria-expanded={showContextMenu}
            >
              <motion.div
                animate={{ rotate: showContextMenu ? 90 : 0, scale: showContextMenu ? 1.05 : 1 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center"
              >
                <MoreHorizontal className="w-5 h-5 text-text-main" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showContextMenu && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowContextMenu(false)}
                    aria-hidden="true"
                  />

                  {/* Custom Animated Dropdown Popover (auf Mobile & Desktop identisch, kein Apple-Select) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right bg-card rounded-2xl border border-border shadow-xl p-1.5 z-50 space-y-1"
                  >
                    <button
                      type="button"
                      id="context-menu-toggle-recipe-source-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        toggleShowRecipeSource();
                      }}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-text-main hover:bg-surface active:bg-accent-tint flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-accent">
                        {showRecipeSource ? (
                          <EyeOff className="w-4 h-4 shrink-0" />
                        ) : (
                          <Eye className="w-4 h-4 shrink-0" />
                        )}
                      </div>
                      <span className="truncate">
                        {showRecipeSource ? 'Rezept-Herkunft ausblenden' : 'Rezept-Herkunft einblenden'}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="context-menu-copy-list-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        handleCopyFormattedList();
                      }}
                      disabled={items.length === 0}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-text-main hover:bg-surface active:bg-accent-tint disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-accent">
                        {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                      </div>
                      <span className="truncate">{copied ? 'Kopiert!' : 'Liste kopieren'}</span>
                    </button>

                    {completedCount > 0 && (
                      <button
                        type="button"
                        id="context-menu-clear-completed-btn"
                        onClick={() => {
                          setShowContextMenu(false);
                          setConfirmDeleteState({ type: 'completed' });
                        }}
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-text-main hover:bg-surface active:bg-accent-tint flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-accent">
                          <CheckCheck className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="truncate">Erledigte entfernen</span>
                      </button>
                    )}

                    <div className="border-t border-border my-1" />

                    <button
                      type="button"
                      id="context-menu-clear-all-btn"
                      onClick={() => {
                        setShowContextMenu(false);
                        setConfirmDeleteState({ type: 'all' });
                      }}
                      disabled={items.length === 0}
                      className="w-full min-h-[48px] px-3 py-2 rounded-xl text-left text-[15px] sm:text-[16px] font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100/70 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-3 transition-colors cursor-pointer touch-manipulation"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="truncate">Gesamte Liste leeren</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons: Kopieren (animiert wie in der Rezept-Detailansicht) & Löschen */}
          <div className="order-3 flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              id="copy-entire-shopping-list-btn"
              type="button"
              onClick={handleCopyFormattedList}
              disabled={items.length === 0}
              className={`flex-1 sm:flex-initial h-[44px] px-3.5 sm:px-4 flex items-center justify-center gap-2 rounded-xl border text-[16px] shadow-2xs transition-all active:scale-95 touch-manipulation cursor-pointer group ${
                copied
                  ? 'bg-accent-tint border-accent/40 text-accent font-bold'
                  : 'bg-surface hover:bg-accent-tint border-border text-[#57534d] hover:text-accent font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface'
              }`}
              title="Kopiert die Liste formatiert für WhatsApp & Notizen"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, scale: 0.85, y: 2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -2 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-accent stroke-[2.5]" />
                    <span>Kopiert</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, scale: 0.85, y: -2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 2 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4 text-accent transition-colors" />
                    <span>Kopieren</span>
                  </motion.span>
                )}
              </AnimatePresence>
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
              className={`flex-1 sm:flex-initial h-[44px] px-3.5 sm:px-4 flex items-center justify-center gap-2 rounded-xl font-semibold text-[16px] border transition-all select-none touch-manipulation group shadow-2xs ${
                isDragOverDelete
                  ? 'bg-rose-600 text-on-accent border-rose-600 shadow-md ring-2 ring-rose-400'
                  : items.length > 0
                  ? 'bg-surface hover:bg-accent-tint text-[#57534d] hover:text-rose-700 border-border hover:border-rose-200 active:scale-95 cursor-pointer'
                  : 'bg-surface text-text-muted border-border opacity-40 cursor-not-allowed'
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
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isDragOverDelete
                    ? 'text-on-accent animate-bounce'
                    : items.length > 0
                    ? 'text-rose-600 group-hover:text-rose-700'
                    : 'text-text-muted'
                }`}
              />
              <span>Löschen</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Add Module: Ohne umschließende weiße Box – direkt auf dem beigen Hintergrund */}
      <form
        onSubmit={handleAddItem}
        className="flex items-center gap-2 sm:gap-2.5"
      >
        {/* Left/Flexible: Weißes, abgerundetes Input-Feld direkt auf dem Hintergrund */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Schnell hinzufügen (z. B. 400g Tofu)..."
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            className="w-full bg-card hover:bg-card focus:bg-card border border-border focus:border-accent rounded-2xl px-4 py-2.5 text-base text-text-main placeholder:text-text-muted focus:outline-hidden transition-all h-12 shadow-[0_4px_16px_-2px_rgba(45,62,64,0.06)]"
          />
        </div>

        {/* Middle: Custom Category Dropdown */}
        <div ref={categoryDropdownRef} className="relative shrink-0">
          <button
            type="button"
            id="shopping-item-category-select"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="inline-flex items-center gap-2 bg-card hover:bg-accent-tint border border-border rounded-2xl px-3.5 sm:px-4 py-2.5 text-[16px] font-semibold text-text-main cursor-pointer focus:border-accent focus:outline-hidden h-12 min-h-[48px] transition-colors select-none shadow-[0_4px_16px_-2px_rgba(45,62,64,0.06)]"
            title="Regal / Kategorie wählen"
            aria-label="Regal / Kategorie wählen"
            aria-expanded={isCategoryDropdownOpen}
          >
            <span>
              {categoryChoice === 'auto'
                ? 'Auto'
                : categoryChoice === 'gemuese'
                ? 'Gemüse'
                : categoryChoice === 'kuehlregal'
                ? 'Kühlregal'
                : categoryChoice === 'huelsenfruechte'
                ? 'Hülsenfrüchte'
                : categoryChoice === 'trockenwaren'
                ? 'Vorrat'
                : categoryChoice === 'gewuerze'
                ? 'Gewürze'
                : 'Sonstiges'}
            </span>
            <motion.div
              animate={{ rotate: isCategoryDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <ChevronDown className={`w-4 h-4 ${isCategoryDropdownOpen ? 'text-accent' : 'text-text-muted'}`} />
            </motion.div>
          </button>

          {/* Animated Popover Menu with categories (auf Mobile & Desktop) */}
          <AnimatePresence>
            {isCategoryDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsCategoryDropdownOpen(false)}
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 z-40 w-64 max-w-[calc(100vw-2rem)] origin-top-right bg-card rounded-2xl shadow-xl border border-border p-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryChoice('auto');
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[16px] font-medium transition-colors cursor-pointer text-left ${
                      categoryChoice === 'auto'
                        ? 'bg-accent-tint text-accent font-semibold'
                        : 'text-text-main hover:bg-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Auto-Erkennung</span>
                    </span>
                    {categoryChoice === 'auto' && <Check className="w-4 h-4 text-accent" />}
                  </button>

                  <div className="my-1 border-t border-border" />

                  {(
                    [
                      ['gemuese', 'Gemüse', 'Frisches Gemüse & Kräuter'],
                      ['kuehlregal', 'Kühlregal', 'Kühlwaren & Alternativen'],
                      ['huelsenfruechte', 'Hülsenfrüchte', 'Bohnen, Linsen & Tofu'],
                      ['trockenwaren', 'Vorrat', 'Nudeln, Reis & Konserven'],
                      ['gewuerze', 'Gewürze', 'Gewürze, Öle & Dips'],
                      ['sonstiges', 'Sonstiges', 'Haushalt & Sonstiges'],
                    ] as const
                  ).map(([catKey, catLabel]) => {
                    const isSelected = categoryChoice === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => {
                          setCategoryChoice(catKey as IngredientCategory);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[16px] transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-accent-tint text-accent font-semibold'
                            : 'text-text-main hover:bg-surface font-normal'
                        }`}
                      >
                        <span>{catLabel}</span>
                        {isSelected && <Check className="w-4 h-4 text-accent" />}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Square icon button (+) */}
        <button
          type="submit"
          disabled={!quickAddInput.trim()}
          className="w-12 h-12 min-w-[48px] min-h-[48px] bg-accent hover:bg-accent-hover disabled:opacity-40 text-on-accent rounded-2xl flex items-center justify-center shadow-[0_4px_16px_-2px_rgba(45,62,64,0.12)] shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer"
          title="Zutat hinzufügen"
          aria-label="Zutat hinzufügen"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </form>

      {/* Main Content Area */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card rounded-2xl p-12 text-center border border-border space-y-3 shadow-[0_6px_24px_-4px_rgba(45,62,64,0.08),0_2px_8px_-2px_rgba(45,62,64,0.04)]"
        >
          <div className="w-14 h-14 rounded-full bg-accent-tint text-accent flex items-center justify-center mx-auto text-2xl border border-border">
            🛒
          </div>
          <h3 className="text-xl font-bold tracking-tight text-text-main">Deine Liste ist leer</h3>
          <p className="text-base text-text-muted leading-relaxed max-w-sm mx-auto">
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
                      onCopyFeedback(`${backup.length} Zutaten wiederhergestellt`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-[#E8EFEA] border border-border text-accent text-sm font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 min-h-[44px] touch-manipulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Gesicherte Liste wiederherstellen ({backup.length} {backup.length === 1 ? 'Zutat' : 'Zutaten'})</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === 'flat' ? (
            /* Gesamtansicht (Liste mit Drag & Drop Sortierung) */
            <motion.div
              key="view-flat"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              <div className="bg-card rounded-2xl border border-border shadow-[0_6px_24px_-4px_rgba(45,62,64,0.08),0_2px_8px_-2px_rgba(45,62,64,0.04)] overflow-hidden">
                <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border bg-accent-tint">
                  <div className="flex items-center gap-2 font-semibold text-text-main text-base">
                    <List className="w-4 h-4 text-accent" />
                    <span className="text-[16px]">
                      Offene Artikel ({activeItems.length})
                    </span>
                  </div>
                </div>

                {activeItems.length > 0 ? (
                  <div className="divide-y divide-[#F0EFEB]">
                    <AnimatePresence initial={false}>
                      {activeItems.map(renderItemRow)}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-6 text-center italic">
                    Alle Artikel sind abgehakt! 🎉
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            /* Regale-Ansicht: Nur Kategorien anzeigen, die noch offene Artikel haben */
            <motion.div
              key="view-categorized"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                  <AnimatePresence initial={false}>
                    {activeCategories.map((catKey) => {
                      const catItems = grouped[catKey] || [];
                      const activeInCat = catItems.filter((i) => !i.completed);
                      if (activeInCat.length === 0) return null;

                      const meta = CATEGORY_META[catKey];
                      const isCollapsed = Boolean(collapsedCategories[catKey]);
                      const isBeingDragged = draggedShelf === catKey;

                      return (
                        <motion.div
                          layout="position"
                          key={catKey}
                          initial={{ opacity: 0, scale: 0.98, y: 8 }}
                          animate={{ opacity: isBeingDragged ? 0.4 : 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -6 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          onDragOver={(e: any) => handleDragOverShelf(e, catKey)}
                          onDrop={(e: any) => handleDropShelf(e, catKey)}
                          className="bg-card rounded-2xl border border-border shadow-[0_6px_24px_-4px_rgba(45,62,64,0.08),0_2px_8px_-2px_rgba(45,62,64,0.04)] overflow-hidden"
                        >
                          {/* Shelf Header (Ohne 6-Punkte-Griff und ohne separaten Badge, Anzahl in Klammern hinter dem Namen) */}
                          <div
                            draggable
                            onDragStart={(e) => handleDragStartShelf(e, catKey)}
                            onDragEnd={() => {
                              setDraggedShelf(null);
                              setDragOverShelf(null);
                              setIsDragOverDelete(false);
                            }}
                            onClick={() => toggleCategoryCollapse(catKey)}
                            className="flex items-center justify-between p-3.5 sm:p-4 bg-accent-tint hover:bg-[#E8EFEA] transition-colors border-b border-border cursor-pointer select-none"
                            title="Klicken zum Auf-/Zuklappen oder gedrückt halten zum Sortieren"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="text-xl shrink-0 pointer-events-none">{meta.icon}</span>
                              <span className="font-semibold text-text-main text-base truncate pointer-events-none">
                                {meta.label} ({activeInCat.length})
                              </span>
                            </div>

                            <div
                              className="flex items-center shrink-0 ml-2 p-1 text-accent transition-colors"
                              title={isCollapsed ? 'Regal aufklappen' : 'Regal zuklappen'}
                            >
                              <motion.div
                                animate={{ rotate: isCollapsed ? -90 : 0 }}
                                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Shelf Content */}
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="divide-y divide-[#F0EFEB]">
                                <AnimatePresence initial={false}>
                                  {activeInCat.map(renderItemRow)}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-8 text-center border border-border shadow-[0_6px_24px_-4px_rgba(45,62,64,0.08),0_2px_8px_-2px_rgba(45,62,64,0.04)] space-y-2">
                  <span className="text-2xl">🎉</span>
                  <h3 className="text-base font-semibold text-text-main">Alle Regale sind abgehakt!</h3>
                  <p className="text-xs text-text-muted">
                    Alle Artikel wurden erledigt und befinden sich im erledigten Bereich unten.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 3. Erledigte Items: Einklappbarer Bereich am Ende („Erledigt (X)“) */}
      <AnimatePresence initial={false}>
        {completedCount > 0 && (
          <motion.div
            key="completed-section"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-[0_6px_24px_-4px_rgba(45,62,64,0.08),0_2px_8px_-2px_rgba(45,62,64,0.04)] mt-6"
          >
            <div
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-accent-tint hover:bg-[#E3EBE5] text-left transition-colors cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowCompletedSection(!showCompletedSection);
                }
              }}
            >
              <div className="flex items-center gap-2 font-semibold text-text-main text-base">
                <CheckCheck className="w-4 h-4 text-accent" />
                <span>Erledigt ({completedCount})</span>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteState({ type: 'completed' })}
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer mr-1"
                  title="Erledigte Zutaten entfernen"
                >
                  Entfernen
                </button>

                <button
                  type="button"
                  onClick={() => setShowCompletedSection(!showCompletedSection)}
                  className="p-1 text-[#57534d] hover:text-accent cursor-pointer"
                  title={showCompletedSection ? 'Zuklappen' : 'Aufklappen'}
                >
                  <motion.div
                    animate={{ rotate: showCompletedSection ? 180 : 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showCompletedSection ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border divide-y divide-[#F0EFEB] bg-card">
                  <AnimatePresence initial={false}>
                    {completedItems.map(renderItemRow)}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Notification Banner */}
      <AnimatePresence>
        {showUndoBanner && undoBackup && (
          <motion.div
            key="undo-banner"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="p-3.5 sm:p-4 bg-text-main text-on-accent rounded-2xl shadow-lg border border-border/20 flex items-center justify-between gap-3 sm:gap-4 mt-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
              <span className="text-[16px] font-medium text-on-accent/95 truncate">
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
                className="h-[44px] min-h-[44px] px-4 sm:px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-[16px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 sm:hidden" />
                <span>Rückgängig</span>
              </button>
              <button
                onClick={() => setShowUndoBanner(false)}
                className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-on-accent/70 hover:text-on-accent hover:bg-card/10 transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="Schließen"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean, Subtle Confirmation Modal for Bulk Deletion (ohne kitschige "Sicherheitsabfrage") */}
      <AnimatePresence>
        {confirmDeleteState && (
          <motion.div
            key="confirm-delete-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setConfirmDeleteState(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs touch-none overscroll-contain"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-xl border border-border space-y-3.5 overscroll-contain"
            >
              <h3 className="text-lg font-bold text-text-main leading-snug">
                {confirmDeleteState.type === 'all'
                  ? 'Einkaufsliste leeren?'
                  : 'Erledigte Zutaten entfernen?'}
              </h3>

              <p className="text-[15px] text-text-muted leading-relaxed">
                {confirmDeleteState.type === 'all'
                  ? `Alle ${items.length} ${items.length === 1 ? 'Zutat wird' : 'Zutaten werden'} von deiner Einkaufsliste entfernt.`
                  : `Alle ${completedCount} erledigten Zutaten werden von deiner Liste entfernt.`}
              </p>

              <div className="flex items-center justify-end gap-2 pt-1.5">
                <button
                  id="cancel-delete-shopping-btn"
                  type="button"
                  onClick={() => setConfirmDeleteState(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-border bg-surface hover:bg-accent-tint text-text-main font-semibold text-[15px] transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                >
                  Abbrechen
                </button>
                <button
                  id="confirm-delete-shopping-btn"
                  type="button"
                  onClick={handleConfirmDeleteAction}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-on-accent font-semibold text-[15px] shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-4 h-4 text-on-accent" />
                  <span>{confirmDeleteState.type === 'all' ? 'Liste leeren' : 'Entfernen'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
