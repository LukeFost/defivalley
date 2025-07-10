import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { Player } from "../schema/Player";
import { Crop } from "../schema/Crop";
import { ERROR_CODES, SEED_CONFIGS, SeedType } from "../types/game.types";
import { DatabaseServiceRefactored } from "../services/DatabaseServiceRefactored";
import { AuthUtils } from "../utils/auth";

/**
 * Example of GameRoom using the new Repository Pattern
 * This shows how to migrate from DatabaseService to the new architecture
 */
export class GameRoom extends Room<GameState> {
  private dbService: DatabaseServiceRefactored;
  private authenticatedClients = new Map<string, string>(); // clientId -> playerId

  onCreate(options: any) {
    console.log("🎮 GameRoom created with options:", options);
    
    // Initialize with refactored database service
    this.dbService = new DatabaseServiceRefactored();
    
    // Initialize game state
    this.setState(new GameState());
    
    // Set up message handlers
    this.setupMessageHandlers();
    
    // Load initial world data
    this.loadWorldData(options.worldOwnerId);
  }

  private setupMessageHandlers() {
    // Plant seed handler - showcases domain service usage
    this.onMessage("plantSeed", (client, message) => {
      console.log(`🌱 Plant seed request from ${client.id}:`, message);
      
      const playerId = this.authenticatedClients.get(client.id);
      if (!playerId) {
        this.sendError(client, ERROR_CODES.PLAYER_NOT_FOUND, "Not authenticated");
        return;
      }

      try {
        // Validate seed type
        const seedType = message.seedType as SeedType;
        if (!SEED_CONFIGS[seedType]) {
          this.sendError(client, ERROR_CODES.INVALID_SEED_TYPE, "Invalid seed type");
          return;
        }

        // Use the refactored service (same API)
        const cropId = this.dbService.saveCrop({
          player_id: playerId,
          seed_type: seedType,
          x: message.x,
          y: message.y,
          planted_at: new Date().toISOString(),
          growth_time: SEED_CONFIGS[seedType].growthTime,
          investment_amount: message.investmentAmount,
          harvested: false
        });

        // Get the created crop to add to game state
        const dbCrop = this.dbService.getCrop(cropId);
        if (dbCrop) {
          this.addCropToState(dbCrop);
          
          // Update player XP
          const player = this.state.players.get(playerId);
          if (player) {
            const xpGain = Math.floor(message.investmentAmount / 10);
            player.xp += xpGain;
            this.dbService.updatePlayerXP(playerId, player.xp);
          }

          // Broadcast success
          client.send("cropPlanted", { 
            cropId, 
            seedType,
            x: message.x,
            y: message.y 
          });
        }
      } catch (error: any) {
        console.error("❌ Error planting seed:", error);
        if (error.message.includes("Position is already occupied")) {
          this.sendError(client, ERROR_CODES.POSITION_OCCUPIED, error.message);
        } else if (error.message.includes("Minimum investment")) {
          this.sendError(client, ERROR_CODES.INSUFFICIENT_INVESTMENT, error.message);
        } else {
          this.sendError(client, ERROR_CODES.DATABASE_ERROR, "Failed to plant seed");
        }
      }
    });

    // Harvest crop handler - showcases transaction usage
    this.onMessage("harvestCrop", (client, message) => {
      console.log(`🌾 Harvest request from ${client.id}:`, message);
      
      const playerId = this.authenticatedClients.get(client.id);
      if (!playerId) {
        this.sendError(client, ERROR_CODES.PLAYER_NOT_FOUND, "Not authenticated");
        return;
      }

      try {
        const cropId = message.cropId;
        const crop = this.dbService.getCrop(cropId);
        
        if (!crop) {
          this.sendError(client, ERROR_CODES.CROP_NOT_FOUND, "Crop not found");
          return;
        }

        // Use the underlying domain service for complex logic
        this.dbService.harvestCrop(cropId);
        
        // Remove from game state
        this.state.crops.delete(cropId);
        
        // Notify client
        client.send("cropHarvested", { cropId });
        
      } catch (error: any) {
        console.error("❌ Error harvesting crop:", error);
        if (error.message.includes("not ready")) {
          this.sendError(client, ERROR_CODES.CROP_NOT_READY, error.message);
        } else if (error.message.includes("already harvested")) {
          this.sendError(client, ERROR_CODES.CROP_ALREADY_HARVESTED, error.message);
        } else {
          this.sendError(client, ERROR_CODES.DATABASE_ERROR, "Failed to harvest crop");
        }
      }
    });
  }

