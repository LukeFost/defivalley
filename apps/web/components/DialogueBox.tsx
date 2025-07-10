'use client';

import React from 'react';
import { Button } from './ui/button';

interface DialogueBoxProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onContinue: () => void;
  characterName?: string;
}

export const DialogueBox = React.memo(function DialogueBox({ isOpen, content, onClose, onContinue, characterName = "Guide" }: DialogueBoxProps) {
  if (!isOpen) return null;

  return (
    <div className="dialogue-overlay">
      <div className="dialogue-box">
        <div className="dialogue-header">
          <h3 className="character-name">{characterName}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="dialogue-content">
          <p>{content}</p>
        </div>
        <div className="dialogue-actions">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-neutral-500 text-white hover:bg-neutral-800 hover:border-neutral-400"
          >
            Leave
          </Button>
          <Button onClick={onContinue} className="bg-sky-600 hover:bg-sky-700 text-white">
            Continue
          </Button>
        </div>
      </div>
      <style jsx>{`
        .dialogue-overlay {
          position: fixed;
          bottom: 80px; /* Above the bottom bar */
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 800px;
          z-index: 1001;
        }
        .dialogue-box {
          background: rgba(20, 20, 20, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 20px;
          color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .dialogue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .character-name {
          font-weight: bold;
          font-size: 1.1rem;
          color: #87CEEB;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
        }
        .close-btn:hover {
          opacity: 1;
        }
        .dialogue-content {
          margin-bottom: 20px;
          font-size: 1rem;
          line-height: 1.6;
        }
        .dialogue-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>
    </div>
  );
});