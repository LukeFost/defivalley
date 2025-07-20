import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

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


// Wagmi configuration
export const config = createConfig({
  chains: [katanaChain],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [katanaChain.id]: http(),
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
