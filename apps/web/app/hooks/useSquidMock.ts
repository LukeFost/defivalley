import { useState, useCallback } from 'react';

// Mock implementation for Squid Router functionality
// This provides the same interface but with simulated data for demo purposes

export interface MockSquidQuote {
  route: any;
  estimatedRouteDuration: number;
  gasCosts: {
    gasLimit: string;
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  feeCosts: {
    amount: string;
    token: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
    };
  }[];
  fromAmount: string;
  toAmount: string;
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
}

export interface MockSupportedChain {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }[];
}

// Mock supported chains data
const MOCK_SUPPORTED_CHAINS: MockSupportedChain[] = [
  {
    chainId: 1,
    chainName: 'Ethereum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
      { address: '0xA0b86a33E924052AA4a29E3De1aed8094a80E204', symbol: 'USDC', decimals: 6 },
      { address: '0x54c1B69b3b0E59Bc3Be7B42F9d6d7E1B95Bd4dCe', symbol: 'USDT', decimals: 6 },
      { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'DAI', decimals: 18 },
    ],
  },
  {
    chainId: 137,
    chainName: 'Polygon',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18 },
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 },
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
    ],
  },
  {
    chainId: 56,
    chainName: 'BSC',
    nativeCurrency: { symbol: 'BNB', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'BNB', decimals: 18 },
      { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
      { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
    ],
  },
  {
    chainId: 43114,
    chainName: 'Avalanche',
    nativeCurrency: { symbol: 'AVAX', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'AVAX', decimals: 18 },
      { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
      { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', decimals: 6 },
    ],
  },
  {
    chainId: 42161,
    chainName: 'Arbitrum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
      { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', decimals: 6 },
      { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    ],
  },
  {
    chainId: 10,
    chainName: 'Optimism',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    tokens: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
      { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', decimals: 6 },
      { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
    ],
  },
];

export function useSquidRouterMock() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock quote fetching with realistic delay
  const getQuote = useCallback(async (params: {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<MockSquidQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const fromChain = MOCK_SUPPORTED_CHAINS.find(c => c.chainId === params.fromChain);
      const fromToken = fromChain?.tokens.find(t => t.address === params.fromToken);
      
      if (!fromChain || !fromToken) {
        throw new Error('Chain or token not found');
      }

      // Mock quote calculation
      const fromAmountBN = BigInt(params.fromAmount);
      const toAmount = (fromAmountBN * BigInt(99)) / BigInt(100); // 1% bridge fee
      
      const mockQuote: MockSquidQuote = {
        route: {
          estimate: {
            fromAmount: params.fromAmount,
            toAmount: toAmount.toString(),
            fromToken: params.fromToken,
            toToken: params.toToken,
          },
        },
        estimatedRouteDuration: 180, // 3 minutes
        gasCosts: {
          gasLimit: '21000',
          gasPrice: '20000000000',
          maxFeePerGas: '30000000000',
          maxPriorityFeePerGas: '2000000000',
        },
        feeCosts: [
          {
            amount: (fromAmountBN / BigInt(100)).toString(), // 1% fee
            token: {
              address: fromToken.address,
              symbol: fromToken.symbol,
              decimals: fromToken.decimals,
              chainId: params.fromChain,
            },
          },
        ],
        fromAmount: params.fromAmount,
        toAmount: toAmount.toString(),
        fromToken: {
          address: params.fromToken,
          symbol: fromToken.symbol,
          decimals: fromToken.decimals,
          chainId: params.fromChain,
        },
        toToken: {
          address: params.toToken,
          symbol: 'USDC',
          decimals: 6,
          chainId: params.toChain,
        },
      };

      return mockQuote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock route execution
  const executeRoute = useCallback(async (
    route: any,
    signer: any
  ): Promise<{ txHash: string; success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate transaction execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTxHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      
      return { txHash: mockTxHash, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute route';
      setError(errorMessage);
      return { txHash: '', success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get supported tokens for a specific chain
  const getTokensForChain = useCallback((chainId: number) => {
    const chain = MOCK_SUPPORTED_CHAINS.find(c => c.chainId === chainId);
    return chain?.tokens || [];
  }, []);

  // Get popular cross-chain tokens
  const getPopularTokens = useCallback(() => {
    const popularSymbols = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];
    const popularTokens: { [chainId: number]: any[] } = {};
    
    MOCK_SUPPORTED_CHAINS.forEach(chain => {
      popularTokens[chain.chainId] = chain.tokens.filter(token => 
        popularSymbols.includes(token.symbol)
      );
    });
    
    return popularTokens;
  }, []);

  return {
    squid: {}, // Mock squid instance
    supportedChains: MOCK_SUPPORTED_CHAINS,
    isLoading,
    error,
    getQuote,
    executeRoute,
    getTokensForChain,
    getPopularTokens,
  };
}