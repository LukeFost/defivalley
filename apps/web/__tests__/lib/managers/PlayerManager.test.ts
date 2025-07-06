import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerManager, PlayerData } from '../../../lib/managers/PlayerManager';
import { Player } from '../../../lib/Player';
import { MockScene, MockGameObject } from '../../utils/phaser-test-utils';

// Mock the Player class
vi.mock('../../../lib/Player', () => ({
  Player: vi.fn().mockImplementation((scene, x, y, playerInfo) => ({
    ...MockGameObject(),
    name: playerInfo.name,
    isCurrentPlayer: playerInfo.isCurrentPlayer,
    updatePosition: vi.fn(),
    updateDirection: vi.fn(),
    updateLevel: vi.fn(),
    updateName: vi.fn(),
    changeCharacter: vi.fn(),
    updateCurrentPlayerStatus: vi.fn(),
    destroy: vi.fn(),
  }))
}));

describe('PlayerManager', () => {
  let playerManager: PlayerManager;
  let mockScene: any;
  
  const mockPlayerData: PlayerData = {
    x: 100,
    y: 200,
    direction: 'down',
    character: 'knight',
    level: 5,
    name: 'TestPlayer',
    playerId: 'test-player-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = MockScene();
    playerManager = new PlayerManager(mockScene);
  });

  describe('Player Management', () => {
    it('should add a new player successfully', () => {
      const sessionId = 'session-123';
      
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      expect(playerManager.getPlayerCount()).toBe(1);
      expect(Player).toHaveBeenCalledWith(
        mockScene,
        mockPlayerData.x,
        mockPlayerData.y,
        expect.objectContaining({
          id: sessionId,
          name: mockPlayerData.name,
          character: mockPlayerData.character,
          isCurrentPlayer: false,
        })
      );
    });

    it('should set current player and update camera following', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      playerManager.setCurrentPlayer(sessionId);
      
      const player = playerManager.getCurrentPlayer();
      expect(player).toBeDefined();
      expect(mockScene.cameras.main.startFollow).toHaveBeenCalledWith(player, true, 0.1, 0.1);
    });

    it('should update existing player instead of creating duplicate', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      // Try to add same player again
      playerManager.addPlayer(sessionId, { ...mockPlayerData, level: 10 });
      
      expect(playerManager.getPlayerCount()).toBe(1);
      const player = playerManager.getPlayer(sessionId);
      expect(player?.updateLevel).toHaveBeenCalledWith(10);
    });

    it('should remove player and cleanup resources', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      expect(playerManager.getPlayerCount()).toBe(1);
      
      playerManager.removePlayer(sessionId);
      
      expect(playerManager.getPlayerCount()).toBe(0);
      expect(playerManager.getPlayer(sessionId)).toBeUndefined();
    });

    it('should update player data correctly', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      const updates = {
        x: 150,
        y: 250,
        direction: 'left' as const,
        level: 6,
      };
      
      playerManager.updatePlayer(sessionId, updates);
      
      const player = playerManager.getPlayer(sessionId);
      expect(player?.updatePosition).toHaveBeenCalledWith(150, 250);
      expect(player?.updateDirection).toHaveBeenCalledWith('left');
      expect(player?.updateLevel).toHaveBeenCalledWith(6);
    });
  });

  describe('Current Player Management', () => {
    it('should mark new current player and update previous one', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      playerManager.addPlayer(session1, mockPlayerData);
      playerManager.addPlayer(session2, { ...mockPlayerData, name: 'Player2' });
      
      playerManager.setCurrentPlayer(session1);
      const player1 = playerManager.getPlayer(session1);
      
      playerManager.setCurrentPlayer(session2);
      const player2 = playerManager.getPlayer(session2);
      
      expect(player1?.updateCurrentPlayerStatus).toHaveBeenCalledWith(false);
      expect(player2?.updateCurrentPlayerStatus).toHaveBeenCalledWith(true);
    });

    it('should return current player correctly', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      playerManager.setCurrentPlayer(sessionId);
      
      const currentPlayer = playerManager.getCurrentPlayer();
      const specificPlayer = playerManager.getPlayer(sessionId);
      
      expect(currentPlayer).toBe(specificPlayer);
    });

    it('should return undefined when no current player is set', () => {
      const currentPlayer = playerManager.getCurrentPlayer();
      expect(currentPlayer).toBeUndefined();
    });
  });

  describe('Movement and Direction', () => {
    it('should update current player direction', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      playerManager.setCurrentPlayer(sessionId);
      
      playerManager.moveCurrentPlayer('up');
      
      const player = playerManager.getCurrentPlayer();
      expect(player?.updateDirection).toHaveBeenCalledWith('up');
    });

    it('should handle movement when no current player is set', () => {
      // Should not throw error
      expect(() => {
        playerManager.moveCurrentPlayer('up');
      }).not.toThrow();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup all players and reset state', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      playerManager.addPlayer(session1, mockPlayerData);
      playerManager.addPlayer(session2, { ...mockPlayerData, name: 'Player2' });
      playerManager.setCurrentPlayer(session1);
      
      expect(playerManager.getPlayerCount()).toBe(2);
      
      playerManager.cleanup();
      
      expect(playerManager.getPlayerCount()).toBe(0);
      expect(playerManager.getCurrentPlayer()).toBeUndefined();
    });

    it('should handle cleanup errors gracefully', () => {
      const sessionId = 'session-123';
      playerManager.addPlayer(sessionId, mockPlayerData);
      
      // Mock destroy to throw an error
      const player = playerManager.getPlayer(sessionId);
      player!.destroy = vi.fn().mockImplementation(() => {
        throw new Error('Destroy failed');
      });
      
      // Should not throw error
      expect(() => {
        playerManager.cleanup();
      }).not.toThrow();
      
      // Should still clear the players map
      expect(playerManager.getPlayerCount()).toBe(0);
    });
  });

  describe('Debug and Utility Methods', () => {
    it('should log player statistics correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      playerManager.addPlayer('session-1', mockPlayerData);
      playerManager.addPlayer('session-2', { ...mockPlayerData, name: 'Player2' });
      playerManager.setCurrentPlayer('session-1');
      
      playerManager.logPlayerStats();
      
      expect(consoleSpy).toHaveBeenCalledWith('📊 PlayerManager Stats:');
      expect(consoleSpy).toHaveBeenCalledWith('  - Total players: 2');
      expect(consoleSpy).toHaveBeenCalledWith('  - Current player: session-1');
      
      consoleSpy.mockRestore();
    });

    it('should return all players as a map', () => {
      playerManager.addPlayer('session-1', mockPlayerData);
      playerManager.addPlayer('session-2', { ...mockPlayerData, name: 'Player2' });
      
      const allPlayers = playerManager.getAllPlayers();
      
      expect(allPlayers.size).toBe(2);
      expect(allPlayers.has('session-1')).toBe(true);
      expect(allPlayers.has('session-2')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid player data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Player constructor to throw error
      (Player as any).mockImplementationOnce(() => {
        throw new Error('Invalid player data');
      });
      
      expect(() => {
        playerManager.addPlayer('session-123', mockPlayerData);
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error adding player:', expect.any(Error));
      expect(playerManager.getPlayerCount()).toBe(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle player removal errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      playerManager.addPlayer('session-123', mockPlayerData);
      const player = playerManager.getPlayer('session-123');
      player!.destroy = vi.fn().mockImplementation(() => {
        throw new Error('Destroy failed');
      });
      
      expect(() => {
        playerManager.removePlayer('session-123');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error removing player:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});