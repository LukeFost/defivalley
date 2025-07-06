/**
 * Scene Manager for DeFi Valley
 * 
 * React component and hooks that integrate the SceneTransition system
 * with the existing Game component and building interaction modals.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SceneTransition, SceneType, SceneData, TransitionState, SceneRegistry } from './SceneTransition';

interface SceneManagerContextType {
  currentScene: SceneType;
  isTransitioning: boolean;
  transitionState: TransitionState;
  transitionTo: (scene: SceneType, data?: SceneData) => Promise<void>;
  returnToPrevious: () => Promise<void>;
  clearHistory: () => void;
}

const SceneManagerContext = createContext<SceneManagerContextType | null>(null);

interface SceneManagerProviderProps {
  children: React.ReactNode;
  onSceneChange?: (scene: SceneType, data?: SceneData) => void;
}

/**
 * Scene Manager Provider component
 * Wraps the app and manages scene transitions at the top level
 */
export function SceneManagerProvider({ children, onSceneChange }: SceneManagerProviderProps) {
  const [transitionState, setTransitionState] = useState<TransitionState>(SceneTransition.getState());
  const [isInitialized, setIsInitialized] = useState(false);
  const onSceneChangeRef = useRef(onSceneChange);

  // Update ref when callback changes
  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  // Initialize scene transition system
  useEffect(() => {
    if (!isInitialized) {
      SceneTransition.initialize();
      setIsInitialized(true);
    }

    // Listen for transition state changes
    const handleStateChange = (newState: any) => {
      setTransitionState(SceneTransition.getState());
    };

    const handleSceneSwitch = (data: { scene: SceneType; data?: SceneData }) => {
      if (onSceneChangeRef.current) {
        onSceneChangeRef.current(data.scene, data.data);
      }
    };

    SceneTransition.on('transitionComplete', handleStateChange);
    SceneTransition.on('sceneSwitch', handleSceneSwitch);

    return () => {
      SceneTransition.off('transitionComplete', handleStateChange);
      SceneTransition.off('sceneSwitch', handleSceneSwitch);
      if (isInitialized) {
        SceneTransition.destroy();
      }
    };
  }, [isInitialized]);

  const transitionTo = useCallback(async (scene: SceneType, data?: SceneData) => {
    try {
      await SceneTransition.transitionTo(scene, data);
    } catch (error) {
      console.error('Scene transition failed:', error);
    }
  }, []);

  const returnToPrevious = useCallback(async () => {
    try {
      await SceneTransition.returnToPrevious();
    } catch (error) {
      console.error('Return to previous scene failed:', error);
    }
  }, []);

  const clearHistory = useCallback(() => {
    SceneTransition.clearReturnStack();
  }, []);

  const contextValue: SceneManagerContextType = {
    currentScene: transitionState.currentScene,
    isTransitioning: transitionState.isTransitioning,
    transitionState,
    transitionTo,
    returnToPrevious,
    clearHistory
  };

  return (
    <SceneManagerContext.Provider value={contextValue}>
      {children}
    </SceneManagerContext.Provider>
  );
}

/**
 * Hook for using scene management in components
 */
export function useSceneManager(): SceneManagerContextType {
  const context = useContext(SceneManagerContext);
  if (!context) {
    throw new Error('useSceneManager must be used within a SceneManagerProvider');
  }
  return context;
}

/**
 * Enhanced scene transition hook with building-specific functionality
 */
export function useSceneTransitions() {
  const sceneManager = useSceneManager();

  const toBuildingScene = useCallback(async (
    buildingType: 'corral' | 'orchard' | 'well',
    additionalData?: SceneData
  ) => {
    const buildingData = {
      buildingType,
      ...additionalData
    };

    await sceneManager.transitionTo('building', buildingData);
  }, [sceneManager]);

  const toMainFarm = useCallback(async (playerPosition?: { x: number; y: number }) => {
    const farmData = playerPosition ? { playerPosition } : undefined;
    await sceneManager.transitionTo('main', farmData);
  }, [sceneManager]);

  const toInventory = useCallback(async (inventoryTab?: string) => {
    const inventoryData = inventoryTab ? { tab: inventoryTab } : undefined;
    await sceneManager.transitionTo('inventory', inventoryData);
  }, [sceneManager]);

  const toSettings = useCallback(async (settingsSection?: string) => {
    const settingsData = settingsSection ? { section: settingsSection } : undefined;
    await sceneManager.transitionTo('settings', settingsData);
  }, [sceneManager]);

  return {
    ...sceneManager,
    // Building-specific transitions
    toBuildingScene,
    toCorral: (data?: SceneData) => toBuildingScene('corral', data),
    toOrchard: (data?: SceneData) => toBuildingScene('orchard', data),
    toWell: (data?: SceneData) => toBuildingScene('well', data),
    // Other scene transitions
    toMainFarm,
    toInventory,
    toSettings
  };
}

