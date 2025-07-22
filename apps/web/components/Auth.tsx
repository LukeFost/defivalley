'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut, User, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Auth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [walletLocked, setWalletLocked] = useState(false)

  // Check if wallet is actually connected (not just authenticated)
  useEffect(() => {
    if (authenticated && !isConnected && !isConnecting && !isReconnecting) {
      // User is authenticated but wallet is not connected (likely locked)
      setWalletLocked(true)
    } else {
      setWalletLocked(false)
    }
  }, [authenticated, isConnected, isConnecting, isReconnecting])

  const handleAuthAction = async () => {
    if (authenticated) {
      // Show confirmation dialog before logout
      const confirmed = window.confirm('Are you sure you want to disconnect your wallet?')
      if (!confirmed) return
      
      setIsLoading(true)
      await logout()
      setIsLoading(false)
    } else {
      setIsLoading(true)
      await login()
      setIsLoading(false)
    }
  }

  if (!ready) {
    return (
      <Button disabled className="w-full">
        <Wallet className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  return (
    <div className="auth-container space-y-2">
      {authenticated ? (
        <>
          <div className={`connected-info p-3 rounded-lg ${
            walletLocked 
              ? 'bg-yellow-50 dark:bg-yellow-900/20' 
              : 'bg-green-50 dark:bg-green-900/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {walletLocked ? (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <User className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 
                   walletLocked ? 'Wallet Locked' : 'Connected'}
                </span>
              </div>
              <span className={`text-xs ${
                walletLocked ? 'text-yellow-600' : 'text-green-600'
              }`}>
                ● {walletLocked ? 'Locked' : 'Connected'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={handleAuthAction}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoading ? 'Disconnecting...' : 'Disconnect Wallet'}
          </Button>
        </>
      ) : (
        <Button 
          onClick={handleAuthAction}
          disabled={isLoading}
          className="w-full"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isLoading ? 'Connecting...' : 'Connect Wallet (Optional)'}
        </Button>
      )}
      
      {!authenticated && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Play as guest or connect wallet to save progress
        </p>
      )}
    </div>
  )
}