'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { Player, PlayerInfo } from '../lib/Player';
import { CharacterType, CharacterDefinitions } from '../lib/character.config';
import { TilesetConfig, TilemapUtils } from '../lib/tilemap.config';
import { TilemapEditor } from '../lib/tilemap.editor';
import { UIStack } from './UIStack';
import BuildingContextMenu from './BuildingContextMenu';
import { RoomOptions } from '../types/colyseus.types';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { createCorralBuildingData, type CorralBuildingData } from './buildings/CorralBuilding';
import { useUI, useAppStore } from '@/app/store';

// Import Visual Novel Scenes
import { CorralScene } from '../lib/scenes/CorralScene';
import { OrchardScene } from '../lib/scenes/OrchardScene';
import { WellScene } from '../lib/scenes/WellScene';

interface GameState {
  players: Map<string, {
    id: string;
    name: string;
    x: number;
    y: number;
    connected: boolean;
  }>;
  serverTime: number;
  gameStatus: string;
}

interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  timestamp: number;
}

class MainScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private players: Map<string, Player> = new Map();
  private currentPlayer!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private oKey!: Phaser.Input.Keyboard.Key;
  private sessionId!: string;
  private chatCallback?: (message: ChatMessage) => void;
  private lastDirection: string = 'down';
  private cliffTiles: Phaser.GameObjects.Image[] = [];
  private terrainLayout: string[][] = [];
  private debugMode: boolean = false;
  private worldId?: string;
  private isOwnWorld?: boolean;
  private address?: string;
  private user?: any;
  
  // Camera system properties
  private worldWidth: number = 1600; // Will be updated based on map size
  private worldHeight: number = 1200; // Will be updated based on map size
  private cameraLerpFactor: number = 0.1; // Smooth camera following
  
  // Building system properties
  private buildings: Map<string, CorralBuildingData> = new Map();
  private buildingSprites: Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle> = new Map();
  private buildingHotspots: Map<string, Phaser.GameObjects.Zone> = new Map();
  private buildingEntranceIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private buildingPhysicsZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private showCorralModalCallback?: () => void;
  private showOrchardModalCallback?: () => void;
  private showWellModalCallback?: () => void;
  private lastTriggeredBuilding?: string;
  private loggedMissingCallbacks?: Set<string>;
  
  // Simple background approach with invisible walls
  private invisibleWalls!: Phaser.Physics.Arcade.StaticGroup;
  
  // Legacy tilemap properties (kept for backward compatibility)
  private mapLayout: string[][] = [];
  private collisionMap: boolean[][] = [];

  constructor() {
    super({ key: 'MainScene' });
    // Collision map will be initialized after terrain generation
  }
  
  private initializeCollisionMap() {
    // Initialize collision map based on dynamically generated tile types
    if (this.mapLayout.length === 0) {
      return;
    }
    
    for (let y = 0; y < this.mapLayout.length; y++) {
      this.collisionMap[y] = [];
      for (let x = 0; x < this.mapLayout[y].length; x++) {
        const tileType = this.mapLayout[y][x];
        // Set collision based on tile type
        this.collisionMap[y][x] = this.isTileSolid(tileType);
      }
    }
    
    // Update world size based on map dimensions
    const tileSize = 32; // Standard tile size
    this.worldWidth = this.mapLayout[0].length * tileSize;
    this.worldHeight = this.mapLayout.length * tileSize;
    
  }
  
  private isTileSolid(tileType: string): boolean {
    // Define which tiles are solid (impassable)
    const solidTiles = [
      'cliff_tall_1', 'cliff_tall_2', 'cliff_thin', 'cliff_round', 
      'cliff_large', 'cliff_small', 'rocks_brown', 'rocks_dark'
    ];
    return solidTiles.includes(tileType);
  }

  init(data: { 
    chatCallback?: (message: ChatMessage) => void;
    showCorralModal?: () => void;
    showOrchardModal?: () => void;
    showWellModal?: () => void;
  }) {
    this.chatCallback = data.chatCallback;
    this.showCorralModalCallback = data.showCorralModal;
    this.showOrchardModalCallback = data.showOrchardModal;
    this.showWellModalCallback = data.showWellModal;
  }

  preload() {
    
    this.load.on('loaderror', (file: any) => {
      console.error(`Failed to load: ${file.key} from ${file.url}`);
    });
    
    
    // Load all character animation sheets dynamically from CharacterDefinitions
    Object.entries(CharacterDefinitions).forEach(([characterName, character]) => {
      // Load idle atlas if present
      if (character.idleAtlas) {
        this.load.atlas(character.idleAtlas.key, character.idleAtlas.path, character.idleAtlas.atlasPath);
      }
      
      // Load animation sheets
      if (character.type === 'animation_sheets' && character.animationConfig) {
        Object.entries(character.animationConfig.animations).forEach(([animName, animation]) => {
          // Check if this is an atlas or a regular spritesheet
          if (animation.atlasPath) {
            // Load as atlas (Texture Packer format)
            this.load.atlas(animation.key, animation.path, animation.atlasPath);
          } else {
            // Load as regular spritesheet
            this.load.spritesheet(animation.key, animation.path, {
              frameWidth: character.frameWidth,
              frameHeight: character.frameHeight
            });
          }
        });
      }
    });
    
    // Load the tileset for world decoration
    this.load.image('cliffs_grass_tileset', '/tilesets/LPC_cliffs_grass.png');
    
    // Load building sprites
    // this.load.image('corral_building', '/sprites/corral.png'); // Disabled - asset not available yet
    
    
  }

  async create() {
    
    // Log all loaded textures for debugging
    const textureManager = this.textures;
    
    // Check if main tileset loaded
    if (!textureManager.exists('cliffs_grass_tileset')) {
      console.error('❌ CRITICAL: Main tileset not loaded!');
    } else {
    }
    
    // Setup camera system first
    this.setupCameraSystem();
    
    // Create a beautiful farming world background
    this.createFarmingWorld();
    
    // Add elegant UI overlay
    this.createUI();

    // Create animations for different characters
    this.createCharacterAnimations();

    // Setup development tools
    this.setupDevTools();


    // Create buildings
    this.createBuildings();

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    this.oKey = this.input.keyboard!.addKey('O');

    // Connect to Colyseus after scene is fully ready
    this.time.delayedCall(100, () => {
      this.connectToServer();
    });
    
  }

  setupCameraSystem() {
    // Set world bounds for the camera
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Enable smooth camera following
    this.cameras.main.setLerp(this.cameraLerpFactor);
    
  }

  createBuildings() {
    // TODO: Replace placeholder rectangles with actual building sprites
    // TODO: Load proper building assets for corral, orchard, and well
    // TODO: Implement proper sprite scaling and positioning
    
    // Building configurations with placeholder rectangles for immediate visibility
    const buildingConfigs = [
      {
        id: 'corral',
        x: 800,
        y: 400,
        width: 96,
        height: 64,
        color: 0x8B4513, // Brown
        callback: () => this.transitionToScene('CorralScene'),
        name: 'Trading Corral',
        description: 'FLOW → FROTH'
      },
      {
        id: 'orchard',
        x: 500,
        y: 600,
        width: 80,
        height: 80,
        color: 0x90EE90, // Light green
        callback: () => this.transitionToScene('OrchardScene'),
        name: 'Sacred Orchard',
        description: 'FVIX → sFVIX'
      },
      {
        id: 'well',
        x: 1200,
        y: 500,
        width: 64,
        height: 64,
        color: 0x87CEEB, // Sky blue
        callback: () => this.transitionToScene('WellScene'),
        name: 'Mystical Well',
        description: 'FROTH → FVIX'
      }
    ];
    
    buildingConfigs.forEach(config => {
      // Create building data for hotspot positioning
      const buildingData = createCorralBuildingData({
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
        onClick: config.callback
      });
      
      this.buildings.set(config.id, buildingData);
      
      // Create building sprite (use sprite if available, fallback to rectangle)
      let building;
      if (config.id === 'corral') {
        // Create placeholder for corral building
        building = this.add.rectangle(config.x, config.y, config.width, config.height, config.color);
        building.setStrokeStyle(2, 0x654321);
        building.setDisplaySize(config.width, config.height);
      } else {
        // Fallback to placeholder rectangle
        building = this.add.rectangle(config.x, config.y, config.width, config.height, config.color);
        building.setStrokeStyle(3, 0xFFFFFF, 0.8);
      }
      building.setDepth(buildingData.depth);
      building.setData('buildingType', config.id);
      this.buildingSprites.set(config.id, building);
      
      // Add building name labels (high contrast) 
      const nameLabel = this.add.text(config.x, config.y - config.height/2 - 25, config.name, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(buildingData.depth + 2);
      
      const descLabel = this.add.text(config.x, config.y - config.height/2 - 8, config.description, {
        fontSize: '12px',
        color: '#FFFF00',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(buildingData.depth + 2);
      
      // Add interaction instructions
      const clickLabel = this.add.text(config.x, config.y + config.height/2 + 8, '🖱️ Left: Enter  🖱️ Right: Menu', {
        fontSize: '9px',
        color: '#87CEEB',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(buildingData.depth + 2);
      
      // Keep the original clickable hotspot for backward compatibility
      const hotspot = this.add.zone(
        config.x,
        config.y,
        config.width + 20, // Slightly larger than building
        config.height + 20
      );
      
      hotspot.setInteractive();
      hotspot.setData('buildingType', config.id);
      this.buildingHotspots.set(config.id, hotspot);
      
      // Add right-click handler for context menu
      hotspot.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          // Trigger building context menu via event
          this.events.emit('buildingRightClick', {
            building: {
              id: config.id,
              name: config.name,
              description: config.description,
              type: config.id === 'corral' ? 'trading' : config.id === 'orchard' ? 'staking' : 'minting'
            },
            callback: config.callback,
            x: pointer.x,
            y: pointer.y
          });
        } else {
          // Left click - direct enter
          if (config.callback) {
            config.callback();
          } else {
          }
        }
      });
      
      // Add hover effects (button-like behavior)
      hotspot.on('pointerover', () => {
        building.setScale(1.15); // Bigger growth on hover
        
        // Only apply tint if building is a sprite/image, not a rectangle
        if (building.setTint) {
          building.setTint(0xFFFFBB); // Slight yellow tint
        } else {
          // For rectangles, change fill color instead
          building.setFillStyle(0xFFFFBB, 0.8);
        }
        
        nameLabel.setScale(1.3);
        descLabel.setScale(1.2);
        clickLabel.setScale(1.3);
        clickLabel.setTint(0x00FF00); // Green "Click to Enter"
        this.input.setDefaultCursor('pointer');
      });
      
      hotspot.on('pointerout', () => {
        building.setScale(1.0); // Return to normal
        
        // Only clear tint if building supports it
        if (building.clearTint) {
          building.clearTint();
        } else {
          // For rectangles, restore original color
          building.setFillStyle(config.color || 0x8B4513, 0.8);
        }
        
        nameLabel.setScale(1.0);
        descLabel.setScale(1.0);
        clickLabel.setScale(1.0);
        clickLabel.clearTint();
        this.input.setDefaultCursor('default');
      });
    });
    
  }

  updateCameraFollow() {
    // Follow the current player smoothly
    if (this.currentPlayer) {
      this.cameras.main.startFollow(this.currentPlayer, true, this.cameraLerpFactor, this.cameraLerpFactor);
    }
  }

  createCharacterAnimations() {
    // Character sprite sheet is now loaded directly as a spritesheet
  }


  // Character selection is now handled server-side through game room state
  // No need for localStorage utilities

  // Add this to window for easy console access during development
  setupDevTools() {
    if (typeof window !== 'undefined') {
      (window as any).debugMessage = () => {
      };
      
      (window as any).toggleDebugMode = () => {
        this.debugMode = !this.debugMode;
        this.renderDebugOverlay();
      };
      
      (window as any).printTerrainLayout = () => {
        console.table(this.terrainLayout);
      };
      
      (window as any).editTile = (x: number, y: number, tileType: string) => {
        const result = TilemapEditor.editTile(this.terrainLayout, x, y, tileType);
        if (result.success) {
          this.refreshTerrain();
        } else {
          console.error(`❌ Failed to edit tile: ${result.error}`);
        }
      };
      
      (window as any).createIsland = (x: number, y: number, radius: number = 2) => {
        const result = TilemapEditor.createIsland(
          this.terrainLayout, x, y, radius, 'cliff_corner', 'cliff_grass_transition'
        );
        if (result.success) {
          this.refreshTerrain();
        } else {
          console.error(`❌ Failed to create island: ${result.error}`);
        }
      };
      
      (window as any).validateTerrain = () => {
        const validation = TilemapEditor.validateTerrain(this.terrainLayout);
        if (validation.errors.length > 0) {
          console.error('Errors:', validation.errors);
        }
        if (validation.warnings.length > 0) {
          console.warn('Warnings:', validation.warnings);
        }
      };
      
      (window as any).exportTerrain = () => {
        const exported = TilemapEditor.exportTerrain(this.terrainLayout);
        // Copy to clipboard if available
        if (navigator.clipboard) {
          navigator.clipboard.writeText(exported);
        }
      };
      
      (window as any).togglePhysicsDebug = () => {
        const currentDebug = this.physics.world.debugGraphic;
        if (currentDebug) {
          this.physics.world.debugGraphic.clear();
          (this.physics.world as any).debugGraphic = null;
        } else {
          this.physics.world.createDebugGraphic();
        }
      };
      
      (window as any).debugCharacters = () => {
        if (this.currentPlayer) {
          const playerInfo = this.currentPlayer.getPlayerInfo();
          console.log(`Current player character: ${playerInfo.character}`);
        }
      };

      (window as any).debugTilemap = () => {
        const tileObjects = this.children.list.filter(child => child.getData && child.getData('tileType'));
        console.log(`Total tile objects: ${tileObjects.length}`);
      };

      (window as any).testTileVisibility = () => {
        // Remove existing test tiles
        this.children.list.filter(child => child.getData && child.getData('testTile')).forEach(tile => tile.destroy());
        
        // Create simple colored test tiles
        const testTile1 = this.add.rectangle(100, 100, 32, 32, 0xff0000);
        testTile1.setData('testTile', true);
        testTile1.setDepth(10);
        
        const testTile2 = this.add.rectangle(200, 100, 32, 32, 0x00ff00);
        testTile2.setData('testTile', true);
        testTile2.setDepth(10);
        
        // Test tileset texture rendering
        if (this.textures.exists('cliffs_grass_tileset')) {
          const testTilesetRender = this.add.image(300, 100, 'cliffs_grass_tileset');
          testTilesetRender.setData('testTile', true);
          testTilesetRender.setDepth(10);
          testTilesetRender.setDisplaySize(64, 64);
          
          // Test with crop
          const testCroppedTile = this.add.image(400, 100, 'cliffs_grass_tileset');
          testCroppedTile.setData('testTile', true);
          testCroppedTile.setDepth(10);
          testCroppedTile.setDisplaySize(32, 32);
          testCroppedTile.setCrop(96, 80, 32, 32); // grass_main coordinates
        }
        
      };
      
      (window as any).debugTilemap = () => {
        
        // Check tileset texture
        const texture = this.textures.get('cliffs_grass_tileset');
        console.log('Tileset texture:', texture);
        console.log('Tileset dimensions:', texture.source[0].width, 'x', texture.source[0].height);
        
        // Check rendered tiles
        const tiles = this.children.list.filter(child => child.getData && child.getData('tileType'));
        console.log('Total rendered tiles:', tiles.length);
        console.log('Visible tiles:', tiles.filter(t => (t as any).visible).length);
        console.log('Tiles with alpha > 0:', tiles.filter(t => (t as any).alpha > 0).length);
        
        // Sample tile details
        if (tiles.length > 0) {
          const sampleTile = tiles[0] as any;
          console.log('\nSample tile details:');
          console.log('  Position:', sampleTile.x, sampleTile.y);
          console.log('  Texture:', sampleTile.texture.key);
          console.log('  Crop frame:', sampleTile.frame.cutX, sampleTile.frame.cutY, sampleTile.frame.cutWidth, sampleTile.frame.cutHeight);
          console.log('  Display size:', sampleTile.displayWidth, sampleTile.displayHeight);
          console.log('  Visible:', sampleTile.visible);
          console.log('  Alpha:', sampleTile.alpha);
          console.log('  Depth:', sampleTile.depth);
          console.log('  Tint:', sampleTile.tintTopLeft);
        }
        
        // Check camera
        const camera = this.cameras.main;
        console.log('\nCamera details:');
        console.log('  Position:', camera.x, camera.y);
        console.log('  Scroll:', camera.scrollX, camera.scrollY);
        console.log('  Zoom:', camera.zoom);
        console.log('  World view:', camera.worldView);
        
        // Check if tiles are in camera view
        const tilesInView = tiles.filter(tile => {
          const bounds = (tile as any).getBounds();
          return (camera.worldView as any).contains(bounds.x, bounds.y) || 
                 (camera.worldView as any).intersects(bounds);
        });
        console.log('  Tiles in camera view:', tilesInView.length);
      };
      
      (window as any).testTileVisibility = () => {
        
        // Create a test tile without cropping
        const testTile1 = this.add.image(400, 300, 'cliffs_grass_tileset');
        testTile1.setDisplaySize(64, 64);
        testTile1.setDepth(1000);
        testTile1.setTint(0xff0000); // Red tint for visibility
        console.log('Created uncropped test tile at center (should be red)');
        
        // Create a test tile with a simple crop
        const testTile2 = this.add.image(500, 300, 'cliffs_grass_tileset');
        testTile2.setDisplaySize(64, 64);
        testTile2.setDepth(1000);
        testTile2.setCrop(0, 0, 32, 32); // Crop top-left 32x32
        testTile2.setTint(0x00ff00); // Green tint for visibility
        console.log('Created cropped test tile at center-right (should be green)');
      };
      
      (window as any).testBuildingVisibility = () => {
        
        // Clear existing test buildings
        this.children.list.filter(child => child.getData && child.getData('testBuilding')).forEach(building => building.destroy());
        
        // Create simple colored rectangles as test buildings
        const testBuilding1 = this.add.rectangle(800, 400, 96, 64, 0xff0000);
        testBuilding1.setStrokeStyle(4, 0xffffff);
        testBuilding1.setDepth(1000);
        testBuilding1.setData('testBuilding', true);
        
        const testBuilding2 = this.add.rectangle(500, 600, 80, 80, 0x00ff00);
        testBuilding2.setStrokeStyle(4, 0xffffff);
        testBuilding2.setDepth(1000);
        testBuilding2.setData('testBuilding', true);
        
        const testBuilding3 = this.add.rectangle(1200, 500, 64, 64, 0x0000ff);
        testBuilding3.setStrokeStyle(4, 0xffffff);
        testBuilding3.setDepth(1000);
        testBuilding3.setData('testBuilding', true);
        
        // Create test corral placeholder
        const testCorral = this.add.rectangle(600, 300, 96, 64, 0x8B4513);
        testCorral.setStrokeStyle(2, 0x654321);
        testCorral.setDepth(1000);
        testCorral.setData('testBuilding', true);
        
      };
      
      (window as any).debugAssets = () => {
        
        // Check all loaded textures
        console.log('\nLoaded textures:');
        const textures = Object.keys(this.textures.list);
        textures.forEach(key => {
          const texture = this.textures.get(key);
          const source = texture.source[0];
          console.log(`  ${key}: ${source ? source.width + 'x' + source.height : 'NO SOURCE'}`);
        });
        
        // Check if building textures exist
        console.log('\nBuilding textures:');
        console.log(`  corral_building: ❌ DISABLED (asset not available)`);
        
        // Check scene objects
        console.log('\nScene objects:');
        console.log(`  Total children: ${this.children.list.length}`);
        console.log(`  Visible children: ${this.children.list.filter(c => (c as any).visible !== false).length}`);
        
        // Check camera
        console.log('\nCamera info:');
        console.log(`  Camera position: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
        console.log(`  Camera zoom: ${this.cameras.main.zoom}`);
        console.log(`  World bounds: ${this.worldWidth}x${this.worldHeight}`);
      };

      (window as any).debugBuildings = () => {
        
        console.log(`\\nBuilding data: ${this.buildings.size} buildings`);
        this.buildings.forEach((building, id) => {
          console.log(`  ${id}:`, building);
        });
        
        console.log(`\\nPhysics zones: ${this.buildingPhysicsZones.size} zones`);
        this.buildingPhysicsZones.forEach((zone, id) => {
          const bounds = zone.getBounds();
          console.log(`  ${id}: (${bounds.x}, ${bounds.y}) ${bounds.width}x${bounds.height}`);
        });
        
        if (this.currentPlayer) {
          const playerBounds = this.currentPlayer.getBounds();
          console.log(`\\nPlayer bounds: (${playerBounds.x}, ${playerBounds.y}) ${playerBounds.width}x${playerBounds.height}`);
          console.log(`Player physics enabled: ${!!this.currentPlayer.body}`);
        } else {
          console.log('\\nNo current player found');
        }
        
        console.log(`\\nBuilding cooldown: ${this.buildingCooldown}`);
        console.log(`Last triggered: ${this.lastTriggeredBuilding || 'none'}`);
      };

      (window as any).testBuildingTrigger = (buildingId: string) => {
        this.triggerBuildingInteraction(buildingId);
      };

      (window as any).teleportToBuilding = (buildingId: string) => {
        const building = this.buildings.get(buildingId);
        if (building && this.currentPlayer) {
          this.currentPlayer.setPosition(building.x, building.y + 50);
          console.log(`🚀 Teleported to ${buildingId} at (${building.x}, ${building.y + 50})`);
        } else {
          console.log(`❌ Building ${buildingId} not found or no current player`);
        }
      };

      // Visual Novel Scene Testing Functions
      (window as any).testCorralScene = () => {
        this.scene.stop();
        this.scene.start('CorralScene', { returnScene: 'MainScene', playerData: {} });
      };

      (window as any).testOrchardScene = () => {
        this.scene.stop();
        this.scene.start('OrchardScene', { returnScene: 'MainScene', playerData: {} });
      };

      (window as any).testWellScene = () => {
        this.scene.stop();
        this.scene.start('WellScene', { returnScene: 'MainScene', playerData: {} });
      };

      (window as any).returnToMainScene = () => {
        this.scene.stop();
        this.scene.start('MainScene');
      };

      (window as any).listAllScenes = () => {
        console.log('📋 Available Scenes:');
      };
      
      (window as any).debugPlayers = () => {
        
        console.log(`\nTotal players: ${this.players.size}`);
        console.log(`Current player exists: ${!!this.currentPlayer}`);
        
        if (this.currentPlayer) {
          const info = this.currentPlayer.getPlayerInfo();
          console.log(`Current player position: (${info.x}, ${info.y})`);
          console.log(`Current player character: ${info.character}`);
          console.log(`Current player visible: ${(this.currentPlayer as any).visible}`);
        }
        
        // List all players
        this.players.forEach((player, sessionId) => {
          const info = player.getPlayerInfo();
          console.log(`Player ${sessionId}: ${info.name} at (${info.x}, ${info.y}) - ${info.character}`);
        });
        
        // Check if we're connected to server
        console.log(`\nServer connection: ${this.room ? 'CONNECTED' : 'DISCONNECTED'}`);
        console.log(`Session ID: ${this.sessionId || 'NONE'}`);
      };
      
      (window as any).createTestPlayer = () => {
        
        // Create simple test player at center of screen
        const testPlayer = this.add.circle(400, 300, 16, 0xff0000);
        testPlayer.setStrokeStyle(4, 0xffffff);
        testPlayer.setDepth(1000);
        testPlayer.setData('testPlayer', true);
        
        // Add player name
        const nameLabel = this.add.text(400, 280, 'TEST PLAYER', {
          fontSize: '12px',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(1001);
        
      };
      
      // Dev tools available in console
    }
  }
  
  renderDebugOverlay() {
    // Remove existing debug graphics
    const existingDebug = this.children.getByName('debug-overlay');
    if (existingDebug) {
      existingDebug.destroy();
    }
    
    if (!this.debugMode) return;
    
    // Create debug graphics
    const debugGraphics = this.add.graphics();
    debugGraphics.setName('debug-overlay');
    debugGraphics.setDepth(1000); // Render on top
    
    const tileSize = TilesetConfig.image.tileSize;
    
    // Draw grid and tile information
    for (let y = 0; y < this.terrainLayout.length; y++) {
      for (let x = 0; x < this.terrainLayout[y].length; x++) {
        const worldPos = TilemapUtils.tileToWorld(x, y, tileSize);
        const tileType = this.terrainLayout[y][x];
        const hasCollision = TilemapUtils.hasCollision(tileType);
        
        // Draw tile border
        debugGraphics.lineStyle(1, hasCollision ? 0xff0000 : 0x00ff00, 0.5);
        debugGraphics.strokeRect(
          worldPos.x - tileSize/2, 
          worldPos.y - tileSize/2, 
          tileSize, 
          tileSize
        );
        
        // Color code tiles
        if (hasCollision) {
          debugGraphics.fillStyle(0xff0000, 0.2);
        } else {
          debugGraphics.fillStyle(0x00ff00, 0.1);
        }
        debugGraphics.fillRect(
          worldPos.x - tileSize/2, 
          worldPos.y - tileSize/2, 
          tileSize, 
          tileSize
        );
      }
    }
  }

  refreshTerrain() {
    // Remove existing terrain tiles
    this.children.each((child) => {
      if (child.getData('tileType')) {
        child.destroy();
      }
    });
    
    // Clear cliff tiles array
    this.cliffTiles = [];
    
    // Recreate terrain from updated layout
    const tileSize = TilesetConfig.image.tileSize;
    const mapWidth = this.terrainLayout[0].length;
    const mapHeight = this.terrainLayout.length;
    
    // TODO: Implement createTilesFromLayout method for terrain refresh
    // this.createTilesFromLayout(tileSize, mapWidth, mapHeight);
    this.addTerrainDecorations(tileSize, mapWidth, mapHeight);
    
    // Update debug overlay if active
    if (this.debugMode) {
      this.renderDebugOverlay();
    }
    
  }

  createFarmingWorld() {
    // Use simple farm background with invisible walls (fast hackathon approach)
    this.createSimpleFarmBackground();
    
    // No additional overlays needed - simple and fast!
  }

  createMinimalStructure() {
    // Create a simple grid pattern for visual structure without clutter
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x90EE90, 0.2);
    
    // Add subtle grid lines for spatial reference
    for (let i = 0; i < 1600; i += 100) {
      gridGraphics.moveTo(i, 0);
      gridGraphics.lineTo(i, 900);
    }
    for (let j = 0; j < 900; j += 100) {
      gridGraphics.moveTo(0, j);
      gridGraphics.lineTo(1600, j);
    }
    gridGraphics.strokePath();
  }

  createRichTilemapWorld() {
    // Generate terrain layout using existing utilities
    const mapWidth = 50;  // 50 tiles wide
    const mapHeight = 38; // 38 tiles tall
    
    // Import TilemapUtils at runtime
    import('../lib/tilemap.config').then(({ TilemapUtils }) => {
      // Use the EXISTING terrain generation system
      this.terrainLayout = TilemapUtils.generateTerrainLayout(mapWidth, mapHeight);
      
      // Apply advanced terrain features
      this.enhanceTerrainWithAdvancedFeatures();
      
      // Create Phaser Tilemap from layout
      this.createPhaserTilemapFromLayout();
      
      // Initialize collision system
      this.initializeCollisionMap();
    });
  }

  enhanceTerrainWithAdvancedFeatures() {
    if (!this.terrainLayout) return;
    
    // Add cliff plateaus for visual interest
    this.paintRectangularPlateau(this.terrainLayout, 10, 8, 6, 4);
    this.paintRectangularPlateau(this.terrainLayout, 35, 12, 8, 5);
    
    // Add circular lake feature  
    this.paintCircularLake(this.terrainLayout, 25, 25, 4);
    
    // Connect areas with natural paths
    this.paintPath(this.terrainLayout, [
      {x: 5, y: 20}, {x: 15, y: 20}, {x: 25, y: 15}, {x: 40, y: 18}
    ]);
    
    // Add organic decorations and scattered features
    this.scatterDecorations(this.terrainLayout);
    this.paintScatteredFeatures(this.terrainLayout);
  }

  createPhaserTilemapFromLayout() {
    if (!this.terrainLayout) return;
    
    // Import tilemap config at runtime
    import('../lib/tilemap.config').then(({ TilemapUtils }) => {
      // Create tilemap from the terrain layout
      const tileSize = 32;
      const mapWidth = this.terrainLayout[0].length;
      const mapHeight = this.terrainLayout.length;
      
      // Create Phaser tilemap
      const map = this.make.tilemap({
        tileWidth: tileSize,
        tileHeight: tileSize,
        width: mapWidth,
        height: mapHeight
      });
      
      // Add tileset
      const tileset = map.addTilesetImage('cliffs_grass_tileset', 'cliffs_grass_tileset', tileSize, tileSize);
      
      // Create layer and populate with terrain
      const layer = map.createBlankLayer('terrain', tileset, 0, 0);
      
      // Populate tiles based on terrain layout
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const tileType = this.terrainLayout[y][x];
          const tileIndex = TilemapUtils.getTileIndexByName(tileType);
          if (tileIndex >= 0) {
            layer.putTileAt(tileIndex, x, y);
          }
        }
      }
      
      // Set collision for cliff tiles
      this.setupTilemapCollision(map, layer);
      
      // Update world dimensions
      this.worldWidth = mapWidth * tileSize;
      this.worldHeight = mapHeight * tileSize;
      
    });
  }

  setupTilemapCollision(map: Phaser.Tilemaps.Tilemap, layer: Phaser.Tilemaps.TilemapLayer) {
    // Import tilemap config to get collision tiles
    import('../lib/tilemap.config').then(({ TilemapUtils }) => {
      const collisionTiles = TilemapUtils.getCollisionTileIndexes();
      layer.setCollisionByExclusion(collisionTiles);
      
      // Store for player collision detection
      this.tilemapLayer = layer;
      
    });
  }


  createSimpleFarmBackground() {
    
    // Set world dimensions for a farm area
    this.worldWidth = 1600;
    this.worldHeight = 1200;
    
    // Create simple farm background using graphics
    this.createFarmBackgroundGraphics();
    
    // Create invisible collision walls for farm boundaries and obstacles
    this.createInvisibleWalls();
    
  }
  
  createFarmBackgroundGraphics() {
    // Create ultra-simple grass background
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
    
  }
  
  createInvisibleWalls() {
    
    // Create static physics group for invisible walls
    const walls = this.physics.add.staticGroup();
    
    // Just basic border walls to keep players in bounds
    const wallThickness = 32;
    
    // Top wall - Make visible as wooden fence border
    const topWall = this.add.rectangle(this.worldWidth / 2, -wallThickness / 2, this.worldWidth, wallThickness, 0x8B4513, 0.8); // Brown fence
    topWall.setStrokeStyle(2, 0x654321, 1.0); // Darker brown border
    this.physics.add.existing(topWall, true);
    walls.add(topWall);
    
    // Bottom wall - Wooden fence
    const bottomWall = this.add.rectangle(this.worldWidth / 2, this.worldHeight + wallThickness / 2, this.worldWidth, wallThickness, 0x8B4513, 0.8);
    bottomWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(bottomWall, true);
    walls.add(bottomWall);
    
    // Left wall - Wooden fence
    const leftWall = this.add.rectangle(-wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0x8B4513, 0.8);
    leftWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(leftWall, true);
    walls.add(leftWall);
    
    // Right wall - Wooden fence
    const rightWall = this.add.rectangle(this.worldWidth + wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0x8B4513, 0.8);
    rightWall.setStrokeStyle(2, 0x654321, 1.0);
    this.physics.add.existing(rightWall, true);
    walls.add(rightWall);
    
    // Store wall group for player collision detection
    this.invisibleWalls = walls;
    
  }
  
  private setupTilemapCollision(map: Phaser.Tilemaps.Tilemap, layer: Phaser.Tilemaps.TilemapLayer) {
    // Set collision for specific tile indices that represent solid objects
    const solidTileIndices: number[] = [];
    
    // Get indices for all solid tile types
    Object.entries(TilesetConfig.tiles).forEach(([tileName, config]) => {
      if (config.collision && config.index !== undefined) {
        solidTileIndices.push(config.index);
      }
    });
    
    if (solidTileIndices.length > 0) {
      layer.setCollision(solidTileIndices);
    }
  }

  // Painter Functions for Procedural World Generation

  private createBaseLayer(baseTile: string, width: number, height: number): string[][] {
    
    const layout: string[][] = [];
    
    // Create a foundation of variety - 80% main grass, 20% variant grass
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        if (Math.random() > 0.8) {
          // 20% chance: Use grass variants for natural variation
          const variants = ['grass_pure', 'grass_with_cliff_base'];
          layout[y][x] = variants[Math.floor(Math.random() * variants.length)];
        } else {
          // 80% chance: Use main grass tile
          layout[y][x] = baseTile;
        }
      }
    }
    
    return layout;
  }

  private paintBorders(layout: string[][]) {
    const height = layout.length;
    const width = layout[0].length;
    
    // Paint top and bottom borders with cliffs
    for (let x = 0; x < width; x++) {
      layout[0][x] = x % 2 === 0 ? 'cliff_tall_1' : 'cliff_tall_2'; // Top border - alternating cliffs
      layout[height - 1][x] = 'cliff_small'; // Bottom border - smaller cliffs
    }
    
    // Paint left and right borders with cliff transitions
    for (let y = 1; y < height - 1; y++) {
      layout[y][0] = 'grass_cliff_left'; // Left border - grass with cliff edge
      layout[y][width - 1] = 'grass_cliff_right'; // Right border - grass with cliff edge
    }
    
    // Paint corner cliffs for structural integrity
    layout[0][0] = 'cliff_large';
    layout[0][width - 1] = 'cliff_large';
    layout[height - 1][0] = 'cliff_round';
    layout[height - 1][width - 1] = 'cliff_round';
  }

  private paintRectangularPlateau(layout: string[][], x: number, y: number, width: number, height: number) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    // Ensure plateau fits within map bounds
    const endX = Math.min(x + width, mapWidth);
    const endY = Math.min(y + height, mapHeight);
    
    // STEP 1: Border First - Trace the outline with correct cliff tiles
    for (let py = y; py < endY; py++) {
      for (let px = x; px < endX; px++) {
        const isTopEdge = (py === y);
        const isBottomEdge = (py === endY - 1);
        const isLeftEdge = (px === x);
        const isRightEdge = (px === endX - 1);
        const isCorner = (isTopEdge || isBottomEdge) && (isLeftEdge || isRightEdge);
        const isEdge = isTopEdge || isBottomEdge || isLeftEdge || isRightEdge;
        
        if (isEdge) {
          if (isCorner) {
            // Corners get large cliff formations
            layout[py][px] = 'cliff_large';
          } else if (isBottomEdge) {
            // Bottom edge: cliff face tiles
            layout[py][px] = 'cliff_tall_1';
          } else if (isTopEdge) {
            // Top edge: grass-to-cliff-top transition
            layout[py][px] = 'grass_cliff_bottom';
          } else {
            // Side edges: vertical cliff sides
            layout[py][px] = isLeftEdge ? 'cliff_tall_2' : 'cliff_thin';
          }
        }
      }
    }
    
    // STEP 2: Fill Second - Fill the interior with different ground texture
    for (let py = y + 1; py < endY - 1; py++) {
      for (let px = x + 1; px < endX - 1; px++) {
        // Interior filled with dirt/elevated ground texture
        layout[py][px] = 'grass_with_cliff_base'; // Acts as "dirt_ground" equivalent
      }
    }
    
  }

  private paintCircularLake(layout: string[][], centerX: number, centerY: number, radius: number) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    // STEP 1: Fill the inside of the circle with water tiles
    // STEP 2: Trace the edge with grass-to-water transition tiles
    
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distance <= radius - 1) {
          // Inner water area - use pure grass as "water" (since we don't have water tiles)
          // In a real implementation, this would be 'water_deep' or similar
          layout[y][x] = 'grass_pure';
        }
        else if (distance <= radius) {
          // Water edge - slightly different water
          layout[y][x] = 'grass_pure';
        }
        else if (distance <= radius + 1.5) {
          // Lake shore transitions - create natural grass-to-water edges
          // Use different transition tiles based on position relative to center
          const angle = Math.atan2(y - centerY, x - centerX);
          const normalizedAngle = ((angle + Math.PI) / (2 * Math.PI)) * 4; // 0-4 range
          
          if (normalizedAngle < 1) {
            layout[y][x] = 'grass_cliff_left'; // Left shore
          } else if (normalizedAngle < 2) {
            layout[y][x] = 'grass_cliff_bottom'; // Bottom shore
          } else if (normalizedAngle < 3) {
            layout[y][x] = 'grass_cliff_right'; // Right shore  
          } else {
            layout[y][x] = 'grass_cliff_bottom'; // Top shore
          }
        }
        // Else: leave existing tile (no modification beyond transition zone)
      }
    }
    
  }

  private paintPath(layout: string[][], points: Array<{x: number, y: number}>) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    
    // Connect each point to the next
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      // Use Bresenham-like algorithm to connect points
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const sx = start.x < end.x ? 1 : -1;
      const sy = start.y < end.y ? 1 : -1;
      let err = dx - dy;
      
      let x = start.x;
      let y = start.y;
      
      while (true) {
        // Place path tile if within bounds and on grass
        if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
          const currentTile = layout[y][x];
          if (currentTile.includes('grass')) {
            layout[y][x] = 'sticks'; // Use sticks as "path_pebbles" equivalent
          }
        }
        
        if (x === end.x && y === end.y) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    }
    
  }

  private scatterDecorations(layout: string[][]) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    
    let decorationsPlaced = 0;
    
    // Loop through the entire map and add decorations with small probability
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const currentTile = layout[y][x];
        
        // Only place decorations on grass tiles
        if (currentTile === 'grass_main' || currentTile === 'grass_pure') {
          if (Math.random() < 0.02) { // 2% chance for decoration
            const decorations = ['rocks_brown', 'rocks_dark', 'ladder'];
            const decoration = decorations[Math.floor(Math.random() * decorations.length)];
            layout[y][x] = decoration;
            decorationsPlaced++;
          }
        }
      }
    }
    
  }

  private paintScatteredFeatures(layout: string[][]) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    
    // Add a few small cliff outcrops for visual interest
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * (mapWidth - 6)) + 3;
      const y = Math.floor(Math.random() * (mapHeight - 6)) + 3;
      
      // Create small 2x2 cliff formations only on suitable terrain
      if (layout[y][x] === 'grass_main' && 
          layout[y][x + 1] === 'grass_main' &&
          layout[y + 1][x] === 'grass_main' &&
          layout[y + 1][x + 1] === 'grass_main') {
        layout[y][x] = 'cliff_round';
        layout[y][x + 1] = 'cliff_small';
        layout[y + 1][x] = 'grass_cliff_bottom';
        layout[y + 1][x + 1] = 'grass_cliff_bottom';
      }
    }
    
  }

  // Old manual rendering methods removed - now using proper Phaser Tilemap system

  addTerrainDecorations(tileSize: number, mapWidth: number, mapHeight: number) {
    // Add decorative elements based on terrain layout
    const decorationPositions = [];
    
    // Find suitable positions for decorations
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileType = this.terrainLayout[y][x];
        
        // Add ladders near cliffs
        if (tileType.includes('cliff') && Math.random() > 0.95) {
          decorationPositions.push({
            x: x * tileSize + tileSize/2,
            y: y * tileSize + tileSize/2,
            type: 'ladder'
          });
        }
        
        // Add rocks on grass areas
        if (tileType.includes('grass') && Math.random() > 0.98) {
          decorationPositions.push({
            x: x * tileSize + tileSize/2,
            y: y * tileSize + tileSize/2,
            type: 'rock'
          });
        }
      }
    }
    
    // Create decoration sprites
    decorationPositions.forEach(({x, y, type}) => {
      if (type === 'ladder') {
        const ladder = this.add.rectangle(x, y, 8, 24, 0x8B4513, 0.8);
        ladder.setStrokeStyle(1, 0x654321, 1);
      } else if (type === 'rock') {
        const rock = this.add.circle(x, y, 4, 0x696969, 0.8);
        rock.setStrokeStyle(1, 0x2F2F2F, 0.6);
      }
    });
  }

  addDecorations() {
    // Add trees around the border, avoiding cliff areas
    const treePositions = [
      [100, 300], [200, 280], [300, 320], [500, 290],
      [600, 310], [700, 285], [150, 450], [650, 460],
      [250, 420], [550, 440], [120, 380], [680, 400]
    ];
    
    treePositions.forEach(([x, y]) => {
      // Check if position conflicts with cliff tiles
      const tileX = Math.floor(x / 32);
      const tileY = Math.floor(y / 32);
      
      // Only place trees in safe grass areas
      if (tileY > 7 && tileX > 2 && tileX < 22) {
        const trunk = this.add.rectangle(x, y + 15, 8, 30, 0x8B4513);
        const leaves = this.add.circle(x, y, 20, 0x228B22, 0.8);
        
        this.tweens.add({
          targets: [trunk, leaves],
          rotation: 0.05,
          duration: 3000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Add natural pathways between grass areas
    const pathGraphics = this.add.graphics();
    pathGraphics.fillStyle(0xDEB887, 0.4);
    
    // Main horizontal path
    pathGraphics.fillRect(64, 380, 672, 16);
    
    // Vertical connecting paths
    pathGraphics.fillRect(200, 260, 16, 140);
    pathGraphics.fillRect(400, 260, 16, 140);
    pathGraphics.fillRect(600, 260, 16, 140);
    
    // Small decorative elements are now added by addTerrainDecorations()
  }


  // Enhanced tile-based collision detection using Phaser Tilemap system
  checkTileCollision(worldX: number, worldY: number): boolean {
    const tilemapLayer = (this as any).tilemapLayer as Phaser.Tilemaps.TilemapLayer;
    
    if (!tilemapLayer) {
      // Fallback to old collision system if tilemap layer not available
      // Check if mapLayout is properly initialized
      if (this.mapLayout.length === 0 || !this.mapLayout[0]) {
        return false; // No collision if map not initialized
      }
      
      const tileSize = 32;
      const tileX = Math.floor(worldX / tileSize);
      const tileY = Math.floor(worldY / tileSize);
      
      if (tileX < 0 || tileX >= this.mapLayout[0].length || 
          tileY < 0 || tileY >= this.mapLayout.length) {
        return true;
      }
      
      return this.collisionMap[tileY][tileX];
    }
    
    // Use Phaser's built-in tilemap collision checking
    const tile = tilemapLayer.getTileAtWorldXY(worldX, worldY);
    return tile ? tile.collides : false;
  }
  
  // Enhanced collision detection that checks player boundaries
  checkPlayerCollision(centerX: number, centerY: number): boolean {
    const playerSize = 16; // Half the player's collision box size
    
    // Check all four corners of the player's collision box
    const corners = [
      { x: centerX - playerSize, y: centerY - playerSize }, // Top-left
      { x: centerX + playerSize, y: centerY - playerSize }, // Top-right
      { x: centerX - playerSize, y: centerY + playerSize }, // Bottom-left
      { x: centerX + playerSize, y: centerY + playerSize }  // Bottom-right
    ];
    
    // If any corner is in a solid tile, collision detected
    for (const corner of corners) {
      if (this.checkTileCollision(corner.x, corner.y)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Legacy method for backward compatibility
  checkCliffCollision(x: number, y: number): boolean {
    return this.checkPlayerCollision(x, y);
  }

  createUI() {
    // Create minimal UI with only essential elements
    const uiContainer = this.add.container(0, 0);
    
    // UI is now handled by React components - no in-game text needed
  }

  setWorldConfiguration(worldId?: string, isOwnWorld?: boolean) {
    this.worldId = worldId;
    this.isOwnWorld = isOwnWorld;
  }
  
  setAuthInfo(address?: string, user?: any) {
    this.address = address;
    this.user = user;
  }

  /**
   * Transition to a scene using the scene management system
   */
  transitionToScene(sceneKey: string) {
    
    // Activate scene transition system if not already done
    if (!(window as any).phaserGameInstance) {
      (window as any).phaserGameInstance = this.scene.manager.game;
    }
    
    // Properly stop current scene before starting new one
    this.scene.stop(); // Stop current scene first
    
    // Start the new scene
    this.scene.start(sceneKey, { 
      previousScene: 'MainScene',
      playerId: this.sessionId 
    });
  }

  /**
   * Return to main farming scene from building scene  
   */
  returnToMainScene() {
    this.scene.stop(); // Stop current scene first
    this.scene.start('MainScene');
  }


  async connectToServer() {
    try {
      // Try to detect the appropriate server URL
      const hostname = window.location.hostname;
      const port = '2567';
      
      // Use localhost for local development, otherwise use the current hostname
      const serverHost = hostname === 'localhost' || hostname === '127.0.0.1' 
        ? 'localhost' 
        : hostname;
      
      const endpoint = `ws://${serverHost}:${port}`;
      console.log('Connecting to:', endpoint);
      
      // Get player ID from wallet address or user ID
      const playerId = this.address || this.user?.id || `guest_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine room type and options based on world configuration
      let roomType = 'game'; // fallback to generic room
      const roomOptions: RoomOptions = {
        name: this.user?.google?.name || this.user?.email?.address?.split('@')[0] || `Player${Math.floor(Math.random() * 1000)}`,
        playerId: playerId
      };

      if (this.worldId) {
        roomType = 'world';
        roomOptions.worldOwnerId = this.worldId;
        console.log(`Joining world: ${this.worldId} (${this.isOwnWorld ? 'as owner' : 'as visitor'}) with playerId: ${playerId}`);
      }
      
      try {
        this.client = new Client(endpoint);
        this.room = await this.client.joinOrCreate<GameState>(roomType, roomOptions);
      } catch (connectionError) {
        console.log('Primary connection failed, trying localhost fallback...');
        // Fallback to localhost if the detected hostname fails
        if (serverHost !== 'localhost') {
          const fallbackEndpoint = `ws://localhost:${port}`;
          console.log('Fallback connecting to:', fallbackEndpoint);
          this.client = new Client(fallbackEndpoint);
          this.room = await this.client.joinOrCreate<GameState>(roomType, roomOptions);
        } else {
          throw connectionError;
        }
      }

      this.sessionId = this.room.sessionId;

      // Building collision detection is now set up immediately after player creation

      // KISS approach: Just use simple message listeners, no complex state
      
      // Wait for initial state, then add any existing players and load crops
      this.room.onStateChange.once((state) => {
        if (state.players) {
          state.players.forEach((player: any, sessionId: string) => {
            this.addPlayer(sessionId, player);
          });
        }
        

        // Crop listeners are set up above - no duplicates needed
      });

      // Listen for messages
      this.room.onMessage('welcome', (message) => {
        console.log('Welcome message:', message);
      });

      this.room.onMessage('chat', (message: ChatMessage) => {
        console.log('Chat message:', message);
        if (this.chatCallback) {
          this.chatCallback(message);
        }
      });

      this.room.onMessage('player-joined', (message) => {
        console.log('Player joined:', message);
      });

      this.room.onMessage('player-left', (message) => {
        console.log('Player left:', message);
      });

      console.log('Connected to server!');
    } catch (error) {
      console.error('Failed to connect to server:', error);
      console.log('🚨 SERVER CONNECTION FAILED - Creating test player for debugging');
      // Create a test player for debugging when server is unavailable
      this.time.delayedCall(1000, () => {
        this.createTestPlayerForDebugging();
      });
    }
  }

  createTestPlayerForDebugging() {
    
    // Create a simple test player at the center of the screen
    const testSessionId = 'debug-player';
    const testPlayer = {
      id: testSessionId,
      name: 'Debug Player',
      x: 400,
      y: 300,
      level: 1,
      xp: 0
    };
    
    // Set this as the session ID so it becomes current player
    this.sessionId = testSessionId;
    
    // Add the test player
    this.addPlayer(testSessionId, testPlayer);
    
    // Create a mock room object so movement works
    this.room = {
      send: (type: string, data: any) => {
        // Update the test player position locally for debugging
        if (type === 'move') {
          const player = this.players.get(testSessionId);
          if (player) {
            player.updatePosition(data.x, data.y);
          }
        }
      }
    } as any;
    
  }

  addPlayer(sessionId: string, player: any) {
    try {
      const isCurrentPlayer = sessionId === this.sessionId;
      
      // Check if scene is active and ready
      if (!this.scene.isActive() || !this.add) {
        console.log('Scene not ready for adding player');
        return;
      }
      
      // Don't add if player already exists
      if (this.players.has(sessionId)) {
        console.log('Player already exists:', sessionId);
        return;
      }
      
      // Force current player to spawn at center of screen
      if (isCurrentPlayer) {
        player.x = 400; // Center X (800/2)
        player.y = 300; // Center Y (600/2)
      }
      
      // All players are cowboys now - simplified character assignment
      const characterType: CharacterType = 'cowboy';
      
      // Create PlayerInfo object
      const playerInfo: PlayerInfo = {
        id: sessionId,
        name: player.name,
        x: player.x,
        y: player.y,
        character: characterType,
        direction: 'down',
        isCurrentPlayer,
        level: player.level || 1,
        xp: player.xp || 0
      };
      
      // Create Player instance
      const playerObject = new Player(this, player.x, player.y, playerInfo);
      
      // Store reference
      this.players.set(sessionId, playerObject);
      
      if (isCurrentPlayer) {
        this.currentPlayer = playerObject;
        
        // Enable physics on the current player for building collision detection
        this.physics.add.existing(this.currentPlayer);
        if (this.currentPlayer.body) {
          (this.currentPlayer.body as Phaser.Physics.Arcade.Body).setSize(32, 32);
          (this.currentPlayer.body as Phaser.Physics.Arcade.Body).setOffset(-16, -16);
        }
        
        // Set up wall collision to prevent player from leaving world bounds
        if (this.invisibleWalls) {
          this.physics.add.collider(this.currentPlayer, this.invisibleWalls);
        }
        
        // Building interactions use simple click-based approach (no physics collision needed)
        
        // Start camera following the current player
        this.updateCameraFollow();
      }
      
      console.log('Added player:', sessionId, player.name, 'with character:', characterType);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  }

  removePlayer(sessionId: string) {
    try {
      const player = this.players.get(sessionId);
      if (player) {
        player.destroy();
        this.players.delete(sessionId);
        console.log('Removed player:', sessionId);
      }
    } catch (error) {
      console.error('Error removing player:', error);
    }
  }

  updatePlayer(sessionId: string, playerData: any) {
    try {
      const player = this.players.get(sessionId);
      if (player && playerData) {
        player.updatePosition(playerData.x, playerData.y);
        
        // Update level if it changed
        if (playerData.level && playerData.level !== player.getPlayerInfo().level) {
          player.updateLevel(playerData.level);
        }
      }
    } catch (error) {
      console.error('Error updating player:', error);
    }
  }

  updatePlayerDirection(player: Player, direction: string) {
    try {
      player.updateDirection(direction as any);
    } catch (error) {
      console.error('Error updating player direction:', error);
    }
  }

  // Building interactions now use simple click-based approach
  // No collision detection needed - buildings work like buttons!

  update() {
    if (!this.room || !this.currentPlayer) return;


    // Building interactions now use simple click-based approach (no collision checking)

    // Check if chat is active by looking for active input elements
    const chatActive = document.querySelector('.chat-input:focus') !== null;
    
    // Handle O key for stomp animation (only when chat is not active)
    if (!chatActive && Phaser.Input.Keyboard.JustDown(this.oKey)) {
      this.currentPlayer.playStompAnimation(2000); // Play for 2 seconds
    }
    
    // Don't process movement if chat is active
    if (chatActive) return;

    const speed = 6;
    let moved = false;
    let newX = this.currentPlayer.x;
    let newY = this.currentPlayer.y;

    // Handle input with directional sprite changes and collision detection
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      const potentialX = Math.max(20, newX - speed);
      // Check collision before moving using new tile-based system
      if (!this.checkPlayerCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        this.lastDirection = 'left';
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      const potentialX = Math.min(this.worldWidth - 20, newX + speed);
      // Check collision before moving using new tile-based system
      if (!this.checkPlayerCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        this.lastDirection = 'right';
      }
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      const potentialY = Math.max(20, newY - speed);
      // Check collision before moving using new tile-based system
      if (!this.checkPlayerCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        this.lastDirection = 'up';
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      const potentialY = Math.min(this.worldHeight - 20, newY + speed);
      // Check collision before moving using new tile-based system
      if (!this.checkPlayerCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        this.lastDirection = 'down';
      }
    }
    
    // Update sprite direction and animation state
    if (this.currentPlayer) {
      if (moved) {
        this.updatePlayerDirection(this.currentPlayer, this.lastDirection);
        // Update animation state to walking
        this.currentPlayer.updateMovementState(true);
      } else {
        // Update animation state to idle when not moving
        this.currentPlayer.updateMovementState(false);
      }
    }

    // Update local player position and send movement to server
    if (moved) {
      // Update local player position immediately for responsive controls
      this.currentPlayer.updatePosition(newX, newY);
      
      // Send movement to server
      this.room.send('move', { x: newX, y: newY });
      
      // Update camera to follow player
      this.updateCameraFollow();
      
    }
  }

  sendChatMessage(message: string) {
    console.log('Sending chat message:', message, 'Room:', this.room);
    if (this.room && message.trim()) {
      try {
        this.room.send('chat', { text: message });
        console.log('Chat message sent successfully');
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    } else {
      console.log('Cannot send chat - no room or empty message');
    }
  }

  destroy() {
    if (this.room) {
      this.room.leave();
    }
    this.scene.stop();
  }

}

interface GameProps {
  worldId?: string;
  isOwnWorld?: boolean;
}

function Game({ worldId, isOwnWorld }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const sceneRef = useRef<MainScene | null>(null);
  const [buildingContextMenu, setBuildingContextMenu] = useState<{
    building: {
      id: string;
      name: string;
      description: string;
      type: string;
    };
    callback: () => void;
    x: number;
    y: number;
  } | null>(null);
  
  // Get user authentication info
  const { user } = usePrivy();
  const { address } = useAccount();
  
  // Get stable modal functions from store to prevent infinite re-renders
  const showCorralModal = useAppStore(state => state.showCorralModal);
  const showOrchardModal = useAppStore(state => state.showOrchardModal);
  const showWellModal = useAppStore(state => state.showWellModal);

  useEffect(() => {
    // Calculate dimensions based on viewport minus bottom bar
    const BAR_HEIGHT = 64; // Must match CSS --bar-height
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight - BAR_HEIGHT;
    
    console.log('📐 Game dimensions:', gameWidth, 'x', gameHeight);
    console.log('📋 Game container element:', document.getElementById('game-container'));
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: gameWidth,
      height: gameHeight,
      parent: 'game-container',
      backgroundColor: '#87CEEB',
      scene: [MainScene, CorralScene, OrchardScene, WellScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false // Set to true to see bounding boxes
        }
      },
      scale: {
        mode: Phaser.Scale.NONE,
        parent: 'game-container',
        width: gameWidth,
        height: gameHeight
      },
      render: {
        pixelArt: false,
        antialias: true,
        transparent: false,
        clearBeforeRender: true,
        preserveDrawingBuffer: false
      }
    };

    console.log('🔧 Creating Phaser game instance...');
    gameRef.current = new Phaser.Game(config);
    
    // Add game state debugging
    gameRef.current.events.on('ready', () => {
    });
    
    // Check if scenes are being added properly

    // Pass chat callback to scene - wait for scene to be ready
    setTimeout(() => {
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        sceneRef.current = scene;
        
        // Configure world settings and auth info
        scene.setWorldConfiguration(worldId, isOwnWorld);
        scene.setAuthInfo(address, user);
        
        scene.init({
          chatCallback: (message: ChatMessage) => {
            setChatMessages(prev => [...prev, message]);
          },
          showCorralModal,
          showOrchardModal,
          showWellModal
        });

        // Set up crop click event listener

        // Set up building context menu event listener
        scene.events.on('buildingRightClick', (data: any) => {
          setBuildingContextMenu(data);
        });
      }
    }, 500);

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - BAR_HEIGHT;
        gameRef.current.scale.resize(newWidth, newHeight);
      }
    };

    // Handle Enter key for chat
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is already typing in chat input
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      
      if (event.key === 'Enter') {
        event.preventDefault();
        setShowChat(true);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Chat submit:', chatInput, 'Scene ref:', sceneRef.current);
    if (chatInput.trim() && sceneRef.current) {
      sceneRef.current.sendChatMessage(chatInput);
      setChatInput('');
      setShowChat(false);
    } else {
      console.log('Cannot send chat - missing input or scene reference');
    }
  };



  const chatContainer = (
    <div className="chat-container">
      <div className="chat-messages">
        {chatMessages.slice(-5).map((msg, index) => (
          <div key={index} className="chat-message">
            <span className="chat-name">{msg.name}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
      </div>
      
      {showChat && (
        <form onSubmit={handleChatSubmit} className="chat-input-form">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            autoFocus
            onBlur={() => {
              // Small delay to allow form submission to process
              setTimeout(() => setShowChat(false), 100);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowChat(false);
                setChatInput('');
              }
            }}
          />
        </form>
      )}
    </div>
  );

  return (
    <div className="game-wrapper">
      <BuildingContextMenu
        building={buildingContextMenu?.building || null}
        onEnter={() => {
          if (buildingContextMenu?.callback) {
            buildingContextMenu.callback();
            setBuildingContextMenu(null);
          }
        }}
        onInfo={() => {
          // TODO: Show building info modal
          setBuildingContextMenu(null);
        }}
      >
        <div id="game-container" />
      </BuildingContextMenu>
      
      {/* UI Stack with all left-side UI elements */}
      <UIStack
        chatContainer={chatContainer}
      />


      <style jsx>{`
        .game-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        #game-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .chat-container {
          position: relative;
          width: 100%;
          max-height: 200px;
          pointer-events: none;
          z-index: 10;
          padding: 12px;
        }

        .chat-messages {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-message {
          color: white;
          font-size: 14px;
          margin-bottom: 5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .chat-name {
          font-weight: bold;
          margin-right: 5px;
          color: #87CEEB;
        }

        .chat-text {
          opacity: 0.9;
        }

        .chat-input-form {
          pointer-events: all;
        }

        .chat-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 14px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .chat-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

export default Game;