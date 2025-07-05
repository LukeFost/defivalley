import { CharacterConfig, CharacterType, Direction } from './character.config';

export interface PlayerInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  character: CharacterType;
  direction: Direction;
  isCurrentPlayer: boolean;
  level?: number;
  xp?: number;
}

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameplate: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Text;
  private playerInfo: PlayerInfo;

  constructor(scene: Phaser.Scene, x: number, y: number, playerInfo: PlayerInfo) {
    super(scene, x, y);
    
    this.playerInfo = playerInfo;
    
    // Create sprite
    this.sprite = scene.add.sprite(0, 0, CharacterConfig.player.key);
    this.updateSprite();
    
    // Create nameplate
    this.nameplate = scene.add.text(0, -40, playerInfo.name, {
      fontSize: '12px',
      color: playerInfo.isCurrentPlayer ? '#00ff00' : '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.nameplate.setOrigin(0.5, 0.5);
    
    // Create level badge
    this.badge = scene.add.text(20, -20, `L${playerInfo.level || 1}`, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 3, y: 1 },
    });
    this.badge.setOrigin(0.5, 0.5);
    
    // Add elements to container
    this.add([this.sprite, this.nameplate, this.badge]);
    
    // Add container to scene
    scene.add.existing(this);
    
    // Set initial position
    this.setPosition(x, y);
  }

  private updateSprite(): void {
    const config = CharacterConfig.player;
    const characterIndex = config.characters[this.playerInfo.character];
    const directionIndex = config.directions[this.playerInfo.direction];
    
    // Calculate the frame index based on character and direction
    const frameIndex = characterIndex * config.framesPerCharacter + directionIndex;
    this.sprite.setFrame(frameIndex);
  }

  public updatePosition(x: number, y: number): void {
    this.setPosition(x, y);
  }

  public updateDirection(direction: Direction): void {
    this.playerInfo.direction = direction;
    this.updateSprite();
  }

  public updateLevel(level: number): void {
    this.playerInfo.level = level;
    this.badge.setText(`L${level}`);
  }

  public updateName(name: string): void {
    this.playerInfo.name = name;
    this.nameplate.setText(name);
  }

  public changeCharacter(newCharacter: CharacterType): void {
    this.playerInfo.character = newCharacter;
    this.updateSprite();
    console.log(`🎭 Player ${this.playerInfo.name} changed character to ${newCharacter}`);
  }

  public getPlayerInfo(): PlayerInfo {
    return { ...this.playerInfo };
  }

  public highlight(isCurrentPlayer: boolean): void {
    this.playerInfo.isCurrentPlayer = isCurrentPlayer;
    this.nameplate.setColor(isCurrentPlayer ? '#00ff00' : '#ffffff');
  }

  public destroy(): void {
    // Clean up all child objects
    this.sprite.destroy();
    this.nameplate.destroy();
    this.badge.destroy();
    super.destroy();
  }
}