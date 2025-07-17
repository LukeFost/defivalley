'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { MainScene, type ChatMessage } from '../lib/MainScene';
import { CropData, CropType } from '../lib/CropSystem';
import { DialogueBox } from './DialogueBox';
import { CropContextMenu } from './CropContextMenu';
import { CropInfo } from './CropInfo';
import { GameModals } from './GameModals';
import { GameUI } from './GameUI';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useChainId } from 'wagmi';
import { BuildingInteractionManager } from '../lib/BuildingInteractionManager';
import { EditorPanel, EditorObject } from './EditorPanel';
import { DeviceDetector } from '../lib/utils/deviceDetection';

interface GameProps {
  worldId?: string;
  isOwnWorld?: boolean;
}

function Game({ worldId, isOwnWorld }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
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
  
  // Update scene editor mode when it changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setEditorMode(editorMode);
    }
  }, [editorMode]);

  useEffect(() => {
    // Get device capabilities for mobile optimization
    const deviceDetector = DeviceDetector.getInstance();
    const capabilities = deviceDetector.getCapabilities();
    const isMobileDevice = deviceDetector.needsTouchControls();
    
    console.log('🔧 Initializing game with device capabilities:', capabilities);
    
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
        mode: isMobileDevice ? Phaser.Scale.FIT : Phaser.Scale.RESIZE,
        parent: 'game-container',
        autoCenter: isMobileDevice ? Phaser.Scale.CENTER_BOTH : Phaser.Scale.NO_CENTER,
        width: isMobileDevice ? 1024 : '100%',
        height: isMobileDevice ? 768 : '100%',
        min: {
          width: 320,
          height: 480
        },
        max: {
          width: 1400,
          height: 1050
        }
      },
      render: {
        pixelArt: false,
        antialias: !isMobileDevice || capabilities.gpu === 'high', // Disable AA on low-end mobile
        transparent: false,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        powerPreference: isMobileDevice ? 'low-power' : 'high-performance'
      },
      // Mobile-specific optimizations
      fps: {
        target: isMobileDevice && capabilities.gpu === 'low' ? 30 : 60,
        forceSetTimeOut: isMobileDevice
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Pass chat callback to scene - wait for scene to be ready
    setTimeout(() => {
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        sceneRef.current = scene;
        
        // Configure world settings and auth info
        scene.setWorldConfiguration(worldId, isOwnWorld);
        scene.setAuthInfo(address, user);
        
        // Set chain ID for network-specific buildings
        if (chainId) {
          scene.setChainId(chainId);
        }
        
        scene.init({
          chatCallback: (message: ChatMessage) => {
            setChatMessages(prev => [...prev, message]);
          }
        });

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
        
        // Handle mobile chat events
        const handleMobileChatOpen = () => {
          setShowChat(true);
        };
        
        // Listen for mobile chat events
        if (typeof window !== 'undefined') {
          (window as any).eventBus?.on('mobile:chat-open', handleMobileChatOpen);
        }
        
        // Cleanup event listener
        return () => {
          if (typeof window !== 'undefined') {
            (window as any).eventBus?.off('mobile:chat-open', handleMobileChatOpen);
          }
        };
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

    // Handle Enter key for chat
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is already typing in chat input
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      
      if (event.key === 'Enter') {
        event.preventDefault();
        setShowChat(true);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Chat submit:', chatInput, 'Scene ref:', sceneRef.current);
    if (chatInput.trim() && sceneRef.current) {
      sceneRef.current.sendChatMessage(chatInput);
      setChatInput('');
      setShowChat(false);
    } else {
      console.log('Cannot send chat - missing input or scene reference');
    }
  };

  // Crop system handlers
  const handlePlantCrop = (cropType: CropType, x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.plantCrop(cropType, x, y);
    }
  };

  const handleRemoveCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.removeCropAtPosition(x, y);
    }
  };

  const handleHarvestCrop = (x: number, y: number) => {
    if (sceneRef.current) {
      sceneRef.current.harvestCropAtPosition(x, y);
    }
  };

  const canPlantAt = (x: number, y: number): boolean => {
    return sceneRef.current ? sceneRef.current.canPlantAt(x, y) : false;
  };

  const getCropAt = (x: number, y: number) => {
    return sceneRef.current ? sceneRef.current.getCropAt(x, y) : null;
  };

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
      {/* Game UI overlay with chat, wallet, and network controls */}
      <GameUI
        chatMessages={chatMessages}
        chatInput={chatInput}
        showChat={showChat}
        onChatSubmit={handleChatSubmit}
        onChatInputChange={setChatInput}
        onShowChatChange={setShowChat}
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
      
      <CropContextMenu
        onPlantCrop={handlePlantCrop}
        onRemoveCrop={handleRemoveCrop}
        onHarvestCrop={handleHarvestCrop}
        canPlantAt={canPlantAt}
        getCropAt={getCropAt}
      >
        <div 
          id="game-container" 
          className="w-full h-full touch-none select-none"
          style={{ 
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            touchAction: 'none'
          }}
        />
      </CropContextMenu>
      
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
          -webkit-overflow-scrolling: touch;
          -webkit-transform: translate3d(0,0,0);
          transform: translate3d(0,0,0);
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