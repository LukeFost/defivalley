/**
 * Scene Transition System - Main Export File
 * 
 * Provides a clean, organized export interface for the entire scene transition system.
 * Import everything you need from this single file.
 */

// Core transition system
export { 
  SceneTransition,
  SceneTransitions,
  SceneRegistry,
  useSceneTransition
} from './SceneTransition';

// React integration and management
export {
  SceneManagerProvider,
  useSceneManager,
  useSceneTransitions,
  SceneTransitionWrapper,
  BuildingSceneManager,
  SceneTransitionDebugPanel,
  withSceneTransition,
  registerCustomScene
} from './SceneManager';

// TypeScript types and interfaces
export type {
  TransitionType,
  SceneType,
  TransitionDirection,
  TransitionEasing,
  BuildingType,
  SceneData,
  TransitionConfig,
  TransitionState,
  SceneDefinition,
  ReturnSceneInfo,
  SceneTransitionEvent,
  BuildingSceneData,
  BuildingConfig,
  InventoryItem,
  WalletInfo,
  SceneManagerContextType,
  SceneTransitionHookReturn,
  SceneAwareComponentProps,
  PhaserSceneIntegration,
  SceneManagerProviderProps,
  SceneTransitionWrapperProps,
  BuildingSceneManagerProps,
  SceneDebugInfo,
  SceneEventType,
  SceneEventCallback,
  SceneTransitionSystemConfig
} from './types';

// Error classes
export {
  SceneTransitionError,
  SceneNotFoundError,
  TransitionInProgressError
} from './types';

// Convenience functions and utilities
export const SceneUtils = {
  /**
   * Quick scene type validation
   */
  isValidScene: (scene: string): scene is SceneType => {
    return SceneRegistry.isValidScene(scene as SceneType);
  },

  /**
   * Check if a scene allows returning to it
   */
  canReturnToScene: (scene: SceneType): boolean => {
    const definition = SceneRegistry.getScene(scene);
    return definition?.allowReturnTo ?? false;
  },

  /**
   * Get default transition for a scene
   */
  getDefaultTransition: (scene: SceneType): TransitionConfig | undefined => {
    const definition = SceneRegistry.getScene(scene);
    return definition?.defaultTransition;
  },

  /**
   * Check if a scene is a building scene
   */
  isBuildingScene: (scene: SceneType): boolean => {
    return scene === 'building';
  },

  /**
   * Check if a scene is the main farm scene
   */
  isMainFarmScene: (scene: SceneType): boolean => {
    return scene === 'main';
  },

  /**
   * Create scene data for building interactions
   */
  createBuildingSceneData: (
    buildingType: BuildingType,
    additionalData?: Record<string, any>
  ): SceneData => ({
    buildingType,
    ...additionalData
  }),

  /**
   * Create scene data for main farm with player position
   */
  createMainFarmSceneData: (
    playerPosition?: { x: number; y: number },
    additionalData?: Record<string, any>
  ): SceneData => ({
    playerPosition,
    ...additionalData
  })
};

// Pre-configured building configs for DeFi Valley
export const DefaultBuildingConfigs = {
  corral: {
    id: 'corral',
    name: 'Trading Corral',
    emoji: '🐎',
    description: 'Swap FLOW tokens for FROTH',
    backdropEmoji: '🐎',
    backdropText: 'Welcome to the Trading Corral',
    npcEmoji: '🤠',
    npcDialogue: 'Howdy partner! Ready to trade your FLOW for some FROTH? This here corral is where all the token swapping happens!',
    actionButtonText: 'Trade Tokens',
    actionButtonSecondaryText: 'Switch Network & Trade',
    leaveButtonText: 'Leave Corral',
    walletHint: 'Connect your wallet to start trading',
    theme: {
      gradientFrom: 'from-amber-100',
      gradientTo: 'to-yellow-200',
      borderColor: 'border-amber-300',
      buttonBg: 'bg-amber-600',
      buttonHoverBg: 'hover:bg-amber-700'
    },
    infoPanelConfig: {
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      title: 'Trading Info',
      items: [
        'Swap FLOW → FROTH',
        'Low transaction fees',
        'Instant settlement'
      ]
    }
  },
  orchard: {
    id: 'orchard',
    name: 'Sacred Orchard',
    emoji: '🌳',
    description: 'Stake FVIX tokens for sFVIX rewards',
    backdropEmoji: '🌳',
    backdropText: 'The Sacred Orchard of Staking',
    npcEmoji: '🧙‍♂️',
    npcDialogue: 'Welcome to the Sacred Orchard, where FVIX tokens grow into sFVIX rewards! Stake your tokens and watch them flourish.',
    actionButtonText: 'Stake Tokens',
    actionButtonSecondaryText: 'Switch Network & Stake',
    leaveButtonText: 'Leave Orchard',
    walletHint: 'Connect your wallet to start staking',
    theme: {
      gradientFrom: 'from-green-100',
      gradientTo: 'to-emerald-200',
      borderColor: 'border-green-300',
      buttonBg: 'bg-green-600',
      buttonHoverBg: 'hover:bg-green-700'
    },
    infoPanelConfig: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      title: 'Staking Info',
      items: [
        'Stake FVIX → Earn sFVIX',
        'Compound rewards',
        'Flexible unstaking'
      ]
    }
  },
  well: {
    id: 'well',
    name: 'Mystical Well',
    emoji: '🪣',
    description: 'Mint fresh FVIX tokens from FROTH',
    backdropEmoji: '🪣',
    backdropText: 'The Mystical Well of Minting',
    npcEmoji: '🔮',
    npcDialogue: 'Step up to the Mystical Well! Drop in your FROTH tokens and watch as pure FVIX emerges from the depths.',
    actionButtonText: 'Mint Tokens',
    actionButtonSecondaryText: 'Switch Network & Mint',
    leaveButtonText: 'Leave Well',
    walletHint: 'Connect your wallet to start minting',
    theme: {
      gradientFrom: 'from-blue-100',
      gradientTo: 'to-cyan-200',
      borderColor: 'border-blue-300',
      buttonBg: 'bg-blue-600',
      buttonHoverBg: 'hover:bg-blue-700'
    },
    infoPanelConfig: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      title: 'Minting Info',
      items: [
        'Mint FROTH → FVIX',
        'Fair exchange rate',
        'Instant minting'
      ]
    }
  }
} as const;

