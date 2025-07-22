'use client'

import React, { useEffect, useState } from 'react'
import { EventBus } from '@/game/EventBus'
import { Droplets, Scissors, Sprout, Coins } from 'lucide-react'
import { CropData, CropType } from '@/lib/CropSystem'
import { CropEconomyConfig, getTimeUntilHarvest } from '@/lib/EconomyConfig'

interface PlotMenuData {
  plotId: string
  x: number
  y: number
  screenX: number
  screenY: number
  isEmpty: boolean
  crop?: CropData
  gridX: number
  gridY: number
}

interface CropSeed {
  id: CropType
  name: string
  icon: string
  cost: number
  description: string
  growthTime: number
  harvestYield: number
}

// Define crop metadata with icons and descriptions
const cropMetadata: Record<CropType, { icon: string; description: string }> = {
  potato: { icon: '🥔', description: 'Basic crop, grows quickly' },
  carrot: { icon: '🥕', description: 'Nutritious orange veggie' },
  lettuce: { icon: '🥬', description: 'Fresh leafy greens' },
  tomato: { icon: '🍅', description: 'Juicy red fruit' },
  corn: { icon: '🌽', description: 'Golden corn on the cob' },
  cabbage: { icon: '🥬', description: 'Hearty green vegetable' },
  strawberry: { icon: '🍓', description: 'Sweet summer berries' },
  watermelon: { icon: '🍉', description: 'Large refreshing fruit' },
  pumpkin: { icon: '🎃', description: 'Perfect for fall harvest' },
  pepper: { icon: '🌶️', description: 'Spicy hot peppers' },
}

// Generate crop seeds from economy config
const cropSeeds: CropSeed[] = (Object.keys(CropEconomyConfig) as CropType[])
  .map(cropType => ({
    id: cropType,
    name: cropType.charAt(0).toUpperCase() + cropType.slice(1),
    icon: cropMetadata[cropType].icon,
    cost: CropEconomyConfig[cropType].cost,
    description: cropMetadata[cropType].description,
    growthTime: CropEconomyConfig[cropType].growthTime,
    harvestYield: CropEconomyConfig[cropType].harvestYield
  }))
  .sort((a, b) => a.cost - b.cost) // Sort by cost ascending

interface FarmPlotMenuProps {
  playerGold?: number
}

