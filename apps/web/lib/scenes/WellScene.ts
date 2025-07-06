import { ReactNode } from 'react';
import { VisualNovelScene, VisualNovelConfig } from './VisualNovelScene';

/**
 * WellScene - Ancient well for FROTH → FVIX minting
 * Features a mystic NPC who helps users mint FVIX tokens using FROTH
 */
export class WellScene extends VisualNovelScene {
  constructor() {
    // Pass the Phaser scene key to parent constructor
    super({ key: 'WellScene' });
    
    // Store visual novel configuration for later use
    const config: VisualNovelConfig = {
      id: 'well',
      title: 'Ancient FVIX Well',
      background: {
        gradient: 'bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100',
        pattern: 'bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1)_0%,_transparent_50%)]'
      },
      character: {
        name: 'Mystara',
        role: 'Well Keeper & Ancient Mystic',
        portrait: '🧙‍♀️',
        dialogue: [
          "Greetings, seeker of ancient wisdom. You have found the legendary FVIX Well.",
          "For countless ages, this mystical well has transformed humble FROTH into the precious FVIX tokens.",
          "The ancient magic requires a minimum offering of 10,000 FROTH tokens to awaken the transmutation ritual.",
          "FVIX tokens are the key to many mysteries in our valley - they can be staked for yield or used in other magical processes.",
          "Are you prepared to make the offering and witness the transformation of FROTH into FVIX?"
        ],
        currentDialogueIndex: 0
      },
      defiOperations: [
        {
          operation: 'mint',
          description: 'Mint FVIX tokens using FROTH as collateral',
          hook: 'useMintFVIX'
        }
      ]
    };

    // Store config for scene setup in create() method
    (this as any).novelConfig = config;
  }

  /**
   * Create the Well scene - Phaser lifecycle method
   */
  create(): void {
    console.log('🧙‍♀️ Creating Well Scene...');
    
    // Call parent create method for basic setup
    super.create();
    
    // Get our stored config
    const config = (this as any).novelConfig;
    
    // Set background with mystical theme color
    this.setBackground(undefined, 0x4169E1); // Royal blue
    
    // Add character portrait (placeholder for now)
    this.setCharacterPortrait('mystic', {
      key: 'mystic_portrait', // This will fallback to placeholder
      x: this.scale.width - 200,
      y: this.scale.height / 2,
      scale: 1.0
    });
    
    // Show initial dialogue
    if (config?.character?.dialogue?.[0]) {
      this.showDialogue({
        text: config.character.dialogue[0],
        speaker: config.character.name,
        autoAdvance: false
      });
    }
    
    // Add minting UI placeholder
    this.createMintingInterface();
    
    console.log('✅ Well Scene created');
  }

  /**
   * Create minting interface for FROTH → FVIX minting
   */
  private createMintingInterface(): void {
    // Create minting panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x191970, 0.9);
    panelBg.fillRoundedRect(0, 0, 300, 200, 12);
    panelBg.lineStyle(3, 0x9370DB, 1);
    panelBg.strokeRoundedRect(0, 0, 300, 200, 12);
    
    // Minting panel title
    const titleText = this.add.text(150, 30, '🧙‍♀️ Token Minting', {
      fontSize: '20px',
      color: '#E6E6FA',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Minting info
    const infoText = this.add.text(150, 70, 'FROTH → FVIX\nRatio: 10,000:1\nMin: 10,000 FROTH', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    
    // Mint button
    const mintButtonBg = this.add.graphics();
    mintButtonBg.fillStyle(0xE6E6FA, 1);
    mintButtonBg.fillRoundedRect(0, 0, 100, 35, 8);
    
    const mintButtonText = this.add.text(50, 17.5, 'Mint Now', {
      fontSize: '14px',
      color: '#191970',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const mintButton = this.add.container(100, 140);
    mintButton.add([mintButtonBg, mintButtonText]);
    mintButton.setSize(100, 35);
    mintButton.setInteractive();
    
    // Minting panel container
    const mintingPanel = this.add.container(50, this.scale.height - 250);
    mintingPanel.add([panelBg, titleText, infoText, mintButton]);
    mintingPanel.setDepth(150);
    
    // Mint button functionality
    mintButton.on('pointerdown', () => {
      console.log('🪙 Mint button clicked - would open minting interface');
      // Here we would integrate with useMintFVIX hook
    });
    
    console.log('🪙 Minting interface created');
  }

  /**
   * Execute FROTH → FVIX minting operation
   */
  public executeMint(amount: string): void {
    // This would integrate with useMintFVIX hook
    console.log(`Executing FROTH → FVIX minting for ${amount} tokens`);
    this.executeAction();
  }

  /**
   * Get minting requirements and info
   */
  public getMintingInfo(): { 
    minAmount: string; 
    ratio: string; 
    fee: string;
    requirements: string[];
  } {
    return {
      minAmount: '10,000',
      ratio: '10,000 FROTH = 1 FVIX',
      fee: '0.5%',
      requirements: [
        'Minimum 10,000 FROTH tokens',
        'FROTH must be approved for the FVIX contract',
        'Sufficient gas for transaction'
      ]
    };
  }

  /**
   * Check if user can perform minting
   */
  public canMint(userBalance: string, mintAmount: string): boolean {
    const balance = parseFloat(userBalance);
    const amount = parseFloat(mintAmount);
    return balance >= amount && amount >= 10000;
  }

  /**
   * Calculate FVIX output from FROTH input
   */
  public calculateFVIXOutput(frothAmount: string): string {
    const froth = parseFloat(frothAmount);
    const fvix = froth / 10000; // 10,000 FROTH = 1 FVIX
    return fvix.toFixed(6);
  }

  /**
   * Get well status and mystical properties
   */
  public getWellStatus(): {
    isActive: boolean;
    magicLevel: string;
    lastRitual: string;
    nextMoonPhase: string;
  } {
    return {
      isActive: true,
      magicLevel: 'High',
      lastRitual: '2 hours ago',
      nextMoonPhase: '3 days (bonus rewards)'
    };
  }
}