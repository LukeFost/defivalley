import { Scene } from 'phaser';

export class MobileOptimizer {
  private scene: Scene;
  private deviceTier: 'low' | 'medium' | 'high';
  
  constructor(scene: Scene, deviceTier: 'low' | 'medium' | 'high') {
    this.scene = scene;
    this.deviceTier = deviceTier;
    
    this.applyOptimizations();
  }
  
  private applyOptimizations(): void {
    switch (this.deviceTier) {
      case 'low':
        this.applyLowEndOptimizations();
        break;
      case 'medium':
        this.applyMidRangeOptimizations();
        break;
      case 'high':
        // No major optimizations needed for high-end devices
        this.applyHighEndOptimizations();
        break;
    }
  }
  
  private applyLowEndOptimizations(): void {
    console.log('🔧 Applying low-end mobile optimizations');
    
    // Reduce particle effects
    if ((this.scene as any).particles) {
      (this.scene as any).particles.setMaxParticles(50); // vs 200 on desktop
    }
    
    // Lower texture quality and disable anti-aliasing
    this.scene.game.config.antialias = false;
    
    // Reduce shadow quality
    if (this.scene.lights) {
      this.scene.lights.disable();
    }
    
    // Simplify physics
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.fps = 30; // vs 60 on desktop
    }
    
    // Reduce draw calls
    this.scene.cameras.main.setRenderToTexture(false);
    
    // Set lower render resolution
    this.scene.scale.setGameSize(
      Math.floor(this.scene.scale.gameSize.width * 0.8),
      Math.floor(this.scene.scale.gameSize.height * 0.8)
    );
  }
  
  private applyMidRangeOptimizations(): void {
    console.log('🔧 Applying mid-range mobile optimizations');
    
    // Moderate particle reduction
    if ((this.scene as any).particles) {
      (this.scene as any).particles.setMaxParticles(100);
    }
    
    // Keep most visual effects but optimize
    this.scene.cameras.main.setBackgroundColor(0x87CEEB);
    
    // Moderate physics optimization
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.fps = 45; // Slightly reduced
    }
  }
  
  private applyHighEndOptimizations(): void {
    console.log('🔧 Applying high-end mobile optimizations');
    
    // Minimal optimizations - keep full quality
    // Just ensure smooth performance
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.fps = 60;
    }
  }
  
  // Asset loading optimization
  static getOptimizedAssetPath(
    basePath: string, 
    deviceTier: 'low' | 'medium' | 'high'
  ): string {
    const suffix = {
      'low': '-mobile-low',
      'medium': '-mobile',
      'high': ''
    }[deviceTier];
    
    return basePath.replace(/\.(png|jpg|jpeg)$/i, `${suffix}.$1`);
  }
  
  // Optimize game object culling
  enableViewportCulling(gameObjects: Phaser.GameObjects.GameObject[]): void {
    const camera = this.scene.cameras.main;
    
    gameObjects.forEach(obj => {
      const bounds = (obj as any).getBounds ? (obj as any).getBounds() : { x: (obj as any).x, y: (obj as any).y, width: 32, height: 32 };
      const isInView = camera.worldView.contains(bounds.x, bounds.y) || 
                       camera.worldView.intersects(bounds);
      
      obj.setVisible(isInView);
    });
  }
  
  // Optimize texture memory
  optimizeTextures(): void {
    if (this.deviceTier === 'low') {
      // Use lower quality textures
      this.scene.textures.list.forEach(texture => {
        if (texture.setFilter) {
          texture.setFilter(Phaser.Textures.LINEAR);
        }
      });
    }
  }
  
  // Dynamic quality adjustment based on performance
  adjustQualityBasedOnFPS(currentFPS: number): void {
    if (currentFPS < 30 && this.deviceTier !== 'low') {
      console.log('⚠️ Low FPS detected, reducing quality');
      this.deviceTier = 'low';
      this.applyLowEndOptimizations();
    } else if (currentFPS > 55 && this.deviceTier === 'low') {
      console.log('✅ FPS improved, increasing quality');
      this.deviceTier = 'medium';
      this.applyMidRangeOptimizations();
    }
  }
  
  // Battery optimization
  enableBatteryOptimizations(): void {
    // Reduce frame rate when game is not in focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.scene.game.loop.targetfps = 15; // Reduce to 15 FPS when hidden
      } else {
        this.scene.game.loop.targetfps = 60; // Restore full FPS when visible
      }
    });
  }
}