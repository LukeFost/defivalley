'use client';

import { useState } from 'react';
import GameWrapper from '@/components/GameWrapper';
import WorldBrowser from '@/components/WorldBrowser';
import { WalletButton } from '@/components/WalletButton';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import TransactionTracker from '@/components/TransactionTracker';
import Notifications from '@/components/Notifications';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CorralScene } from '@/components/scenes/CorralScene';
import { OrchardScene } from '@/components/scenes/OrchardScene';
import { WellScene } from '@/components/scenes/WellScene';
import { SwapModal } from '@/components/modals/SwapModal';
import { MintModal } from '@/components/modals/MintModal';
import { StakeModal } from '@/components/modals/StakeModal';
import { QuestBookHUD } from '@/components/QuestBookHUD';

export default function Home() {
  const [currentView, setCurrentView] = useState<'browser' | 'game'>('browser');
  const [selectedWorldId, setSelectedWorldId] = useState<string>('');
  const [isOwnWorld, setIsOwnWorld] = useState<boolean>(false);
  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);

  const handleEnterWorld = (worldId: string, isOwn: boolean) => {
    setSelectedWorldId(worldId);
    setIsOwnWorld(isOwn);
    setCurrentView('game');
  };

  const handleBackToWorldBrowser = () => {
    setCurrentView('browser');
    setSelectedWorldId('');
    setIsOwnWorld(false);
  };

  if (currentView === 'browser') {
    return (
      <div className="min-h-screen">
        <WorldBrowser onEnterWorld={handleEnterWorld} />
        {/* Wallet connection for world browser */}
        <WalletButton />
        {/* Global components that work across views */}
        <PlantSeedDialog />
        <SettingsDialog />
        <TransactionTracker />
        <Notifications />
      </div>
    );
  }

  return (
    <div className="game-view-container">
      {/* Full viewport game wrapper */}
      <div className="game-viewport-wrapper">
        <GameWrapper worldId={selectedWorldId} isOwnWorld={isOwnWorld} />
      </div>
      
      {/* Bottom bar with toggle button */}
      <div className="bottom-bar">
        <Button
          onClick={handleBackToWorldBrowser}
          variant="outline"
          size="sm"
          className="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Worlds
        </Button>
        
        <div className="farm-info">
          <span className="farm-title">
            🌱 {isOwnWorld ? 'My Farm' : 'Visiting Farm'}
          </span>
          {!isOwnWorld && (
            <span className="farm-id">
              ID: {selectedWorldId.slice(0, 8)}...
            </span>
          )}
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
        
        {/* Wallet connection and other UI elements */}
        <WalletButton />
        <div className="overlay-content">
          <h2>Farm Controls</h2>
          <p>🎮 WASD: Move</p>
          <p>💬 Enter: Chat</p>
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
      <TransactionTracker />
      
      {/* Building Scene Components */}
      <CorralScene />
      <OrchardScene />
      <WellScene />
      <SwapModal />
      <MintModal />
      <StakeModal />
      
      {/* Flow Quest Book HUD */}
      <QuestBookHUD />
      
      {/* Global Notification System */}
      <Notifications />
    </div>
  );
}
