# Scene Transition System Integration Examples

This document provides examples of how to integrate the scene transition system with your existing DeFi Valley components.

## 1. Basic Setup in App/Layout

```tsx
// app/layout.tsx or wherever you set up providers
import { SceneManagerProvider } from '@/lib/scenes/SceneManager';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SceneManagerProvider>
          {children}
        </SceneManagerProvider>
      </body>
    </html>
  );
}
```

## 2. Integrating with Existing Game Component

```tsx
// components/Game.tsx - Enhanced version
import { useSceneTransitions, SceneTransitionWrapper } from '@/lib/scenes/SceneManager';

function Game({ worldId, isOwnWorld }: GameProps) {
  const sceneTransitions = useSceneTransitions();
  
  // Store the Phaser game instance globally for scene transitions
  useEffect(() => {
    if (gameRef.current) {
      (window as any).phaserGameInstance = gameRef.current;
    }
  }, []);

  // Update building modal handlers to use scene transitions
  const showCorralModal = useCallback(async () => {
    await sceneTransitions.toCorral({ worldId, isOwnWorld });
  }, [sceneTransitions, worldId, isOwnWorld]);

  const showOrchardModal = useCallback(async () => {
    await sceneTransitions.toOrchard({ worldId, isOwnWorld });
  }, [sceneTransitions, worldId, isOwnWorld]);

  const showWellModal = useCallback(async () => {
    await sceneTransitions.toWell({ worldId, isOwnWorld });
  }, [sceneTransitions, worldId, isOwnWorld]);

  return (
    <SceneTransitionWrapper scene="main">
      <div className="game-wrapper">
        {/* Existing game content */}
        <div id="game-container" />
        
        {/* UI Stack and other components */}
        <UIStack chatContainer={chatContainer} />
        <CropInfo crop={selectedCrop} onClose={() => setSelectedCrop(null)} />
      </div>
    </SceneTransitionWrapper>
  );
}
```

## 3. Enhanced Building Interaction Scenes

```tsx
// components/scenes/EnhancedBuildingScene.tsx
import { useSceneTransitions, useSceneManager } from '@/lib/scenes/SceneManager';
import { BuildingInteractionScene } from './BuildingInteractionScene';

interface EnhancedBuildingSceneProps {
  isOpen: boolean;
  onClose: () => void;
  buildingType: 'corral' | 'orchard' | 'well';
}

export function EnhancedBuildingScene({ isOpen, onClose, buildingType }: EnhancedBuildingSceneProps) {
  const sceneTransitions = useSceneTransitions();
  const { transitionState } = useSceneManager();

  // Get building data from transition state
  const buildingData = transitionState.data;

  const handleClose = useCallback(async () => {
    await sceneTransitions.returnToPrevious();
    onClose();
  }, [sceneTransitions, onClose]);

  const handleAction = useCallback(() => {
    // Handle the building-specific action
    console.log(`Performing action for ${buildingType}`, buildingData);
  }, [buildingType, buildingData]);

  // Building configurations
  const configs = {
    corral: {
      emoji: '🐎',
      title: 'Trading Corral',
      description: 'Swap FLOW tokens for FROTH',
      // ... other config
    },
    orchard: {
      emoji: '🌳',
      title: 'Sacred Orchard',
      description: 'Stake FVIX tokens for sFVIX',
      // ... other config
    },
    well: {
      emoji: '🪣',
      title: 'Mystical Well',
      description: 'Mint FVIX from FROTH',
      // ... other config
    }
  };

  return (
    <BuildingInteractionScene
      isOpen={isOpen}
      onClose={handleClose}
      onActionClick={handleAction}
      config={configs[buildingType]}
    />
  );
}
```

## 4. Store Integration

```tsx
// app/store.ts - Enhanced with scene management
import { useSceneManager } from '@/lib/scenes/SceneManager';

// Add scene-aware store actions
export const useAppStore = create<AppState>((set, get) => ({
  // Existing store state...

  // Enhanced modal functions that use scene transitions
  showCorralModal: async () => {
    const sceneManager = useSceneManager();
    await sceneManager.toBuildingScene('corral');
  },

  showOrchardModal: async () => {
    const sceneManager = useSceneManager();
    await sceneManager.toBuildingScene('orchard');
  },

  showWellModal: async () => {
    const sceneManager = useSceneManager();
    await sceneManager.toBuildingScene('well');
  },

  // Scene-aware state
  currentScene: 'main' as SceneType,
  setCurrentScene: (scene: SceneType) => set({ currentScene: scene }),
}));
```

## 5. Main App Component with Scene Management

