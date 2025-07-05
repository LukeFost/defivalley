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
  showSettingsModal: boolean;
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
    sagaChainId: 2751669528484000;
    arbitrumChainId: 421614;
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
  showSettingsModal: () => void;
  hideSettingsModal: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Utility actions
  reset: () => void;
  calculateLevel: (experience: number) => number;
  estimateYield: (amount: bigint, seedType: number, plantTime: number) => bigint;
}

// Initial state
export const initialState: AppState = {
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
    showSettingsModal: false,
    notifications: []
  },
  config: {
    sagaChainId: 2751669528484000,
    arbitrumChainId: 421614,
    gameControllerAddress: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
    defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    refreshInterval: 30000 // 30 seconds
  }
};