'use client';

import React, { ReactNode } from 'react';
import Notifications from './Notifications';

interface UIStackProps {
  chatContainer: ReactNode;
}

export function UIStack({ chatContainer }: UIStackProps) {
  return (
    <div className="fixed top-4 left-4 flex flex-col gap-4 w-80 sm:w-96 md:w-80 lg:w-96 z-[1000] max-w-[calc(100vw-2rem)]">
      {/* Chat Container */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg text-white">
        {chatContainer}
      </div>

      {/* Notifications Panel */}
      <div>
        <Notifications />
      </div>
    </div>
  );
}