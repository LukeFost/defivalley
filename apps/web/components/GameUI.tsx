'use client';

import React from 'react';
import { UIStack } from './UIStack';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NetworkSelector } from './NetworkSelector';

interface GameUIProps {
  // Crop stats functions
  getTotalCrops: () => number;
  getReadyCrops: () => number;
  getGrowingCrops: () => number;
  
  // Player stats
  playerGold?: number;
}

export function GameUI({
  getTotalCrops,
  getReadyCrops,
  getGrowingCrops,
  playerGold
}: GameUIProps) {

  return (
    <>
      {/* Top-right wallet and network controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <ConnectWalletButton />
        <NetworkSelector />
      </div>

      {/* Left-side UI stack with notifications */}
      <UIStack
        getTotalCrops={getTotalCrops}
        getReadyCrops={getReadyCrops}
        getGrowingCrops={getGrowingCrops}
        playerGold={playerGold}
      />

    </>
  );
}