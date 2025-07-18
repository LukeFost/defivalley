import { Scene } from 'phaser';

export interface TouchControlsConfig {
  joystick?: {
    enabled: boolean;
    position: 'fixed' | 'dynamic';
    x?: number;
    y?: number;
    radius: number;
    deadZone: number;
  };
  buttons?: {
    action: boolean;
    chat: boolean;
    menu: boolean;
  };
  gestures?: {
    pinchZoom: boolean;
    swipePan: boolean;
    doubleTapZoom: boolean;
  };
}

export interface JoystickData {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export class TouchInputManager {
  private scene: Scene;
  private config: TouchControlsConfig;
  private controls: Map<string, Phaser.GameObjects.GameObject>;
  private isVisible: boolean = false;
  private eventListeners: { [key: string]: ((data: any) => void)[] } = {};
  
  // Joystick state
  private isDragging: boolean = false;
  private joystickBase?: Phaser.GameObjects.Container;
  private joystickThumb?: Phaser.GameObjects.Circle;
  private dragStartPos = { x: 0, y: 0 };
  
  constructor(scene: Scene, config: TouchControlsConfig) {
    this.scene = scene;
    this.config = config;
    this.controls = new Map();
    
    this.setupTouchHandling();
  }
  
  private setupTouchHandling(): void {
    // Enable multi-touch
    this.scene.input.addPointer(3); // Support up to 4 simultaneous touches
    
    // Set up gesture recognition
    if (this.config.gestures?.pinchZoom) {
      this.setupPinchZoom();
    }
    
    if (this.config.gestures?.swipePan) {
      this.setupSwipePan();
    }
  }
  
  createControls(): void {
    if (this.config.joystick?.enabled) {
      this.createJoystick();
    }
    
    if (this.config.buttons?.action) {
      this.createActionButton();
    }
    
    if (this.config.buttons?.chat) {
      this.createChatButton();
    }
    
    if (this.config.buttons?.menu) {
      this.createMenuButton();
    }
    
    this.setControlsVisibility(true);
  }
  
