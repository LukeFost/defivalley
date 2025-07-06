'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useAccount, useChainId } from 'wagmi';
import { flowMainnet } from '@/app/wagmi';
import { VisualNovelScene, DialogueConfig, DialogueChoice } from '@/lib/scenes/VisualNovelScene';
import { useSwapFlow } from '@/lib/hooks/useSwapFlow';
import { useMintFVIX } from '@/lib/hooks/useMintFVIX';
import { useStakeFVIX } from '@/lib/hooks/useStakeFVIX';

interface FlowNPCConfig {
  npcName: string;
  greeting: string;
  backgroundColorHex: number;
  buildingType: 'corral' | 'well' | 'orchard';
}

interface FlowInteractiveSceneProps {
  isOpen: boolean;
  onClose: () => void;
  config: FlowNPCConfig;
}

/**
 * Flow-specific Interactive Scene that handles actual transactions
 * Replaces all modal-based interactions with direct blockchain calls
 */
class FlowBuildingScene extends VisualNovelScene {
  private npcConfig: FlowNPCConfig;
  private swapHook: any;
  private mintHook: any;
  private stakeHook: any;
  private userAddress: string | undefined;

  constructor(key: string, config: FlowNPCConfig, hooks: any, address: string | undefined) {
    super({ key });
    this.npcConfig = config;
    this.swapHook = hooks.swapHook;
    this.mintHook = hooks.mintHook;
    this.stakeHook = hooks.stakeHook;
    this.userAddress = address;
  }

  create() {
    super.create();
    this.setBackground(undefined, this.npcConfig.backgroundColorHex);
    this.startConversation();
  }

  private startConversation(): void {
    const choices: DialogueChoice[] = [];

    // Add building-specific choices
    if (this.npcConfig.buildingType === 'corral') {
      choices.push({
        text: 'I want to swap FLOW → FROTH',
        action: () => this.handleSwapFlow(),
      });
    } else if (this.npcConfig.buildingType === 'well') {
      choices.push({
        text: 'I want to mint FVIX with FROTH',
        action: () => this.handleMintFVIX(),
      });
    } else if (this.npcConfig.buildingType === 'orchard') {
      choices.push({
        text: 'I want to stake FVIX → sFVIX',
        action: () => this.handleStakeFVIX(),
      });
    }

    // Add info and leave choices
    choices.push({
      text: 'Tell me about the process',
      action: () => this.showProcessInfo(),
    });

    choices.push({
      text: 'Leave',
      action: () => this.handleLeave(),
    });

    const initialDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: this.npcConfig.greeting,
      choices: choices,
    };
    
    this.showDialogue(initialDialogue);
  }

  private async handleSwapFlow(): void {
    const loadingDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Perfect! Let me help you swap FLOW for FROTH. I'll need you to approve the transaction and specify the amount...",
    };
    this.showDialogue(loadingDialogue);

    // Emit event to trigger swap with amount input
    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerSwapFlow');
    });
  }

  private async handleMintFVIX(): void {
    const loadingDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Excellent! The minting ritual begins. I'll need you to approve your FROTH tokens and specify how much FVIX to mint...",
    };
    this.showDialogue(loadingDialogue);

    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerMintFVIX');
    });
  }

  private async handleStakeFVIX(): void {
    const loadingDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Wonderful! Let me help you stake your FVIX tokens. I'll guide you through the approval and staking process...",
    };
    this.showDialogue(loadingDialogue);

    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerStakeFVIX');
    });
  }

  private showProcessInfo(): void {
    let infoText = '';
    
    if (this.npcConfig.buildingType === 'corral') {
      infoText = "The Flow Trading Corral is where your journey begins! Here you can swap your FLOW tokens for FROTH using our advanced DEX. The process is simple: specify how much FLOW you want to swap, approve the transaction, and receive FROTH tokens instantly. These FROTH tokens are your gateway to the rest of the DeFi valley!";
    } else if (this.npcConfig.buildingType === 'well') {
      infoText = "The Ancient Well transforms FROTH into powerful FVIX tokens through a mystical minting process. You'll need at least 10,000 FROTH tokens to begin the ritual. First, approve your FROTH for the FVIX contract, then specify how much FVIX you want to mint. The well will work its magic!";
    } else if (this.npcConfig.buildingType === 'orchard') {
      infoText = "The Sacred Orchard is where your FVIX tokens can grow into yield-bearing sFVIX! When you stake here, you'll receive sFVIX tokens that represent your staked position and continue earning rewards. You can claim rewards anytime without unstaking, and your sFVIX can even be planted as special crops in the valley!";
    }

    const infoDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: infoText,
      choices: [
        {
          text: 'Got it, let\'s proceed!',
          action: () => this.startConversation(),
        },
        {
          text: 'I need more time to think',
          action: () => this.handleLeave(),
        },
      ],
    };
    
    this.showDialogue(infoDialogue);
  }
  
  private handleLeave(): void {
    const leaveDialogue: DialogueConfig = {
      speaker: this.npcConfig.npcName,
      text: "Come back anytime! I'll be here when you're ready to continue your DeFi journey.",
    };
    
    this.showDialogue(leaveDialogue);

    this.time.delayedCall(2000, () => {
      this.game.events.emit('closeFlowScene');
    });
  }
}

