'use client';

import { useState, useEffect } from 'react';
import GameWrapper from '@/components/GameWrapper';
import { Auth } from '@/components/Auth';
import SettingsDialog from '@/components/SettingsDialog';
import Notifications from '@/components/Notifications';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

export default function Home() {
  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  
  const { authenticated } = usePrivy();
  const { isConnected, address } = useAccount();

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('defivalley-onboarding-complete');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
      setGameStarted(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('defivalley-onboarding-complete', 'true');
    setShowOnboarding(false);
    setGameStarted(true);
  };

  return (
    <div className="game-view-container">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-content">
            <h1 className="onboarding-title">Welcome to DeFi Valley! 🌱</h1>
            
            <div className="onboarding-steps">
              <div className="step">
                <span className="step-icon">🎮</span>
                <h3>Move Around</h3>
                <p>Use WASD or arrow keys to explore your farm</p>
              </div>
              
              <div className="step">
                <span className="step-icon">🌱</span>
                <h3>Plant Crops</h3>
                <p>Right-click on farm plots to plant and grow crops</p>
              </div>
              
              <div className="step">
                <span className="step-icon">💰</span>
                <h3>Earn Rewards</h3>
                <p>Harvest crops to earn gold and experience</p>
              </div>
              
              <div className="step">
                <span className="step-icon">🔗</span>
                <h3>Connect Wallet (Optional)</h3>
                <p>Link your wallet to save progress and unlock DeFi features</p>
              </div>
            </div>
            
            <div className="starting-bonus">
              <p>🎁 You're starting with <strong>100 gold</strong> as a welcome gift!</p>
            </div>
            
            <button 
              className="start-button"
              onClick={completeOnboarding}
            >
              Start Playing! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Full viewport game wrapper - only render after onboarding */}
      {gameStarted && (
        <div className="game-viewport-wrapper">
          <GameWrapper worldId="local" isOwnWorld={true} />
        </div>
      )}
      
      {/* Bottom bar with toggle button */}
      <div className="bottom-bar">
        <div className="farm-info">
          <span className="farm-title">
            🌱 My Farm
          </span>
          {gameStarted && (
            <span className="farm-stats">
              Level 1 • {
                authenticated && isConnected ? 
                  `${address?.slice(0, 6)}...${address?.slice(-4)}` : 
                  authenticated && !isConnected ? 
                    'Wallet Locked' : 
                    'Guest Mode'
              }
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
        
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(10px);
        }
        
        .onboarding-content {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 600px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .onboarding-title {
          margin: 0 0 32px 0;
          font-size: 32px;
          color: #2d5016;
        }
        
        .onboarding-steps {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin: 32px 0;
        }
        
        .step {
          text-align: left;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .step-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }
        
        .step h3 {
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #333;
        }
        
        .step p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }
        
        .starting-bonus {
          background: #fef3c7;
          padding: 12px;
          border-radius: 8px;
          margin: 24px 0;
        }
        
        .starting-bonus p {
          margin: 0;
          color: #78350f;
        }
        
        .start-button {
          background: #10b981;
          color: white;
          padding: 12px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 18px;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .start-button:hover {
          transform: scale(1.05);
        }
        
        .farm-stats {
          font-size: 14px;
          color: #888;
          margin-left: 16px;
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
      <SettingsDialog />
      
      {/* Global Notification System */}
      <Notifications />
    </div>
  );
}