```tsx
// app/page.tsx or main component
import { SceneManagerProvider, useSceneManager, SceneTransitionDebugPanel } from '@/lib/scenes/SceneManager';
import { EnhancedBuildingScene } from '@/components/scenes/EnhancedBuildingScene';

function AppContent() {
  const { currentScene, transitionState } = useSceneManager();
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [currentBuildingType, setCurrentBuildingType] = useState<'corral' | 'orchard' | 'well' | null>(null);

  // Handle scene changes
  const handleSceneChange = useCallback((scene: SceneType, data?: SceneData) => {
    if (scene === 'building' && data?.buildingType) {
      setCurrentBuildingType(data.buildingType);
      setBuildingModalOpen(true);
    } else if (scene === 'main') {
      setBuildingModalOpen(false);
      setCurrentBuildingType(null);
    }
  }, []);

  return (
    <div className="app-container">
      {/* Main Game Scene */}
      {currentScene === 'main' && (
        <Game worldId={worldId} isOwnWorld={isOwnWorld} />
      )}

      {/* Building Interaction Scene */}
      {currentBuildingType && (
        <EnhancedBuildingScene
          isOpen={buildingModalOpen}
          onClose={() => setBuildingModalOpen(false)}
          buildingType={currentBuildingType}
        />
      )}

      {/* Debug Panel (development only) */}
      {process.env.NODE_ENV === 'development' && <SceneTransitionDebugPanel />}
    </div>
  );
}

export default function App() {
  return (
    <SceneManagerProvider onSceneChange={handleSceneChange}>
      <AppContent />
    </SceneManagerProvider>
  );
}
```

## 6. Phaser Scene Integration

```typescript
// In your MainScene class (Game.tsx)
class MainScene extends Phaser.Scene {
  // Add scene transition support
  private sceneTransitionSystem: any;

  create() {
    // Existing create logic...

    // Set up scene transition hooks
    this.setupSceneTransitions();
  }

  private setupSceneTransitions() {
    // Listen for building interactions
    this.buildingHotspots.forEach((hotspot, buildingId) => {
      hotspot.on('pointerdown', async (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown()) {
          // Use scene transition instead of direct modal
          const SceneTransition = (window as any).SceneTransition;
          if (SceneTransition) {
            await SceneTransition.transitionTo('building', {
              buildingType: buildingId,
              playerPosition: { x: this.currentPlayer.x, y: this.currentPlayer.y }
            });
          }
        }
      });
    });
  }
}
```

## 7. Keyboard Shortcuts and Navigation

```tsx
// components/SceneKeyboardHandler.tsx
import { useSceneTransitions } from '@/lib/scenes/SceneManager';

export function SceneKeyboardHandler() {
  const sceneTransitions = useSceneTransitions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          // Return to previous scene
          sceneTransitions.returnToPrevious();
          break;
        case 'i':
        case 'I':
          // Open inventory
          sceneTransitions.toInventory();
          break;
        case 'm':
        case 'M':
          // Return to main farm
          sceneTransitions.toMainFarm();
          break;
        case '1':
          // Quick access to corral
          sceneTransitions.toCorral();
          break;
        case '2':
          // Quick access to orchard
          sceneTransitions.toOrchard();
          break;
        case '3':
          // Quick access to well
          sceneTransitions.toWell();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sceneTransitions]);

  return null; // This component only handles events
}
```

## 8. Custom Transition Effects

```tsx
// Custom transition for specific building types
const customBuildingTransitions = {
  corral: { type: 'slide', duration: 400, direction: 'right' },
  orchard: { type: 'fade', duration: 600 },
  well: { type: 'zoom', duration: 500 }
};

// Use in building click handler
const handleBuildingClick = async (buildingType: string) => {
  await sceneTransitions.transitionTo('building', 
    { buildingType }, 
    customBuildingTransitions[buildingType]
  );
};
```

## 9. Scene State Persistence

```tsx
// Save and restore scene state
const useSceneStatePersistence = () => {
  const { currentScene, transitionState } = useSceneManager();

  // Save scene state to localStorage
  useEffect(() => {
    localStorage.setItem('dv_current_scene', currentScene);
    if (transitionState.data) {
      localStorage.setItem('dv_scene_data', JSON.stringify(transitionState.data));
    }
  }, [currentScene, transitionState.data]);

  // Restore scene on app load
  useEffect(() => {
    const savedScene = localStorage.getItem('dv_current_scene');
    const savedData = localStorage.getItem('dv_scene_data');
    
    if (savedScene && savedScene !== 'main') {
      const data = savedData ? JSON.parse(savedData) : undefined;
      sceneTransitions.transitionTo(savedScene as SceneType, data, { type: 'instant', duration: 0 });
    }
  }, []);
};
```

## Usage Summary

1. **Wrap your app** in `SceneManagerProvider`
2. **Use `useSceneTransitions`** hook in components that need to trigger transitions
3. **Wrap scene content** in `SceneTransitionWrapper` for automatic transition effects
4. **Handle scene changes** with the `onSceneChange` callback in the provider
5. **Use keyboard shortcuts** and navigation with `SceneKeyboardHandler`
6. **Access transition state** with `useSceneManager` for conditional rendering

The system is designed to be non-intrusive and can be gradually integrated into your existing codebase.