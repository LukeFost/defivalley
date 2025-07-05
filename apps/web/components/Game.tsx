'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { Player, PlayerInfo } from '../lib/Player';
import { CharacterConfig, CharacterType } from '../lib/character.config';
import { CropSystem, CropType, CropData } from '../lib/CropSystem';
import { CropContextMenu } from './CropContextMenu';
import { CropInfo } from './CropInfo';

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
  private cropSystem!: CropSystem;

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
    
    // Initialize and preload crop system
    this.cropSystem = new CropSystem(this);
    this.cropSystem.preload();
  }

  async create() {
    // Create a beautiful farming world background
    this.createFarmingWorld();
    
    // Add elegant UI overlay
    this.createUI();

    // Create animations for different characters
    this.createCharacterAnimations();
    
    // Initialize crop system
    this.cropSystem.create();

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
      
      // Add crop system development tools
      (window as any).clearAllCrops = () => {
        if (this.cropSystem) {
          this.cropSystem.clearAllCrops();
          console.log('🧹 All crops cleared!');
        }
      };
    }
  }

  createFarmingWorld() {
    // Create layered background for depth
    const sky = this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
    const ground = this.add.rectangle(400, 500, 800, 200, 0x8B4513, 0.8);
    const grass = this.add.rectangle(400, 450, 800, 100, 0x90EE90, 0.7);
    
    this.createFarmPlots();
    this.addDecorations();
  }

  createFarmPlots() {
    // Create a grid of farming plots
    const plotSize = 64;
    const spacing = 80;
    const startX = 120;
    const startY = 200;
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        const x = startX + (col * spacing);
        const y = startY + (row * spacing);
        
        // Create plot background
        const plot = this.add.rectangle(x, y, plotSize, plotSize, 0x8B4513, 0.3);
        plot.setStrokeStyle(2, 0x654321, 0.8);
        
        // Add some visual variety to plots
        if (Math.random() > 0.7) {
          // Some plots have seeds/plants with gentle animation
          const plant = this.add.circle(x, y, 8, 0x228B22, 0.8);
          
          // Add gentle swaying animation
          this.tweens.add({
            targets: plant,
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 2000 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }
    }
  }

  addDecorations() {
    // Add trees around the border
    const treePositions = [
      [50, 100], [750, 120], [80, 500], [720, 480],
      [150, 80], [650, 90], [100, 520], [700, 540]
    ];
    
    treePositions.forEach(([x, y]) => {
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
    });

    // Add path/walkways
    const pathGraphics = this.add.graphics();
    pathGraphics.fillStyle(0xDEB887, 0.6);
    pathGraphics.fillRect(0, 380, 800, 20);
    pathGraphics.fillRect(390, 0, 20, 600);
  }

  createUI() {
    // Create elegant UI container
    const uiContainer = this.add.container(0, 0);
    
    // Header with farming theme
    const headerBg = this.add.rectangle(400, 30, 500, 50, 0x8B4513, 0.9);
    headerBg.setStrokeStyle(2, 0x654321, 1);
    
    const title = this.add.text(400, 30, '🌱 DeFi Valley - Cozy Farming', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    
    // Elegant controls info
    const controlsBg = this.add.rectangle(120, 580, 220, 40, 0x000000, 0.7);
    controlsBg.setStrokeStyle(1, 0x8B4513, 0.8);
    
    const controls = this.add.text(120, 580, '🎮 WASD: Move  💬 Enter: Chat', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif'
    });
    controls.setOrigin(0.5);
    
    // Add farming-themed UI elements
    this.add.text(680, 580, '🌾 Plant & Harvest', {
      fontSize: '12px',
      color: '#228B22',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
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

    // Handle input with directional sprite changes
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      newX = Math.max(20, newX - speed);
      moved = true;
      this.lastDirection = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      newX = Math.min(780, newX + speed);
      moved = true;
      this.lastDirection = 'right';
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      newY = Math.max(20, newY - speed);
      moved = true;
      this.lastDirection = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      newY = Math.min(580, newY + speed);
      moved = true;
      this.lastDirection = 'down';
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
  
  // Crop system methods for external access
  getCropSystem(): CropSystem {
    return this.cropSystem;
  }
  
  plantCrop(x: number, y: number, cropType: CropType): boolean {
    if (!this.cropSystem) return false;
    if (!this.cropSystem.canPlantAt(x, y)) return false;
    
    this.cropSystem.plantCrop(x, y, cropType);
    return true;
  }
  
  removeCropAt(x: number, y: number): boolean {
    if (!this.cropSystem) return false;
    
    const crop = this.cropSystem.getCropAtPosition(x, y);
    if (!crop) return false;
    
    return this.cropSystem.removeCrop(crop.id);
  }
  
  getCropAt(x: number, y: number) {
    if (!this.cropSystem) return null;
    
    const crop = this.cropSystem.getCropAtPosition(x, y);
    return crop ? { id: crop.id, type: crop.type, stage: crop.stage } : null;
  }
  
  canPlantAt(x: number, y: number): boolean {
    if (!this.cropSystem) return false;
    return this.cropSystem.canPlantAt(x, y);
  }
  
  harvestCropAt(x: number, y: number): boolean {
    if (!this.cropSystem) return false;
    
    const crop = this.cropSystem.getCropAtPosition(x, y);
    if (!crop) return false;
    
    const result = this.cropSystem.harvestCrop(crop.id);
    return result.success;
  }
}

function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);
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
        
        // Listen for crop click events
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
      sceneRef.current.plantCrop(x, y, cropType);
    }
  };

  const handleRemoveCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.removeCropAt(x, y);
    }
  };

  const handleCanPlantAt = (x: number, y: number) => {
    if (sceneRef.current) {
      return sceneRef.current.canPlantAt(x, y);
    }
    return false;
  };

  const handleGetCropAt = (x: number, y: number) => {
    if (sceneRef.current) {
      return sceneRef.current.getCropAt(x, y);
    }
    return null;
  };

  const handleHarvestCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.harvestCropAt(x, y);
    }
  };

  return (
    <div className="game-wrapper">
      <CropContextMenu
        onPlantCrop={handlePlantCrop}
        onRemoveCrop={handleRemoveCrop}
        onHarvestCrop={handleHarvestCrop}
        canPlantAt={handleCanPlantAt}
        getCropAt={handleGetCropAt}
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

      {/* Crop Information Display */}
      <CropInfo 
        crop={selectedCrop} 
        onClose={() => setSelectedCrop(null)} 
      />

      <style jsx>{`
        .game-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }

        .chat-container {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 300px;
          max-height: 200px;
          pointer-events: none;
        }

        .chat-messages {
          background: rgba(0, 0, 0, 0.7);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          max-height: 150px;
          overflow-y: auto;
        }

        .chat-message {
          color: white;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .chat-name {
          font-weight: bold;
          margin-right: 5px;
        }

        .chat-text {
          opacity: 0.9;
        }

        .chat-input-form {
          pointer-events: all;
        }

        .chat-input {
          width: 100%;
          padding: 8px;
          border: none;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .chat-input:focus {
          outline: none;
          background: white;
        }
      `}</style>
    </div>
  );
}

export default Game;