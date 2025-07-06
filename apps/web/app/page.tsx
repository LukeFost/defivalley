'use client';

import { useState } from 'react';
import GameWrapper from '@/components/GameWrapper';
import WorldBrowser from '@/components/WorldBrowser';
import { WalletButton } from '@/components/WalletButton';
import SettingsDialog from '@/components/SettingsDialog';
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
        <SettingsDialog />
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
          <h2>Farm Controls & Guide</h2>
          
          <div className="controls-section">
            <h3>🎮 Movement & Navigation</h3>
            <div className="control-group">
              <div className="control-item">
                <span className="control-keys">WASD</span>
                <span className="control-desc">Move your character around the farm</span>
              </div>
              <div className="control-item">
                <span className="control-keys">Arrow Keys</span>
                <span className="control-desc">Alternative movement controls</span>
              </div>
            </div>
          </div>

          <div className="controls-section">
            <h3>🌱 Farming Actions</h3>
            <div className="control-group">
              <div className="control-item">
                <span className="control-keys">Right-click</span>
                <span className="control-desc">Plant seeds on empty soil tiles</span>
              </div>
              <div className="control-item">
                <span className="control-keys">Right-click</span>
                <span className="control-desc">Harvest mature crops for rewards</span>
              </div>
            </div>
          </div>

          <div className="controls-section">
            <h3>💬 Social Features</h3>
            <div className="control-group">
              <div className="control-item">
                <span className="control-keys">Enter</span>
                <span className="control-desc">Open chat to talk with other players</span>
              </div>
              <div className="control-item">
                <span className="control-keys">Esc</span>
                <span className="control-desc">Close chat or cancel actions</span>
              </div>
            </div>
          </div>

          <div className="controls-section">
            <h3>💰 DeFi Integration</h3>
            <div className="info-group">
              <div className="info-item">
                <span className="info-icon">🔗</span>
                <span className="info-desc">Seeds create real USDC deposits in DeFi vaults</span>
              </div>
              <div className="info-item">
                <span className="info-icon">📈</span>
                <span className="info-desc">Earn actual yield while crops grow</span>
              </div>
              <div className="info-item">
                <span className="info-icon">⚡</span>
                <span className="info-desc">One-click harvest claims real DeFi rewards</span>
              </div>
            </div>
          </div>

          <div className="controls-section">
            <h3>🎯 Getting Started</h3>
            <div className="steps-group">
              <div className="step-item">
                <span className="step-number">1</span>
                <span className="step-desc">Connect your wallet and ensure you have USDC</span>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <span className="step-desc">Find an empty soil tile and right-click to plant</span>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <span className="step-desc">Wait for crops to mature while earning DeFi yield</span>
              </div>
              <div className="step-item">
                <span className="step-number">4</span>
                <span className="step-desc">Right-click mature crops to harvest rewards</span>
              </div>
            </div>
          </div>
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
          font-size: 28px;
          margin-bottom: 24px;
          color: #87CEEB;
          text-align: center;
          font-weight: 700;
        }
        
        .overlay-content p {
          margin: 8px 0;
          font-size: 16px;
        }

        .controls-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
        }

        .controls-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #87CEEB;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(135, 206, 235, 0.3);
          padding-bottom: 8px;
        }

        .control-group, .info-group, .steps-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-item, .info-item, .step-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
        }

        .control-item:hover, .info-item:hover, .step-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(135, 206, 235, 0.3);
          transform: translateY(-1px);
        }

        .control-keys {
          background: linear-gradient(135deg, #4a5568, #2d3748);
          color: #87CEEB;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          font-family: 'Courier New', monospace;
          border: 1px solid rgba(135, 206, 235, 0.3);
          min-width: 80px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .control-desc, .info-desc, .step-desc {
          color: #e2e8f0;
          font-size: 15px;
          flex: 1;
          line-height: 1.4;
        }

        .info-icon {
          font-size: 24px;
          min-width: 40px;
          text-align: center;
        }

        .step-number {
          background: linear-gradient(135deg, #87CEEB, #4682B4);
          color: #1a202c;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(135, 206, 235, 0.3);
        }

        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .overlay-content {
            padding: 16px 0;
          }
          
          .controls-section {
            padding: 16px;
            margin-bottom: 16px;
          }
          
          .control-item, .info-item, .step-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            padding: 16px;
          }
          
          .control-keys {
            align-self: flex-start;
          }
          
          .overlay-content h2 {
            font-size: 24px;
          }
          
          .controls-section h3 {
            font-size: 16px;
          }
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
      <SettingsDialog />
      
      {/* Flow Building Scene Components */}
      <CorralScene />
      <OrchardScene />
      <WellScene />
      
      {/* Legacy Modals - TODO: Remove these when dialogue system is complete */}
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
