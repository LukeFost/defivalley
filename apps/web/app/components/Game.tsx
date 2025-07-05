'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';

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
  private players: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private currentPlayer!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private sessionId!: string;
  private chatCallback?: (message: ChatMessage) => void;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { chatCallback?: (message: ChatMessage) => void }) {
    this.chatCallback = data.chatCallback;
  }

  preload() {
    // Load the character sprite sheets
    this.load.image('characters', '/sprites/RPGCharacterSprites32x32.png');
    this.load.image('soldier', '/sprites/RPGSoldier32x32.png');
  }

  async create() {
    // Create world bounds with grass-like background
    this.add.rectangle(400, 300, 800, 600, 0x228B22, 0.3);
    
    // Add some visual elements
    this.add.text(10, 10, 'DeFi Valley - Multiplayer Game', {
      fontSize: '20px',
      color: '#000000'
    });
    
    this.add.text(10, 40, 'Use WASD or Arrow Keys to move', {
      fontSize: '14px',
      color: '#666666'
    });
    
    this.add.text(10, 60, 'Press Enter to chat', {
      fontSize: '14px',
      color: '#666666'
    });

    // Create animations for different characters
    this.createCharacterAnimations();

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };

    // Connect to Colyseus after scene is fully ready
    this.time.delayedCall(100, () => {
      this.connectToServer();
    });
  }

  createCharacterAnimations() {
    // Create sprite sheet configurations for the characters
    // Based on the actual sprite sheet: looks like 20 columns x many rows
    // Each character is 32x32 pixels
    if (!this.textures.exists('characterFrames')) {
      this.textures.addSpriteSheet('characterFrames', this.textures.get('characters').getSourceImage(), {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    // Create sprite sheet for soldier sprites
    if (!this.textures.exists('soldierFrames')) {
      this.textures.addSpriteSheet('soldierFrames', this.textures.get('soldier').getSourceImage(), {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    // Debug: Log sprite sheet info to console
    console.log('Character sprite sheet loaded:', {
      width: this.textures.get('characters').getSourceImage().width,
      height: this.textures.get('characters').getSourceImage().height,
      framesX: Math.floor(this.textures.get('characters').getSourceImage().width / 32),
      framesY: Math.floor(this.textures.get('characters').getSourceImage().height / 32)
    });
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
          this.players.forEach((sprite, sessionId) => {
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
      
      // Create player sprite using character frames
      // Use different character frames for different players
      // Get sprite sheet dimensions to use all available characters
      const spriteTexture = this.textures.get('characters');
      const frameWidth = 32;
      const frameHeight = 32;
      const totalFramesX = Math.floor(spriteTexture.getSourceImage().width / frameWidth);
      const totalFramesY = Math.floor(spriteTexture.getSourceImage().height / frameHeight);
      const totalFrames = totalFramesX * totalFramesY;
      
      const characterIndex = Math.abs(sessionId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % totalFrames;
      console.log(`🎭 Player ${player.name} using character ${characterIndex} out of ${totalFrames} available (${totalFramesX}x${totalFramesY} grid)`);
      
      const playerSprite = this.add.sprite(player.x, player.y, 'characterFrames', characterIndex);
      playerSprite.setScale(1.5); // Scale up the 32x32 sprite slightly
      
      // Add a subtle tint for current player
      if (isCurrentPlayer) {
        playerSprite.setTint(0xaaffaa); // Light green tint
      }
      
      // Add player name
      const nameText = this.add.text(player.x, player.y - 35, player.name, {
        fontSize: '12px',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: { x: 4, y: 2 }
      });
      nameText.setOrigin(0.5);
      
      // Store references
      this.players.set(sessionId, playerSprite);
      
      if (isCurrentPlayer) {
        this.currentPlayer = playerSprite;
      }
      
      console.log('Added player:', sessionId, player.name, 'with character frame:', characterIndex);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  }

  removePlayer(sessionId: string) {
    try {
      const playerSprite = this.players.get(sessionId);
      if (playerSprite) {
        playerSprite.destroy();
        this.players.delete(sessionId);
        console.log('Removed player:', sessionId);
      }
    } catch (error) {
      console.error('Error removing player:', error);
    }
  }

  updatePlayer(sessionId: string, player: any) {
    try {
      const playerSprite = this.players.get(sessionId);
      if (playerSprite && player) {
        playerSprite.setPosition(player.x, player.y);
        
        // Update name position too
        const nameText = this.children.list.find(child => 
          child instanceof Phaser.GameObjects.Text && 
          Math.abs(child.x - player.x) < 50 && 
          Math.abs(child.y - (player.y - 35)) < 10
        ) as Phaser.GameObjects.Text;
        
        if (nameText) {
          nameText.setPosition(player.x, player.y - 35);
        }
      }
    } catch (error) {
      console.error('Error updating player:', error);
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

    // Handle input
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      newX = Math.max(20, newX - speed);
      moved = true;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      newX = Math.min(780, newX + speed);
      moved = true;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      newY = Math.max(20, newY - speed);
      moved = true;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      newY = Math.min(580, newY + speed);
      moved = true;
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
    super.destroy();
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