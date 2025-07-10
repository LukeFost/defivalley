import { EventEmitter } from 'events';
import { Player } from '../Player';
import { GameConfig } from '../GameConfig';

export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface MovementUpdate {
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down';
  moved: boolean;
}

export interface MovementSystemConfig {
  worldWidth: number;
  worldHeight: number;
  baseSpeed?: number; // pixels per second
  playerBoundarySize?: number; // half the player's collision box size
}

export class MovementSystem extends EventEmitter {
  private config: Required<MovementSystemConfig>;
  private lastDirection: string = 'down';
  private lastSyncTime: number = 0;

  constructor(config: MovementSystemConfig) {
    super();
    
    this.config = {
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      baseSpeed: config.baseSpeed ?? 540,
      playerBoundarySize: config.playerBoundarySize ?? 16
    };
  }

  /**
   * Process keyboard input and calculate movement
   */
  processInput(
    player: Player,
    input: MovementInput,
    delta: number,
    collisionCheck: (x: number, y: number) => boolean
  ): MovementUpdate {
    const speed = (this.config.baseSpeed * delta) / 1000; // Convert to pixels per frame
    const currentPos = player.getPlayerInfo();
    
    let newX = currentPos.x;
    let newY = currentPos.y;
    let moved = false;
    let newDirection = this.lastDirection;

    // Process horizontal movement
    if (input.left) {
      const potentialX = Math.max(20, newX - speed);
      if (!collisionCheck(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'left';
      }
    } else if (input.right) {
      const potentialX = Math.min(this.config.worldWidth - 20, newX + speed);
      if (!collisionCheck(potentialX, newY)) {
        newX = potentialX;
        moved = true;
        newDirection = 'right';
      }
    }

    // Process vertical movement
    if (input.up) {
      const potentialY = Math.max(20, newY - speed);
      if (!collisionCheck(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'up';
      }
    } else if (input.down) {
      const potentialY = newY + speed;
      if (!collisionCheck(newX, potentialY)) {
        newY = potentialY;
        moved = true;
        newDirection = 'down';
      }
    }

    this.lastDirection = newDirection;

    const update: MovementUpdate = {
      x: newX,
      y: newY,
      direction: newDirection as any,
      moved
    };

    // Update player state
    player.updateDirection(newDirection as any);
    player.updateMovementState(moved);

    if (moved) {
      player.setPosition(newX, newY);
      
      // Emit movement event
      this.emit('movement', {
        playerId: player.getPlayerInfo().id,
        x: newX,
        y: newY,
        direction: newDirection
      });

      // Check if we should sync position over network
      const now = performance.now();
      if (now - this.lastSyncTime > GameConfig.network.positionSyncInterval) {
        this.emit('sync-position', { x: newX, y: newY });
        this.lastSyncTime = now;
      }
    }

    return update;
  }

  /**
   * Get movement input from Phaser keyboard state
   */
  static getInputFromKeyboard(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { [key: string]: Phaser.Input.Keyboard.Key }
  ): MovementInput {
    return {
      left: cursors.left.isDown || wasd.A.isDown,
      right: cursors.right.isDown || wasd.D.isDown,
      up: cursors.up.isDown || wasd.W.isDown,
      down: cursors.down.isDown || wasd.S.isDown
    };
  }

  /**
   * Check if any movement keys are pressed
   */
  static isAnyMovementKeyPressed(input: MovementInput): boolean {
    return input.left || input.right || input.up || input.down;
  }

  /**
   * Calculate collision bounds for a position
   */
  getCollisionBounds(x: number, y: number): { x: number, y: number }[] {
    const size = this.config.playerBoundarySize;
    return [
      { x: x - size, y: y - size }, // Top-left
      { x: x + size, y: y - size }, // Top-right
      { x: x - size, y: y + size }, // Bottom-left
      { x: x + size, y: y + size }  // Bottom-right
    ];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MovementSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current direction
   */
  getLastDirection(): string {
    return this.lastDirection;
  }

  /**
   * Reset movement state
   */
  reset(): void {
    this.lastDirection = 'down';
    this.lastSyncTime = 0;
  }
}