'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface BuildingInfo {
  id: string;
  name: string;
  description: string;
  type: 'trading' | 'staking' | 'minting';
}

interface BuildingContextMenuProps {
  children: React.ReactNode;
  building: BuildingInfo | null;
  onEnter: () => void;
  onInfo: () => void;
}

const BuildingContextMenu: React.FC<BuildingContextMenuProps> = ({
  children,
  building,
  onEnter,
  onInfo
}) => {
  if (!building) {
    return <>{children}</>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'trading': return '🐴';
      case 'staking': return '🌳';
      case 'minting': return '🪣';
      default: return '🏗️';
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full h-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getIcon(building.type)}</span>
            <div>
              <p className="font-semibold text-sm">{building.name}</p>
              <p className="text-xs text-muted-foreground">{building.description}</p>
            </div>
          </div>
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={onEnter}
          className="flex items-center gap-2"
        >
          <span>🚪</span>
          Enter Building
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={onInfo}
          className="flex items-center gap-2"
        >
          <span>ℹ️</span>
          Building Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          disabled
          className="text-xs text-muted-foreground"
        >
          Right-click for options
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default BuildingContextMenu;