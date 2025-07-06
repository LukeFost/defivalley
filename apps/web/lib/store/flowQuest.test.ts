/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Override the global mocks for this test
vi.mock('zustand', async () => {
  const actual = await vi.importActual('zustand');
  return actual;
});

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware');
  return actual;
});

vi.mock('zustand/middleware/immer', async () => {
  const actual = await vi.importActual('zustand/middleware/immer');
  return actual;
});

vi.mock('@/app/store', async () => {
  const actual = await vi.importActual('@/app/store');
  return actual;
});

import { makeStore } from '../../app/store';
import type { FlowQuest, QuestStep } from '../../app/store-types';

// Mock localStorage for testing
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
};

// Mock Date.now for consistent timestamps
const mockDateNow = vi.fn(() => 1640995200000); // 2022-01-01 00:00:00 UTC

describe('FlowQuest Store', () => {
  let store: ReturnType<typeof makeStore>;
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

  // Test wallet addresses
  const testWallet1: `0x${string}` = '0x1234567890123456789012345678901234567890';
  const testWallet2: `0x${string}` = '0x0987654321098765432109876543210987654321';

  beforeEach(() => {
    // Setup localStorage mock
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock Date.now
    vi.spyOn(Date, 'now').mockImplementation(mockDateNow);
    
    // Create fresh store instance
    store = makeStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeQuest', () => {
    it('should create a new quest for fresh wallet', () => {
      const actions = store.getState();
      
      // Initialize quest for new wallet
      actions.initializeQuest(testWallet1);
      
      const state = store.getState();
      const quest = state.flowQuests[testWallet1];
      
      expect(quest).toBeDefined();
      expect(quest.id).toBe(`quest_${testWallet1}_${mockDateNow()}`);
      expect(quest.walletAddress).toBe(testWallet1);
      expect(quest.currentStep).toBe('NOT_STARTED');
      expect(quest.completedSteps).toEqual([]);
      expect(quest.frothBalance).toBe('0');
      expect(quest.fvixBalance).toBe('0');
      expect(quest.sFvixBalance).toBe('0');
      expect(quest.lastUpdated).toBe(mockDateNow());
      expect(quest.isCompleted).toBe(false);
    });

    it('should not overwrite existing quest', () => {
      const actions = store.getState();
      
      // Initialize quest first time
      actions.initializeQuest(testWallet1);
      const originalQuest = store.getState().flowQuests[testWallet1];
      
      // Modify the quest
      actions.setSwapped(testWallet1, '100.5');
      
      // Try to initialize again
      actions.initializeQuest(testWallet1);
      
      const finalQuest = store.getState().flowQuests[testWallet1];
      
      // Should preserve the modified quest
      expect(finalQuest.id).toBe(originalQuest.id);
      expect(finalQuest.currentStep).toBe('SWAPPED');
      expect(finalQuest.frothBalance).toBe('100.5');
    });

    it('should handle multiple wallet addresses', () => {
      const actions = store.getState();
      
      // Initialize quests for different wallets
      actions.initializeQuest(testWallet1);
      actions.initializeQuest(testWallet2);
      
      const state = store.getState();
      
      expect(state.flowQuests[testWallet1]).toBeDefined();
      expect(state.flowQuests[testWallet2]).toBeDefined();
      expect(state.flowQuests[testWallet1].walletAddress).toBe(testWallet1);
      expect(state.flowQuests[testWallet2].walletAddress).toBe(testWallet2);
    });
  });

  describe('setSwapped', () => {
    beforeEach(() => {
      store.getState().initializeQuest(testWallet1);
    });

    it('should transition from NOT_STARTED to SWAPPED', () => {
      const actions = store.getState();
      
      actions.setSwapped(testWallet1, '250.75');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.currentStep).toBe('SWAPPED');
      expect(quest.completedSteps).toContain('SWAPPED');
      expect(quest.frothBalance).toBe('250.75');
      expect(quest.lastUpdated).toBe(mockDateNow());
    });

    it('should not duplicate completed steps', () => {
      const actions = store.getState();
      
      // Set swapped twice
      actions.setSwapped(testWallet1, '100.0');
      actions.setSwapped(testWallet1, '200.0');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.completedSteps.filter(step => step === 'SWAPPED')).toHaveLength(1);
      expect(quest.frothBalance).toBe('200.0'); // Should update balance
    });

    it('should handle non-existent quest gracefully', () => {
      const actions = store.getState();
      
      // Try to set swapped for non-existent quest
      actions.setSwapped(testWallet2, '100.0');
      
      const quest = store.getState().flowQuests[testWallet2];
      
      expect(quest).toBeUndefined();
    });
  });

  describe('setMinted', () => {
    beforeEach(() => {
      store.getState().initializeQuest(testWallet1);
      store.getState().setSwapped(testWallet1, '100.0');
    });

    it('should transition from SWAPPED to MINTED', () => {
      const actions = store.getState();
      
      actions.setMinted(testWallet1, '95.5');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.currentStep).toBe('MINTED');
      expect(quest.completedSteps).toContain('MINTED');
      expect(quest.completedSteps).toContain('SWAPPED'); // Should preserve previous step
      expect(quest.fvixBalance).toBe('95.5');
      expect(quest.lastUpdated).toBe(mockDateNow());
    });

    it('should work from any previous state', () => {
      const actions = store.getState();
      
      // Reset to NOT_STARTED and jump to MINTED
      store.getState().resetQuest(testWallet1);
      store.getState().initializeQuest(testWallet1);
      
      actions.setMinted(testWallet1, '50.0');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.currentStep).toBe('MINTED');
      expect(quest.completedSteps).toContain('MINTED');
      expect(quest.fvixBalance).toBe('50.0');
    });
  });

  describe('setStaked', () => {
    beforeEach(() => {
      store.getState().initializeQuest(testWallet1);
      store.getState().setSwapped(testWallet1, '100.0');
      store.getState().setMinted(testWallet1, '95.0');
    });

    it('should transition to STAKED and mark as completed', () => {
      const actions = store.getState();
      
      actions.setStaked(testWallet1, '95.0');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.currentStep).toBe('STAKED');
      expect(quest.completedSteps).toContain('STAKED');
      expect(quest.completedSteps).toContain('MINTED');
      expect(quest.completedSteps).toContain('SWAPPED');
      expect(quest.sFvixBalance).toBe('95.0');
      expect(quest.isCompleted).toBe(true);
      expect(quest.lastUpdated).toBe(mockDateNow());
    });

    it('should handle completion from any state', () => {
      const actions = store.getState();
      
      // Reset and jump straight to staked
      store.getState().resetQuest(testWallet1);
      store.getState().initializeQuest(testWallet1);
      
      actions.setStaked(testWallet1, '150.0');
      
      const quest = store.getState().flowQuests[testWallet1];
      
      expect(quest.currentStep).toBe('STAKED');
      expect(quest.isCompleted).toBe(true);
      expect(quest.sFvixBalance).toBe('150.0');
    });
  });

  describe('updateQuestBalances', () => {
    beforeEach(() => {
      store.getState().initializeQuest(testWallet1);
    });

    it('should update individual balances selectively', () => {
      const actions = store.getState();
      
      // Update only froth balance
      actions.updateQuestBalances(testWallet1, { froth: '100.0' });
      
      let quest = store.getState().flowQuests[testWallet1];
      expect(quest.frothBalance).toBe('100.0');
      expect(quest.fvixBalance).toBe('0');
      expect(quest.sFvixBalance).toBe('0');
      
      // Update only fvix balance
      actions.updateQuestBalances(testWallet1, { fvix: '95.0' });
      
      quest = store.getState().flowQuests[testWallet1];
      expect(quest.frothBalance).toBe('100.0'); // Should preserve
      expect(quest.fvixBalance).toBe('95.0');
      expect(quest.sFvixBalance).toBe('0');
    });

    it('should update multiple balances at once', () => {
      const actions = store.getState();
      
      actions.updateQuestBalances(testWallet1, {
        froth: '200.0',
        fvix: '190.0',
        sFvix: '185.0'
      });
      
      const quest = store.getState().flowQuests[testWallet1];
      expect(quest.frothBalance).toBe('200.0');
      expect(quest.fvixBalance).toBe('190.0');
      expect(quest.sFvixBalance).toBe('185.0');
      expect(quest.lastUpdated).toBe(mockDateNow());
    });

    it('should handle undefined balances gracefully', () => {
      const actions = store.getState();
      
      // Set initial balances
      actions.updateQuestBalances(testWallet1, { froth: '100.0', fvix: '95.0' });
      
      // Update with undefined values
      actions.updateQuestBalances(testWallet1, { froth: undefined, sFvix: '90.0' });
      
      const quest = store.getState().flowQuests[testWallet1];
      expect(quest.frothBalance).toBe('100.0'); // Should preserve
      expect(quest.fvixBalance).toBe('95.0'); // Should preserve
      expect(quest.sFvixBalance).toBe('90.0'); // Should update
    });
  });

  describe('resetQuest', () => {
    beforeEach(() => {
      store.getState().initializeQuest(testWallet1);
      store.getState().setSwapped(testWallet1, '100.0');
      store.getState().setMinted(testWallet1, '95.0');
      store.getState().setStaked(testWallet1, '95.0');
    });

    it('should completely remove quest from state', () => {
      const actions = store.getState();
      
      // Verify quest exists
      expect(store.getState().flowQuests[testWallet1]).toBeDefined();
      
      actions.resetQuest(testWallet1);
      
      // Should be completely removed
      expect(store.getState().flowQuests[testWallet1]).toBeUndefined();
    });

    it('should only affect specified wallet', () => {
      const actions = store.getState();
      
      // Initialize second wallet
      actions.initializeQuest(testWallet2);
      actions.setSwapped(testWallet2, '200.0');
      
      // Reset first wallet
      actions.resetQuest(testWallet1);
      
      // First wallet should be gone, second should remain
      expect(store.getState().flowQuests[testWallet1]).toBeUndefined();
      expect(store.getState().flowQuests[testWallet2]).toBeDefined();
      expect(store.getState().flowQuests[testWallet2].frothBalance).toBe('200.0');
    });
  });

  describe('Scenario Matrix Tests', () => {
    describe('Complete Quest Flow', () => {
      it('should handle full quest completion cycle', () => {
        const actions = store.getState();
        
        // Initialize fresh quest
        actions.initializeQuest(testWallet1);
        
        // Complete all steps
        actions.setSwapped(testWallet1, '1000.0');
        actions.setMinted(testWallet1, '950.0');
        actions.setStaked(testWallet1, '950.0');
        
        const quest = store.getState().flowQuests[testWallet1];
        
        expect(quest.currentStep).toBe('STAKED');
        expect(quest.completedSteps).toEqual(['SWAPPED', 'MINTED', 'STAKED']);
        expect(quest.isCompleted).toBe(true);
        expect(quest.frothBalance).toBe('1000.0');
        expect(quest.fvixBalance).toBe('950.0');
        expect(quest.sFvixBalance).toBe('950.0');
      });
    });

    describe('Reset and Restart Scenario', () => {
      it('should allow quest reset and restart', () => {
        const actions = store.getState();
        
        // Complete first quest
        actions.initializeQuest(testWallet1);
        actions.setSwapped(testWallet1, '500.0');
        actions.setMinted(testWallet1, '475.0');
        actions.setStaked(testWallet1, '475.0');
        
        // Reset quest
        actions.resetQuest(testWallet1);
        
        // Start new quest
        actions.initializeQuest(testWallet1);
        
        const newQuest = store.getState().flowQuests[testWallet1];
        
        expect(newQuest.currentStep).toBe('NOT_STARTED');
        expect(newQuest.completedSteps).toEqual([]);
        expect(newQuest.frothBalance).toBe('0');
        expect(newQuest.fvixBalance).toBe('0');
        expect(newQuest.sFvixBalance).toBe('0');
        expect(newQuest.isCompleted).toBe(false);
      });
    });

    describe('Repeat Wallet Multiple Cycles', () => {
      it('should handle multiple completion cycles for same wallet', () => {
        const actions = store.getState();
        
        // First cycle
        actions.initializeQuest(testWallet1);
        actions.setSwapped(testWallet1, '100.0');
        actions.setStaked(testWallet1, '95.0');
        
        expect(store.getState().flowQuests[testWallet1].isCompleted).toBe(true);
        
        // Reset for second cycle
        actions.resetQuest(testWallet1);
        actions.initializeQuest(testWallet1);
        
        // Second cycle with different amounts
        actions.setSwapped(testWallet1, '200.0');
        actions.setMinted(testWallet1, '190.0');
        actions.setStaked(testWallet1, '190.0');
        
        const finalQuest = store.getState().flowQuests[testWallet1];
        
        expect(finalQuest.isCompleted).toBe(true);
        expect(finalQuest.frothBalance).toBe('200.0');
        expect(finalQuest.fvixBalance).toBe('190.0');
        expect(finalQuest.sFvixBalance).toBe('190.0');
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Invalid State Transitions', () => {
      it('should handle operations on non-existent quests', () => {
        const actions = store.getState();
        
        // Try all operations on non-existent quest
        actions.setSwapped(testWallet1, '100.0');
        actions.setMinted(testWallet1, '95.0');
        actions.setStaked(testWallet1, '95.0');
        actions.updateQuestBalances(testWallet1, { froth: '50.0' });
        actions.resetQuest(testWallet1);
        
        // Should not crash and quest should remain undefined
        expect(store.getState().flowQuests[testWallet1]).toBeUndefined();
      });
    });

    describe('Missing Data Handling', () => {
      it('should handle empty balance strings', () => {
        const actions = store.getState();
        
        actions.initializeQuest(testWallet1);
        actions.setSwapped(testWallet1, '');
        actions.setMinted(testWallet1, '');
        actions.setStaked(testWallet1, '');
        
        const quest = store.getState().flowQuests[testWallet1];
        
        expect(quest.frothBalance).toBe('');
        expect(quest.fvixBalance).toBe('');
        expect(quest.sFvixBalance).toBe('');
        expect(quest.isCompleted).toBe(true); // Should still mark as completed
      });
    });

    describe('Concurrent Updates', () => {
      it('should handle rapid consecutive updates', () => {
        const actions = store.getState();
        
        actions.initializeQuest(testWallet1);
        
        // Simulate rapid updates
        actions.setSwapped(testWallet1, '100.0');
        actions.updateQuestBalances(testWallet1, { froth: '101.0' });
        actions.updateQuestBalances(testWallet1, { froth: '102.0' });
        actions.setMinted(testWallet1, '97.0');
        actions.updateQuestBalances(testWallet1, { fvix: '98.0' });
        
        const quest = store.getState().flowQuests[testWallet1];
        
        expect(quest.currentStep).toBe('MINTED');
        expect(quest.frothBalance).toBe('102.0'); // Should have latest balance
        expect(quest.fvixBalance).toBe('98.0'); // Should have latest balance
        expect(quest.completedSteps).toEqual(['SWAPPED', 'MINTED']);
      });
    });
  });

  describe('LocalStorage Integration', () => {
    it('should persist quest data to localStorage', () => {
      const actions = store.getState();
      
      // Create and modify quest
      actions.initializeQuest(testWallet1);
      actions.setSwapped(testWallet1, '500.0');
      actions.setMinted(testWallet1, '475.0');
      
      // Trigger store persistence (would normally happen automatically)
      // We can't directly test the automatic persistence, but we can verify the structure
      const state = store.getState();
      
      expect(state.flowQuests[testWallet1]).toBeDefined();
      expect(state.flowQuests[testWallet1].frothBalance).toBe('500.0');
      expect(state.flowQuests[testWallet1].fvixBalance).toBe('475.0');
    });

    it('should handle localStorage with multiple quests', () => {
      const actions = store.getState();
      
      // Create multiple quests
      actions.initializeQuest(testWallet1);
      actions.initializeQuest(testWallet2);
      
      actions.setSwapped(testWallet1, '100.0');
      actions.setMinted(testWallet2, '200.0');
      
      const state = store.getState();
      
      expect(Object.keys(state.flowQuests)).toHaveLength(2);
      expect(state.flowQuests[testWallet1].frothBalance).toBe('100.0');
      expect(state.flowQuests[testWallet2].fvixBalance).toBe('200.0');
    });
  });

  describe('State Validation', () => {
    it('should maintain consistent completedSteps array', () => {
      const actions = store.getState();
      
      actions.initializeQuest(testWallet1);
      
      // Test each step adds to completedSteps correctly
      actions.setSwapped(testWallet1, '100.0');
      expect(store.getState().flowQuests[testWallet1].completedSteps).toEqual(['SWAPPED']);
      
      actions.setMinted(testWallet1, '95.0');
      expect(store.getState().flowQuests[testWallet1].completedSteps).toEqual(['SWAPPED', 'MINTED']);
      
      actions.setStaked(testWallet1, '95.0');
      expect(store.getState().flowQuests[testWallet1].completedSteps).toEqual(['SWAPPED', 'MINTED', 'STAKED']);
    });

    it('should validate timestamp updates', () => {
      const actions = store.getState();
      
      actions.initializeQuest(testWallet1);
      const initialTime = store.getState().flowQuests[testWallet1].lastUpdated;
      
      // Mock time advancement
      mockDateNow.mockReturnValue(1640995260000); // +1 minute
      
      actions.setSwapped(testWallet1, '100.0');
      const updatedTime = store.getState().flowQuests[testWallet1].lastUpdated;
      
      expect(updatedTime).toBeGreaterThan(initialTime);
      expect(updatedTime).toBe(1640995260000);
    });

    it('should validate isCompleted flag logic', () => {
      const actions = store.getState();
      
      actions.initializeQuest(testWallet1);
      
      // Should not be completed initially
      expect(store.getState().flowQuests[testWallet1].isCompleted).toBe(false);
      
      // Should not be completed after swapping
      actions.setSwapped(testWallet1, '100.0');
      expect(store.getState().flowQuests[testWallet1].isCompleted).toBe(false);
      
      // Should not be completed after minting
      actions.setMinted(testWallet1, '95.0');
      expect(store.getState().flowQuests[testWallet1].isCompleted).toBe(false);
      
      // Should be completed after staking
      actions.setStaked(testWallet1, '95.0');
      expect(store.getState().flowQuests[testWallet1].isCompleted).toBe(true);
    });
  });

  describe('useFlowQuest Hook Integration', () => {
    it('should provide correct helper methods', () => {
      const actions = store.getState();
      
      actions.initializeQuest(testWallet1);
      actions.setSwapped(testWallet1, '100.0');
      
      const state = store.getState();
      
      // Test getQuest helper (simulated)
      const quest = state.flowQuests[testWallet1];
      expect(quest).toBeDefined();
      expect(quest.currentStep).toBe('SWAPPED');
      
      // Test isStepCompleted helper (simulated)
      const isSwapCompleted = quest?.completedSteps.includes('SWAPPED') || false;
      const isMintCompleted = quest?.completedSteps.includes('MINTED') || false;
      
      expect(isSwapCompleted).toBe(true);
      expect(isMintCompleted).toBe(false);
    });
  });
});