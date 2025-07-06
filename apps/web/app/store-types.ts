
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

// Quest Book types
export type QuestStep = 'NOT_STARTED' | 'SWAPPED' | 'MINTED' | 'STAKED' | 'PLANTED';

export interface FlowQuest {
  id: string;
  walletAddress: `0x${string}`;
  currentStep: QuestStep;
  completedSteps: QuestStep[];
  frothBalance: string; // Formatted balance for display
  fvixBalance: string;  // Formatted balance for display
  sFvixBalance: string; // Formatted balance for display
  plantedAmount: string; // Amount of sFVIX planted
  plantedSeedIds: number[]; // Array of planted seed IDs
  lastUpdated: number;
  isCompleted: boolean;
}

// UI State
export interface UIState {
  selectedSeedType: number;
  plantAmount: string;
  showPlantModal: boolean;
  showHarvestModal: boolean;
  showSettingsModal: boolean;
  notifications: Notification[];
  // Flow Quest UI state
  showCorralModal: boolean;
  showWellModal: boolean;
  showOrchardModal: boolean;
  showStakingOfficeModal: boolean;
  questBookExpanded: boolean;
  // Flow Transaction modals
  showSwapModal: boolean;
  showMintModal: boolean;
  showStakeModal: boolean;
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
  // Game data
  playerState: PlayerState | null;
  seedPositions: SeedPosition[];
  vaultPosition: VaultPosition | null;
  seedTypes: SeedType[];
  
  // Flow Quest data
  flowQuests: Record<`0x${string}`, FlowQuest>; // Keyed by wallet address
  
  // UI state
  ui: UIState;
  
  // Configuration
  config: {
    sagaChainId: 2751669528484000;
    arbitrumChainId: 421614;
    flowChainId: 747;
    gameControllerAddress: `0x${string}`;
    defiVaultAddress: `0x${string}`;
    usdcAddress: `0x${string}`;
    sFvixAddress: `0x${string}`;
    refreshInterval: number;
  };
}

// Store actions
export interface AppActions {
  // Game state management
  setPlayerState: (state: PlayerState) => void;
  updateSeedPositions: (positions: SeedPosition[]) => void;
  addOptimisticSeed: (seedType: number, amount: bigint, txId: string) => number;
  updateSeedPosition: (seedId: number, updates: Partial<SeedPosition>) => void;
  setVaultPosition: (position: VaultPosition) => void;
  setSeedTypes: (types: SeedType[]) => void;
  
  // Flow Quest actions
  initializeQuest: (walletAddress: `0x${string}`) => void;
  setSwapped: (walletAddress: `0x${string}`, frothBalance: string) => void;
  setMinted: (walletAddress: `0x${string}`, fvixBalance: string) => void;
  setStaked: (walletAddress: `0x${string}`, sFvixBalance: string) => void;
  setPlanted: (walletAddress: `0x${string}`, plantedAmount: string, seedId: number) => void;
  updateQuestBalances: (walletAddress: `0x${string}`, balances: { froth?: string; fvix?: string; sFvix?: string }) => void;
  resetQuest: (walletAddress: `0x${string}`) => void;
  
  // UI actions
  setSelectedSeedType: (type: number) => void;
  setPlantAmount: (amount: string) => void;
  showPlantModal: () => void;
  hidePlantModal: () => void;
  showHarvestModal: () => void;
  hideHarvestModal: () => void;
  showSettingsModal: () => void;
  hideSettingsModal: () => void;
  // Flow Quest UI actions
  showCorralModal: () => void;
  hideCorralModal: () => void;
  showWellModal: () => void;
  hideWellModal: () => void;
  showOrchardModal: () => void;
  hideOrchardModal: () => void;
  showStakingOfficeModal: () => void;
  hideStakingOfficeModal: () => void;
  toggleQuestBook: () => void;
  // Flow Transaction modal actions
  showSwapModal: () => void;
  hideSwapModal: () => void;
  showMintModal: () => void;
  hideMintModal: () => void;
  showStakeModal: () => void;
  hideStakeModal: () => void;
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
    },
    {
      id: 4,
      name: 'sFVIX Volatility Plant',
      minAmount: BigInt('1000000000000000000'), // 1 sFVIX (18 decimals)
      growthTime: 24 * 60 * 60, // 24 hours
      isActive: true,
      description: 'Grows with Flow network volatility rewards - requires Flow blockchain connection',
      apy: 8
    }
  ],
  flowQuests: {}, // Empty by default
  ui: {
    selectedSeedType: 1,
    plantAmount: '',
    showPlantModal: false,
    showHarvestModal: false,
    showSettingsModal: false,
    notifications: [],
    showCorralModal: false,
    showWellModal: false,
    showOrchardModal: false,
    showStakingOfficeModal: false,
    questBookExpanded: false,
    showSwapModal: false,
    showMintModal: false,
    showStakeModal: false
  },
  config: {
    sagaChainId: 2751669528484000,
    arbitrumChainId: 421614,
    flowChainId: 747,
    gameControllerAddress: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
    defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    sFvixAddress: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
    refreshInterval: 30000 // 30 seconds
  }
};