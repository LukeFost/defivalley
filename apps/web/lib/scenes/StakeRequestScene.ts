import { VisualNovelScene } from './VisualNovelScene';
import { SceneData } from './VisualNovelScene';

/**
 * StakeRequestScene - A scene where an NPC asks the player to stake in their business
 * 
 * This scene demonstrates the dialogue-triggered staking modal system:
 * 1. NPC displays: "I want to stake in your business please"
 * 2. Player can choose to accept or decline
 * 3. If accepted, opens the StakeModal for token input and staking
 */
export class StakeRequestScene extends VisualNovelScene {
  private currentDialogueStep: number = 0;
  private hasOfferedStake: boolean = false;
  private playerAcceptedStake: boolean = false;

  constructor() {
    super({ key: 'StakeRequestScene' });
  }

  /**
   * Create the scene with NPC and dialogue
   */
  create(): void {
    super.create();

    // Set a business-themed background color (dark blue/purple)
    this.backgroundPlaceholderColor = 0x2C3E50;
    this.setBackground(undefined, this.backgroundPlaceholderColor);

    // Add NPC character portrait (if available)
    // This would use an actual NPC sprite if you have one
    this.setCharacterPortrait('businessNPC', {
      key: 'npc-businessman', // Replace with actual texture key
      x: this.scale.width * 0.2,
      y: this.scale.height * 0.4,
      scale: 0.8
    });

    // Start the dialogue sequence
    this.startDialogueSequence();

    // Set up click handler for dialogue progression
    this.input.on('pointerdown', this.handleDialogueClick, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleDialogueClick, this);
    this.input.keyboard?.on('keydown-ENTER', this.handleDialogueClick, this);
  }

  /**
   * Start the dialogue sequence
   */
  private startDialogueSequence(): void {
    this.showNextDialogue();
  }

  /**
   * Handle dialogue click/key press to advance dialogue
   */
  private handleDialogueClick(): void {
    if (this.currentDialogueStep < this.getDialogueSteps().length - 1) {
      this.currentDialogueStep++;
      this.showNextDialogue();
    } else if (this.hasOfferedStake && !this.playerAcceptedStake) {
      // Show choice buttons
      this.showStakeChoiceButtons();
    }
  }

  /**
   * Show the next dialogue step
   */
  private showNextDialogue(): void {
    const dialogueSteps = this.getDialogueSteps();
    const currentDialogue = dialogueSteps[this.currentDialogueStep];

    if (currentDialogue) {
      this.showDialogue(currentDialogue);
    }
  }

  /**
   * Get all dialogue steps
   */
  private getDialogueSteps() {
    return [
      {
        text: "Welcome, traveler! I've been waiting for someone like you.",
        speaker: "Business Owner",
        backgroundColor: 0x2C3E50,
        textColor: '#FFFFFF'
      },
      {
        text: "I have a growing business here in DeFi Valley, and I'm looking for investors.",
        speaker: "Business Owner",
        backgroundColor: 0x2C3E50,
        textColor: '#FFFFFF'
      },
      {
        text: "I want to stake in your business please. Would you be interested in staking your FVIX tokens with me?",
        speaker: "Business Owner",
        backgroundColor: 0x34495E,
        textColor: '#F8F9FA'
      },
      {
        text: "Your tokens will earn rewards while helping my business grow. What do you say?",
        speaker: "Business Owner",
        backgroundColor: 0x2C3E50,
        textColor: '#FFFFFF'
      }
    ];
  }

  /**
   * Show choice buttons for staking decision
   */
  private showStakeChoiceButtons(): void {
    this.hasOfferedStake = true;

    // Create accept button
    const acceptButton = this.createChoiceButton(
      'Accept Stake Offer',
      this.scale.width * 0.3,
      this.scale.height * 0.75,
      0x27AE60,
      () => this.acceptStakeOffer()
    );

    // Create decline button
    const declineButton = this.createChoiceButton(
      'Decline',
      this.scale.width * 0.7,
      this.scale.height * 0.75,
      0xE74C3C,
      () => this.declineStakeOffer()
    );

    console.log('💬 Stake choice buttons created');
  }

