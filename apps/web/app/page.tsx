import GameWrapper from '@/components/GameWrapper';
import { Auth } from '@/components/Auth';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import TransactionTracker from '@/components/TransactionTracker';
import Notifications from '@/components/Notifications';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#333', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          🌱 DeFi Valley
        </h1>
        <p style={{ margin: '10px 0', fontSize: '16px', color: '#666' }}>
          Plant virtual seeds, earn real DeFi yields • Multiplayer farming with cross-chain technology
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#888' }}>
          Move with WASD/Arrow Keys • Press Enter to Chat • Connect wallet to start farming
        </p>
      </header>
      
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        flexWrap: 'wrap',
        padding: '20px',
        alignItems: 'flex-start'
      }}>
        <Auth />
        <GameWrapper />
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
