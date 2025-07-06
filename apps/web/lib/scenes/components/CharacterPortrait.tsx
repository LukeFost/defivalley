import { CharacterData } from '../VisualNovelScene';

interface CharacterPortraitProps {
  character: CharacterData;
  className?: string;
}

/**
 * Character portrait component for visual novel scenes
 * Displays character emoji/image with name and role
 */
export function CharacterPortrait({ character, className = '' }: CharacterPortraitProps) {
  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Character portrait */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-4 border-purple-300 shadow-lg">
        <span className="text-4xl">{character.portrait}</span>
      </div>
      
      {/* Character info */}
      <div className="text-center">
        <h3 className="font-bold text-lg text-gray-800">{character.name}</h3>
        <p className="text-sm text-gray-600 italic">{character.role}</p>
      </div>
    </div>
  );
}