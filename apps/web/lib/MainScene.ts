import * as Phaser from 'phaser';
import { Player, PlayerInfo } from './Player';
import { CharacterType, CharacterDefinitions } from './character.config';
import { TilesetConfig, TilemapUtils } from './tilemap.config';
import { TilemapEditor } from './tilemap.editor';
import { CropSystem, CropType, CropData } from './CropSystem';
import { GameConfig } from './GameConfig';
import { BankBuilding } from './BankBuilding';
import { MarketplaceBuilding } from './MarketplaceBuilding';
import { FlowBankBuilding } from './FlowBankBuilding';
import { FlowMarketplaceBuilding } from './FlowMarketplaceBuilding';
import { PepeBuilding } from './PepeBuilding';
import { BuildingInteractionManager } from './BuildingInteractionManager';
import { CollisionSystem } from './systems/CollisionSystem';
import { CameraSystem } from './systems/CameraSystem';
import { eventBus } from './systems/EventBus';
import { katanaChain } from '../app/wagmi';
import { flowMainnet } from '../app/lib/networks';
import { EventBus, GameEvents } from '../game/EventBus';
import { InteractiveFarmPlot } from './InteractiveFarmPlot';
import { BuildingLayoutManager } from './BuildingLayoutManager';
import { GamePersistence } from './GamePersistence';

// Network types removed

export class MainScene extends Phaser.Scene {
  private collisionSystem!: CollisionSystem;
  private cameraSystem!: CameraSystem;
  private currentPlayer!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private oKey!: Phaser.Input.Keyboard.Key;
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
  public buildingInteractionManager!: BuildingInteractionManager;
  private worldId?: string;
  private isOwnWorld?: boolean;
  private address?: string;
  private user?: any;
  private currentChainId?: number;
  public isGuestMode: boolean = false;
  
  // Editor properties
  private isEditorMode: boolean = false;
  private editorMode: 'info' | 'move' = 'info';
  private selectedEditorObject: any = null;
  private editorOverlay?: Phaser.GameObjects.Graphics;
  private backtickKey!: Phaser.Input.Keyboard.Key;
  private editorModeText?: Phaser.GameObjects.Text;
  private moveTargetGraphics?: Phaser.GameObjects.Graphics;
  
  // Camera system properties
  private worldWidth: number = GameConfig.world.width;
  private worldHeight: number = GameConfig.world.height;
  private cameraLerpFactor: number = GameConfig.camera.lerpFactor;
  
  // Simple background approach with invisible walls
  private invisibleWalls!: Phaser.Physics.Arcade.StaticGroup;
  
  // Legacy tilemap properties (kept for backward compatibility)
  private mapLayout: string[][] = [];
  private collisionMap: boolean[][] = [];
  
  // Performance optimization properties
  private lastBuildingCheck: number = 0;
  private lastCropUpdate: number = 0;
  private lastGrowthCheck: number = 0;
  
  // Tile size
  private tileSize: number = 32;
  
  // Depth sorting group for 2.5D rendering
  private depthGroup!: Phaser.GameObjects.Group;
  
  // Queued crop for planting
  
  // Farm plot management
  private farmPlots: InteractiveFarmPlot[] = [];
  private layoutManager!: BuildingLayoutManager;

  // Interaction prompt management
  private interactionPrompt?: Phaser.GameObjects.Text;
  private nearbyInteractables: Map<string, { distance: number; message: string }> = new Map();

