'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../app/store';
import { CharacterConfig, CharacterType, isKnightCharacter } from '../lib/character.config';
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
  let spriteSheetPath: string;
  let frameWidth: number;
  let frameHeight: number;
  let spriteX: number;
  let spriteY: number;
  
  if (isKnightCharacter(character)) {
    // Knight character uses different sprite format
    spriteSheetPath = CharacterConfig.knight.idlePath;
    frameWidth = CharacterConfig.knight.frameWidth;
    frameHeight = CharacterConfig.knight.frameHeight;
    // Use first frame of idle animation
    spriteX = 0;
    spriteY = 0;
  } else {
    // Regular character sprite handling
    const characterIndex = CharacterConfig.player.characters[character as keyof typeof CharacterConfig.player.characters];
    spriteSheetPath = CharacterConfig.player.path;
    frameWidth = CharacterConfig.player.frameWidth;
    frameHeight = CharacterConfig.player.frameHeight;
    
    // Calculate sprite position
    const framesPerRow = 8; // Assuming 8 characters per row based on sprite sheet
    const row = Math.floor(characterIndex / framesPerRow);
    const col = characterIndex % framesPerRow;
    
    // Use down-facing sprite (direction 0)
    const downDirection = CharacterConfig.player.directions.down;
    spriteX = col * frameWidth * CharacterConfig.player.framesPerCharacter + downDirection * frameWidth;
    spriteY = row * frameHeight;
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
            className="w-16 h-16 border-2 border-gray-300 rounded-lg overflow-hidden"
            style={{
              backgroundImage: `url(${spriteSheetPath})`,
              backgroundPosition: `-${spriteX}px -${spriteY}px`,
              backgroundSize: isKnightCharacter(character) 
                ? `${CharacterConfig.knight.frameWidth * CharacterConfig.knight.idleFrames}px auto`
                : `${frameWidth * 8 * CharacterConfig.player.framesPerCharacter}px auto`,
              imageRendering: 'pixelated',
              transform: isKnightCharacter(character) ? 'scale(0.5)' : 'scale(2)',
              transformOrigin: 'top left',
            }}
          />
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
  const [isMounted, setIsMounted] = useState(false);
  const isSettingsModalOpen = useAppStore((state) => state.ui.showSettingsModal ?? false);
  const hideSettingsModal = useAppStore((state) => state.hideSettingsModal);
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType>('warrior');
  const [currentCharacter, setCurrentCharacter] = useState<CharacterType>('warrior');
  
  // Set mounted state and load current character selection from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const savedCharacter = localStorage.getItem('character-selection') as CharacterType;
    if (savedCharacter && (isKnightCharacter(savedCharacter) || CharacterConfig.player.characters[savedCharacter as keyof typeof CharacterConfig.player.characters] !== undefined)) {
      setCurrentCharacter(savedCharacter);
      setSelectedCharacter(savedCharacter);
      console.log('⚙️ [SETTINGS] Loaded saved character:', savedCharacter);
    } else {
      console.log('⚙️ [SETTINGS] No saved character found, using default warrior');
    }
  }, []);
  
  console.log('⚙️ [SETTINGS] Rendering SettingsDialog, isOpen:', isSettingsModalOpen, 'isMounted:', isMounted);
  
  const handleCharacterSelect = (character: CharacterType) => {
    setSelectedCharacter(character);
  };
  
  const handleSaveSettings = () => {
    // Save to localStorage
    localStorage.setItem('character-selection', selectedCharacter);
    setCurrentCharacter(selectedCharacter);
    
    // Show success notification
    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: `Character changed to ${selectedCharacter}. Changes will apply on next game refresh.`
    });
    
    // Close dialog
    hideSettingsModal();
  };
  
  const handleCancel = () => {
    // Reset selection to current character
    setSelectedCharacter(currentCharacter);
    hideSettingsModal();
  };
  
  const availableCharacters = [...Object.keys(CharacterConfig.player.characters), 'knight'] as CharacterType[];
  const hasChanges = selectedCharacter !== currentCharacter;
  
  // Prevent rendering until client-side hydration is complete
  if (!isMounted) {
    return null;
  }
  
  return (
    <Dialog 
      open={isSettingsModalOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
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
          {/* Character Selection Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Character</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select your character avatar. Changes will take effect when you refresh the game.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {availableCharacters.map((character) => (
                <CharacterPreview
                  key={character}
                  character={character}
                  isSelected={selectedCharacter === character}
                  onSelect={() => handleCharacterSelect(character)}
                />
              ))}
            </div>
          </div>
          
          {/* Current Selection Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Current Selection</h4>
            <div className="text-sm text-blue-700">
              <p>
                <span className="font-medium">Active Character:</span> {currentCharacter}
              </p>
              {hasChanges && (
                <p className="mt-1">
                  <span className="font-medium">Selected Character:</span> {selectedCharacter}
                </p>
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">How It Works</h4>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>• Your character choice is saved locally in your browser</p>
              <p>• Changes apply when you refresh the game or reconnect</p>
              <p>• Each character has the same gameplay abilities</p>
              <p>• This is purely cosmetic and doesn't affect farming or yields</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              hasChanges
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {hasChanges ? 'Save Settings' : 'No Changes'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}