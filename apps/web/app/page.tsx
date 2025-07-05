import GameWrapper from '@/components/GameWrapper';
import { Auth } from '@/components/Auth';
import PlantSeedDialog from '@/components/PlantSeedDialog';
import SettingsDialog from '@/components/SettingsDialog';
import TransactionTracker from '@/components/TransactionTracker';
import Notifications from '@/components/Notifications';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#333' }}>
          🌱 DeFi Valley
        </h1>
        <p style={{ margin: '10px 0', fontSize: '16px', color: '#666' }}>
          Plant virtual seeds, earn real DeFi yields • Multiplayer farming with cross-chain technology
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#888' }}>
          Move with WASD/Arrow Keys • Press Enter to Chat • Connect wallet to start farming
        </p>
      </header>
      
      <main style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
