'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { MainScene } from '../lib/MainScene';
import { CropData, CropType } from '../lib/CropSystem';
import { DialogueBox } from './DialogueBox';
import { CropInfo } from './CropInfo';
import { GameModals } from './GameModals';
import { GameUI } from './GameUI';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useChainId } from 'wagmi';
import { BuildingInteractionManager } from '../lib/BuildingInteractionManager';
import { EditorPanel, EditorObject } from './EditorPanel';
import { usePortfolio } from '../hooks/usePortfolio';

interface GameProps {
  worldId?: string;
  isOwnWorld?: boolean;
}

function Game({ worldId, isOwnWorld }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MainScene | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);
  const [showMorphoModal, setShowMorphoModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showFlowStakingModal, setShowFlowStakingModal] = useState(false);
  const [showFlowSwapModal, setShowFlowSwapModal] = useState(false);
  const [showPepeModal, setShowPepeModal] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);
  const [dialogueContent, setDialogueContent] = useState('');
  const [dialogueCharacterName, setDialogueCharacterName] = useState('Guide');
  const [onDialogueContinue, setOnDialogueContinue] = useState<() => void>(() => {});
  const [playerGold, setPlayerGold] = useState(100); // Start with 100 gold for MVP
  
  // Editor state
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [editorMode, setEditorMode] = useState<'info' | 'move'>('info');
  const [selectedEditorObject, setSelectedEditorObject] = useState<EditorObject | null>(null);
  
  // Get user authentication info
  const { user } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Get portfolio data from on-chain
  const { portfolioData, totalValueUsd } = usePortfolio(address);
  
  // Update scene editor mode when it changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setEditorMode(editorMode);
    }
  }, [editorMode]);

  useEffect(() => {
    // Calculate dimensions based on viewport minus bottom bar
    const BAR_HEIGHT = 64; // Must match CSS --bar-height
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight - BAR_HEIGHT;
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: gameWidth,
      height: gameHeight,
      parent: 'game-container',
      backgroundColor: '#87CEEB',
      scene: MainScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false // Set to true to see bounding boxes
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
      },
      render: {
        pixelArt: false,
        antialias: true,
        transparent: false,
        clearBeforeRender: true,
        preserveDrawingBuffer: false
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Pass chat callback to scene - wait for scene to be ready
    setTimeout(() => {
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        sceneRef.current = scene;
        
        // Configure world settings
        scene.setWorldConfiguration(worldId, isOwnWorld);
        
        // Set chain ID for network-specific buildings
        if (chainId) {
          scene.setChainId(chainId);
        }
        
        scene.init({});

        // Set up crop click event listener
        scene.events.on('cropClicked', (crop: CropData) => {
          setSelectedCrop(crop);
        });
        
        // Set up crop harvest event listener
        scene.events.on('cropHarvested', (data: { cropId: string; goldReward: number }) => {
          setPlayerGold(prev => prev + data.goldReward);
          console.log(`💰 Earned ${data.goldReward} gold! Total: ${playerGold + data.goldReward}`);
        });
        
        // Set up editor events
        scene.events.on('editorModeChanged', (enabled: boolean) => {
          setIsEditorMode(enabled);
        });
        
        scene.events.on('editorObjectSelected', (object: EditorObject) => {
          setSelectedEditorObject(object);
        });
        
        // Pass editor callbacks to scene
        scene.setEditorMode(editorMode);
        
        // Initialize BuildingInteractionManager if it exists on the scene
        if (scene.buildingInteractionManager) {
          scene.buildingInteractionManager.initialize(
            {
              setDialogueCharacterName,
              setDialogueContent,
              setOnDialogueContinue,
              setIsDialogueOpen
            },
            {
              setShowMorphoModal,
              setShowMarketplaceModal,
              setShowFlowStakingModal,
              setShowFlowSwapModal,
              setShowPepeModal
            }
          );
        }
      }
    }, 500);

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - BAR_HEIGHT;
        gameRef.current.scale.resize(newWidth, newHeight);
      }
    };


    window.addEventListener('resize', handleResize);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDialogueContinue = () => {
    setIsDialogueOpen(false);
    onDialogueContinue();
  };

  // Monitor chain changes and update buildings
  useEffect(() => {
    if (sceneRef.current && chainId) {
      console.log(`🌐 Chain changed to: ${chainId}`);
      sceneRef.current.setChainId(chainId);
    }
  }, [chainId]);

  // Initialize player once authentication data is available
  useEffect(() => {
    if (address && sceneRef.current) {
      console.log('🎮 Initializing player with address:', address);
      sceneRef.current.initializePlayer({ address, user });
    }
  }, [address, user, sceneRef]);

  // Sync portfolio data with the game scene
  useEffect(() => {
    if (sceneRef.current && portfolioData) {
      console.log('📊 Syncing portfolio data with game:', { portfolioData, totalValueUsd });
      sceneRef.current.syncPortfolio({ portfolioData, totalValueUsd });
    }
  }, [portfolioData, totalValueUsd]);



  const getTotalCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getTotalCrops() : 0;
  };

  const getReadyCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getReadyCrops() : 0;
  };

  const getGrowingCrops = (): number => {
    return sceneRef.current ? sceneRef.current.getGrowingCrops() : 0;
  };


  return (
    <div className="game-wrapper">
      {/* Game UI overlay with wallet and network controls */}
      <GameUI
        getTotalCrops={getTotalCrops}
        getReadyCrops={getReadyCrops}
        getGrowingCrops={getGrowingCrops}
        playerGold={playerGold}
      />

      <DialogueBox
        isOpen={isDialogueOpen}
        content={dialogueContent}
        onClose={() => setIsDialogueOpen(false)}
        onContinue={handleDialogueContinue}
        characterName={dialogueCharacterName}
      />
      
      <div id="game-container" />
      
      {/* Crop Info Panel */}
      <CropInfo 
        crop={selectedCrop} 
        onClose={() => setSelectedCrop(null)} 
      />

      {/* All Game Modals */}
      <GameModals
        showMorphoModal={showMorphoModal}
        showMarketplaceModal={showMarketplaceModal}
        showFlowStakingModal={showFlowStakingModal}
        showFlowSwapModal={showFlowSwapModal}
        showPepeModal={showPepeModal}
        onCloseMorpho={() => setShowMorphoModal(false)}
        onCloseMarketplace={() => setShowMarketplaceModal(false)}
        onCloseFlowStaking={() => setShowFlowStakingModal(false)}
        onCloseFlowSwap={() => setShowFlowSwapModal(false)}
        onClosePepe={() => setShowPepeModal(false)}
      />
      
      {/* Editor Panel */}
      <EditorPanel
        isVisible={isEditorMode}
        selectedObject={selectedEditorObject}
        mode={editorMode}
        onModeChange={setEditorMode}
        onCopyCoords={() => {
          if (selectedEditorObject) {
            navigator.clipboard.writeText(`x: ${Math.round(selectedEditorObject.x)}, y: ${Math.round(selectedEditorObject.y)}`);
          }
        }}
        onExportConfig={() => {
          if (sceneRef.current) {
            sceneRef.current.exportBuildingConfig();
          }
        }}
      />

      <style jsx>{`
        .game-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .top-right-ui {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        #game-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 2px solid #333;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
          background: linear-gradient(135deg, #9932cc, #ff6b35);
        }

        .modal-header h2 {
          margin: 0;
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .modal-header button {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .modal-header button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 20px;
          color: #e0e0e0;
        }

        .modal-body p {
          margin: 0 0 15px 0;
          line-height: 1.6;
        }

        .modal-body ul {
          margin: 15px 0 0 20px;
          padding: 0;
        }

        .modal-body li {
          margin: 8px 0;
          color: #b0b0b0;
        }
      `}</style>
    </div>
  );
}

export default Game;