  private createJoystick(): void {
    const config = this.config.joystick!;
    
    // Create joystick container
    const container = this.scene.add.container(
      config.x || 150,
      config.y || this.scene.cameras.main.height - 150
    );
    
    // Create base
    const base = this.scene.add.circle(0, 0, config.radius, 0x000000, 0.3);
    base.setStrokeStyle(2, 0xffffff, 0.5);
    
    // Create thumb
    const thumb = this.scene.add.circle(0, 0, config.radius * 0.5, 0xffffff, 0.5);
    
    container.add([base, thumb]);
    container.setScrollFactor(0); // Keep in place during camera movement
    container.setDepth(1000); // Above game elements
    
    // Make interactive
    const interactiveArea = this.scene.add.circle(0, 0, config.radius, 0x000000, 0);
    interactiveArea.setInteractive({ draggable: false, useHandCursor: false });
    container.add(interactiveArea);
    
    // Store references
    this.joystickBase = container;
    this.joystickThumb = thumb;
    
    // Handle touch/mouse events
    interactiveArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartPos.x = pointer.x;
      this.dragStartPos.y = pointer.y;
      thumb.setAlpha(0.8);
    });
    
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.joystickBase) return;
      
      // Convert pointer position to container local coordinates
      const localPos = this.joystickBase.getLocalPoint(pointer.x, pointer.y);
      const dx = localPos.x;
      const dy = localPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= config.radius) {
        thumb.x = dx;
        thumb.y = dy;
      } else {
        const angle = Math.atan2(dy, dx);
        thumb.x = Math.cos(angle) * config.radius;
        thumb.y = Math.sin(angle) * config.radius;
      }
      
      // Calculate normalized values
      const normalizedDistance = Math.min(distance / config.radius, 1);
      const normalizedX = thumb.x / config.radius;
      const normalizedY = thumb.y / config.radius;
      
      // Apply dead zone
      if (normalizedDistance > config.deadZone) {
        // Emit joystick movement event
        this.emit('joystick', {
          x: normalizedX,
          y: normalizedY,
          angle: Math.atan2(thumb.y, thumb.x),
          distance: normalizedDistance
        });
      } else {
        // Within dead zone - emit zero movement
        this.emit('joystick', { x: 0, y: 0, angle: 0, distance: 0 });
      }
    });
    
    this.scene.input.on('pointerup', () => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      thumb.x = 0;
      thumb.y = 0;
      thumb.setAlpha(0.5);
      
      this.emit('joystick', { x: 0, y: 0, angle: 0, distance: 0 });
    });
    
    this.controls.set('joystick', container);
  }
  
  private createActionButton(): void {
    const button = this.createButton(
      this.scene.cameras.main.width - 100,
      this.scene.cameras.main.height - 100,
      60,
      '🌱',
      0x4CAF50
    );
    
    button.on('pointerdown', () => {
      this.emit('action', { type: 'plant' });
      this.hapticFeedback();
    });
    
    this.controls.set('action', button);
  }
  
  private createChatButton(): void {
    const button = this.createButton(
      this.scene.cameras.main.width - 200,
      this.scene.cameras.main.height - 100,
      50,
      '💬',
      0x2196F3
    );
    
    button.on('pointerdown', () => {
      this.emit('chat', {});
      this.hapticFeedback();
    });
    
    this.controls.set('chat', button);
  }
  
  private createMenuButton(): void {
    const button = this.createButton(
      50,
      50,
      40,
      '☰',
      0x9E9E9E
    );
    
    button.on('pointerdown', () => {
      this.emit('menu', {});
      this.hapticFeedback();
    });
    
    this.controls.set('menu', button);
  }
  
  private createButton(
    x: number,
    y: number,
    size: number,
    text: string,
    color: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    // Button background
    const bg = this.scene.add.circle(0, 0, size, color, 0.7);
    bg.setStrokeStyle(3, 0xffffff, 0.8);
    
    // Button text/icon
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    label.setOrigin(0.5);
    
    container.add([bg, label]);
    container.setScrollFactor(0);
    container.setDepth(1001);
    
    // Make interactive
    const interactiveArea = this.scene.add.circle(0, 0, size, 0x000000, 0);
    interactiveArea.setInteractive();
    container.add(interactiveArea);
    
    // Visual feedback
    interactiveArea.on('pointerdown', () => {
      bg.setScale(0.9);
      bg.setAlpha(1);
    });
    
    interactiveArea.on('pointerup', () => {
      bg.setScale(1);
      bg.setAlpha(0.7);
    });
    
    interactiveArea.on('pointerout', () => {
      bg.setScale(1);
      bg.setAlpha(0.7);
    });
    
    return container;
  }
  
  private hapticFeedback(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short haptic feedback
    }
  }
  
  setControlsVisibility(visible: boolean, animate: boolean = true): void {
    this.isVisible = visible;
    
    this.controls.forEach(control => {
      if (animate) {
        this.scene.tweens.add({
          targets: control,
          alpha: visible ? 1 : 0,
          duration: 300,
          ease: 'Power2'
        });
      } else {
        control.setAlpha(visible ? 1 : 0);
      }
    });
  }
  
  updateLayout(orientation: 'portrait' | 'landscape'): void {
    const { width, height } = this.scene.cameras.main;
    
    // Update joystick position
    const joystick = this.controls.get('joystick');
    if (joystick) {
      if (orientation === 'portrait') {
        joystick.x = 150;
        joystick.y = height - 150;
      } else {
        joystick.x = 120;
        joystick.y = height / 2;
      }
    }
    
    // Update button positions
    const actionButton = this.controls.get('action');
    if (actionButton) {
      if (orientation === 'portrait') {
        actionButton.x = width - 100;
        actionButton.y = height - 100;
      } else {
        actionButton.x = width - 120;
        actionButton.y = height / 2;
      }
    }
    
    const chatButton = this.controls.get('chat');
    if (chatButton) {
      if (orientation === 'portrait') {
        chatButton.x = width - 200;
        chatButton.y = height - 100;
      } else {
        chatButton.x = width - 240;
        chatButton.y = height / 2;
      }
    }
  }
  
  private setupPinchZoom(): void {
    // Basic pinch zoom implementation
    let initialDistance = 0;
    let isZooming = false;
    
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.scene.input.activePointer && this.scene.input.pointer2.isDown) {
        const distance = Phaser.Math.Distance.Between(
          this.scene.input.activePointer.x,
          this.scene.input.activePointer.y,
          this.scene.input.pointer2.x,
          this.scene.input.pointer2.y
        );
        initialDistance = distance;
        isZooming = true;
      }
    });
    
    this.scene.input.on('pointermove', () => {
      if (isZooming && this.scene.input.activePointer && this.scene.input.pointer2.isDown) {
        const currentDistance = Phaser.Math.Distance.Between(
          this.scene.input.activePointer.x,
          this.scene.input.activePointer.y,
          this.scene.input.pointer2.x,
          this.scene.input.pointer2.y
        );
        
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(0.5, Math.min(2, this.scene.cameras.main.zoom * scale));
        this.scene.cameras.main.setZoom(newZoom);
        initialDistance = currentDistance;
      }
    });
    
    this.scene.input.on('pointerup', () => {
      isZooming = false;
    });
  }
  
  private setupSwipePan(): void {
    let startPos = { x: 0, y: 0 };
    let isPanning = false;
    
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startPos.x = pointer.x;
      startPos.y = pointer.y;
      isPanning = true;
    });
    
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isPanning && !this.isDragging) {
        const deltaX = pointer.x - startPos.x;
        const deltaY = pointer.y - startPos.y;
        
        this.scene.cameras.main.scrollX -= deltaX;
        this.scene.cameras.main.scrollY -= deltaY;
        
        startPos.x = pointer.x;
        startPos.y = pointer.y;
      }
    });
    
    this.scene.input.on('pointerup', () => {
      isPanning = false;
    });
  }
  
  isActive(): boolean {
    return this.isDragging;
  }
  
  destroy(): void {
    this.controls.forEach(control => control.destroy());
    this.controls.clear();
    this.eventListeners = {};
  }
  
  // Event emitter pattern
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }
  
  private emit(event: string, data: any): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(callback => callback(data));
  }
}