import Phaser from 'phaser';

export interface DialogueConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  borderColor?: number;
  borderWidth?: number;
  textColor?: string;
  nameColor?: string;
  fontSize?: number;
  fontFamily?: string;
  typewriterSpeed?: number;
  continuePrompt?: string;
}

export interface DialogueData {
  characterName?: string;
  text: string;
  type?: 'normal' | 'system' | 'thought' | 'narration';
  autoAdvance?: boolean;
  speed?: number;
}

export class DialogueBox extends Phaser.GameObjects.Container {
  private config: Required<DialogueConfig>;
  private background: Phaser.GameObjects.Graphics;
  private nameBox: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private continueIcon: Phaser.GameObjects.Text;
  private typewriterTween?: Phaser.Tweens.Tween;
  private currentDialogue: DialogueData | null = null;
  private isTyping = false;
  private isVisible = false;
  private onCompleteCallback?: () => void;
  private onSkipCallback?: () => void;

  constructor(scene: Phaser.Scene, config: DialogueConfig = {}) {
    super(scene, 0, 0);
    
    // Set default configuration
    this.config = {
      x: config.x ?? 0,
      y: config.y ?? scene.cameras.main.height - 200,
      width: config.width ?? scene.cameras.main.width - 100,
      height: config.height ?? 150,
      padding: config.padding ?? 20,
      backgroundColor: config.backgroundColor ?? 0x000000,
      backgroundAlpha: config.backgroundAlpha ?? 0.85,
      borderColor: config.borderColor ?? 0xffffff,
      borderWidth: config.borderWidth ?? 2,
      textColor: config.textColor ?? '#ffffff',
      nameColor: config.nameColor ?? '#ffdd44',
      fontSize: config.fontSize ?? 18,
      fontFamily: config.fontFamily ?? 'Arial',
      typewriterSpeed: config.typewriterSpeed ?? 30,
      continuePrompt: config.continuePrompt ?? '▼'
    };

    this.createComponents();
    this.setupInteraction();
    this.hide();
    
    scene.add.existing(this);
  }

  private createComponents(): void {
    // Main dialogue background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
    this.background.lineStyle(this.config.borderWidth, this.config.borderColor, 1);
    this.background.fillRoundedRect(
      this.config.x,
      this.config.y,
      this.config.width,
      this.config.height,
      8
    );
    this.background.strokeRoundedRect(
      this.config.x,
      this.config.y,
      this.config.width,
      this.config.height,
      8
    );
    this.add(this.background);

    // Character name box
    this.nameBox = this.scene.add.graphics();
    this.nameBox.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
    this.nameBox.lineStyle(this.config.borderWidth, this.config.borderColor, 1);
    this.add(this.nameBox);

    // Character name text
    this.nameText = this.scene.add.text(
      this.config.x + this.config.padding,
      this.config.y - 30,
      '',
      {
        fontSize: `${this.config.fontSize}px`,
        fontFamily: this.config.fontFamily,
        color: this.config.nameColor,
        fontStyle: 'bold'
      }
    );
    this.add(this.nameText);

    // Main dialogue text
    this.dialogueText = this.scene.add.text(
      this.config.x + this.config.padding,
      this.config.y + this.config.padding,
      '',
      {
        fontSize: `${this.config.fontSize}px`,
        fontFamily: this.config.fontFamily,
        color: this.config.textColor,
        wordWrap: {
          width: this.config.width - (this.config.padding * 2),
          useAdvancedWrap: true
        },
        lineSpacing: 4
      }
    );
    this.add(this.dialogueText);

    // Continue prompt icon
    this.continueIcon = this.scene.add.text(
      this.config.x + this.config.width - 30,
      this.config.y + this.config.height - 30,
      this.config.continuePrompt,
      {
        fontSize: '20px',
        fontFamily: this.config.fontFamily,
        color: this.config.textColor
      }
    );
    this.continueIcon.setAlpha(0);
    this.add(this.continueIcon);
  }

  private setupInteraction(): void {
    // Make the dialogue box interactive
    this.background.setInteractive(
      new Phaser.Geom.Rectangle(
        this.config.x,
        this.config.y,
        this.config.width,
        this.config.height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // Handle clicks and key presses
    this.background.on('pointerdown', () => this.handleContinue());
    
    this.scene.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isVisible) this.handleContinue();
    });

