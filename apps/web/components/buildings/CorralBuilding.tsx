import { useCallback } from 'react';
import { useUI } from '@/app/store';

export interface CorralBuildingProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  isInteractable?: boolean;
}

export interface CorralBuildingDataProps extends CorralBuildingProps {
  onClick?: () => void;
}

/**
 * Pure data factory function for creating building data without React hooks
 * Can be safely called from Phaser scenes
 */
export function createCorralBuildingData({ 
  x, 
  y, 
  width = 96, 
  height = 64, 
  isInteractable = true,
  onClick 
}: CorralBuildingDataProps) {
  return {
    type: 'corral' as const,
    x,
    y,
    width,
    height,
    isInteractable,
    onClick: onClick || (() => {}),
    entryZone: {
      x: x - width / 2,
      y: y + height / 2 - 20, // Entry at bottom of building
      width,
      height: 20
    },
    spriteKey: 'corral_building', // Asset key for Phaser sprite
    depth: 5 // Z-layer for proper rendering order
  };
}

/**
 * CorralBuilding React component for Flow quest integration
 * Uses React hooks and should only be called from React context
 */
export function CorralBuilding({ 
  x, 
  y, 
  width = 96, 
  height = 64, 
  isInteractable = true 
}: CorralBuildingProps) {
  const { showCorralModal } = useUI();

  const handleClick = useCallback(() => {
    if (isInteractable) {
      showCorralModal();
    }
  }, [isInteractable, showCorralModal]);

  // Return hotspot data for Phaser scene integration
  return createCorralBuildingData({
    x,
    y,
    width,
    height,
    isInteractable,
    onClick: handleClick
  });
}

// Building configuration for easy placement
export const CORRAL_BUILDING_CONFIG = {
  defaultPosition: { x: 500, y: 400 }, // Default world coordinates
  spriteAsset: '/sprites/corral.png', // Placeholder asset path
  description: 'A rustic corral where Flow tokens can be traded for FROTH',
  questStep: 'SWAP' as const
} as const;

// Export for use in Phaser scene
export type CorralBuildingData = ReturnType<typeof createCorralBuildingData>;