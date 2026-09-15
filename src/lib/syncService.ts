import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, ensureFirebaseAuth, handleFirestoreError, OperationType } from './firebase';
import { ShoppingItem, DayPlan, Recipe } from '../types';

export interface SyncConfig {
  mode: 'local' | 'family';
  groupId: string;
  groupName: string;
  memberName: string;
  joinedAt: string;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  mode: 'local',
  groupId: '',
  groupName: '',
  memberName: '',
  joinedAt: '',
};

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem('veggiechef_sync_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.mode === 'string') {
        return { ...DEFAULT_SYNC_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Error loading sync config:', e);
  }
  return DEFAULT_SYNC_CONFIG;
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem('veggiechef_sync_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving sync config:', e);
  }
}

// Clean and sanitize groupId (alphanumeric, hyphens, lowercase)
export function sanitizeGroupId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);
}

// Ensure family group document exists
export async function ensureGroupDocument(groupId: string, groupName: string, memberName: string): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  const groupRef = doc(db, 'family_groups', safeGroupId);
  try {
    const existing = await getDoc(groupRef);
    if (!existing.exists()) {
      await setDoc(groupRef, {
        groupId: safeGroupId,
        name: groupName || 'Unsere Familie',
        createdBy: memberName || 'Familienmitglied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}`);
  }
}

// Subscribe to shopping items
export function subscribeToFamilyShopping(
  groupId: string,
  onUpdate: (items: ShoppingItem[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  const itemsColl = collection(db, 'family_groups', safeGroupId, 'shopping_items');

  return onSnapshot(
    itemsColl,
    (snapshot) => {
      const items: ShoppingItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          name: data.name || '',
          amount: data.amount ?? '',
          unit: data.unit || '',
          category: data.category || 'sonstiges',
          completed: Boolean(data.completed),
          recipeSource: data.recipeSource || undefined,
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Shopping list snapshot error:', err);
      onError?.(err);
    }
  );
}

// Save or update a single shopping item in family group
export async function syncFamilyShoppingItem(groupId: string, item: ShoppingItem): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const safeItemId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const itemRef = doc(db, 'family_groups', safeGroupId, 'shopping_items', safeItemId);

  try {
    await setDoc(
      itemRef,
      {
        id: safeItemId,
        groupId: safeGroupId,
        name: item.name.slice(0, 120),
        amount: String(item.amount || '').slice(0, 32),
        unit: (item.unit || '').slice(0, 32),
        category: item.category || 'sonstiges',
        completed: item.completed,
        recipeSource: (item.recipeSource || '').slice(0, 120),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}/shopping_items/${safeItemId}`);
  }
}

// Delete a shopping item in family group
export async function deleteFamilyShoppingItem(groupId: string, itemId: string): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const safeItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const itemRef = doc(db, 'family_groups', safeGroupId, 'shopping_items', safeItemId);

  try {
    await deleteDoc(itemRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `family_groups/${safeGroupId}/shopping_items/${safeItemId}`);
  }
}

// Upload batch of shopping items (keeps cloud collection in exact sync with local state)
export async function uploadBatchShopping(groupId: string, items: ShoppingItem[]): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  try {
    const itemsColl = collection(db, 'family_groups', safeGroupId, 'shopping_items');
    const existingSnap = await getDocs(itemsColl);
    const validIds = new Set(items.map((i) => i.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)));

    const batch = writeBatch(db);

    // Delete items that no longer exist in the local list
    existingSnap.forEach((docSnap) => {
      if (!validIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Add or update current items
    for (const item of items) {
      const safeItemId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
      const itemRef = doc(db, 'family_groups', safeGroupId, 'shopping_items', safeItemId);
      batch.set(
        itemRef,
        {
          id: safeItemId,
          groupId: safeGroupId,
          name: item.name.slice(0, 120),
          amount: String(item.amount || '').slice(0, 32),
          unit: (item.unit || '').slice(0, 32),
          category: item.category || 'sonstiges',
          completed: Boolean(item.completed),
          recipeSource: (item.recipeSource || '').slice(0, 120),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}/shopping_items`);
  }
}

// Subscribe to weekly meal plan
export function subscribeToFamilyMealPlan(
  groupId: string,
  onUpdate: (plan: DayPlan[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  const planColl = collection(db, 'family_groups', safeGroupId, 'meal_days');

  return onSnapshot(
    planColl,
    (snapshot) => {
      if (snapshot.empty) return;
      const daysMap: Record<string, DayPlan> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const dayId = data.dayId || docSnap.id;
        daysMap[dayId] = {
          dayId,
          dayName: data.dayName || '',
          dateStr: data.dateStr || '',
          lunch: data.lunch || null,
          dinner: data.dinner || null,
        };
      });

      // Preserve canonical week order
      const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const sorted: DayPlan[] = [];
      for (const dId of dayOrder) {
        if (daysMap[dId]) {
          sorted.push(daysMap[dId]);
        }
      }
      if (sorted.length > 0) {
        onUpdate(sorted);
      }
    },
    (err) => {
      console.warn('Meal plan snapshot error:', err);
      onError?.(err);
    }
  );
}

// Sync day in weekly meal plan
export async function syncFamilyMealDay(groupId: string, dayPlan: DayPlan): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const safeDayId = dayPlan.dayId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  const dayRef = doc(db, 'family_groups', safeGroupId, 'meal_days', safeDayId);

  try {
    await setDoc(
      dayRef,
      {
        dayKey: safeDayId,
        dayId: safeDayId,
        groupId: safeGroupId,
        dayName: dayPlan.dayName,
        dateStr: dayPlan.dateStr,
        lunch: dayPlan.lunch,
        dinner: dayPlan.dinner,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}/meal_days/${safeDayId}`);
  }
}

// Upload whole week plan
export async function uploadBatchMealPlan(groupId: string, weekPlan: DayPlan[]): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const batch = writeBatch(db);

  for (const day of weekPlan) {
    const safeDayId = day.dayId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    const dayRef = doc(db, 'family_groups', safeGroupId, 'meal_days', safeDayId);
    batch.set(
      dayRef,
      {
        dayKey: safeDayId,
        dayId: safeDayId,
        groupId: safeGroupId,
        dayName: day.dayName,
        dateStr: day.dateStr,
        lunch: day.lunch,
        dinner: day.dinner,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}/meal_days`);
  }
}

// Subscribe to custom recipes
export function subscribeToFamilyRecipes(
  groupId: string,
  onUpdate: (recipes: Recipe[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  const recipesColl = collection(db, 'family_groups', safeGroupId, 'custom_recipes');

  return onSnapshot(
    recipesColl,
    (snapshot) => {
      const recipes: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Recipe;
        if (data && data.title) {
          recipes.push(data);
        }
      });
      onUpdate(recipes);
    },
    (err) => {
      console.warn('Custom recipes snapshot error:', err);
      onError?.(err);
    }
  );
}

// Sync custom recipe
export async function syncFamilyRecipe(groupId: string, recipe: Recipe): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const safeRecipeId = recipe.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const recipeRef = doc(db, 'family_groups', safeGroupId, 'custom_recipes', safeRecipeId);

  try {
    await setDoc(recipeRef, {
      ...recipe,
      groupId: safeGroupId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `family_groups/${safeGroupId}/custom_recipes/${safeRecipeId}`);
  }
}

// Delete custom recipe
export async function deleteFamilyRecipe(groupId: string, recipeId: string): Promise<void> {
  await ensureFirebaseAuth();
  const safeGroupId = sanitizeGroupId(groupId);
  const safeRecipeId = recipeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const recipeRef = doc(db, 'family_groups', safeGroupId, 'custom_recipes', safeRecipeId);

  try {
    await deleteDoc(recipeRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `family_groups/${safeGroupId}/custom_recipes/${safeRecipeId}`);
  }
}
