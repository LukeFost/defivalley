import React, { useState } from 'react';
import { StakeRequestDemo } from './StakeRequestDemo';
import { Button } from '@/components/ui/button';

/**
 * StakeDialogueIntegration - A component that demonstrates how to integrate 
 * dialogue-triggered staking modals into your game
 * 
 * This can be added to your main game UI or used as a standalone demo
 */
export function StakeDialogueIntegration() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="space-y-4">
      {/* Demo Launch Button */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-2">🎯 Dialogue-Triggered Staking</h3>
        <p className="text-sm opacity-90 mb-4">
          Experience how NPCs can request staking through natural conversation flow.
        </p>
        <Button
          onClick={() => setShowDemo(true)}
          className="bg-white text-purple-600 hover:bg-gray-100"
        >
          Launch Staking Dialogue Demo
        </Button>
      </div>

      {/* Implementation Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">🔧 Implementation Details:</h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• <strong>Dialogue System:</strong> Uses VisualNovelScene for interactive conversations</li>
          <li>• <strong>Modal Integration:</strong> Seamlessly connects Phaser scenes to React StakeModal</li>
          <li>• <strong>User Experience:</strong> Natural conversation flow leading to staking action</li>
          <li>• <strong>Existing Components:</strong> Leverages your current StakeModal with FVIX approval/staking</li>
        </ul>
      </div>

      {/* Flow Description */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">🌊 Conversation Flow:</h4>
        <div className="text-sm space-y-2 text-blue-800">
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-blue-200 px-2 py-1 rounded">1</span>
            <span>NPC introduces themselves and their business</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-blue-200 px-2 py-1 rounded">2</span>
            <span>NPC says: "I want to stake in your business please"</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-blue-200 px-2 py-1 rounded">3</span>
            <span>Player chooses to accept or decline</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-blue-200 px-2 py-1 rounded">4</span>
            <span>If accepted: StakeModal opens with token input and staking controls</span>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <StakeRequestDemo onClose={() => setShowDemo(false)} />
      )}
    </div>
  );
}

/**
 * Simple trigger button for adding to existing game UI
 */
export function StakeDialogueTrigger() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowDemo(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        💬 Talk to Businessman
      </Button>
      
      {showDemo && (
        <StakeRequestDemo onClose={() => setShowDemo(false)} />
      )}
    </>
  );
}