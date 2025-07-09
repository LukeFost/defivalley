import { Client, Room } from 'colyseus.js';
import { PlayerManager } from './PlayerManager';
import { GameConfig } from '../GameConfig';

interface GameState { 
  players: Map<string, {
    id: string;
    name: string;
    x: number;
    y: number;
    connected: boolean;
    level?: number;
    xp?: number;
  }>;
  serverTime: number;
  gameStatus: string;
}

export class NetworkManager {
  private scene: Phaser.Scene;
  private client!: Client;
  public room!: Room<GameState>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public async connect(playerManager: PlayerManager, worldId?: string, isOwnWorld?: boolean, address?: string, user?: any): Promise<void> {
    try {
      const hostname = window.location.hostname;
      const port = GameConfig.NETWORK_SERVER_PORT.toString();
      const serverHost = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;
      const endpoint = `ws://${serverHost}:${port}`;
      
      console.log('Connecting to:', endpoint);

      const playerId = address || user?.id || `guest_${Math.random().toString(36).substr(2, 9)}`;
      const formatAddress = (addr: string): string => {
        if (addr.length > 10) {
          return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        }
        return addr;
      };
      
      const displayName = address ? formatAddress(address) : `Player${Math.floor(Math.random() * 1000)}`;

      const roomOptions: any = { name: displayName, playerId };
      const roomType = worldId ? 'world' : 'game';
      
      if (worldId) {
        roomOptions.worldOwnerId = worldId;
        console.log(`Joining world: ${worldId} (${isOwnWorld ? 'as owner' : 'as visitor'}) with playerId: ${playerId}`);
      }

      try {
        this.client = new Client(endpoint);
        this.room = await this.client.joinOrCreate<GameState>(roomType, roomOptions);
      } catch (connectionError) {
        console.log('Primary connection failed, trying localhost fallback...');
        if (serverHost !== 'localhost') {
          const fallbackEndpoint = `ws://localhost:${GameConfig.NETWORK_SERVER_PORT}`;
          console.log('Fallback connecting to:', fallbackEndpoint);
          this.client = new Client(fallbackEndpoint);
          this.room = await this.client.joinOrCreate<GameState>(roomType, roomOptions);
        } else {
          throw connectionError;
        }
      }

      // Listen for state changes
      this.room.onStateChange((state: any) => {
        console.log('State changed, players:', state.players);
        
        if (!state.players) return;
        
        // Handle player updates through PlayerManager
        state.players.forEach((playerData: any, sessionId: string) => {
          playerManager.addPlayer(sessionId, playerData, sessionId === this.room.sessionId);
        });
      });

      // Handle player removal
      if ((this.room.state as any).players) {
        (this.room.state as any).players.onRemove = (player: any, sessionId: string) => {
          playerManager.removePlayer(sessionId);
        };
      }

      console.log('Connected to server!');
    } catch (error) {
      console.error('Failed to connect to server:', error);
      throw error;
    }
  }
  
  public getRoom(): Room<GameState> | undefined {
    return this.room;
  }
  
  public getSessionId(): string | undefined {
    return this.room?.sessionId;
  }

  public send(type: string, payload: any): void {
    if (this.room) {
      this.room.send(type, payload);
    }
  }
  
  public onMessage(type: string, callback: (message: any) => void): void {
    if (this.room) {
      this.room.onMessage(type, callback);
    }
  }
  
  public leave(): void {
    if (this.room) {
      this.room.leave();
    }
  }
}