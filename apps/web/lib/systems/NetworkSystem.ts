import { Client, Room } from 'colyseus.js';
import { RoomOptions, WelcomeMessage } from '../../types/colyseus.types';

// Network event types
export interface NetworkEvents {
  onPlayerJoin: (sessionId: string, player: PlayerData) => void;
  onPlayerLeave: (sessionId: string) => void;
  onPlayerMove: (sessionId: string, x: number, y: number, level?: number) => void;
  onChatMessage: (message: ChatMessage) => void;
  onStateChange: (state: GameState) => void;
  onConnected: (room: Room<GameState>) => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
}

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  connected: boolean;
  level?: number;
  xp?: number;
}

export interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  players: Map<string, PlayerData>;
  serverTime: number;
  gameStatus: string;
}

export interface NetworkConfig {
  hostname?: string;
  port?: string;
  protocol?: 'ws' | 'wss';
  fallbackToLocalhost?: boolean;
}

export class NetworkSystem {
  private client?: Client;
  private room?: Room<GameState>;
  private sessionId?: string;
  private events: Partial<NetworkEvents> = {};
  private config: NetworkConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000;

  constructor(config: NetworkConfig = {}) {
    this.config = {
      hostname: window.location.hostname,
      port: '2567',
      protocol: 'ws',
      fallbackToLocalhost: true,
      ...config
    };
  }

  // Event registration
  public on<K extends keyof NetworkEvents>(event: K, handler: NetworkEvents[K]): void {
    this.events[event] = handler;
  }

  public off<K extends keyof NetworkEvents>(event: K): void {
    delete this.events[event];
  }

  // Connection management
  public async connect(roomType: string, options: RoomOptions): Promise<void> {
    try {
      const endpoint = this.buildEndpoint();
      console.log('🌐 NetworkSystem: Connecting to:', endpoint);

      try {
        this.client = new Client(endpoint);
        this.room = await this.client.joinOrCreate<GameState>(roomType, options);
      } catch (connectionError) {
        // Try localhost fallback if enabled
        if (this.config.fallbackToLocalhost && this.config.hostname !== 'localhost') {
          console.log('🔄 NetworkSystem: Primary connection failed, trying localhost fallback...');
          const fallbackEndpoint = `${this.config.protocol}://localhost:${this.config.port}`;
          this.client = new Client(fallbackEndpoint);
          this.room = await this.client.joinOrCreate<GameState>(roomType, options);
        } else {
          throw connectionError;
        }
      }

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Set up room event listeners
      this.setupRoomListeners();

      // Notify connection success
      this.events.onConnected?.(this.room);
      console.log('✅ NetworkSystem: Connected successfully!');

    } catch (error) {
      console.error('❌ NetworkSystem: Failed to connect:', error);
      this.events.onError?.(error as Error);
      
      // Attempt reconnection if not at max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnection(roomType, options);
      }
      
      throw error;
    }
  }

  public disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = undefined;
    }
    if (this.client) {
      this.client = undefined;
    }
    this.sessionId = undefined;
    this.isConnected = false;
    this.events.onDisconnected?.();
    console.log('👋 NetworkSystem: Disconnected');
  }

  // Message sending
  public sendMovement(x: number, y: number): void {
    if (!this.room) {
      console.warn('NetworkSystem: Cannot send movement - not connected');
      return;
    }
    this.room.send('move', { x, y });
  }

  public sendChat(message: string): void {
    if (!this.room || !message.trim()) {
      console.warn('NetworkSystem: Cannot send chat - not connected or empty message');
      return;
    }
    try {
      this.room.send('chat', { text: message });
      console.log('💬 NetworkSystem: Chat message sent');
    } catch (error) {
      console.error('NetworkSystem: Error sending chat:', error);
      this.events.onError?.(error as Error);
    }
  }

  // Getters
  public getSessionId(): string | undefined {
    return this.sessionId;
  }

  public getRoom(): Room<GameState> | undefined {
    return this.room;
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  // Private methods
  private buildEndpoint(): string {
    const hostname = this.config.hostname === 'localhost' || this.config.hostname === '127.0.0.1' 
      ? 'localhost' 
      : this.config.hostname;
    
    return `${this.config.protocol}://${hostname}:${this.config.port}`;
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    // State change listener
    this.room.onStateChange((state) => {
      console.log('🔄 NetworkSystem: State changed');
      this.events.onStateChange?.(state);

      // Handle player updates
      if (state.players) {
        // Detect player removals
        const currentPlayerIds = new Set(state.players.keys ? Array.from(state.players.keys()) : []);
        
        // Process all players in state
        state.players.forEach((player: PlayerData, sessionId: string) => {
          // Check if this is a new player
          if (!this.isPlayerTracked(sessionId)) {
            this.events.onPlayerJoin?.(sessionId, player);
          } else {
            // Existing player - send position update
            this.events.onPlayerMove?.(sessionId, player.x, player.y, player.level);
          }
        });
      }
    });

    // Message listeners
    this.room.onMessage('welcome', (message: WelcomeMessage) => {
      console.log('👋 NetworkSystem: Welcome message:', message);
    });

    this.room.onMessage('chat', (message: ChatMessage) => {
      console.log('💬 NetworkSystem: Chat message:', message);
      this.events.onChatMessage?.(message);
    });

    this.room.onMessage('player-joined', (message: any) => {
      console.log('➕ NetworkSystem: Player joined:', message);
    });

    this.room.onMessage('player-left', (message: any) => {
      console.log('➖ NetworkSystem: Player left:', message);
      if (message.sessionId) {
        this.events.onPlayerLeave?.(message.sessionId);
      }
    });

    // Error handling
    this.room.onError((code, message) => {
      console.error('❌ NetworkSystem: Room error:', code, message);
      this.events.onError?.(new Error(`Room error ${code}: ${message}`));
    });

    // Leave handling
    this.room.onLeave((code) => {
      console.log(`👋 NetworkSystem: Left room with code ${code}`);
      this.isConnected = false;
      this.events.onDisconnected?.();
    });
  }

  private isPlayerTracked(sessionId: string): boolean {
    // This would need to be implemented based on how you track players
    // For now, return false to always trigger onPlayerJoin
    return false;
  }

  private scheduleReconnection(roomType: string, options: RoomOptions): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 NetworkSystem: Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect(roomType, options);
      } catch (error) {
        console.error('NetworkSystem: Reconnection attempt failed:', error);
      }
    }, delay);
  }

  // Utility methods
  public formatAddress(address: string): string {
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  }

  public generateGuestId(): string {
    return `guest_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getDisplayName(address?: string): string {
    return address 
      ? this.formatAddress(address)
      : `Player${Math.floor(Math.random() * 1000)}`;
  }
}