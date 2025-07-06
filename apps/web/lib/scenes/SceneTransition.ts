/**
 * Scene Transition System for DeFi Valley
 * 
 * Provides seamless transitions between the main farm view and building interaction scenes.
 * Supports various transition effects (fade, slide, etc.) and data passing between scenes.
 * Integrates with both Phaser MainScene and React-based building interaction scenes.
 */

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'instant';
export type SceneType = 'main' | 'building' | 'menu' | 'inventory' | 'settings';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface SceneData {
  [key: string]: any;
}

export interface TransitionState {
  isTransitioning: boolean;
  currentScene: SceneType;
  targetScene?: SceneType;
  progress: number;
  data?: SceneData;
}

export interface SceneDefinition {
  type: SceneType;
  name: string;
  component?: string; // For React components
  phaserScene?: string; // For Phaser scenes
  allowReturnTo?: boolean;
  defaultTransition?: TransitionConfig;
}

export interface ReturnSceneInfo {
  scene: SceneType;
  data?: SceneData;
  position?: { x: number; y: number };
}

/**
 * Scene registry for managing available scenes and their configurations
 */
export class SceneRegistry {
  private static scenes: Map<SceneType, SceneDefinition> = new Map([
    ['main', {
      type: 'main',
      name: 'Main Farm',
      phaserScene: 'MainScene',
      allowReturnTo: true,
      defaultTransition: { type: 'fade', duration: 500 }
    }],
    ['building', {
      type: 'building',
      name: 'Building Interaction',
      component: 'BuildingInteractionScene',
      allowReturnTo: false,
      defaultTransition: { type: 'fade', duration: 300 }
    }],
    ['menu', {
      type: 'menu',
      name: 'Game Menu',
      component: 'GameMenu',
      allowReturnTo: true,
      defaultTransition: { type: 'slide', duration: 400, direction: 'down' }
    }],
    ['inventory', {
      type: 'inventory',
      name: 'Inventory',
      component: 'Inventory',
      allowReturnTo: true,
      defaultTransition: { type: 'slide', duration: 350, direction: 'right' }
    }],
    ['settings', {
      type: 'settings',
      name: 'Settings',
      component: 'Settings',
      allowReturnTo: true,
      defaultTransition: { type: 'fade', duration: 300 }
    }]
  ]);

  static registerScene(definition: SceneDefinition): void {
    this.scenes.set(definition.type, definition);
  }

  static getScene(type: SceneType): SceneDefinition | undefined {
    return this.scenes.get(type);
  }

  static getAllScenes(): SceneDefinition[] {
    return Array.from(this.scenes.values());
  }

  static isValidScene(type: SceneType): boolean {
    return this.scenes.has(type);
  }
}

/**
 * Main SceneTransition class providing static methods for scene management
 */
export class SceneTransition {
  private static state: TransitionState = {
    isTransitioning: false,
    currentScene: 'main',
    progress: 0
  };

  private static returnStack: ReturnSceneInfo[] = [];
  private static transitionElement: HTMLElement | null = null;
  private static callbacks: Map<string, Function[]> = new Map();
  private static animationId: number | null = null;

  // Default transition configurations
  static readonly DEFAULT_TRANSITIONS: Record<TransitionType, TransitionConfig> = {
    fade: { type: 'fade', duration: 500, easing: 'ease-in-out' },
    slide: { type: 'slide', duration: 400, easing: 'ease-out', direction: 'up' },
    zoom: { type: 'zoom', duration: 600, easing: 'ease-in-out' },
    instant: { type: 'instant', duration: 0 }
  };

  /**
   * Initialize the transition system
   */
  static initialize(): void {
    this.createTransitionElement();
    this.setupEventListeners();
    console.log('🎬 SceneTransition system initialized');
  }

  /**
   * Create the DOM element used for transition effects
   */
  private static createTransitionElement(): void {
    if (this.transitionElement) return;

    this.transitionElement = document.createElement('div');
    this.transitionElement.id = 'scene-transition-overlay';
    this.transitionElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: black;
      opacity: 0;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(this.transitionElement);
  }

