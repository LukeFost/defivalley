'use client';

import React from 'react';
import { useAppStore, usePlayerData, SeedType } from '../app/store';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface SeedCardProps {
  seed: SeedType;
  isSelected: boolean;
  onSelect: () => void;
}

function SeedCard({ seed, isSelected, onSelect }: SeedCardProps) {
  const getTimeString = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-lg ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>
          {seed.name}
        </h3>
        <div className={`w-4 h-4 rounded-full border-2 ${
          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
        }`}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{seed.description}</p>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Growth Time:</span>
          <span className="font-medium">{getTimeString(seed.growthTime)}</span>
        </div>
      </div>
      
      {!seed.isActive && (
        <div className="mt-3 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-xs">
          Currently Unavailable
        </div>
      )}
    </div>
  );
}

export default function FixedPlantSeedDialog() {
  // Use granular selectors to prevent unnecessary re-renders
  const isPlantModalOpen = useAppStore((state) => state.ui.showPlantModal ?? false);
  const hidePlantModal = useAppStore((state) => state.hidePlantModal);
  const selectedSeedType = useAppStore((state) => state.ui.selectedSeedType);
  const setSelectedSeedType = useAppStore((state) => state.setSelectedSeedType);
  const addNotification = useAppStore((state) => state.addNotification);
  
  const { seedTypes } = usePlayerData();
  
  const selectedSeed = seedTypes.find(s => s.id === selectedSeedType);
  
  const handlePlantSeed = () => {
    if (!selectedSeed) {
      addNotification({
        type: 'error',
        title: 'No Seed Selected',
        message: 'Please select a seed type to plant'
      });
      return;
    }
    
    // Map seed types to crop types
    const seedToCropMap: Record<number, string> = {
      1: 'carrot',    // USDC Sprout -> Carrot
      2: 'potato',    // USDC Premium -> Potato  
      3: 'wheat'      // USDC Whale Tree -> Wheat
    };
    
    const cropType = seedToCropMap[selectedSeed.id] || 'potato';
    
    // Store the request to plant in local storage for MainScene to pick up
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pendingPlantCrop', JSON.stringify({
        cropType,
        timestamp: Date.now()
      }));
    }
    
    hidePlantModal();
    addNotification({
      type: 'success',
      title: 'Ready to Plant!',
      message: `Right-click on the ground to plant your ${selectedSeed.name}`
    });
  };
  
  return (
    <DialogPrimitive.Root open={isPlantModalOpen} onOpenChange={hidePlantModal}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[1000] grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg max-h-[90vh] overflow-y-auto">
          
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <DialogPrimitive.Title className="text-2xl font-bold text-gray-900">
              Choose Your Seed
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-gray-600">
              Select a seed type to plant on your farm
            </DialogPrimitive.Description>
          </div>
          
          <div className="space-y-6">
            {/* Seed Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Seed Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {seedTypes.map((seed) => (
                  <SeedCard
                    key={seed.id}
                    seed={seed}
                    isSelected={selectedSeedType === seed.id}
                    onSelect={() => setSelectedSeedType(seed.id)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={hidePlantModal}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handlePlantSeed}
              disabled={!selectedSeed}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                selectedSeed
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Select Seed
            </button>
          </div>
          
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}