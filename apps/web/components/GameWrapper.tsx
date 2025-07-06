'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Game component to avoid SSR issues with Phaser
const Game = dynamic(() => import('./Game'), {
  ssr: false,
  loading: () => (
    <div className="game-loading-wrapper">
      <div className="game-loading">
        <div className="loading-spinner"></div>
        <span>Loading game...</span>
      </div>
      <style jsx>{`
        .game-loading-wrapper {
          width: 100%;
          height: 100%;
          background: #1a1a1a;
          position: relative;
          overflow: hidden;
        }
        
        .game-loading {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #87CEEB 0%, #98D8E8 100%);
          font-size: 18px;
          color: #333;
          gap: 16px;
        }
        
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #4a90e2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
});

interface GameWrapperProps {
  worldId?: string;
  isOwnWorld?: boolean;
}

export default function GameWrapper({ worldId, isOwnWorld }: GameWrapperProps) {
  return (
    <div className="game-container">
      <Game worldId={worldId} isOwnWorld={isOwnWorld} />
      <style jsx>{`
        .game-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #1a1a1a;
        }
        
        /* Inner content styling - full size */
        .game-container :global(#game-container) {
          width: 100%;
          height: 100%;
          position: relative;
        }
      `}</style>
    </div>
  );
}