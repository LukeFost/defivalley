/**
 * Phaser Test Utilities
 * 
 * Provides mock implementations and testing utilities for Phaser components
 * to enable testing without requiring a full browser environment or real Phaser game instance.
 */

import { vi } from 'vitest';

// Mock Event Emitter functionality
class MockEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return this;
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return this;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners.has(event)) return false;
    
    const callbacks = this.listeners.get(event)!;
    callbacks.forEach(callback => callback(...args));
    return callbacks.length > 0;
  }

  once(event: string, callback: Function) {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    return this.on(event, onceCallback);
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

// Mock Phaser Game Object
export class MockGameObject extends MockEventEmitter {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public visible: boolean = true;
  public active: boolean = true;
  public alpha: number = 1;
  public rotation: number = 0;
  public scaleX: number = 1;
  public scaleY: number = 1;
  public depth: number = 0;
  public scene: MockScene;
  public displayWidth: number = 0;
  public displayHeight: number = 0;

  constructor(scene: MockScene) {
    super();
    this.scene = scene;
  }

  setPosition(x: number, y?: number) {
    this.x = x;
    this.y = y ?? x;
    return this;
  }

  setSize(width: number, height?: number) {
    this.width = width;
    this.height = height ?? width;
    return this;
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    return this;
  }

  setActive(active: boolean) {
    this.active = active;
    return this;
  }

  setAlpha(alpha: number) {
    this.alpha = alpha;
    return this;
  }

  setRotation(rotation: number) {
    this.rotation = rotation;
    return this;
  }

  setScale(scaleX: number, scaleY?: number) {
    this.scaleX = scaleX;
    this.scaleY = scaleY ?? scaleX;
    return this;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  setDisplaySize(width: number, height?: number) {
    this.displayWidth = width;
    this.displayHeight = height ?? width;
    return this;
  }

  destroy() {
    this.removeAllListeners();
    this.active = false;
    this.visible = false;
  }
}

// Mock Phaser Graphics
export class MockGraphics extends MockGameObject {
  public fillColor: number = 0x000000;
  public strokeColor: number = 0x000000;
  public lineWidth: number = 1;

  clear() {
    return this;
  }

  fillStyle(color: number, alpha?: number) {
    this.fillColor = color;
    if (alpha !== undefined) this.alpha = alpha;
    return this;
  }

  lineStyle(width: number, color?: number, alpha?: number) {
    this.lineWidth = width;
    if (color !== undefined) this.strokeColor = color;
    if (alpha !== undefined) this.alpha = alpha;
    return this;
  }

  fillRect(x: number, y: number, width: number, height: number) {
    return this;
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    return this;
  }

  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    return this;
  }

  strokeRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    return this;
  }

  fillCircle(x: number, y: number, radius: number) {
    return this;
  }

  strokeCircle(x: number, y: number, radius: number) {
    return this;
  }
}

// Mock Phaser Container
export class MockContainer extends MockGameObject {
  public list: MockGameObject[] = [];

  add(child: MockGameObject | MockGameObject[]) {
    if (Array.isArray(child)) {
      child.forEach(c => this.add(c));
    } else {
      this.list.push(child);
    }
    return this;
  }

  remove(child: MockGameObject | MockGameObject[]) {
    if (Array.isArray(child)) {
      child.forEach(c => this.remove(c));
    } else {
      const index = this.list.indexOf(child);
      if (index > -1) {
        this.list.splice(index, 1);
      }
    }
    return this;
  }

  removeAll() {
    this.list.length = 0;
    return this;
  }

  getAt(index: number) {
    return this.list[index];
  }

  getByName(name: string) {
    return this.list.find((child: any) => child.name === name);
  }

  get length() {
    return this.list.length;
  }
}

// Mock Phaser Text
export class MockText extends MockGameObject {
  public text: string = '';
  public style: any = {};
  public fontSize: number = 16;
  public fontFamily: string = 'Arial';
  public color: string = '#000000';
  public align: string = 'left';

  constructor(scene: MockScene, x: number, y: number, text: string, style?: any) {
    super(scene);
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style || {};
    this.applyStyle();
  }

  setText(text: string) {
    this.text = text;
    return this;
  }

  setStyle(style: any) {
    this.style = { ...this.style, ...style };
    this.applyStyle();
    return this;
  }

  setFontSize(size: number) {
    this.fontSize = size;
    return this;
  }

  setFontFamily(family: string) {
    this.fontFamily = family;
    return this;
  }

  setColor(color: string) {
    this.color = color;
    return this;
  }

