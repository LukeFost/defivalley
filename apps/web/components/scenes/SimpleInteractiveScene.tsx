'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

interface SimpleNPCConfig {
  npcName: string;
  greeting: string;
  backgroundColorHex: number;
  actionChoiceText: string;
  actionCallback: () => void;
  infoChoiceText?: string;
  infoDialogue?: string;
  leaveText?: string;
}

interface SimpleInteractiveSceneProps {
  isOpen: boolean;
  onClose: () => void;
  config: SimpleNPCConfig;
  sceneKey: string;
}

/**
 * Simple Interactive Scene that actually works
 * Replicates the demo experience without complexity
 */
class SimpleDialogueScene extends Phaser.Scene {
  private npcConfig: SimpleNPCConfig;
  private dialogueBox: Phaser.GameObjects.Container;
  private choiceButtons: Phaser.GameObjects.Container[] = [];

  constructor(key: string, config: SimpleNPCConfig) {
    super({ key });
    this.npcConfig = config;
  }

  create() {
    // Set background
    this.cameras.main.setBackgroundColor(this.npcConfig.backgroundColorHex);
    
    // Create dialogue box
    this.createDialogueBox();
    
    // Show initial dialogue
    this.showDialogue(this.npcConfig.npcName, this.npcConfig.greeting);
    
    // Create choices
    this.createChoices();
  }

  private createDialogueBox() {
    this.dialogueBox = this.add.container(this.scale.width / 2, this.scale.height - 100);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-this.scale.width / 2 + 20, -60, this.scale.width - 40, 120, 10);
    
    // Speaker name
    const speaker = this.add.text(-this.scale.width / 2 + 40, -45, '', {
      fontSize: '18px',
      color: '#ffdd44',
      fontStyle: 'bold'
    });
    
    // Dialogue text
    const text = this.add.text(-this.scale.width / 2 + 40, -15, '', {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: this.scale.width - 80 }
    });
    
    this.dialogueBox.add([bg, speaker, text]);
    this.dialogueBox.setDepth(100);
  }

  private showDialogue(speaker: string, text: string) {
    const speakerText = this.dialogueBox.getAt(1) as Phaser.GameObjects.Text;
    const dialogueText = this.dialogueBox.getAt(2) as Phaser.GameObjects.Text;
    
    speakerText.setText(speaker);
    dialogueText.setText(text);
  }

  private createChoices() {
    const choices = [
      { text: this.npcConfig.actionChoiceText, action: () => this.handleAction() },
      { text: this.npcConfig.infoChoiceText || 'Tell me more', action: () => this.handleInfo() },
      { text: this.npcConfig.leaveText || 'Leave', action: () => this.handleLeave() }
    ];

    const startX = this.scale.width - 250;
    const startY = this.scale.height / 2 - (choices.length * 60 / 2);

    choices.forEach((choice, index) => {
      if (!choice.text || (index === 1 && !this.npcConfig.infoChoiceText)) return;
      
      const button = this.add.container(startX, startY + index * 60);
      
      const bg = this.add.graphics();
      bg.fillStyle(0x2d3748, 0.9);
      bg.fillRoundedRect(0, 0, 220, 50, 8);
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 220, 50), Phaser.Geom.Rectangle.Contains);
      
      const text = this.add.text(110, 25, choice.text, {
        fontSize: '16px',
        color: '#e2e8f0',
        align: 'center'
      }).setOrigin(0.5);
      
      button.add([bg, text]);
      button.setDepth(101);
      this.choiceButtons.push(button);
      
      bg.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x4a5568, 1);
        bg.fillRoundedRect(0, 0, 220, 50, 8);
      });
      
      bg.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x2d3748, 0.9);
        bg.fillRoundedRect(0, 0, 220, 50, 8);
      });
      
      bg.on('pointerdown', () => choice.action());
    });
  }

  private handleAction() {
    this.showDialogue(this.npcConfig.npcName, "Perfect! Let me set that up for you right away.");
    this.disableChoices();
    
    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerAction');
    });
  }

  private handleInfo() {
    if (this.npcConfig.infoDialogue) {
      this.showDialogue(this.npcConfig.npcName, this.npcConfig.infoDialogue);
    }
  }

  private handleLeave() {
    this.showDialogue(this.npcConfig.npcName, "Come back anytime! I'll be here when you're ready.");
    this.disableChoices();
    
    this.time.delayedCall(2000, () => {
      this.game.events.emit('closeScene');
    });
  }

  private disableChoices() {
    this.choiceButtons.forEach(button => {
      const bg = button.getAt(0) as Phaser.GameObjects.Graphics;
      bg.disableInteractive();
      bg.setAlpha(0.5);
    });
  }
}

export function SimpleInteractiveScene({ isOpen, onClose, config, sceneKey }: SimpleInteractiveSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      return;
    }

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: `simple-scene-${sceneKey}`,
      scene: [new SimpleDialogueScene(sceneKey, config)],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(gameConfig);
    
    const gameEvents = gameRef.current.events;
    
    gameEvents.on('triggerAction', () => {
      config.actionCallback();
    });
    
    gameEvents.on('closeScene', () => {
      onClose();
    });

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };
  }, [isOpen, onClose, config, sceneKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
      <div id={`simple-scene-${sceneKey}`} className="w-full h-full" />
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}