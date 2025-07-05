'use client';

import { useState } from 'react';
import GameWrapper from '@/components/GameWrapper';
import WorldBrowser from '@/components/WorldBrowser';
import { Auth } from '@/components/Auth';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import TransactionTracker from '@/components/TransactionTracker';
import Notifications from '@/components/Notifications';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<'browser' | 'game'>('browser');
  const [selectedWorldId, setSelectedWorldId] = useState<string>('');
  const [isOwnWorld, setIsOwnWorld] = useState<boolean>(false);

  const handleEnterWorld = (worldId: string, isOwn: boolean) => {
    setSelectedWorldId(worldId);
    setIsOwnWorld(isOwn);
    setCurrentView('game');
  };

  const handleBackToWorldBrowser = () => {
    setCurrentView('browser');
    setSelectedWorldId('');
    setIsOwnWorld(false);
  };

  if (currentView === 'browser') {
    return (
      <div className="min-h-screen">
        <WorldBrowser onEnterWorld={handleEnterWorld} />
        {/* Auth component for world browser */}
        <div className="fixed top-4 right-4 z-50">
          <Auth />
        </div>
        {/* Global components that work across views */}
        <PlantSeedDialog />
        <SettingsDialog />
        <TransactionTracker />
        <Notifications />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <header style={{ padding: '10px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.1)', position: 'relative' }}>
        {/* Back button */}
        <Button
          onClick={handleBackToWorldBrowser}
          variant="outline"
          size="sm"
          className="absolute left-4 top-1/2 transform -translate-y-1/2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Worlds
        </Button>
        
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          🌱 {isOwnWorld ? 'My Farm' : `Visiting Farm`}
        </h1>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          {isOwnWorld 
            ? 'Plant virtual seeds, earn real DeFi yields • Move with WASD • Press Enter to Chat'
            : 'You are visiting this farm as a guest • Move with WASD • Press Enter to Chat'
          }
        </p>
        {!isOwnWorld && (
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#888' }}>
            Farm ID: {selectedWorldId.slice(0, 16)}...
          </p>
        )}
      </header>
      
      <main style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px', 
        padding: '15px',
        minHeight: 'calc(100vh - 140px)'
      }}>
        {/* Gaming-First Layout */}
        <div style={{ 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px'
        }}>
          {/* Large Game Area - Primary Focus */}
          <GameWrapper worldId={selectedWorldId} isOwnWorld={isOwnWorld} />
          
          {/* Floating Auth Drawer - Overlays the game */}
          <Auth />
        </div>
      </main>
      
      {/* DeFi Valley Modal Components */}
      <PlantSeedDialog />
      <SettingsDialog />
      <TransactionTracker />
      
      {/* Global Notification System */}
      <Notifications />
    </div>
  );
}
