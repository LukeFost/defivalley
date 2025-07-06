import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CorralScene } from '../CorralScene';
import { OrchardScene } from '../OrchardScene';
import { WellScene } from '../WellScene';
import { VisualNovelRenderer } from './VisualNovelRenderer';
import { VisualNovelScene } from '../VisualNovelScene';

/**
 * Demo component showcasing the three building scene classes
 * This demonstrates how to integrate the scenes with DeFi operations
 */
export function SceneDemo() {
  const [corralScene] = useState(() => new CorralScene());
  const [orchardScene] = useState(() => new OrchardScene());
  const [wellScene] = useState(() => new WellScene());
  const [activeScene, setActiveScene] = useState<VisualNovelScene | null>(null);

  const openCorral = () => {
    corralScene.resetDialogue();
    corralScene.open(
      () => setActiveScene(null),
      () => {
        // Handle FLOW → FROTH swap
        console.log('Executing FLOW → FROTH swap');
        // This would integrate with useSwapFlow hook
      }
    );
    setActiveScene(corralScene);
  };

  const openOrchard = () => {
    orchardScene.resetDialogue();
    orchardScene.open(
      () => setActiveScene(null),
      () => {
        // Handle FVIX → sFVIX staking
        console.log('Executing FVIX staking');
        // This would integrate with useStakeFVIX hook
      }
    );
    setActiveScene(orchardScene);
  };

  const openWell = () => {
    wellScene.resetDialogue();
    wellScene.open(
      () => setActiveScene(null),
      () => {
        // Handle FROTH → FVIX minting
        console.log('Executing FROTH → FVIX minting');
        // This would integrate with useMintFVIX hook
      }
    );
    setActiveScene(wellScene);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">
        DeFi Valley Building Scenes
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Corral Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🐴</div>
            <h3 className="text-xl font-bold text-amber-800">Flow Trading Corral</h3>
            <p className="text-amber-700 text-sm">FLOW → FROTH Swapping</p>
          </div>
          <Button 
            onClick={openCorral}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Visit Corral
          </Button>
        </div>

        {/* Orchard Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🌳</div>
            <h3 className="text-xl font-bold text-green-800">Sacred FVIX Orchard</h3>
            <p className="text-green-700 text-sm">FVIX → sFVIX Staking</p>
          </div>
          <Button 
            onClick={openOrchard}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Visit Orchard
          </Button>
        </div>

        {/* Well Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🪣</div>
            <h3 className="text-xl font-bold text-blue-800">Ancient FVIX Well</h3>
            <p className="text-blue-700 text-sm">FROTH → FVIX Minting</p>
          </div>
          <Button 
            onClick={openWell}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Visit Well
          </Button>
        </div>
      </div>

      {/* Scene Information */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Scene Architecture Features:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">🎭 Visual Novel Features:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Unique NPC characters with distinct personalities</li>
              <li>• Multi-line dialogue progression</li>
              <li>• Character portraits and dialogue boxes</li>
              <li>• Themed backgrounds and visual design</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">🔗 DeFi Integration:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Integration with existing DeFi hooks</li>
              <li>• Operation-specific dialogue content</li>
              <li>• Validation and requirement checks</li>
              <li>• Seamless transaction flow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Scene Renderer */}
      {activeScene && (
        <VisualNovelRenderer
          scene={activeScene}
          onClose={() => setActiveScene(null)}
          onActionComplete={() => {
            console.log('Action completed for scene:', activeScene.getConfig().id);
          }}
        />
      )}
    </div>
  );
}