'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../app/store';
import { CharacterDefinitions, CharacterType } from '../lib/character.config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CharacterPreviewProps {
  character: CharacterType;
  isSelected: boolean;
  onSelect: () => void;
}

function CharacterPreview({ character, isSelected, onSelect }: CharacterPreviewProps) {
  const characterDef = CharacterDefinitions[character];
  if (!characterDef) return null;
  
  // Get the appropriate image source based on character type
  let imageSrc = '';
  if (characterDef.type === 'animation_sheets' && characterDef.animationConfig) {
    // Use idle animation image for preview
    imageSrc = characterDef.animationConfig.animations.idle?.path || '';
  } else if (characterDef.spritesheetConfig) {
    // Use spritesheet image
    imageSrc = characterDef.spritesheetConfig.path;
  }
  
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md scale-105'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm hover:scale-102'
      }`}
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Character Sprite Preview */}
        <div className="relative">
          <div
            className="w-16 h-16 border-2 border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50"
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={character}
                className="max-w-full max-h-full object-contain"
                style={{
                  imageRendering: 'pixelated',
                  width: `${characterDef.frameWidth}px`,
                  height: `${characterDef.frameHeight}px`,
                  transform: `scale(${Math.min(64 / characterDef.frameWidth, 64 / characterDef.frameHeight)})`,
                }}
              />
            ) : (
              <div className="text-gray-400 text-xs">No Preview</div>
            )}
          </div>
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Character Name */}
        <h3 className={`font-semibold text-center capitalize ${
          isSelected ? 'text-green-700' : 'text-gray-900'
        }`}>
          {character}
        </h3>
      </div>
    </div>
  );
}

export default function SettingsDialog() {
  const isSettingsModalOpen = useAppStore((state) => state.ui.showSettingsModal ?? false);
  const hideSettingsModal = useAppStore((state) => state.hideSettingsModal);
  const addNotification = useAppStore((state) => state.addNotification);
  
  // Only one character type available now
  const currentCharacter: CharacterType = 'cowboy';
  
  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
    console.log('⚙️ [SETTINGS] Settings dialog mounted, character: cowboy');
  }, []);
  
  console.log('⚙️ [SETTINGS] Rendering SettingsDialog, isOpen:', isSettingsModalOpen, 'isMounted:', isMounted);
  
  const handleCloseSettings = () => {
    hideSettingsModal();
    console.log('⚙️ [SETTINGS] Settings dialog closed');
  };
  
  // Prevent rendering until client-side hydration is complete
  if (!isMounted) {
    return null;
  }
  
  return (
    <Dialog 
      open={isSettingsModalOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleCloseSettings();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Game Settings</DialogTitle>
          <DialogDescription>
            Customize your gaming experience in DeFi Valley
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Character Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Character</h3>
            <p className="text-sm text-gray-600 mb-4">
              All players in DeFi Valley are cowboys, ready to farm and earn DeFi yields!
            </p>
            
            <div className="flex justify-center">
              <CharacterPreview
                character={currentCharacter}
                isSelected={true}
                onSelect={() => {}}
              />
            </div>
          </div>
          
          {/* Character Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Character Details</h4>
            <div className="text-sm text-blue-700">
              <p>
                <span className="font-medium">Character Type:</span> Cowboy 🤠
              </p>
              <p className="mt-1">
                <span className="font-medium">Special Abilities:</span> Directional facing, smooth walk animations
              </p>
              <p className="mt-1">
                <span className="font-medium">Description:</span> A skilled rancher ready to plant seeds and harvest DeFi yields
              </p>
            </div>
          </div>
          
          {/* Game Info */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Game Controls</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>• <strong>WASD or Arrow Keys:</strong> Move your cowboy around the farm</p>
              <p>• <strong>Enter:</strong> Open chat to communicate with other players</p>
              <p>• <strong>Right Click:</strong> Access crop context menu for planting and harvesting</p>
              <p>• <strong>Settings Button:</strong> Open this dialog to view character info</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-center pt-6 border-t border-gray-200">
          <button
            onClick={handleCloseSettings}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Close Settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}