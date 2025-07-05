'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../app/store';

export default function TestModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Test the actual PlantSeedDialog trigger
  const showPlantModal = useAppStore((state) => state.showPlantModal);
  const isPlantModalOpen = useAppStore((state) => state.ui.showPlantModal);
  
  console.log('🧪 [TEST MODAL] Rendering with isOpen =', isOpen);
  console.log('🧪 [TEST MODAL] PlantModal state from store:', isPlantModalOpen);
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Test Modal (Direct shadcn/ui)</h3>
      
      {/* Method 1: Using DialogTrigger (shadcn recommended way) */}
      <div className="mb-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => console.log('🧪 [TEST MODAL] Trigger button clicked')}>
              Open with DialogTrigger
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Test Dialog (Trigger Method)</DialogTitle>
              <DialogDescription>
                This dialog opens using the DialogTrigger component (recommended shadcn pattern).
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <p>If you can see this, the shadcn dialog is working correctly!</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Method 2: Using controlled state (what we're doing in PlantSeedDialog) */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => {
            console.log('🧪 [TEST MODAL] State button clicked, setting isOpen to true');
            setIsOpen(true);
          }}
        >
          Open with State Control
        </Button>
      </div>
      
      {/* Method 3: Test PlantSeedDialog directly */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => {
            console.log('🧪 [TEST MODAL] Testing PlantSeedDialog - calling showPlantModal');
            console.log('🧪 [TEST MODAL] showPlantModal function:', showPlantModal);
            console.log('🧪 [TEST MODAL] Current plant modal state:', isPlantModalOpen);
            showPlantModal();
            console.log('🧪 [TEST MODAL] showPlantModal called!');
          }}
        >
          🌱 Test PlantSeedDialog
        </Button>
        <p className="text-sm text-gray-600 mt-1">
          Plant Modal State: {isPlantModalOpen ? '✅ OPEN' : '❌ CLOSED'}
        </p>
        
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            console.log('🧪 [TEST MODAL] onOpenChange called with:', open);
            setIsOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Test Dialog (State Method)</DialogTitle>
              <DialogDescription>
                This dialog opens using controlled state (like our PlantSeedDialog).
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <p>Current state: {isOpen ? 'OPEN' : 'CLOSED'}</p>
              <p>If you can see this, the controlled state dialog is working!</p>
              <Button 
                onClick={() => {
                  console.log('🧪 [TEST MODAL] Close button clicked');
                  setIsOpen(false);
                }}
                className="mt-2"
              >
                Close Dialog
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}