  setAlign(align: string) {
    this.align = align;
    return this;
  }

  private applyStyle() {
    if (this.style.fontSize) this.fontSize = this.style.fontSize;
    if (this.style.fontFamily) this.fontFamily = this.style.fontFamily;
    if (this.style.color) this.color = this.style.color;
    if (this.style.align) this.align = this.style.align;
  }
}

// Mock Phaser Image
export class MockImage extends MockGameObject {
  public texture: string = '';
  public frame: string | number = 0;
  public tint: number = 0xffffff;
  public flipX: boolean = false;
  public flipY: boolean = false;

  constructor(scene: MockScene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene);
    this.x = x;
    this.y = y;
    this.texture = texture;
    this.frame = frame || 0;
  }

  setTexture(texture: string, frame?: string | number) {
    this.texture = texture;
    if (frame !== undefined) this.frame = frame;
    return this;
  }

  setFrame(frame: string | number) {
    this.frame = frame;
    return this;
  }

  setTint(tint: number) {
    this.tint = tint;
    return this;
  }

  setFlipX(flipX: boolean) {
    this.flipX = flipX;
    return this;
  }

  setFlipY(flipY: boolean) {
    this.flipY = flipY;
    return this;
  }

  setOrigin(x: number, y?: number) {
    // Mock origin setting
    return this;
  }
}

// Mock Phaser Input
export class MockInput extends MockEventEmitter {
  public keyboard: MockKeyboard;
  public mouse: MockMouse;
  public activePointer: MockPointer;

  constructor() {
    super();
    this.keyboard = new MockKeyboard();
    this.mouse = new MockMouse();
    this.activePointer = new MockPointer();
  }
}

export class MockKeyboard extends MockEventEmitter {
  public keys: Map<string, MockKey> = new Map();

  addKey(key: string) {
    const mockKey = new MockKey(key);
    this.keys.set(key, mockKey);
    return mockKey;
  }

  createCursorKeys() {
    return {
      up: this.addKey('UP'),
      down: this.addKey('DOWN'),
      left: this.addKey('LEFT'),
      right: this.addKey('RIGHT'),
      space: this.addKey('SPACE'),
      shift: this.addKey('SHIFT')
    };
  }
}

export class MockKey extends MockEventEmitter {
  public isDown: boolean = false;
  public isUp: boolean = true;
  public keyCode: string;

  constructor(keyCode: string) {
    super();
    this.keyCode = keyCode;
  }

  // Test utilities
  simulateDown() {
    this.isDown = true;
    this.isUp = false;
    this.emit('down', this);
  }

  simulateUp() {
    this.isDown = false;
    this.isUp = true;
    this.emit('up', this);
  }
}

export class MockMouse extends MockEventEmitter {
  public x: number = 0;
  public y: number = 0;
}

export class MockPointer extends MockEventEmitter {
  public x: number = 0;
  public y: number = 0;
  public isDown: boolean = false;
  public justDown: boolean = false;
  public justUp: boolean = false;

  // Test utilities
  simulateDown(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.isDown = true;
    this.justDown = true;
    this.emit('pointerdown', this);
  }

  simulateUp(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.isDown = false;
    this.justUp = true;
    this.emit('pointerup', this);
  }
}

// Mock Phaser Scene Manager
export class MockSceneManager extends MockEventEmitter {
  public scenes: Map<string, MockScene> = new Map();
  public activeScene: MockScene | null = null;

  add(key: string, scene: MockScene | Function, autoStart?: boolean) {
    if (typeof scene === 'function') {
      scene = new (scene as any)();
    }
    
    const mockScene = scene as MockScene;
    mockScene.sys.key = key;
    mockScene.scene = this;
    this.scenes.set(key, mockScene);
    
    if (autoStart) {
      this.start(key);
    }
    return this;
  }

  start(key: string, data?: any) {
    const scene = this.scenes.get(key);
    if (scene) {
      this.activeScene = scene;
      scene.sys.isActive = true;
      scene.sys.isPaused = false;
      
      // Call scene lifecycle methods
      if (scene.init) scene.init(data);
      if (scene.preload) scene.preload();
      if (scene.create) scene.create(data);
      
      this.emit('start', scene);
    }
    return this;
  }

  stop(key: string) {
    const scene = this.scenes.get(key);
    if (scene) {
      scene.sys.isActive = false;
      if (this.activeScene === scene) {
        this.activeScene = null;
      }
      this.emit('stop', scene);
    }
    return this;
  }

