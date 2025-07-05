'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { Player, PlayerInfo } from '../lib/Player';
import { CharacterConfig, CharacterType, CharacterDefinitions } from '../lib/character.config';
import { TilesetConfig, TilemapUtils } from '../lib/tilemap.config';
import { TilemapEditor } from '../lib/tilemap.editor';
import { CropSystem, CropType, CropData } from '../lib/CropSystem';
import { CropContextMenu } from './CropContextMenu';
import { CropInfo } from './CropInfo';
import { CropStats } from './CropStats';

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
  private sessionId!: string;
  private chatCallback?: (message: ChatMessage) => void;
  private lastDirection: string = 'down';
  private cliffTiles: Phaser.GameObjects.Image[] = [];
  private terrainLayout: string[][] = [];
  private debugMode: boolean = false;
  private cropSystem!: CropSystem;
  
  // Camera system properties
  private worldWidth: number = 1600; // Will be updated based on map size
  private worldHeight: number = 1200; // Will be updated based on map size
  private cameraLerpFactor: number = 0.1; // Smooth camera following
  
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
    
    // Load the legacy character sprite sheet for backward compatibility
    this.load.spritesheet(CharacterConfig.player.key, CharacterConfig.player.path, {
      frameWidth: CharacterConfig.player.frameWidth,
      frameHeight: CharacterConfig.player.frameHeight
    });
    
    // Load all character animation sheets dynamically from CharacterDefinitions
    Object.entries(CharacterDefinitions).forEach(([characterName, character]) => {
      if (character.type === 'animation_sheets' && character.animationConfig) {
        Object.entries(character.animationConfig.animations).forEach(([animName, animation]) => {
          this.load.spritesheet(animation.key, animation.path, {
            frameWidth: character.frameWidth,
            frameHeight: character.frameHeight
          });
        });
      }
    });
    
    // Load the tileset for world decoration
    this.load.image('cliffs_grass_tileset', '/tilesets/LPC_cliffs_grass.png');
    
    // Initialize and preload crop system
    this.cropSystem = new CropSystem(this);
    this.cropSystem.preload();
  }

  async create() {
    // Log all loaded textures for debugging
    
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

    // Initialize crop system
    this.cropSystem.create();

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };

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
    
    return false;
  }
  
  // Legacy method for backward compatibility
  checkCliffCollision(x: number, y: number): boolean {
    return this.checkPlayerCollision(x, y);
  }

  createUI() {
    // Create minimal UI with only essential elements
    const uiContainer = this.add.container(0, 0);
    
    // Simple controls info at bottom
    const controlsBg = this.add.rectangle(120, 580, 220, 30, 0x000000, 0.6);
    controlsBg.setStrokeStyle(1, 0x90EE90, 0.3);
    controlsBg.setScrollFactor(0); // Pin to camera
    
    const controls = this.add.text(120, 580, '🎮 WASD: Move  💬 Enter: Chat', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif'
    });
    controls.setOrigin(0.5);
    controls.setScrollFactor(0); // Pin to camera
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
      
      try {
        this.client = new Client(endpoint);
        this.room = await this.client.joinOrCreate<GameState>('game', {
          name: `Player${Math.floor(Math.random() * 1000)}`
        });
      } catch (connectionError) {
        console.log('Primary connection failed, trying localhost fallback...');
        // Fallback to localhost if the detected hostname fails
        if (serverHost !== 'localhost') {
          const fallbackEndpoint = `ws://localhost:${port}`;
          console.log('Fallback connecting to:', fallbackEndpoint);
          this.client = new Client(fallbackEndpoint);
          this.room = await this.client.joinOrCreate<GameState>('game', {
            name: `Player${Math.floor(Math.random() * 1000)}`
          });
        } else {
          throw connectionError;
        }
      }

      this.sessionId = this.room.sessionId;

      // Listen for state changes
      this.room.onStateChange((state) => {
        console.log('State changed, players:', state.players);
        
        // Make sure scene is initialized before handling players
        if (!this.scene.isActive()) {
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
        console.log('🎯 Current player spawned at center:', player.x, player.y);
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
      console.log(`🧭 Updated player direction: ${direction}`);
    } catch (error) {
      console.error('Error updating player direction:', error);
    }
  }

  update() {
    if (!this.room || !this.currentPlayer) return;

    // Update crop system
    if (this.cropSystem) {
      this.cropSystem.update();
    }

    // Check if chat is active by looking for active input elements
    const chatActive = document.querySelector('.chat-input:focus') !== null;
    
    // Don't process movement if chat is active
    if (chatActive) return;

    const speed = 3;
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

    // Send movement to server
    if (moved) {
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

function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const sceneRef = useRef<MainScene | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1600,
      height: 900,
      parent: 'game-container',
      backgroundColor: '#87CEEB',
      scene: MainScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false // Set to true to see bounding boxes
        }
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Pass chat callback to scene - wait for scene to be ready
    setTimeout(() => {
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        sceneRef.current = scene;
        scene.init({
          chatCallback: (message: ChatMessage) => {
            setChatMessages(prev => [...prev, message]);
          }
        });

        // Set up crop click event listener
        scene.events.on('cropClicked', (crop: CropData) => {
          setSelectedCrop(crop);
        });
      }
    }, 500);

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

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
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

  return (
    <div className="game-wrapper">
      <CropContextMenu
        onPlantCrop={handlePlantCrop}
        onRemoveCrop={handleRemoveCrop}
        onHarvestCrop={handleHarvestCrop}
        canPlantAt={canPlantAt}
        getCropAt={getCropAt}
      >
        <div id="game-container" />
      </CropContextMenu>
      
      {/* Chat UI */}
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

      {/* Crop Info Panel */}
      <CropInfo 
        crop={selectedCrop} 
        onClose={() => setSelectedCrop(null)} 
      />

      {/* Crop Statistics Panel */}
      <CropStats 
        getTotalCrops={getTotalCrops}
        getReadyCrops={getReadyCrops}
        getGrowingCrops={getGrowingCrops}
      />

      <style jsx>{`
        .game-wrapper {
          position: relative;
          display: inline-block;
          width: 800px;
          height: 600px;
          background: transparent;
        }

        #game-container {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        .chat-container {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 300px;
          max-height: 200px;
          pointer-events: none;
          z-index: 10;
        }

        .chat-messages {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
          border: none;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.95);
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(135, 206, 235, 0.3);
        }

        .chat-input:focus {
          outline: none;
          background: white;
          border-color: #87CEEB;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(135, 206, 235, 0.2);
        }
      `}</style>
    </div>
  );
}

export default Game;