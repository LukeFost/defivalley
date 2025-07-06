'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { sagaChainlet, flowMainnet } from '../app/wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { useEffect, useState } from 'react'
import { useAppStore, usePlayerData, useConfig } from '../app/store'
import { NetworkSelector } from './NetworkSelector'
import { Button } from '@/components/ui/button'
import { Wallet, User, LogIn, Settings, LogOut, Gamepad2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function WalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isMounted, setIsMounted] = useState(false)
  
  // DeFi Valley state integration
  const showSettingsModal = useAppStore((state) => state.showSettingsModal)
  const { playerState, seedPositions, vaultPosition } = usePlayerData()
  const config = useConfig()

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Get balance for current chain
  const { data: balance } = useBalance({
    address: address,
    chainId: chainId,
  })

  // Don't render anything on server or if not ready
  if (!isMounted || !ready) {
    return (
      <div className="fixed top-4 right-4 z-[1000]">
        <Button variant="outline" disabled>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </Button>
      </div>
    )
  }

  const currentChain = chainId === sagaChainlet.id ? sagaChainlet : 
                     chainId === flowMainnet.id ? flowMainnet : arbitrumSepolia
  const isOnSaga = chainId === sagaChainlet.id
  const isOnArbitrum = chainId === arbitrumSepolia.id
  const isOnFlow = chainId === flowMainnet.id
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy')

  const harvestableSeeds = authenticated ? seedPositions.filter(s => s.isReady).length : 0

  // Not authenticated - simple connect button
  if (!authenticated) {
    return (
      <div className="fixed top-4 right-4 z-[1000]">
        <Button 
          onClick={login}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Connect & Play
        </Button>
      </div>
    )
  }

  // Authenticated - dropdown menu
  return (
    <div className="fixed top-4 right-4 z-[1000]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="relative bg-white/90 backdrop-blur-sm border-green-500 hover:bg-green-50"
          >
            <Wallet className="w-4 h-4 mr-2" />
            <span className="font-mono text-sm">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Wallet'}
            </span>
            {harvestableSeeds > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse">
                {harvestableSeeds}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 bg-white/95 backdrop-blur-sm">
          <DropdownMenuLabel className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {user?.email?.address || 'DeFi Valley Player'}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* Wallet Info */}
          <div className="px-2 py-3 space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium">{currentChain.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0'}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Network Switching */}
          <div className="px-2 py-2">
            <div className="text-xs text-gray-600 mb-2">Switch Network:</div>
            <div className="flex gap-1">
              <Button
                onClick={() => switchChain({ chainId: sagaChainlet.id })}
                variant={isOnSaga ? "default" : "outline"}
                size="sm"
                className={isOnSaga ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Saga
              </Button>
              <Button
                onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
                variant={isOnArbitrum ? "default" : "outline"}
                size="sm"
                className={isOnArbitrum ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Arbitrum
              </Button>
              <Button
                onClick={() => switchChain({ chainId: flowMainnet.id })}
                variant={isOnFlow ? "default" : "outline"}
                size="sm"
                className={isOnFlow ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                Flow
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />


          {/* Settings */}
          <DropdownMenuItem onClick={() => showSettingsModal()}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}