'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Move, Info, Download } from 'lucide-react';

export interface EditorObject {
  name: string;
  x: number;
  y: number;
  type: 'building' | 'player' | 'other';
}

interface EditorPanelProps {
  selectedObject: EditorObject | null;
  mode: 'info' | 'move';
  onModeChange: (mode: 'info' | 'move') => void;
  onExportConfig: () => void;
  onCopyCoords: () => void;
  isVisible: boolean;
}

export function EditorPanel({ 
  selectedObject, 
  mode, 
  onModeChange, 
  onExportConfig,
  onCopyCoords,
  isVisible 
}: EditorPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!isVisible) return null;

  const handleCopyCoords = () => {
    onCopyCoords();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="fixed top-20 right-4 bg-gray-900/95 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl border border-gray-700 z-[2000] min-w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-green-400">●</span> Editor Mode
        </h2>
        <kbd className="text-xs bg-gray-800 px-2 py-1 rounded">~ to close</kbd>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onModeChange('info')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
            mode === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Info size={16} />
          <span>Info</span>
        </button>
        <button
          onClick={() => onModeChange('move')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
            mode === 'move'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Move size={16} />
          <span>Move</span>
        </button>
      </div>

      {/* Selected Object Info */}
      <div className="bg-gray-800 rounded p-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Selected Object</h3>
        {selectedObject ? (
          <>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="font-mono text-yellow-400">{selectedObject.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="font-mono text-blue-400">{selectedObject.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">X:</span>
                <span className="font-mono text-green-400">{Math.round(selectedObject.x)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y:</span>
                <span className="font-mono text-green-400">{Math.round(selectedObject.y)}</span>
              </div>
            </div>
            
            {/* Copy Coordinates Button */}
            <button
              onClick={handleCopyCoords}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm transition-colors"
            >
              <Copy size={14} />
              <span>{copyFeedback ? 'Copied!' : 'Copy Coords'}</span>
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-sm italic">
            {mode === 'info' ? 'Click an object to inspect' : 'Click an object to select for moving'}
          </p>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={onExportConfig}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition-colors"
      >
        <Download size={16} />
        <span>Export Config</span>
      </button>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>• {mode === 'info' ? 'Click objects to view details' : 'Click object, then click to move'}</p>
        <p>• Export copies config to clipboard</p>
        <p>• Press ~ to toggle editor</p>
      </div>
    </div>
  );
}