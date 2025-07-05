'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useSquidRouter } from '../app/hooks/useCrossChainTx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AutoBridgeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBridgeSelected: (params: {
    fromChain: number;
    fromToken: string;
    amount: string;
    quote: any;
  }) => void;
  targetAmount: string;
  targetChain: number;
  targetToken: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  logoURI?: string;
}

const POPULAR_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 56, name: 'BSC', symbol: 'BNB' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
  { id: 10, name: 'Optimism', symbol: 'ETH' },
  { id: 250, name: 'Fantom', symbol: 'FTM' },
  { id: 100, name: 'Gnosis', symbol: 'xDAI' },
];

export default function AutoBridgeSelector({
  isOpen,
  onClose,
  onBridgeSelected,
  targetAmount,
  targetChain,
  targetToken,
}: AutoBridgeSelectorProps) {
  const { address } = useAccount();
  const { supportedChains, getTokensForChain, getQuote, isLoading } = useSquidRouter();
  
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Get tokens for selected chain
  const availableTokens = selectedChain ? getTokensForChain(selectedChain) : [];
  
  // Filter tokens based on search
  const filteredTokens = availableTokens.filter((token: any) =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get quote when parameters change
  useEffect(() => {
    if (selectedChain && selectedToken && bridgeAmount && address) {
      getQuoteForBridge();
    }
  }, [selectedChain, selectedToken, bridgeAmount, address]);

  const getQuoteForBridge = useCallback(async () => {
    if (!selectedChain || !selectedToken || !bridgeAmount || !address) return;

    setIsGettingQuote(true);
    try {
      const token = availableTokens.find((t: any) => t.address === selectedToken);
      if (!token) return;

      const amount = parseUnits(bridgeAmount, token.decimals);
      
      const quoteResult = await getQuote({
        fromChain: selectedChain,
        toChain: targetChain,
        fromToken: selectedToken,
        toToken: targetToken,
        fromAmount: amount.toString(),
        fromAddress: address,
        toAddress: address,
      });

      setQuote(quoteResult);
    } catch (error) {
      console.error('Failed to get quote:', error);
      setQuote(null);
    } finally {
      setIsGettingQuote(false);
    }
  }, [selectedChain, selectedToken, bridgeAmount, address, availableTokens, getQuote, targetChain, targetToken]);

  const handleBridgeConfirm = () => {
    if (quote && selectedChain && selectedToken) {
      onBridgeSelected({
        fromChain: selectedChain,
        fromToken: selectedToken,
        amount: bridgeAmount,
        quote,
      });
    }
  };

  const getChainName = (chainId: number) => {
    const chain = supportedChains.find((c: any) => c.chainId === chainId);
    return chain?.chainName || `Chain ${chainId}`;
  };

  const getTokenDisplayName = (token: any) => {
    return `${token.symbol} (${token.address.slice(0, 6)}...${token.address.slice(-4)})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Auto-Bridge Assets</DialogTitle>
          <DialogDescription>
            Bridge assets from any supported chain to fund your seed planting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Information */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Target</h3>
            <div className="text-sm text-blue-800">
              <p>Chain: {getChainName(targetChain)}</p>
              <p>Token: USDC</p>
              <p>Amount: {targetAmount} USDC</p>
            </div>
          </div>

          {/* Chain Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Source Chain</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POPULAR_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    setSelectedChain(chain.id);
                    setSelectedToken(null);
                    setBridgeAmount('');
                    setQuote(null);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedChain === chain.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{chain.name}</div>
                  <div className="text-sm text-gray-600">{chain.symbol}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Token Selection */}
          {selectedChain && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Asset</h3>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Token List */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredTokens.map((token: any) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token.address);
                      setBridgeAmount('');
                      setQuote(null);
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedToken === token.address
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-gray-600">
                          {token.address.slice(0, 8)}...{token.address.slice(-6)}
                        </div>
                      </div>
                      {token.logoURI && (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                    </div>
                  </button>
                ))}
                
                {filteredTokens.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tokens found matching your search
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Input */}
          {selectedToken && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Bridge Amount</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Bridge
                  </label>
                  <input
                    type="number"
                    value={bridgeAmount}
                    onChange={(e) => setBridgeAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setBridgeAmount(targetAmount)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Exact Amount
                  </button>
                  <button
                    onClick={() => setBridgeAmount((parseFloat(targetAmount) * 1.1).toString())}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    110% (+10%)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quote Display */}
          {isGettingQuote && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-blue-600">Getting quote...</span>
            </div>
          )}

          {quote && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">Bridge Quote</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">From:</span>
                  <span className="font-medium text-green-800">
                    {bridgeAmount} {availableTokens.find((t: any) => t.address === selectedToken)?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">To:</span>
                  <span className="font-medium text-green-800">
                    {quote.toAmount ? formatUnits(BigInt(quote.toAmount), 6) : '0'} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Estimated Time:</span>
                  <span className="font-medium text-green-800">
                    {quote.estimatedRouteDuration ? `${Math.ceil(quote.estimatedRouteDuration / 60)} minutes` : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Bridge Fee:</span>
                  <span className="font-medium text-green-800">
                    {quote.feeCosts?.length > 0 ? `${formatUnits(BigInt(quote.feeCosts[0].amount), quote.feeCosts[0].token.decimals)} ${quote.feeCosts[0].token.symbol}` : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleBridgeConfirm}
            disabled={!quote || isGettingQuote}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              quote && !isGettingQuote
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGettingQuote ? 'Getting Quote...' : 'Confirm Bridge'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}