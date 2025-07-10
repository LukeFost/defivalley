import { MovementSystem, MovementInput } from '../MovementSystem';
import { Player, PlayerInfo } from '../../Player';

// Mock Phaser objects
const mockScene = {
  add: {
    sprite: jest.fn().mockReturnValue({
      setScale: jest.fn(),
      setOrigin: jest.fn(),
      setBlendMode: jest.fn(),
      setFlipX: jest.fn(),
      play: jest.fn(),
      stop: jest.fn(),
      setTexture: jest.fn(),
      texture: { key: 'test' },
      frame: { name: 'test' },
      anims: { isPlaying: false }
    }),
    text: jest.fn().mockReturnValue({
      setOrigin: jest.fn(),
      setColor: jest.fn(),
      setText: jest.fn()
    }),
    existing: jest.fn(),
    graphics: jest.fn().mockReturnValue({
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      generateTexture: jest.fn(),
      destroy: jest.fn()
    })
  },
  textures: {
    exists: jest.fn().mockReturnValue(true),
    get: jest.fn().mockReturnValue({
      source: [{ width: 512, height: 512 }]
    })
  },
  anims: {
    exists: jest.fn().mockReturnValue(false),
    create: jest.fn(),
    generateFrameNumbers: jest.fn().mockReturnValue([])
  },
  time: {
    delayedCall: jest.fn()
  }
};

describe('MovementSystem', () => {
  let movementSystem: MovementSystem;
  let mockPlayer: Player;
  let mockCollisionCheck: jest.Mock;

  beforeEach(() => {
    movementSystem = new MovementSystem({
      worldWidth: 1000,
      worldHeight: 800,
      baseSpeed: 100
    });

    const playerInfo: PlayerInfo = {
      id: 'test-player',
      name: 'Test Player',
      x: 500,
      y: 400,
      character: 'cowboy',
      direction: 'down',
      isCurrentPlayer: true
    };

    mockPlayer = new Player(mockScene as any, 500, 400, playerInfo);
    mockCollisionCheck = jest.fn().mockReturnValue(false);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('processInput', () => {
    it('should move player left when left input is pressed', () => {
      const input: MovementInput = {
        left: true,
        right: false,
        up: false,
        down: false
      };

      const result = movementSystem.processInput(
        mockPlayer,
        input,
        16, // 16ms delta (60fps)
        mockCollisionCheck
      );

      expect(result.moved).toBe(true);
      expect(result.direction).toBe('left');
      expect(result.x).toBeLessThan(500);
      expect(result.y).toBe(400);
    });

    it('should move player right when right input is pressed', () => {
      const input: MovementInput = {
        left: false,
        right: true,
        up: false,
        down: false
      };

      const result = movementSystem.processInput(
        mockPlayer,
        input,
        16,
        mockCollisionCheck
      );

      expect(result.moved).toBe(true);
      expect(result.direction).toBe('right');
      expect(result.x).toBeGreaterThan(500);
      expect(result.y).toBe(400);
    });

    it('should not move when collision is detected', () => {
      mockCollisionCheck.mockReturnValue(true);

      const input: MovementInput = {
        left: true,
        right: false,
        up: false,
        down: false
      };

      const result = movementSystem.processInput(
        mockPlayer,
        input,
        16,
        mockCollisionCheck
      );

      expect(result.moved).toBe(false);
      expect(result.x).toBe(500);
      expect(result.y).toBe(400);
    });

    it('should respect world boundaries', () => {
      // Position player at left edge
      mockPlayer.setPosition(21, 400);

      const input: MovementInput = {
        left: true,
        right: false,
        up: false,
        down: false
      };

      const result = movementSystem.processInput(
        mockPlayer,
        input,
        16,
        mockCollisionCheck
      );

      expect(result.x).toBe(20); // Should stop at boundary
    });

    it('should emit movement event when player moves', (done) => {
      movementSystem.on('movement', (data) => {
        expect(data.playerId).toBe('test-player');
        expect(data.x).toBeLessThan(500);
        expect(data.y).toBe(400);
        expect(data.direction).toBe('left');
        done();
      });

      const input: MovementInput = {
        left: true,
        right: false,
        up: false,
        down: false
      };

      movementSystem.processInput(mockPlayer, input, 16, mockCollisionCheck);
    });

    it('should handle diagonal movement', () => {
      const input: MovementInput = {
        left: false,
        right: true,
        up: true,
        down: false
      };

      const result = movementSystem.processInput(
        mockPlayer,
        input,
        16,
        mockCollisionCheck
      );

      expect(result.moved).toBe(true);
      expect(result.x).toBeGreaterThan(500);
      expect(result.y).toBeLessThan(400);
    });
  });

  describe('getInputFromKeyboard', () => {
    it('should correctly map keyboard state to movement input', () => {
      const mockCursors = {
        left: { isDown: true },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false }
      };

      const mockWASD = {
        A: { isDown: false },
        D: { isDown: false },
        W: { isDown: true },
        S: { isDown: false }
      };

      const input = MovementSystem.getInputFromKeyboard(
        mockCursors as any,
        mockWASD as any
      );

      expect(input.left).toBe(true);
      expect(input.right).toBe(false);
      expect(input.up).toBe(true);
      expect(input.down).toBe(false);
    });
  });

  describe('isAnyMovementKeyPressed', () => {
    it('should return true when any movement key is pressed', () => {
      const input: MovementInput = {
        left: false,
        right: true,
        up: false,
        down: false
      };

      expect(MovementSystem.isAnyMovementKeyPressed(input)).toBe(true);
    });

    it('should return false when no movement keys are pressed', () => {
      const input: MovementInput = {
        left: false,
        right: false,
        up: false,
        down: false
      };

      expect(MovementSystem.isAnyMovementKeyPressed(input)).toBe(false);
    });
  });

  describe('getCollisionBounds', () => {
    it('should return correct collision bounds for a position', () => {
      const bounds = movementSystem.getCollisionBounds(100, 200);

      expect(bounds).toHaveLength(4);
      expect(bounds[0]).toEqual({ x: 84, y: 184 }); // Top-left
      expect(bounds[1]).toEqual({ x: 116, y: 184 }); // Top-right
      expect(bounds[2]).toEqual({ x: 84, y: 216 }); // Bottom-left
      expect(bounds[3]).toEqual({ x: 116, y: 216 }); // Bottom-right
    });
  });

  describe('sync-position event', () => {
    it('should emit sync-position event after interval threshold', (done) => {
      let eventCount = 0;
      
      movementSystem.on('sync-position', (data) => {
        eventCount++;
        expect(data.x).toBeDefined();
        expect(data.y).toBeDefined();
        
        if (eventCount === 1) {
          done();
        }
      });

      const input: MovementInput = {
        left: true,
        right: false,
        up: false,
        down: false
      };

      // First movement should trigger sync
      movementSystem.processInput(mockPlayer, input, 16, mockCollisionCheck);
      
      // Second movement within interval should not trigger sync
      movementSystem.processInput(mockPlayer, input, 16, mockCollisionCheck);
      
      // Wait and then move again after interval
      setTimeout(() => {
        movementSystem.processInput(mockPlayer, input, 16, mockCollisionCheck);
      }, 200);
    });
  });
});