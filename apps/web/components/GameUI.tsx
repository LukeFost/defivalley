'use client';

import React, { ReactNode } from 'react';
import { UIStack } from './UIStack';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NetworkSelector } from './NetworkSelector';
import type { ChatMessage } from '../lib/MainScene';

interface GameUIProps {
  // Chat system props
  chatMessages: ChatMessage[];
  chatInput: string;
  showChat: boolean;
  onChatSubmit: (e: React.FormEvent) => void;
  onChatInputChange: (value: string) => void;
  onShowChatChange: (show: boolean) => void;
  
  // Crop stats functions
  getTotalCrops: () => number;
  getReadyCrops: () => number;
  getGrowingCrops: () => number;
  
  // Player stats
  playerGold?: number;
}

export function GameUI({
  chatMessages,
  chatInput,
  showChat,
  onChatSubmit,
  onChatInputChange,
  onShowChatChange,
  getTotalCrops,
  getReadyCrops,
  getGrowingCrops,
  playerGold
}: GameUIProps) {
  // Create the chat container element
  const chatContainer = (
    <div className="chat-container">
      <div className="chat-messages">
        {chatMessages.slice(-5).map((msg, index) => (
          <div key={index} className="chat-message">
            <span className="chat-name">{msg.name}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
      </div>
      
      {showChat && (
        <form onSubmit={onChatSubmit} className="chat-input-form">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            autoFocus
            onBlur={() => {
              // Small delay to allow form submission to process
              setTimeout(() => onShowChatChange(false), 100);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onShowChatChange(false);
                onChatInputChange('');
              }
            }}
          />
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* Top-right wallet and network controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <ConnectWalletButton />
        <NetworkSelector />
      </div>

      {/* Left-side UI stack with chat and notifications */}
      <UIStack
        getTotalCrops={getTotalCrops}
        getReadyCrops={getReadyCrops}
        getGrowingCrops={getGrowingCrops}
        chatContainer={chatContainer}
        playerGold={playerGold}
      />

      <style jsx>{`
        .chat-container {
          position: relative;
          width: 100%;
          max-height: 200px;
          pointer-events: none;
          z-index: 10;
          padding: 12px;
        }

        .chat-messages {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-message {
          color: white;
          font-size: 14px;
          margin-bottom: 5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .chat-name {
          font-weight: bold;
          margin-right: 5px;
          color: #87CEEB;
        }

        .chat-text {
          opacity: 0.9;
        }

        .chat-input-form {
          pointer-events: all;
        }

        .chat-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 14px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .chat-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </>
  );
}