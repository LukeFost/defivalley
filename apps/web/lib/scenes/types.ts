/**
 * TypeScript type definitions for the Scene Transition System
 */

// Core transition types
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'instant';
export type SceneType = 'main' | 'building' | 'menu' | 'inventory' | 'settings' | 'dialog' | 'loading';
export type TransitionDirection = 'up' | 'down' | 'left' | 'right';
export type TransitionEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

// Building types for DeFi Valley
export type BuildingType = 'corral' | 'orchard' | 'well';

// Scene data interface - flexible container for passing data between scenes
export interface SceneData {
  [key: string]: any;
  buildingType?: BuildingType;
  playerPosition?: { x: number; y: number };
  returnToPosition?: { x: number; y: number };
  worldId?: string;
  isOwnWorld?: boolean;
  tab?: string;
  section?: string;
}

// Transition configuration
export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing?: TransitionEasing;
  direction?: TransitionDirection;
  delay?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

// Transition state tracking
export interface TransitionState {
  isTransitioning: boolean;
  currentScene: SceneType;
  targetScene?: SceneType;
  progress: number;
  data?: SceneData;
  startTime?: number;
  config?: TransitionConfig;
}

// Scene definition for registry
export interface SceneDefinition {
  type: SceneType;
  name: string;
  component?: string;
  phaserScene?: string;
  allowReturnTo?: boolean;
  defaultTransition?: TransitionConfig;
  preloadAssets?: string[];
  unloadAssets?: string[];
  permissions?: string[];
}

// Return scene information for navigation stack
export interface ReturnSceneInfo {
  scene: SceneType;
  data?: SceneData;
  position?: { x: number; y: number };
  timestamp?: number;
}

// Scene transition event data
export interface SceneTransitionEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  from: SceneType;
  to: SceneType;
  progress?: number;
  data?: SceneData;
  error?: Error;
}

// Building scene specific data
export interface BuildingSceneData extends SceneData {
  buildingType: BuildingType;
  buildingConfig?: BuildingConfig;
  inventory?: InventoryItem[];
  walletInfo?: WalletInfo;
}

// Building configuration for different building types
export interface BuildingConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  backdropEmoji: string;
  backdropText: string;
  npcEmoji: string;
  npcDialogue: string;
  actionButtonText: string;
  actionButtonSecondaryText?: string;
  leaveButtonText: string;
  walletHint: string;
  theme: {
    gradientFrom: string;
    gradientTo: string;
    borderColor: string;
    buttonBg: string;
    buttonHoverBg: string;
  };
  infoPanelConfig?: {
    bgColor: string;
    textColor: string;
    title: string;
    items: string[];
  };
  networkConfig?: {
    targetChainId: number;
    currentChainId?: number;
    switchText: string;
  };
}

// Inventory item interface
export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string;
}

// Wallet information interface
export interface WalletInfo {
  address?: string;
  chainId?: number;
  balance?: string;
  isConnected: boolean;
}

// Scene manager context interface
export interface SceneManagerContextType {
  currentScene: SceneType;
  isTransitioning: boolean;
  transitionState: TransitionState;
  transitionTo: (scene: SceneType, data?: SceneData, config?: Partial<TransitionConfig>) => Promise<void>;
  returnToPrevious: (config?: Partial<TransitionConfig>) => Promise<void>;
  clearHistory: () => void;
  getReturnStack: () => ReturnSceneInfo[];
  canReturn: () => boolean;
}

// Scene transition hook return type
export interface SceneTransitionHookReturn extends SceneManagerContextType {
  // Building-specific transitions
  toBuildingScene: (buildingType: BuildingType, data?: SceneData) => Promise<void>;
  toCorral: (data?: SceneData) => Promise<void>;
  toOrchard: (data?: SceneData) => Promise<void>;
  toWell: (data?: SceneData) => Promise<void>;
  
  // Other scene transitions
  toMainFarm: (playerPosition?: { x: number; y: number }) => Promise<void>;
  toInventory: (tab?: string) => Promise<void>;
  toSettings: (section?: string) => Promise<void>;
  toDialog: (dialogData?: any) => Promise<void>;
  
  // Convenience methods
  back: () => Promise<void>;
  home: () => Promise<void>;
}

// Component props for scene-aware components
export interface SceneAwareComponentProps {
  isSceneActive?: boolean;
  sceneData?: SceneData;
  onSceneActivate?: (data?: SceneData) => void;
  onSceneDeactivate?: () => void;
}

// Phaser scene integration interface
export interface PhaserSceneIntegration {
  gameInstance?: Phaser.Game;
  currentScene?: Phaser.Scene;
  sceneKey?: string;
  onSceneReady?: (scene: Phaser.Scene) => void;
  onSceneDestroy?: (scene: Phaser.Scene) => void;
}

// Scene provider props
export interface SceneManagerProviderProps {
  children: React.ReactNode;
  onSceneChange?: (scene: SceneType, data?: SceneData) => void;
  onTransitionStart?: (event: SceneTransitionEvent) => void;
  onTransitionComplete?: (event: SceneTransitionEvent) => void;
  onTransitionError?: (event: SceneTransitionEvent) => void;
  defaultScene?: SceneType;
  enableDebug?: boolean;
}

// Scene wrapper component props
export interface SceneTransitionWrapperProps {
  children: React.ReactNode;
  scene: SceneType;
  className?: string;
  style?: React.CSSProperties;
  enterDelay?: number;
  exitDelay?: number;
  keepMounted?: boolean;
}

// Building scene manager props
export interface BuildingSceneManagerProps {
  children: React.ReactNode;
  currentBuildingType?: BuildingType | null;
  onBuildingChange?: (buildingType: BuildingType | null) => void;
  buildingConfigs?: Record<BuildingType, BuildingConfig>;
}

// Debug panel interface
export interface SceneDebugInfo {
  currentScene: SceneType;
  isTransitioning: boolean;
  targetScene?: SceneType;
  progress: number;
  returnStackSize: number;
  transitionDuration?: number;
  lastTransitionTime?: number;
}

// Error types
export class SceneTransitionError extends Error {
  constructor(
    message: string,
    public readonly from: SceneType,
    public readonly to: SceneType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SceneTransitionError';
  }
}

export class SceneNotFoundError extends Error {
  constructor(public readonly sceneType: SceneType) {
    super(`Scene not found: ${sceneType}`);
    this.name = 'SceneNotFoundError';
  }
}

export class TransitionInProgressError extends Error {
  constructor() {
    super('Transition already in progress');
    this.name = 'TransitionInProgressError';
  }
}

// Event listener types
export type SceneEventType = 
  | 'transitionStart'
  | 'transitionProgress' 
  | 'transitionComplete'
  | 'transitionError'
  | 'sceneSwitch'
  | 'sceneActivate'
  | 'sceneDeactivate';

export type SceneEventCallback = (data: any) => void;

// Utility types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Scene transition system configuration
export interface SceneTransitionSystemConfig {
  enableAnimations: boolean;
  enableDebugMode: boolean;
  defaultTransitionDuration: number;
  defaultTransitionType: TransitionType;
  enableBrowserHistory: boolean;
  enableKeyboardShortcuts: boolean;
  maxReturnStackSize: number;
  preloadAssets: boolean;
}