import { ReactNode } from 'react';
import { VisualNovelScene, VisualNovelConfig } from './VisualNovelScene';

/**
 * CorralScene - Trading post for FLOW → FROTH swaps
 * Features a trader NPC who helps users swap Flow tokens for FROTH tokens
 */
export class CorralScene extends VisualNovelScene {
  constructor() {
    // Pass the Phaser scene key to parent constructor
    super({ key: 'CorralScene' });
    
    // Store visual novel configuration for later use
    const config: VisualNovelConfig = {
      id: 'corral',
      title: 'Flow Trading Corral',
      background: {
        gradient: 'bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100',
        pattern: 'bg-[radial-gradient(circle_at_25%_25%,_rgba(251,191,36,0.1)_0%,_transparent_50%)]'
      },
      character: {
        name: 'Rusty',
        role: 'Flow Token Trader',
        portrait: '🤠',
        dialogue: [
          "Well howdy there, partner! Welcome to the finest trading post in all of DeFi Valley!",
          "I've been trading Flow tokens for FROTH longer than anyone in these parts. Got the best rates you'll find anywhere!",
          "FROTH is mighty useful around here - you can use it to mint FVIX tokens over at the Ancient Well.",
          "Just connect your wallet, make sure you're on the Flow network, and I'll get you set up with some FROTH tokens faster than you can say 'yeehaw'!"
        ],
        currentDialogueIndex: 0
      },
      defiOperations: [
        {
          operation: 'swap',
          description: 'Swap FLOW tokens for FROTH tokens',
          hook: 'useSwapFlow'
        }
      ]
    };

    // Store config for scene setup in create() method
    (this as any).novelConfig = config;
  }

  /**
   * Create the Corral scene - Phaser lifecycle method
   */
  create(): void {
    console.log('🤠 Creating Corral Scene...');
    
    // Call parent create method for basic setup
    super.create();
    
    // Get our stored config
    const config = (this as any).novelConfig;
    
    // Set background with western theme color
    this.setBackground(undefined, 0xD2691E); // Saddle brown
    
    // Add character portrait (placeholder for now)
    this.setCharacterPortrait('trader', {
      key: 'trader_portrait', // This will fallback to placeholder
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
    
    // Add trading UI placeholder
    this.createTradingInterface();
    
    console.log('✅ Corral Scene created');
  }

  /**
   * Create trading interface for FLOW → FROTH swaps
   */
  private createTradingInterface(): void {
    // Create trading panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x654321, 0.9);
    panelBg.fillRoundedRect(0, 0, 300, 200, 12);
    panelBg.lineStyle(3, 0xD2691E, 1);
    panelBg.strokeRoundedRect(0, 0, 300, 200, 12);
    
    // Trading panel title
    const titleText = this.add.text(150, 30, '🤠 Token Trading', {
      fontSize: '20px',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Trading info
    const infoText = this.add.text(150, 70, 'FLOW → FROTH\nExchange Rate: 1:1000\nReady to trade?', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    
    // Trade button
    const tradeButtonBg = this.add.graphics();
    tradeButtonBg.fillStyle(0xFFD700, 1);
    tradeButtonBg.fillRoundedRect(0, 0, 100, 35, 8);
    
    const tradeButtonText = this.add.text(50, 17.5, 'Trade Now', {
      fontSize: '14px',
      color: '#654321',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const tradeButton = this.add.container(100, 140);
    tradeButton.add([tradeButtonBg, tradeButtonText]);
    tradeButton.setSize(100, 35);
    tradeButton.setInteractive();
    
    // Trading panel container
    const tradingPanel = this.add.container(50, this.scale.height - 250);
    tradingPanel.add([panelBg, titleText, infoText, tradeButton]);
    tradingPanel.setDepth(150);
    
    // Trade button functionality
    tradeButton.on('pointerdown', () => {
      console.log('🔄 Trade button clicked - executing swap');
      this.executeSwap('10'); // Default to 10 FLOW for demo
    });
    
    console.log('💰 Trading interface created');
  }

  /**
   * Execute FLOW → FROTH swap operation
   */
  public executeSwap(amount: string): void {
    // This would integrate with useSwapFlow hook
    console.log(`🔄 Executing FLOW → FROTH swap for ${amount} tokens`);
    
    // For now, show success message and advance dialogue
    this.showMessage(`Trading ${amount} FLOW for FROTH tokens...`);
    this.advanceDialogue();
  }
  
  /**
   * Show trading message to user
   */
  private showMessage(message: string): void {
    console.log(`💬 ${message}`);
    // Could show a toast notification or update dialogue
  }

  /**
   * Get swap requirements and info
   */
  public getSwapInfo(): { minAmount: string; fee: string; rate: string } {
    return {
      minAmount: '1',
      fee: '0.3%',
      rate: '1 FLOW = 1000 FROTH'
    };
  }

  /**
   * Check if user can perform swap
   */
  public canSwap(userBalance: string, swapAmount: string): boolean {
    const balance = parseFloat(userBalance);
    const amount = parseFloat(swapAmount);
    return balance >= amount && amount >= 1;
  }
}