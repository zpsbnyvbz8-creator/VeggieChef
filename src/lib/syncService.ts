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
import { db, ensureFirebaseAuth } from './firebase';
import { ShoppingItem, DayPlan, Recipe } from '../types';
import { safeStorage } from '../utils/helpers';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncConfig {
  mode: 'local' | 'family';
  groupId: string;
  groupName: string;
  memberName: string;
  joinedAt: string;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  mode: 'local',
  groupId: '',
  groupName: '',
  memberName: '',
  joinedAt: '',
};

// ==========================================
// 1. Sync Configuration & LocalStorage Helpers
// ==========================================

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = safeStorage.getItem('veggiechef_sync_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.mode === 'string') {
        return { ...DEFAULT_SYNC_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('[Sync] Error loading sync config:', e);
  }
  return DEFAULT_SYNC_CONFIG;
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    safeStorage.setItem('veggiechef_sync_config', JSON.stringify(config));
  } catch (e) {
    console.warn('[Sync] Error saving sync config:', e);
  }
}

export function sanitizeGroupId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

/**
 * Generates an unguessable, cryptographically secure 14-character alphanumeric family code
 * preventing enumeration and brute force attacks on Firestore.
 */
export function generateSecureFamilyCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // Clean unambiguous alphanumeric set
  let code = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(14);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < randomBytes.length; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 14; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
}

// ==========================================
// 2. Sync Status Observer (idle, syncing, synced, error)
// ==========================================

let currentSyncStatus: SyncStatus = 'idle';
const syncStatusListeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function setSyncStatus(status: SyncStatus): void {
  if (currentSyncStatus === status) return;
  currentSyncStatus = status;
  syncStatusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.warn('[Sync] Status listener error:', e);
    }
  });
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncStatusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

// ==========================================
// 3. Echo-Suppression & Hash State
// ==========================================

function fastHash(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(Math.random());
  }
}

// Track last hashes written locally to ignore own snapshot reflections
const lastLocalWrite = {
  shoppingHash: '',
  mealPlanHash: '',
  recipeHashes: new Map<string, string>(),
};

// ==========================================
// 4. Debounced Cloud Write Management (600ms)
// ==========================================

let shoppingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingShoppingBatch: { groupId: string; items: ShoppingItem[] } | null = null;

let mealPlanDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingMealPlanBatch: { groupId: string; plan: DayPlan[] } | null = null;

const recipeDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Queue debounced shopping list write to avoid quota burn and UI stuttering
 */
export function queueShoppingSync(groupId: string, items: ShoppingItem[], delayMs = 600): void {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  // Record signature to suppress incoming reflection
  lastLocalWrite.shoppingHash = fastHash(items);
  pendingShoppingBatch = { groupId: safeGroupId, items };

  if (shoppingDebounceTimer) {
    clearTimeout(shoppingDebounceTimer);
  }

  setSyncStatus('syncing');

  shoppingDebounceTimer = setTimeout(async () => {
    shoppingDebounceTimer = null;
    if (!pendingShoppingBatch) return;
    const { groupId: gid, items: itms } = pendingShoppingBatch;
    pendingShoppingBatch = null;

    try {
      await uploadBatchShopping(gid, itms);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('[Sync] Debounced shopping upload error:', err);
      setSyncStatus('error');
    }
  }, delayMs);
}

/**
 * Queue debounced meal plan write
 */
export function queueMealPlanSync(groupId: string, plan: DayPlan[], delayMs = 600): void {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  lastLocalWrite.mealPlanHash = fastHash(plan);
  pendingMealPlanBatch = { groupId: safeGroupId, plan };

  if (mealPlanDebounceTimer) {
    clearTimeout(mealPlanDebounceTimer);
  }

  setSyncStatus('syncing');

  mealPlanDebounceTimer = setTimeout(async () => {
    mealPlanDebounceTimer = null;
    if (!pendingMealPlanBatch) return;
    const { groupId: gid, plan: p } = pendingMealPlanBatch;
    pendingMealPlanBatch = null;

    try {
      await uploadBatchMealPlan(gid, p);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('[Sync] Debounced meal plan upload error:', err);
      setSyncStatus('error');
    }
  }, delayMs);
}

