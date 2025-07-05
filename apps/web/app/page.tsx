import GameWrapper from '@/components/GameWrapper';
import { Auth } from '@/components/Auth';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import TransactionTracker from '@/components/TransactionTracker';
import Notifications from '@/components/Notifications';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <header style={{ padding: '10px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          🌱 DeFi Valley
        </h1>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          Plant virtual seeds, earn real DeFi yields • Move with WASD • Press Enter to Chat
        </p>
      </header>
      
      <main style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px', 
        padding: '15px',
        minHeight: 'calc(100vh - 120px)'
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
          <GameWrapper />
          
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