  pause(key: string) {
    const scene = this.scenes.get(key);
    if (scene) {
      scene.sys.isPaused = true;
      this.emit('pause', scene);
    }
    return this;
  }

  resume(key: string) {
    const scene = this.scenes.get(key);
    if (scene) {
      scene.sys.isPaused = false;
      this.emit('resume', scene);
    }
    return this;
  }

  get(key: string) {
    return this.scenes.get(key);
  }

  getScene(key: string) {
    return this.scenes.get(key);
  }

  isActive(key: string) {
    const scene = this.scenes.get(key);
    return scene ? scene.sys.isActive : false;
  }

  isPaused(key: string) {
    const scene = this.scenes.get(key);
    return scene ? scene.sys.isPaused : false;
  }

  remove(key: string) {
    const scene = this.scenes.get(key);
    if (scene) {
      this.stop(key);
      this.scenes.delete(key);
    }
    return this;
  }

  getScenes(isActive?: boolean) {
    const sceneArray = Array.from(this.scenes.values());
    if (isActive !== undefined) {
      return sceneArray.filter(scene => scene.sys.isActive === isActive);
    }
    return sceneArray;
  }
}

// Mock Phaser Scene System
export class MockSceneSystem {
  public key: string = '';
  public isActive: boolean = false;
  public isPaused: boolean = false;
  public scene: MockScene;

  constructor(scene: MockScene) {
    this.scene = scene;
  }

  start(key: string, data?: any) {
    this.scene.scene.start(key, data);
  }

  stop(key?: string) {
    this.scene.scene.stop(key || this.key);
  }

  pause(key?: string) {
    this.scene.scene.pause(key || this.key);
  }

  resume(key?: string) {
    this.scene.scene.resume(key || this.key);
  }
}

// Mock Phaser Scene
export class MockScene extends MockEventEmitter {
  public sys: MockSceneSystem;
  public add: MockGameObjectFactory;
  public input: MockInput;
  public scene: MockSceneManager;
  public cameras: MockCameraManager;
  public sound: MockSoundManager;
  public tweens: MockTweenManager;
  public time: MockTimeManager;
  public children: MockDisplayList;
  public registry: MockDataManager;
  public cache: MockCacheManager;
  public load: MockLoader;

  constructor() {
    super();
    this.sys = new MockSceneSystem(this);
    this.add = new MockGameObjectFactory(this);
    this.input = new MockInput();
    this.scene = new MockSceneManager();
    this.cameras = new MockCameraManager();
    this.sound = new MockSoundManager();
    this.tweens = new MockTweenManager();
    this.time = new MockTimeManager();
    this.children = new MockDisplayList();
    this.registry = new MockDataManager();
    this.cache = new MockCacheManager();
    this.load = new MockLoader();
  }

  // Scene lifecycle methods (to be overridden by actual scenes)
  init?(data?: any): void;
  preload?(): void;
  create?(data?: any): void;
  update?(time?: number, delta?: number): void;
}

// Mock Game Object Factory
export class MockGameObjectFactory {
  public scene: MockScene;

  constructor(scene: MockScene) {
    this.scene = scene;
  }

  graphics(x?: number, y?: number) {
    const graphics = new MockGraphics(this.scene);
    if (x !== undefined) graphics.x = x;
    if (y !== undefined) graphics.y = y;
    return graphics;
  }

  container(x?: number, y?: number, children?: MockGameObject[]) {
    const container = new MockContainer(this.scene);
    if (x !== undefined) container.x = x;
    if (y !== undefined) container.y = y;
    if (children) container.add(children);
    return container;
  }

  text(x: number, y: number, text: string, style?: any) {
    return new MockText(this.scene, x, y, text, style);
  }

  image(x: number, y: number, texture: string, frame?: string | number) {
    return new MockImage(this.scene, x, y, texture, frame);
  }

  sprite(x: number, y: number, texture: string, frame?: string | number) {
    return new MockImage(this.scene, x, y, texture, frame);
  }
}

// Additional mock managers for completeness
export class MockCameraManager {
  public main: MockCamera = new MockCamera();
}

export class MockCamera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  public rotation: number = 0;

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    return this;
  }

  setRotation(rotation: number) {
    this.rotation = rotation;
    return this;
  }
}

export class MockSoundManager {
  public sounds: Map<string, MockSound> = new Map();

  add(key: string, config?: any) {
    const sound = new MockSound(key, config);
    this.sounds.set(key, sound);
    return sound;
  }

  play(key: string, config?: any) {
    const sound = this.sounds.get(key) || this.add(key);
    sound.play(config);
    return sound;
  }
}

