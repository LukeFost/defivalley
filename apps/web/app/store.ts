import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Transaction status types
export type TxStatus = 
  | 'idle'
  | 'preparing'
  | 'wallet_confirm' 
  | 'saga_pending'
  | 'axelar_processing'
  | 'arbitrum_pending' 
  | 'completed'
  | 'failed';

// Cross-chain transaction type
export interface CrossChainTx {
  id: string;
  type: 'plant_seed' | 'harvest_seed' | 'claim_yield';
  status: TxStatus;
  player: `0x${string}`;
  
  // Seed planting details
  seedType?: number;
  seedId?: number;
  amount?: string; // BigInt as string
  gasEstimate?: string; // BigInt as string
  
  // Transaction hashes
  sagaTxHash?: string;
  arbitrumTxHash?: string;
  axelarTxId?: string;
  
  // Timing
  startTime: number;
  lastUpdated: number;
  estimatedCompletionTime?: number;
  
  // Error handling
  error?: string;
  retryCount: number;
  
  // Optimistic updates
  optimisticSeedId?: number;
  optimisticYield?: string;
}

// Seed types configuration
export interface SeedType {
  id: number;
  name: string;
  minAmount: bigint;
  growthTime: number; // in seconds
  isActive: boolean;
  description: string;
  apy: number; // estimated APY
}

// Player game state
export interface PlayerState {
  isRegistered: boolean;
  totalSeeds: number;
  lastPlantTime: number;
  experience: number;
  seedCount: number;
  level: number; // calculated from experience
}

// Seed position data
export interface SeedPosition {
  seedId: number;
  seedType: number;
  amount: bigint;
  plantTime: number;
  isGrowing: boolean;
  crossChainTxId: string;
  isReady: boolean;
  estimatedYield: bigint;
  harvestTime?: number;
}

// DeFi vault position
export interface VaultPosition {
  depositedAmount: bigint;
  lastYieldClaim: number;
  totalYieldEarned: bigint;
  isActive: boolean;
  availableYield: bigint;
}

// UI State
export interface UIState {
  selectedSeedType: number;
  plantAmount: string;
  showTransactionTracker: boolean;
  showPlantModal: boolean;
  showHarvestModal: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean;
}

// Complete app state
export interface AppState {
  // Transaction management
  activeTransactions: CrossChainTx[];
  transactionHistory: CrossChainTx[];
  
  // Game data
  playerState: PlayerState | null;
  seedPositions: SeedPosition[];
  vaultPosition: VaultPosition | null;
  seedTypes: SeedType[];
  
  // UI state
  ui: UIState;
  
  // Configuration
  config: {
    sagaChainId: number;
    arbitrumChainId: number;
    gameControllerAddress: `0x${string}`;
    defiVaultAddress: `0x${string}`;
    usdcAddress: `0x${string}`;
    refreshInterval: number;
  };
}

// Store actions
export interface AppActions {
  // Transaction management
  addTransaction: (tx: Omit<CrossChainTx, 'id' | 'startTime' | 'lastUpdated' | 'retryCount'>) => string;
  updateTransaction: (id: string, updates: Partial<CrossChainTx>) => void;
  completeTransaction: (id: string) => void;
  failTransaction: (id: string, error: string) => void;
  retryTransaction: (id: string) => void;
  clearCompletedTransactions: () => void;
  
  // Game state management
  setPlayerState: (state: PlayerState) => void;
  updateSeedPositions: (positions: SeedPosition[]) => void;
  addOptimisticSeed: (seedType: number, amount: bigint, txId: string) => number;
  updateSeedPosition: (seedId: number, updates: Partial<SeedPosition>) => void;
  setVaultPosition: (position: VaultPosition) => void;
  setSeedTypes: (types: SeedType[]) => void;
  
  // UI actions
  setSelectedSeedType: (type: number) => void;
  setPlantAmount: (amount: string) => void;
  toggleTransactionTracker: () => void;
  showPlantModal: () => void;
  hidePlantModal: () => void;
  showHarvestModal: () => void;
  hideHarvestModal: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Utility actions
  reset: () => void;
  calculateLevel: (experience: number) => number;
  estimateYield: (amount: bigint, seedType: number, plantTime: number) => bigint;
}

