import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Flow mainnet chain
export const flowMainnet = {
  id: 747,
  name: 'Flow',
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
      url: 'https://evm.flowscan.org' 
    },
  },
  contracts: {
    wflow: {
      address: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
    },
    froth: {
      address: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
    },
    fvix: {
      address: '0x00f4CE400130C9383115f3858F9CA54677426583',
    },
    sFvix: {
      address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
    },
    punchSwapRouter: {
      address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
    },
  },
} as const

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

// Wagmi configuration
export const config = createConfig({
  chains: [sagaChainlet, arbitrumSepolia, flowMainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [sagaChainlet.id]: http(),
    [arbitrumSepolia.id]: http(),
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
