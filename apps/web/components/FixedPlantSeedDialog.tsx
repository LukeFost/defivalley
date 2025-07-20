'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useAppStore, usePlayerData, useConfig, SeedType } from '../app/store';
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
          <span className="text-sm text-gray-500">Minimum:</span>
          <span className="font-medium">{Number(formatUnits(seed.minAmount, 6))} USDC</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Growth Time:</span>
          <span className="font-medium">{getTimeString(seed.growthTime)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Est. APY:</span>
          <span className="font-medium text-green-600">{seed.apy}%</span>
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
  const { address } = useAccount();
  const config = useConfig();
  
  // Get USDC balance on Saga chainlet
  const { data: usdcBalance } = useBalance({
    address,
    token: config.usdcAddress,
    chainId: config.sagaChainId
  });
  
  // Use granular selectors to prevent unnecessary re-renders
  const isPlantModalOpen = useAppStore((state) => state.ui.showPlantModal ?? false);
  const hidePlantModal = useAppStore((state) => state.hidePlantModal);
  const selectedSeedType = useAppStore((state) => state.ui.selectedSeedType);
  const setSelectedSeedType = useAppStore((state) => state.setSelectedSeedType);
  const plantAmount = useAppStore((state) => state.ui.plantAmount);
  const setPlantAmount = useAppStore((state) => state.setPlantAmount);
  const addNotification = useAppStore((state) => state.addNotification);
  
  const { seedTypes } = usePlayerData();
  const isLoading = false;
  
  const [isValidAmount, setIsValidAmount] = useState(false);
  const [amountError, setAmountError] = useState('');
  
  const selectedSeed = seedTypes.find(s => s.id === selectedSeedType);
  
  // Debounced validation function
  const validateAmount = useCallback(async (amount: string, seed: SeedType | undefined) => {
    if (!amount || !seed) {
      setIsValidAmount(false);
      setAmountError('');
      return;
    }
    
    try {
      const parsedAmount = parseUnits(amount, 6);
      
      // Check minimum amount
      if (parsedAmount < seed.minAmount) {
        setIsValidAmount(false);
        setAmountError(`Minimum amount is ${Number(formatUnits(seed.minAmount, 6))} USDC`);
        return;
      }
      
      // Check balance
      if (usdcBalance && parsedAmount > usdcBalance.value) {
        setIsValidAmount(false);
        setAmountError('Insufficient USDC balance');
        return;
      }
      
      // Gas estimation removed with cross-chain functionality
      
      setIsValidAmount(true);
      setAmountError('');
      
    } catch (error) {
      setIsValidAmount(false);
      setAmountError('Invalid amount');
    }
  }, [usdcBalance, selectedSeedType]);
  
  // Debounced validation with 400ms delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAmount(plantAmount, selectedSeed);
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [plantAmount, selectedSeed, validateAmount]);
  
  const handlePlantSeed = async () => {
    if (!isValidAmount || !selectedSeed || !plantAmount) {
      addNotification({
        type: 'error',
        title: 'Invalid Input',
        message: 'Please check your seed selection and amount'
      });
      return;
    }
    
    // Plant seed functionality removed with cross-chain logic
    hidePlantModal();
    addNotification({
      type: 'info',
      title: 'Feature Disabled',
      message: 'Seed planting functionality has been removed'
    });
  };
  
  const handleAmountPreset = (percentage: number) => {
    if (!usdcBalance || !selectedSeed) return;
    
    const maxAmount = usdcBalance.value;
    const presetAmount = (maxAmount * BigInt(percentage)) / BigInt(100);
    const minAmount = selectedSeed.minAmount;
    
    const finalAmount = presetAmount < minAmount ? minAmount : presetAmount;
    setPlantAmount(formatUnits(finalAmount, 6));
  };
  
  return (
    <DialogPrimitive.Root open={isPlantModalOpen} onOpenChange={hidePlantModal}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[1000] grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg max-h-[90vh] overflow-y-auto">
          
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <DialogPrimitive.Title className="text-2xl font-bold text-gray-900">
              Plant Seeds for DeFi Yield
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-gray-600">
              Choose your seed type and investment amount to start earning real DeFi yields
            </DialogPrimitive.Description>
          </div>
          
          <div className="space-y-6">
            {/* Wallet Status */}
            {address && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Your Wallet</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Address:</span>
                    <p className="font-mono text-blue-800">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-600">USDC Balance:</span>
                    <p className="font-semibold text-blue-800">
                      {usdcBalance ? `${Number(formatUnits(usdcBalance.value, 6)).toFixed(2)} USDC` : 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Seed Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Seed Type</h3>
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
            
            {/* Amount Input */}
            {selectedSeed && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Amount</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      USDC Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={plantAmount || ''}
                        onChange={(e) => setPlantAmount(e.target.value)}
                        placeholder={`Min ${Number(formatUnits(selectedSeed.minAmount, 6))}`}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          amountError ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 font-medium">USDC</span>
                      </div>
                    </div>
                    {amountError && (
                      <p className="mt-1 text-sm text-red-600">{amountError}</p>
                    )}
                  </div>
                  
                  {/* Preset Buttons */}
                  {usdcBalance && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAmountPreset(25)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        25%
                      </button>
                      <button
                        onClick={() => handleAmountPreset(50)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => handleAmountPreset(75)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        75%
                      </button>
                      <button
                        onClick={() => handleAmountPreset(100)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Max
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Transaction Summary */}
            {selectedSeed && isValidAmount && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Transaction Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Seed Type:</span>
                    <span className="font-medium text-green-800">{selectedSeed.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Investment:</span>
                    <span className="font-medium text-green-800">{plantAmount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Growth Time:</span>
                    <span className="font-medium text-green-800">
                      {Math.floor(selectedSeed.growthTime / 3600)} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Estimated APY:</span>
                    <span className="font-medium text-green-800">{selectedSeed.apy}%</span>
                  </div>
                </div>
              </div>
            )}
            
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
              disabled={!isValidAmount || isLoading}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                isValidAmount && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Planting...</span>
                </div>
              ) : (
                'Plant Seed & Start Earning'
              )}
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