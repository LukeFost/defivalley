import { Client, Room } from 'colyseus.js';
import { PlayerManager } from './PlayerManager';

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
      const endpoint = `ws://${hostname === 'localhost' ? 'localhost' : hostname}:2567`;
      this.client = new Client(endpoint);

      const playerId = address || user?.id || `guest_${Math.random().toString(36).substr(2, 9)}`;
      const displayName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Player';

      const roomOptions = { name: displayName, playerId, worldOwnerId: worldId };
      const roomType = worldId ? 'world' : 'game';

      this.room = await this.client.joinOrCreate<GameState>(roomType, roomOptions);

      this.room.onStateChange((state: any) => {
        if (!state.players) return;
        state.players.forEach((playerData: any, sessionId: string) => {
          playerManager.addPlayer(sessionId, playerData, sessionId === this.room.sessionId);
        });
      });

      (this.room.state as any).players.onRemove = (player: any, sessionId: string) => {
        playerManager.removePlayer(sessionId);
      };

      console.log('Connected to server!');
    } catch (error) {
      console.error('Failed to connect to server:', error);
    }
  }

  public send(type: string, payload: any): void {
    if (this.room) {
      this.room.send(type, payload);
    }
  }
}