'use client';

import React from 'react';
import Notifications from './Notifications';

interface UIStackProps {
  getTotalCrops: () => number;
  getReadyCrops: () => number;
  getGrowingCrops: () => number;
  playerGold?: number;
}

export function UIStack({ getTotalCrops, getReadyCrops, getGrowingCrops, playerGold = 0 }: UIStackProps) {
  return (
    <div className="fixed top-4 left-4 flex flex-col gap-4 w-80 sm:w-96 md:w-80 lg:w-96 z-[1000] max-w-[calc(100vw-2rem)]">
      {/* Player Stats Panel */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg text-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-yellow-400 font-bold">💰 Gold:</span>
          <span className="text-xl font-mono">{playerGold}</span>
        </div>
      </div>


      {/* Notifications Panel */}
      <div>
        <Notifications />
      </div>
    </div>
  );
}