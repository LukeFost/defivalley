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
      address: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
    },
  },
} as const

// Wagmi configuration
export const config = createConfig({
  chains: [sagaChainlet, arbitrumSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [sagaChainlet.id]: http(),
    [arbitrumSepolia.id]: http(),
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