export function FlowInteractiveScene({ isOpen, onClose, config }: FlowInteractiveSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isGameReady, setIsGameReady] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Hooks for blockchain interactions
  const swapHook = useSwapFlow();
  const mintHook = useMintFVIX();
  const stakeHook = useStakeFVIX();

  const isOnFlow = chainId === flowMainnet.id;

  useEffect(() => {
    if (!isOpen || !isOnFlow) {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      setIsGameReady(false);
      return;
    }

    // Create Phaser game when opened
    const sceneKey = `flow-${config.buildingType}-scene`;
    const hooks = { swapHook, mintHook, stakeHook };
    
    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: `flow-scene-${config.buildingType}`,
      backgroundColor: '#1a202c',
      scene: [new FlowBuildingScene(sceneKey, config, hooks, address)],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(gameConfig);
    
    // Set up event listeners
    const gameEvents = gameRef.current.events;
    
    const handleSwapFlow = () => {
      console.log('🔄 Triggering FLOW → FROTH swap');
      onClose();
      // Emit event to open swap modal
      window.dispatchEvent(new CustomEvent('openSwapModal'));
    };
    
    const handleMintFVIX = () => {
      console.log('⚡ Triggering FROTH → FVIX mint');
      onClose();
      // Emit event to open mint modal
      window.dispatchEvent(new CustomEvent('openMintModal'));
    };

    const handleStakeFVIX = () => {
      console.log('🌱 Triggering FVIX → sFVIX stake');
      onClose();
      // Emit event to open stake modal
      window.dispatchEvent(new CustomEvent('openStakeModal'));
    };
    
    const handleClose = () => {
      console.log('🚪 Closing Flow scene');
      onClose();
    };

    const handleGameReady = () => {
      console.log('🎮 Flow scene ready');
      setIsGameReady(true);
    };

    // Register event listeners
    gameEvents.on('triggerSwapFlow', handleSwapFlow);
    gameEvents.on('triggerMintFVIX', handleMintFVIX);
    gameEvents.on('triggerStakeFVIX', handleStakeFVIX);
    gameEvents.on('closeFlowScene', handleClose);
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
      console.log('🧹 Cleaning up FlowInteractiveScene');
      gameEvents.off('triggerSwapFlow', handleSwapFlow);
      gameEvents.off('triggerMintFVIX', handleMintFVIX);
      gameEvents.off('triggerStakeFVIX', handleStakeFVIX);
      gameEvents.off('closeFlowScene', handleClose);
      gameEvents.off('ready', handleGameReady);
      window.removeEventListener('resize', handleResize);
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isOpen, isOnFlow, onClose, config, address]);

  // Don't render if not on Flow network or not open
  if (!isOpen || !isOnFlow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
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
        id={`flow-scene-${config.buildingType}`}
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