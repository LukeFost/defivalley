import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Saga Chainlet custom chain
export const sagaChainlet = {
  id: 2751669528484000,
  name: 'Saga Chainlet',
  network: 'saga-chainlet',
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
      url: 'https://explorer.saga.io' 
    },
  },
  contracts: {
    gameController: {
      address: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
    },
  },
} as const

// Define Katana custom chain
export const katanaChain = {
  id: 747474, // Katana chain ID
  name: 'Katana',
  network: 'katana',
  nativeCurrency: {
    decimals: 18,
    name: 'Katana ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq'] 
    },
    public: { 
      http: ['https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Katana Explorer', 
      url: 'https://katana.t.conduit.xyz' // Update with actual explorer URL
    },
  },
  contracts: {
    morpho: {
      address: '0xC263190b99ceb7e2b7409059D24CB573e3bB9021',
    },
    usdc: {
      address: '0xA0b86a33E6441e0869EdDb5C2E2e4D0D7B9e8b9a',
    },
  },
} as const

// Define Flow Mainnet custom chain
export const flowMainnet = {
  id: 747,
  name: 'Flow EVM',
  network: 'flow-mainnet',
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
  contracts: {
    punchSwapRouter: {
      address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
    },
    pumpFlowFactory: {
      address: '0x576Be17F4dFa0E4964034e2E3dD29465B225B8d4',
    },
  },
} as const

// Wagmi configuration
export const config = createConfig({
  chains: [sagaChainlet, arbitrumSepolia, katanaChain, flowMainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [sagaChainlet.id]: http(),
    [arbitrumSepolia.id]: http(),
    [katanaChain.id]: http(),
    [flowMainnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
})

// TypeScript type registration
declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
