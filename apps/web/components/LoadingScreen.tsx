'use client';

import { useEffect, useState } from 'react';

export function LoadingScreen({ progress }: { progress: number }) {
  const [message, setMessage] = useState('Planting the seeds...');
  
  useEffect(() => {
    if (progress < 30) {
      setMessage('Planting the seeds...');
    } else if (progress >= 30 && progress < 60) {
      setMessage('Watering the crops...');
    } else if (progress >= 60 && progress < 90) {
      setMessage('Building the farm...');
    } else {
      setMessage('Almost ready to harvest!');
    }
  }, [progress]);
  
  return (
    <div className="fixed inset-0 bg-green-50 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-8">
          {/* Using a simple emoji for now - replace with actual logo */}
          <div className="w-32 h-32 mx-auto flex items-center justify-center text-6xl animate-pulse">
            🌾
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-green-800 mb-4">
          Loading DeFi Valley...
        </h2>
        
        <div className="w-64 h-2 bg-green-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="mt-4 text-green-600">
          {message}
        </p>
      </div>
    </div>
  );
}