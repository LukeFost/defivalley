import { Player, PlayerInfo } from '../Player';
import { CharacterType } from '../character.config';
import { NetworkManager } from './NetworkManager';
import { GameConfig } from '../GameConfig';

export class PlayerManager {
  private scene: Phaser.Scene;
  private players: Map<string, Player> = new Map();
  private currentPlayer!: Player;
  private networkManager: NetworkManager;
  private lastPlayerSync: number = 0;

  constructor(scene: Phaser.Scene, networkManager: NetworkManager) {
    this.scene = scene;
    this.networkManager = networkManager;
  }

  public addPlayer(sessionId: string, playerInfo: any, isCurrentPlayer: boolean): void {
    // Update existing player if already exists
    if (this.players.has(sessionId)) {
      this.updatePlayer(sessionId, playerInfo);
      return;
    }

    // Determine character type (this logic should match MainScene)
    const characterTypes: CharacterType[] = ['cowboy', 'pepe'];
    
    // Use player name hash for consistent character selection
    const nameHash = playerInfo.name.split('').reduce((acc: number, char: string) => {
      return acc + char.charCodeAt(0);
    }, 0);
    const characterIndex = nameHash % characterTypes.length;
    const characterType = characterTypes[characterIndex];

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
      this.scene.cameras.main.startFollow(this.currentPlayer, true, GameConfig.CAMERA_LERP_FACTOR, GameConfig.CAMERA_LERP_FACTOR);
      
      // Set initial camera bounds
      const worldWidth = (this.scene as any).worldWidth || GameConfig.SERVER_WORLD_WIDTH;
      const worldHeight = (this.scene as any).worldHeight || GameConfig.SERVER_WORLD_HEIGHT;
      this.scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    }
    
    console.log(`${isCurrentPlayer ? '👤' : '👥'} ${isCurrentPlayer ? 'You joined' : `${playerInfo.name} joined`} as ${characterType}`);
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
    
    // Throttle network updates
    const now = performance.now();
    if (now - this.lastPlayerSync > GameConfig.NETWORK_UPDATE_INTERVAL) { // Send updates max 10 times per second
      this.networkManager.send('move', { x: newX, y: newY });
      this.lastPlayerSync = now;
    }
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