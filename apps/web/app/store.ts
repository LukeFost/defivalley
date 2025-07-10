import { createStore, useStore as useZustandStore } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createContext, useContext, useMemo } from 'react';
import { AppState, AppActions, initialState } from './store-types';

// Create a memory storage for the server-side rendering
const createMemoryStorage = () => {
  const memoryStore = new Map<string, string>();
  return {
    getItem: (name: string): string | null => {
      return memoryStore.get(name) ?? null;
    },
    setItem: (name: string, value: string): void => {
      memoryStore.set(name, value);
    },
    removeItem: (name: string): void => {
      memoryStore.delete(name);
    },
  };
};

// Custom serializer to handle BigInt values
const bigIntSerializer = {
  serialize: (value: any) => {
    return JSON.stringify(value, (key, val) => {
      if (typeof val === 'bigint') {
        return val.toString() + 'n';
      }
      return val;
    });
  },
  deserialize: (value: string) => {
    return JSON.parse(value, (key, val) => {
      if (typeof val === 'string' && val.endsWith('n')) {
        try {
          return BigInt(val.slice(0, -1));
        } catch {
          return val;
        }
      }
      return val;
    });
  }
};

// Create the factory function for the store
export const makeStore = () => {
  return createStore<AppState & AppActions>()(
    devtools(
      persist(
        immer((set, get) => ({
          ...initialState,
          
          // Transaction management
          addTransaction: (tx) => {
            const id = `${tx.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newTx = {
              ...tx,
              id,
              startTime: Date.now(),
              lastUpdated: Date.now(),
              retryCount: 0
            };
            
            set((state) => {
              state.activeTransactions.push(newTx);
            });
            
            return id;
          },
          
          updateTransaction: (id, updates) => {
            set((state) => {
              const tx = state.activeTransactions.find(t => t.id === id);
              if (tx) {
                Object.assign(tx, updates);
                tx.lastUpdated = Date.now();
              }
            });
          },
          
          completeTransaction: (id) => {
            set((state) => {
              const txIndex = state.activeTransactions.findIndex(t => t.id === id);
              if (txIndex !== -1) {
                const tx = state.activeTransactions[txIndex];
                tx.status = 'completed';
                tx.lastUpdated = Date.now();
                
                // Move to history
                state.transactionHistory.unshift(tx);
                state.activeTransactions.splice(txIndex, 1);
                
                // Keep only last 50 transactions in history
                if (state.transactionHistory.length > 50) {
                  state.transactionHistory = state.transactionHistory.slice(0, 50);
                }
              }
            });
          },
          
          failTransaction: (id, error) => {
            set((state) => {
              const tx = state.activeTransactions.find(t => t.id === id);
              if (tx) {
                tx.status = 'failed';
                tx.error = error;
                tx.lastUpdated = Date.now();
              }
            });
          },
          
          retryTransaction: (id) => {
            set((state) => {
              const tx = state.activeTransactions.find(t => t.id === id);
              if (tx) {
                tx.retryCount += 1;
                tx.status = 'preparing';
                tx.error = undefined;
                tx.lastUpdated = Date.now();
              }
            });
          },
          
          clearCompletedTransactions: () => {
            set((state) => {
              // Clear transaction history
              state.transactionHistory = [];
              
              // Also clear any active transactions that are completed/failed
              // This handles transactions that got stuck in active state
              state.activeTransactions = state.activeTransactions.filter(
                tx => tx.status !== 'completed' && tx.status !== 'failed'
              );
            });
          },
          
          // Game state management
          setPlayerState: (playerState) => {
            set((state) => {
              state.playerState = {
                ...playerState,
                level: get().calculateLevel(playerState.experience)
              };
            });
          },
          
          updateSeedPositions: (positions) => {
            set((state) => {
              state.seedPositions = positions.map(pos => ({
                ...pos,
                isReady: Date.now() / 1000 > pos.plantTime + (get().seedTypes.find(t => t.id === pos.seedType)?.growthTime || 0),
                estimatedYield: get().estimateYield(pos.amount, pos.seedType, pos.plantTime)
              }));
            });
          },
          
          addOptimisticSeed: (seedType, amount, txId) => {
            const seedId = Date.now(); // Temporary ID
            const plantTime = Math.floor(Date.now() / 1000);
            
            set((state) => {
              state.seedPositions.push({
                seedId,
                seedType,
                amount,
                plantTime,
                isGrowing: true,
                crossChainTxId: txId,
                isReady: false,
                estimatedYield: get().estimateYield(amount, seedType, plantTime)
              });
            });
            
            return seedId;
          },
          
          updateSeedPosition: (seedId, updates) => {
            set((state) => {
              const seed = state.seedPositions.find(s => s.seedId === seedId);
              if (seed) {
                Object.assign(seed, updates);
              }
            });
          },
          
          setVaultPosition: (position) => {
            set((state) => {
              state.vaultPosition = position;
            });
          },
          
          setSeedTypes: (types) => {
            set((state) => {
              state.seedTypes = types;
            });
          },
          
          // UI actions
          setSelectedSeedType: (type) => {
            set((state) => {
              state.ui.selectedSeedType = type;
            });
          },
          
          setPlantAmount: (amount) => {
            set((state) => {
              state.ui.plantAmount = amount;
            });
          },
          
          toggleTransactionTracker: () => {
            set((state) => {
              state.ui.showTransactionTracker = !state.ui.showTransactionTracker;
            });
          },
          
          showPlantModal: () => {
            set((state) => {
              state.ui.showPlantModal = true;
            });
          },
          
          hidePlantModal: () => {
            set((state) => {
              state.ui.showPlantModal = false;
              state.ui.plantAmount = '';
            });
          },
          
          showHarvestModal: () => {
            set((state) => {
              state.ui.showHarvestModal = true;
            });
          },
          
          hideHarvestModal: () => {
            set((state) => {
              state.ui.showHarvestModal = false;
            });
          },
          
          showSettingsModal: () => {
            set((state) => {
              state.ui.showSettingsModal = true;
            });
          },
          
          hideSettingsModal: () => {
            set((state) => {
              state.ui.showSettingsModal = false;
            });
          },
          
          addNotification: (notification) => {
            const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            set((state) => {
              state.ui.notifications.push({
                ...notification,
                id,
                timestamp: Date.now()
              });
            });
            
            // Auto-remove non-persistent notifications after 5 seconds
            if (!notification.persistent) {
              setTimeout(() => {
                get().removeNotification(id);
              }, 5000);
            }
          },
          
          removeNotification: (id) => {
            set((state) => {
              state.ui.notifications = state.ui.notifications.filter(n => n.id !== id);
            });
          },
          
          clearNotifications: () => {
            set((state) => {
              state.ui.notifications = [];
            });
          },
          
          // Utility functions
          reset: () => {
            set(initialState);
          },
          
          calculateLevel: (experience) => {
            // Simple level calculation: level = floor(experience / 100) + 1
            return Math.floor(experience / 100) + 1;
          },
          
          estimateYield: (amount, seedType, plantTime) => {
            const now = Date.now() / 1000;
            const elapsed = now - plantTime;
            const seedTypeData = get().seedTypes.find(t => t.id === seedType);
            
            if (!seedTypeData) return BigInt(0);
            
            // Simple yield calculation: APY-based compounding
            // Convert BigInt to Number for calculations, then back to BigInt
            const yearlyYield = (Number(amount) * seedTypeData.apy) / 100;
            const secondsInYear = 365 * 24 * 60 * 60;
            const currentYield = (yearlyYield * elapsed) / secondsInYear;
            
            return BigInt(Math.floor(currentYield));
          }
        })),
        {
          name: 'defi-valley-storage',
          // Use the idiomatic one-liner for SSR-safe storage with BigInt serialization
          storage: createJSONStorage(() =>
            typeof window !== 'undefined' ? localStorage : createMemoryStorage()
          ),
          serialize: bigIntSerializer.serialize,
          deserialize: bigIntSerializer.deserialize,
          skipHydration: true, // Recommended to delay hydration until manual rehydration
          // Exclude transient UI state from persistence - modals should always start closed
          partialize: (state) => ({
            ...state,
            ui: {
              ...state.ui,
              showPlantModal: false,
              showHarvestModal: false,
              showSettingsModal: false,
              showTransactionTracker: false,
            }
          }),
        }
      ),
      { name: 'DeFi Valley Store' }
    )
  );
};

// Create the store context
export const StoreContext = createContext<ReturnType<typeof makeStore> | null>(null);

// Create a hook to use the store
export const useAppStore = <T>(selector: (state: AppState & AppActions) => T) => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useAppStore must be used within a StoreProvider.');
  }
  return useZustandStore(store, selector);
};

// Export individual hooks for convenience (backward compatibility)
export const useTransactions = () => {
  const active = useAppStore(state => state.activeTransactions || []);
  const history = useAppStore(state => state.transactionHistory || []);
  const add = useAppStore(state => state.addTransaction);
  const update = useAppStore(state => state.updateTransaction);
  const complete = useAppStore(state => state.completeTransaction);
  const fail = useAppStore(state => state.failTransaction);
  const retry = useAppStore(state => state.retryTransaction);
  const clearCompleted = useAppStore(state => state.clearCompletedTransactions);
  
  return useMemo(() => ({
    active,
    history,
    add,
    update,
    complete,
    fail,
    retry,
    clearCompleted
  }), [active, history, add, update, complete, fail, retry, clearCompleted]);
};

export const usePlayerData = () => {
  const playerState = useAppStore(state => state.playerState);
  const seedPositions = useAppStore(state => state.seedPositions);
  const vaultPosition = useAppStore(state => state.vaultPosition);
  const seedTypes = useAppStore(state => state.seedTypes);
  const setPlayerState = useAppStore(state => state.setPlayerState);
  const updateSeedPositions = useAppStore(state => state.updateSeedPositions);
  const setVaultPosition = useAppStore(state => state.setVaultPosition);
  const addOptimisticSeed = useAppStore(state => state.addOptimisticSeed);
  
  return useMemo(() => ({
    playerState,
    seedPositions,
    vaultPosition,
    seedTypes,
    setPlayerState,
    updateSeedPositions,
    setVaultPosition,
    addOptimisticSeed
  }), [playerState, seedPositions, vaultPosition, seedTypes, setPlayerState, updateSeedPositions, setVaultPosition, addOptimisticSeed]);
};

export const useUI = () => {
  // UI state values (boolean flags for modal visibility)
  const selectedSeedType = useAppStore(state => state.ui.selectedSeedType);
  const plantAmount = useAppStore(state => state.ui.plantAmount);
  const showTransactionTracker = useAppStore(state => state.ui.showTransactionTracker);
  const isPlantModalOpen = useAppStore(state => state.ui.showPlantModal);
  const isHarvestModalOpen = useAppStore(state => state.ui.showHarvestModal);
  const isSettingsModalOpen = useAppStore(state => state.ui.showSettingsModal);
  const notifications = useAppStore(state => state.ui.notifications);
  // UI action functions
  const setSelectedSeedType = useAppStore(state => state.setSelectedSeedType);
  const setPlantAmount = useAppStore(state => state.setPlantAmount);
  const toggleTransactionTracker = useAppStore(state => state.toggleTransactionTracker);
  const showPlantModal = useAppStore(state => state.showPlantModal);
  const hidePlantModal = useAppStore(state => state.hidePlantModal);
  const showHarvestModal = useAppStore(state => state.showHarvestModal);
  const hideHarvestModal = useAppStore(state => state.hideHarvestModal);
  const showSettingsModal = useAppStore(state => state.showSettingsModal);
  const hideSettingsModal = useAppStore(state => state.hideSettingsModal);
  const addNotification = useAppStore(state => state.addNotification);
  const removeNotification = useAppStore(state => state.removeNotification);
  const clearNotifications = useAppStore(state => state.clearNotifications);
  
  return useMemo(() => ({
    selectedSeedType,
    plantAmount,
    showTransactionTracker,
    isPlantModalOpen,
    isHarvestModalOpen,
    isSettingsModalOpen,
    notifications,
    setSelectedSeedType,
    setPlantAmount,
    toggleTransactionTracker,
    showPlantModal,
    hidePlantModal,
    showHarvestModal,
    hideHarvestModal,
    showSettingsModal,
    hideSettingsModal,
    addNotification,
    removeNotification,
    clearNotifications
  }), [
    selectedSeedType,
    plantAmount,
    showTransactionTracker,
    isPlantModalOpen,
    isHarvestModalOpen,
    isSettingsModalOpen,
    notifications,
    setSelectedSeedType,
    setPlantAmount,
    toggleTransactionTracker,
    showPlantModal,
    hidePlantModal,
    showHarvestModal,
    hideHarvestModal,
    showSettingsModal,
    hideSettingsModal,
    addNotification,
    removeNotification,
    clearNotifications
  ]);
};

export const useConfig = () => useAppStore(state => state.config);

// Export types for backward compatibility
export type { SeedType, CrossChainTx, TxStatus, Notification } from './store-types';