/**
 * Queue debounced recipe write
 */
export function queueRecipeSync(groupId: string, recipe: Recipe, delayMs = 600): void {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId || !recipe.id) return;

  const hash = fastHash(recipe);
  lastLocalWrite.recipeHashes.set(recipe.id, hash);

  const existingTimer = recipeDebounceTimers.get(recipe.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  setSyncStatus('syncing');

  const timer = setTimeout(async () => {
    recipeDebounceTimers.delete(recipe.id);
    try {
      await syncFamilyRecipe(safeGroupId, recipe);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('[Sync] Debounced recipe upload error:', err);
      setSyncStatus('error');
    }
  }, delayMs);

  recipeDebounceTimers.set(recipe.id, timer);
}

/**
 * Flush any in-flight pending debounced writes immediately (e.g. before unmount or sync modal push)
 */
export async function flushPendingWrites(): Promise<void> {
  const promises: Promise<unknown>[] = [];

  if (shoppingDebounceTimer && pendingShoppingBatch) {
    clearTimeout(shoppingDebounceTimer);
    shoppingDebounceTimer = null;
    const batch = pendingShoppingBatch;
    pendingShoppingBatch = null;
    promises.push(uploadBatchShopping(batch.groupId, batch.items));
  }

  if (mealPlanDebounceTimer && pendingMealPlanBatch) {
    clearTimeout(mealPlanDebounceTimer);
    mealPlanDebounceTimer = null;
    const batch = pendingMealPlanBatch;
    pendingMealPlanBatch = null;
    promises.push(uploadBatchMealPlan(batch.groupId, batch.plan));
  }

  try {
    await Promise.allSettled(promises);
  } catch {}
}

// ==========================================
// 5. Firestore Direct CRUD Operations
// ==========================================

export async function ensureGroupDocument(groupId: string, groupName: string, memberName: string): Promise<void> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  try {
    await ensureFirebaseAuth();
    const groupRef = doc(db, 'family_groups', safeGroupId);
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
    console.warn('[Sync] ensureGroupDocument error (safe offline fallback):', err);
  }
}

export async function fetchRemoteShopping(groupId: string): Promise<ShoppingItem[]> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return [];

  try {
    await ensureFirebaseAuth();
    const itemsColl = collection(db, 'family_groups', safeGroupId, 'shopping_items');
    const snapshot = await getDocs(itemsColl);
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
    return items;
  } catch (err) {
    console.warn('[Sync] fetchRemoteShopping error:', err);
    return [];
  }
}

export async function uploadBatchShopping(groupId: string, items: ShoppingItem[]): Promise<void> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return;

  try {
    await ensureFirebaseAuth();
    const itemsColl = collection(db, 'family_groups', safeGroupId, 'shopping_items');
    const existingSnap = await getDocs(itemsColl);
    const validIds = new Set(items.map((i) => i.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)));

    const batch = writeBatch(db);

    // Remove deleted items from cloud
    existingSnap.forEach((docSnap) => {
      if (!validIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Add / update items
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
    lastLocalWrite.shoppingHash = fastHash(items);
  } catch (err) {
    console.warn('[Sync] uploadBatchShopping error:', err);
    throw err;
  }
}

export async function fetchRemoteMealPlan(groupId: string): Promise<DayPlan[]> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return [];

  try {
    await ensureFirebaseAuth();
    const planColl = collection(db, 'family_groups', safeGroupId, 'meal_days');
    const snapshot = await getDocs(planColl);
    if (snapshot.empty) return [];

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

    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const sorted: DayPlan[] = [];
    for (const dId of dayOrder) {
      if (daysMap[dId]) {
        sorted.push(daysMap[dId]);
      }
    }
    return sorted;
  } catch (err) {
    console.warn('[Sync] fetchRemoteMealPlan error:', err);
    return [];
  }
}

