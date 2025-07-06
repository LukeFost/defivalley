'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { VisualNovelScene, DialogueConfig, DialogueChoice } from '@/lib/scenes/VisualNovelScene';

interface BuildingNPCConfig {
  npcName: string;
  greeting: string;
  backgroundColorHex: number;
  actionChoiceText: string;
  actionCallback: () => void;
  infoChoiceText?: string;
  infoDialogue?: string;
  leaveText?: string;
}

interface InteractiveBuildingSceneProps {
  isOpen: boolean;
  onClose: () => void;
  config: BuildingNPCConfig;
  sceneKey: string;
}

/**
 * Generic Interactive Building Scene using Phaser Visual Novel system
 * Replaces the modal-based BuildingInteractionScene with full-screen Phaser scenes
 */
class BuildingScene extends VisualNovelScene {
  private npcConfig: BuildingNPCConfig;

  constructor(key: string, config: BuildingNPCConfig) {
    super({ key });
    this.npcConfig = config;
  }

  create() {
    super.create();
    
    // Set building-specific background
    this.setBackground(undefined, this.npcConfig.backgroundColorHex);
    
    // Start the conversation immediately
    this.startConversation();
  }

  private startConversation(): void {
    const choices: DialogueChoice[] = [
      {
        text: this.npcConfig.actionChoiceText,
        action: () => this.handleAction(),
      }
    ];

    // Add info choice if provided
    if (this.npcConfig.infoChoiceText && this.npcConfig.infoDialogue) {
      choices.push({
        text: this.npcConfig.infoChoiceText,
        action: () => this.handleInfo(),
      });
    }

    // Add leave choice
    choices.push({
      text: this.npcConfig.leaveText || 'Leave',
      action: () => this.handleLeave(),
    });

    const initialDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: this.npcConfig.greeting,
      choices: choices,
    };
    
    this.showDialogue(initialDialogue);
  }

  private handleAction(): void {
    const confirmDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Perfect! Let me set that up for you right away.",
    };
    
    this.showDialogue(confirmDialogue);

    // Wait a moment for the dialogue to be read, then trigger the action
    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerBuildingAction');
    });
  }

  private handleInfo(): void {
    if (!this.npcConfig.infoDialogue) return;

    const infoDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: this.npcConfig.infoDialogue,
      choices: [
        {
          text: this.npcConfig.actionChoiceText,
          action: () => this.handleAction(),
        },
        {
          text: 'Let me think about it',
          action: () => this.handleLeave(),
        },
      ],
    };
    
    this.showDialogue(infoDialogue);
  }
  
  private handleLeave(): void {
    const leaveDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Come back anytime! I'll be here when you're ready.",
    };
    
    this.showDialogue(leaveDialogue);

    // Close the scene after a delay
    this.time.delayedCall(2000, () => {
      this.game.events.emit('closeBuildingScene');
    });
  }
}

export function InteractiveBuildingScene({ 
  isOpen, 
  onClose, 
  config, 
  sceneKey 
}: InteractiveBuildingSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isGameReady, setIsGameReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Clean up game when closed
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      setIsGameReady(false);
      return;
    }

    // Create Phaser game when opened
    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: `building-scene-${sceneKey}`,
      backgroundColor: '#1a202c',
      scene: [new BuildingScene(sceneKey, config)],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(gameConfig);
    
    // Set up event listeners
    const gameEvents = gameRef.current.events;
    
    const handleAction = () => {
      console.log('🎮 Building action triggered');
      config.actionCallback();
    };
    
    const handleClose = () => {
      console.log('🎮 Building scene closing');
      onClose();
    };

    const handleGameReady = () => {
      console.log('🎮 Building scene ready');
      setIsGameReady(true);
    };

    // Register event listeners
    gameEvents.on('triggerBuildingAction', handleAction);
    gameEvents.on('closeBuildingScene', handleClose);
    gameEvents.on('ready', handleGameReady);

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      console.log('🎮 Cleaning up InteractiveBuildingScene');
      gameEvents.off('triggerBuildingAction', handleAction);
      gameEvents.off('closeBuildingScene', handleClose);
      gameEvents.off('ready', handleGameReady);
      window.removeEventListener('resize', handleResize);
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isOpen, onClose, config, sceneKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading indicator */}
      {!isGameReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading {config.npcName}...</p>
          </div>
        </div>
      )}
      
      {/* Game container */}
      <div 
        id={`building-scene-${sceneKey}`}
        className="w-full h-full"
      />
      
      {/* Emergency close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full w-10 h-10 flex items-center justify-center transition-all"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}