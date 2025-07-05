'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { Player, PlayerInfo } from '../lib/Player';
import { CharacterConfig, CharacterType } from '../lib/character.config';
import { TilesetConfig, TilemapUtils } from '../lib/tilemap.config';
import { TilemapEditor } from '../lib/tilemap.editor';

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
  private lastDirection: string = 'down'; // Track player direction for sprite animation
  private cliffTiles: Phaser.GameObjects.Image[] = []; // Store cliff tiles for collision detection
  private terrainLayout: string[][] = []; // Store terrain layout for collision detection
  private debugMode: boolean = false; // Toggle for debug visualization

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { chatCallback?: (message: ChatMessage) => void }) {
    this.chatCallback = data.chatCallback;
  }

  preload() {
    // Load the character sprite sheet
    this.load.spritesheet(CharacterConfig.player.key, CharacterConfig.player.path, {
      frameWidth: CharacterConfig.player.frameWidth,
      frameHeight: CharacterConfig.player.frameHeight
    });
    
    // Load the tileset for world decoration
    this.load.image('cliffs_grass_tileset', '/tilesets/LPC_cliffs_grass.png');
  }

  async create() {
    // Create a beautiful farming world background
    this.createFarmingWorld();
    
    // Add elegant UI overlay
    this.createUI();

    // Create animations for different characters
    this.createCharacterAnimations();

    // Setup development tools
    this.setupDevTools();

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };

    // Connect to Colyseus after scene is fully ready
    this.time.delayedCall(100, () => {
      this.connectToServer();
    });
  }

  createCharacterAnimations() {
    // Character sprite sheet is now loaded directly as a spritesheet
    console.log('Character sprite sheet loaded with transparent background');
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
    console.log(`🔄 Reset character selection for player ${playerAddress}`);
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
      
      console.log('🛠️ Dev tools available:');
      console.log('  - resetMyCharacter(): Reset character selection');
      console.log('  - toggleDebugMode(): Show/hide terrain debug overlay');
      console.log('  - printTerrainLayout(): Print terrain layout to console');
      console.log('  - editTile(x, y, tileType): Edit a single tile');
      console.log('  - createIsland(x, y, radius): Create cliff island');
      console.log('  - validateTerrain(): Check terrain for issues');
      console.log('  - exportTerrain(): Export terrain to JSON');
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
    
    this.createTilesFromLayout(tileSize, mapWidth, mapHeight);
    this.addTerrainDecorations(tileSize, mapWidth, mapHeight);
    
    // Update debug overlay if active
    if (this.debugMode) {
      this.renderDebugOverlay();
    }
    
    console.log('🔄 Terrain refreshed successfully');
  }

  createFarmingWorld() {
    // Create clean, minimal background
    const sky = this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
    
    // Create tilemap-based terrain (replaces the simple ground rectangle)
    this.createTilemapTerrain();
    
    // Add minimal visual structure without clutter
    this.createMinimalStructure();
  }

  createMinimalStructure() {
    // Create a simple grid pattern for visual structure without clutter
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x90EE90, 0.2);
    
    // Add subtle grid lines for spatial reference
    for (let i = 0; i < 800; i += 100) {
      gridGraphics.moveTo(i, 0);
      gridGraphics.lineTo(i, 600);
    }
    for (let j = 0; j < 600; j += 100) {
      gridGraphics.moveTo(0, j);
      gridGraphics.lineTo(800, j);
    }
    gridGraphics.strokePath();
  }

  createTilemapTerrain() {
    // Create a tilemap with natural terrain using the LPC cliffs grass tileset
    const tileSize = TilesetConfig.image.tileSize;
    const mapWidth = Math.ceil(800 / tileSize); // 25 tiles
    const mapHeight = Math.ceil(600 / tileSize); // 19 tiles
    
    // Generate natural terrain layout
    this.terrainLayout = TilemapUtils.generateTerrainLayout(mapWidth, mapHeight);
    
    // Create tiles based on the terrain layout
    this.createTilesFromLayout(tileSize, mapWidth, mapHeight);
    
    // Add decorative elements
    this.addTerrainDecorations(tileSize, mapWidth, mapHeight);
  }

  createTilesFromLayout(tileSize: number, mapWidth: number, mapHeight: number) {
    // Create tiles based on the generated terrain layout
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileType = this.terrainLayout[y][x];
        const tileConfig = TilesetConfig.tiles[tileType];
        
        if (tileConfig) {
          const worldPos = TilemapUtils.tileToWorld(x, y, tileSize);
          
          const tile = this.add.image(worldPos.x, worldPos.y, 'cliffs_grass_tileset');
          tile.setOrigin(0.5, 0.5);
          tile.setDisplaySize(tileSize, tileSize);
          
          // Apply tile-specific styling
          this.applyTileStyle(tile, tileType);
          
          // Store collision tiles
          if (tileConfig.collision) {
            this.cliffTiles.push(tile);
          }
          
          // Add tile data for debugging
          tile.setData('tileType', tileType);
          tile.setData('tilePos', { x, y });
        }
      }
    }
  }

  applyTileStyle(tile: Phaser.GameObjects.Image, tileType: string) {
    // Apply visual styling based on tile type
    switch (tileType) {
      case 'cliff_top':
        tile.setTint(0x8B4513); // Brown for cliff tops
        tile.setAlpha(0.8);
        break;
      case 'cliff_face':
        tile.setTint(0x654321); // Darker brown for cliff faces
        tile.setAlpha(0.9);
        break;
      case 'cliff_corner':
        tile.setTint(0x5D4037); // Corner cliff coloring
        tile.setAlpha(0.85);
        break;
      case 'cliff_large':
        tile.setTint(0x8B4513); // Brown for large cliff formations
        tile.setAlpha(0.7);
        break;
      case 'grass_full':
        tile.setTint(0x90EE90); // Green for grass
        tile.setAlpha(0.3);
        break;
      case 'grass_sparse':
        tile.setTint(0x228B22); // Darker green for sparse grass
        tile.setAlpha(0.4);
        break;
      case 'cliff_grass_transition':
      case 'grass_cliff_transition':
        tile.setTint(0x6B8E23); // Olive green for transitions
        tile.setAlpha(0.5);
        // Add gentle animation to transition tiles
        this.tweens.add({
          targets: tile,
          alpha: 0.3,
          duration: 3000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
      default:
        tile.setTint(0xFFFFFF); // Default white tint
        tile.setAlpha(0.5);
    }
  }

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


  // Enhanced collision detection using terrain layout
  checkCliffCollision(x: number, y: number): boolean {
    const playerRadius = 16; // Approximate player collision radius
    const tileSize = TilesetConfig.image.tileSize;
    
    // Convert world coordinates to tile coordinates
    const tilePos = TilemapUtils.worldToTile(x, y, tileSize);
    
    // Check collision in a 3x3 area around the player
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = tilePos.x + dx;
        const checkY = tilePos.y + dy;
        
        // Check bounds
        if (checkX >= 0 && checkX < this.terrainLayout[0].length && 
            checkY >= 0 && checkY < this.terrainLayout.length) {
          
          const tileType = this.terrainLayout[checkY][checkX];
          
          // Check if tile has collision
          if (TilemapUtils.hasCollision(tileType)) {
            const tileWorldPos = TilemapUtils.tileToWorld(checkX, checkY, tileSize);
            const tileRadius = tileSize / 2;
            
            // Calculate distance between player and tile center
            const distance = Math.sqrt(
              Math.pow(x - tileWorldPos.x, 2) + Math.pow(y - tileWorldPos.y, 2)
            );
            
            // Check if player would collide with tile
            if (distance < (playerRadius + tileRadius)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  createUI() {
    // Create minimal UI with only essential elements
    const uiContainer = this.add.container(0, 0);
    
    // Simple controls info at bottom
    const controlsBg = this.add.rectangle(120, 580, 220, 30, 0x000000, 0.6);
    controlsBg.setStrokeStyle(1, 0x90EE90, 0.3);
    
    const controls = this.add.text(120, 580, '🎮 WASD: Move  💬 Enter: Chat', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif'
    });
    controls.setOrigin(0.5);
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
      
      // Determine character type - check global selection first, then fall back to player-specific
      let characterType: CharacterType;
      
      if (isCurrentPlayer) {
        // For current player, check global settings first
        const globalCharacterSelection = MainScene.safeLocalStorage.getItem('character-selection') as CharacterType;
        
        if (globalCharacterSelection && CharacterConfig.player.characters[globalCharacterSelection] !== undefined) {
          characterType = globalCharacterSelection;
          console.log(`🎭 Current player using global character selection: ${characterType}`);
        } else {
          // Fall back to player-specific or generate new
          const playerAddress = player.address || sessionId;
          const storageKey = `defi-valley-character-${playerAddress}`;
          const savedCharacter = MainScene.safeLocalStorage.getItem(storageKey);
          
          if (savedCharacter) {
            characterType = savedCharacter as CharacterType;
            console.log(`🎭 Current player using saved character ${characterType}`);
          } else {
            // First time - generate a character based on address and save it
            const characterTypes = Object.keys(CharacterConfig.player.characters) as CharacterType[];
            const characterIndex = Math.abs(playerAddress.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % characterTypes.length;
            characterType = characterTypes[characterIndex];
            MainScene.safeLocalStorage.setItem(storageKey, characterType);
            console.log(`🎭 Current player assigned new character ${characterType}`);
          }
        }
      } else {
        // For other players, use player-specific storage
        const playerAddress = player.address || sessionId;
        const storageKey = `defi-valley-character-${playerAddress}`;
        const savedCharacter = MainScene.safeLocalStorage.getItem(storageKey);
        
        if (savedCharacter) {
          characterType = savedCharacter as CharacterType;
          console.log(`🎭 Player ${player.name} using saved character ${characterType}`);
        } else {
          // Generate a character based on address and save it
          const characterTypes = Object.keys(CharacterConfig.player.characters) as CharacterType[];
          const characterIndex = Math.abs(playerAddress.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % characterTypes.length;
          characterType = characterTypes[characterIndex];
          MainScene.safeLocalStorage.setItem(storageKey, characterType);
          console.log(`🎭 Player ${player.name} assigned new character ${characterType}`);
        }
      }
      
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
      // Check collision before moving
      if (!this.checkCliffCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        this.lastDirection = 'left';
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      const potentialX = Math.min(780, newX + speed);
      // Check collision before moving
      if (!this.checkCliffCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        this.lastDirection = 'right';
      }
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      const potentialY = Math.max(20, newY - speed);
      // Check collision before moving
      if (!this.checkCliffCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        this.lastDirection = 'up';
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      const potentialY = Math.min(580, newY + speed);
      // Check collision before moving
      if (!this.checkCliffCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        this.lastDirection = 'down';
      }
    }
    
    // Update sprite direction if moved
    if (moved && this.currentPlayer) {
      this.updatePlayerDirection(this.currentPlayer, this.lastDirection);
    }

    // Send movement to server
    if (moved) {
      this.room.send('move', { x: newX, y: newY });
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

function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const sceneRef = useRef<MainScene | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      backgroundColor: '#87CEEB',
      scene: MainScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 }
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

  return (
    <div className="game-wrapper">
      <div id="game-container" />
      
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