import { createStore, useStore as useZustandStore } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createContext, useContext } from 'react';
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
          
          // Flow Quest management
          initializeQuest: (walletAddress) => {
            set((state) => {
              if (!state.flowQuests[walletAddress]) {
                const questId = `quest_${walletAddress}_${Date.now()}`;
                state.flowQuests[walletAddress] = {
                  id: questId,
                  walletAddress,
                  currentStep: 'NOT_STARTED',
                  completedSteps: [],
                  frothBalance: '0',
                  fvixBalance: '0',
                  sFvixBalance: '0',
                  plantedAmount: '0',
                  plantedSeedIds: [],
                  lastUpdated: Date.now(),
                  isCompleted: false
                };
              }
            });
          },
          
          setSwapped: (walletAddress, frothBalance) => {
            set((state) => {
              const quest = state.flowQuests[walletAddress];
              if (quest) {
                quest.currentStep = 'SWAPPED';
                if (!quest.completedSteps.includes('SWAPPED')) {
                  quest.completedSteps.push('SWAPPED');
                }
                quest.frothBalance = frothBalance;
                quest.lastUpdated = Date.now();
              }
            });
          },
          
          setMinted: (walletAddress, fvixBalance) => {
            set((state) => {
              const quest = state.flowQuests[walletAddress];
              if (quest) {
                quest.currentStep = 'MINTED';
                if (!quest.completedSteps.includes('MINTED')) {
                  quest.completedSteps.push('MINTED');
                }
                quest.fvixBalance = fvixBalance;
                quest.lastUpdated = Date.now();
              }
            });
          },
          
          setStaked: (walletAddress, sFvixBalance) => {
            set((state) => {
              const quest = state.flowQuests[walletAddress];
              if (quest) {
                quest.currentStep = 'STAKED';
                if (!quest.completedSteps.includes('STAKED')) {
                  quest.completedSteps.push('STAKED');
                }
                quest.sFvixBalance = sFvixBalance;
                quest.lastUpdated = Date.now();
              }
            });
          },

          setPlanted: (walletAddress, plantedAmount, seedId) => {
            set((state) => {
              const quest = state.flowQuests[walletAddress];
              if (quest) {
                quest.currentStep = 'PLANTED';
                if (!quest.completedSteps.includes('PLANTED')) {
                  quest.completedSteps.push('PLANTED');
                }
                quest.plantedAmount = plantedAmount;
                quest.plantedSeedIds.push(seedId);
                quest.isCompleted = true; // Quest fully completed when planted
                quest.lastUpdated = Date.now();
              }
            });
          },
          
          updateQuestBalances: (walletAddress, balances) => {
            set((state) => {
              const quest = state.flowQuests[walletAddress];
              if (quest) {
                if (balances.froth !== undefined) quest.frothBalance = balances.froth;
                if (balances.fvix !== undefined) quest.fvixBalance = balances.fvix;
                if (balances.sFvix !== undefined) quest.sFvixBalance = balances.sFvix;
                quest.lastUpdated = Date.now();
              }
            });
          },
          
          resetQuest: (walletAddress) => {
            set((state) => {
              delete state.flowQuests[walletAddress];
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
          
          // Flow Quest UI actions
          showCorralModal: () => {
            set((state) => {
              state.ui.showCorralModal = true;
            });
          },
          
          hideCorralModal: () => {
            set((state) => {
              state.ui.showCorralModal = false;
            });
          },
          
          showWellModal: () => {
            set((state) => {
              state.ui.showWellModal = true;
            });
          },
          
          hideWellModal: () => {
            set((state) => {
              state.ui.showWellModal = false;
            });
          },
          
          showOrchardModal: () => {
            set((state) => {
              state.ui.showOrchardModal = true;
            });
          },
          
          hideOrchardModal: () => {
            set((state) => {
              state.ui.showOrchardModal = false;
            });
          },
          
          toggleQuestBook: () => {
            set((state) => {
              state.ui.questBookExpanded = !state.ui.questBookExpanded;
            });
          },
          
          // Flow Transaction modal actions
          showSwapModal: () => {
            set((state) => {
              state.ui.showSwapModal = true;
            });
          },
          
          hideSwapModal: () => {
            set((state) => {
              state.ui.showSwapModal = false;
            });
          },
          
          showMintModal: () => {
            set((state) => {
              state.ui.showMintModal = true;
            });
          },
          
          hideMintModal: () => {
            set((state) => {
              state.ui.showMintModal = false;
            });
          },
          
          showStakeModal: () => {
            set((state) => {
              state.ui.showStakeModal = true;
            });
          },
          
          hideStakeModal: () => {
            set((state) => {
              state.ui.showStakeModal = false;
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
          storage: createJSONStorage(
            () => typeof window !== 'undefined' ? localStorage : createMemoryStorage(),
            {
              serialize: bigIntSerializer.serialize,
              deserialize: bigIntSerializer.deserialize,
            }
          ),
          skipHydration: true, // Recommended to delay hydration until manual rehydration
          // Exclude transient UI state from persistence - modals should always start closed
          partialize: (state) => ({
            ...state,
            ui: {
              ...state.ui,
              showPlantModal: false,
              showHarvestModal: false,
              showSettingsModal: false,
              showCorralModal: false,
              showWellModal: false,
              showOrchardModal: false,
              showSwapModal: false,
              showMintModal: false,
              showStakeModal: false,
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
export const usePlayerData = () => useAppStore(state => ({
  playerState: state.playerState,
  seedPositions: state.seedPositions,
  vaultPosition: state.vaultPosition,
  seedTypes: state.seedTypes,
  setPlayerState: state.setPlayerState,
  updateSeedPositions: state.updateSeedPositions,
  setVaultPosition: state.setVaultPosition,
  addOptimisticSeed: state.addOptimisticSeed
}));

export const useUI = () => useAppStore(state => ({
  // UI state values (boolean flags for modal visibility)
  selectedSeedType: state.ui.selectedSeedType,
  plantAmount: state.ui.plantAmount,
  isPlantModalOpen: state.ui.showPlantModal,
  isHarvestModalOpen: state.ui.showHarvestModal,
  isSettingsModalOpen: state.ui.showSettingsModal,
  notifications: state.ui.notifications,
  // Flow Quest UI state
  isCorralModalOpen: state.ui.showCorralModal,
  isWellModalOpen: state.ui.showWellModal,
  isOrchardModalOpen: state.ui.showOrchardModal,
  questBookExpanded: state.ui.questBookExpanded,
  // Flow Transaction modal state
  isSwapModalOpen: state.ui.showSwapModal,
  isMintModalOpen: state.ui.showMintModal,
  isStakeModalOpen: state.ui.showStakeModal,
  // UI action functions
  setSelectedSeedType: state.setSelectedSeedType,
  setPlantAmount: state.setPlantAmount,
  showPlantModal: state.showPlantModal,
  hidePlantModal: state.hidePlantModal,
  showHarvestModal: state.showHarvestModal,
  hideHarvestModal: state.hideHarvestModal,
  showSettingsModal: state.showSettingsModal,
  hideSettingsModal: state.hideSettingsModal,
  // Flow Quest UI actions
  showCorralModal: state.showCorralModal,
  hideCorralModal: state.hideCorralModal,
  showWellModal: state.showWellModal,
  hideWellModal: state.hideWellModal,
  showOrchardModal: state.showOrchardModal,
  hideOrchardModal: state.hideOrchardModal,
  toggleQuestBook: state.toggleQuestBook,
  // Flow Transaction modal actions
  showSwapModal: state.showSwapModal,
  hideSwapModal: state.hideSwapModal,
  showMintModal: state.showMintModal,
  hideMintModal: state.hideMintModal,
  showStakeModal: state.showStakeModal,
  hideStakeModal: state.hideStakeModal,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications
}));

export const useConfig = () => useAppStore(state => state.config);

// QuestBook convenience hook
export const useFlowQuest = () => useAppStore(state => ({
  quests: state.flowQuests,
  initializeQuest: state.initializeQuest,
  setSwapped: state.setSwapped,
  setMinted: state.setMinted,
  setStaked: state.setStaked,
  updateQuestBalances: state.updateQuestBalances,
  resetQuest: state.resetQuest,
  // Helper to get quest for current wallet
  getQuest: (walletAddress: `0x${string}`) => state.flowQuests[walletAddress],
  // Helper to check completion status
  isStepCompleted: (walletAddress: `0x${string}`, step: any) => {
    const quest = state.flowQuests[walletAddress];
    return quest?.completedSteps.includes(step) || false;
  }
}));

// Export types for backward compatibility
export type { SeedType, Notification, QuestStep, FlowQuest } from './store-types';