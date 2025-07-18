'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { CropType, CROP_CONFIGS } from '@/lib/CropSystem';

interface CropContextMenuProps {
  children: React.ReactNode;
  onPlantCrop: (cropType: CropType, x: number, y: number) => void;
  onRemoveCrop: (x: number, y: number) => void;
  onHarvestCrop: (x: number, y: number) => void;
  canPlantAt: (x: number, y: number) => boolean;
  getCropAt: (x: number, y: number) => { id: string; type: CropType; stage: string } | null;
}

export function CropContextMenu({
  children,
  onPlantCrop,
  onRemoveCrop,
  onHarvestCrop,
  canPlantAt,
  getCropAt,
}: CropContextMenuProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [gameContainerRect, setGameContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Get game container dimensions for coordinate conversion
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      setGameContainerRect(gameContainer.getBoundingClientRect());
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!gameContainerRect) return;
    
    // Convert screen coordinates to game coordinates
    const gameX = e.clientX - gameContainerRect.left;
    const gameY = e.clientY - gameContainerRect.top;
    
    setContextMenuPosition({ x: gameX, y: gameY });
  }, [gameContainerRect]);

  const handlePlantCrop = (cropType: CropType) => {
    if (!contextMenuPosition) return;
    
    const { x, y } = contextMenuPosition;
    
    if (canPlantAt(x, y)) {
      onPlantCrop(cropType, x, y);
    } else {
    }
    
    setContextMenuPosition(null);
  };

  const handleRemoveCrop = () => {
    if (!contextMenuPosition) return;
    
    const { x, y } = contextMenuPosition;
    onRemoveCrop(x, y);
    setContextMenuPosition(null);
  };

  const handleHarvestCrop = () => {
    if (!contextMenuPosition) return;
    
    const { x, y } = contextMenuPosition;
    onHarvestCrop(x, y);
    setContextMenuPosition(null);
  };

  // Group crops by category for better UX
  const cropCategories = {
    'Root Vegetables': ['potato', 'carrot'] as CropType[],
    'Leafy Greens': ['lettuce', 'cabbage'] as CropType[],
    'Fruits': ['tomato', 'strawberry', 'watermelon'] as CropType[],
    'Grains & Others': ['corn', 'pumpkin', 'pepper'] as CropType[]
  };

  const currentCrop = contextMenuPosition ? getCropAt(contextMenuPosition.x, contextMenuPosition.y) : null;
  const canPlant = contextMenuPosition ? canPlantAt(contextMenuPosition.x, contextMenuPosition.y) : false;

  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={handleContextMenu} style={{ width: '100%', height: '100%' }}>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        {currentCrop ? (
          // Crop exists at this position
          <>
            <ContextMenuItem className="font-medium text-green-600">
              🌱 {CROP_CONFIGS[currentCrop.type].name}
            </ContextMenuItem>
            <ContextMenuItem className="text-sm text-muted-foreground">
              Stage: {currentCrop.stage}
            </ContextMenuItem>
            <ContextMenuSeparator />
            
            {currentCrop.stage === 'ready' && (
              <ContextMenuItem 
                onClick={handleHarvestCrop}
                className="text-blue-600 focus:text-blue-600"
              >
                🚜 Harvest Crop
              </ContextMenuItem>
            )}
            
            <ContextMenuItem 
              onClick={handleRemoveCrop}
              className="text-red-600 focus:text-red-600"
            >
              🗑️ Remove Crop
            </ContextMenuItem>
          </>
        ) : canPlant ? (
          // No crop, but can plant here
          <>
            <ContextMenuItem className="font-medium text-green-600">
              🌱 Plant Crop
            </ContextMenuItem>
            <ContextMenuSeparator />
            
            {Object.entries(cropCategories).map(([category, crops]) => (
              <ContextMenuSub key={category}>
                <ContextMenuSubTrigger>
                  {category}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {crops.map((cropType) => {
                    const config = CROP_CONFIGS[cropType];
                    return (
                      <ContextMenuItem
                        key={cropType}
                        onClick={() => handlePlantCrop(cropType)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{config.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {config.growthTime}s
                          </span>
                        </div>
                      </ContextMenuItem>
                    );
                  })}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ))}
          </>
        ) : (
          // Cannot plant here
          <>
            <ContextMenuItem className="text-muted-foreground">
              ❌ Cannot plant here
            </ContextMenuItem>
            <ContextMenuItem className="text-xs text-muted-foreground">
              Try planting in the farming area
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}