  /**
   * Set up event listeners for transition events
   */
  private static setupEventListeners(): void {
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Listen for escape key to return to previous scene
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.state.isTransitioning) {
        this.returnToPrevious();
      }
    });
  }

  /**
   * Handle browser back/forward navigation
   */
  private static handlePopState(event: PopStateEvent): void {
    const sceneData = event.state;
    if (sceneData && sceneData.scene) {
      this.transitionTo(sceneData.scene, sceneData.data, { type: 'instant', duration: 0 });
    }
  }

  /**
   * Main transition method - transitions from current scene to target scene
   */
  static async transitionTo(
    targetScene: SceneType,
    data?: SceneData,
    customTransition?: Partial<TransitionConfig>
  ): Promise<void> {
    // Validate target scene
    if (!SceneRegistry.isValidScene(targetScene)) {
      throw new Error(`Invalid scene type: ${targetScene}`);
    }

    // Prevent multiple simultaneous transitions
    if (this.state.isTransitioning) {
      console.warn('Transition already in progress, ignoring request');
      return;
    }

    const currentScene = this.state.currentScene;
    const targetSceneDefinition = SceneRegistry.getScene(targetScene);
    
    if (!targetSceneDefinition) {
      throw new Error(`Scene definition not found for: ${targetScene}`);
    }

    // Determine transition configuration
    const transitionConfig: TransitionConfig = {
      ...this.DEFAULT_TRANSITIONS[targetSceneDefinition.defaultTransition?.type || 'fade'],
      ...targetSceneDefinition.defaultTransition,
      ...customTransition
    };

    console.log(`🎬 Transitioning from ${currentScene} to ${targetScene}`, {
      transition: transitionConfig,
      data
    });

    // Update state
    this.state = {
      isTransitioning: true,
      currentScene,
      targetScene,
      progress: 0,
      data
    };

    // Add to return stack if current scene allows returning
    const currentSceneDefinition = SceneRegistry.getScene(currentScene);
    if (currentSceneDefinition?.allowReturnTo) {
      this.returnStack.push({
        scene: currentScene,
        data: this.getCurrentSceneData(),
        position: this.getCurrentPlayerPosition()
      });
    }

    try {
      // Execute transition
      await this.executeTransition(targetScene, data, transitionConfig);
      
      // Update browser history
      this.updateBrowserHistory(targetScene, data);
      
      // Emit transition complete event
      this.emit('transitionComplete', { from: currentScene, to: targetScene, data });
      
    } catch (error) {
      console.error('Transition failed:', error);
      this.emit('transitionError', { error, from: currentScene, to: targetScene });
      throw error;
    } finally {
      // Reset transition state
      this.state = {
        isTransitioning: false,
        currentScene: targetScene,
        progress: 0
      };
    }
  }

  /**
   * Execute the actual transition with the specified configuration
   */
  private static async executeTransition(
    targetScene: SceneType,
    data: SceneData | undefined,
    config: TransitionConfig
  ): Promise<void> {
    switch (config.type) {
      case 'fade':
        await this.executeFadeTransition(targetScene, data, config);
        break;
      case 'slide':
        await this.executeSlideTransition(targetScene, data, config);
        break;
      case 'zoom':
        await this.executeZoomTransition(targetScene, data, config);
        break;
      case 'instant':
        await this.executeInstantTransition(targetScene, data);
        break;
      default:
        await this.executeFadeTransition(targetScene, data, config);
    }
  }

  /**
   * Execute fade transition effect
   */
  private static async executeFadeTransition(
    targetScene: SceneType,
    data: SceneData | undefined,
    config: TransitionConfig
  ): Promise<void> {
    if (!this.transitionElement) return;

    const halfDuration = config.duration / 2;

    // Fade out current scene
    this.transitionElement.style.transition = `opacity ${halfDuration}ms ${config.easing || 'ease-in-out'}`;
    this.transitionElement.style.opacity = '1';
    this.transitionElement.style.pointerEvents = 'all';

    await this.wait(halfDuration);

    // Switch scenes
    await this.switchToScene(targetScene, data);

    // Fade in new scene
    this.transitionElement.style.opacity = '0';
    await this.wait(halfDuration);

    this.transitionElement.style.pointerEvents = 'none';
  }

  /**
   * Execute slide transition effect
   */
  private static async executeSlideTransition(
    targetScene: SceneType,
    data: SceneData | undefined,
    config: TransitionConfig
  ): Promise<void> {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const direction = config.direction || 'up';
    const distance = direction === 'up' || direction === 'down' ? '100vh' : '100vw';
    const translateDirection = {
      up: `translateY(-${distance})`,
      down: `translateY(${distance})`,
      left: `translateX(-${distance})`,
      right: `translateX(${distance})`
    };

    // Slide out current scene
    gameContainer.style.transition = `transform ${config.duration}ms ${config.easing || 'ease-out'}`;
    gameContainer.style.transform = translateDirection[direction];

    await this.wait(config.duration / 2);

    // Switch scenes
    await this.switchToScene(targetScene, data);

    // Reset position and slide in new scene
    gameContainer.style.transform = translateDirection[this.getOppositeDirection(direction)];
    
    // Small delay to ensure transform is applied
    await this.wait(50);
    
    gameContainer.style.transform = 'translateX(0) translateY(0)';
    await this.wait(config.duration / 2);

    // Clear transition styles
    gameContainer.style.transition = '';
    gameContainer.style.transform = '';
  }

  /**
   * Execute zoom transition effect
   */
  private static async executeZoomTransition(
    targetScene: SceneType,
    data: SceneData | undefined,
    config: TransitionConfig
  ): Promise<void> {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const halfDuration = config.duration / 2;

    // Zoom out current scene
    gameContainer.style.transition = `transform ${halfDuration}ms ${config.easing || 'ease-in-out'}`;
    gameContainer.style.transform = 'scale(0.8)';

    await this.wait(halfDuration);

    // Switch scenes
    await this.switchToScene(targetScene, data);

    // Zoom in new scene
    gameContainer.style.transform = 'scale(1.2)';
    
    await this.wait(50);
    
    gameContainer.style.transform = 'scale(1)';
    await this.wait(halfDuration);

    // Clear transition styles
    gameContainer.style.transition = '';
    gameContainer.style.transform = '';
  }

  /**
   * Execute instant transition (no animation)
   */
  private static async executeInstantTransition(
    targetScene: SceneType,
    data: SceneData | undefined
  ): Promise<void> {
    await this.switchToScene(targetScene, data);
  }

  /**
   * Switch to the target scene by triggering appropriate handlers
   */
  private static async switchToScene(targetScene: SceneType, data?: SceneData): Promise<void> {
    this.state.currentScene = targetScene;
    
    // Emit scene switch event for React components to handle
    this.emit('sceneSwitch', { scene: targetScene, data });
    
    // Handle Phaser scene switching if needed
    if (targetScene === 'main') {
      await this.switchToPhaserScene('MainScene', data);
    }
  }

  /**
   * Switch to a specific Phaser scene
   */
  private static async switchToPhaserScene(sceneKey: string, data?: SceneData): Promise<void> {
    // Access the Phaser game instance through the global window object
    const game = (window as any).phaserGameInstance;
    
    if (game && game.scene) {
      const scene = game.scene.getScene(sceneKey);
      if (scene) {
        // Resume the scene if it was paused
        if (!scene.scene.isActive()) {
          scene.scene.restart(data);
        }
        console.log(`🎮 Switched to Phaser scene: ${sceneKey}`);
      }
    }
  }

  /**
   * Return to the previous scene in the stack
   */
  static async returnToPrevious(customTransition?: Partial<TransitionConfig>): Promise<void> {
    if (this.returnStack.length === 0) {
      console.warn('No previous scene to return to');
      return;
    }

    const returnInfo = this.returnStack.pop()!;
    
    console.log(`🔙 Returning to ${returnInfo.scene}`, returnInfo);

    await this.transitionTo(returnInfo.scene, returnInfo.data, customTransition);

    // Restore player position if returning to main scene
    if (returnInfo.scene === 'main' && returnInfo.position) {
      this.restorePlayerPosition(returnInfo.position);
    }
  }

  /**
   * Clear the return stack
   */
  static clearReturnStack(): void {
    this.returnStack.length = 0;
    console.log('🧹 Return stack cleared');
  }

  /**
   * Get the current transition state
   */
  static getState(): Readonly<TransitionState> {
    return { ...this.state };
  }

  /**
   * Check if currently transitioning
   */
  static isTransitioning(): boolean {
    return this.state.isTransitioning;
  }

  /**
   * Get the current scene type
   */
  static getCurrentScene(): SceneType {
    return this.state.currentScene;
  }

  /**
   * Event system for transition notifications
   */
  static on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  static off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  static emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Utility methods
   */
  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };
    return opposites[direction] || 'up';
  }

  private static getCurrentSceneData(): SceneData | undefined {
    // Return current scene-specific data
    // This would be implemented based on your specific scene data requirements
    return undefined;
  }

  private static getCurrentPlayerPosition(): { x: number; y: number } | undefined {
    // Get current player position from Phaser scene
    const game = (window as any).phaserGameInstance;
    if (game) {
      const mainScene = game.scene.getScene('MainScene');
      if (mainScene && mainScene.currentPlayer) {
        return {
          x: mainScene.currentPlayer.x,
          y: mainScene.currentPlayer.y
        };
      }
    }
    return undefined;
  }

  private static restorePlayerPosition(position: { x: number; y: number }): void {
    // Restore player position in Phaser scene
    const game = (window as any).phaserGameInstance;
    if (game) {
      const mainScene = game.scene.getScene('MainScene');
      if (mainScene && mainScene.currentPlayer) {
        mainScene.currentPlayer.setPosition(position.x, position.y);
        console.log(`📍 Player position restored to (${position.x}, ${position.y})`);
      }
    }
  }

  private static updateBrowserHistory(scene: SceneType, data?: SceneData): void {
    const stateData = { scene, data };
    const url = new URL(window.location.href);
    url.searchParams.set('scene', scene);
    
    window.history.pushState(stateData, `DeFi Valley - ${scene}`, url.toString());
  }

  /**
   * Cleanup method
   */
  static destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.transitionElement) {
      this.transitionElement.remove();
      this.transitionElement = null;
    }
    
    this.callbacks.clear();
    this.returnStack.length = 0;
    
    console.log('🧹 SceneTransition system destroyed');
  }
}

