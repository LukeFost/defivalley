import * as Phaser from 'phaser';
import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

/**
 * Building interaction configuration
 */
export interface BuildingInteractionConfig {
  eventName: string;
  characterName: string;
  dialogueContent: string;
  modalSetter?: (show: boolean) => void;
  onInteraction?: () => void;
}

/**
 * Dialogue system callbacks
 */
export interface DialogueCallbacks {
  setDialogueCharacterName: (name: string) => void;
  setDialogueContent: (content: string) => void;
  setOnDialogueContinue: (fn: () => () => void) => void;
  setIsDialogueOpen: (open: boolean) => void;
}

/**
 * Modal setters for different building types
 */
export interface ModalSetters {
  setShowMorphoModal: (show: boolean) => void;
  setShowMarketplaceModal: (show: boolean) => void;
  setShowFlowStakingModal: (show: boolean) => void;
  setShowFlowSwapModal: (show: boolean) => void;
  setShowPepeModal: (show: boolean) => void;
}

/**
 * BuildingInteractionManager
 * 
 * Centralized manager for all building interactions in the game.
 * Handles dialogue flow, modal opening, and extensible interaction patterns.
 */
export class BuildingInteractionManager {
  private scene: Phaser.Scene;
  private buildings: Map<string, BaseInteractiveBuilding> = new Map();
  private interactionConfigs: Map<string, BuildingInteractionConfig> = new Map();
  private dialogueCallbacks?: DialogueCallbacks;
  private modalSetters?: ModalSetters;
  private eventListeners: Map<string, Function> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupDefaultInteractions();
  }

  /**
   * Initialize the manager with dialogue and modal callbacks
   */
  public initialize(dialogueCallbacks: DialogueCallbacks, modalSetters: ModalSetters): void {
    this.dialogueCallbacks = dialogueCallbacks;
    this.modalSetters = modalSetters;
    
    // Register event listeners for all configured interactions
    this.registerEventListeners();
  }

  /**
   * Register a building with the manager
   */
  public registerBuilding(name: string, building: BaseInteractiveBuilding): void {
    this.buildings.set(name, building);
    console.log(`[BuildingInteractionManager] Registered building: ${name}`);
  }

  /**
   * Register a custom interaction configuration
   */
  public registerInteraction(config: BuildingInteractionConfig): void {
    this.interactionConfigs.set(config.eventName, config);
    
    // If already initialized, register the event listener immediately
    if (this.dialogueCallbacks && this.modalSetters) {
      this.registerEventListener(config);
    }
  }

  /**
   * Check all buildings for player proximity
   */
  public checkPlayerProximity(playerX: number, playerY: number): void {
    this.buildings.forEach((building) => {
      building.checkPlayerProximity(playerX, playerY);
    });
  }

  /**
   * Check all buildings for interactions
   */
  public checkInteractions(): void {
    this.buildings.forEach((building) => {
      building.checkInteraction();
    });
  }

  /**
   * Get collision bounds for all buildings
   */
  public getCollisionBounds(): Phaser.Geom.Rectangle[] {
    const bounds: Phaser.Geom.Rectangle[] = [];
    this.buildings.forEach((building) => {
      bounds.push(building.getCollisionBounds());
    });
    return bounds;
  }

  /**
   * Check if a position collides with any building
   */
  public checkCollision(x: number, y: number): boolean {
    for (const building of this.buildings.values()) {
      if (building.checkCollision(x, y)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Update all buildings
   */
  public update(): void {
    this.buildings.forEach((building) => {
      building.update();
    });
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    // Remove all event listeners
    this.eventListeners.forEach((listener, eventName) => {
      this.scene.events.off(eventName, listener);
    });
    this.eventListeners.clear();

    // Destroy all buildings
    this.buildings.forEach((building) => {
      building.destroy();
    });
    this.buildings.clear();

    // Clear configurations
    this.interactionConfigs.clear();
  }

  /**
   * Setup default building interactions
   */
  private setupDefaultInteractions(): void {
    // Bank (Morpho) interaction
    this.registerInteraction({
      eventName: 'bankInteraction',
      characterName: 'Katana Cat',
      dialogueContent: 'Welcome to the Katana Morpho Bank. Here you can deposit assets to earn yield. Would you like to proceed?',
      modalSetter: (show) => this.modalSetters?.setShowMorphoModal(show),
    });

    // Marketplace interaction
    this.registerInteraction({
      eventName: 'marketplaceInteraction',
      characterName: 'Shopkeeper',
      dialogueContent: 'Welcome to the Katana Marketplace. You can swap tokens here using SushiSwap. Would you like to enter?',
      modalSetter: (show) => this.modalSetters?.setShowMarketplaceModal(show),
    });

    // Flow Bank interaction
    this.registerInteraction({
      eventName: 'flowBankInteraction',
      characterName: 'Flow Banker',
      dialogueContent: 'This is the Flow Bank. You can stake FVIX tokens here to earn yield. Shall we go inside?',
      modalSetter: (show) => this.modalSetters?.setShowFlowStakingModal(show),
    });

    // Flow Marketplace interaction
    this.registerInteraction({
      eventName: 'flowMarketplaceInteraction',
      characterName: 'Flow Merchant',
      dialogueContent: 'Welcome to the Flow DeFi Hub. Here you can swap FLOW for other tokens needed for staking. Ready to trade?',
      modalSetter: (show) => this.modalSetters?.setShowFlowSwapModal(show),
    });

    // Pepe interaction
    this.registerInteraction({
      eventName: 'pepeInteraction',
      characterName: 'Pepe',
      dialogueContent: "Feels good, man... Welcome to my pump launchpad. Want to create your own meme coin?",
      modalSetter: (show) => this.modalSetters?.setShowPepeModal(show),
    });
  }

  /**
   * Register event listeners for all configured interactions
   */
  private registerEventListeners(): void {
    if (!this.dialogueCallbacks || !this.modalSetters) {
      console.warn('[BuildingInteractionManager] Cannot register event listeners: callbacks not initialized');
      return;
    }

    this.interactionConfigs.forEach((config) => {
      this.registerEventListener(config);
    });
  }

  /**
   * Register a single event listener
   */
  private registerEventListener(config: BuildingInteractionConfig): void {
    if (!this.dialogueCallbacks) return;

    const listener = () => {
      console.log(`[BuildingInteractionManager] Handling ${config.eventName}`);
      
      // Set dialogue content
      this.dialogueCallbacks!.setDialogueCharacterName(config.characterName);
      this.dialogueCallbacks!.setDialogueContent(config.dialogueContent);
      
      // Set continue callback
      if (config.modalSetter) {
        this.dialogueCallbacks!.setOnDialogueContinue(() => () => {
          config.modalSetter!(true);
          config.onInteraction?.();
        });
      } else if (config.onInteraction) {
        this.dialogueCallbacks!.setOnDialogueContinue(() => () => {
          config.onInteraction!();
        });
      }
      
      // Open dialogue
      this.dialogueCallbacks!.setIsDialogueOpen(true);
    };

    // Store and register the listener
    this.eventListeners.set(config.eventName, listener);
    this.scene.events.on(config.eventName, listener);
  }

  /**
   * Add a new building type dynamically
   */
  public addBuildingType(
    name: string,
    building: BaseInteractiveBuilding,
    interaction: Omit<BuildingInteractionConfig, 'eventName'>
  ): void {
    // Register the building
    this.registerBuilding(name, building);

    // Get event name from the building
    const eventName = (building as any).getEventName();

    // Register the interaction
    this.registerInteraction({
      ...interaction,
      eventName,
    });
  }

  /**
   * Get all registered buildings
   */
  public getBuildings(): Map<string, BaseInteractiveBuilding> {
    return new Map(this.buildings);
  }

  /**
   * Get a specific building by name
   */
  public getBuilding(name: string): BaseInteractiveBuilding | undefined {
    return this.buildings.get(name);
  }
}