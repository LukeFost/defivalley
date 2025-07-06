import { ReactNode } from 'react';
import { VisualNovelScene, VisualNovelConfig } from './VisualNovelScene';

/**
 * OrchardScene - Sacred grove for FVIX → sFVIX staking
 * Features a gardener NPC who helps users stake FVIX tokens to earn yield
 */
export class OrchardScene extends VisualNovelScene {
  constructor() {
    // Pass the Phaser scene key to parent constructor
    super({ key: 'OrchardScene' });
    
    // Store visual novel configuration for later use
    const config: VisualNovelConfig = {
      id: 'orchard',
      title: 'Sacred FVIX Orchard',
      background: {
        gradient: 'bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100',
        pattern: 'bg-[radial-gradient(circle_at_75%_25%,_rgba(34,197,94,0.1)_0%,_transparent_50%)]'
      },
      character: {
        name: 'Sage',
        role: 'Sacred Grove Gardener',
        portrait: '🧝‍♂️',
        dialogue: [
          "Welcome to the Sacred Orchard, dear traveler. I sense you seek the ancient wisdom of yield farming.",
          "Here in this enchanted grove, your FVIX tokens can take root and flourish into something greater.",
          "By staking your FVIX in our sacred vault, they transform into sFVIX - special tokens that grow with time.",
          "Your sFVIX will earn you yield rewards continuously, like fruit ripening on the branch. The longer you stake, the more bountiful your harvest!",
          "Are you ready to plant your FVIX and watch it bloom into prosperity?"
        ],
        currentDialogueIndex: 0
      },
      defiOperations: [
        {
          operation: 'stake',
          description: 'Stake FVIX tokens to earn sFVIX and yield rewards',
          hook: 'useStakeFVIX'
        }
      ]
    };

    // Store config for scene setup in create() method
    (this as any).novelConfig = config;
  }

  /**
   * Create the Orchard scene - Phaser lifecycle method
   */
  create(): void {
    console.log('🧝‍♂️ Creating Orchard Scene...');
    
    // Call parent create method for basic setup
    super.create();
    
    // Get our stored config
    const config = (this as any).novelConfig;
    
    // Set background with forest theme color
    this.setBackground(undefined, 0x228B22); // Forest green
    
    // Add character portrait (placeholder for now)
    this.setCharacterPortrait('gardener', {
      key: 'gardener_portrait', // This will fallback to placeholder
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
    
    // Add staking UI placeholder
    this.createStakingInterface();
    
    console.log('✅ Orchard Scene created');
  }

  /**
   * Create staking interface for FVIX → sFVIX staking
   */
  private createStakingInterface(): void {
    // Create staking panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x006400, 0.9);
    panelBg.fillRoundedRect(0, 0, 300, 200, 12);
    panelBg.lineStyle(3, 0x32CD32, 1);
    panelBg.strokeRoundedRect(0, 0, 300, 200, 12);
    
    // Staking panel title
    const titleText = this.add.text(150, 30, '🧝‍♂️ Token Staking', {
      fontSize: '20px',
      color: '#90EE90',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Staking info
    const infoText = this.add.text(150, 70, 'FVIX → sFVIX\nAPY: 8.5%\nEarn yield rewards!', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    
    // Stake button
    const stakeButtonBg = this.add.graphics();
    stakeButtonBg.fillStyle(0x90EE90, 1);
    stakeButtonBg.fillRoundedRect(0, 0, 100, 35, 8);
    
    const stakeButtonText = this.add.text(50, 17.5, 'Stake Now', {
      fontSize: '14px',
      color: '#006400',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const stakeButton = this.add.container(100, 140);
    stakeButton.add([stakeButtonBg, stakeButtonText]);
    stakeButton.setSize(100, 35);
    stakeButton.setInteractive();
    
    // Staking panel container
    const stakingPanel = this.add.container(50, this.scale.height - 250);
    stakingPanel.add([panelBg, titleText, infoText, stakeButton]);
    stakingPanel.setDepth(150);
    
    // Stake button functionality
    stakeButton.on('pointerdown', () => {
      console.log('🌱 Stake button clicked - would open staking interface');
      // Here we would integrate with useStakeFVIX hook
    });
    
    console.log('🌱 Staking interface created');
  }

  /**
   * Execute FVIX → sFVIX staking operation
   */
  public executeStake(amount: string): void {
    // This would integrate with useStakeFVIX hook
    console.log(`Executing FVIX staking for ${amount} tokens`);
    this.executeAction();
  }

  /**
   * Get staking benefits and info
   */
  public getStakingInfo(): { 
    minAmount: string; 
    apy: string; 
    lockPeriod: string;
    benefits: string[];
  } {
    return {
      minAmount: '100',
      apy: '8-12%',
      lockPeriod: 'None (unstake anytime)',
      benefits: [
        'Earn continuous yield rewards',
        'sFVIX represents your staked position',
        'Claim rewards without unstaking',
        'Participate in governance decisions'
      ]
    };
  }

  /**
   * Check if user can perform staking
   */
  public canStake(userBalance: string, stakeAmount: string): boolean {
    const balance = parseFloat(userBalance);
    const amount = parseFloat(stakeAmount);
    return balance >= amount && amount >= 100;
  }

  /**
   * Calculate expected rewards
   */
  public calculateRewards(amount: string, days: number): string {
    const principal = parseFloat(amount);
    const dailyRate = 0.10 / 365; // 10% APY
    const rewards = principal * dailyRate * days;
    return rewards.toFixed(4);
  }
}