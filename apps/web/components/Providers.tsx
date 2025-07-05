'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { hashFn } from 'wagmi/query'
import { config } from '../app/wagmi'
import { ReactNode, useState, useEffect } from 'react'
import React from 'react'
import { makeStore, StoreContext } from '../app/store'

// This component handles manual rehydration of the Zustand store
function HydrationBoundary({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const store = React.useContext(StoreContext);

  useEffect(() => {
    if (store) {
      const rehydrateResult = store.persist.rehydrate();
      if (rehydrateResult && typeof rehydrateResult.then === 'function') {
        rehydrateResult.then(() => setIsHydrated(true));
      } else {
        setIsHydrated(true);
      }
    }
  }, [store]);

  return isHydrated ? <>{children}</> : null; // Render nothing until hydrated
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Disable structural sharing to prevent BigInt comparison issues
            structuralSharing: false,
          },
        },
        // Note: queryKeyHashFn is not available in TanStack Query 5.x
        // The hashFn from wagmi/query is used internally by wagmi hooks
      })
  )

  const [store] = useState(() => makeStore())

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmcph1jpi002hjw0nk76yfxu8'}
      config={{
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#4CAF50',
          logo: '/logo.svg',
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <StoreContext.Provider value={store}>
            <HydrationBoundary>
              {children}
            </HydrationBoundary>
          </StoreContext.Provider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