export async function uploadBatchMealPlan(groupId: string, weekPlan: DayPlan[]): Promise<void> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId || !weekPlan || weekPlan.length === 0) return;

  try {
    await ensureFirebaseAuth();
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
          dayName: day.dayName || '',
          dateStr: day.dateStr || '',
          lunch: day.lunch || null,
          dinner: day.dinner || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    lastLocalWrite.mealPlanHash = fastHash(weekPlan);
  } catch (err) {
    console.warn('[Sync] uploadBatchMealPlan error:', err);
    throw err;
  }
}

export async function fetchRemoteRecipes(groupId: string): Promise<Recipe[]> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) return [];

  try {
    await ensureFirebaseAuth();
    const recipesColl = collection(db, 'family_groups', safeGroupId, 'custom_recipes');
    const snapshot = await getDocs(recipesColl);
    const recipes: Recipe[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Recipe;
      if (data && data.title) {
        recipes.push(data);
      }
    });
    return recipes;
  } catch (err) {
    console.warn('[Sync] fetchRemoteRecipes error:', err);
    return [];
  }
}

export async function syncFamilyRecipe(groupId: string, recipe: Recipe): Promise<void> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId || !recipe.id) return;

  try {
    await ensureFirebaseAuth();
    const safeRecipeId = recipe.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const recipeRef = doc(db, 'family_groups', safeGroupId, 'custom_recipes', safeRecipeId);

    await setDoc(
      recipeRef,
      {
        ...recipe,
        groupId: safeGroupId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    lastLocalWrite.recipeHashes.set(recipe.id, fastHash(recipe));
  } catch (err) {
    console.warn('[Sync] syncFamilyRecipe error:', err);
    throw err;
  }
}

export async function deleteFamilyRecipe(groupId: string, recipeId: string): Promise<void> {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId || !recipeId) return;

  try {
    await ensureFirebaseAuth();
    const safeRecipeId = recipeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const recipeRef = doc(db, 'family_groups', safeGroupId, 'custom_recipes', safeRecipeId);
    await deleteDoc(recipeRef);
    lastLocalWrite.recipeHashes.delete(recipeId);
  } catch (err) {
    console.warn('[Sync] deleteFamilyRecipe error:', err);
    throw err;
  }
}

// ==========================================
// 6. Safe Realtime Subscriptions with Echo Filters
// ==========================================

