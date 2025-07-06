import { Button } from '@/components/ui/button';
import { CharacterData } from '../VisualNovelScene';

interface DialogueBoxProps {
  character: CharacterData;
  onNext?: () => void;
  onAction?: () => void;
  hasNext: boolean;
  actionButtonText?: string;
  className?: string;
}

/**
 * Dialogue box component for visual novel scenes
 * Displays character dialogue with navigation controls
 */
export function DialogueBox({ 
  character, 
  onNext, 
  onAction, 
  hasNext, 
  actionButtonText = 'Take Action',
  className = ''
}: DialogueBoxProps) {
  const currentDialogue = character.dialogue[character.currentDialogueIndex];

  return (
    <div className={`bg-white rounded-lg p-6 border-2 border-gray-200 shadow-lg max-w-2xl ${className}`}>
      {/* Character name */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-lg">{character.portrait}</span>
        <h4 className="font-bold text-gray-800">{character.name}</h4>
        <span className="text-sm text-gray-500">({character.role})</span>
      </div>

      {/* Dialogue text */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-gray-800 leading-relaxed">
          {currentDialogue}
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {hasNext && (
            <Button
              onClick={onNext}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              Continue →
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {!hasNext && onAction && (
            <Button
              onClick={onAction}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {actionButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Dialogue progress indicator */}
      <div className="mt-3 flex justify-center">
        <div className="flex space-x-1">
          {character.dialogue.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === character.currentDialogueIndex
                  ? 'bg-blue-500'
                  : index < character.currentDialogueIndex
                  ? 'bg-gray-400'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}