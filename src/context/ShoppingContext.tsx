import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShoppingItem, Recipe } from '../types';
import { loadFromLocalStorage, saveToLocalStorage, mergeOrAddShoppingItems, smartRoundGroceryAmount, cleanIngredientNameForShopping } from '../utils/helpers';
import { subscribeToFamilyShopping } from '../lib/syncService';
import { useToast } from './ToastContext';
import { useSync } from './SyncContext';

const INITIAL_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 'init-1', name: 'Hafer-Kochcreme', amount: '200', unit: 'ml', category: 'kuehlregal', completed: false, recipeSource: 'Gnocchi Pfanne' },
  { id: 'init-2', name: 'Kichererbsen', amount: '1', unit: 'Dose', category: 'huelsenfruechte', completed: false, recipeSource: 'Tikka Masala' },
  { id: 'init-3', name: 'Frischer Spinat', amount: '150', unit: 'g', category: 'gemuese', completed: false },
];

export interface ShoppingContextType {
  items: ShoppingItem[];
  shoppingItems: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  addToShoppingList: (recipe: Recipe, servings: number) => void;
  addMultipleToShoppingList: (items: { recipe: Recipe; servings: number }[]) => void;
  uncompletedCount: number;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export const ShoppingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { syncConfig, syncShoppingItems, registerDomainSync } = useSync();

  const [shoppingItems, setShoppingItemsState] = useState<ShoppingItem[]>(() => {
    const loaded = loadFromLocalStorage<ShoppingItem[] | null>('veggiechef_shopping', null);
    if (loaded && Array.isArray(loaded)) {
      // If loaded has items, save backup
      if (loaded.length > 0) {
        saveToLocalStorage('veggiechef_shopping_backup', loaded);
      }
      return loaded;
    }
    const backup = loadFromLocalStorage<ShoppingItem[] | null>('veggiechef_shopping_backup', null);
    if (backup && Array.isArray(backup) && backup.length > 0) {
      return backup;
    }
    return INITIAL_SHOPPING_ITEMS;
  });

  // Sync state with localStorage & maintain safety backup
  useEffect(() => {
    saveToLocalStorage('veggiechef_shopping', shoppingItems);
    if (shoppingItems.length > 0) {
      saveToLocalStorage('veggiechef_shopping_backup', shoppingItems);
    }
  }, [shoppingItems]);

  // Register with SyncContext to receive non-destructive merged shopping items on join
  useEffect(() => {
    const unregister = registerDomainSync({
      onMergeShopping: (mergedItems) => {
        if (mergedItems && mergedItems.length > 0) {
          setShoppingItemsState(mergedItems);
        }
      },
    });
    return unregister;
  }, [registerDomainSync]);

  // Realtime Family Sync Subscriptions (when mode is family)
  useEffect(() => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;

    const unsubShopping = subscribeToFamilyShopping(syncConfig.groupId, (cloudItems) => {
      // Guard against empty cloud snapshot erasing populated local shopping list
      if (cloudItems && cloudItems.length > 0) {
        setShoppingItemsState(cloudItems);
      }
    });

    return () => {
      unsubShopping();
    };
  }, [syncConfig.mode, syncConfig.groupId]);

  // Synchronized Setter (updates local state, debounces to cloud via SyncContext if in family mode)
  const setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>> = (updater) => {
    setShoppingItemsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (prev && prev.length > 0 && next.length === 0) {
        saveToLocalStorage('veggiechef_shopping_backup', prev);
      }
      syncShoppingItems(next, false);
      return next;
    });
  };

  // Add Recipe ingredients to Shopping List
  const addToShoppingList = (recipe: Recipe, servings: number) => {
    const newItems: ShoppingItem[] = recipe.ingredients.map((ing) => {
      let calcAmount: string | number = ing.amount;
      if (typeof ing.amount === 'number') {
        const rawScaled = (ing.amount / recipe.servings) * servings;
        calcAmount = smartRoundGroceryAmount(rawScaled, ing.unit, ing.name);
      }
      return {
        id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: cleanIngredientNameForShopping(ing.name),
        amount: calcAmount,
        unit: ing.unit,
        category: ing.category,
        completed: false,
        recipeSource: recipe.title,
      };
    });

    setShoppingItems((prev) => mergeOrAddShoppingItems(prev, newItems));
    showToast(`Zutaten für "${recipe.title}" auf die Einkaufsliste gesetzt!`);
  };

  // Add multiple recipes to shopping list (from weekly planner)
  const addMultipleToShoppingList = (items: { recipe: Recipe; servings: number }[]) => {
    let allNewItems: ShoppingItem[] = [];
    items.forEach(({ recipe, servings }) => {
      const converted = recipe.ingredients.map((ing) => {
        let calcAmount: string | number = ing.amount;
        if (typeof ing.amount === 'number') {
          const rawScaled = (ing.amount / recipe.servings) * servings;
          calcAmount = smartRoundGroceryAmount(rawScaled, ing.unit, ing.name);
        }
        return {
          id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: cleanIngredientNameForShopping(ing.name),
          amount: calcAmount,
          unit: ing.unit,
          category: ing.category,
          completed: false,
          recipeSource: recipe.title,
        };
      });
      allNewItems = [...allNewItems, ...converted];
    });

    setShoppingItems((prev) => mergeOrAddShoppingItems(prev, allNewItems));
    showToast(`Zutaten für ${items.length} Gerichte auf die Einkaufsliste gesetzt!`);
  };

  const uncompletedCount = shoppingItems.filter((i) => !i.completed).length;

  return (
    <ShoppingContext.Provider
      value={{
        items: shoppingItems,
        shoppingItems,
        setItems: setShoppingItems,
        setShoppingItems,
        addToShoppingList,
        addMultipleToShoppingList,
        uncompletedCount,
      }}
    >
      {children}
    </ShoppingContext.Provider>
  );
};

export function useShopping(): ShoppingContextType {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShopping must be used within a ShoppingProvider');
  }
  return context;
}
