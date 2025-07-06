'use client';

import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { BuildingDialogueScene, BuildingDialogueConfig } from '@/lib/scenes/BuildingDialogueScene';

interface BuildingDialogueProps {
  isOpen: boolean;
  onClose: () => void;
  config: BuildingDialogueConfig;
}

/**
 * This is the EXACT working component from the demo
 * Just renamed for building use
 */
export function BuildingDialogue({ isOpen, onClose, config }: BuildingDialogueProps) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      return;
    }

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'building-dialogue',
      backgroundColor: '#1a202c',
      scene: [new BuildingDialogueScene(config)],
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

    gameRef.current = new Phaser.Game(gameConfig);
    
    const gameEvents = gameRef.current.events;
    
    const handleAction = () => {
      console.log('🎮 Action triggered');
      config.onAction();
    };
    
    const handleClose = () => {
      console.log('🎮 Closing dialogue');
      onClose();
    };

    gameEvents.on('triggerAction', handleAction);
    gameEvents.on('closeDialogue', handleClose);

    return () => {
      console.log('🎮 Cleaning up BuildingDialogue');
      gameEvents.off('triggerAction', handleAction);
      gameEvents.off('closeDialogue', handleClose);
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isOpen, onClose, config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl relative max-w-4xl max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-10 bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ×
        </button>
        
        <div className="text-center mb-4">
          <h2 className="text-white text-xl font-bold">DeFi Valley Trading Post</h2>
        </div>
        
        <div 
          id="building-dialogue" 
          className="rounded-lg overflow-hidden border-2 border-gray-600"
        />
      </div>
    </div>
  );
}