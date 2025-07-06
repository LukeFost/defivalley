import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisualNovelScene } from '../VisualNovelScene';
import { CharacterPortrait } from './CharacterPortrait';
import { DialogueBox } from './DialogueBox';

interface VisualNovelRendererProps {
  scene: VisualNovelScene;
  onClose?: () => void;
  onActionComplete?: () => void;
}

/**
 * React component that renders a VisualNovelScene
 * Handles the scene's dialogue, character display, and actions
 */
export function VisualNovelRenderer({ 
  scene, 
  onClose, 
  onActionComplete 
}: VisualNovelRendererProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(scene.getConfig());
  const [character, setCharacter] = useState(scene.getCharacter());

  // Update local state when scene changes
  useEffect(() => {
    setIsOpen(scene.getIsOpen());
    setCurrentConfig(scene.getConfig());
    setCharacter(scene.getCharacter());
  }, [scene]);

  const handleClose = () => {
    scene.close();
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const handleNext = () => {
    const hasNext = scene.nextDialogue();
    if (hasNext) {
      setCharacter({ ...scene.getCharacter() });
    }
  };

  const handleAction = () => {
    scene.executeAction();
    if (onActionComplete) {
      onActionComplete();
    }
  };

  const hasNext = character.currentDialogueIndex < character.dialogue.length - 1;
  const isDialogueComplete = character.currentDialogueIndex === character.dialogue.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {currentConfig.title}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            A mystical encounter awaits...
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-6 py-6">
          {/* Scene Background */}
          <div className={`
            w-full h-64 rounded-lg border-2 border-gray-300 shadow-lg
            ${currentConfig.background.gradient || 'bg-gradient-to-br from-purple-100 to-blue-100'}
            ${currentConfig.background.pattern || ''}
            flex items-center justify-center relative overflow-hidden
          `}>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.1)_1px,_transparent_1px)] bg-[length:20px_20px]" />
            </div>
            
            {/* Character Portrait */}
            <CharacterPortrait 
              character={character}
              className="z-10 relative"
            />
          </div>

          {/* Dialogue Box */}
          <DialogueBox
            character={character}
            onNext={hasNext ? handleNext : undefined}
            onAction={isDialogueComplete ? handleAction : undefined}
            hasNext={hasNext}
            actionButtonText={`${currentConfig.defiOperations?.[0]?.operation || 'Continue'}`}
            className="mx-auto"
          />

          {/* DeFi Operations Info */}
          {currentConfig.defiOperations && currentConfig.defiOperations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Available Operations:</h4>
              <div className="space-y-1">
                {currentConfig.defiOperations.map((op, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-blue-600 font-medium">{op.operation}</span>
                    <span className="text-blue-700">-</span>
                    <span className="text-blue-700 text-sm">{op.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleClose}
              variant="outline"
              className="px-6 py-2"
            >
              Leave Scene
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}