// Transition presets for common use cases
export const TransitionPresets = {
  /**
   * Quick fade for building interactions
   */
  buildingEnter: {
    type: 'fade' as const,
    duration: 300,
    easing: 'ease-in-out' as const
  },

  /**
   * Smooth return to farm
   */
  farmReturn: {
    type: 'fade' as const,
    duration: 500,
    easing: 'ease-out' as const
  },

  /**
   * Slide in inventory from right
   */
  inventoryOpen: {
    type: 'slide' as const,
    duration: 400,
    direction: 'right' as const,
    easing: 'ease-out' as const
  },

  /**
   * Settings menu fade
   */
  settingsOpen: {
    type: 'fade' as const,
    duration: 250,
    easing: 'ease-in-out' as const
  },

  /**
   * Instant transition (no animation)
   */
  instant: {
    type: 'instant' as const,
    duration: 0
  },

  /**
   * Dramatic zoom for important scenes
   */
  dramatic: {
    type: 'zoom' as const,
    duration: 600,
    easing: 'ease-in-out' as const
  }
} as const;

// Development utilities
export const DevUtils = {
  /**
   * Log current scene state (development only)
   */
  logSceneState: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 Scene State:', SceneTransition.getState());
    }
  },

  /**
   * Force transition to scene (development only)
   */
  forceTransitionTo: async (scene: SceneType, data?: SceneData) => {
    if (process.env.NODE_ENV === 'development') {
      await SceneTransition.transitionTo(scene, data, TransitionPresets.instant);
    }
  },

  /**
   * Clear all scene history (development only)
   */
  clearHistory: () => {
    if (process.env.NODE_ENV === 'development') {
      SceneTransition.clearReturnStack();
      console.log('🧹 Scene history cleared');
    }
  },

  /**
   * Test all transition types (development only)
   */
  testTransitions: async () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const transitions: TransitionConfig[] = [
      { type: 'fade', duration: 500 },
      { type: 'slide', duration: 400, direction: 'up' },
      { type: 'slide', duration: 400, direction: 'right' },
      { type: 'zoom', duration: 600 }
    ];

    for (const transition of transitions) {
      console.log('Testing transition:', transition.type);
      await SceneTransition.transitionTo('settings', {}, transition);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SceneTransition.returnToPrevious(TransitionPresets.instant);
    }
  }
};

// Version and metadata
export const SceneTransitionSystem = {
  version: '1.0.0',
  name: 'DeFi Valley Scene Transition System',
  author: 'DeFi Valley Team',
  description: 'A comprehensive scene transition system for the DeFi Valley farming game',
  
  // System initialization
  initialize: (config?: Partial<SceneTransitionSystemConfig>) => {
    SceneTransition.initialize();
    
    if (config?.enableDebugMode && process.env.NODE_ENV === 'development') {
      console.log('🎬 Scene Transition System initialized with debug mode');
      (window as any).SceneTransition = SceneTransition;
      (window as any).SceneUtils = SceneUtils;
      (window as any).DevUtils = DevUtils;
    }
  },

  // System cleanup
  destroy: () => {
    SceneTransition.destroy();
  }
} as const;