  // Game state for persistence
  private playerGold: number = 100; // Starting gold
  private playerLevel: number = 1;
  private playerExperience: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }
  

  init(data: {}) {
  }

  private emitGameError(message: string, error?: Error) {
    console.error(`[MainScene Error] ${message}`, error);
    
    // Emit custom event for ErrorModal
    window.dispatchEvent(new CustomEvent('game:error', {
      detail: { message, error }
    }));
  }

  preload() {
    // Track loading progress
    this.load.on('progress', (value: number) => {
      // Emit progress event
      window.dispatchEvent(new CustomEvent('game:loadProgress', {
        detail: { progress: Math.round(value * 100) }
      }));
    });
    
    this.load.on('complete', () => {
      window.dispatchEvent(new CustomEvent('game:loadComplete'));
    });
    
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
    
    // Load crop spritesheet directly in MainScene to ensure it's available
    this.load.spritesheet('crops', '/sprites/crops-v2/crops.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // Initialize and preload crop system
    this.cropSystem = new CropSystem(this);
    this.cropSystem.preload();
  }

  async create() {
    try {
      // Initialize layout manager
      this.layoutManager = new BuildingLayoutManager(this.worldWidth, this.worldHeight);
      
      // Initialize building interaction manager FIRST (before creating any buildings)
      this.buildingInteractionManager = new BuildingInteractionManager(this);
      
      // Initialize collision system
      this.collisionSystem = new CollisionSystem(this, this.worldWidth, this.worldHeight, this.tileSize);
      
      // Initialize camera system
      this.cameraSystem = new CameraSystem(this, {
        worldWidth: this.worldWidth,
        worldHeight: this.worldHeight,
        lerpFactor: GameConfig.camera.lerpFactor,
        debugMode: false
      });
      
      // Prevent browser context menu on right-click
      this.input.mouse?.disableContextMenu();
    
    // EventBus listeners removed - portfolio visualizer is read-only
    
    // Subscribe to camera events
    this.cameraSystem.on('viewport-update', (viewport: any) => {
      eventBus.emit('camera:moved', { x: viewport.x, y: viewport.y, zoom: this.cameraSystem.getCamera().zoom });
    });
    
    // Set physics world bounds to match our expanded world
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Initialize depth sorting group for 2.5D rendering
    this.depthGroup = this.add.group();
    
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

    // Create network-specific buildings (will be created based on chain ID)
    this.createNetworkSpecificBuildings();
    
    // Initialize collision system with references to other systems
    this.collisionSystem.initialize(this.buildingInteractionManager, this.cropSystem, this.terrainLayout);

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    this.oKey = this.input.keyboard!.addKey('O');
    this.backtickKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);

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
      
      // Clean up building interaction manager
      if (this.buildingInteractionManager) {
        this.buildingInteractionManager.destroy();
      }
    });

    // Initialize network system
    this.setupNetworkEventHandlers();
    
    // Create guest player immediately for instant gameplay
    this.initializeGuestPlayer();
    
    // Set up editor mode click handling
    this.setupEditorClickHandling();
    } catch (error) {
      this.emitGameError('Failed to initialize game scene', error as Error);
    }
  }

  updateCameraFollow() {
    // Follow the current player smoothly
    if (this.currentPlayer) {
      this.cameras.main.startFollow(this.currentPlayer, true, this.cameraLerpFactor, this.cameraLerpFactor);
    }
  }

  private initializeGuestPlayer() {
    // Create a guest player if no authenticated player exists
    if (!this.currentPlayer) {
      this.isGuestMode = true;
      const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
      
      const guestInfo: PlayerInfo = {
        id: guestId,
        name: 'Guest Player',
        x: GameConfig.player.spawnPosition.x,
        y: GameConfig.player.spawnPosition.y,
        level: 1,
        character: 'cowboy' as CharacterType,
        direction: 'down',
        isCurrentPlayer: true
      };
      
      this.currentPlayer = new Player(this, guestInfo.x, guestInfo.y, guestInfo);
      
      // Add player to depth group for proper 2.5D sorting
      if (this.depthGroup) {
        this.depthGroup.add(this.currentPlayer);
      }
      
      this.updateCameraFollow();
      
      // Show welcome message for guest
      console.log('🎮 Welcome! Move with WASD. Connect wallet to save progress.');
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
      
      (window as any).clearAllCrops = () => {
        console.log('🧹 Clearing all crops from storage and game...');
        this.cropSystem.clearAllCrops();
        console.log('✅ All crops cleared! Refresh the page to see changes.');
      };
      
      (window as any).clearPotatoesNearBuildings = () => {
        console.log('🥔 Removing potatoes near buildings...');
        const buildingPositions = [
          { x: 800, y: 600 }, // Katana bank
          { x: 1400, y: 600 }, // Katana marketplace
          { x: 500, y: 800 }, // Flow bank
          { x: 1100, y: 800 }, // Flow marketplace
          { x: 800, y: 1400 }, // Pepe building
        ];
        
        let removedCount = 0;
        const crops = this.cropSystem.getAllCrops();
        
        crops.forEach(crop => {
          // Check if crop is too close to any building (within 200 pixels)
          const tooClose = buildingPositions.some(building => {
            const distance = Math.sqrt(
              Math.pow(crop.x - building.x, 2) + 
              Math.pow(crop.y - building.y, 2)
            );
            return distance < 200;
          });
          
          if (tooClose && crop.type === 'potato') {
            this.cropSystem.removeCrop(crop.id);
            removedCount++;
          }
        });
        
        console.log(`✅ Removed ${removedCount} potatoes near buildings!`);
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
      console.log('');
      console.log('🏪 BUILDING INTERACTIONS:');
      console.log('  - Press E near buildings to interact');
      console.log('  - Press ` (backtick) to toggle Editor Mode');
      console.log('  - In Editor Mode: Click to select, click again to move');
      console.log('  - testTileVisibility(): Test basic tile rendering');
      console.log('  📍 TELEPORTATION:');
      console.log('  - teleportToBuildings(): Teleport to the buildings area');
      console.log('  - showBuildingLocations(): Display all building coordinates');
      console.log('  👥 PLAYER VISIBILITY:');
      console.log('  - debugPlayerVisibility(): Show player viewport culling status');
      console.log('  📷 CAMERA CONTROLS:');
      console.log('  - toggleCameraDebug(): Toggle camera debug overlay');
      console.log('  - toggleCameraControls(): Toggle manual camera controls (WASD/Arrows)');
      console.log('  - cameraZoom(level): Set camera zoom level (0.5-2)');
      console.log('  - cameraPanTo(x, y): Pan camera to specific position');
      console.log('  - cameraShake(): Shake the camera effect');
      console.log('  - cameraFlash(): Flash the camera effect');
      console.log('  🎢 COLLISION DEBUGGING:');
      console.log('  - toggleCollisionDebug(): Toggle collision grid visualization');
      console.log('  - getCollisionStats(): Show collision system statistics');
      console.log('  💾 SAVE GAME MANAGEMENT:');
      console.log('  - clearSaveData(): Clear all saved game data');
      console.log('  - showSaveData(): Display current save data');
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
      // Movement sync removed
      
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
    
    (window as any).debugPlayerVisibility = () => {
      console.log('👥 Player Visibility Debug:');
      const camera = this.cameras.main;
      const viewBounds = camera.worldView;
      console.log(`Camera viewport: x=${viewBounds.x}, y=${viewBounds.y}, w=${viewBounds.width}, h=${viewBounds.height}`);
      
      let visibleCount = 0;
      let hiddenCount = 0;
      
      if (this.currentPlayer) {
        const playerInfo = this.currentPlayer.getPlayerInfo();
        console.log(`Player ${playerInfo.name} (YOU): x=${playerInfo.x}, y=${playerInfo.y}, visible=${this.currentPlayer.visible}`);
        visibleCount = 1;
      }
      
      console.log(`\nSummary: ${visibleCount} visible player (single-player mode)`);
    };
    
    // Camera debug commands
    (window as any).toggleCameraDebug = () => {
      console.log('📷 Camera debug not available in this version');
    };
    
    (window as any).cameraZoom = (level: number) => {
      const clampedZoom = Math.max(0.5, Math.min(2, level));
      this.cameras.main.setZoom(clampedZoom);
      console.log(`📷 Camera zoom set to ${clampedZoom}`);
    };
    
    (window as any).cameraPanTo = (x: number, y: number) => {
      this.cameras.main.pan(x, y, 1000);
      console.log(`📷 Camera panning to (${x}, ${y})`);
    };
    
    (window as any).cameraShake = () => {
      this.cameras.main.shake(200, 0.01);
      console.log('📷 Camera shake effect triggered');
    };
    
    (window as any).cameraFlash = () => {
      if (this.cameraSystem) {
        this.cameraSystem.flash();
      }
    };
    
    // Collision debug commands
    (window as any).toggleCollisionDebug = () => {
      if (!this.collisionSystem) {
        console.log('❌ Collision system not initialized');
        return;
      }
      
      const debugGraphicsName = 'collision-debug-graphics';
      let debugGraphics = this.children.getByName(debugGraphicsName) as Phaser.GameObjects.Graphics;
      
      if (debugGraphics) {
        debugGraphics.destroy();
        console.log('🎢 Collision debug OFF');
      } else {
        debugGraphics = this.add.graphics();
        debugGraphics.setName(debugGraphicsName);
        debugGraphics.setDepth(9999);
        this.collisionSystem.renderDebug(debugGraphics);
        console.log('🎢 Collision debug ON');
      }
    };
    
    (window as any).getCollisionStats = () => {
      if (!this.collisionSystem) {
        console.log('❌ Collision system not initialized');
        return;
      }
      
      const stats = this.collisionSystem.getStats();
      console.log('🎢 Collision System Statistics:');
      console.log(`  Static collision cells: ${stats.static}`);
      console.log(`  Dynamic crops: ${stats.crops}`);
      console.log(`  Total collision objects: ${stats.total}`);
    };
    
    // Save game management commands
    (window as any).clearSaveData = () => {
      GamePersistence.clearSaveData();
      console.log('💾 Save data cleared! Refresh the page to start fresh.');
    };
    
    (window as any).showSaveData = () => {
      const saveData = GamePersistence.loadGameState();
      if (!saveData) {
        console.log('💾 No save data found');
        return;
      }
      
      console.log('💾 Current Save Data:');
      console.log(`  Last saved: ${new Date(saveData.lastSaved).toLocaleString()}`);
      console.log(`  Player gold: ${saveData.player.gold}`);
      console.log(`  Player level: ${saveData.player.level}`);
      console.log(`  Player XP: ${saveData.player.experience}`);
      console.log(`  Total plots: ${saveData.plots.length}`);
      
      const plantsCount = saveData.plots.filter(p => p.crop).length;
      console.log(`  Planted crops: ${plantsCount}`);
      
      if (plantsCount > 0) {
        console.log('\n  Crop details:');
        saveData.plots.forEach(plot => {
          if (plot.crop) {
            const stage = GamePersistence.calculateGrowthStage(plot.crop.plantedAt, plot.crop.type);
            console.log(`    - ${plot.crop.type} at (${plot.gridX},${plot.gridY}): ${stage}`);
          }
        });
      }
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
    
    // Create the 4x4 grid of plots for Milestone 1
    this.createPlotGrid();
    
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
    this.worldWidth = 3200;
    this.worldHeight = 2400;
    
    // Update physics world bounds to match the actual world size
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    
    // Create simple farm background using graphics
    this.createFarmBackgroundGraphics();
  }
  
  createFarmBackgroundGraphics() {
    // Create improved grass background using the texture
    const grassBackground = this.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, 'improved_grass');
    grassBackground.setOrigin(0, 0);
    grassBackground.setDepth(-10); // Behind everything
  }
  
  createPlotGrid() {
    // Clear existing plots
    this.farmPlots.forEach(plot => plot.destroy());
    this.farmPlots = [];
    
    // Use config for plot layout
    const config = GameConfig.farmPlots;
    
    // Create interactive farm plots
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const x = config.gridStartX + col * (config.plotSize + config.plotSpacing);
        const y = config.gridStartY + row * (config.plotSize + config.plotSpacing);
        
        const plot = new InteractiveFarmPlot(
          this,
          x + config.plotSize / 2,  // Center the plot
          y + config.plotSize / 2,
          col,
          row,
          config.plotSize
        );
        
        // Add to depth group for proper sorting
        this.depthGroup.add(plot);
        this.farmPlots.push(plot);
      }
    }
    
    // Add a decorative sign near the plots
    const signX = config.gridStartX - 50;
    const signY = config.gridStartY - 50;
    const sign = this.add.rectangle(signX, signY, 120, 40, 0xD2691E, 0.9);
    sign.setStrokeStyle(2, 0x8B4513);
    
    const signText = this.add.text(signX, signY, 'Interactive Farm', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    signText.setOrigin(0.5);
    
    // Setup plot event handlers
    this.setupPlotEventHandlers();
    
    // Load saved game state after plots are created
    this.loadGameState();
  }
  
  private setupPlotEventHandlers() {
    // Handle right-click context menu
    eventBus.on('plot:contextMenu', (data: any) => {
      console.log('Plot context menu requested:', data);
      // You can emit this to React UI to show a context menu
      EventBus.emit('show-plot-menu', data);
    });
    
    // Handle plot selection
    eventBus.on('plot:selected', (data: any) => {
      console.log('Plot selected:', data);
    });
    
    // Handle planting
    eventBus.on('plot:planted', (data: any) => {
      console.log('Crop planted:', data);
    });
    
    // Handle harvesting
    eventBus.on('plot:harvested', (data: any) => {
      console.log('Crop harvested:', data);
    });
    
    // Handle UI plant crop event from React
    eventBus.on('ui:plantCrop', (data: any) => {
      console.log('🌱 UI Plant crop request:', data);
      
      // Find the plot by ID
      const plot = this.farmPlots.find(p => p.getPlotState().id === data.plotId);
      if (!plot) {
        console.error('Plot not found:', data.plotId);
        return;
      }
      
      // Create crop data
      const cropData: CropData = {
        id: `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.cropType,
        x: plot.x,
        y: plot.y,
        plantedAt: Date.now(),
        stage: 'seed',
        health: 100
      };
      
      // Plant the crop in the plot
      plot.plantCrop(data.cropType, cropData);
      
      // Save game state after planting
      this.saveGameState();
      
      // Emit success event
      this.events.emit('cropPlanted', { cropType: data.cropType, plotId: data.plotId });
    });
    
    // Handle UI water crop event from React
    eventBus.on('ui:waterCrop', (data: any) => {
      console.log('💧 UI Water crop request:', data);
      
      // Find the plot by ID
      const plot = this.farmPlots.find(p => p.getPlotState().id === data.plotId);
      if (!plot) {
        console.error('Plot not found:', data.plotId);
        return;
      }
      
      // Water the crop
      plot.waterCrop();
    });
    
    // Handle UI harvest crop event from React
    eventBus.on('ui:harvestCrop', (data: any) => {
      console.log('🌾 UI Harvest crop request:', data);
      
      // Find the plot by ID
      const plot = this.farmPlots.find(p => p.getPlotState().id === data.plotId);
      if (!plot) {
        console.error('Plot not found:', data.plotId);
        return;
      }
      
      // Harvest the crop
      const harvestedCrop = plot.harvestCrop();
      if (harvestedCrop) {
        // Import economy config and get the gold reward
        import('./EconomyConfig').then(({ CropEconomyConfig }) => {
          const goldReward = CropEconomyConfig[harvestedCrop.type]?.harvestYield || 10;
          
          // Add gold to player
          this.playerGold += goldReward;
          
          // Emit harvest event with gold reward
          this.events.emit('cropHarvested', { 
            cropId: harvestedCrop.id, 
            goldReward: goldReward
          });
          
          // Emit gold update event for UI
          this.events.emit('goldUpdated', this.playerGold);
          
          // Save game state after harvesting
          this.saveGameState();
          
          console.log(`💰 Harvested ${harvestedCrop.type} for ${goldReward} gold! Total gold: ${this.playerGold}`);
        });
      }
    });
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



  createUI() {
    // Create minimal UI with only essential elements
    const uiContainer = this.add.container(0, 0);
  }

  setWorldConfiguration(worldId?: string, isOwnWorld?: boolean) {
    this.worldId = worldId;
    this.isOwnWorld = isOwnWorld;
  }
  

  setChainId(chainId: number) {
    const oldChainId = this.currentChainId;
    this.currentChainId = chainId;
    
    // If chain ID changed, recreate buildings
    if (oldChainId !== chainId) {
      this.createNetworkSpecificBuildings();
    }
  }

  syncPortfolio(data: { portfolioData: any; totalValueUsd: number }) {
    console.log('📊 MainScene: Syncing portfolio data', data);
    if (this.cropSystem) {
      this.cropSystem.syncPositions(data.portfolioData);
    }
  }

  createNetworkSpecificBuildings() {
    // Ensure BuildingInteractionManager exists before creating any buildings
    if (!this.buildingInteractionManager) {
      this.buildingInteractionManager = new BuildingInteractionManager(this);
    } else {
      // If it exists, destroy and recreate it
      this.buildingInteractionManager.destroy();
      this.buildingInteractionManager = new BuildingInteractionManager(this);
    }

    // Destroy existing buildings
    this.bankBuilding?.destroy();
    this.marketplaceBuilding?.destroy();
    this.flowBankBuilding?.destroy();
    this.flowMarketplaceBuilding?.destroy();
    this.pepeBuilding?.destroy(); // Also destroy the Pepe building

    // Clear references
    this.bankBuilding = undefined as any;
    this.marketplaceBuilding = undefined as any;
    this.flowBankBuilding = undefined;
    this.flowMarketplaceBuilding = undefined;
    this.pepeBuilding = undefined; // And clear its reference

    const isOnKatana = this.currentChainId === katanaChain.id;
    const isOnFlow = this.currentChainId === flowMainnet.id;

    console.log(`🌐 Creating buildings for network: ${this.currentChainId} (Katana: ${isOnKatana}, Flow: ${isOnFlow})`);

    if (isOnKatana) {
      // Create Katana buildings
      const katanaPos = GameConfig.buildings.katana;
      this.bankBuilding = new BankBuilding(this, katanaPos.bank.x, katanaPos.bank.y);
      this.marketplaceBuilding = new MarketplaceBuilding(this, katanaPos.marketplace.x, katanaPos.marketplace.y);
      
      // Add buildings to depth group for 2.5D sorting (with null check)
      if (this.depthGroup) {
        this.depthGroup.add(this.bankBuilding);
        this.depthGroup.add(this.marketplaceBuilding);
      }
      
      // Register with manager
      this.buildingInteractionManager.registerBuilding('bank', this.bankBuilding);
      this.buildingInteractionManager.registerBuilding('marketplace', this.marketplaceBuilding);
      
      console.log('🔶 Created Katana buildings');
    } else if (isOnFlow) {
      // Create Flow buildings
      const flowPos = GameConfig.buildings.flow;
      this.flowBankBuilding = new FlowBankBuilding(this, flowPos.bank.x, flowPos.bank.y);
      this.flowMarketplaceBuilding = new FlowMarketplaceBuilding(this, flowPos.marketplace.x, flowPos.marketplace.y);
      // Create Pepe building only on Flow network
      this.pepeBuilding = new PepeBuilding(this, flowPos.pepe.x, flowPos.pepe.y);
      
      // Add buildings to depth group for 2.5D sorting (with null check)
      if (this.depthGroup) {
        this.depthGroup.add(this.flowBankBuilding);
        this.depthGroup.add(this.flowMarketplaceBuilding);
        this.depthGroup.add(this.pepeBuilding);
      }
      
      // Register with manager
      this.buildingInteractionManager.registerBuilding('flowBank', this.flowBankBuilding);
      this.buildingInteractionManager.registerBuilding('flowMarketplace', this.flowMarketplaceBuilding);
      this.buildingInteractionManager.registerBuilding('pepe', this.pepeBuilding);
      
      console.log('🟣 Created Flow buildings');
    }

    // Set up event listeners for new buildings
    this.setupBuildingEventListeners();
    
    // Recompute collision grid when buildings change
    if (this.collisionSystem) {
      this.collisionSystem.computeCollisionGrid();
    }
  }

  setupBuildingEventListeners() {
    // Listeners are now managed by the React component's useEffect hook and should not be cleared here.
    // This function is called on every network switch, and removing listeners was preventing modals from opening.
  }

  setupNetworkEventHandlers() {
    // Network functionality removed
  }

  public initializePlayer(authData: { address: string; user?: any }) {
    try {
      // If we have a guest player, transition them to authenticated
      if (this.currentPlayer && this.isGuestMode) {
        // Preserve current position and state
        const currentPos = {
          x: this.currentPlayer.x,
          y: this.currentPlayer.y
        };
        const currentDirection = this.currentPlayer.getPlayerInfo().direction;
        
        // Remove guest player from depth group
        if (this.depthGroup) {
          this.depthGroup.remove(this.currentPlayer);
        }
        
        // Destroy guest player
        this.currentPlayer.destroy();
        this.currentPlayer = null as any;
        this.isGuestMode = false;
        
        // Create authenticated player with preserved position
        const playerId = authData.address || authData.user?.id;
        const displayName = authData.address ? 
          `${authData.address.slice(0, 6)}...${authData.address.slice(-4)}` : 
          authData.user?.name || 'Player';
        
        const playerInfo: PlayerInfo = {
          id: playerId,
          name: displayName,
          x: currentPos.x,
          y: currentPos.y,
          level: 1,
          character: 'cowboy' as CharacterType,
          direction: currentDirection,
          isCurrentPlayer: true
        };
        
        this.currentPlayer = new Player(this, playerInfo.x, playerInfo.y, playerInfo);
        
        // Add player to depth group for proper 2.5D sorting
        if (this.depthGroup) {
          this.depthGroup.add(this.currentPlayer);
        }
        
        this.updateCameraFollow();
        
        // Show success message
        console.log(`✅ Welcome back, ${displayName}! Your progress is now saved.`);
        
      } else if (!this.currentPlayer) {
        // No existing player, create new authenticated player
        const playerId = authData.address || authData.user?.id || 'guest_' + Math.random().toString(36).substr(2, 9);
        
        const displayName = authData.address ? 
          `${authData.address.slice(0, 6)}...${authData.address.slice(-4)}` : 
          'Guest';
        
        const playerInfo: PlayerInfo = {
          id: playerId,
          name: displayName,
          x: GameConfig.player.spawnPosition.x,
          y: GameConfig.player.spawnPosition.y,
          level: 1,
          character: 'cowboy' as CharacterType,
          direction: 'down',
          isCurrentPlayer: true
        };
        
        this.currentPlayer = new Player(this, playerInfo.x, playerInfo.y, playerInfo);
        
        // Add player to depth group for proper 2.5D sorting
        if (this.depthGroup) {
          this.depthGroup.add(this.currentPlayer);
        }
        
        this.updateCameraFollow();
        
        console.log('Created authenticated player:', playerId, displayName);
      }
      
    } catch (error) {
      console.error('Failed to create authenticated player:', error);
    }
  }
  


  update(time: number, delta: number) {
    if (!this.currentPlayer) return;

    // Update camera system
    if (this.cameraSystem) {
      this.cameraSystem.update(time, delta);
    }

    // Update collision system
    if (this.collisionSystem) {
      this.collisionSystem.update(time);
    }

    // Player input runs every frame for responsiveness
    this.handlePlayerInput(delta);
    
    // Handle editor mode toggle
    if (Phaser.Input.Keyboard.JustDown(this.backtickKey)) {
      this.toggleEditorMode();
    }
    
    // Sort depth group by Y position for 2.5D rendering
    if (this.depthGroup) {
      const sortedChildren = this.depthGroup.getChildren().sort((a: any, b: any) => a.y - b.y);
      sortedChildren.forEach((child: any, index: number) => {
        child.setDepth(index);
      });
    }

    // Throttled updates for less critical systems
    if (time - this.lastBuildingCheck > GameConfig.updateIntervals.buildingCheck) {
      this.updateBuildingInteractions();
      this.lastBuildingCheck = time;
    }

    if (time - this.lastCropUpdate > GameConfig.updateIntervals.cropUpdate) {
      this.cropSystem?.update();
      this.lastCropUpdate = time;
    }
    
    // Check crop growth stages every 5 seconds
    if (time - this.lastGrowthCheck > 5000) {
      this.updateCropGrowthStages();
      this.lastGrowthCheck = time;
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

    // Frame-rate independent movement: 540 pixels per second
    const baseSpeed = 540;
    const speed = (baseSpeed * delta) / 1000; // Convert to pixels per frame
    let moved = false;
    let newX = this.currentPlayer.x;
    let newY = this.currentPlayer.y;
    let newDirection = this.lastDirection;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      const potentialX = Math.max(20, newX - speed);
      if (!this.collisionSystem.checkPlayerCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'left';
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      const potentialX = Math.min(this.worldWidth - 20, newX + speed);
      if (!this.collisionSystem.checkPlayerCollision(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'right';
      }
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      const potentialY = Math.max(20, newY - speed);
      if (!this.collisionSystem.checkPlayerCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'up';
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      const potentialY = newY + speed;
      if (!this.collisionSystem.checkPlayerCollision(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'down';
      }
    }

    this.lastDirection = newDirection;
    
    // Update player direction if changed
    const currentDirection = this.currentPlayer.getPlayerInfo().direction;
    if (currentDirection !== this.lastDirection) {
      this.currentPlayer.updateDirection(this.lastDirection as any);
    }
    
    this.currentPlayer.updateMovementState(moved);

    if (moved) {
      this.currentPlayer.setPosition(newX, newY);
      // Emit player moved event
      eventBus.emit('player:moved', {
        playerId: this.currentPlayer.getPlayerInfo().id,
        x: newX,
        y: newY,
        timestamp: Date.now()
      });
    }

    this.updateCameraFollow();
  }

  private updateBuildingInteractions() {
    if (!this.currentPlayer) return;
    
    // Don't check building interactions in editor mode
    if (this.isEditorMode) return;
    
    const { x, y } = this.currentPlayer;

    // Use the centralized manager for all building interactions
    this.buildingInteractionManager.checkPlayerProximity(x, y);
    this.buildingInteractionManager.checkInteractions();
    
    // Update interaction prompts
    this.updateInteractionPrompts();
  }

  private updateInteractionPrompts() {
    // Define interactable zones
    const interactables = [
      { 
        id: 'marketplace',
        x: this.marketplaceBuilding?.x || 1000, 
        y: this.marketplaceBuilding?.y || 200, 
        radius: 100, 
        message: 'Press E to enter marketplace' 
      },
      { 
        id: 'bank',
        x: this.bankBuilding?.x || 1000, 
        y: this.bankBuilding?.y || 600, 
        radius: 100, 
        message: 'Press E to enter bank' 
      },
      { 
        id: 'flowBank',
        x: this.flowBankBuilding?.x || 300, 
        y: this.flowBankBuilding?.y || 200, 
        radius: 100, 
        message: 'Press E to enter Flow bank' 
      },
      { 
        id: 'flowMarketplace',
        x: this.flowMarketplaceBuilding?.x || 300, 
        y: this.flowMarketplaceBuilding?.y || 600, 
        radius: 100, 
        message: 'Press E to enter Flow marketplace' 
      },
      { 
        id: 'pepe',
        x: this.pepeBuilding?.x || 500, 
        y: this.pepeBuilding?.y || 800, 
        radius: 100, 
        message: 'Press E to enter Pepe building' 
      }
    ];
    
    // Clear previous state
    this.nearbyInteractables.clear();
    
    // Check distance to each interactable
    interactables.forEach(item => {
      // Skip if building doesn't exist (wrong network)
      if ((item.id === 'marketplace' && !this.marketplaceBuilding) ||
          (item.id === 'bank' && !this.bankBuilding) ||
          (item.id === 'flowBank' && !this.flowBankBuilding) ||
          (item.id === 'flowMarketplace' && !this.flowMarketplaceBuilding) ||
          (item.id === 'pepe' && !this.pepeBuilding)) {
        return;
      }
      
      const distance = Phaser.Math.Distance.Between(
        this.currentPlayer.x, 
        this.currentPlayer.y,
        item.x, 
        item.y
      );
      
      if (distance <= item.radius) {
        this.nearbyInteractables.set(item.id, { distance, message: item.message });
      }
    });
    
    // Update UI with closest interactable
    if (this.nearbyInteractables.size > 0) {
      // Get closest
      const closest = Array.from(this.nearbyInteractables.entries())
        .sort((a, b) => a[1].distance - b[1].distance)[0];
      
      this.showInteractionPrompt(closest[1].message);
    } else {
      this.hideInteractionPrompt();
    }
  }
  
  private showInteractionPrompt(message: string) {
    if (!this.interactionPrompt) {
      this.interactionPrompt = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height - 100,
        message,
        {
          fontSize: '18px',
          backgroundColor: '#000000CC',
          padding: { x: 16, y: 8 },
          fixedWidth: 300,
          align: 'center'
        }
      );
      this.interactionPrompt.setOrigin(0.5);
      this.interactionPrompt.setScrollFactor(0);
      this.interactionPrompt.setDepth(1000);
      
      // Fade in animation
      this.interactionPrompt.setAlpha(0);
      this.tweens.add({
        targets: this.interactionPrompt,
        alpha: 1,
        duration: 200
      });
    } else if (this.interactionPrompt.text !== message) {
      // Update text if different
      this.interactionPrompt.setText(message);
    }
  }
  
  private hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.tweens.add({
        targets: this.interactionPrompt,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.interactionPrompt?.destroy();
          this.interactionPrompt = undefined;
        }
      });
    }
  }



  destroy() {
    // Clean up farm plot event listeners
    eventBus.removeAllListeners('plot:contextMenu');
    eventBus.removeAllListeners('plot:selected');
    eventBus.removeAllListeners('plot:planted');
    eventBus.removeAllListeners('plot:harvested');
    eventBus.removeAllListeners('ui:plantCrop');
    eventBus.removeAllListeners('ui:waterCrop');
    eventBus.removeAllListeners('ui:harvestCrop');
    
    // Clean up farm plots
    this.farmPlots.forEach(plot => plot.destroy());
    this.farmPlots = [];
    
    // Emit system shutdown event
    eventBus.emit('system:shutdown', { systemName: 'MainScene' });
    
    // Disconnect functionality removed
    this.scene.stop();
  }

  // Crop system methods for external access
  getCropSystem(): CropSystem | null {
    return this.cropSystem || null;
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
  
  // Editor Mode Methods
  setupEditorClickHandling() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEditorMode) return;
      
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      if (this.editorMode === 'info' || (this.editorMode === 'move' && !this.selectedEditorObject)) {
        // Select object
        this.handleEditorObjectSelection(worldPoint.x, worldPoint.y);
      } else if (this.editorMode === 'move' && this.selectedEditorObject) {
        // Move selected object
        this.moveSelectedObject(worldPoint.x, worldPoint.y);
      }
    });
  }
  
  handleEditorObjectSelection(x: number, y: number) {
    // Clear previous selection
    this.clearEditorSelection();
    
    // Check buildings first
    const buildings = [
      this.bankBuilding,
      this.marketplaceBuilding,
      this.flowBankBuilding,
      this.flowMarketplaceBuilding,
      this.pepeBuilding
    ].filter(Boolean);
    
    for (const building of buildings) {
      if (building && building.checkCollision(x, y)) {
        this.selectEditorObject(building);
        return;
      }
    }
    
    // Check current player
    if (this.currentPlayer) {
      const bounds = this.currentPlayer.getBounds();
      if (bounds.contains(x, y)) {
        this.selectEditorObject(this.currentPlayer);
        return;
      }
    }
  }
  
  selectEditorObject(object: any) {
    this.selectedEditorObject = object;
    
    // Create visual feedback
    this.createEditorOverlay(object);
    
    // Emit event to update UI
    const editorObject = {
      name: this.getObjectName(object),
      x: object.x,
      y: object.y,
      type: this.getObjectType(object)
    };
    
    this.events.emit('editorObjectSelected', editorObject);
  }
  
  clearEditorSelection() {
    this.selectedEditorObject = null;
    if (this.editorOverlay) {
      this.editorOverlay.destroy();
      this.editorOverlay = undefined;
    }
  }
  
  createEditorOverlay(object: any) {
    if (this.editorOverlay) {
      this.editorOverlay.destroy();
    }
    
    this.editorOverlay = this.add.graphics();
    this.editorOverlay.lineStyle(3, 0x00ff00, 1);
    
    // For buildings, use collision bounds which are more accurate
    let bounds;
    if (object.getCollisionBounds) {
      bounds = object.getCollisionBounds();
    } else if (object.getBounds) {
      bounds = object.getBounds();
    } else {
      // Fallback for objects without bounds methods
      bounds = new Phaser.Geom.Rectangle(
        object.x - 50,
        object.y - 50,
        100,
        100
      );
    }
    
    this.editorOverlay.strokeRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
    
    // Draw a small crosshair at the object's actual position
    this.editorOverlay.lineStyle(2, 0xffff00, 1);
    this.editorOverlay.moveTo(object.x - 10, object.y);
    this.editorOverlay.lineTo(object.x + 10, object.y);
    this.editorOverlay.moveTo(object.x, object.y - 10);
    this.editorOverlay.lineTo(object.x, object.y + 10);
    this.editorOverlay.strokePath();
    
    // Add to depth group so it sorts properly
    this.depthGroup.add(this.editorOverlay);
  }
  
  moveSelectedObject(x: number, y: number) {
    if (!this.selectedEditorObject) return;
    
    this.selectedEditorObject.setPosition(x, y);
    
    // Update overlay
    this.createEditorOverlay(this.selectedEditorObject);
    
    // Update UI
    const editorObject = {
      name: this.getObjectName(this.selectedEditorObject),
      x: x,
      y: y,
      type: this.getObjectType(this.selectedEditorObject)
    };
    
    this.events.emit('editorObjectSelected', editorObject);
  }
  
  getObjectName(object: any): string {
    if (object.getBuildingName) {
      return object.getBuildingName();
    } else if (object.getPlayerInfo) {
      const info = object.getPlayerInfo();
      return `Player: ${info.name}`;
    }
    return 'Unknown Object';
  }
  
  getObjectType(object: any): 'building' | 'player' | 'other' {
    if (object.getBuildingName) return 'building';
    if (object.getPlayerInfo) return 'player';
    return 'other';
  }
  
  toggleEditorMode() {
    this.isEditorMode = !this.isEditorMode;
    this.events.emit('editorModeChanged', this.isEditorMode);
    
    if (!this.isEditorMode) {
      this.clearEditorSelection();
      // Remove editor mode text
      if (this.editorModeText) {
        this.editorModeText.destroy();
        this.editorModeText = undefined;
      }
    } else {
      // Show editor mode indicator
      this.createEditorModeIndicator();
    }
  }
  
  createEditorModeIndicator() {
    if (this.editorModeText) {
      this.editorModeText.destroy();
    }
    
    this.editorModeText = this.add.text(20, 20, 'EDITOR MODE ACTIVE\nPress ` to exit\nClick to select, then click to move', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ff0000',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 10 },
      align: 'left'
    });
    
    this.editorModeText.setScrollFactor(0); // Keep it fixed to camera
    this.editorModeText.setDepth(10000); // Always on top
  }
  
  setEditorMode(mode: 'info' | 'move') {
    this.editorMode = mode;
    
    // Clear selection when switching to info mode
    if (mode === 'info') {
      this.clearEditorSelection();
    }
  }
  
  exportBuildingConfig() {
    const config = {
      buildings: {
        katana: {
          bank: { x: 0, y: 0 },
          marketplace: { x: 0, y: 0 }
        },
        flow: {
          bank: { x: 0, y: 0 },
          marketplace: { x: 0, y: 0 },
          pepe: { x: 0, y: 0 }
        }
      }
    };
    
    // Export Katana buildings
    if (this.bankBuilding) {
      config.buildings.katana.bank.x = Math.round(this.bankBuilding.x);
      config.buildings.katana.bank.y = Math.round(this.bankBuilding.y);
    }
    if (this.marketplaceBuilding) {
      config.buildings.katana.marketplace.x = Math.round(this.marketplaceBuilding.x);
      config.buildings.katana.marketplace.y = Math.round(this.marketplaceBuilding.y);
    }
    
    // Export Flow buildings
    if (this.flowBankBuilding) {
      config.buildings.flow.bank.x = Math.round(this.flowBankBuilding.x);
      config.buildings.flow.bank.y = Math.round(this.flowBankBuilding.y);
    }
    if (this.flowMarketplaceBuilding) {
      config.buildings.flow.marketplace.x = Math.round(this.flowMarketplaceBuilding.x);
      config.buildings.flow.marketplace.y = Math.round(this.flowMarketplaceBuilding.y);
    }
    if (this.pepeBuilding) {
      config.buildings.flow.pepe.x = Math.round(this.pepeBuilding.x);
      config.buildings.flow.pepe.y = Math.round(this.pepeBuilding.y);
    }
    
    const configString = `// --- PASTE THIS INTO YOUR GameConfig.ts ---
buildings: ${JSON.stringify(config.buildings, null, 2)},
// -----------------------------------------`;
    
    navigator.clipboard.writeText(configString);
    console.log('📋 Building configuration copied to clipboard!');
    console.log(configString);
  }

  // Save game state to localStorage
  private saveGameState(): void {
    // Gather all plot states
    const plotStates = this.farmPlots.map(plot => {
      const state = plot.getPlotState();
      return {
        plotId: state.id,
        gridX: state.gridX,
        gridY: state.gridY,
        crop: state.crop
      };
    });

    // Save to localStorage
    GamePersistence.saveGameState(
      this.playerGold,
      this.playerLevel,
      this.playerExperience,
      plotStates
    );
  }

  // Load game state from localStorage
  private loadGameState(): void {
    const savedState = GamePersistence.loadGameState();
    if (!savedState) {
      console.log('🎮 No saved game found, starting fresh');
      return;
    }

    console.log('🎮 Loading saved game from', new Date(savedState.lastSaved).toLocaleString());

    // Restore player data
    this.playerGold = savedState.player.gold;
    this.playerLevel = savedState.player.level;
    this.playerExperience = savedState.player.experience;

    // Check for offline harvestable crops
    const offlineReady = GamePersistence.getOfflineHarvestableCount(savedState);
    if (offlineReady > 0) {
      console.log(`🌾 ${offlineReady} crops became ready while you were away!`);
      // Could show a notification here
    }

    // Restore crops to plots
    savedState.plots.forEach(savedPlot => {
      const plot = this.farmPlots.find(p => p.getPlotState().id === savedPlot.plotId);
      if (plot && savedPlot.crop) {
        // Calculate current position for the crop
        const cropData = GamePersistence.restoreCrop(
          savedPlot.crop,
          plot.x,
          plot.y
        );
        
        // Plant the restored crop
        plot.plantCrop(savedPlot.crop.type, cropData);
        
        console.log(`🌱 Restored ${savedPlot.crop.type} at plot ${savedPlot.plotId}, stage: ${cropData.stage}`);
      }
    });

    // Emit event to update UI with loaded gold
    this.events.emit('goldUpdated', this.playerGold);
  }

  // Update player gold (called from Game.tsx)
  public updatePlayerGold(gold: number): void {
    // Ensure gold never goes negative
    this.playerGold = Math.max(0, gold);
    this.saveGameState();
  }

  // Update crop growth stages periodically
  private updateCropGrowthStages(): void {
    let hasChanges = false;
    
    this.farmPlots.forEach(plot => {
      const state = plot.getPlotState();
      if (state.crop && state.crop.stage !== 'ready') {
        // Calculate current stage
        const newStage = GamePersistence.calculateGrowthStage(state.crop.plantedAt, state.crop.type);
        
        if (newStage !== state.crop.stage) {
          // Update the crop data
          state.crop.stage = newStage;
          hasChanges = true;
          
          // Update the visual representation
          plot.updateCropGrowth(newStage);
          console.log(`🌱 ${state.crop.type} grew to ${newStage} stage`);
          
          if (newStage === 'ready') {
            console.log(`🌾 ${state.crop.type} is ready to harvest!`);
            // Could show a notification here
          }
        }
      }
    });
    
    // Save if any crops changed stage
    if (hasChanges) {
      this.saveGameState();
    }
  }
}

export type { EditorObject } from '../components/EditorPanel';
