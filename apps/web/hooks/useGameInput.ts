import { useEffect, useRef, useState } from 'react';
import { Room } from 'colyseus.js';

export interface GameInputState {
  isMoving: boolean;
  direction: string;
  isChatOpen: boolean;
  pressedKeys: Set<string>;
}

export interface GameInputHandlers {
  onChatToggle: (isOpen: boolean) => void;
  onChatSubmit: (message: string) => void;
  onMovement: (direction: string, isMoving: boolean) => void;
}

export function useGameInput(
  room: Room | null,
  handlers: GameInputHandlers
): GameInputState {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState('');
  const pressedKeysRef = useRef(new Set<string>());
  const movementTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChatToggle = (open: boolean) => {
    setIsChatOpen(open);
    handlers.onChatToggle(open);
  };

  const handleChatSubmit = (message: string) => {
    if (message.trim() && room) {
      room.send('chat', { message: message.trim() });
      handlers.onChatSubmit(message);
    }
    setIsChatOpen(false);
  };

  const sendMovement = (newDirection: string, moving: boolean) => {
    if (room && !isChatOpen) {
      room.send('move', { direction: newDirection, isMoving: moving });
      setDirection(newDirection);
      setIsMoving(moving);
      handlers.onMovement(newDirection, moving);
    }
  };

  const updateMovement = () => {
    if (isChatOpen) return;

    const keys = pressedKeysRef.current;
    let newDirection = '';
    let moving = false;

    // Determine direction based on pressed keys
    if (keys.has('ArrowUp') || keys.has('KeyW')) {
      newDirection = 'up';
      moving = true;
    } else if (keys.has('ArrowDown') || keys.has('KeyS')) {
      newDirection = 'down';
      moving = true;
    } else if (keys.has('ArrowLeft') || keys.has('KeyA')) {
      newDirection = 'left';
      moving = true;
    } else if (keys.has('ArrowRight') || keys.has('KeyD')) {
      newDirection = 'right';
      moving = true;
    }

    // Only send if direction or movement state changed
    if (newDirection !== direction || moving !== isMoving) {
      sendMovement(newDirection, moving);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { code } = event;

      // Handle chat toggle
      if (code === 'Enter') {
        event.preventDefault();
        if (!isChatOpen) {
          handleChatToggle(true);
        }
        return;
      }

      // Handle escape key
      if (code === 'Escape') {
        event.preventDefault();
        if (isChatOpen) {
          handleChatToggle(false);
        }
        return;
      }

      // Handle movement keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
        event.preventDefault();
        
        if (!pressedKeysRef.current.has(code)) {
          pressedKeysRef.current.add(code);
          updateMovement();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const { code } = event;

      // Handle movement keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
        event.preventDefault();
        
        if (pressedKeysRef.current.has(code)) {
          pressedKeysRef.current.delete(code);
          
          // Debounce movement updates
          if (movementTimerRef.current) {
            clearTimeout(movementTimerRef.current);
          }
          
          movementTimerRef.current = setTimeout(() => {
            updateMovement();
          }, 16); // ~60fps
        }
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (movementTimerRef.current) {
        clearTimeout(movementTimerRef.current);
      }
    };
  }, [room, isChatOpen, direction, isMoving]);

  return {
    isMoving,
    direction,
    isChatOpen,
    pressedKeys: pressedKeysRef.current,
  };
}