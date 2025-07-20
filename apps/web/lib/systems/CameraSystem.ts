import * as Phaser from 'phaser';
import { GameConfig } from '../GameConfig';

interface CameraSystemConfig {
  worldWidth: number;
  worldHeight: number;
  lerpFactor: number;
  deadzone?: Phaser.Geom.Rectangle;
  debugMode?: boolean;
}

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class CameraSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private config: CameraSystemConfig;
  private previousViewport: ViewportBounds;
  private currentViewport: ViewportBounds;
  private significantMoveThreshold: number = 100; // Pixels before emitting significant move event
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private followTarget?: Phaser.GameObjects.GameObject;
  private smoothFollowEnabled: boolean = true;
  private debugControlsEnabled: boolean = false;
  private debugCameraSpeed: number = 300;

  constructor(scene: Phaser.Scene, config?: Partial<CameraSystemConfig>) {
    super();
    this.scene = scene;
    this.camera = scene.cameras.main;
    
    // Merge config with defaults
    this.config = {
      worldWidth: config?.worldWidth || GameConfig.world.width,
      worldHeight: config?.worldHeight || GameConfig.world.height,
      lerpFactor: config?.lerpFactor || GameConfig.camera.lerpFactor,
      deadzone: config?.deadzone,
      debugMode: config?.debugMode || false
    };

    // Initialize viewport tracking
    this.currentViewport = this.getViewportBounds();
    this.previousViewport = { ...this.currentViewport };

    this.setupCamera();
  }

  /**
   * Setup camera bounds and initial configuration
   */
  private setupCamera(): void {
    // Set world bounds for the camera
    this.camera.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
    
    // Set up lerp for smooth following
    this.camera.setLerp(this.config.lerpFactor, this.config.lerpFactor);
    
    // Set up deadzone if provided
    if (this.config.deadzone) {
      this.camera.setDeadzone(this.config.deadzone.width, this.config.deadzone.height);
    }

    // Enable debug mode if requested
    if (this.config.debugMode) {
      this.enableDebugMode();
    }
  }

  /**
   * Start following a game object with smooth camera movement
   */
  public startFollow(target: Phaser.GameObjects.GameObject, roundPixels: boolean = true): void {
    this.followTarget = target;
    this.camera.startFollow(target, roundPixels, this.config.lerpFactor, this.config.lerpFactor);
    this.emit('follow-started', target);
  }

  /**
   * Stop following the current target
   */
  public stopFollow(): void {
    this.camera.stopFollow();
    this.followTarget = undefined;
    this.emit('follow-stopped');
  }

  /**
   * Get the current camera viewport bounds with calculated edges
   */
  public getViewportBounds(): ViewportBounds {
    const bounds = this.camera.worldView;
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y,
      bottom: bounds.y + bounds.height
    };
  }

  /**
   * Get expanded viewport bounds with margin for smoother culling
   */
  public getExpandedViewportBounds(margin: number = 100): ViewportBounds {
    const bounds = this.getViewportBounds();
    return {
      x: bounds.x - margin,
      y: bounds.y - margin,
      width: bounds.width + margin * 2,
      height: bounds.height + margin * 2,
      left: bounds.left - margin,
      right: bounds.right + margin,
      top: bounds.top - margin,
      bottom: bounds.bottom + margin
    };
  }

  /**
   * Check if a point is within the camera viewport
   */
  public isPointInViewport(x: number, y: number, margin: number = 0): boolean {
    const bounds = margin > 0 ? this.getExpandedViewportBounds(margin) : this.getViewportBounds();
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  /**
   * Check if a rectangle overlaps with the camera viewport
   */
  public isRectInViewport(x: number, y: number, width: number, height: number, margin: number = 0): boolean {
    const bounds = margin > 0 ? this.getExpandedViewportBounds(margin) : this.getViewportBounds();
    return !(x + width < bounds.left || x > bounds.right || y + height < bounds.top || y > bounds.bottom);
  }

  /**
   * Update camera system - should be called in scene's update method
   */
  public update(time: number, delta: number): void {
    // Update viewport tracking
    this.previousViewport = { ...this.currentViewport };
    this.currentViewport = this.getViewportBounds();

    // Check for significant camera movement
    const dx = Math.abs(this.currentViewport.x - this.previousViewport.x);
    const dy = Math.abs(this.currentViewport.y - this.previousViewport.y);
    
    if (dx > this.significantMoveThreshold || dy > this.significantMoveThreshold) {
      this.emit('significant-move', this.currentViewport, this.previousViewport);
    }

    // Handle debug camera controls if enabled
    if (this.debugControlsEnabled) {
      this.handleDebugControls(delta);
    }

    // Update debug graphics if enabled
    if (this.debugGraphics) {
      this.updateDebugGraphics();
    }

    // Always emit viewport update for listeners
    this.emit('viewport-update', this.currentViewport);
  }

  /**
   * Set camera zoom level with optional animation
   */
  public setZoom(zoom: number, duration: number = 0): void {
    if (duration > 0) {
      this.scene.tweens.add({
        targets: this.camera,
        zoom: zoom,
        duration: duration,
        ease: 'Power2'
      });
    } else {
      this.camera.setZoom(zoom);
    }
    this.emit('zoom-changed', zoom);
  }

  /**
   * Pan camera to a specific position
   */
  public panTo(x: number, y: number, duration: number = 1000, callback?: () => void): void {
    this.stopFollow();
    
    this.scene.tweens.add({
      targets: this.camera,
      scrollX: x - this.camera.width / 2,
      scrollY: y - this.camera.height / 2,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        this.emit('pan-complete', { x, y });
        if (callback) callback();
      }
    });
  }

  /**
   * Shake the camera with configurable parameters
   */
  public shake(duration: number = 100, intensity: number = 5): void {
    this.camera.shake(duration, intensity);
    this.emit('shake', { duration, intensity });
  }

  /**
   * Flash the camera with a color
   */
  public flash(duration: number = 100, color: number = 0xffffff, alpha: number = 1): void {
    this.camera.flash(duration, color, alpha);
    this.emit('flash', { duration, color, alpha });
  }

  /**
   * Fade the camera in or out
   */
  public fade(fadeIn: boolean, duration: number = 1000, color: number = 0x000000, callback?: () => void): void {
    if (fadeIn) {
      this.camera.fadeIn(duration, color, color, color);
    } else {
      this.camera.fadeOut(duration, color, color, color);
    }
    
    this.scene.time.delayedCall(duration, () => {
      this.emit('fade-complete', { fadeIn, duration, color });
      if (callback) callback();
    });
  }

  /**
   * Set camera bounds
   */
  public setBounds(x: number, y: number, width: number, height: number): void {
    this.camera.setBounds(x, y, width, height);
    this.config.worldWidth = width;
    this.config.worldHeight = height;
    this.emit('bounds-changed', { x, y, width, height });
  }

  /**
   * Set camera lerp (smoothing) factor
   */
  public setLerp(x: number, y?: number): void {
    const lerpY = y !== undefined ? y : x;
    this.camera.setLerp(x, lerpY);
    this.config.lerpFactor = x;
    this.emit('lerp-changed', { x, y: lerpY });
  }

  /**
   * Toggle smooth follow on/off
   */
  public toggleSmoothFollow(): void {
    this.smoothFollowEnabled = !this.smoothFollowEnabled;
    if (this.smoothFollowEnabled) {
      this.camera.setLerp(this.config.lerpFactor, this.config.lerpFactor);
    } else {
      this.camera.setLerp(1, 1); // Instant follow
    }
    this.emit('smooth-follow-toggled', this.smoothFollowEnabled);
  }

  /**
   * Enable debug mode with visual helpers
   */
  public enableDebugMode(): void {
    if (!this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(9999);
    }
    this.config.debugMode = true;
    this.emit('debug-mode-enabled');
  }

  /**
   * Disable debug mode
   */
  public disableDebugMode(): void {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = undefined;
    }
    this.config.debugMode = false;
    this.debugControlsEnabled = false;
    this.emit('debug-mode-disabled');
  }

  /**
   * Toggle debug camera controls (WASD/Arrows for manual camera movement)
   */
  public toggleDebugControls(): void {
    this.debugControlsEnabled = !this.debugControlsEnabled;
    if (this.debugControlsEnabled) {
      this.stopFollow();
      console.log('🎥 Debug camera controls enabled - Use WASD/Arrows to move camera manually');
    } else if (this.followTarget) {
      this.startFollow(this.followTarget);
      console.log('🎥 Debug camera controls disabled - Camera following restored');
    }
    this.emit('debug-controls-toggled', this.debugControlsEnabled);
  }

  /**
   * Handle debug camera controls
   */
  private handleDebugControls(delta: number): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    const speed = this.debugCameraSpeed * (delta / 1000);
    let dx = 0;
    let dy = 0;

    // Check for arrow keys or WASD
    const cursors = keyboard.createCursorKeys();
    const wasd = keyboard.addKeys('W,A,S,D') as any;

    if (cursors.left.isDown || wasd.A.isDown) dx = -speed;
    if (cursors.right.isDown || wasd.D.isDown) dx = speed;
    if (cursors.up.isDown || wasd.W.isDown) dy = -speed;
    if (cursors.down.isDown || wasd.S.isDown) dy = speed;

    if (dx !== 0 || dy !== 0) {
      this.camera.scrollX += dx;
      this.camera.scrollY += dy;
    }
  }

  /**
   * Update debug graphics overlay
   */
  private updateDebugGraphics(): void {
    if (!this.debugGraphics) return;

    this.debugGraphics.clear();

    // Draw viewport bounds
    const viewport = this.getViewportBounds();
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.5);
    this.debugGraphics.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);

    // Draw expanded viewport bounds
    const expanded = this.getExpandedViewportBounds();
    this.debugGraphics.lineStyle(1, 0xffff00, 0.3);
    this.debugGraphics.strokeRect(expanded.x, expanded.y, expanded.width, expanded.height);

    // Draw camera center
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    this.debugGraphics.lineStyle(2, 0xff0000, 0.8);
    this.debugGraphics.strokeCircle(centerX, centerY, 10);
    this.debugGraphics.beginPath();
    this.debugGraphics.moveTo(centerX - 15, centerY);
    this.debugGraphics.lineTo(centerX + 15, centerY);
    this.debugGraphics.moveTo(centerX, centerY - 15);
    this.debugGraphics.lineTo(centerX, centerY + 15);
    this.debugGraphics.strokePath();

    // Draw debug info
    const debugText = [
      `Camera: ${Math.round(viewport.x)}, ${Math.round(viewport.y)}`,
      `Zoom: ${this.camera.zoom.toFixed(2)}`,
      `Following: ${this.followTarget ? 'Yes' : 'No'}`,
      `Debug Controls: ${this.debugControlsEnabled ? 'ON' : 'OFF'}`
    ];

    // Create or update debug text
    const textKey = 'camera-debug-text';
    let debugTextObj = this.scene.children.getByName(textKey) as Phaser.GameObjects.Text;
    
    if (!debugTextObj) {
      debugTextObj = this.scene.add.text(10, 10, debugText.join('\n'), {
        fontSize: '14px',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 }
      });
      debugTextObj.setName(textKey);
      debugTextObj.setScrollFactor(0); // Keep it fixed to camera
      debugTextObj.setDepth(10000);
    } else {
      debugTextObj.setText(debugText.join('\n'));
    }
  }

  /**
   * Get camera instance for direct access if needed
   */
  public getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.camera;
  }

  /**
   * Destroy the camera system and clean up
   */
  public destroy(): void {
    this.removeAllListeners();
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
    const debugText = this.scene.children.getByName('camera-debug-text');
    if (debugText) {
      debugText.destroy();
    }
  }
}

// Export types for external use
export type { CameraSystemConfig, ViewportBounds };