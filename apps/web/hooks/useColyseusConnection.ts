import { useState, useEffect, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';

export interface GameState {
  players: Map<string, any>;
  crops: Map<string, any>;
  buildings: Map<string, any>;
  worldOwnerId: string;
}

export interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface ColyseusConnection {
  room: Room<GameState> | null;
  sessionId: string | null;
  isConnected: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
}

export function useColyseusConnection(worldId?: string): ColyseusConnection {
  const [room, setRoom] = useState<Room<GameState> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { address } = useAccount();
  const { user } = usePrivy();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!address || !user) return;

    const connect = async () => {
      try {
        setError(null);
        
        // Determine server endpoint
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const hostname = window.location.hostname;
        const endpoint = `${protocol}://${hostname}:2567`;
        
        console.log('🔌 Connecting to Colyseus server:', endpoint);
        
        clientRef.current = new Client(endpoint);

        const playerId = address;
        const roomOptions = {
          name: user.email?.address?.split('@')[0] || `Player_${playerId.slice(0, 6)}`,
          playerId,
          worldOwnerId: worldId,
        };
        
        const roomInstance = await clientRef.current.joinOrCreate<GameState>('world', roomOptions);
        
        // Set up event listeners
        roomInstance.onMessage('chat', (message: ChatMessage) => {
          setChatMessages(prev => [...prev, message]);
        });

        roomInstance.onError((code, message) => {
          console.error('🚨 Room error:', code, message);
          setError(`Room error: ${message}`);
        });

        roomInstance.onLeave((code) => {
          console.log('👋 Left room with code:', code);
          setIsConnected(false);
        });

        setRoom(roomInstance);
        setSessionId(roomInstance.sessionId);
        setIsConnected(true);

        console.log('🎮 Successfully connected to Colyseus room:', roomInstance.id);
      } catch (e) {
        console.error("🚨 Colyseus connection failed:", e);
        setError(e instanceof Error ? e.message : 'Connection failed');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (room) {
        room.leave();
        console.log('🔌 Disconnected from Colyseus room.');
      }
      setIsConnected(false);
    };
  }, [worldId, address, user]);

  return { 
    room, 
    sessionId, 
    isConnected, 
    error, 
    chatMessages 
  };
}