/**
 * Convenience functions for common transitions
 */
export const SceneTransitions = {
  /**
   * Quick transition to building interaction scene
   */
  async toBuilding(buildingType: string, data?: SceneData): Promise<void> {
    await SceneTransition.transitionTo('building', { buildingType, ...data }, { type: 'fade', duration: 300 });
  },

  /**
   * Quick transition back to main farm scene
   */
  async toMainFarm(data?: SceneData): Promise<void> {
    await SceneTransition.transitionTo('main', data, { type: 'fade', duration: 500 });
  },

  /**
   * Quick transition to inventory with slide effect
   */
  async toInventory(data?: SceneData): Promise<void> {
    await SceneTransition.transitionTo('inventory', data, { type: 'slide', duration: 350, direction: 'right' });
  },

  /**
   * Quick transition to settings menu
   */
  async toSettings(data?: SceneData): Promise<void> {
    await SceneTransition.transitionTo('settings', data, { type: 'fade', duration: 300 });
  },

  /**
   * Return to previous scene with default transition
   */
  async back(): Promise<void> {
    await SceneTransition.returnToPrevious();
  }
};

/**
 * React hook for using scene transitions in components
 */
export function useSceneTransition() {
  return {
    transitionTo: SceneTransition.transitionTo,
    returnToPrevious: SceneTransition.returnToPrevious,
    getCurrentScene: SceneTransition.getCurrentScene,
    isTransitioning: SceneTransition.isTransitioning,
    getState: SceneTransition.getState,
    on: SceneTransition.on,
    off: SceneTransition.off,
    // Convenience methods
    toBuilding: SceneTransitions.toBuilding,
    toMainFarm: SceneTransitions.toMainFarm,
    toInventory: SceneTransitions.toInventory,
    toSettings: SceneTransitions.toSettings,
    back: SceneTransitions.back
  };
}

// Export types for external use
export type {
  TransitionConfig,
  SceneData,
  TransitionState,
  SceneDefinition,
  ReturnSceneInfo
};