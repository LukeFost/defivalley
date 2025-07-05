'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Game component to avoid SSR issues with Phaser
const Game = dynamic(() => import('./Game'), {
  ssr: false,
  loading: () => (
    <div className="game-frame">
      <div className="game-loading">
        <div className="loading-spinner"></div>
        <span>Loading game...</span>
      </div>
      <style jsx>{`
        .game-frame {
          width: 1600px;
          height: 900px;
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1);
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
          border-radius: 8px;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
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
          position: relative;
          display: inline-block;
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          
          /* 3D Beveled effect */
          border: 2px solid transparent;
          border-image: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.8) 0%, 
            rgba(255, 255, 255, 0.4) 25%, 
            rgba(0, 0, 0, 0.1) 75%, 
            rgba(0, 0, 0, 0.2) 100%
          ) 1;
          
          /* Enhanced depth with multiple shadows */
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }
        
        .game-container::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.6) 0%, 
            rgba(255, 255, 255, 0.2) 25%, 
            rgba(0, 0, 0, 0.1) 75%, 
            rgba(0, 0, 0, 0.3) 100%
          );
          border-radius: 14px;
          z-index: -1;
        }
        
        .game-container::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          background: linear-gradient(135deg, 
            rgba(0, 0, 0, 0.1) 0%, 
            rgba(0, 0, 0, 0.05) 25%, 
            rgba(255, 255, 255, 0.1) 75%, 
            rgba(255, 255, 255, 0.2) 100%
          );
          border-radius: 8px;
          z-index: -1;
          pointer-events: none;
        }
        
        /* Inner content styling */
        .game-container :global(#game-container) {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
        }
      `}</style>
    </div>
  );
}