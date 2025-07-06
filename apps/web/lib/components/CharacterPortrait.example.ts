/**
 * Example usage of CharacterPortrait component
 * 
 * This file demonstrates how to use the CharacterPortrait component
 * in various scenarios within a Phaser 3 game scene.
 */

import { CharacterPortrait, CharacterPortraitData, DEFAULT_PORTRAIT_CONFIG } from './CharacterPortrait';

/**
 * Example scene demonstrating CharacterPortrait usage
 */
export class DialogueScene extends Phaser.Scene {
  private currentPortrait?: CharacterPortrait;
  private portraits: Map<string, CharacterPortrait> = new Map();

  constructor() {
    super({ key: 'DialogueScene' });
  }

  create() {
    // Example 1: Create a portrait using existing character from character.config.ts
    this.createCowboyPortrait();
    
    // Example 2: Create a portrait using custom portrait image
    this.createCustomPortrait();
    
    // Example 3: Create a placeholder portrait
    this.createPlaceholderPortrait();
    
    // Example 4: NPC dialogue system
    this.setupNPCDialogue();
    
    // Example 5: Show portrait with animation
    this.demonstrateAnimations();
  }

  /**
   * Example 1: Using existing character from character.config.ts
   */
  private createCowboyPortrait(): void {
    const cowboyData: CharacterPortraitData = {
      character: 'cowboy',
      name: 'Sheriff McGraw',
      title: 'Town Sheriff',
      portraitScale: 2.5, // Larger scale for portrait view
    };

    const portrait = new CharacterPortrait(this, cowboyData, {
      width: 250,
      height: 300,
      rightOffset: 50,
      topOffset: 50,
      enableAnimations: true,
      animationDuration: 600,
    });

    this.portraits.set('sheriff', portrait);
  }

  /**
   * Example 2: Using custom portrait image
   */
  private createCustomPortrait(): void {
    // Assume you have loaded a custom portrait texture
    // this.load.image('merchant_portrait', 'path/to/merchant_portrait.png');
    
    const merchantData: CharacterPortraitData = {
      name: 'Trader Bob',
      title: 'Traveling Merchant',
      portraitKey: 'merchant_portrait',
      portraitScale: 1.0,
    };

    const portrait = new CharacterPortrait(this, merchantData, {
      width: 200,
      height: 250,
      rightOffset: 300, // Different position
      topOffset: 100,
    });

    this.portraits.set('merchant', portrait);
  }

  /**
   * Example 3: Creating a placeholder portrait
   */
  private createPlaceholderPortrait(): void {
    const mysteriousData: CharacterPortraitData = {
      name: 'Mysterious Stranger',
      title: '???',
      backgroundColor: '#2c3e50',
      textColor: '#ecf0f1',
    };

    const portrait = new CharacterPortrait(this, mysteriousData, {
      width: 200,
      height: 250,
      rightOffset: 50,
      topOffset: 400,
    });

    this.portraits.set('mysterious', portrait);
  }

  /**
   * Example 4: NPC dialogue system with portrait switching
   */
  private setupNPCDialogue(): void {
    // Create input handler for testing
    this.input.keyboard?.on('keydown-SPACE', async () => {
      await this.showNPCDialogue('sheriff', 'Howdy there, partner! Welcome to our little town.');
    });

    this.input.keyboard?.on('keydown-ENTER', async () => {
      await this.showNPCDialogue('merchant', 'Got some fine goods for sale, if you\'re interested!');
    });

    this.input.keyboard?.on('keydown-ESC', async () => {
      await this.hideCurrentPortrait();
    });
  }

  /**
   * Show NPC dialogue with portrait
   */
  private async showNPCDialogue(npcKey: string, dialogueText: string): Promise<void> {
    // Hide current portrait if any
    if (this.currentPortrait) {
      await this.currentPortrait.hide();
    }

    // Show new portrait
    const portrait = this.portraits.get(npcKey);
    if (portrait) {
      this.currentPortrait = portrait;
      await portrait.show();
      portrait.animate('bounce');
      
      // Here you would typically show dialogue text UI
      console.log(`${portrait.getPortraitData().name}: ${dialogueText}`);
    }
  }

  /**
   * Hide current portrait
   */
  private async hideCurrentPortrait(): Promise<void> {
    if (this.currentPortrait) {
      await this.currentPortrait.hide();
      this.currentPortrait = undefined;
    }
  }

