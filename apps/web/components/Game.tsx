'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { Player, PlayerInfo } from '../lib/Player';
import { CharacterType, CharacterDefinitions } from '../lib/character.config';
import { TilesetConfig, TilemapUtils } from '../lib/tilemap.config';
import { TilemapEditor } from '../lib/tilemap.editor';
import { CropSystem, CropType, CropData } from '../lib/CropSystem';
import { GameConfig } from '../lib/GameConfig';
import { BankBuilding } from '../lib/BankBuilding';
import { MarketplaceBuilding } from '../lib/MarketplaceBuilding';
import { FlowBankBuilding } from '../lib/FlowBankBuilding';
import { FlowMarketplaceBuilding } from '../lib/FlowMarketplaceBuilding';
import { PepeBuilding } from '../lib/PepeBuilding';
import { PlayerManager } from '../lib/managers/PlayerManager';
import { BuildingManager } from '../lib/managers/BuildingManager';
import { InputManager } from '../lib/managers/InputManager';
import { CollisionManager } from '../lib/managers/CollisionManager';
import { NetworkManager } from '../lib/managers/NetworkManager';
import { DialogueBox } from './DialogueBox';
import { CropContextMenu } from './CropContextMenu';
import { CropInfo } from './CropInfo';
import { UIStack } from './UIStack';
import { MorphoDepositModal } from './MorphoDepositModal';
import { MarketplaceModal } from './MarketplaceModal';
import { FlowSwapModal } from './FlowSwapModal';
import { FlowStakingModal } from './FlowStakingModal';
import { PepeModal } from './PepeModal';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NetworkSelector } from './NetworkSelector';
import { RoomOptions } from '../types/colyseus.types';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useChainId } from 'wagmi';
import { katanaChain, flowMainnet } from '../app/wagmi';

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
  private cropSystem!: CropSystem;
  private bankBuilding!: BankBuilding;
  private marketplaceBuilding!: MarketplaceBuilding;
  private flowBankBuilding?: FlowBankBuilding;
  private flowMarketplaceBuilding?: FlowMarketplaceBuilding;
  private pepeBuilding?: PepeBuilding;
  private worldId?: string;
  private isOwnWorld?: boolean;
  private address?: string;
  private user?: { id: string; [key: string]: any };
  private currentChainId?: number;
  
  // Camera system properties
  private worldWidth: number = GameConfig.WORLD_WIDTH; // Massively increased for huge exploration area
  private worldHeight: number = GameConfig.WORLD_HEIGHT; // Massively increased for huge exploration area
  private cameraLerpFactor: number = GameConfig.CAMERA_LERP_FACTOR; // Smooth camera following
  
  // Simple background approach with invisible walls
  private invisibleWalls!: Phaser.Physics.Arcade.StaticGroup;
  
  // Legacy tilemap properties (kept for backward compatibility)
  private mapLayout: string[][] = [];
  private collisionMap: boolean[][] = [];
  
  // Performance optimization properties
  private lastBuildingCheck: number = 0;
  private lastCropUpdate: number = 0;
  private lastPlayerSync: number = 0;
  
  // Pre-computed collision grid for performance
  private collisionGrid: boolean[][] = [];
  private tileSize: number = 32;
  
  // Manager instances for better architecture
  private playerManager?: PlayerManager;
  private buildingManager?: BuildingManager;
  private collisionManager?: CollisionManager;
  private networkManager?: NetworkManager;
  private inputManager?: InputManager;

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
    // Don't override the manually set world dimensions
    // this.worldWidth = this.mapLayout[0].length * tileSize;
    // this.worldHeight = this.mapLayout.length * tileSize;
    
  }
  
  private isTileSolid(tileType: string): boolean {
    // Define which tiles are solid (impassable)
    const solidTiles = [
      'cliff_tall_1', 'cliff_tall_2', 'cliff_thin', 'cliff_round', 
      'cliff_large', 'cliff_small', 'rocks_brown', 'rocks_dark'
    ];
    return solidTiles.includes(tileType);
  }

  init(data: { chatCallback?: (message: ChatMessage) => void }) {
    this.chatCallback = data.chatCallback;
  }

  preload() {
    // Add load event listeners for debugging
    this.load.on('filecomplete', (key: string, type: string, data: any) => {
    });
    
    this.load.on('loaderror', (file: any) => {
      console.error(`❌ Failed to load: ${file.key} from ${file.url}`);
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
    
    // Load improved grass texture for background
    this.load.image('improved_grass', '/tilesets/Grass_Improved.png');
    
    // Load Katana network building sprites
    this.load.image('bank', '/bank.png');
    this.load.image('market', '/market.png');

    // Load Flow network building sprites
    this.load.image('flow_bank', '/sprites/Coach_Wagon/Coach_Wagon.png');
    this.load.image('flow_market', '/sprites/Wild_Orchard/Wild_Orchard.png');

    // Load Pepe building animated sprite atlas
    this.load.atlas(
      'pepe_building_anim',
      '/sprites/Pepe/_building_pepe/building_pepe.png',
      '/sprites/Pepe/_building_pepe/building_pepe.json'
    );
    
    // Initialize and preload crop system
    this.cropSystem = new CropSystem(this);
    this.cropSystem.preload();
  }

  async create() {
    // Log all loaded textures for debugging
    
    // Setup camera system first
    this.setupCameraSystem();
    
    // Set physics world bounds to match our expanded world
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Create a beautiful farming world background
    this.createFarmingWorld();
    
    // Add elegant UI overlay
    this.createUI();

    // Create animations for different characters
    this.createCharacterAnimations();

    // Setup development tools
    this.setupDevTools();

    // Initialize crop system
    this.cropSystem.create();

    // Initialize managers
    this.networkManager = new NetworkManager(this);
    this.playerManager = new PlayerManager(this, this.networkManager);
    this.buildingManager = new BuildingManager(this);
    this.collisionManager = new CollisionManager(this, this.buildingManager);
    
    // Initialize InputManager after collision manager is ready
    // Set up keyboard controls first
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    this.oKey = this.input.keyboard!.addKey('O');

    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.collisionManager
    );
    
    // Setup input through InputManager with existing keyboard controls
    this.inputManager.setupInput(this.cursors, this.wasd);
    
    // Create network-specific buildings (will be created based on chain ID)
    this.createNetworkSpecificBuildings();
    
    // Compute collision grid after terrain and buildings are created
    if (this.collisionManager) {
      this.collisionManager.computeCollisionGrid(this.terrainLayout);
    } else {
      this.computeCollisionGrid();
    }

    // Add global focus/blur event listeners to stop game input when typing
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || 
          target instanceof HTMLTextAreaElement ||
          target.getAttribute('contenteditable') === 'true') {
        // Disable Phaser keyboard input when focusing on input fields
        this.input.keyboard!.enabled = false;
        console.log('🎮 Game input disabled - user is typing');
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Small delay to prevent re-enabling too quickly
      setTimeout(() => {
        // Only re-enable if we're not focusing another input
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLInputElement) && 
            !(activeElement instanceof HTMLTextAreaElement) &&
            activeElement?.getAttribute('contenteditable') !== 'true') {
          this.input.keyboard!.enabled = true;
          console.log('🎮 Game input re-enabled');
        }
      }, 100);
    };

    // Add event listeners
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Clean up on scene shutdown
    this.events.once('shutdown', () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    });

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

  updateCameraFollow() {
    // Follow the current player smoothly
    if (this.currentPlayer) {
      this.cameras.main.startFollow(this.currentPlayer, true, this.cameraLerpFactor, this.cameraLerpFactor);
    }
  }

  createCharacterAnimations() {
    // Character sprite sheet is now loaded directly as a spritesheet
  }


  // Safe localStorage access for SSR
  private static safeLocalStorage = {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    },
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    }
  };

  // Utility function to reset a player's character selection
  static resetPlayerCharacter(playerAddress: string) {
    const storageKey = `defi-valley-character-${playerAddress}`;
    MainScene.safeLocalStorage.removeItem(storageKey);
  }

  // Add this to window for easy console access during development
  setupDevTools() {
    if (typeof window !== 'undefined') {
      (window as any).resetMyCharacter = () => {
        // Get current player address from the scene
        const currentPlayer = this.currentPlayer;
        if (currentPlayer) {
          const playerAddress = 'current-player'; // This would be replaced with actual address
          MainScene.resetPlayerCharacter(playerAddress);
          console.log('🎮 Character reset! Reload the page to get a new character.');
        }
      };
      
      (window as any).toggleDebugMode = () => {
        this.debugMode = !this.debugMode;
        console.log(`🔧 Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        this.renderDebugOverlay();
      };
      
      (window as any).printTerrainLayout = () => {
        console.log('🗺️ Terrain Layout:');
        console.table(this.terrainLayout);
      };
      
      (window as any).editTile = (x: number, y: number, tileType: string) => {
        const result = TilemapEditor.editTile(this.terrainLayout, x, y, tileType);
        if (result.success) {
          console.log(`✅ Tile at (${x}, ${y}) changed from ${result.oldTileType} to ${tileType}`);
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
          console.log(`🏝️ Created island at (${x}, ${y}) with radius ${radius}, changed ${result.tilesChanged} tiles`);
          this.refreshTerrain();
        } else {
          console.error(`❌ Failed to create island: ${result.error}`);
        }
      };
      
      (window as any).validateTerrain = () => {
        const validation = TilemapEditor.validateTerrain(this.terrainLayout);
        console.log('🔍 Terrain Validation:');
        console.log(`Valid: ${validation.isValid}`);
        if (validation.errors.length > 0) {
          console.error('Errors:', validation.errors);
        }
        if (validation.warnings.length > 0) {
          console.warn('Warnings:', validation.warnings);
        }
      };
      
      (window as any).exportTerrain = () => {
        const exported = TilemapEditor.exportTerrain(this.terrainLayout);
        console.log('📤 Exported terrain:');
        console.log(exported);
        // Copy to clipboard if available
        if (navigator.clipboard) {
          navigator.clipboard.writeText(exported);
          console.log('✅ Copied to clipboard!');
        }
      };
      
      (window as any).togglePhysicsDebug = () => {
        const currentDebug = this.physics.world.debugGraphic;
        if (currentDebug) {
          this.physics.world.debugGraphic.clear();
          (this.physics.world as any).debugGraphic = null;
          console.log('🔧 Physics debug: OFF');
        } else {
          this.physics.world.createDebugGraphic();
          console.log('🔧 Physics debug: ON - You can now see bounding boxes');
        }
      };
      
      (window as any).debugCharacters = () => {
        console.log('🎭 Character Debugging Information:');
        console.log('Available textures:', Object.keys(this.textures.list));
        console.log('Character definitions:', CharacterDefinitions);
        
        // Check each character's assets
        Object.entries(CharacterDefinitions).forEach(([name, config]) => {
          console.log(`\n${name.toUpperCase()} Character:`);
          console.log('  Config:', config);
          
          if (config.type === 'animation_sheets' && config.animationConfig) {
            Object.entries(config.animationConfig.animations).forEach(([animName, anim]) => {
              const exists = this.textures.exists(anim.key);
              console.log(`  ${animName} (${anim.key}): ${exists ? '✅ LOADED' : '❌ MISSING'}`);
              if (!exists) {
                console.log(`    Expected path: ${anim.path}`);
              }
            });
          }
        });
        
        // Current player info
        if (this.currentPlayer) {
          const playerInfo = this.currentPlayer.getPlayerInfo();
          console.log(`\nCurrent player character: ${playerInfo.character}`);
          // Access private sprite property for debugging
          const sprite = (this.currentPlayer as any).sprite;
          console.log('Player sprite texture:', sprite?.texture?.key || 'NONE');
        }
      };

      // Advanced tilemap debugging
      (window as any).debugTilemap = () => {
        console.log('🗺️ === TILEMAP DEBUG INFO ===');
        
        // Check tileset texture
        const tilesetTexture = this.textures.get('cliffs_grass_tileset');
        console.log('Tileset texture:', tilesetTexture);
        console.log('Tileset dimensions:', tilesetTexture.source[0]?.width || 'UNKNOWN', 'x', tilesetTexture.source[0]?.height || 'UNKNOWN');
        
        // Check tile configuration
        console.log('\nTile configurations:');
        Object.entries(TilesetConfig.tiles).forEach(([name, config]) => {
          const isValid = config.x >= 0 && config.y >= 0 && 
                         config.x + config.width <= (tilesetTexture.source[0]?.width || 0) &&
                         config.y + config.height <= (tilesetTexture.source[0]?.height || 0);
          console.log(`  ${name}: ${isValid ? '✅' : '❌'} {x:${config.x}, y:${config.y}, w:${config.width}, h:${config.height}}`);
        });
        
        // Check rendered tiles
        console.log('\nRendered tiles in scene:');
        const tileObjects = this.children.list.filter(child => child.getData && child.getData('tileType'));
        console.log(`Total tile objects: ${tileObjects.length}`);
        
        if (tileObjects.length > 0) {
          const firstTile = tileObjects[0] as Phaser.GameObjects.Image;
          console.log('First tile:', {
            position: { x: firstTile.x, y: firstTile.y },
            displaySize: { width: firstTile.displayWidth, height: firstTile.displayHeight },
            depth: firstTile.depth,
            visible: firstTile.visible,
            alpha: firstTile.alpha,
            tileType: firstTile.getData('tileType')
          });
        }
        
        // Camera information
        console.log('\nCamera info:');
        console.log(`Camera scroll: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
        console.log(`Camera bounds: ${this.cameras.main.getBounds()}`);
        console.log(`World bounds: ${this.worldWidth}x${this.worldHeight}`);
      };

      (window as any).testTileVisibility = () => {
        console.log('🧪 Testing tile visibility...');
        
        // Remove existing test tiles
        this.children.list.filter(child => child.getData && child.getData('testTile')).forEach(tile => tile.destroy());
        
        // Create simple colored test tiles
        const testTile1 = this.add.rectangle(100, 100, 32, 32, 0xff0000);
        testTile1.setData('testTile', true);
        testTile1.setDepth(10);
        console.log('Created red test tile at (100, 100)');
        
        const testTile2 = this.add.rectangle(200, 100, 32, 32, 0x00ff00);
        testTile2.setData('testTile', true);
        testTile2.setDepth(10);
        console.log('Created green test tile at (200, 100)');
        
        // Test tileset texture rendering
        if (this.textures.exists('cliffs_grass_tileset')) {
          const testTilesetRender = this.add.image(300, 100, 'cliffs_grass_tileset');
          testTilesetRender.setData('testTile', true);
          testTilesetRender.setDepth(10);
          testTilesetRender.setDisplaySize(64, 64);
          console.log('Created raw tileset test image at (300, 100)');
          
          // Test with crop
          const testCroppedTile = this.add.image(400, 100, 'cliffs_grass_tileset');
          testCroppedTile.setData('testTile', true);
          testCroppedTile.setDepth(10);
          testCroppedTile.setDisplaySize(32, 32);
          testCroppedTile.setCrop(96, 80, 32, 32); // grass_main coordinates
          console.log('Created cropped grass tile test at (400, 100)');
        }
        
        console.log('✅ Test tiles created. Check the game for red, green, raw tileset, and cropped grass tiles.');
      };
      
      (window as any).debugTilemap = () => {
        console.log('🗺️ Tilemap Debugging Information:');
        
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
        console.log('🔍 Testing tile visibility...');
        
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
      
      console.log('🛠️ Dev tools available:');
      console.log('  - resetMyCharacter(): Reset character selection');
      console.log('  - toggleDebugMode(): Show/hide terrain debug overlay');
      console.log('  - printTerrainLayout(): Print terrain layout to console');
      console.log('  - editTile(x, y, tileType): Edit a single tile');
      console.log('  - createIsland(x, y, radius): Create cliff island');
      console.log('  - validateTerrain(): Check terrain for issues');
      console.log('  - exportTerrain(): Export terrain to JSON');
      console.log('  - debugCharacters(): Debug character loading issues');
      console.log('  🔍 TILEMAP DEBUGGING:');
      console.log('  - debugTilemap(): Complete tilemap diagnostic');
      console.log('  - testTileVisibility(): Test basic tile rendering');
      console.log('  📍 TELEPORTATION:');
      console.log('  - teleportToBuildings(): Teleport to the buildings area');
      console.log('  - showBuildingLocations(): Display all building coordinates');
    }
    
    // Add teleportation commands
    (window as any).teleportToBuildings = () => {
      if (!this.currentPlayer) {
        console.log('❌ No current player found');
        return;
      }
      
      // Teleport to center of building area
      const targetX = 650;
      const targetY = 500;
      this.currentPlayer.setPosition(targetX, targetY);
      
      // Send position update to server
      if (this.room) {
        this.room.send('move', { x: targetX, y: targetY });
      }
      
      console.log(`✅ Teleported to building area (${targetX}, ${targetY})`);
    };
    
    (window as any).showBuildingLocations = () => {
      console.log('🏛️ Building Locations in Expanded World:');
      console.log('\n📍 KATANA NETWORK BUILDINGS:');
      console.log('  Bank (Morpho): x=1000, y=600');
      console.log('  Marketplace (SushiSwap): x=1000, y=200');
      console.log('\n📍 FLOW NETWORK BUILDINGS:');
      console.log('  Flow Bank (Staking): x=300, y=200');
      console.log('  Flow Marketplace (DeFi Hub): x=300, y=600');
      console.log('  Pepe Building (Pump Launchpad): x=500, y=800');
      console.log('\n💡 TIP: Use teleportToBuildings() to jump to the building area');
      console.log('💡 Your world is now 6400x4800 pixels (was 800x600)');
    };
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

  createSimpleFarmBackground() {
    
    // Set world dimensions for a larger farm area
    this.worldWidth = GameConfig.SERVER_WORLD_WIDTH;
    this.worldHeight = GameConfig.SERVER_WORLD_HEIGHT;
    
    // Update physics world bounds to match the actual world size
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Create simple farm background using graphics
    this.createFarmBackgroundGraphics();
    
    // Invisible walls are not needed since physics world bounds handle boundaries
    // this.createInvisibleWalls();
    
  }
  
  createFarmBackgroundGraphics() {
    // Create improved grass background using the texture
    const grassBackground = this.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, 'improved_grass');
    grassBackground.setOrigin(0, 0);
    grassBackground.setDepth(-10); // Behind everything
  }
  
  createInvisibleWalls() {
    
    // Create static physics group for invisible walls
    const walls = this.physics.add.staticGroup();
    
    // Just basic border walls to keep players in bounds
    const wallThickness = 32;
    
    // Top wall
    const topWall = this.add.rectangle(this.worldWidth / 2, -wallThickness / 2, this.worldWidth, wallThickness, 0xff0000, 0);
    this.physics.add.existing(topWall, true);
    walls.add(topWall);
    
    // Bottom wall  
    const bottomWall = this.add.rectangle(this.worldWidth / 2, this.worldHeight + wallThickness / 2, this.worldWidth, wallThickness, 0xff0000, 0);
    this.physics.add.existing(bottomWall, true);
    walls.add(bottomWall);
    
    // Left wall
    const leftWall = this.add.rectangle(-wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0xff0000, 0);
    this.physics.add.existing(leftWall, true);
    walls.add(leftWall);
    
    // Right wall
    const rightWall = this.add.rectangle(this.worldWidth + wallThickness / 2, this.worldHeight / 2, wallThickness, this.worldHeight, 0xff0000, 0);
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
    
    console.log(`🎨 Painting path connecting ${points.length} points`);
    
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
    
    console.log(`✅ Path painted connecting all points`);
  }

  private scatterDecorations(layout: string[][]) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    console.log(`🎨 Scattering organic decorations across the world`);
    
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
    
    console.log(`✅ Scattered ${decorationsPlaced} organic decorations`);
  }

  private paintScatteredFeatures(layout: string[][]) {
    const mapHeight = layout.length;
    const mapWidth = layout[0].length;
    
    console.log(`🎨 Adding scattered features with improved algorithms`);
    
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
    
    console.log(`✅ Scattered features added with improved placement logic`);
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
    
    // Check collision with Katana buildings
    if (this.bankBuilding) {
      for (const corner of corners) {
        if (this.bankBuilding.checkCollision(corner.x, corner.y)) {
          return true;
        }
      }
    }
    
    if (this.marketplaceBuilding) {
      for (const corner of corners) {
        if (this.marketplaceBuilding.checkCollision(corner.x, corner.y)) {
          return true;
        }
      }
    }
    
    // Check collision with Flow buildings
    if (this.flowBankBuilding) {
      for (const corner of corners) {
        if (this.flowBankBuilding.checkCollision(corner.x, corner.y)) {
          return true;
        }
      }
    }
    
    if (this.flowMarketplaceBuilding) {
      for (const corner of corners) {
        if (this.flowMarketplaceBuilding.checkCollision(corner.x, corner.y)) {
          return true;
        }
      }
    }
    
    // Check collision with Pepe building
    if (this.pepeBuilding) {
      for (const corner of corners) {
        if (this.pepeBuilding.checkCollision(corner.x, corner.y)) {
          return true;
        }
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
  }

  setWorldConfiguration(worldId?: string, isOwnWorld?: boolean) {
    this.worldId = worldId;
    this.isOwnWorld = isOwnWorld;
  }
  
  setAuthInfo(address?: string, user?: { id: string; [key: string]: any }) {
    this.address = address;
    this.user = user;
  }

  setChainId(chainId: number) {
    const oldChainId = this.currentChainId;
    this.currentChainId = chainId;
    
    // If chain ID changed and BuildingManager is ready, recreate buildings
    if (oldChainId !== chainId && this.buildingManager) {
      this.createNetworkSpecificBuildings();
    }
  }

  createNetworkSpecificBuildings() {
    // Use BuildingManager to handle building creation
    if (this.buildingManager) {
      this.buildingManager.createBuildingsBasedOnChain(this.currentChainId);
      
      // Get buildings from manager for backward compatibility
      const buildings = this.buildingManager.getBuildings();
      
      // Reset all building references first
      this.bankBuilding = undefined as any;
      this.marketplaceBuilding = undefined as any;
      this.flowBankBuilding = undefined;
      this.flowMarketplaceBuilding = undefined;
      this.pepeBuilding = undefined;
      
      // Assign buildings based on their type
      for (const building of buildings) {
        if (building instanceof BankBuilding) {
          this.bankBuilding = building;
        } else if (building instanceof MarketplaceBuilding) {
          this.marketplaceBuilding = building;
        } else if (building instanceof FlowBankBuilding) {
          this.flowBankBuilding = building;
        } else if (building instanceof FlowMarketplaceBuilding) {
          this.flowMarketplaceBuilding = building;
        } else if (building instanceof PepeBuilding) {
          this.pepeBuilding = building;
        }
      }
      
      // Set up event listeners for new buildings
      this.setupBuildingEventListeners();
      
      // Recompute collision grid when buildings change
      if (this.collisionManager) {
        this.collisionManager.computeCollisionGrid(this.terrainLayout);
      } else {
        this.computeCollisionGrid();
      }
    } else {
      // BuildingManager not yet initialized - this can happen during early initialization
      console.warn('BuildingManager not initialized yet, skipping building creation');
      // Buildings will be created when create() method completes
    }
  }

  setupBuildingEventListeners() {
    // Listeners are now managed by the React component's useEffect hook and should not be cleared here.
    // This function is called on every network switch, and removing listeners was preventing modals from opening.
  }

  async connectToServer() {
    // Use NetworkManager if available
    if (this.networkManager && this.playerManager) {
      try {
        await this.networkManager.connect(
          this.playerManager,
          this.worldId,
          this.isOwnWorld,
          this.address,
          this.user
        );
        
        // Get room and sessionId from NetworkManager
        this.room = this.networkManager.getRoom()!;
        this.sessionId = this.networkManager.getSessionId()!;
        
        // Set up message handlers
        this.networkManager.onMessage('welcome', (message) => {
          console.log('Welcome message:', message);
        });
        
        this.networkManager.onMessage('chat', (message: ChatMessage) => {
          console.log('Chat message:', message);
          if (this.chatCallback) {
            this.chatCallback(message);
          }
        });
        
        console.log(`Joined ${this.worldId ? 'world' : 'game'} room as ${this.sessionId}`);
      } catch (error) {
        console.error('Failed to connect:', error);
        // Could show a UI error here
      }
      return;
    }
    
    // Fallback to old implementation if managers not available
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
      
      // Format address for display (show first 6 and last 4 characters)
      const formatAddress = (addr: string): string => {
        if (addr.length > 10) {
          return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        }
        return addr;
      };
      
      // Use wallet address as display name, with formatted fallback
      const displayName = this.address 
        ? formatAddress(this.address)
        : `Player${Math.floor(Math.random() * 1000)}`;
      
      // Determine room type and options based on world configuration
      let roomType = 'game'; // fallback to generic room
      const roomOptions: RoomOptions = {
        name: displayName,
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

      // Listen for state changes
      this.room.onStateChange((state) => {
        console.log('State changed, players:', state.players);
        
        // Make sure scene is initialized before handling players
        if (!this.scene || !this.scene.isActive()) {
          console.log('Scene not ready yet, skipping state update');
          return;
        }
        
        // Handle all players in the current state
        if (state.players) {
          // Clear existing players first
          this.players.forEach((player, sessionId) => {
            if (!state.players.has || !state.players.has(sessionId)) {
              this.removePlayer(sessionId);
            }
          });
          
          // Add or update all current players
          state.players.forEach((player: any, sessionId: string) => {
            if (this.players.has(sessionId)) {
              this.updatePlayer(sessionId, player);
            } else {
              this.addPlayer(sessionId, player);
            }
          });
        }
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
    }
  }

  addPlayer(sessionId: string, player: { name: string; x: number; y: number; level?: number; connected?: boolean }) {
    // Use PlayerManager if available
    if (this.playerManager) {
      this.playerManager.addPlayer(sessionId, player, sessionId === this.sessionId);
      
      // Get the current player reference if this is us
      if (sessionId === this.sessionId) {
        this.currentPlayer = this.playerManager.getPlayer(sessionId)!;
        
        // Set up camera to follow current player
        this.updateCameraFollow();
      }
      return;
    }
    
    // Fallback to old implementation
    try {
      const isCurrentPlayer = sessionId === this.sessionId;
      
      // Check if scene is active and ready
      if (!this.scene || !this.scene.isActive() || !this.add) {
        console.log('Scene not ready for adding player');
        return;
      }
      
      // Don't add if player already exists
      if (this.players.has(sessionId)) {
        console.log('Player already exists:', sessionId);
        return;
      }
      
      // Force current player to spawn near buildings
      if (isCurrentPlayer) {
        // Spawn near the buildings area for easier access
        player.x = 650; // Between Flow and Katana buildings
        player.y = 500; // Middle of building cluster
        console.log('🎯 Current player spawned near buildings:', player.x, player.y);
      }
      
      // All players are cowboys now - simplified character assignment
      const characterType: CharacterType = 'cowboy';
      console.log(`🤠 Player ${player.name} assigned cowboy character`);
      
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
        // Start camera following the current player
        this.updateCameraFollow();
        console.log('📷 Camera now following current player');
      }
      
      console.log('Added player:', sessionId, player.name, 'with character:', characterType);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  }

  removePlayer(sessionId: string) {
    // Use PlayerManager if available
    if (this.playerManager) {
      this.playerManager.removePlayer(sessionId);
      this.players.delete(sessionId);
      return;
    }
    
    // Fallback to old implementation
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

  updatePlayer(sessionId: string, playerData: { x?: number; y?: number; level?: number; connected?: boolean }) {
    // Use PlayerManager if available
    if (this.playerManager) {
      this.playerManager.updatePlayer(sessionId, playerData);
      return;
    }
    
    // Fallback to old implementation
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
      console.log(`🧭 Updated player direction: ${direction}`);
    } catch (error) {
      console.error('Error updating player direction:', error);
    }
  }

  update(time: number, delta: number) {
    if (!this.room || !this.currentPlayer) return;

    // Clamp delta to prevent huge jumps when tab switching
    const clampedDelta = Math.min(delta, 100);

    // Use InputManager for delta-time based movement if available
    if (this.inputManager && this.playerManager) {
      this.inputManager.update(clampedDelta);
    } else {
      // Fallback to old input handling with delta time
      this.handlePlayerInput(clampedDelta);
    }

    // Use PlayerManager for network throttling
    if (this.playerManager) {
      this.playerManager.update(time);
    }

    // Use BuildingManager for interactions
    if (this.buildingManager) {
      this.buildingManager.update(time, this.currentPlayer);
    } else if (time - this.lastBuildingCheck > 100) {
      // Fallback to old building interaction
      this.updateBuildingInteractions();
      this.lastBuildingCheck = time;
    }

    // Update crop system
    if (time - this.lastCropUpdate > GameConfig.CROP_UPDATE_INTERVAL) {
      this.cropSystem?.update();
      this.lastCropUpdate = time;
    }
  }

  private handlePlayerInput(delta: number) {
    if (!this.currentPlayer) return;

    const activeElement = document.activeElement;
    const isUIInputElementActive = 
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true' ||
      activeElement?.closest('[role="dialog"]') !== null;

    if (Phaser.Input.Keyboard.JustDown(this.oKey) && !isUIInputElementActive) {
      this.currentPlayer.playStompAnimation(2000);
    }

    if (isUIInputElementActive) {
      this.currentPlayer.updateMovementState(false);
      return;
    }

    // Convert speed to pixels per second for delta-time movement
    const speedPerSecond = GameConfig.PLAYER_SPEED; // 540 pixels/second from GameConfig
    const moveDistance = speedPerSecond * (delta / 1000);
    let moved = false;
    let newX = this.currentPlayer.x;
    let newY = this.currentPlayer.y;
    let newDirection = this.lastDirection;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      const potentialX = Math.max(20, newX - moveDistance);
      if (!this.checkPlayerCollisionOptimized(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'left';
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      const potentialX = Math.min(this.worldWidth - 20, newX + moveDistance);
      if (!this.checkPlayerCollisionOptimized(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'right';
      }
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      const potentialY = Math.max(20, newY - moveDistance);
      if (!this.checkPlayerCollisionOptimized(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'up';
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      const potentialY = newY + moveDistance;
      if (!this.checkPlayerCollisionOptimized(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'down';
      }
    }

    this.lastDirection = newDirection;
    this.updatePlayerDirection(this.currentPlayer, this.lastDirection);
    this.currentPlayer.updateMovementState(moved);

    if (moved) {
      this.currentPlayer.setPosition(newX, newY);
      const now = performance.now();
      if (now - this.lastPlayerSync > 100) { // Sync position 10 times per second
        this.room.send('move', { x: newX, y: newY });
        this.lastPlayerSync = now;
      }
    }

    this.updateCameraFollow();
  }

  private updateBuildingInteractions() {
    if (!this.currentPlayer) return;
    
    // Use BuildingManager if available
    if (this.buildingManager) {
      this.buildingManager.update(Date.now(), this.currentPlayer);
    } else {
      // Fallback to old implementation
      const { x, y } = this.currentPlayer;
      const buildings = [
        this.bankBuilding,
        this.marketplaceBuilding,
        this.flowBankBuilding,
        this.flowMarketplaceBuilding,
        this.pepeBuilding,
      ];

      for (const building of buildings) {
        if (building) {
          building.checkPlayerProximity(x, y);
          building.checkInteraction();
        }
      }
    }
  }

  private markBuildingCollisions(gridHeight: number, gridWidth: number) {
    const buildings = [
      this.bankBuilding,
      this.marketplaceBuilding, 
      this.flowBankBuilding,
      this.flowMarketplaceBuilding,
      this.pepeBuilding
    ];

    for (const building of buildings) {
      if (building && building.getCollisionBounds) {
        const bounds = building.getCollisionBounds();
        const startTile = TilemapUtils.worldToTile(bounds.x, bounds.y, this.tileSize);
        const endTile = TilemapUtils.worldToTile(bounds.right, bounds.bottom, this.tileSize);

        for (let y = startTile.y; y <= endTile.y; y++) {
          for (let x = startTile.x; x <= endTile.x; x++) {
            if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
              this.collisionGrid[y][x] = true;
            }
          }
        }
      }
    }
  }

  private computeCollisionGrid() {
    // If using simple background without terrain layout, create a basic grid
    if (this.terrainLayout.length === 0) {
      // Create grid based on world dimensions
      const gridWidth = Math.ceil(this.worldWidth / this.tileSize);
      const gridHeight = Math.ceil(this.worldHeight / this.tileSize);
      this.collisionGrid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(false));
      
      // Just mark buildings as collision areas
      this.markBuildingCollisions(gridHeight, gridWidth);
      console.log('Collision grid computed for simple world (buildings only).');
      return;
    }
    
    const height = this.terrainLayout.length;
    const width = this.terrainLayout[0].length;
    this.collisionGrid = Array.from({ length: height }, () => Array(width).fill(false));

    // 1. Mark terrain collisions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (TilemapUtils.hasCollision(this.terrainLayout[y][x])) {
          this.collisionGrid[y][x] = true;
        }
      }
    }

    // 2. Mark building collisions
    this.markBuildingCollisions(height, width);
    
    console.log('Collision grid computed for optimized performance.');
  }

  private isPositionSolid(worldX: number, worldY: number): boolean {
    if (this.collisionGrid.length === 0) {
      // Fallback to old collision detection if grid not computed
      return this.checkTileCollision(worldX, worldY);
    }

    const tileCoords = TilemapUtils.worldToTile(worldX, worldY, this.tileSize);
    if (tileCoords.y < 0 || tileCoords.y >= this.collisionGrid.length || 
        tileCoords.x < 0 || tileCoords.x >= this.collisionGrid[0].length) {
      return true; // Out of bounds is solid
    }

    return this.collisionGrid[tileCoords.y][tileCoords.x];
  }

  private checkPlayerCollisionOptimized(centerX: number, centerY: number): boolean {
    // Use CollisionManager if available
    if (this.collisionManager) {
      const playerSize = 16;
      const corners = [
        { x: centerX - playerSize, y: centerY - playerSize },
        { x: centerX + playerSize, y: centerY - playerSize },
        { x: centerX - playerSize, y: centerY + playerSize },
        { x: centerX + playerSize, y: centerY + playerSize }
      ];
      
      for (const corner of corners) {
        if (this.collisionManager.isPositionSolid(corner.x, corner.y)) {
          return true;
        }
      }
      return false;
    } else {
      // Fallback to internal implementation
      const playerSize = 16;
      const corners = [
        { x: centerX - playerSize, y: centerY - playerSize },
        { x: centerX + playerSize, y: centerY - playerSize },
        { x: centerX - playerSize, y: centerY + playerSize },
        { x: centerX + playerSize, y: centerY + playerSize }
      ];
      
      for (const corner of corners) {
        if (this.isPositionSolid(corner.x, corner.y)) {
          return true;
        }
      }
      return false;
    }
  }

  sendChatMessage(message: string) {
    console.log('Sending chat message:', message);
    
    // Use NetworkManager if available
    if (this.networkManager && message.trim()) {
      try {
        this.networkManager.send('chat', { text: message });
        console.log('Chat message sent successfully');
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    } else if (this.room && message.trim()) {
      // Fallback to old implementation
      try {
        this.room.send('chat', { text: message });
        console.log('Chat message sent successfully');
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    } else {
      console.log('Cannot send chat - no connection or empty message');
    }
  }

  destroy() {
    // Use NetworkManager if available
    if (this.networkManager) {
      this.networkManager.leave();
    } else if (this.room) {
      this.room.leave();
    }
    this.scene.stop();
  }

  // Crop system methods for external access
  getCropSystem(): CropSystem | null {
    return this.cropSystem || null;
  }

  canPlantAt(x: number, y: number): boolean {
    return this.cropSystem ? this.cropSystem.canPlantAt(x, y) : false;
  }

  getCropAt(x: number, y: number): { id: string; type: CropType; stage: string } | null {
    if (!this.cropSystem) return null;
    const crop = this.cropSystem.getCropAtPosition(x, y);
    return crop ? { id: crop.id, type: crop.type, stage: crop.stage } : null;
  }

  plantCrop(cropType: CropType, x: number, y: number): void {
    if (this.cropSystem) {
      this.cropSystem.plantCrop(x, y, cropType);
    }
  }

  removeCropAtPosition(x: number, y: number): void {
    if (!this.cropSystem) return;
    const crop = this.cropSystem.getCropAtPosition(x, y);
    if (crop) {
      this.cropSystem.removeCrop(crop.id);
    }
  }

  harvestCropAtPosition(x: number, y: number): void {
    if (!this.cropSystem) return;
    const crop = this.cropSystem.getCropAtPosition(x, y);
    if (crop) {
      this.cropSystem.harvestCrop(crop.id);
    }
  }

  getTotalCrops(): number {
    return this.cropSystem ? this.cropSystem.getAllCrops().length : 0;
  }

  getReadyCrops(): number {
    if (!this.cropSystem) return 0;
    return this.cropSystem.getAllCrops().filter(crop => crop.stage === 'ready').length;
  }

  getGrowingCrops(): number {
    if (!this.cropSystem) return 0;
    return this.cropSystem.getAllCrops().filter(crop => crop.stage !== 'ready').length;
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
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);
  const [showMorphoModal, setShowMorphoModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showFlowStakingModal, setShowFlowStakingModal] = useState(false);
  const [showFlowSwapModal, setShowFlowSwapModal] = useState(false);
  const [showPepeModal, setShowPepeModal] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);
  const [dialogueContent, setDialogueContent] = useState('');
  const [dialogueCharacterName, setDialogueCharacterName] = useState('Guide');
  const [onDialogueContinue, setOnDialogueContinue] = useState<() => void>(() => {});
  
  // Get user authentication info
  const { user } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    // Calculate dimensions based on viewport minus bottom bar
    const BAR_HEIGHT = 64; // Must match CSS --bar-height
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight - BAR_HEIGHT;
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: gameWidth,
      height: gameHeight,
      parent: 'game-container',
      backgroundColor: '#87CEEB',
      scene: MainScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false // Set to true to see bounding boxes
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
      },
      render: {
        pixelArt: false,
        antialias: true,
        transparent: false,
        clearBeforeRender: true,
        preserveDrawingBuffer: false
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Pass chat callback to scene - wait for scene to be ready
    setTimeout(() => {
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        sceneRef.current = scene;
        
        // Configure world settings and auth info
        scene.setWorldConfiguration(worldId, isOwnWorld);
        scene.setAuthInfo(address, user);
        
        // Set chain ID for network-specific buildings
        if (chainId) {
          scene.setChainId(chainId);
        }
        
        scene.init({
          chatCallback: (message: ChatMessage) => {
            setChatMessages(prev => [...prev, message]);
          }
        });

        // Set up crop click event listener
        scene.events.on('cropClicked', (crop: CropData) => {
          setSelectedCrop(crop);
        });
        
        // Set up Katana building interaction listeners
        scene.events.on('bankInteraction', () => {
          console.log('🏦 Opening Morpho deposit modal via dialogue');
          setDialogueCharacterName('Katana Cat');
          setDialogueContent('Welcome to the Katana Morpho Bank. Here you can deposit assets to earn yield. Would you like to proceed?');
          setOnDialogueContinue(() => () => setShowMorphoModal(true));
          setIsDialogueOpen(true);
        });
        
        scene.events.on('marketplaceInteraction', () => {
          console.log('🏪 Opening marketplace modal via dialogue');
          setDialogueCharacterName('Shopkeeper');
          setDialogueContent('Welcome to the Katana Marketplace. You can swap tokens here using SushiSwap. Would you like to enter?');
          setOnDialogueContinue(() => () => setShowMarketplaceModal(true));
          setIsDialogueOpen(true);
        });
        
        // Set up Flow building interaction listeners
        scene.events.on('flowBankInteraction', () => {
          console.log('🟠 Opening Flow staking modal via dialogue');
          setDialogueCharacterName('Flow Banker');
          setDialogueContent('This is the Flow Bank. You can stake FVIX tokens here to earn yield. Shall we go inside?');
          setOnDialogueContinue(() => () => setShowFlowStakingModal(true));
          setIsDialogueOpen(true);
        });
        
        scene.events.on('flowMarketplaceInteraction', () => {
          console.log('🟣 Opening Flow swap modal via dialogue');
          setDialogueCharacterName('Flow Merchant');
          setDialogueContent('Welcome to the Flow DeFi Hub. Here you can swap FLOW for other tokens needed for staking. Ready to trade?');
          setOnDialogueContinue(() => () => setShowFlowSwapModal(true));
          setIsDialogueOpen(true);
        });

        scene.events.on('pepeInteraction', () => {
          console.log('🐸 Pepe interaction triggered!');
          setDialogueCharacterName('Pepe');
          setDialogueContent("Feels good, man... Welcome to my pump launchpad. Want to create your own meme coin?");
          setOnDialogueContinue(() => () => setShowPepeModal(true));
          setIsDialogueOpen(true);
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

  const handleDialogueContinue = () => {
    setIsDialogueOpen(false);
    onDialogueContinue();
  };

  // Monitor chain changes and update buildings
  useEffect(() => {
    if (sceneRef.current && chainId) {
      console.log(`🌐 Chain changed to: ${chainId}`);
      sceneRef.current.setChainId(chainId);
    }
  }, [chainId]);

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

  // Crop system handlers
  const handlePlantCrop = (cropType: CropType, x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.plantCrop(cropType, x, y);
    }
  };

  const handleRemoveCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.removeCropAtPosition(x, y);
    }
  };

  const handleHarvestCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.harvestCropAtPosition(x, y);
    }
  };

  const canPlantAt = (x: number, y: number): boolean => {
    return sceneRef.current ? sceneRef.current.canPlantAt(x, y) : false;
  };

  const getCropAt = (x: number, y: number) => {
    return sceneRef.current ? sceneRef.current.getCropAt(x, y) : null;
  };

  const getTotalCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getTotalCrops() : 0;
  };

  const getReadyCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getReadyCrops() : 0;
  };

  const getGrowingCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getGrowingCrops() : 0;
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
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <ConnectWalletButton />
        <NetworkSelector />
      </div>

      <DialogueBox
        isOpen={isDialogueOpen}
        content={dialogueContent}
        onClose={() => setIsDialogueOpen(false)}
        onContinue={handleDialogueContinue}
        characterName={dialogueCharacterName}
      />
      
      <CropContextMenu
        onPlantCrop={handlePlantCrop}
        onRemoveCrop={handleRemoveCrop}
        onHarvestCrop={handleHarvestCrop}
        canPlantAt={canPlantAt}
        getCropAt={getCropAt}
      >
        <div id="game-container" />
      </CropContextMenu>
      
      {/* UI Stack with all left-side UI elements */}
      <UIStack
        getTotalCrops={getTotalCrops}
        getReadyCrops={getReadyCrops}
        getGrowingCrops={getGrowingCrops}
        chatContainer={chatContainer}
      />

      {/* Crop Info Panel */}
      <CropInfo 
        crop={selectedCrop} 
        onClose={() => setSelectedCrop(null)} 
      />

      {/* Morpho Deposit Modal */}
      <MorphoDepositModal
        isOpen={showMorphoModal}
        onClose={() => setShowMorphoModal(false)}
      />

      {/* Marketplace Modal */}
      <MarketplaceModal
        isOpen={showMarketplaceModal}
        onClose={() => setShowMarketplaceModal(false)}
      />

      {/* Flow Staking Modal */}
      <FlowStakingModal
        isOpen={showFlowStakingModal}
        onClose={() => setShowFlowStakingModal(false)}
      />

      {/* Flow Swap Modal */}
      <FlowSwapModal
        isOpen={showFlowSwapModal}
        onClose={() => setShowFlowSwapModal(false)}
      />

      <PepeModal
        isOpen={showPepeModal}
        onClose={() => setShowPepeModal(false)}
      />

      <style jsx>{`
        .game-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .top-right-ui {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 2px solid #333;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
          background: linear-gradient(135deg, #9932cc, #ff6b35);
        }

        .modal-header h2 {
          margin: 0;
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .modal-header button {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .modal-header button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 20px;
          color: #e0e0e0;
        }

        .modal-body p {
          margin: 0 0 15px 0;
          line-height: 1.6;
        }

        .modal-body ul {
          margin: 15px 0 0 20px;
          padding: 0;
        }

        .modal-body li {
          margin: 8px 0;
          color: #b0b0b0;
        }
      `}</style>
    </div>
  );
}

export default Game;