import { Player, PlayerInfo } from '../Player';
import { Scene } from 'phaser';

import { CharacterType, Direction } from '../character.config';

export interface PlayerData {
  x: number;
  y: number;
  direction: Direction;
  character: CharacterType;
  level: number;
  name: string;
  playerId: string;
  isCurrentPlayer?: boolean;
}

export class PlayerManager {
  private players = new Map<string, Player>();
  private scene: Scene;
  private currentPlayerId: string | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public setCurrentPlayer(sessionId: string) {
    this.currentPlayerId = sessionId;
    
    // Update existing players to mark current player
    this.players.forEach((player, id) => {
      const isCurrent = id === sessionId;
      if (player.isCurrentPlayer !== isCurrent) {
        // Update the player's current status
        player.isCurrentPlayer = isCurrent;
        player.updateCurrentPlayerStatus(isCurrent);
      }
    });
  }

  public addPlayer(sessionId: string, playerData: PlayerData): void {
    if (this.players.has(sessionId)) {
      this.updatePlayer(sessionId, playerData);
      return;
    }

    const isCurrent = sessionId === this.currentPlayerId;
    const playerInfo: PlayerInfo = {
      id: sessionId,
      x: playerData.x,
      y: playerData.y,
      direction: playerData.direction,
      character: playerData.character,
      level: playerData.level,
      name: playerData.name,
      isCurrentPlayer: isCurrent,
    };

    try {
      const playerObject = new Player(this.scene, playerData.x, playerData.y, playerInfo);
      this.players.set(sessionId, playerObject);

      // Follow current player with camera
      if (isCurrent) {
        this.scene.cameras.main.startFollow(playerObject, true, 0.1, 0.1);
      }

      console.log(`👤 Added player: ${playerData.name} (${sessionId})`);
    } catch (error) {
      console.error('❌ Error adding player:', error);
    }
  }

  public removePlayer(sessionId: string): void {
    const player = this.players.get(sessionId);
    if (player) {
      try {
        player.destroy();
        this.players.delete(sessionId);
        console.log(`👤 Removed player: ${sessionId}`);
      } catch (error) {
        console.error('❌ Error removing player:', error);
      }
    }
  }

  public updatePlayer(sessionId: string, playerData: Partial<PlayerData>): void {
    const player = this.players.get(sessionId);
    if (!player) return;

    try {
      if (playerData.x !== undefined && playerData.y !== undefined) {
        player.updatePosition(playerData.x, playerData.y);
      }

      if (playerData.direction !== undefined) {
        player.updateDirection(playerData.direction);
      }

      if (playerData.character !== undefined) {
        player.changeCharacter(playerData.character);
      }

      if (playerData.level !== undefined) {
        player.updateLevel(playerData.level);
      }

      if (playerData.name !== undefined) {
        player.updateName(playerData.name);
      }
    } catch (error) {
      console.error('❌ Error updating player:', error);
    }
  }

  public getPlayer(sessionId: string): Player | undefined {
    return this.players.get(sessionId);
  }

  public getCurrentPlayer(): Player | undefined {
    if (!this.currentPlayerId) return undefined;
    return this.players.get(this.currentPlayerId);
  }

  public getAllPlayers(): Map<string, Player> {
    return new Map(this.players);
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public moveCurrentPlayer(direction: string): void {
    if (!this.currentPlayerId) return;
    
    const player = this.players.get(this.currentPlayerId);
    if (player) {
      player.updateDirection(direction);
    }
  }

  public cleanup(): void {
    this.players.forEach((player, sessionId) => {
      try {
        player.destroy();
      } catch (error) {
        console.error(`❌ Error cleaning up player ${sessionId}:`, error);
      }
    });
    this.players.clear();
    this.currentPlayerId = null;
  }

  // Debug methods
  public logPlayerStats(): void {
    console.log(`📊 PlayerManager Stats:`);
    console.log(`  - Total players: ${this.players.size}`);
    console.log(`  - Current player: ${this.currentPlayerId}`);
    this.players.forEach((player, sessionId) => {
      console.log(`  - ${sessionId}: ${player.name} at (${player.x}, ${player.y})`);
    });
  }
}