export function subscribeToFamilyShopping(
  groupId: string,
  onUpdate: (items: ShoppingItem[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) {
    return () => {};
  }

  const itemsColl = collection(db, 'family_groups', safeGroupId, 'shopping_items');

  try {
    const unsub = onSnapshot(
      itemsColl,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Skip uncommitted local writes from firestore client cache
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        // Safety: Do not overwrite local shopping list with an empty snapshot (e.g. fresh group or initialization)
        if (snapshot.empty) {
          return;
        }

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

        // Suppress echo if this snapshot equals what we just wrote
        const incomingHash = fastHash(items);
        if (incomingHash === lastLocalWrite.shoppingHash) {
          return;
        }

        lastLocalWrite.shoppingHash = incomingHash;
        setSyncStatus('synced');
        onUpdate(items);
      },
      (err) => {
        console.warn('[Sync] Shopping snapshot subscription error (offline safe):', err);
        setSyncStatus('error');
        onError?.(err);
      }
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  } catch (err) {
    console.warn('[Sync] Failed to attach shopping snapshot listener:', err);
    onError?.(err);
    return () => {};
  }
}

export function subscribeToFamilyMealPlan(
  groupId: string,
  onUpdate: (plan: DayPlan[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) {
    return () => {};
  }

  const planColl = collection(db, 'family_groups', safeGroupId, 'meal_days');

  try {
    const unsub = onSnapshot(
      planColl,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }
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

        const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const sorted: DayPlan[] = [];
        for (const dId of dayOrder) {
          if (daysMap[dId]) {
            sorted.push(daysMap[dId]);
          }
        }

        if (sorted.length > 0) {
          const incomingHash = fastHash(sorted);
          if (incomingHash === lastLocalWrite.mealPlanHash) {
            return;
          }
          lastLocalWrite.mealPlanHash = incomingHash;
          setSyncStatus('synced');
          onUpdate(sorted);
        }
      },
      (err) => {
        console.warn('[Sync] Meal plan snapshot subscription error (offline safe):', err);
        setSyncStatus('error');
        onError?.(err);
      }
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  } catch (err) {
    console.warn('[Sync] Failed to attach meal plan listener:', err);
    onError?.(err);
    return () => {};
  }
}

export function subscribeToFamilyRecipes(
  groupId: string,
  onUpdate: (recipes: Recipe[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const safeGroupId = sanitizeGroupId(groupId);
  if (!safeGroupId) {
    return () => {};
  }

  const recipesColl = collection(db, 'family_groups', safeGroupId, 'custom_recipes');

  try {
    const unsub = onSnapshot(
      recipesColl,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        const recipes: Recipe[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Recipe;
          if (data && data.title) {
            recipes.push(data);
          }
        });

        setSyncStatus('synced');
        onUpdate(recipes);
      },
      (err) => {
        console.warn('[Sync] Recipes snapshot subscription error (offline safe):', err);
        setSyncStatus('error');
        onError?.(err);
      }
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  } catch (err) {
    console.warn('[Sync] Failed to attach custom recipes listener:', err);
    onError?.(err);
    return () => {};
  }
}

// ==========================================
// 7. Non-Destructive Data Merge Strategies
// ==========================================

/**
 * Merge local and remote shopping items without losing any uncompleted groceries
 */
export function mergeShoppingItems(localItems: ShoppingItem[], remoteItems: ShoppingItem[]): ShoppingItem[] {
  const mergedMap = new Map<string, ShoppingItem>();

  // 1. Add all remote items
  for (const item of remoteItems) {
    mergedMap.set(item.id, { ...item });
  }

  // 2. Merge local items
  for (const local of localItems) {
    const existing = mergedMap.get(local.id);
    if (!existing) {
      // Also check if an item with the same name exists to avoid duplicate entries
      const matchingByName = Array.from(mergedMap.values()).find(
        (i) => i.name.trim().toLowerCase() === local.name.trim().toLowerCase()
      );
      if (matchingByName) {
        // If local is not completed, don't accidentally mark as completed
        if (!local.completed) {
          matchingByName.completed = false;
        }
      } else {
        mergedMap.set(local.id, { ...local });
      }
    } else {
      // If either copy is uncompleted, preserve it as uncompleted
      if (!local.completed || !existing.completed) {
        existing.completed = false;
      }
      if (!existing.amount && local.amount) {
        existing.amount = local.amount;
      }
      if (!existing.unit && local.unit) {
        existing.unit = local.unit;
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Merge weekly meal plans: Never overwrite an existing planned lunch/dinner with null
 */
export function mergeMealPlans(localPlan: DayPlan[], remotePlan: DayPlan[]): DayPlan[] {
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const localMap = new Map(localPlan.map((d) => [d.dayId, d]));
  const remoteMap = new Map(remotePlan.map((d) => [d.dayId, d]));

  return dayOrder.map((dayId) => {
    const loc = localMap.get(dayId);
    const rem = remoteMap.get(dayId);

    if (!loc && !rem) {
      return { dayId, dayName: '', dateStr: '', lunch: null, dinner: null };
    }
    if (!rem && loc) return loc;
    if (!loc && rem) return rem;

    // Both exist: preserve planned meals
    return {
      dayId,
      dayName: rem?.dayName || loc?.dayName || '',
      dateStr: rem?.dateStr || loc?.dateStr || '',
      lunch: rem?.lunch || loc?.lunch || null,
      dinner: rem?.dinner || loc?.dinner || null,
    };
  });
}

/**
 * Merge custom recipes: combine remote custom recipes with local custom recipes
 */
export function mergeCustomRecipes(localRecipes: Recipe[], remoteRecipes: Recipe[]): Recipe[] {
  const mergedMap = new Map<string, Recipe>();

  // Include all remote recipes
  for (const r of remoteRecipes) {
    mergedMap.set(r.id, r);
  }

  // Include any local recipes not in remote
  for (const r of localRecipes) {
    if (!mergedMap.has(r.id)) {
      mergedMap.set(r.id, r);
    }
  }

  return Array.from(mergedMap.values());
}
