'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useColyseusConnection } from '../hooks/useColyseusConnection';
import { useGameInput } from '../hooks/useGameInput';
import { MainScene } from '../lib/scenes/MainScene';
import { CropContextMenu } from './CropContextMenu';
import { CropInfo } from './CropInfo';
import { UIStack } from './UIStack';
import BuildingContextMenu from './BuildingContextMenu';
import { useUI, useAppStore } from '@/app/store';

// Import Visual Novel Scenes
import { CorralScene } from '../lib/scenes/CorralScene';
import { OrchardScene } from '../lib/scenes/OrchardScene';
import { WellScene } from '../lib/scenes/WellScene';

export interface GameProps {
  worldId?: string;
  isOwnWorld?: boolean;
}

export default function Game({ worldId, isOwnWorld }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const mainSceneRef = useRef<MainScene | null>(null);
  
  // External state
  const { address } = useAccount();
  const { user } = usePrivy();
  const { room, sessionId, isConnected, error } = useColyseusConnection(worldId);
  
  // UI state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [contextMenuData, setContextMenuData] = useState<{
    type: 'crop' | 'building' | null;
    data: any;
    x: number;
    y: number;
  }>({ type: null, data: null, x: 0, y: 0 });
  
  // UI store
  const {
    isCorralModalOpen,
    isOrchardModalOpen,
    isWellModalOpen,
    openCorralModal,
    openOrchardModal,
    openWellModal,
    closeCorralModal,
    closeOrchardModal,
    closeWellModal,
  } = useUI();

  // Game input handlers
  const inputHandlers = {
    onChatToggle: (isOpen: boolean) => {
      console.log('💬 Chat toggle:', isOpen);
    },
    onChatSubmit: (message: string) => {
      console.log('💬 Chat message sent:', message);
    },
    onMovement: (direction: string, isMoving: boolean) => {
      console.log('🚶 Movement:', direction, isMoving);
    },
  };

  const { isChatOpen } = useGameInput(room, inputHandlers);

  // Scene callbacks
  const sceneCallbacks = {
    onChatMessage: (message: any) => {
      setChatMessages(prev => [...prev, message]);
    },
    onCropContextMenu: (crop: any, x: number, y: number) => {
      setContextMenuData({ type: 'crop', data: crop, x, y });
    },
    onBuildingContextMenu: (buildingId: string, buildingType: string) => {
      setContextMenuData({ 
        type: 'building', 
        data: { id: buildingId, type: buildingType }, 
        x: 0, 
        y: 0 
      });
    },
    onShowCorralModal: () => openCorralModal(),
    onShowOrchardModal: () => openOrchardModal(),
    onShowWellModal: () => openWellModal(),
  };

  // Initialize Phaser game
  useEffect(() => {
    if (!room || !sessionId || !isConnected) return;

    console.log('🎮 Initializing Phaser game...');

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      parent: 'game-container',
      backgroundColor: '#2d5a3d',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [MainScene, CorralScene, OrchardScene, WellScene],
      render: {
        pixelArt: true,
        antialias: false,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    // Get main scene reference
    gameRef.current.events.once('ready', () => {
      const mainScene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (mainScene) {
        mainSceneRef.current = mainScene;
        
        // Initialize scene with connection data
        mainScene.init({
          room,
          sessionId,
          worldId,
          isOwnWorld,
          address,
          user,
        });
        
        // Set up scene callbacks
        mainScene.setCallbacks(sceneCallbacks);
        
        console.log('🎮 Game initialized successfully');
      }
    });

    return () => {
      if (gameRef.current) {
        console.log('🎮 Destroying Phaser game...');
        mainSceneRef.current?.cleanup();
        gameRef.current.destroy(true);
        gameRef.current = null;
        mainSceneRef.current = null;
      }
    };
  }, [room, sessionId, isConnected]);

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    if (contextMenuData.type === 'crop') {
      const crop = contextMenuData.data;
      const cropSystem = mainSceneRef.current?.getCropSystem();
      
      switch (action) {
        case 'harvest':
          cropSystem?.harvestCrop(crop.id);
          break;
        case 'water':
          cropSystem?.waterCrop(crop.id);
          break;
        case 'remove':
          cropSystem?.removeCrop(crop.id);
          break;
      }
    } else if (contextMenuData.type === 'building') {
      const building = contextMenuData.data;
      console.log(`🏠 Building action: ${action} on ${building.type}`);
    }
    
    // Close context menu
    setContextMenuData({ type: null, data: null, x: 0, y: 0 });
  };

  // Loading state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">
            {error ? 'Connection Error' : 'Connecting to Game...'}
          </h2>
          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}
          <p className="text-gray-600">
            {error ? 'Please check your connection and try again.' : 'Please wait while we connect you to the game world.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-wrapper relative w-full h-screen overflow-hidden">
      {/* Phaser Game Container */}
      <div id="game-container" className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="relative w-full h-full">
          {/* UI Stack */}
          <UIStack />
          
          {/* Crop Information */}
          <CropInfo />
          
          {/* Chat Interface */}
          {isChatOpen && (
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg pointer-events-auto">
              <div className="mb-2 h-32 overflow-y-auto">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-bold">{msg.name}:</span> {msg.message}
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      room?.send('chat', { message: target.value.trim() });
                      target.value = '';
                    }
                  }
                }}
                autoFocus
              />
            </div>
          )}
          
          {/* Context Menus */}
          {contextMenuData.type === 'crop' && (
            <CropContextMenu
              crop={contextMenuData.data}
              x={contextMenuData.x}
              y={contextMenuData.y}
              onAction={handleContextMenuAction}
              onClose={() => setContextMenuData({ type: null, data: null, x: 0, y: 0 })}
            />
          )}
          
          {contextMenuData.type === 'building' && (
            <BuildingContextMenu
              building={contextMenuData.data}
              onAction={handleContextMenuAction}
              onClose={() => setContextMenuData({ type: null, data: null, x: 0, y: 0 })}
            />
          )}
          
          {/* Game Controls Hint */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg text-sm">
            <div className="space-y-1">
              <div><strong>WASD</strong> - Move</div>
              <div><strong>Enter</strong> - Chat</div>
              <div><strong>Right Click</strong> - Context Menu</div>
              <div><strong>Esc</strong> - Close/Cancel</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal Scenes */}
      {isCorralModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Corral</h2>
            <p className="mb-4">Welcome to the Corral! Here you can manage your livestock.</p>
            <button 
              onClick={closeCorralModal}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {isOrchardModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Orchard</h2>
            <p className="mb-4">Welcome to the Orchard! Here you can tend to your fruit trees.</p>
            <button 
              onClick={closeOrchardModal}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {isWellModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Well</h2>
            <p className="mb-4">Welcome to the Well! Here you can draw water for your crops.</p>
            <button 
              onClick={closeWellModal}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}