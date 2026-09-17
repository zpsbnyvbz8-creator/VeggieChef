import React, { createContext, useContext, useState } from 'react';
import {
  SyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  ensureGroupDocument,
  uploadBatchShopping,
  uploadBatchMealPlan,
  syncFamilyRecipe,
} from '../lib/syncService';
import { useToast } from './ToastContext';
import { Recipe, DayPlan, ShoppingItem } from '../types';

export interface SyncContextType {
  syncConfig: SyncConfig;
  setSyncConfig: React.Dispatch<React.SetStateAction<SyncConfig>>;
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
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { showToast } = useToast();

  const openSyncModal = () => setIsSyncModalOpen(true);
  const closeSyncModal = () => setIsSyncModalOpen(false);

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
    await ensureGroupDocument(groupId, groupName, memberName);
    const newConfig: SyncConfig = {
      mode: 'family',
      groupId,
      groupName,
      memberName,
      joinedAt: new Date().toISOString(),
    };
    setSyncConfig(newConfig);
    saveSyncConfig(newConfig);

    if (pushData && currentData) {
      if (currentData.shoppingItems && currentData.shoppingItems.length > 0) {
        await uploadBatchShopping(groupId, currentData.shoppingItems);
      }
      if (currentData.mealPlan && currentData.mealPlan.length > 0) {
        await uploadBatchMealPlan(groupId, currentData.mealPlan);
      }
      if (currentData.recipes) {
        const customOnes = currentData.recipes.filter((r) => r.isCustomAi);
        for (const cr of customOnes) {
          await syncFamilyRecipe(groupId, cr);
        }
      }
    }
    showToast(`Erfolgreich mit Familie „${groupName || groupId}“ verbunden! 👥`);
  };

  const leaveFamily = () => {
    const localConfig: SyncConfig = {
      mode: 'local',
      groupId: '',
      groupName: '',
      memberName: '',
      joinedAt: '',
    };
    setSyncConfig(localConfig);
    saveSyncConfig(localConfig);
    showToast('Zu lokalem Modus gewechselt. Deine Daten bleiben privat auf diesem iPhone.');
  };

  const forcePushData = async (currentData: {
    shoppingItems?: ShoppingItem[];
    mealPlan?: DayPlan[];
    recipes?: Recipe[];
  }) => {
    if (!syncConfig.groupId) return;
    if (currentData.shoppingItems && currentData.shoppingItems.length > 0) {
      await uploadBatchShopping(syncConfig.groupId, currentData.shoppingItems);
    }
    if (currentData.mealPlan && currentData.mealPlan.length > 0) {
      await uploadBatchMealPlan(syncConfig.groupId, currentData.mealPlan);
    }
    if (currentData.recipes) {
      const customOnes = currentData.recipes.filter((r) => r.isCustomAi);
      for (const cr of customOnes) {
        await syncFamilyRecipe(syncConfig.groupId, cr);
      }
    }
    showToast('Lokale Daten erfolgreich für die Familie synchronisiert! ☁️');
  };

  return (
    <SyncContext.Provider
      value={{
        syncConfig,
        setSyncConfig,
        isSyncModalOpen,
        setIsSyncModalOpen,
        openSyncModal,
        closeSyncModal,
        joinFamily,
        leaveFamily,
        forcePushData,
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
