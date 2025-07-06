import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { StakeModal } from './modals/StakeModal';
import { useUI } from '@/app/store';
import { StakeRequestScene } from '@/lib/scenes/StakeRequestScene';

interface StakeRequestDemoProps {
  onClose?: () => void;
}

/**
 * StakeRequestDemo - A React component that demonstrates the dialogue-triggered staking modal
 * 
 * This component:
 * 1. Creates a Phaser game with the StakeRequestScene
 * 2. Handles the bridge between Phaser dialogue and React StakeModal
 * 3. Shows how NPCs can trigger staking modals through conversation
 */
export function StakeRequestDemo({ onClose }: StakeRequestDemoProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { showStakeModal, hideStakeModal, isStakeModalOpen } = useUI();

  useEffect(() => {
    // Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'stake-request-demo',
      backgroundColor: '#2C3E50',
      scene: [StakeRequestScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      }
    };

    // Create the Phaser game
    gameRef.current = new Phaser.Game(config);

    // Set up event listeners for modal opening
    const handleOpenStakeModal = () => {
      console.log('🎯 Opening stake modal from Phaser scene');
      showStakeModal();
    };

    // Listen for the custom event from Phaser
    gameRef.current.events.on('openStakeModal', handleOpenStakeModal);

    // Start the scene with the modal callback
    const scene = gameRef.current.scene.getScene('StakeRequestScene');
    if (scene) {
      scene.scene.restart({
        openStakeModalCallback: handleOpenStakeModal,
        previousScene: 'MainScene'
      });
    }

    // Cleanup function
    return () => {
      if (gameRef.current) {
        gameRef.current.events.off('openStakeModal', handleOpenStakeModal);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [showStakeModal]);

  const handleCloseDemo = () => {
    // Close any open modals
    if (isStakeModalOpen) {
      hideStakeModal();
    }
    
    // Close the demo
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">🎯 Dialogue-Triggered Staking Demo</h2>
            <button
              onClick={handleCloseDemo}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">
            Click or press SPACE/ENTER to advance dialogue. Choose to accept or decline the stake offer.
          </p>
        </div>

        {/* Game Container */}
        <div className="relative">
          <div id="stake-request-demo" className="w-full h-[600px] bg-gray-900" />
          
          {/* Instructions Overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm max-w-xs">
            <h3 className="font-bold mb-2">📖 Instructions:</h3>
            <ul className="space-y-1 text-xs">
              <li>• Click anywhere or press SPACE/ENTER to advance dialogue</li>
              <li>• Wait for the NPC to make the stake offer</li>
              <li>• Choose "Accept Stake Offer" to open the modal</li>
              <li>• The modal will show token input and staking controls</li>
            </ul>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 p-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Status: {isStakeModalOpen ? '🎯 Stake Modal Open' : '💬 In Dialogue'}
            </span>
            <span className="text-gray-500">
              Scene: StakeRequestScene
            </span>
          </div>
        </div>
      </div>

      {/* The actual StakeModal component */}
      <StakeModal />
    </div>
  );
}