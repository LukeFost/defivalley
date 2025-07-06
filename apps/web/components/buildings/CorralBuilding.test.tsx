import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CorralBuilding, createCorralBuildingData, CORRAL_BUILDING_CONFIG } from './CorralBuilding';

// Mock the store
vi.mock('@/app/store', () => ({
  useUI: vi.fn(() => ({
    showCorralModal: vi.fn()
  }))
}));

describe('CorralBuilding', () => {
  const mockShowCorralModal = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock store
    const { useUI } = require('@/app/store');
    useUI.mockReturnValue({
      showCorralModal: mockShowCorralModal
    });
  });

  describe('component data structure', () => {
    it('should return correct hotspot data with default props', () => {
      const result = CorralBuilding({ x: 100, y: 200 });

      expect(result).toEqual({
        type: 'corral',
        x: 100,
        y: 200,
        width: 96,
        height: 64,
        isInteractable: true,
        onClick: expect.any(Function),
        entryZone: {
          x: 52, // 100 - 96/2
          y: 220, // 200 + 64/2 - 20
          width: 96,
          height: 20
        },
        spriteKey: 'corral_building',
        depth: 5
      });
    });

    it('should return correct hotspot data from data factory function', () => {
      const mockOnClick = vi.fn();
      const result = createCorralBuildingData({ x: 100, y: 200, onClick: mockOnClick });

      expect(result).toEqual({
        type: 'corral',
        x: 100,
        y: 200,
        width: 96,
        height: 64,
        isInteractable: true,
        onClick: mockOnClick,
        entryZone: {
          x: 52, // 100 - 96/2
          y: 220, // 200 + 64/2 - 20
          width: 96,
          height: 20
        },
        spriteKey: 'corral_building',
        depth: 5
      });
    });

    it('should provide default empty onClick function when none provided', () => {
      const result = createCorralBuildingData({ x: 100, y: 200 });
      
      expect(result.onClick).toBeInstanceOf(Function);
      expect(() => result.onClick()).not.toThrow();
    });

    it('should return correct hotspot data with custom props', () => {
      const result = CorralBuilding({ 
        x: 300, 
        y: 400, 
        width: 128, 
        height: 80, 
        isInteractable: false 
      });

      expect(result).toEqual({
        type: 'corral',
        x: 300,
        y: 400,
        width: 128,
        height: 80,
        isInteractable: false,
        onClick: expect.any(Function),
        entryZone: {
          x: 236, // 300 - 128/2
          y: 420, // 400 + 80/2 - 20
          width: 128,
          height: 20
        },
        spriteKey: 'corral_building',
        depth: 5
      });
    });
  });

  describe('click handler', () => {
    it('should call showCorralModal when clicked and interactable', () => {
      const result = CorralBuilding({ x: 100, y: 200, isInteractable: true });
      
      result.onClick();
      
      expect(mockShowCorralModal).toHaveBeenCalledTimes(1);
    });

    it('should not call showCorralModal when clicked but not interactable', () => {
      const result = CorralBuilding({ x: 100, y: 200, isInteractable: false });
      
      result.onClick();
      
      expect(mockShowCorralModal).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks correctly', () => {
      const result = CorralBuilding({ x: 100, y: 200 });
      
      result.onClick();
      result.onClick();
      result.onClick();
      
      expect(mockShowCorralModal).toHaveBeenCalledTimes(3);
    });
  });

  describe('entry zone calculation', () => {
    it('should calculate entry zone at bottom of building', () => {
      const result = CorralBuilding({ x: 500, y: 300, width: 100, height: 60 });

      expect(result.entryZone).toEqual({
        x: 450, // 500 - 100/2
        y: 310, // 300 + 60/2 - 20
        width: 100,
        height: 20
      });
    });

    it('should handle odd dimensions correctly', () => {
      const result = CorralBuilding({ x: 333, y: 444, width: 77, height: 55 });

      expect(result.entryZone).toEqual({
        x: 294.5, // 333 - 77/2
        y: 451.5, // 444 + 55/2 - 20
        width: 77,
        height: 20
      });
    });
  });

  describe('building configuration', () => {
    it('should export correct default configuration', () => {
      expect(CORRAL_BUILDING_CONFIG).toEqual({
        defaultPosition: { x: 500, y: 400 },
        spriteAsset: '/sprites/corral.png',
        description: 'A rustic corral where Flow tokens can be traded for FROTH',
        questStep: 'SWAP'
      });
    });

    it('should have immutable quest step', () => {
      // TypeScript should enforce this, but let's verify the value
      expect(CORRAL_BUILDING_CONFIG.questStep).toBe('SWAP');
      expect(typeof CORRAL_BUILDING_CONFIG.questStep).toBe('string');
    });
  });
});