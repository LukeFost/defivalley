'use client';

import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { BASE_CHAIN_ID } from '@/constants/base-tokens';

interface NetworkInfo {
  id: number;
  name: string;
  displayName: string;
  category: 'gaming' | 'defi';
  icon: string;
}

const SUPPORTED_NETWORKS: NetworkInfo[] = [
  {
    id: 747474,
    name: 'Katana',
    displayName: 'Katana',
    category: 'gaming',
    icon: '⚔️'
  },
  {
    id: BASE_CHAIN_ID, // 8453
    name: 'Base',
    displayName: 'Base',
    category: 'defi',
    icon: '🔷'
  }
];

export function NetworkSwitch() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // Console log network changes
  useEffect(() => {
    console.log('🌐 Current network ID:', chainId);
    const currentNetwork = SUPPORTED_NETWORKS.find(network => network.id === chainId);
    if (currentNetwork) {
      console.log(`🌐 Connected to ${currentNetwork.displayName} (${currentNetwork.category})`);
    } else {
      console.log('🌐 Connected to unsupported network');
    }
  }, [chainId]);

  const currentNetwork = SUPPORTED_NETWORKS.find(network => network.id === chainId);
  const isUnsupportedNetwork = !currentNetwork;

  const handleNetworkSwitch = (networkId: number) => {
    console.log(`🔄 Switching to network ${networkId}`);
    switchChain({ chainId: networkId as 2751669528484000 | 747474 | 421614 | 8453 });
  };

  if (!isConnected) {
    return null; // Don't show network switch if wallet not connected
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 min-w-[120px] ${
              isUnsupportedNetwork ? 'border-red-500 bg-red-50 text-red-700' : 'bg-white/90 backdrop-blur-sm'
            }`}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Switching...
              </>
            ) : isUnsupportedNetwork ? (
              <>
                <WifiOff className="w-4 h-4" />
                Unknown
              </>
            ) : (
              <>
                <span className="text-sm">{currentNetwork.icon}</span>
                <span className="font-medium">{currentNetwork.displayName}</span>
                <Wifi className="w-4 h-4 text-green-500" />
              </>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border border-gray-200">
          {SUPPORTED_NETWORKS.map((network) => (
            <DropdownMenuItem
              key={network.id}
              onClick={() => handleNetworkSwitch(network.id)}
              className={`flex items-center justify-between p-2 cursor-pointer ${
                chainId === network.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{network.icon}</span>
                <span className="font-medium">{network.displayName}</span>
              </div>
              {chainId === network.id && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
          
          {isUnsupportedNetwork && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-red-600">
                ⚠️ Current network not supported
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}