import { VisualNovelScene, DialogueConfig, DialogueChoice } from './VisualNovelScene';

/**
 * InteractiveStakeScene - A visual novel scene for interactive staking dialogue
 * 
 * This scene demonstrates a branching conversation where an NPC offers staking
 * opportunities and the player can choose different dialogue paths, including
 * a direct path to open the staking modal.
 */
export class InteractiveStakeScene extends VisualNovelScene {
  constructor() {
    super({ key: 'InteractiveStakeScene' });
  }

  create() {
    super.create();
    
    // Set a dark blue background for the scene
    this.setBackground(undefined, 0x2C3E50);
    
    // Start the conversation immediately
    this.startConversation();
  }

  /**
   * Start the initial conversation with the NPC
   */
  private startConversation(): void {
    const initialDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "Welcome, traveler! I've heard great things about your farm. I have a proposition for you...",
      choices: [
        {
          text: 'What is it?',
          action: () => this.handleOffer(),
        },
        {
          text: 'I\'m busy right now.',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(initialDialogue);
  }

  /**
   * Handle the player asking about the offer
   */
  private handleOffer(): void {
    const offerDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "I want to stake in your business! Your FVIX tokens can help my venture grow, and you'll earn rewards in return. What do you say?",
      choices: [
        {
          text: 'I just want to stake now.',
          action: () => this.handleStakeNow(),
        },
        {
          text: 'Tell me more about the risks.',
          action: () => this.handleRisks(),
        },
        {
          text: 'What are the rewards?',
          action: () => this.handleRewards(),
        },
        {
          text: 'No, thank you.',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(offerDialogue);
  }

  /**
   * Handle the player choosing to stake immediately
   */
  private handleStakeNow(): void {
    const acceptDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "Excellent! Let's get you set up. The staking interface will now open.",
    };
    
    this.showDialogue(acceptDialogue);

    // Wait a moment for the dialogue to be read, then emit the event
    this.time.delayedCall(2000, () => {
      // Emit an event for the React component to listen to
      this.game.events.emit('openStakeModal');
    });
  }

  /**
   * Handle the player asking about risks
   */
  private handleRisks(): void {
    const risksDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "Of course, every venture has risks. The value of rewards can fluctuate with market conditions. But I believe the potential is immense! Are you ready to proceed?",
      choices: [
        {
          text: 'Yes, let\'s stake now.',
          action: () => this.handleStakeNow(),
        },
        {
          text: 'Tell me about rewards first.',
          action: () => this.handleRewards(),
        },
        {
          text: 'I need more time to think.',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(risksDialogue);
  }

  /**
   * Handle the player asking about rewards
   */
  private handleRewards(): void {
    const rewardsDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "Ah, the rewards! You'll earn FVIX tokens based on your staking amount and duration. The longer you stake, the better the multiplier. Ready to start earning?",
      choices: [
        {
          text: 'Perfect! Let\'s stake now.',
          action: () => this.handleStakeNow(),
        },
        {
          text: 'What about the risks?',
          action: () => this.handleRisks(),
        },
        {
          text: 'I\'ll think about it.',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(rewardsDialogue);
  }
  
  /**
   * Handle the player declining the offer
   */
  private handleDecline(): void {
    const declineDialogue: DialogueConfig = {
      speaker: 'Eager Businessman',
      text: "I understand. The offer stands if you change your mind. Good luck with your farm!",
    };
    
    this.showDialogue(declineDialogue);

    // Close the scene after a delay
    this.time.delayedCall(3000, () => {
      this.game.events.emit('closeInteractiveDialogue');
    });
  }
}