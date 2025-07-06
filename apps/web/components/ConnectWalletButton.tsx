'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export function ConnectWalletButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, isConnected } = useAccount();

  if (!ready) {
    return null;
  }

  const handleClick = () => {
    if (authenticated) {
      logout();
    } else {
      login();
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Button
      onClick={handleClick}
      variant={authenticated ? "outline" : "default"}
      size="sm"
      className="flex items-center gap-2 shadow-lg"
    >
      <Wallet className="h-4 w-4" />
      {authenticated && address ? (
        <span>{formatAddress(address)}</span>
      ) : (
        <span>Connect Wallet</span>
      )}
    </Button>
  );
}