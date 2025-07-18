import { EventEmitter } from 'events';

// Define all game events with their payload types
export interface GameEvents {
  // Player events
  'player:moved': { playerId: string; x: number; y: number; timestamp: number };
  'player:joined': { playerId: string; username: string; character: string };
  'player:left': { playerId: string };
  'player:levelUp': { playerId: string; newLevel: number; oldLevel: number };
  'player:characterChanged': { playerId: string; newCharacter: string; oldCharacter: string };
  
  // Crop events
  'crop:planted': { cropId: string; playerId: string; x: number; y: number; seedType: string };
  'crop:harvested': { cropId: string; playerId: string; yield: number; experience: number };
  'crop:growth': { cropId: string; stage: number; progress: number };
  'crop:watered': { cropId: string; playerId: string };
  
  // UI events
  'ui:menuOpened': { menuType: string; position?: { x: number; y: number } };
  'ui:menuClosed': { menuType: string };
  'ui:dialogOpened': { dialogType: string; data?: any };
  'ui:dialogClosed': { dialogType: string; result?: any };
  'ui:notificationShown': { message: string; type: 'info' | 'success' | 'warning' | 'error' };
  
  // Chat events
  'chat:message': { playerId: string; message: string; timestamp: number };
  'chat:opened': void;
  'chat:closed': void;
  
  // Camera events
  'camera:moved': { x: number; y: number; zoom: number };
  'camera:zoomed': { oldZoom: number; newZoom: number };
  'camera:followStarted': { targetId: string };
  'camera:followStopped': void;
  
  // World events
  'world:loaded': { worldId: string; width: number; height: number };
  'world:tileChanged': { x: number; y: number; oldTile: string; newTile: string };
  'world:decorationAdded': { decorationId: string; x: number; y: number; type: string };
  'world:decorationRemoved': { decorationId: string };
  
  // Network events
  'network:connected': { serverId: string; latency: number };
  'network:disconnected': { reason: string };
  'network:reconnecting': { attempt: number; maxAttempts: number };
  'network:latencyUpdate': { latency: number };
  
  // System events
  'system:error': { error: Error; context?: string };
  'system:initialized': { systemName: string };
  'system:shutdown': { systemName: string };
  'system:performanceWarning': { fps: number; memory: number };
  
  // Transaction events
  'transaction:started': { txId: string; type: string; chain: string };
  'transaction:confirmed': { txId: string; hash: string; confirmations: number };
  'transaction:failed': { txId: string; error: string };
  'transaction:retry': { txId: string; attempt: number };
}

// Type-safe event handler type
type EventHandler<T = any> = (payload: T) => void | Promise<void>;

// EventBus singleton class
export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;
  private eventHistory: Map<keyof GameEvents, Array<{ payload: any; timestamp: number }>>;
  private maxHistorySize: number = 100;
  
  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Increase max listeners for game systems
    this.eventHistory = new Map();
  }
  
  // Get singleton instance
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  // Subscribe to an event with type safety
  on<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>
  ): () => void {
    this.emitter.on(event, handler);
    
    // Return unsubscribe function
    return () => {
      this.emitter.off(event, handler);
    };
  }
  
  // Subscribe to an event once
  once<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>
  ): void {
    this.emitter.once(event, handler);
  }
  
  // Emit an event with type safety
  emit<K extends keyof GameEvents>(
    event: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    // Add to history and emit
    if (args.length > 0) {
      this.addToHistory(event, args[0] as GameEvents[K]);
      this.emitter.emit(event, args[0]);
    } else {
      this.emitter.emit(event);
    }
  }
  
  // Emit an event and wait for all handlers to complete
  async emitAsync<K extends keyof GameEvents>(
    event: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): Promise<void> {
    // Add to history
    if (args.length > 0) {
      this.addToHistory(event, args[0] as GameEvents[K]);
    }
    
    // Get all listeners
    const listeners = this.emitter.listeners(event) as EventHandler[];
    
    // Execute all handlers and wait for completion
    await Promise.all(
      listeners.map(listener => 
        Promise.resolve(listener(args[0]))
      )
    );
  }
  
  // Remove all listeners for an event
  removeAllListeners<K extends keyof GameEvents>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
  
  // Get the number of listeners for an event
  listenerCount<K extends keyof GameEvents>(event: K): number {
    return this.emitter.listenerCount(event);
  }
  
  // Get event history
  getHistory<K extends keyof GameEvents>(
    event: K,
    limit?: number
  ): Array<{ payload: GameEvents[K]; timestamp: number }> {
    const history = this.eventHistory.get(event) || [];
    return limit ? history.slice(-limit) : history;
  }
  
  // Clear event history
  clearHistory<K extends keyof GameEvents>(event?: K): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }
  
  // Add event to history
  private addToHistory<K extends keyof GameEvents>(
    event: K,
    payload: GameEvents[K]
  ): void {
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }
    
    const history = this.eventHistory.get(event)!;
    history.push({
      payload,
      timestamp: Date.now()
    });
    
    // Trim history if it exceeds max size
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }
  
  // Debug: Log all active event listeners
  debugListeners(): void {
    console.log('=== EventBus Active Listeners ===');
    const events = this.emitter.eventNames() as (keyof GameEvents)[];
    events.forEach(event => {
      console.log(`${event}: ${this.listenerCount(event)} listeners`);
    });
  }
  
  // Debug: Log event history
  debugHistory(): void {
    console.log('=== EventBus Event History ===');
    this.eventHistory.forEach((history, event) => {
      console.log(`${event}: ${history.length} events recorded`);
      if (history.length > 0) {
        const latest = history[history.length - 1];
        console.log(`  Latest: ${new Date(latest.timestamp).toISOString()}`);
      }
    });
  }
}

// Export singleton instance for convenience
export const eventBus = EventBus.getInstance();

// Helper type for extracting event payload type
export type EventPayload<K extends keyof GameEvents> = GameEvents[K];

// Helper decorator for auto-subscribing class methods to events
export function Subscribe<K extends keyof GameEvents>(event: K) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    // Store metadata for later subscription
    if (!target._eventSubscriptions) {
      target._eventSubscriptions = [];
    }
    
    target._eventSubscriptions.push({
      event,
      method: propertyKey
    });
    
    return descriptor;
  };
}

// Mixin for classes that want to use the Subscribe decorator
export function EventSubscriber<T extends new (...args: any[]) => any>(Base: T) {
  return class extends Base {
    private _unsubscribers: Array<() => void> = [];
    
    constructor(...args: any[]) {
      super(...args);
      
      // Set up subscriptions from decorator metadata
      const subscriptions = (this as any)._eventSubscriptions || [];
      subscriptions.forEach(({ event, method }: any) => {
        const unsubscribe = eventBus.on(event, this[method].bind(this));
        this._unsubscribers.push(unsubscribe);
      });
    }
    
    // Clean up subscriptions
    destroy() {
      this._unsubscribers.forEach(unsubscribe => unsubscribe());
      this._unsubscribers = [];
      
      // Call parent destroy if it exists
      if (super.destroy) {
        super.destroy();
      }
    }
  };
}