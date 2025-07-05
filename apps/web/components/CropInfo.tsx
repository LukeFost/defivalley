'use client';

import { useState, useEffect } from 'react';
import { CropData, CROP_CONFIGS } from '@/lib/CropSystem';

interface CropInfoProps {
  crop: CropData | null;
  onClose: () => void;
}

export function CropInfo({ crop, onClose }: CropInfoProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!crop) return;

    const config = CROP_CONFIGS[crop.type];
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - crop.plantedAt) / 1000;
      const remaining = Math.max(0, config.growthTime - elapsed);
      
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining('Ready to harvest!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [crop]);

  if (!crop) return null;

  const config = CROP_CONFIGS[crop.type];
  const elapsed = (Date.now() - crop.plantedAt) / 1000;
  const progress = Math.min(elapsed / config.growthTime, 1) * 100;

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[240px] border border-gray-200 z-[1000]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-green-600">
          🌱 {config.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Stage:</span>
          <span className="text-sm font-medium capitalize">{crop.stage}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Health:</span>
          <span className="text-sm font-medium">{crop.health}%</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Growth:</span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-center pt-2">
          <span className="text-sm text-gray-600">
            {timeRemaining}
          </span>
        </div>
        
        {crop.stage === 'ready' && (
          <div className="text-center pt-2">
            <span className="text-sm font-medium text-green-600 animate-pulse">
              🎉 Ready to harvest!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}