  private loadWorldData(worldOwnerId: string) {
    try {
      // Load world data using the service
      const worldData = this.dbService.getWorldData(worldOwnerId);
      
      if (worldData.player) {
        const player = new Player();
        player.id = worldData.player.id;
        player.name = worldData.player.name;
        player.xp = worldData.player.xp;
        player.x = 400;
        player.y = 300;
        this.state.players.set(player.id, player);
      }
      
      // Load crops
      worldData.crops.forEach(dbCrop => {
        this.addCropToState(dbCrop);
      });
      
      console.log(`✅ Loaded world data: ${worldData.crops.length} crops`);
    } catch (error) {
      console.error("❌ Error loading world data:", error);
    }
  }

  private addCropToState(dbCrop: any) {
    const crop = new Crop();
    crop.id = dbCrop.id;
    crop.playerId = dbCrop.playerId || dbCrop.player_id;
    crop.seedType = dbCrop.seedType || dbCrop.seed_type;
    crop.x = dbCrop.x;
    crop.y = dbCrop.y;
    crop.plantedAt = typeof dbCrop.plantedAt === 'string' 
      ? new Date(dbCrop.plantedAt).getTime() 
      : dbCrop.plantedAt.getTime();
    crop.growthTime = dbCrop.growthTime || dbCrop.growth_time;
    this.state.crops.set(crop.id, crop);
  }

  private sendError(client: Client, code: string, message: string) {
    client.send("error", { code, message });
  }

  async onJoin(client: Client, options: any) {
    console.log(`👋 Client ${client.id} joined room ${this.roomId}`);
    
    // Authenticate the client
    const authToken = options.authToken;
    if (!authToken) {
      client.leave(1000, "Authentication required");
      return;
    }

    try {
      const authData = AuthUtils.verifyToken(authToken);
      const playerId = authData.playerId;
      
      // Store authenticated client
      this.authenticatedClients.set(client.id, playerId);
      
      // Get or create player using the service
      const playerData = this.dbService.getPlayer(playerId, options.playerName || `Player_${playerId.slice(0, 8)}`);
      
      // Add to game state if not exists
      if (!this.state.players.has(playerId)) {
        const player = new Player();
        player.id = playerData.id;
        player.name = playerData.name;
        player.xp = playerData.xp;
        player.x = 400;
        player.y = 300;
        this.state.players.set(playerId, player);
      }
      
      // Send authentication success
      client.send("authenticated", { playerId });
      
    } catch (error) {
      console.error("❌ Authentication failed:", error);
      client.leave(1001, "Invalid authentication token");
    }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 Client ${client.id} left room ${this.roomId}`);
    this.authenticatedClients.delete(client.id);
  }

  async onDispose() {
    console.log(`🗑️ Disposing room ${this.roomId}`);
    this.dbService.close();
  }
}

/**
 * Key differences in this example:
 * 
 * 1. Uses DatabaseServiceRefactored instead of DatabaseService
 * 2. Error handling now catches domain-specific errors
 * 3. Transaction boundaries are handled by the service
 * 4. Business logic (XP calculation, yield calculation) is encapsulated
 * 5. The API remains mostly the same for easy migration
 * 
 * To migrate your actual GameRoom:
 * 1. Change the import to DatabaseServiceRefactored
 * 2. Update error handling to catch domain errors
 * 3. Everything else should work as before!
 */