// Initial state
const initialState: AppState = {
  activeTransactions: [],
  transactionHistory: [],
  playerState: null,
  seedPositions: [],
  vaultPosition: null,
  seedTypes: [
    {
      id: 1,
      name: 'USDC Sprout',
      minAmount: BigInt('10000000'), // 10 USDC (6 decimals)
      growthTime: 24 * 60 * 60, // 24 hours
      isActive: true,
      description: 'Quick growth, perfect for beginners',
      apy: 5
    },
    {
      id: 2,
      name: 'USDC Premium',
      minAmount: BigInt('100000000'), // 100 USDC (6 decimals)
      growthTime: 48 * 60 * 60, // 48 hours
      isActive: true,
      description: 'Enhanced yield for committed farmers',
      apy: 5
    },
    {
      id: 3,
      name: 'USDC Whale Tree',
      minAmount: BigInt('1000000000'), // 1000 USDC (6 decimals)
      growthTime: 72 * 60 * 60, // 72 hours
      isActive: true,
      description: 'Maximum yield for serious investors',
      apy: 5
    }
  ],
  ui: {
    selectedSeedType: 1,
    plantAmount: '',
    showTransactionTracker: false,
    showPlantModal: false,
    showHarvestModal: false,
    notifications: []
  },
  config: {
    sagaChainId: 2751669528484000,
    arbitrumChainId: 421614,
    gameControllerAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
    defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    refreshInterval: 30000 // 30 seconds
  }
};

// Create the store
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Transaction management
        addTransaction: (tx) => {
          const id = `${tx.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newTx: CrossChainTx = {
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
            state.transactionHistory = [];
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
              isReady: Date.now() / 1000 > pos.plantTime + get().seedTypes.find(t => t.id === pos.seedType)?.growthTime || 0,
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
          const yearlyYield = (Number(amount) * seedTypeData.apy) / 100;
          const secondsInYear = 365 * 24 * 60 * 60;
          const currentYield = (yearlyYield * elapsed) / secondsInYear;
          
          return BigInt(Math.floor(currentYield));
        }
      })),
      {
        name: 'defi-valley-store',
        partialize: (state) => ({
          transactionHistory: state.transactionHistory,
          ui: {
            selectedSeedType: state.ui.selectedSeedType
          }
        })
      }
    ),
    {
      name: 'DeFi Valley Store'
    }
  )
);

// Selectors for easy access to specific state slices
export const useTransactions = () => useAppStore(state => ({
  active: state.activeTransactions,
  history: state.transactionHistory,
  add: state.addTransaction,
  update: state.updateTransaction,
  complete: state.completeTransaction,
  fail: state.failTransaction,
  retry: state.retryTransaction
}));

export const usePlayerData = () => useAppStore(state => ({
  playerState: state.playerState,
  seedPositions: state.seedPositions,
  vaultPosition: state.vaultPosition,
  seedTypes: state.seedTypes,
  setPlayerState: state.setPlayerState,
  updateSeedPositions: state.updateSeedPositions,
  setVaultPosition: state.setVaultPosition
}));

export const useUI = () => useAppStore(state => ({
  // UI state values (boolean flags for modal visibility)
  selectedSeedType: state.ui.selectedSeedType,
  plantAmount: state.ui.plantAmount,
  showTransactionTracker: state.ui.showTransactionTracker,
  isPlantModalOpen: state.ui.showPlantModal,
  isHarvestModalOpen: state.ui.showHarvestModal,
  notifications: state.ui.notifications,
  // UI action functions
  setSelectedSeedType: state.setSelectedSeedType,
  setPlantAmount: state.setPlantAmount,
  toggleTransactionTracker: state.toggleTransactionTracker,
  showPlantModal: state.showPlantModal,
  hidePlantModal: state.hidePlantModal,
  showHarvestModal: state.showHarvestModal,
  hideHarvestModal: state.hideHarvestModal,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification
}));

export const useConfig = () => useAppStore(state => state.config);