import { CharacterConfig, CharacterType, Direction, isKnightCharacter } from './character.config';

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
    
    // Create sprite based on character type
    if (isKnightCharacter(playerInfo.character)) {
      this.sprite = scene.add.sprite(0, 0, CharacterConfig.knight.key);
    } else {
      this.sprite = scene.add.sprite(0, 0, CharacterConfig.player.key);
    }
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
    if (isKnightCharacter(this.playerInfo.character)) {
      // Knight character uses different sprite handling
      const knightConfig = CharacterConfig.knight;
      const animationState = knightConfig.directions[this.playerInfo.direction];
      
      // For knight, we'll use frame 0 for idle and frame 1 for run (simplified)
      const frameIndex = animationState === 'idle' ? 0 : 1;
      this.sprite.setFrame(frameIndex);
    } else {
      // Regular character sprite handling
      const config = CharacterConfig.player;
      const characterIndex = config.characters[this.playerInfo.character as keyof typeof config.characters];
      const directionIndex = config.directions[this.playerInfo.direction];
      
      // Calculate the frame index based on character and direction
      const frameIndex = characterIndex * config.framesPerCharacter + directionIndex;
      this.sprite.setFrame(frameIndex);
    }
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
    const wasKnight = isKnightCharacter(this.playerInfo.character);
    const isNewKnight = isKnightCharacter(newCharacter);
    
    // If switching between knight and regular characters, we need to change the sprite texture
    if (wasKnight !== isNewKnight) {
      const newTexture = isNewKnight ? CharacterConfig.knight.key : CharacterConfig.player.key;
      this.sprite.setTexture(newTexture);
    }
    
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