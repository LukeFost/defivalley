'use client';

import { useState } from 'react';
import GameRefactored from './GameRefactored';

// Test bench component to verify refactored game works
export default function GameTestBench() {
  const [useRefactored, setUseRefactored] = useState(false);
  const [worldId, setWorldId] = useState<string>('');
  const [isOwnWorld, setIsOwnWorld] = useState(false);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Test Controls */}
      <div className="bg-gray-800 text-white p-4 flex items-center gap-4 shrink-0">
        <h1 className="text-xl font-bold">Game Component Test Bench</h1>
        
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <input
              type="checkbox"
              checked={useRefactored}
              onChange={(e) => setUseRefactored(e.target.checked)}
              className="mr-2"
            />
            Use Refactored Component
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm">
            World ID:
            <input
              type="text"
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              className="ml-2 px-2 py-1 bg-gray-700 text-white rounded text-sm"
              placeholder="Optional"
            />
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <input
              type="checkbox"
              checked={isOwnWorld}
              onChange={(e) => setIsOwnWorld(e.target.checked)}
              className="mr-2"
            />
            Is Own World
          </label>
        </div>
        
        <div className="text-sm bg-blue-600 px-3 py-1 rounded">
          Using: {useRefactored ? 'Refactored' : 'Original'} Component
        </div>
      </div>
      
      {/* Game Component */}
      <div className="flex-1 relative">
        {useRefactored ? (
          <GameRefactored 
            worldId={worldId || undefined}
            isOwnWorld={isOwnWorld}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Original Game Component</h2>
              <p className="text-gray-600">
                Check "Use Refactored Component" to test the new implementation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}