    this.scene.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isVisible) this.handleContinue();
    });
  }

  private handleContinue(): void {
    if (!this.isVisible) return;

    if (this.isTyping) {
      // Skip typing animation and show full text
      this.skipTypewriter();
      if (this.onSkipCallback) this.onSkipCallback();
    } else {
      // Continue to next dialogue or close
      if (this.onCompleteCallback) this.onCompleteCallback();
    }
  }

  private skipTypewriter(): void {
    if (this.typewriterTween) {
      this.typewriterTween.remove();
      this.typewriterTween = undefined;
    }
    
    if (this.currentDialogue) {
      this.dialogueText.setText(this.currentDialogue.text);
      this.isTyping = false;
      this.showContinuePrompt();
    }
  }

  private showContinuePrompt(): void {
    // Animate continue prompt
    this.continueIcon.setAlpha(0);
    this.scene.tweens.add({
      targets: this.continueIcon,
      alpha: 1,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  private hideContinuePrompt(): void {
    this.scene.tweens.killTweensOf(this.continueIcon);
    this.continueIcon.setAlpha(0);
  }

  public showDialogue(
    dialogue: DialogueData,
    onComplete?: () => void,
    onSkip?: () => void
  ): void {
    this.currentDialogue = dialogue;
    this.onCompleteCallback = onComplete;
    this.onSkipCallback = onSkip;

    // Update character name
    if (dialogue.characterName) {
      this.nameText.setText(dialogue.characterName);
      this.updateNameBox();
      this.nameText.setVisible(true);
      this.nameBox.setVisible(true);
    } else {
      this.nameText.setVisible(false);
      this.nameBox.setVisible(false);
    }

    // Apply dialogue type styling
    this.applyDialogueTypeStyle(dialogue.type || 'normal');

    // Show the dialogue box
    this.show();

    // Start typewriter effect
    this.startTypewriter(dialogue.text, dialogue.speed || this.config.typewriterSpeed);
  }

  private updateNameBox(): void {
    if (!this.nameText.text) return;

    const nameWidth = this.nameText.width + 20;
    const nameHeight = this.nameText.height + 10;

    this.nameBox.clear();
    this.nameBox.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
    this.nameBox.lineStyle(this.config.borderWidth, this.config.borderColor, 1);
    this.nameBox.fillRoundedRect(
      this.config.x + this.config.padding - 10,
      this.config.y - 35,
      nameWidth,
      nameHeight,
      6
    );
    this.nameBox.strokeRoundedRect(
      this.config.x + this.config.padding - 10,
      this.config.y - 35,
      nameWidth,
      nameHeight,
      6
    );
  }

  private applyDialogueTypeStyle(type: string): void {
    switch (type) {
      case 'system':
        this.dialogueText.setColor('#88ff88');
        this.nameText.setColor('#88ff88');
        break;
      case 'thought':
        this.dialogueText.setColor('#aaaaff');
        this.dialogueText.setFontStyle('italic');
        break;
      case 'narration':
        this.dialogueText.setColor('#ffaa88');
        break;
      default:
        this.dialogueText.setColor(this.config.textColor);
        this.dialogueText.setFontStyle('normal');
        this.nameText.setColor(this.config.nameColor);
    }
  }

  private startTypewriter(text: string, speed: number): void {
    this.isTyping = true;
    this.dialogueText.setText('');
    this.hideContinuePrompt();

    let currentIndex = 0;
    const characters = text.split('');

    this.typewriterTween = this.scene.tweens.addCounter({
      from: 0,
      to: characters.length,
      duration: characters.length * (1000 / speed),
      onUpdate: (tween) => {
        const progress = Math.floor(tween.getValue());
        if (progress > currentIndex) {
          currentIndex = progress;
          this.dialogueText.setText(characters.slice(0, currentIndex).join(''));
        }
      },
      onComplete: () => {
        this.isTyping = false;
        this.typewriterTween = undefined;
        this.showContinuePrompt();
      }
    });
  }

  public show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.setVisible(true);
    this.setAlpha(0);

    // Slide up animation
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y - 20,
      duration: 300,
      ease: 'Power2'
    });
  }

  public hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.hideContinuePrompt();
    
    if (this.typewriterTween) {
      this.typewriterTween.remove();
      this.typewriterTween = undefined;
    }

    // Slide down animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 20,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
      }
    });
  }

  public isDialogueVisible(): boolean {
    return this.isVisible;
  }

  public isCurrentlyTyping(): boolean {
    return this.isTyping;
  }

  public updateConfig(newConfig: Partial<DialogueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.destroy();
    this.createComponents();
    this.setupInteraction();
  }

  public destroy(): void {
    if (this.typewriterTween) {
      this.typewriterTween.remove();
    }
    this.scene.tweens.killTweensOf(this.continueIcon);
    this.scene.tweens.killTweensOf(this);
    super.destroy();
  }
}