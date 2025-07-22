'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

interface StatusCardProps {
  type: 'crop' | 'quest' | 'achievement';
  data: any;
}

export function StatusCard({ type, data }: StatusCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Auto-hide after first view
  useEffect(() => {
    const hasSeenCard = localStorage.getItem(`seen-card-${type}-${data.id}`);
    if (hasSeenCard) {
      setIsMinimized(true);
    }
  }, [type, data.id]);
  
  const handleDismiss = () => {
    localStorage.setItem(`seen-card-${type}-${data.id}`, 'true');
    setIsMinimized(true);
  };
  
  if (isMinimized) {
    return (
      <button 
        className="minimized-card"
        onClick={() => setIsMinimized(false)}
      >
        {type === 'crop' && '🥔'}
        {type === 'quest' && '📜'}
        {type === 'achievement' && '🏆'}
      </button>
    );
  }
  
  return (
    <Card className="status-card">
      <div className="card-header">
        <h3 className="card-title">
          {type === 'crop' && '🥔 Crop Discovery!'}
          {type === 'quest' && '📜 New Quest'}
          {type === 'achievement' && '🏆 Achievement'}
        </h3>
        <button onClick={handleDismiss} className="dismiss-btn">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="card-content">
        {type === 'crop' && (
          <>
            <p className="text-sm">You discovered <strong>{data.name}</strong>!</p>
            <p className="text-xs text-muted-foreground mt-2">
              Growth time: {data.growthTime}<br/>
              Sell price: {data.sellPrice} gold
            </p>
            <p className="text-xs mt-2 italic">
              Right-click on empty plots to plant
            </p>
          </>
        )}
        
        {type === 'quest' && (
          <>
            <p className="text-sm font-semibold">{data.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.description}
            </p>
            <div className="mt-2">
              <p className="text-xs">Reward: {data.reward}</p>
            </div>
          </>
        )}
        
        {type === 'achievement' && (
          <>
            <p className="text-sm font-semibold">{data.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.description}
            </p>
            <div className="mt-2">
              <p className="text-xs text-green-600">Achievement unlocked!</p>
            </div>
          </>
        )}
      </div>
      
      <style jsx>{`
        .status-card {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 280px;
          animation: slideIn 0.3s ease-out;
          z-index: 1000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #eee;
        }
        
        .card-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        
        .dismiss-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .dismiss-btn:hover {
          background: #f5f5f5;
          color: #666;
        }
        
        .card-content {
          padding: 16px;
        }
        
        .minimized-card {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: white;
          border: 2px solid #eee;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s;
          z-index: 1000;
        }
        
        .minimized-card:hover {
          transform: scale(1.1);
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </Card>
  );
}