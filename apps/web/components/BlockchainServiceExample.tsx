import React, { useState } from 'react';
import { useBlockchainService } from '../hooks/useBlockchainService';
import { formatUnits } from 'viem';

/**
 * Example component demonstrating BlockchainService usage
 * This shows how to integrate the service with React components
 */
export function BlockchainServiceExample() {
  const [seedType, setSeedType] = useState(1);
  const [amount, setAmount] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [txHistory, setTxHistory] = useState<Array<{
    id: string;
    type: string;
    status: string;
    hash?: string;
  }>>([]);

  // Use the blockchain service hook
  const { 
    plantSeed, 
    harvestCrop, 
    batchHarvest,
    claimYield,
    estimateGas,
    isInitialized,
    address
  } = useBlockchainService({
    // Optional callbacks for transaction lifecycle
    onTransactionStart: (txId, type) => {
      console.log(`Transaction started: ${txId} (${type})`);
      setTxHistory(prev => [...prev, { id: txId, type, status: 'started' }]);
    },
    onTransactionUpdate: (txId, status) => {
      console.log(`Transaction update: ${txId} - ${status}`);
      setTxHistory(prev => prev.map(tx => 
        tx.id === txId ? { ...tx, status } : tx
      ));
    },
    onTransactionComplete: (txId, result) => {
      console.log(`Transaction complete: ${txId}`, result);
      setTxHistory(prev => prev.map(tx => 
        tx.id === txId 
          ? { ...tx, status: 'completed', hash: result.txHash } 
          : tx
      ));
      setIsLoading(false);
    },
    onTransactionError: (txId, error) => {
      console.error(`Transaction error: ${txId}`, error);
      setTxHistory(prev => prev.map(tx => 
        tx.id === txId ? { ...tx, status: `error: ${error.message}` } : tx
      ));
      setIsLoading(false);
    }
  });

  const handlePlantSeed = async () => {
    if (!isInitialized || !address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      // Estimate gas first
      const gasEstimate = await estimateGas('plant_seed');
      console.log('Gas estimate:', formatUnits(gasEstimate, 18), 'ETH');

      // Plant the seed
      const result = await plantSeed(seedType, amount, gasEstimate);
      
      if (result.success) {
        console.log('Seed planted successfully!', result);
      } else {
        console.error('Failed to plant seed:', result.error);
      }
    } catch (error) {
      console.error('Error planting seed:', error);
    }
  };

  const handleHarvestSingle = async (seedId: number) => {
    setIsLoading(true);
    try {
      const gasEstimate = await estimateGas('harvest_seed');
      const result = await harvestCrop(seedId, gasEstimate);
      
      if (result.success) {
        console.log('Crop harvested successfully!', result);
      }
    } catch (error) {
      console.error('Error harvesting crop:', error);
    }
  };

  const handleBatchHarvest = async () => {
    setIsLoading(true);
    try {
      // Example: harvest seeds 1, 2, and 3
      const seedIds = [1, 2, 3];
      const gasEstimate = await estimateGas('batch_harvest', { seedIds });
      
      const result = await batchHarvest(seedIds, gasEstimate);
      
      if (result.success) {
        console.log('Batch harvest successful!', result);
      }
    } catch (error) {
      console.error('Error in batch harvest:', error);
    }
  };

  const handleClaimYield = async () => {
    setIsLoading(true);
    try {
      const result = await claimYield();
      
      if (result.success) {
        console.log('Yield claimed successfully!', result);
      }
    } catch (error) {
      console.error('Error claiming yield:', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Blockchain Service Example</h2>
      
      {/* Service Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p>Service Initialized: {isInitialized ? '✅' : '❌'}</p>
        <p>Wallet Connected: {address ? `✅ ${address.slice(0, 6)}...${address.slice(-4)}` : '❌'}</p>
      </div>

      {/* Plant Seed Form */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Plant Seed</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Seed Type</label>
            <select 
              value={seedType} 
              onChange={(e) => setSeedType(Number(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value={1}>USDC Sprout (10 USDC min)</option>
              <option value={2}>USDC Premium (100 USDC min)</option>
              <option value={3}>USDC Whale Tree (1000 USDC min)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (USDC)</label>
            <input 
              type="text" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter USDC amount"
            />
          </div>
          <button 
            onClick={handlePlantSeed}
            disabled={isLoading || !isInitialized}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Plant Seed'}
          </button>
        </div>
      </div>

      {/* Other Actions */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Other Actions</h3>
        <div className="space-x-2">
          <button 
            onClick={() => handleHarvestSingle(1)}
            disabled={isLoading || !isInitialized}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Harvest Seed #1
          </button>
          <button 
            onClick={handleBatchHarvest}
            disabled={isLoading || !isInitialized}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Batch Harvest (1-3)
          </button>
          <button 
            onClick={handleClaimYield}
            disabled={isLoading || !isInitialized}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
          >
            Claim Yield
          </button>
        </div>
      </div>

      {/* Transaction History */}
      {txHistory.length > 0 && (
        <div className="p-4 border rounded">
          <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
          <div className="space-y-2">
            {txHistory.map((tx) => (
              <div key={tx.id} className="p-2 bg-gray-50 rounded text-sm">
                <p>
                  <strong>{tx.type}</strong> - {tx.status}
                </p>
                {tx.hash && (
                  <p className="text-xs text-gray-600">
                    Hash: {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Using BlockchainService directly (without React)
 */
export async function standaloneExample() {
  // This example shows how to use the service outside of React
  const { createBlockchainService } = await import('../services/BlockchainService');
  const { createConfig } = await import('wagmi');
  const { http } = await import('viem');
  const { arbitrumSepolia } = await import('wagmi/chains');
  
  // Create wagmi config
  const wagmiConfig = createConfig({
    chains: [arbitrumSepolia],
    transports: {
      [arbitrumSepolia.id]: http(),
    },
  });
  
  // Create service instance
  const service = createBlockchainService({
    sagaChainId: 2751669528484000,
    arbitrumChainId: 421614,
    gameControllerAddress: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
    defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
  }, wagmiConfig);
  
  // Use the service
  try {
    // Register a simple tracker
    service.registerTracker('example_tx', {
      onStatusUpdate: (id, status) => console.log(`[${id}] Status: ${status}`),
      onError: (id, error) => console.error(`[${id}] Error:`, error),
      onComplete: (id, result) => console.log(`[${id}] Complete:`, result),
    });
    
    // Plant a seed
    const result = await service.plantSeed({
      seedType: 1,
      amount: '100',
      from: '0x1234567890123456789012345678901234567890',
      trackerId: 'example_tx',
    });
    
    console.log('Plant seed result:', result);
  } catch (error) {
    console.error('Service error:', error);
  }
}