# MovementSystem

A modular and testable movement system extracted from the MainScene to handle player input and movement logic.

## Features

- **Frame-rate independent movement**: Consistent movement speed regardless of frame rate
- **Collision detection integration**: Pluggable collision checking
- **Event-driven architecture**: Emits movement and sync events
- **World boundary enforcement**: Prevents players from moving outside world bounds
- **Network synchronization**: Throttled position updates for multiplayer
- **Clean separation of concerns**: Movement logic isolated from scene management

## Usage

```typescript
import { MovementSystem } from './systems/MovementSystem';

// Initialize the movement system
const movementSystem = new MovementSystem({
  worldWidth: 3200,
  worldHeight: 2400,
  baseSpeed: 540, // pixels per second
  playerBoundarySize: 16 // half the player's collision box
});

// Listen for movement events
movementSystem.on('movement', (data) => {
  console.log(`Player ${data.playerId} moved to ${data.x}, ${data.y}`);
});

// Listen for network sync events
movementSystem.on('sync-position', (data) => {
  // Send position to server
  room.send('move', data);
});

// In your update loop
const input = MovementSystem.getInputFromKeyboard(cursors, wasd);
const update = movementSystem.processInput(
  currentPlayer,
  input,
  delta,
  (x, y) => checkCollision(x, y)
);

// The player position and state are automatically updated
```

## API

### Constructor Options

- `worldWidth`: The width of the game world in pixels
- `worldHeight`: The height of the game world in pixels
- `baseSpeed`: Movement speed in pixels per second (default: 540)
- `playerBoundarySize`: Half the player's collision box size (default: 16)

### Methods

#### `processInput(player, input, delta, collisionCheck)`
Processes movement input and updates player position.

- `player`: The Player instance to move
- `input`: MovementInput object with boolean direction flags
- `delta`: Frame time in milliseconds
- `collisionCheck`: Function that returns true if position has collision

Returns: `MovementUpdate` object with final position and movement state

#### `static getInputFromKeyboard(cursors, wasd)`
Converts Phaser keyboard state to MovementInput object.

#### `static isAnyMovementKeyPressed(input)`
Returns true if any movement key is pressed.

#### `getCollisionBounds(x, y)`
Returns the four corner points of the player's collision box.

#### `updateConfig(config)`
Updates the movement system configuration.

#### `reset()`
Resets the movement state to defaults.

### Events

- `movement`: Emitted when player moves with `{playerId, x, y, direction}`
- `sync-position`: Emitted when position should be synced over network with `{x, y}`

## Testing

The MovementSystem is fully testable without requiring a running Phaser instance:

```typescript
import { MovementSystem } from '../MovementSystem';

// Create a mock player
const mockPlayer = {
  getPlayerInfo: () => ({ id: 'test', x: 100, y: 100 }),
  setPosition: jest.fn(),
  updateDirection: jest.fn(),
  updateMovementState: jest.fn()
};

// Test movement
const system = new MovementSystem({ worldWidth: 1000, worldHeight: 800 });
const result = system.processInput(
  mockPlayer,
  { left: true, right: false, up: false, down: false },
  16, // 60fps
  () => false // no collision
);

expect(result.moved).toBe(true);
expect(result.direction).toBe('left');
```

## Design Decisions

1. **Event-driven**: Uses EventEmitter for loose coupling with other systems
2. **Pure functions**: Most logic is pure and testable
3. **Configurable**: All parameters can be adjusted at runtime
4. **Network-aware**: Built-in throttling for network synchronization
5. **Collision-agnostic**: Accepts any collision checking function

## Future Enhancements

- Add acceleration/deceleration for smoother movement
- Support for different movement speeds (walk/run)
- Diagonal movement speed normalization
- Input buffering for better responsiveness
- Movement prediction for network lag compensation