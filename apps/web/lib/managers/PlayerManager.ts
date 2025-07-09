import { Player, PlayerInfo } from '../Player';
import { CharacterType } from '../character.config';
import { NetworkManager } from './NetworkManager';

export class PlayerManager {
  private scene: Phaser.Scene;
  private players: Map<string, Player> = new Map();
  private currentPlayer!: Player;
  private networkManager: NetworkManager;

  constructor(scene: Phaser.Scene, networkManager: NetworkManager) {
    this.scene = scene;
    this.networkManager = networkManager;
  }

  public addPlayer(sessionId: string, playerInfo: any, isCurrentPlayer: boolean): void {
    if (this.players.has(sessionId)) return;

    const characterType: CharacterType = 'cowboy'; // Simplified
    const newPlayerInfo: PlayerInfo = {
      id: sessionId,
      name: playerInfo.name,
      x: playerInfo.x,
      y: playerInfo.y,
      character: characterType,
      direction: 'down',
      isCurrentPlayer,
      level: playerInfo.level || 1,
      xp: playerInfo.xp || 0
    };

    const playerObject = new Player(this.scene, playerInfo.x, playerInfo.y, newPlayerInfo);
    this.players.set(sessionId, playerObject);

    if (isCurrentPlayer) {
      this.currentPlayer = playerObject;
      this.scene.cameras.main.startFollow(this.currentPlayer, true, 0.1, 0.1);
    }
  }

  public removePlayer(sessionId: string): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.destroy();
      this.players.delete(sessionId);
    }
  }

  public updatePlayer(sessionId: string, playerData: any): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.updatePosition(playerData.x, playerData.y);
    }
  }

  public movePlayer(direction: 'left' | 'right' | 'up' | 'down', speed: number): void {
    if (!this.currentPlayer) return;

    let newX = this.currentPlayer.x;
    let newY = this.currentPlayer.y;

    switch (direction) {
      case 'left': newX -= speed; break;
      case 'right': newX += speed; break;
      case 'up': newY -= speed; break;
      case 'down': newY += speed; break;
    }

    this.currentPlayer.updatePosition(newX, newY);
    this.currentPlayer.updateDirection(direction);
    this.currentPlayer.updateMovementState(true);
    this.networkManager.send('move', { x: newX, y: newY });
  }

  public stopPlayer(): void {
    if (this.currentPlayer) {
      this.currentPlayer.updateMovementState(false);
    }
  }

  public getCurrentPlayer(): Player | undefined {
    return this.currentPlayer;
  }
}