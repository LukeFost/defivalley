'use client';

import React, { ReactNode } from 'react';
import { CropStats } from './CropStats';
import Notifications from './Notifications';

interface UIStackProps {
  getTotalCrops: () => number;
  getReadyCrops: () => number;
  getGrowingCrops: () => number;
  chatContainer: ReactNode;
}

export function UIStack({ getTotalCrops, getReadyCrops, getGrowingCrops, chatContainer }: UIStackProps) {
  return (
    <div className="fixed top-4 left-4 flex flex-col gap-4 w-80 z-[1000]">
      {/* Farm Statistics Panel */}
      <div className="bg-white rounded-lg shadow-lg p-3 min-w-[200px] border border-gray-200">
        <CropStats 
          getTotalCrops={getTotalCrops}
          getReadyCrops={getReadyCrops}
          getGrowingCrops={getGrowingCrops}
        />
      </div>

      {/* Chat Container */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg text-white">
        {chatContainer}
      </div>

      {/* Notifications Panel */}
      <div>
        <Notifications />
      </div>
    </div>
  );
}