interface SceneTransitionWrapperProps {
  children: React.ReactNode;
  scene: SceneType;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wrapper component that applies transition effects to scene content
 */
export function SceneTransitionWrapper({ 
  children, 
  scene, 
  className = '', 
  style = {} 
}: SceneTransitionWrapperProps) {
  const { currentScene, isTransitioning } = useSceneManager();
  const [isVisible, setIsVisible] = useState(scene === currentScene);
  const [shouldRender, setShouldRender] = useState(scene === currentScene);

  useEffect(() => {
    if (scene === currentScene) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready before showing
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Keep rendered for transition out, then remove from DOM
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentScene, scene]);

  if (!shouldRender) {
    return null;
  }

  const transitionStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
    transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
    pointerEvents: isVisible ? 'auto' : 'none',
    ...style
  };

  return (
    <div 
      className={`scene-transition-wrapper ${className}`}
      style={transitionStyle}
    >
      {children}
    </div>
  );
}

interface BuildingSceneManagerProps {
  children: React.ReactNode;
  currentBuildingType?: 'corral' | 'orchard' | 'well' | null;
  onBuildingChange?: (buildingType: string | null) => void;
}

/**
 * Building Scene Manager - specifically handles building interaction scenes
 */
export function BuildingSceneManager({ 
  children, 
  currentBuildingType, 
  onBuildingChange 
}: BuildingSceneManagerProps) {
  const { currentScene, transitionState } = useSceneManager();
  const [activeBuildingType, setActiveBuildingType] = useState<string | null>(null);

  // Listen for building scene transitions
  useEffect(() => {
    const handleSceneSwitch = (data: { scene: SceneType; data?: SceneData }) => {
      if (data.scene === 'building' && data.data?.buildingType) {
        setActiveBuildingType(data.data.buildingType);
        onBuildingChange?.(data.data.buildingType);
      } else if (data.scene !== 'building') {
        setActiveBuildingType(null);
        onBuildingChange?.(null);
      }
    };

    SceneTransition.on('sceneSwitch', handleSceneSwitch);
    return () => SceneTransition.off('sceneSwitch', handleSceneSwitch);
  }, [onBuildingChange]);

  // Sync with external building type changes
  useEffect(() => {
    if (currentBuildingType !== activeBuildingType) {
      setActiveBuildingType(currentBuildingType || null);
    }
  }, [currentBuildingType, activeBuildingType]);

  return (
    <>
      {children}
      
      {/* Building Scene Indicator */}
      {currentScene === 'building' && activeBuildingType && (
        <div 
          className="building-scene-indicator"
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 10000,
            textTransform: 'capitalize'
          }}
        >
          {activeBuildingType} Scene
        </div>
      )}
    </>
  );
}

/**
 * Scene Transition Debug Panel (for development)
 */
export function SceneTransitionDebugPanel() {
  const { transitionState, currentScene } = useSceneManager();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10001,
        minWidth: '200px'
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Scene Debug</h3>
      <div><strong>Current Scene:</strong> {currentScene}</div>
      <div><strong>Is Transitioning:</strong> {transitionState.isTransitioning ? 'Yes' : 'No'}</div>
      {transitionState.targetScene && (
        <div><strong>Target Scene:</strong> {transitionState.targetScene}</div>
      )}
      <div><strong>Progress:</strong> {Math.round(transitionState.progress * 100)}%</div>
      
      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}

/**
 * Higher-Order Component for scene-aware components
 */
export function withSceneTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sceneType: SceneType
) {
  const ComponentWithSceneTransition = (props: P) => {
    const { currentScene } = useSceneManager();
    const isActive = currentScene === sceneType;

    return (
      <SceneTransitionWrapper scene={sceneType}>
        <WrappedComponent {...props} isSceneActive={isActive} />
      </SceneTransitionWrapper>
    );
  };

  ComponentWithSceneTransition.displayName = `withSceneTransition(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithSceneTransition;
}

// Utility function to register custom scene types
export function registerCustomScene(
  type: string,
  name: string,
  options: {
    component?: string;
    phaserScene?: string;
    allowReturnTo?: boolean;
    defaultTransition?: any;
  } = {}
) {
  SceneRegistry.registerScene({
    type: type as SceneType,
    name,
    allowReturnTo: true,
    defaultTransition: { type: 'fade', duration: 300 },
    ...options
  });
}

export {
  SceneTransition,
  SceneRegistry,
  type SceneType,
  type SceneData,
  type TransitionState
};