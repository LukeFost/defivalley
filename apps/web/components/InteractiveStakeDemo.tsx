'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useUI } from '@/app/store';
import { InteractiveStakeScene } from '@/lib/scenes/InteractiveStakeScene';

interface InteractiveStakeDemoProps {
  onClose: () => void;
}

/**
 * InteractiveStakeDemo - React component that hosts the interactive staking scene
 * 
 * This component creates a Phaser game instance with the InteractiveStakeScene
 * and handles communication between the game and the React UI store.
 */
export function InteractiveStakeDemo({ onClose }: InteractiveStakeDemoProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isGameReady, setIsGameReady] = useState(false);
  const { showStakeModal } = useUI();

  useEffect(() => {
    // Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'interactive-stake-demo',
      backgroundColor: '#1a202c',
      scene: [InteractiveStakeScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    // Create the game instance
    gameRef.current = new Phaser.Game(config);
    
    // Set up event listeners
    const gameEvents = gameRef.current.events;
    
    const handleOpenModal = () => {
      console.log('🎮 Game event: Opening stake modal');
      showStakeModal();
    };
    
    const handleCloseScene = () => {
      console.log('🎮 Game event: Closing interactive dialogue');
      onClose();
    };

    const handleGameReady = () => {
      console.log('🎮 Game ready');
      setIsGameReady(true);
    };

    // Register event listeners
    gameEvents.on('openStakeModal', handleOpenModal);
    gameEvents.on('closeInteractiveDialogue', handleCloseScene);
    gameEvents.on('ready', handleGameReady);

    // Cleanup function
    return () => {
      console.log('🎮 Cleaning up InteractiveStakeDemo');
      gameEvents.off('openStakeModal', handleOpenModal);
      gameEvents.off('closeInteractiveDialogue', handleCloseScene);
      gameEvents.off('ready', handleGameReady);
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onClose, showStakeModal]);

  const handleCloseClick = () => {
    console.log('🎮 User clicked close button');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl relative max-w-4xl max-h-[90vh]">
        {/* Close button */}
        <button 
          onClick={handleCloseClick}
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-10 bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          ×
        </button>
        
        {/* Game title */}
        <div className="text-center mb-4">
          <h2 className="text-white text-xl font-bold">Interactive Staking Demo</h2>
          <p className="text-gray-300 text-sm">Make dialogue choices to interact with the NPC</p>
        </div>
        
        {/* Loading indicator */}
        {!isGameReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading interactive scene...</p>
            </div>
          </div>
        )}
        
        {/* Game container */}
        <div 
          id="interactive-stake-demo" 
          className="rounded-lg overflow-hidden border-2 border-gray-600"
        />
        
        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Click on the dialogue choices to interact with the NPC. 
            Choose "I just want to stake now" to open the staking modal.
          </p>
        </div>
      </div>
    </div>
  );
}