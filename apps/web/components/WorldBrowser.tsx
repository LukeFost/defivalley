'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Loader2, Users, Sprout, Search, Home, Eye } from 'lucide-react';

interface ActiveWorld {
  playerId: string;
  playerName: string;
  cropCount: number;
  lastActivity: string;
}

interface WorldBrowserProps {
  onEnterWorld: (worldId: string, isOwnWorld: boolean) => void;
  currentPlayerId?: string;
}

export default function WorldBrowser({ onEnterWorld, currentPlayerId }: WorldBrowserProps) {
  const [activeWorlds, setActiveWorlds] = useState<ActiveWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customWorldId, setCustomWorldId] = useState('');

  // Mock current player ID if not provided
  const playerId = currentPlayerId || `player_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    fetchActiveWorlds();
  }, []);

  const fetchActiveWorlds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/worlds');
      if (response.ok) {
        const data = await response.json();
        setActiveWorlds(data.worlds || []);
      } else {
        console.error('Failed to fetch active worlds');
        setActiveWorlds([]);
      }
    } catch (error) {
      console.error('Error fetching active worlds:', error);
      setActiveWorlds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterMyFarm = () => {
    onEnterWorld(playerId, true);
  };

  const handleVisitWorld = (worldId: string) => {
    onEnterWorld(worldId, false);
  };

  const handleSearchWorld = async () => {
    if (!customWorldId.trim()) return;

    try {
      const response = await fetch(`/api/worlds/${customWorldId}/exists`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          onEnterWorld(customWorldId, customWorldId === playerId);
        } else {
          alert('World not found. The player may not have created a farm yet.');
        }
      }
    } catch (error) {
      console.error('Error checking world:', error);
      alert('Error checking world. Please try again.');
    }
  };

  const filteredWorlds = activeWorlds.filter(world =>
    world.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    world.playerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            🌾 DeFi Valley
          </h1>
          <p className="text-lg text-gray-600">
            Choose your farm or visit a friend's world
          </p>
        </div>

        {/* My Farm Section */}
        <Card className="mb-8 border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              My Farm
            </CardTitle>
            <CardDescription>
              Enter your personal farm where you can plant, harvest, and manage your crops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleEnterMyFarm}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Sprout className="w-5 h-5 mr-2" />
              Enter My Farm
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Farm ID: {playerId.slice(0, 12)}...
            </p>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find a Specific Farm
            </CardTitle>
            <CardDescription>
              Enter a player ID or wallet address to visit their farm directly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter player ID or wallet address..."
                value={customWorldId}
                onChange={(e) => setCustomWorldId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchWorld()}
              />
              <Button onClick={handleSearchWorld} disabled={!customWorldId.trim()}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Worlds Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Farms
            </CardTitle>
            <CardDescription>
              Visit other players' farms and see their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Filter */}
            <div className="mb-4">
              <Input
                placeholder="Search farms by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading active farms...
              </div>
            ) : filteredWorlds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No farms match your search' : 'No active farms found'}
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredWorlds.map((world) => (
                  <div
                    key={world.playerId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{world.playerName}</h3>
                        {world.playerId === playerId && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Sprout className="w-3 h-3" />
                          {world.cropCount} crops
                        </span>
                        <span>
                          Last active: {formatLastActivity(world.lastActivity)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        ID: {world.playerId.slice(0, 16)}...
                      </p>
                    </div>
                    <Button
                      onClick={() => handleVisitWorld(world.playerId)}
                      variant={world.playerId === playerId ? "default" : "outline"}
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {world.playerId === playerId ? "Enter" : "Visit"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={fetchActiveWorlds}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}