export class MockSound {
  public key: string;
  public isPlaying: boolean = false;
  public volume: number = 1;
  public loop: boolean = false;

  constructor(key: string, config?: any) {
    this.key = key;
    if (config) {
      this.volume = config.volume || 1;
      this.loop = config.loop || false;
    }
  }

  play(config?: any) {
    this.isPlaying = true;
    if (config) {
      this.volume = config.volume || this.volume;
      this.loop = config.loop || this.loop;
    }
    return this;
  }

  stop() {
    this.isPlaying = false;
    return this;
  }

  pause() {
    this.isPlaying = false;
    return this;
  }

  resume() {
    this.isPlaying = true;
    return this;
  }

  setVolume(volume: number) {
    this.volume = volume;
    return this;
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    return this;
  }
}

export class MockTweenManager {
  public tweens: MockTween[] = [];

  add(config: any) {
    const tween = new MockTween(config);
    this.tweens.push(tween);
    return tween;
  }

  create(config: any) {
    return new MockTween(config);
  }
}

export class MockTween {
  public config: any;
  public isPlaying: boolean = false;
  public progress: number = 0;

  constructor(config: any) {
    this.config = config;
  }

  play() {
    this.isPlaying = true;
    return this;
  }

  pause() {
    this.isPlaying = false;
    return this;
  }

  stop() {
    this.isPlaying = false;
    this.progress = 0;
    return this;
  }

  restart() {
    this.progress = 0;
    this.isPlaying = true;
    return this;
  }
}

export class MockTimeManager {
  public now: number = 0;

  addEvent(config: any) {
    return new MockTimerEvent(config);
  }

  delayedCall(delay: number, callback: Function, args?: any[], callbackScope?: any) {
    return new MockTimerEvent({ delay, callback, args, callbackScope });
  }
}

export class MockTimerEvent {
  public config: any;
  public hasDispatched: boolean = false;

  constructor(config: any) {
    this.config = config;
  }

  remove() {
    this.hasDispatched = true;
  }

  destroy() {
    this.hasDispatched = true;
  }
}

export class MockDisplayList {
  public list: MockGameObject[] = [];

  add(child: MockGameObject) {
    this.list.push(child);
    return this;
  }

  remove(child: MockGameObject) {
    const index = this.list.indexOf(child);
    if (index > -1) {
      this.list.splice(index, 1);
    }
    return this;
  }

  removeAll() {
    this.list.length = 0;
    return this;
  }

  getByName(name: string) {
    return this.list.find((child: any) => child.name === name);
  }

  get length() {
    return this.list.length;
  }
}

export class MockDataManager {
  public data: Map<string, any> = new Map();

  set(key: string, value: any) {
    this.data.set(key, value);
    return this;
  }

  get(key: string) {
    return this.data.get(key);
  }

  has(key: string) {
    return this.data.has(key);
  }

  remove(key: string) {
    this.data.delete(key);
    return this;
  }

  reset() {
    this.data.clear();
    return this;
  }
}

export class MockCacheManager {
  public json: Map<string, any> = new Map();
  public image: Map<string, any> = new Map();
  public audio: Map<string, any> = new Map();

  constructor() {
    // Initialize cache stores
  }
}

export class MockLoader {
  public loadedFiles: Map<string, any> = new Map();

  json(key: string, url: string) {
    this.loadedFiles.set(key, { type: 'json', url });
    return this;
  }

  image(key: string, url: string) {
    this.loadedFiles.set(key, { type: 'image', url });
    return this;
  }

  audio(key: string, url: string) {
    this.loadedFiles.set(key, { type: 'audio', url });
    return this;
  }

  start() {
    // Simulate loading completion
    setTimeout(() => {
      this.emit('complete');
    }, 0);
  }

  on(event: string, callback: Function) {
    // Mock event listener
    return this;
  }

  emit(event: string, ...args: any[]) {
    // Mock event emission
    return this;
  }
}

// Mock Phaser Game
export class MockGame extends MockEventEmitter {
  public scene: MockSceneManager;
  public input: MockInput;
  public sound: MockSoundManager;
  public registry: MockDataManager;
  public cache: MockCacheManager;
  public config: any;
  public canvas: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;

