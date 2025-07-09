import { PlayerManager } from './PlayerManager';
import { CollisionManager } from './CollisionManager';
import { GameConfig } from '../GameConfig';

export class InputManager {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private collisionManager: CollisionManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private lastDirection: string = 'down';

  constructor(scene: Phaser.Scene, playerManager: PlayerManager, collisionManager: CollisionManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.collisionManager = collisionManager;
  }

  public setupInput(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: { [key: string]: Phaser.Input.Keyboard.Key }): void {
    this.cursors = cursors;
    this.wasd = wasd;
  }

  public update(delta: number): void {
    const currentPlayer = this.playerManager.getCurrentPlayer();
    if (!currentPlayer) {
      console.log('[InputManager] No current player found');
      return;
    }

    // Check if input is initialized
    if (!this.cursors || !this.wasd) {
      console.log('[InputManager] Keyboard controls not initialized');
      return;
    }

    // Check if UI element is active (prevent movement when typing)
    const activeElement = document.activeElement;
    const isUIInputElementActive = 
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true' ||
      activeElement?.closest('[role="dialog"]') !== null;

    if (isUIInputElementActive) {
      this.playerManager.stopPlayer();
      return;
    }

    // Speed scaled up to compensate for delta time multiplication
    const speed = GameConfig.PLAYER_SPEED;
    const moveDistance = speed * (delta / 1000);
    let direction: string | null = null;

    // Check for movement input
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      direction = 'right';
    } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      direction = 'down';
    }

    if (direction) {
      console.log(`[InputManager] Key pressed: ${direction}, delta: ${delta}, moveDistance: ${moveDistance}`);
      
      // Calculate the new position based on direction
      let newX = currentPlayer.x;
      let newY = currentPlayer.y;

      switch (direction) {
        case 'left': newX -= moveDistance; break;
        case 'right': newX += moveDistance; break;
        case 'up': newY -= moveDistance; break;
        case 'down': newY += moveDistance; break;
      }

      // Check collision for the new position
      if (!this.collisionManager.isPositionSolid(newX, newY)) {
        console.log(`[InputManager] Moving player: direction=${direction}, distance=${moveDistance}`);
        this.playerManager.movePlayer(direction as any, moveDistance);
        this.lastDirection = direction;
      } else {
        console.log(`[InputManager] Collision detected at (${newX}, ${newY})`);
      }
    } else {
      this.playerManager.stopPlayer();
    }
  }
}