export function FarmPlotMenu({ playerGold = 100 }: FarmPlotMenuProps) {
  const [menuData, setMenuData] = useState<PlotMenuData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleShowMenu = (data: PlotMenuData) => {
      setMenuData(data)
      setMenuPosition({ x: data.screenX, y: data.screenY })
      setIsOpen(true)
    }

    EventBus.on('show-plot-menu', handleShowMenu)
    
    return () => {
      EventBus.off('show-plot-menu', handleShowMenu)
    }
  }, [])

  const handlePlantCrop = (seed: CropSeed) => {
    if (!menuData) return
    
    // Check if player has enough gold
    if (playerGold < seed.cost) {
      EventBus.emit('ui:notification', {
        message: `Not enough gold! Need ${seed.cost} gold to plant ${seed.name}`,
        type: 'warning'
      })
      setIsOpen(false)
      return
    }
    
    EventBus.emit('plant-crop', {
      plotId: menuData.plotId,
      cropType: seed.id,
      gridX: menuData.gridX,
      gridY: menuData.gridY,
      cost: seed.cost
    })
    
    setIsOpen(false)
  }

  const handleWaterCrop = () => {
    if (!menuData) return
    
    EventBus.emit('water-crop', {
      plotId: menuData.plotId,
      cropData: menuData.crop
    })
    
    setIsOpen(false)
  }

  const handleHarvestCrop = () => {
    if (!menuData || !menuData.crop) return
    
    EventBus.emit('harvest-crop', {
      plotId: menuData.plotId,
      cropData: menuData.crop
    })
    
    setIsOpen(false)
  }

  const [currentTime, setCurrentTime] = useState(Date.now())
  
  // Update current time every second for live progress
  useEffect(() => {
    if (!isOpen || menuData?.crop?.stage === 'ready') return
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isOpen, menuData?.crop?.stage])
  
  const getCropProgress = () => {
    if (!menuData?.crop) return 0
    const elapsed = currentTime - menuData.crop.plantedAt
    const growthTime = CropEconomyConfig[menuData.crop.type as CropType]?.growthTime || 30
    const growthTimeMs = growthTime * 1000 // Convert to milliseconds
    return Math.min((elapsed / growthTimeMs) * 100, 100)
  }
  
  const getTimeRemainingDisplay = () => {
    if (!menuData?.crop) return ''
    const elapsed = currentTime - menuData.crop.plantedAt
    const growthTime = CropEconomyConfig[menuData.crop.type as CropType]?.growthTime || 30
    const growthTimeMs = growthTime * 1000
    const remaining = Math.max(0, growthTimeMs - elapsed)
    
    if (remaining === 0) return 'Ready!'
    
    const seconds = Math.ceil(remaining / 1000)
    if (seconds < 60) return `${seconds}s`
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div 
        className="fixed inset-0 z-[999]" 
        onClick={() => setIsOpen(false)}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Context Menu */}
      <div 
        className="fixed z-[1000] min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
        style={{ 
          left: `${menuPosition.x}px`, 
          top: `${menuPosition.y}px`,
          maxHeight: '400px',
          overflowY: 'auto'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {menuData?.isEmpty ? (
          <>
            <div className="px-3 py-2 text-sm font-semibold text-gray-300 border-b border-gray-700 flex items-center gap-2">
              <Sprout className="h-4 w-4" />
              Plant Crop
            </div>
            <div className="py-1">
              {cropSeeds.map((seed) => {
                const canAfford = playerGold >= seed.cost
                return (
                  <button
                    key={seed.id}
                    onClick={() => canAfford && handlePlantCrop(seed)}
                    disabled={!canAfford}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors flex items-center justify-between group ${
                      !canAfford ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{seed.icon}</span>
                      <div>
                        <div className="font-medium text-gray-200">{seed.name}</div>
                        <div className="text-xs text-gray-400">{seed.description}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${!canAfford ? 'text-red-400' : 'text-yellow-400'}`}>
                      <Coins className="h-3 w-3" />
                      <span className="text-sm font-medium">{seed.cost}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-700">
              Your Gold: <span className="text-yellow-400 font-medium">{playerGold}</span>
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-2 text-sm font-semibold text-gray-300 border-b border-gray-700">
              {menuData?.crop?.type ? menuData.crop.type.charAt(0).toUpperCase() + menuData.crop.type.slice(1) : 'Crop'}
            </div>
            <div className="py-1">
              {/* Growth Progress */}
              <div className="px-3 py-2">
                <div className="text-xs text-gray-400 mb-1">Growth Progress</div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getCropProgress()}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Stage: {menuData?.crop?.stage || 'Unknown'}</span>
                  {menuData?.crop && menuData.crop.stage !== 'ready' && (
                    <span>Time: {getTimeRemainingDisplay()}</span>
                  )}
                </div>
                {menuData?.crop && (
                  <div className="text-xs text-gray-400 mt-1">
                    Health: {menuData.crop.health || 100}%
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="border-t border-gray-700">
                {menuData?.crop?.stage !== 'ready' && (
                  <button
                    onClick={handleWaterCrop}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Droplets className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-200">Water Crop</span>
                    <span className="text-xs text-gray-500 ml-auto">(Maintains health)</span>
                  </button>
                )}
                
                {menuData?.crop?.stage === 'ready' && (
                  <button
                    onClick={handleHarvestCrop}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Scissors className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-200">Harvest</span>
                    <span className="ml-auto text-xs text-yellow-400">
                      +{CropEconomyConfig[menuData.crop.type as CropType]?.harvestYield || 10} Gold
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}