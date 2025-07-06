'use client';

import { useState, useEffect } from 'react';

interface CropStatsProps {
  getTotalCrops: () => number;
  getReadyCrops: () => number;
  getGrowingCrops: () => number;
}

export function CropStats({ getTotalCrops, getReadyCrops, getGrowingCrops }: CropStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    growing: 0
  });

  useEffect(() => {
    const updateStats = () => {
      setStats({
        total: getTotalCrops(),
        ready: getReadyCrops(),
        growing: getGrowingCrops()
      });
    };

    // Update stats every second
    const interval = setInterval(updateStats, 1000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [getTotalCrops, getReadyCrops, getGrowingCrops]);

  return (
    <>
      <h3 className="text-lg font-semibold text-green-600 mb-2 flex items-center">
        🌾 Farm Statistics
      </h3>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Crops:</span>
          <span className="font-medium">{stats.total}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Growing:</span>
          <span className="font-medium text-yellow-600">{stats.growing}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Ready to Harvest:</span>
          <span className="font-medium text-green-600">{stats.ready}</span>
        </div>
        
        {stats.ready > 0 && (
          <div className="text-center pt-2">
            <span className="text-xs text-green-600 animate-pulse">
              🎉 {stats.ready} crop{stats.ready > 1 ? 's' : ''} ready!
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
        Right-click to plant • Click crops for info
      </div>
    </>
  );
}