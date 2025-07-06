import { VisualNovelScene, DialogueConfig } from './VisualNovelScene';

export interface BuildingDialogueConfig {
  npcName: string;
  greeting: string;
  backgroundColorHex: number;
  actionChoiceText: string;
  infoChoiceText?: string;
  infoDialogue?: string;
  onAction: () => void;
}

/**
 * This is the EXACT working dialogue scene from the demo
 * Just renamed for building use
 */
export class BuildingDialogueScene extends VisualNovelScene {
  private config: BuildingDialogueConfig;

  constructor(config: BuildingDialogueConfig) {
    super({ key: 'BuildingDialogueScene' });
    this.config = config;
  }

  create() {
    super.create();
    this.setBackground(undefined, this.config.backgroundColorHex);
    this.startConversation();
  }

  private startConversation(): void {
    const initialDialogue: DialogueConfig = {
      speaker: this.config.npcName,
      text: this.config.greeting,
      choices: [
        {
          text: this.config.actionChoiceText,
          action: () => this.handleAction(),
        },
        {
          text: this.config.infoChoiceText || 'Tell me more',
          action: () => this.handleInfo(),
        },
        {
          text: 'Leave',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(initialDialogue);
  }

  private handleAction(): void {
    const acceptDialogue: DialogueConfig = {
      speaker: this.config.npcName,
      text: "Excellent! Let's get you set up.",
    };
    
    this.showDialogue(acceptDialogue);

    this.time.delayedCall(2000, () => {
      this.game.events.emit('triggerAction');
    });
  }

  private handleInfo(): void {
    const infoDialogue: DialogueConfig = {
      speaker: this.config.npcName,
      text: this.config.infoDialogue || "Let me explain the process...",
      choices: [
        {
          text: this.config.actionChoiceText,
          action: () => this.handleAction(),
        },
        {
          text: 'I need more time',
          action: () => this.handleDecline(),
        },
      ],
    };
    
    this.showDialogue(infoDialogue);
  }
  
  private handleDecline(): void {
    const declineDialogue: DialogueConfig = {
      speaker: this.config.npcName,
      text: "No problem! Come back anytime.",
    };
    
    this.showDialogue(declineDialogue);

    this.time.delayedCall(2000, () => {
      this.game.events.emit('closeDialogue');
    });
  }
}