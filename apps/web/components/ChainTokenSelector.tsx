'use client';

import React, { useState, useEffect } from 'react';
import { useSquidRouter } from '../app/hooks/useCrossChainTx';

interface ChainTokenSelectorProps {
  onSelectionChange: (selection: {
    chainId: number | null;
    tokenAddress: string | null;
    chainName: string;
    tokenSymbol: string;
  }) => void;
  className?: string;
}

const POPULAR_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '⟡' },
  { id:137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { id:56, name: 'BSC', symbol: 'BNB', icon: '🟡' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔴' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔵' },
  { id: 10, name: 'Optimism', symbol: 'ETH', icon: '🔴' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵' },
  { id: 100, name: 'Gnosis', symbol: 'xDAI', icon: '🟢' },
];

const POPULAR_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];

export default function ChainTokenSelector({ onSelectionChange, className = '' }: ChainTokenSelectorProps) {
  const { supportedChains, getTokensForChain, isLoading } = useSquidRouter();
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showAllChains, setShowAllChains] = useState(false);
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');

  const availableChains = showAllChains 
    ? supportedChains 
    : supportedChains.filter((chain: any) => 
        POPULAR_CHAINS.some(popular => popular.id === chain.chainId)
      );

  const availableTokens = selectedChain ? getTokensForChain(selectedChain) : [];
  
  const filteredTokens = availableTokens.filter((token: any) => {
    const matchesSearch = token.symbol.toLowerCase().includes(tokenSearchTerm.toLowerCase());
    const isPopular = POPULAR_TOKENS.includes(token.symbol);
    return tokenSearchTerm ? matchesSearch : isPopular;
  });

  useEffect(() => {
    const chain = supportedChains.find((c: any) => c.chainId === selectedChain);
    const token = availableTokens.find((t: any) => t.address === selectedToken);
    
    onSelectionChange({
      chainId: selectedChain,
      tokenAddress: selectedToken,
      chainName: chain?.chainName || '',
      tokenSymbol: token?.symbol || '',
    });
  }, [selectedChain, selectedToken, supportedChains, availableTokens, onSelectionChange]);

  const getChainIcon = (chainId: number) => {
    return POPULAR_CHAINS.find(c => c.id === chainId)?.icon || '🔗';
  };

  if (isLoading) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading supported chains...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Chain Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Source Chain</h3>
          <button
            onClick={() => setShowAllChains(!showAllChains)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAllChains ? 'Show Popular Only' : `Show All (${supportedChains.length})`}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableChains.map((chain: any) => (
            <button
              key={chain.chainId}
              onClick={() => {
                setSelectedChain(chain.chainId);
                setSelectedToken(null);
              }}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedChain === chain.chainId
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getChainIcon(chain.chainId)}</span>
                <div>
                  <div className="font-medium text-sm">{chain.chainName}</div>
                  <div className="text-xs text-gray-600">ID: {chain.chainId}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Token Selection */}
      {selectedChain && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Asset</h3>
          
          {/* Token Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search tokens or use popular ones below..."
              value={tokenSearchTerm}
              onChange={(e) => setTokenSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Token Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {filteredTokens.map((token: any) => (
              <button
                key={token.address}
                onClick={() => setSelectedToken(token.address)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedToken === token.address
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-sm text-gray-600">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </div>
                  </div>
                  {POPULAR_TOKENS.includes(token.symbol) && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Popular
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {tokenSearchTerm ? 'No tokens found matching your search' : 'No popular tokens found for this chain'}
            </div>
          )}

          {/* Quick Selection Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR_TOKENS.map((symbol) => {
              const token = availableTokens.find((t: any) => t.symbol === symbol);
              if (!token) return null;
              
              return (
                <button
                  key={symbol}
                  onClick={() => setSelectedToken(token.address)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedToken === token.address
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedChain && selectedToken && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Selection Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Chain:</span> {supportedChains.find((c: any) => c.chainId === selectedChain)?.chainName}
            </div>
            <div>
              <span className="font-medium">Token:</span> {availableTokens.find((t: any) => t.address === selectedToken)?.symbol}
            </div>
            <div>
              <span className="font-medium">Address:</span> 
              <span className="font-mono ml-1">{selectedToken?.slice(0, 10)}...{selectedToken?.slice(-8)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}