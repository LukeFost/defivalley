import { type NetworkConfig, validateNetwork } from './networks'

/**
 * Helper functions for adding new networks safely
 * Includes validation and wallet integration
 */

interface AddNetworkToWalletParams {
  network: NetworkConfig
  includeToken?: boolean
}

/**
 * Add a network to user's wallet (MetaMask, etc.)
 */
export async function addNetworkToWallet({ 
  network, 
  includeToken = true 
}: AddNetworkToWalletParams): Promise<boolean> {
  if (!validateNetwork(network)) {
    throw new Error(`Invalid network configuration for ${network.name}`)
  }

  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet detected')
  }

  try {
    // Add the network
    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${network.id.toString(16)}`,
        chainName: network.name,
        rpcUrls: network.rpcUrls.default.http,
        nativeCurrency: {
          name: network.nativeCurrency.name,
          symbol: network.nativeCurrency.symbol,
          decimals: network.nativeCurrency.decimals,
        },
        blockExplorerUrls: network.blockExplorers?.default ? 
          [network.blockExplorers.default.url] : undefined,
      }],
    })

    // Optionally add native token to wallet
    if (includeToken && network.nativeCurrency.symbol !== 'ETH') {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: '0x0000000000000000000000000000000000000000', // Native token
              symbol: network.nativeCurrency.symbol,
              decimals: network.nativeCurrency.decimals,
            },
          },
        })
      } catch (tokenError) {
        console.warn('Failed to add native token to wallet:', tokenError)
        // Continue anyway - network was added successfully
      }
    }

    return true
  } catch (error) {
    console.error('Failed to add network to wallet:', error)
    return false
  }
}

/**
 * Network creation template for developers
 */
export function createNetworkTemplate(overrides: Partial<NetworkConfig>): NetworkConfig {
  const template: NetworkConfig = {
    id: 0, // Must be provided
    name: 'New Network',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: [''] }, // Must be provided
      public: { http: [''] },
    },
    blockExplorers: {
      default: { 
        name: 'Explorer', 
        url: '' // Should be provided
      },
    },
    category: 'development',
    isTestnet: true,
    features: {
      crossChain: false,
      gasless: false,
      fastFinality: false,
    },
    ...overrides
  }

  if (!validateNetwork(template)) {
    throw new Error('Invalid network template configuration')
  }

  return template
}

/**
 * Quick network addition helpers
 */
export const addFlowMainnet = () => addNetworkToWallet({
  network: {
    id: 747,
    name: 'Flow EVM Mainnet',
    nativeCurrency: { decimals: 18, name: 'Flow', symbol: 'FLOW' },
    rpcUrls: {
      default: { http: ['https://mainnet.evm.nodes.onflow.org'] },
      public: { http: ['https://mainnet.evm.nodes.onflow.org'] },
    },
    blockExplorers: {
      default: { name: 'Flow Explorer', url: 'https://evm.flowscan.io' },
    },
    category: 'defi',
    isTestnet: false,
    features: { crossChain: true, fastFinality: true, gasless: false },
  }
})

export const addKatanaMainnet = () => addNetworkToWallet({
  network: {
    id: 747474,
    name: 'Katana',
    nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
    rpcUrls: {
      default: { http: ['https://747474.rpc.thirdweb.com'] },
      public: { http: ['https://747474.rpc.thirdweb.com'] },
    },
    blockExplorers: {
      default: { name: 'Katana Explorer', url: 'https://explorer.katanarpc.com' },
    },
    category: 'gaming',
    isTestnet: false,
    features: { crossChain: false, fastFinality: true, gasless: false },
  }
})

/**
 * Batch network addition
 */
export async function addMultipleNetworks(networks: NetworkConfig[]): Promise<{
  success: NetworkConfig[]
  failed: { network: NetworkConfig; error: string }[]
}> {
  const results = await Promise.allSettled(
    networks.map(network => addNetworkToWallet({ network }))
  )

  const success: NetworkConfig[] = []
  const failed: { network: NetworkConfig; error: string }[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      success.push(networks[index])
    } else {
      failed.push({
        network: networks[index],
        error: result.status === 'rejected' ? result.reason : 'Unknown error'
      })
    }
  })

  return { success, failed }
}

/**
 * Development helper: Log network configuration
 */
export function logNetworkConfig(network: NetworkConfig) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🌐 Network: ${network.name}`)
    console.log('Chain ID:', network.id)
    console.log('RPC URL:', network.rpcUrls.default.http[0])
    console.log('Explorer:', network.blockExplorers?.default?.url)
    console.log('Category:', network.category)
    console.log('Features:', network.features)
    console.groupEnd()
  }
}

/**
 * Type guard for wallet API
 */

/**
 * Usage Examples:
 * 
 * // Add Flow to user's wallet
 * await addFlowMainnet()
 * 
 * // Add Katana to user's wallet  
 * await addKatanaMainnet()
 * 
 * // Create custom network
 * const customNetwork = createNetworkTemplate({
 *   id: 12345,
 *   name: 'My Custom Chain',
 *   rpcUrls: { default: { http: ['https://rpc.mychain.com'] } }
 * })
 * 
 * // Add multiple networks at once
 * const { success, failed } = await addMultipleNetworks([flowMainnet, katanaMainnet])
 */