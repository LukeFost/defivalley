'use client';

import { useState } from 'react';
import GameWrapper from '@/components/GameWrapper';
import { Auth } from '@/components/Auth';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import Notifications from '@/components/Notifications';

export default function Home() {
  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);

  return (
    <div className="game-view-container">
      {/* Full viewport game wrapper */}
      <div className="game-viewport-wrapper">
        <GameWrapper worldId="local" isOwnWorld={true} />
      </div>
      
      {/* Bottom bar with toggle button */}
      <div className="bottom-bar">
        <div className="farm-info">
          <span className="farm-title">
            🌱 My Farm
          </span>
        </div>
        
        <button 
          className="overlay-toggle"
          onClick={() => setOverlayOpen(!overlayOpen)}
        >
          ☰ Menu
        </button>
      </div>
      
      {/* Overlay panel - initially hidden */}
      <aside className={`overlay-panel ${overlayOpen ? 'open' : ''}`}>
        <button 
          className="overlay-close"
          onClick={() => setOverlayOpen(false)}
        >
          ✕
        </button>
        
        {/* Auth component and other UI elements */}
        <Auth />
        <div className="overlay-content">
          <h2>Farm Controls</h2>
          <p>🎮 WASD: Move</p>
          <p>🌱 Right-click: Plant seeds</p>
        </div>
      </aside>
      
      <style jsx>{`
        .game-view-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #2a2a2a;
        }
        
        .game-viewport-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: calc(100vh - var(--bar-height, 64px));
          overflow: hidden;
        }
        
        .bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: var(--bar-height, 64px);
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 100;
        }
        
        .back-button {
          flex-shrink: 0;
        }
        
        .farm-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: white;
        }
        
        .farm-title {
          font-size: 16px;
          font-weight: 600;
        }
        
        .farm-id {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .overlay-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }
        
        .overlay-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .overlay-panel {
          position: fixed;
          left: 0;
          bottom: calc(-100% + var(--bar-height, 64px));
          width: 100%;
          height: calc(100% - var(--bar-height, 64px));
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px);
          transition: bottom 0.3s ease-out;
          z-index: 200;
          padding: 20px;
          overflow-y: auto;
          color: white;
        }
        
        .overlay-panel.open {
          bottom: var(--bar-height, 64px);
        }
        
        .overlay-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s;
        }
        
        .overlay-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        
        .overlay-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 0;
        }
        
        .overlay-content h2 {
          font-size: 24px;
          margin-bottom: 16px;
          color: #87CEEB;
        }
        
        .overlay-content p {
          margin: 8px 0;
          font-size: 16px;
        }
        
        /* CSS custom property for bar height */
        :root {
          --bar-height: 64px;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          :root {
            --bar-height: 56px;
          }
          
          .farm-info {
            font-size: 14px;
          }
          
          .overlay-toggle {
            padding: 6px 12px;
            font-size: 13px;
          }
        }
        
        /* Safe area for iOS */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .bottom-bar {
            padding-bottom: env(safe-area-inset-bottom);
            height: calc(var(--bar-height, 64px) + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      
      {/* DeFi Valley Modal Components */}
      <PlantSeedDialog />
      <SettingsDialog />
      
      {/* Global Notification System */}
      <Notifications />
    </div>
  );
}
