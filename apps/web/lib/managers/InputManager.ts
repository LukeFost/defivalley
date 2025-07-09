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

  public setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
  }

  public update(delta: number): void {
    const currentPlayer = this.playerManager.getCurrentPlayer();
    if (!currentPlayer) return;

    // Speed scaled up to compensate for delta time multiplication
    const speed = GameConfig.PLAYER_SPEED;
    const moveDistance = speed * (delta / 1000);
    let moved = false;
    let newX = currentPlayer.x;
    let newY = currentPlayer.y;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      if (!this.collisionManager.isPositionSolid(newX - moveDistance, newY)) {
        newX -= moveDistance;
        moved = true;
        this.lastDirection = 'left';
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      if (!this.collisionManager.isPositionSolid(newX + moveDistance, newY)) {
        newX += moveDistance;
        moved = true;
        this.lastDirection = 'right';
      }
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      if (!this.collisionManager.isPositionSolid(newX, newY - moveDistance)) {
        newY -= moveDistance;
        moved = true;
        this.lastDirection = 'up';
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      if (!this.collisionManager.isPositionSolid(newX, newY + moveDistance)) {
        newY += moveDistance;
        moved = true;
        this.lastDirection = 'down';
      }
    }

    if (moved) {
      this.playerManager.movePlayer(this.lastDirection as any, 0); // Speed is handled here
      currentPlayer.setPosition(newX, newY);
    } else {
      this.playerManager.stopPlayer();
    }
  }
}