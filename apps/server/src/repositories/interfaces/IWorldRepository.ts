export interface WorldSummary {
  playerId: string;
  playerName: string;
  cropCount: number;
  lastActivity: Date;
}

export interface IWorldRepository {
  getActiveWorlds(limit: number, offset: number, search?: string): WorldSummary[];
  getTotalWorldsCount(search?: string): number;
}