  /**
   * Create a choice button
   */
  private createChoiceButton(
    text: string,
    x: number,
    y: number,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    // Create button background
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(color, 0.8);
    buttonBg.fillRoundedRect(0, 0, 200, 50, 10);
    buttonBg.lineStyle(2, 0xFFFFFF, 1);
    buttonBg.strokeRoundedRect(0, 0, 200, 50, 10);

    // Create button text
    const buttonText = this.add.text(100, 25, text, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create button container
    const button = this.add.container(x - 100, y - 25);
    button.add([buttonBg, buttonText]);
    button.setSize(200, 50);
    button.setInteractive();
    button.setDepth(150);

    // Add hover effects
    button.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(color, 1);
      buttonBg.fillRoundedRect(0, 0, 200, 50, 10);
      buttonBg.lineStyle(2, 0xFFFFFF, 1);
      buttonBg.strokeRoundedRect(0, 0, 200, 50, 10);
      buttonText.setColor('#FFFFFF');
    });

    button.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(color, 0.8);
      buttonBg.fillRoundedRect(0, 0, 200, 50, 10);
      buttonBg.lineStyle(2, 0xFFFFFF, 1);
      buttonBg.strokeRoundedRect(0, 0, 200, 50, 10);
      buttonText.setColor('#FFFFFF');
    });

    // Add click handler
    button.on('pointerdown', onClick);

    return button;
  }

  /**
   * Handle accepting the stake offer
   */
  private acceptStakeOffer(): void {
    this.playerAcceptedStake = true;
    
    // Show acceptance dialogue
    this.showDialogue({
      text: "Excellent! Let me open the staking interface for you.",
      speaker: "Business Owner",
      backgroundColor: 0x27AE60,
      textColor: '#FFFFFF'
    });

    // Trigger the stake modal after a short delay
    this.time.delayedCall(2000, () => {
      this.openStakeModal();
    });

    console.log('✅ Player accepted stake offer - opening modal');
  }

  /**
   * Handle declining the stake offer
   */
  private declineStakeOffer(): void {
    // Show decline dialogue
    this.showDialogue({
      text: "I understand. Perhaps another time when you're ready to invest.",
      speaker: "Business Owner",
      backgroundColor: 0xE74C3C,
      textColor: '#FFFFFF'
    });

    // Return to previous scene after delay
    this.time.delayedCall(3000, () => {
      this.returnToPreviousScene();
    });

    console.log('❌ Player declined stake offer');
  }

  /**
   * Open the stake modal
   * This connects to the existing StakeModal component via the UI store
   */
  private openStakeModal(): void {
    // Access the game's UI store to trigger the stake modal
    // This assumes the game has a way to access the React UI store from Phaser
    // You may need to adapt this based on your exact setup
    
    // Option 1: Use a custom event system
    this.game.events.emit('openStakeModal');
    
    // Option 2: Use a global reference (if available)
    // (window as any).gameUIStore?.showStakeModal();
    
    // Option 3: Use a callback passed to the scene
    const openModalCallback = this.getSceneData('openStakeModalCallback');
    if (openModalCallback && typeof openModalCallback === 'function') {
      openModalCallback();
    }

    console.log('🎯 Stake modal opening requested');
    
    // Hide dialogue while modal is open
    this.hideDialogue();
  }

  /**
   * Initialize scene with callback for opening modal
   */
  init(data: SceneData): void {
    super.init(data);
    
    // Store the callback for opening the stake modal
    // This should be passed from the parent scene/component
    if (data.openStakeModalCallback) {
      this.setSceneData('openStakeModalCallback', data.openStakeModalCallback);
    }
  }

  /**
   * Clean up scene resources
   */
  destroy(): void {
    // Remove event listeners
    this.input.off('pointerdown', this.handleDialogueClick, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleDialogueClick, this);
    this.input.keyboard?.off('keydown-ENTER', this.handleDialogueClick, this);
    
    super.destroy();
  }
}