  /**
   * Example 5: Demonstrate various animations
   */
  private demonstrateAnimations(): void {
    // Animate portraits every 3 seconds
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        const portraitKeys = Array.from(this.portraits.keys());
        const randomKey = portraitKeys[Math.floor(Math.random() * portraitKeys.length)];
        const portrait = this.portraits.get(randomKey);
        
        if (portrait?.getIsVisible()) {
          const animations = ['bounce', 'pulse', 'shake'] as const;
          const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
          portrait.animate(randomAnimation);
        }
      }
    });
  }

  /**
   * Example 6: Dynamic portrait updates
   */
  private async updatePortraitExample(): Promise<void> {
    const portrait = this.portraits.get('sheriff');
    if (portrait) {
      // Update the portrait with new data
      portrait.updatePortrait({
        name: 'Sheriff McGraw Jr.',
        title: 'Deputy Sheriff',
        portraitScale: 3.0,
      });
      
      // Show updated portrait
      await portrait.show();
    }
  }

  /**
   * Example 7: Responsive positioning
   */
  private handleResize(): void {
    // Update all portrait positions when screen size changes
    this.portraits.forEach(portrait => {
      portrait.updatePosition();
    });
  }

  /**
   * Clean up portraits when scene ends
   */
  destroy(): void {
    this.portraits.forEach(portrait => {
      portrait.destroy();
    });
    this.portraits.clear();
    super.destroy();
  }
}

/**
 * Example usage in a game scene
 */
export class GameSceneWithPortraits extends Phaser.Scene {
  private npcPortrait?: CharacterPortrait;

  constructor() {
    super({ key: 'GameSceneWithPortraits' });
  }

  create() {
    // Create an NPC portrait that can be shown during interactions
    this.setupNPCPortrait();
    
    // Example interaction - when player approaches NPC
    this.input.on('pointerdown', async (pointer: Phaser.Input.Pointer) => {
      // Check if click is near NPC position (example)
      const npcX = 400;
      const npcY = 300;
      const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, npcX, npcY);
      
      if (distance < 50) {
        await this.startNPCConversation();
      }
    });
  }

  private setupNPCPortrait(): void {
    const npcData: CharacterPortraitData = {
      character: 'cowboy',
      name: 'Old MacDonald',
      title: 'Farm Owner',
      portraitScale: 2.0,
    };

    this.npcPortrait = new CharacterPortrait(this, npcData, {
      ...DEFAULT_PORTRAIT_CONFIG,
      rightOffset: 80,
      topOffset: 120,
    });
  }

  private async startNPCConversation(): Promise<void> {
    if (this.npcPortrait) {
      await this.npcPortrait.show();
      this.npcPortrait.animate('bounce');
      
      // Here you would integrate with your dialogue system
      console.log('NPC conversation started!');
      
      // Example: hide portrait after 5 seconds
      this.time.delayedCall(5000, async () => {
        await this.npcPortrait?.hide();
      });
    }
  }
}

/**
 * Preload assets for portraits
 */
export class PreloadScene extends Phaser.Scene {
  preload() {
    // Load custom portrait images
    this.load.image('merchant_portrait', 'assets/portraits/merchant.png');
    this.load.image('blacksmith_portrait', 'assets/portraits/blacksmith.png');
    this.load.image('wizard_portrait', 'assets/portraits/wizard.png');
    
    // Load portrait atlas if using atlas-based portraits
    this.load.atlas('npc_portraits', 'assets/portraits/npc_portraits.png', 'assets/portraits/npc_portraits.json');
  }
}

/**
 * Usage with different portrait configurations
 */
export const PORTRAIT_CONFIGS = {
  // Small portrait for quick interactions
  small: {
    width: 150,
    height: 180,
    rightOffset: 30,
    topOffset: 50,
    showTitle: false,
    animationDuration: 300,
  },
  
  // Large portrait for important dialogues
  large: {
    width: 300,
    height: 400,
    rightOffset: 100,
    topOffset: 50,
    animationDuration: 800,
  },
  
  // Left-side portrait (for dual character conversations)
  leftSide: {
    width: 200,
    height: 250,
    rightOffset: -200, // Negative offset to place on left
    topOffset: 100,
  },
};

/**
 * Example NPC data configurations
 */
export const NPC_PORTRAITS: Record<string, CharacterPortraitData> = {
  sheriff: {
    character: 'cowboy',
    name: 'Sheriff McGraw',
    title: 'Town Sheriff',
    portraitScale: 2.5,
  },
  
  merchant: {
    name: 'Trader Bob',
    title: 'Traveling Merchant',
    portraitKey: 'merchant_portrait',
    portraitScale: 1.0,
  },
  
  blacksmith: {
    name: 'Iron Joe',
    title: 'Village Blacksmith',
    portraitKey: 'blacksmith_portrait',
    portraitScale: 1.2,
  },
  
  wizard: {
    name: 'Sage Aldric',
    title: 'Court Wizard',
    portraitKey: 'wizard_portrait',
    portraitScale: 1.0,
  },
  
  mysterious: {
    name: 'Hooded Figure',
    title: '???',
    backgroundColor: '#1a1a1a',
    textColor: '#ff6b6b',
  },
};