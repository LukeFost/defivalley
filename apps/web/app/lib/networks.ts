import { Chain } from 'wagmi/chains'

/**
 * Network Configuration System
 * Clean, scalable way to add new blockchain networks
 */

export interface NetworkConfig extends Omit<Chain, 'contracts'> {
  // Extended properties for DeFi Valley
  category: 'gaming' | 'defi' | 'development' | 'experimental'
  isTestnet: boolean
  gasSettings?: {
    minGasPrice?: bigint
    maxGasPrice?: bigint
    gasMultiplier?: number
  }
  contracts?: {
    gameController?: `0x${string}`
    defiVault?: `0x${string}`
    usdc?: `0x${string}`
    multicall?: `0x${string}`
  }
  features?: {
    crossChain?: boolean
    gasless?: boolean
    fastFinality?: boolean
  }
}

/**
 * Production Networks
 */
export const flowMainnet: NetworkConfig = {
  id: 747,
  name: 'Flow EVM Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: { 
      http: ['https://mainnet.evm.nodes.onflow.org'] 
    },
    public: { 
      http: ['https://mainnet.evm.nodes.onflow.org'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Flow Explorer', 
      url: 'https://evm.flowscan.io' 
    },
  },
  category: 'defi',
  isTestnet: false,
  features: {
    crossChain: true,
    fastFinality: true,
  }
} as const

export const katanaMainnet: NetworkConfig = {
  id: 747474,
  name: 'Katana',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['https://747474.rpc.thirdweb.com'] 
    },
    public: { 
      http: ['https://747474.rpc.thirdweb.com'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Katana Explorer', 
      url: 'https://explorer.katanarpc.com' 
    },
  },
  category: 'gaming',
  isTestnet: false,
  gasSettings: {
    maxGasPrice: BigInt('60000000000'), // 60 gwei max for gaming
  },
  features: {
    fastFinality: true,
    gasless: false,
  }
} as const

/**
 * Testnet Networks
 */
export const flowTestnet: NetworkConfig = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: { 
      http: ['https://testnet.evm.nodes.onflow.org'] 
    },
    public: { 
      http: ['https://testnet.evm.nodes.onflow.org'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Flow Testnet Explorer', 
      url: 'https://evm-testnet.flowscan.io' 
    },
  },
  category: 'defi',
  isTestnet: true,
  features: {
    crossChain: true,
    fastFinality: true,
  }
} as const

/**
 * Existing DeFi Valley Networks
 */
export const sagaChainlet: NetworkConfig = {
  id: 2751669528484000,
  name: 'Saga Chainlet',
  nativeCurrency: {
    decimals: 18,
    name: 'SAGA',
    symbol: 'SAGA',
  },
  rpcUrls: {
    default: { 
      http: ['https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io'] 
    },
    public: { 
      http: ['https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Saga Explorer', 
      url: 'https://yieldfield-2751669528484000-1.sagaexplorer.io' 
    },
  },
  contracts: {
    gameController: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
  },
  category: 'gaming',
  isTestnet: true,
  gasSettings: {
    minGasPrice: BigInt('7'), // Network default
  },
  features: {
    gasless: true,
    crossChain: true,
    fastFinality: true,
  }
} as const

/**
 * Network Collections
 */
export const PRODUCTION_NETWORKS = [
  flowMainnet,
  katanaMainnet,
] as const

export const TESTNET_NETWORKS = [
  flowTestnet,
  sagaChainlet,
] as const

export const GAMING_NETWORKS = [
  sagaChainlet,
  katanaMainnet,
] as const

export const DEFI_NETWORKS = [
  flowMainnet,
  flowTestnet,
] as const

export const ALL_NETWORKS = [
  ...PRODUCTION_NETWORKS,
  ...TESTNET_NETWORKS,
] as const

/**
 * Network Utilities
 */
export const getNetworkById = (chainId: number): NetworkConfig | undefined => {
  return ALL_NETWORKS.find(network => network.id === chainId)
}

export const getNetworksByCategory = (category: NetworkConfig['category']): NetworkConfig[] => {
  return ALL_NETWORKS.filter(network => network.category === category)
}

export const getContractAddress = (
  chainId: number, 
  contract: keyof NonNullable<NetworkConfig['contracts']>
): `0x${string}` | undefined => {
  const network = getNetworkById(chainId)
  return network?.contracts?.[contract]
}

export const getExplorerUrl = (chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const network = getNetworkById(chainId)
  if (!network?.blockExplorers?.default) return '#'
  
  const baseUrl = network.blockExplorers.default.url
  return type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`
}

/**
 * Environment-based Network Selection
 */
export const getDefaultNetworks = (): NetworkConfig[] => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isDevelopment) {
    // Development: Include all networks for testing
    return [...ALL_NETWORKS]
  }
  
  if (isProduction) {
    // Production: Only stable networks
    return [sagaChainlet, flowMainnet]
  }
  
  // Fallback
  return [sagaChainlet]
}

/**
 * Network Validation
 */
export const validateNetwork = (network: NetworkConfig): boolean => {
  try {
    // Basic validation
    if (!network.id || !network.name || !network.rpcUrls.default.http[0]) {
      return false
    }
    
    // Category validation
    const validCategories = ['gaming', 'defi', 'development', 'experimental']
    if (!validCategories.includes(network.category)) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}