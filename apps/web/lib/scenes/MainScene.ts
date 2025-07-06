import * as Phaser from 'phaser';
import { Room } from 'colyseus.js';
import { PlayerManager } from '../managers/PlayerManager';
import { BuildingManager } from '../managers/BuildingManager';
import { CropSystem } from '../CropSystem';
import { TilemapUtils } from '../tilemap.config';
import { TilemapEditor } from '../tilemap.editor';

export interface MainSceneData {
  room: Room;
  sessionId: string;
  worldId?: string;
  isOwnWorld?: boolean;
  address?: string;
  user?: any;
}

export interface MainSceneCallbacks {
  onChatMessage: (message: any) => void;
  onCropContextMenu: (crop: any, x: number, y: number) => void;
  onBuildingContextMenu: (buildingId: string, buildingType: string) => void;
  onShowCorralModal: () => void;
  onShowOrchardModal: () => void;
  onShowWellModal: () => void;
}

export class MainScene extends Phaser.Scene {
  private room!: Room;
  private sessionId!: string;
  private worldId?: string;
  private isOwnWorld?: boolean;
  private address?: string;
  private user?: any;
  
  // Managers
  private playerManager!: PlayerManager;
  private buildingManager!: BuildingManager;
  private cropSystem!: CropSystem;
  
  // World properties
  private worldWidth: number = 1600;
  private worldHeight: number = 1200;
  private cameraLerpFactor: number = 0.1;
  
  // Map and collision
  private mapLayout: string[][] = [];
  private collisionMap: boolean[][] = [];
  private invisibleWalls!: Phaser.Physics.Arcade.StaticGroup;
  
  // Debug and editor
  private debugMode: boolean = false;
  private tilemapEditor?: TilemapEditor;
  
  // Callbacks
  private callbacks?: MainSceneCallbacks;

  constructor() {
    super({ key: 'MainScene' });
  }

  public init(data: MainSceneData): void {
    this.room = data.room;
    this.sessionId = data.sessionId;
    this.worldId = data.worldId;
    this.isOwnWorld = data.isOwnWorld;
    this.address = data.address;
    this.user = data.user;
    
    console.log('🎮 MainScene initialized with session:', this.sessionId);
  }

  public setCallbacks(callbacks: MainSceneCallbacks): void {
    this.callbacks = callbacks;
  }

  public preload(): void {
    // Load building sprites that exist
    this.load.image('corral_building', '/sprites/corral.png');
    
    // Load crop spritesheet
    this.load.spritesheet('crops', '/sprites/crops-v2/crops.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    
    // Load character assets that exist
    this.load.atlas('cowboy_idle', '/sprites/Cowboy/_idle/idle.png', '/sprites/Cowboy/_idle/idle.json');
    this.load.atlas('cowboy_walk', '/sprites/Cowboy/_walk/walk.png', '/sprites/Cowboy/_walk/walk.json');
    this.load.atlas('cowboy_rotate', '/sprites/Cowboy/_rotate/rotate.png', '/sprites/Cowboy/_rotate/rotate.json');
    this.load.atlas('cowboy_stomp', '/sprites/Cowboy/_stomp/stomp.png', '/sprites/Cowboy/_stomp/stomp.json');
    
    // Load cat character
    this.load.image('cat_ponder', '/sprites/Cat/cat_ponder.png');
    
    // Load katana cat
    this.load.atlas('katana_cat', '/sprites/Katana_cat/_default/Katana_cat_animation.png', '/sprites/Katana_cat/_default/Katana_cat_animation.json');
  }

  public create(): void {
    // Initialize physics
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Initialize managers
    this.playerManager = new PlayerManager(this);
    this.buildingManager = new BuildingManager(this, {
      onBuildingClick: (id, type) => this.handleBuildingClick(id, type),
      onBuildingHover: (id, type) => this.handleBuildingHover(id, type),
      onBuildingLeave: (id, type) => this.handleBuildingLeave(id, type),
    });
    
    // Initialize crop system
    this.cropSystem = new CropSystem(this);
    
    // Generate terrain
    this.generateTerrain();
    
    // Set up camera
    this.setupCamera();
    
    // Set up room listeners
    this.setupRoomListeners();
    
    // Set up debug tools
    this.setupDebugTools();
    
    console.log('🎮 MainScene created successfully');
  }

  private generateTerrain(): void {
    // Use simple farm background approach that was working
    this.createSimpleFarmBackground();
  }

  private createSimpleFarmBackground(): void {
    // Create simple farm background using graphics (like original)
    const grassBackground = this.add.graphics();
    grassBackground.setDepth(-10); // Behind everything
    
    // Simple grass field (nice green)
    grassBackground.fillStyle(0x4A7C59, 1); // Forest green
    grassBackground.fillRect(0, 0, this.worldWidth, this.worldHeight);
    
    // Add minimal texture with subtle darker green patches
    grassBackground.fillStyle(0x355E3B, 0.2); // Very subtle darker green
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      const size = 30 + Math.random() * 60;
      grassBackground.fillCircle(x, y, size);
    }
    
    // Create invisible walls for collision
    this.invisibleWalls = this.physics.add.staticGroup();
    this.createInvisibleWalls();
  }