  constructor(config?: any) {
    super();
    this.config = config || {};
    this.scene = new MockSceneManager();
    this.input = new MockInput();
    this.sound = new MockSoundManager();
    this.registry = new MockDataManager();
    this.cache = new MockCacheManager();
    
    // Mock canvas
    this.canvas = {
      width: this.config.width || 800,
      height: this.config.height || 600,
      style: {}
    } as HTMLCanvasElement;
    
    this.context = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'top'
    } as CanvasRenderingContext2D;
  }

  destroy() {
    this.scene.removeAllListeners();
    this.removeAllListeners();
  }
}

// Test Utility Functions
export class PhaserTestUtils {
  /**
   * Create a mock game instance for testing
   */
  static createMockGame(config?: any): MockGame {
    return new MockGame(config);
  }

  /**
   * Create a mock scene for testing
   */
  static createMockScene(): MockScene {
    return new MockScene();
  }

  /**
   * Create a mock scene manager with predefined scenes
   */
  static createMockSceneManager(scenes: { [key: string]: MockScene } = {}): MockSceneManager {
    const manager = new MockSceneManager();
    Object.entries(scenes).forEach(([key, scene]) => {
      manager.add(key, scene);
    });
    return manager;
  }

  /**
   * Test scene lifecycle methods
   */
  static testSceneLifecycle(scene: MockScene, data?: any) {
    const lifecycle = {
      init: vi.fn(),
      preload: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    };

    // Mock lifecycle methods
    scene.init = lifecycle.init;
    scene.preload = lifecycle.preload;
    scene.create = lifecycle.create;
    scene.update = lifecycle.update;

    // Simulate scene start
    scene.scene.start('test-scene', data);

    return lifecycle;
  }

  /**
   * Test scene configuration and key uniqueness
   */
  static testSceneConfiguration(scenes: { [key: string]: MockScene }) {
    const keys = Object.keys(scenes);
    const uniqueKeys = new Set(keys);
    
    const results = {
      totalScenes: keys.length,
      uniqueKeys: uniqueKeys.size,
      hasDuplicates: keys.length !== uniqueKeys.size,
      duplicateKeys: keys.filter((key, index) => keys.indexOf(key) !== index),
      scenes: scenes
    };

    return results;
  }

  /**
   * Simulate user input for testing
   */
  static simulateInput(scene: MockScene, inputType: 'keyboard' | 'mouse' | 'pointer', config: any) {
    switch (inputType) {
      case 'keyboard':
        const key = scene.input.keyboard.keys.get(config.key);
        if (key) {
          if (config.action === 'down') key.simulateDown();
          if (config.action === 'up') key.simulateUp();
        }
        break;
      case 'mouse':
        scene.input.mouse.x = config.x;
        scene.input.mouse.y = config.y;
        break;
      case 'pointer':
        if (config.action === 'down') {
          scene.input.activePointer.simulateDown(config.x, config.y);
        }
        if (config.action === 'up') {
          scene.input.activePointer.simulateUp(config.x, config.y);
        }
        break;
    }
  }

  /**
   * Wait for scene to complete initialization
   */
  static async waitForSceneReady(scene: MockScene, timeout: number = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (scene.sys.isActive) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };

      setTimeout(() => {
        reject(new Error(`Scene not ready within ${timeout}ms`));
      }, timeout);

      checkReady();
    });
  }

  /**
   * Mock Phaser global object for testing
   */
  static setupPhaserMocks() {
    // Mock global Phaser object
    (global as any).Phaser = {
      Scene: MockScene,
      Game: MockGame,
      GameObjects: {
        Graphics: MockGraphics,
        Container: MockContainer,
        Text: MockText,
        Image: MockImage,
        Sprite: MockImage
      },
      Input: {
        Keyboard: {
          Key: MockKey
        }
      },
      Sound: {
        BaseSound: MockSound
      },
      Tweens: {
        Tween: MockTween
      },
      Time: {
        TimerEvent: MockTimerEvent
      },
      Events: {
        EventEmitter: MockEventEmitter
      },
      AUTO: 'AUTO',
      WEBGL: 'WEBGL',
      CANVAS: 'CANVAS'
    };

    return (global as any).Phaser;
  }

  /**
   * Clean up mocks after testing
   */
  static cleanupMocks() {
    delete (global as any).Phaser;
    vi.clearAllMocks();
  }
}

// Export all mocks for direct use
export {
  MockEventEmitter,
  MockGameObject,
  MockGraphics,
  MockContainer,
  MockText,
  MockImage,
  MockInput,
  MockKeyboard,
  MockKey,
  MockMouse,
  MockPointer,
  MockSceneManager,
  MockSceneSystem,
  MockScene,
  MockGameObjectFactory,
  MockGame
};

// Default export
export default PhaserTestUtils;