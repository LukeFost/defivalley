'use client';

import React, { useState } from 'react';
import { useSquidRouter } from '../app/hooks/useCrossChainTx';
import ChainTokenSelector from './ChainTokenSelector';

/**
 * Demo component to showcase Squid Router integration
 * Shows supported chains, real-time quotes, and bridging capabilities
 */
export default function SquidRouterDemo() {
  const { supportedChains, getQuote, isLoading, error } = useSquidRouter();
  const [selection, setSelection] = useState<{
    chainId: number | null;
    tokenAddress: string | null;
    chainName: string;
    tokenSymbol: string;
  }>({
    chainId: null,
    tokenAddress: null,
    chainName: '',
    tokenSymbol: '',
  });

  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<any>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);

  const handleGetQuote = async () => {
    if (!selection.chainId || !selection.tokenAddress) return;

    setIsGettingQuote(true);
    try {
      const result = await getQuote({
        fromChain: selection.chainId,
        toChain: 2751669528484000, // Saga Chainlet
        fromToken: selection.tokenAddress,
        toToken: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // USDC on Arbitrum
        fromAmount: amount,
        fromAddress: '0x742d35Cc6634C0532925a3b8D4f7cE07d5d61bE6', // Demo address
        toAddress: '0x742d35Cc6634C0532925a3b8D4f7cE07d5d61bE6',
      });
      setQuote(result);
    } catch (err) {
      console.error('Quote error:', err);
      setQuote(null);
    } finally {
      setIsGettingQuote(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🌉 Squid Router Integration Demo
        </h1>
        <p className="text-lg text-gray-600">
          Bridge assets from 70+ blockchains to power DeFi Valley seed planting
        </p>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            🧪 <strong>Demo Mode:</strong> This demo uses mock data to showcase Squid Router integration features. 
            The real SDK integration will be enabled once build dependencies are resolved.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            70+
          </div>
          <div className="text-blue-800 font-medium">Supported Chains</div>
          <div className="text-sm text-blue-600 mt-2">
            Ethereum, Polygon, BSC, Avalanche, Arbitrum, Base, Optimism & more
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            1000+
          </div>
          <div className="text-green-800 font-medium">Bridgeable Assets</div>
          <div className="text-sm text-green-600 mt-2">
            ETH, USDC, USDT, DAI, WBTC, and thousands more tokens
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            ~2-5min
          </div>
          <div className="text-purple-800 font-medium">Bridge Time</div>
          <div className="text-sm text-purple-600 mt-2">
            Fast cross-chain transfers with competitive fees
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error:</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Chain & Token Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Try Cross-Chain Quote</h2>
        
        <ChainTokenSelector
          onSelectionChange={setSelection}
          className="mb-6"
        />

        {/* Amount Input */}
        {selection.chainId && selection.tokenAddress && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Bridge
              </label>
              <div className="flex space-x-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
                <button
                  onClick={handleGetQuote}
                  disabled={isGettingQuote || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isGettingQuote ? 'Getting Quote...' : 'Get Quote'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quote Display */}
        {isGettingQuote && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-blue-600">Fetching best route...</span>
          </div>
        )}

        {quote && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Bridge Quote</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-green-700">Route:</div>
                <div className="text-green-600">
                  {selection.chainName} → Saga Chainlet
                </div>
              </div>
              <div>
                <div className="font-medium text-green-700">You Send:</div>
                <div className="text-green-600">
                  {amount} {selection.tokenSymbol}
                </div>
              </div>
              <div>
                <div className="font-medium text-green-700">You Receive:</div>
                <div className="text-green-600">
                  ~{quote.toAmount || '0'} USDC
                </div>
              </div>
              <div>
                <div className="font-medium text-green-700">Estimated Time:</div>
                <div className="text-green-600">
                  {quote.estimatedRouteDuration 
                    ? `${Math.ceil(quote.estimatedRouteDuration / 60)} minutes`
                    : '2-5 minutes'
                  }
                </div>
              </div>
            </div>
            
            {quote.feeCosts && quote.feeCosts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="font-medium text-green-700 mb-1">Bridge Fee:</div>
                <div className="text-green-600">
                  {quote.feeCosts[0].amount} {quote.feeCosts[0].token.symbol}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Integration Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚀 Auto-Bridge Benefits for DeFi Valley
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 mb-2">For Players:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Use any token from any chain</li>
              <li>• No manual bridging steps</li>
              <li>• One-click seed planting experience</li>
              <li>• Automatic best route selection</li>
              <li>• Competitive bridge fees</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-2">For DeFi Valley:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Access to multi-chain liquidity</li>
              <li>• Lower barrier to entry</li>
              <li>• Increased TVL from all chains</li>
              <li>• Better user acquisition</li>
              <li>• Future cross-chain expansion</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Popular Chains Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Popular Supported Chains</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'Ethereum', symbol: 'ETH', icon: '⟡' },
            { name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
            { name: 'BSC', symbol: 'BNB', icon: '🟡' },
            { name: 'Avalanche', symbol: 'AVAX', icon: '🔴' },
            { name: 'Arbitrum', symbol: 'ARB', icon: '🔵' },
            { name: 'Optimism', symbol: 'OP', icon: '🔴' },
            { name: 'Base', symbol: 'ETH', icon: '🔵' },
            { name: 'Gnosis', symbol: 'xDAI', icon: '🟢' },
            { name: 'Fantom', symbol: 'FTM', icon: '💙' },
            { name: 'Moonbeam', symbol: 'GLMR', icon: '🌙' },
            { name: 'Celo', symbol: 'CELO', icon: '💚' },
            { name: '+ 60 more', symbol: '', icon: '🔗' },
          ].map((chain) => (
            <div
              key={chain.name}
              className="p-3 border border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors"
            >
              <div className="text-2xl mb-1">{chain.icon}</div>
              <div className="font-medium text-sm">{chain.name}</div>
              {chain.symbol && (
                <div className="text-xs text-gray-500">{chain.symbol}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}