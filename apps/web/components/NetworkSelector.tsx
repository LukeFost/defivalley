'use client'

import { useState } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { 
  getNetworkById, 
  getDefaultNetworks,
  type NetworkConfig 
} from '../app/lib/networks'

interface NetworkSelectorProps {
  className?: string
  variant?: 'dropdown' | 'tabs' | 'cards'
  showTestnets?: boolean
  categoryFilter?: 'gaming' | 'defi' | 'all'
}

export function NetworkSelector({ 
  className = '', 
  variant = 'dropdown',
  showTestnets = true,
  categoryFilter = 'all'
}: NetworkSelectorProps) {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [isOpen, setIsOpen] = useState(false)

  // Get enabled networks
  const enabledNetworks = getDefaultNetworks()
  
  // Filter networks based on props
  const filteredNetworks = enabledNetworks.filter(network => {
    if (!showTestnets && network.isTestnet) return false
    if (categoryFilter !== 'all' && network.category !== categoryFilter) return false
    return true
  })

  const currentNetwork = getNetworkById(chainId)
  const isCurrentTestnet = currentNetwork?.isTestnet ?? true

  const getNetworkDisplayName = (chainId: number): string => {
    const network = getNetworkById(chainId)
    return network?.name || `Chain ${chainId}`
  }

  const handleNetworkChange = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId as any })
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isCurrentTestnet ? 'bg-orange-500' : 'bg-green-500'
            }`} />
            <span className="text-sm font-medium">
              {getNetworkDisplayName(chainId)}
            </span>
          </div>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-1">
              {filteredNetworks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkChange(network.id)}
                  disabled={isPending || network.id === chainId}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 ${
                    network.id === chainId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    network.isTestnet ? 'bg-orange-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{network.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {network.category} • {network.isTestnet ? 'Testnet' : 'Mainnet'}
                    </div>
                  </div>
                  {network.features?.gasless && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      Gasless
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'tabs') {
    return (
      <div className={`flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        {filteredNetworks.map((network) => (
          <button
            key={network.id}
            onClick={() => handleNetworkChange(network.id)}
            disabled={isPending}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
              network.id === chainId
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {network.name}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={`grid gap-3 ${className}`}>
        {filteredNetworks.map((network) => (
          <button
            key={network.id}
            onClick={() => handleNetworkChange(network.id)}
            disabled={isPending || network.id === chainId}
            className={`p-4 border rounded-lg text-left transition-colors disabled:opacity-50 ${
              network.id === chainId
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{network.name}</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  network.isTestnet ? 'bg-orange-500' : 'bg-green-500'
                }`} />
                {network.features?.gasless && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    Gasless
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {network.category} • {network.isTestnet ? 'Testnet' : 'Mainnet'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Chain ID: {network.id}
            </div>
          </button>
        ))}
      </div>
    )
  }

  return null
}

/**
 * Usage Examples:
 * 
 * // Simple dropdown in navbar
 * <NetworkSelector />
 * 
 * // Gaming networks only as tabs
 * <NetworkSelector 
 *   variant="tabs" 
 *   categoryFilter="gaming" 
 *   showTestnets={false}
 * />
 * 
 * // DeFi networks as cards
 * <NetworkSelector 
 *   variant="cards" 
 *   categoryFilter="defi"
 *   className="grid-cols-2"
 * />
 */