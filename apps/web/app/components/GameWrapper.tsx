'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Game component to avoid SSR issues with Phaser
const Game = dynamic(() => import('./Game'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      width: '800px', 
      height: '600px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#87CEEB',
      borderRadius: '8px',
      fontSize: '18px',
      color: '#333'
    }}>
      Loading game...
    </div>
  )
});

export default function GameWrapper() {
  return <Game />;
}