  private createInvisibleWalls(): void {
    // Create border walls to keep players in bounds (like original)
    const wallThickness = 32;
    
    // Top wall - Make visible as wooden fence border
    const topWall = this.add.rectangle(this.worldWidth / 2, -wallThickness / 2, this.worldWidth, wallThickness, 0x8B4513, 0.8);
    topWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(topWall, true);
    this.invisibleWalls.add(topWall);
    
    // Bottom wall - Wooden fence
    const bottomWall = this.add.rectangle(this.worldWidth / 2, this.worldHeight + wallThickness / 2, this.worldWidth, wallThickness, 0x8B4513, 0.8);
    bottomWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(bottomWall, true);
    this.invisibleWalls.add(bottomWall);
    
    // Left wall - Wooden fence
    const leftWall = this.add.rectangle(-wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0x8B4513, 0.8);
    leftWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(leftWall, true);
    this.invisibleWalls.add(leftWall);
    
    // Right wall - Wooden fence
    const rightWall = this.add.rectangle(this.worldWidth + wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0x8B4513, 0.8);
    rightWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(rightWall, true);
    this.invisibleWalls.add(rightWall);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setZoom(1);
  }

  private setupRoomListeners(): void {
    // Player state changes
    this.room.state.players.onAdd = (player: any, sessionId: string) => {
      this.playerManager.addPlayer(sessionId, player);
      if (sessionId === this.sessionId) {
        this.playerManager.setCurrentPlayer(sessionId);
      }
    };

    this.room.state.players.onRemove = (player: any, sessionId: string) => {
      this.playerManager.removePlayer(sessionId);
    };

    this.room.state.players.onChange = (player: any, sessionId: string) => {
      this.playerManager.updatePlayer(sessionId, player);
    };

    // Building state changes
    if (this.room.state.buildings) {
      this.room.state.buildings.onAdd = (building: any, buildingId: string) => {
        this.buildingManager.addBuilding({
          id: buildingId,
          type: building.type,
          x: building.x,
          y: building.y,
          width: building.width,
          height: building.height,
          isInteractable: building.isInteractable,
          ownerId: building.ownerId,
        });
      };

      this.room.state.buildings.onRemove = (building: any, buildingId: string) => {
        this.buildingManager.removeBuilding(buildingId);
      };
    }

    // Crop state changes
    if (this.room.state.crops) {
      this.room.state.crops.onAdd = (crop: any, cropId: string) => {
        this.cropSystem.addCrop(cropId, crop);
      };

      this.room.state.crops.onRemove = (crop: any, cropId: string) => {
        this.cropSystem.removeCrop(cropId);
      };

      this.room.state.crops.onChange = (crop: any, cropId: string) => {
        this.cropSystem.updateCrop(cropId, crop);
      };
    }

    // Chat messages
    this.room.onMessage('chat', (message: any) => {
      this.callbacks?.onChatMessage(message);
    });
  }

  private setupDebugTools(): void {
    // Expose debug methods to window
    (window as any).gameDebug = {
      toggleDebug: () => this.toggleDebug(),
      playerStats: () => this.playerManager.logPlayerStats(),
      buildingStats: () => this.buildingManager.logBuildingStats(),
      cropStats: () => this.cropSystem.logCropStats(),
      teleportPlayer: (x: number, y: number) => this.teleportCurrentPlayer(x, y),
    };
  }

  private handleBuildingClick(buildingId: string, buildingType: string): void {
    console.log(`🏠 Building clicked: ${buildingType} (${buildingId})`);
    
    switch (buildingType) {
      case 'corral':
        this.callbacks?.onShowCorralModal();
        break;
      case 'orchard':
        this.callbacks?.onShowOrchardModal();
        break;
      case 'well':
        this.callbacks?.onShowWellModal();
        break;
      default:
        this.callbacks?.onBuildingContextMenu(buildingId, buildingType);
        break;
    }
  }

  private handleBuildingHover(buildingId: string, buildingType: string): void {
    // Visual feedback for building hover
    this.buildingManager.highlightBuilding(buildingId, true);
  }

  private handleBuildingLeave(buildingId: string, buildingType: string): void {
    // Remove visual feedback
    this.buildingManager.highlightBuilding(buildingId, false);
  }

  private toggleDebug(): void {
    this.debugMode = !this.debugMode;
    console.log(`🔧 Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
  }

  private teleportCurrentPlayer(x: number, y: number): void {
    const currentPlayer = this.playerManager.getCurrentPlayer();
    if (currentPlayer) {
      currentPlayer.setPosition(x, y);
      this.room.send('move', { x, y, teleport: true });
    }
  }

  public update(time: number, delta: number): void {
    // Update crop system
    this.cropSystem.update(time, delta);
  }

  public getPlayerManager(): PlayerManager {
    return this.playerManager;
  }

  public getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }

  public getCropSystem(): CropSystem {
    return this.cropSystem;
  }

  public cleanup(): void {
    this.playerManager?.cleanup();
    this.buildingManager?.cleanup();
    this.cropSystem?.cleanup();
    
    // Remove debug tools
    delete (window as any).gameDebug;
  }
}