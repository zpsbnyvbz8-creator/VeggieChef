import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  SyncConfig,
  SyncStatus,
  loadSyncConfig,
  saveSyncConfig,
  getSyncStatus,
  setSyncStatus,
  subscribeToSyncStatus,
  ensureGroupDocument,
  fetchRemoteShopping,
  uploadBatchShopping,
  fetchRemoteMealPlan,
  uploadBatchMealPlan,
  fetchRemoteRecipes,
  syncFamilyRecipe,
  deleteFamilyRecipe,
  queueShoppingSync,
  queueMealPlanSync,
  queueRecipeSync,
  mergeShoppingItems,
  mergeMealPlans,
  mergeCustomRecipes,
  flushPendingWrites,
} from '../lib/syncService';
import { useToast } from './ToastContext';
import { Recipe, DayPlan, ShoppingItem } from '../types';

export interface DomainSyncHandlers {
  onMergeShopping?: (items: ShoppingItem[]) => void;
  onMergeMealPlan?: (plan: DayPlan[]) => void;
  onMergeRecipes?: (recipes: Recipe[]) => void;
}

export interface SyncContextType {
  syncConfig: SyncConfig;
  setSyncConfig: React.Dispatch<React.SetStateAction<SyncConfig>>;
  syncStatus: SyncStatus;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  joinFamily: (
    groupId: string,
    groupName: string,
    memberName: string,
    pushData: boolean,
    currentData?: {
      shoppingItems?: ShoppingItem[];
      mealPlan?: DayPlan[];
      recipes?: Recipe[];
    }
  ) => Promise<void>;
  leaveFamily: () => void;
  forcePushData: (currentData: {
    shoppingItems?: ShoppingItem[];
    mealPlan?: DayPlan[];
    recipes?: Recipe[];
  }) => Promise<void>;
  syncShoppingItems: (items: ShoppingItem[], immediate?: boolean) => void;
  syncMealPlanDays: (plan: DayPlan[], immediate?: boolean) => void;
  syncSingleRecipe: (recipe: Recipe) => void;
  deleteSingleRecipe: (recipeId: string) => void;
  registerDomainSync: (handlers: DomainSyncHandlers) => () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [syncStatus, setSyncStatusLocal] = useState<SyncStatus>(() =>
    syncConfig.mode === 'family' && syncConfig.groupId ? getSyncStatus() : 'idle'
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { showToast } = useToast();

  const domainHandlersRef = useRef<Set<DomainSyncHandlers>>(new Set());

  // Subscribe to central sync service status events
  useEffect(() => {
    const unsub = subscribeToSyncStatus((newStatus) => {
      setSyncStatusLocal(newStatus);
    });
    return unsub;
  }, []);

  // Update status when config changes mode
  useEffect(() => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) {
      setSyncStatus('idle');
    }
  }, [syncConfig.mode, syncConfig.groupId]);

  const openSyncModal = () => setIsSyncModalOpen(true);
  const closeSyncModal = () => setIsSyncModalOpen(false);

  /**
   * Register domain contexts so they receive non-destructive merged data on join
   */
  const registerDomainSync = useCallback((handlers: DomainSyncHandlers) => {
    domainHandlersRef.current.add(handlers);
    return () => {
      domainHandlersRef.current.delete(handlers);
    };
  }, []);

  /**
   * Safe Join with non-destructive merge
   */
  const joinFamily = async (
    groupId: string,
    groupName: string,
    memberName: string,
    pushData: boolean,
    currentData?: {
      shoppingItems?: ShoppingItem[];
      mealPlan?: DayPlan[];
      recipes?: Recipe[];
    }
  ) => {
    setSyncStatus('syncing');

    try {
      await ensureGroupDocument(groupId, groupName, memberName);

      // 1. Fetch remote data from Firestore
      const [remoteShopping, remoteMealPlan, remoteRecipes] = await Promise.all([
        fetchRemoteShopping(groupId),
        fetchRemoteMealPlan(groupId),
        fetchRemoteRecipes(groupId),
      ]);

      // 2. Perform non-destructive merge: preserve all local and remote entries
      const mergedShopping = mergeShoppingItems(currentData?.shoppingItems || [], remoteShopping);
      const mergedMealPlan = mergeMealPlans(currentData?.mealPlan || [], remoteMealPlan);
      const mergedRecipes = mergeCustomRecipes(currentData?.recipes || [], remoteRecipes);

      // 3. Persist new sync configuration
      const newConfig: SyncConfig = {
        mode: 'family',
        groupId,
        groupName: groupName || 'Unsere Familie',
        memberName: memberName || 'Familienmitglied',
        joinedAt: new Date().toISOString(),
      };
      setSyncConfig(newConfig);
      saveSyncConfig(newConfig);

      // 4. Update domain contexts with merged data
      domainHandlersRef.current.forEach((handler) => {
        handler.onMergeShopping?.(mergedShopping);
        handler.onMergeMealPlan?.(mergedMealPlan);
        handler.onMergeRecipes?.(mergedRecipes);
      });

      // 5. If pushData or merged content has items, synchronize merged state to cloud
      const uploadPromises: Promise<unknown>[] = [];
      if (mergedShopping.length > 0) {
        uploadPromises.push(uploadBatchShopping(groupId, mergedShopping));
      }
      if (mergedMealPlan.length > 0) {
        uploadPromises.push(uploadBatchMealPlan(groupId, mergedMealPlan));
      }
      if (mergedRecipes.length > 0) {
        for (const recipe of mergedRecipes.filter((r) => r.isCustomAi)) {
          uploadPromises.push(syncFamilyRecipe(groupId, recipe));
        }
      }

      await Promise.allSettled(uploadPromises);

      setSyncStatus('synced');
      showToast(`Erfolgreich mit Familie „${groupName || groupId}“ verbunden! 👥`);
    } catch (err) {
      console.warn('[Sync] Join family error:', err);
      setSyncStatus('error');
      showToast('Verbindung hergestellt. Lokale Daten gesichert.');
    }
  };

  /**
   * Leave family and cleanly return to local-only mode
   */
  const leaveFamily = () => {
    flushPendingWrites();
    const localConfig: SyncConfig = {
      mode: 'local',
      groupId: '',
      groupName: '',
      memberName: '',
      joinedAt: '',
    };
    setSyncConfig(localConfig);
    saveSyncConfig(localConfig);
    setSyncStatus('idle');
    showToast('Zu lokalem Modus gewechselt. Deine Daten bleiben privat auf diesem Gerät.');
  };

  /**
   * Force push current data directly to Firestore
   */
  const forcePushData = async (currentData: {
    shoppingItems?: ShoppingItem[];
    mealPlan?: DayPlan[];
    recipes?: Recipe[];
  }) => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;

    setSyncStatus('syncing');
    try {
      const uploadPromises: Promise<unknown>[] = [];

      if (currentData.shoppingItems && currentData.shoppingItems.length > 0) {
        uploadPromises.push(uploadBatchShopping(syncConfig.groupId, currentData.shoppingItems));
      }
      if (currentData.mealPlan && currentData.mealPlan.length > 0) {
        uploadPromises.push(uploadBatchMealPlan(syncConfig.groupId, currentData.mealPlan));
      }
      if (currentData.recipes) {
        const customOnes = currentData.recipes.filter((r) => r.isCustomAi);
        for (const cr of customOnes) {
          uploadPromises.push(syncFamilyRecipe(syncConfig.groupId, cr));
        }
      }

      await Promise.allSettled(uploadPromises);
      setSyncStatus('synced');
      showToast('Lokale Daten erfolgreich für die Familie synchronisiert! ☁️');
    } catch (err) {
      console.warn('[Sync] Force push error:', err);
      setSyncStatus('error');
      showToast('Synchronisation fehlgeschlagen – offline gespeichert.');
    }
  };

  /**
   * Resilient debounced shopping items synchronization
   */
  const syncShoppingItems = (items: ShoppingItem[], immediate = false) => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;
    if (immediate) {
      setSyncStatus('syncing');
      uploadBatchShopping(syncConfig.groupId, items)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    } else {
      queueShoppingSync(syncConfig.groupId, items, 600);
    }
  };

  /**
   * Resilient debounced meal plan synchronization
   */
  const syncMealPlanDays = (plan: DayPlan[], immediate = false) => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;
    if (immediate) {
      setSyncStatus('syncing');
      uploadBatchMealPlan(syncConfig.groupId, plan)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    } else {
      queueMealPlanSync(syncConfig.groupId, plan, 600);
    }
  };

  /**
   * Resilient debounced recipe synchronization
   */
  const syncSingleRecipe = (recipe: Recipe) => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;
    queueRecipeSync(syncConfig.groupId, recipe, 600);
  };

  /**
   * Resilient recipe deletion
   */
  const deleteSingleRecipe = (recipeId: string) => {
    if (syncConfig.mode !== 'family' || !syncConfig.groupId) return;
    deleteFamilyRecipe(syncConfig.groupId, recipeId).catch((err) =>
      console.warn('[Sync] Delete recipe error:', err)
    );
  };

  return (
    <SyncContext.Provider
      value={{
        syncConfig,
        setSyncConfig,
        syncStatus,
        isSyncModalOpen,
        setIsSyncModalOpen,
        openSyncModal,
        closeSyncModal,
        joinFamily,
        leaveFamily,
        forcePushData,
        syncShoppingItems,
        syncMealPlanDays,
        syncSingleRecipe,
        deleteSingleRecipe,
        registerDomainSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
