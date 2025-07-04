import GameWrapper from './components/GameWrapper';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#333' }}>
          DeFi Valley
        </h1>
        <p style={{ margin: '10px 0', fontSize: '16px', color: '#666' }}>
          Multiplayer Game - Move with WASD/Arrow Keys, Press Enter to Chat
        </p>
      </header>
      
      <main style={{ display: 'flex', justifyContent: 'center' }}>
        <GameWrapper />
      </main>
    </div>
  );
}
