import { Room, Client } from "colyseus";
import { GameState, Player, Crop } from "../schema/GameState";
import { databaseService } from "../services/DatabaseService";
import { 
  SeedType, 
  SEED_CONFIGS, 
  PlantSeedMessage, 
  HarvestCropMessage,
  GameError,
  ERROR_CODES,
  CROP_COLLISION_RADIUS 
} from "../types/game.types";
import { JoinOptions, AuthenticatedClient } from "../types/auth.types";
import { hashPlayerId } from "../utils/auth";

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private worldOwnerId: string = 'default';
  private authenticatedClients = new Map<string, AuthenticatedClient>();
  
  // World size constants to match the client
  private worldWidth = 3200;
  private worldHeight = 2400;

  onCreate(options: any) {
    this.setState(new GameState());
    
    // Get the world owner ID from options (defaults to 'default' for fallback)
    this.worldOwnerId = options.worldOwnerId || 'default';
    
    console.log(`🎮 GameRoom created for world: ${this.worldOwnerId}`, options);
    
    // Load world-specific data from database
    this.loadWorldFromDatabase(this.worldOwnerId);
    
    // Set up message handlers
    this.onMessage("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      player.x = Math.max(0, Math.min(this.worldWidth, message.x));
      player.y = Math.max(0, Math.min(this.worldHeight, message.y));
      player.lastActive = Date.now();
    });
    
    this.onMessage("chat", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      this.broadcast('chat', {
        playerId: player.id,
        name: player.name,
        message: message.text,
        timestamp: Date.now()
      });
    });
    
    this.onMessage("plant_seed", (client, message: PlantSeedMessage) => {
      this.handlePlantSeed(client, message);
    });
    
    this.onMessage("harvest_crop", (client, message: HarvestCropMessage) => {
      this.handleHarvestCrop(client, message);
    });
    
    this.onMessage("ping", (client, message) => {
      client.send('pong', { timestamp: Date.now() });
    });
    
    // Set up game loop for updates every 100ms
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 100);
  }

  onJoin(client: Client, options: JoinOptions) {
    // Get the actual player ID from options (validated on frontend)
    const playerId = options.playerId || hashPlayerId(client.sessionId);
    
    // Determine if this client is the world owner (host) or a visitor
    const isHost = playerId === this.worldOwnerId;
    
    // Store authenticated client info
    this.authenticatedClients.set(client.sessionId, {
      sessionId: client.sessionId,
      playerId,
      isHost
    });
    
    console.log(`👋 ${client.sessionId} (${playerId}) joined world ${this.worldOwnerId} as ${isHost ? 'HOST' : 'VISITOR'}`);
    
    // Create a new player
    const player = new Player();
    player.id = playerId;  // Use the actual player ID
    player.name = options.name || `Player ${playerId.substr(0, 8)}`;
    player.x = Math.random() * this.worldWidth; // Random spawn position
    player.y = Math.random() * this.worldHeight;
    player.connected = true;
    
    // Load player data from database (only load XP for the world owner)
    if (isHost) {
      try {
        const dbPlayer = databaseService.getPlayer(playerId, player.name);
        player.xp = dbPlayer.xp;
      } catch (error) {
        console.error(`Failed to load player data for ${playerId}:`, error);
        player.xp = 0;
      }
    } else {
      // Visitors start with 0 XP in this world context
      player.xp = 0;
    }
    
    // Add player to game state
    this.state.players.set(client.sessionId, player);
    
    // Send welcome message with world context
    const worldOwnerName = this.getWorldOwnerName();
    const welcomeMessage = isHost 
      ? `Welcome to your farm, ${player.name}! There are ${this.state.players.size} players here.`
      : `Welcome to ${worldOwnerName}'s farm! You are visiting as ${player.name}.`;
    
    client.send('welcome', { 
      message: welcomeMessage,
      playerId: playerId,  // Send the actual player ID
      sessionId: client.sessionId,  // Also send session ID for client reference
      isHost: isHost,
      worldOwnerId: this.worldOwnerId,
      worldOwnerName: worldOwnerName
    });
    
    // Broadcast to all other clients
    this.broadcast('player-joined', { 
      playerId: playerId,
      name: player.name,
      isHost: isHost,
      totalPlayers: this.state.players.size
    }, { except: client });
  }


  onLeave(client: Client, consented: boolean) {
    console.log(`👋 ${client.sessionId} left the game`);
    
    // Clean up authenticated client info
    this.authenticatedClients.delete(client.sessionId);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
      const playerId = player.id; // Save player ID before deletion
      
      // Remove player after 30 seconds
      setTimeout(() => {
        this.state.players.delete(client.sessionId);
        this.broadcast('player-left', { 
          playerId: playerId,
          totalPlayers: this.state.players.size 
        });
      }, 30000);
    }
  }

  onDispose() {
    console.log("🗑️ GameRoom disposed");
  }

  update(deltaTime: number) {
    // Update game state here
    // For example: check for inactive players, update game objects, etc.
    
    const now = Date.now();
    this.state.players.forEach((player, sessionId) => {
      if (player.connected && now - player.lastActive > 60000) {
        // Mark player as inactive after 1 minute
        player.connected = false;
      }
    });
  }

  private loadWorldFromDatabase(worldOwnerId: string) {
    try {
      const worldData = databaseService.getWorldData(worldOwnerId);
      
      if (!worldData.player) {
        console.log(`🆕 Creating new world for player: ${worldOwnerId}`);
        return;
      }
      
      // Load crops specific to this world
      for (const dbCrop of worldData.crops) {
        const crop = new Crop();
        crop.id = dbCrop.id;
        crop.playerId = dbCrop.player_id;
        crop.seedType = dbCrop.seed_type;
        crop.x = dbCrop.x;
        crop.y = dbCrop.y;
        crop.plantedAt = dbCrop.planted_at;
        crop.growthTime = dbCrop.growth_time;
        crop.investmentAmount = dbCrop.investment_amount;
        crop.harvested = dbCrop.harvested;
        
        this.state.crops.set(crop.id, crop);
      }
      
      console.log(`📦 Loaded world for ${worldOwnerId}: ${worldData.crops.length} crops, XP: ${worldData.player.xp}`);
    } catch (error) {
      console.error(`❌ Error loading world for ${worldOwnerId}:`, error);
    }
  }

  private getWorldOwnerName(): string {
    try {
      const worldData = databaseService.getWorldData(this.worldOwnerId);
      return worldData.player?.name || `Player_${this.worldOwnerId.slice(0, 8)}`;
    } catch (error) {
      return `Player_${this.worldOwnerId.slice(0, 8)}`;
    }
  }

  private sendError(client: Client, error: GameError) {
    client.send('game_error', error);
  }

  private handlePlantSeed(client: Client, message: PlantSeedMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      this.sendError(client, {
        code: ERROR_CODES.PLAYER_NOT_FOUND,
        message: 'Player not found'
      });
      return;
    }

    // Check if player is the world owner (only host can plant)
    const authClient = this.authenticatedClients.get(client.sessionId);
    if (!authClient || !authClient.isHost) {
      this.sendError(client, {
        code: ERROR_CODES.INVALID_REQUEST,
        message: 'Only the farm owner can plant seeds',
        details: { worldOwnerId: this.worldOwnerId, playerId: authClient?.playerId || 'unknown' }
      });
      return;
    }

    // Validate the plant seed request
    const { seedType, x, y, investmentAmount } = message;
    
    if (!seedType || typeof x !== 'number' || typeof y !== 'number' || !investmentAmount) {
      this.sendError(client, {
        code: ERROR_CODES.INVALID_REQUEST,
        message: 'Invalid plant seed request',
        details: { seedType, x, y, investmentAmount }
      });
      return;
    }

    // Check if position is already occupied (with radius checking)
    if (databaseService.isPositionOccupied(x, y, CROP_COLLISION_RADIUS)) {
      this.sendError(client, {
        code: ERROR_CODES.POSITION_OCCUPIED,
        message: 'Position already occupied or too close to another crop',
        details: { x, y, radius: CROP_COLLISION_RADIUS }
      });
      return;
    }

    // Validate seed type
    const seedConfig = SEED_CONFIGS[seedType];
    if (!seedConfig) {
      this.sendError(client, {
        code: ERROR_CODES.INVALID_SEED_TYPE,
        message: 'Invalid seed type',
        details: { seedType, validTypes: Object.keys(SEED_CONFIGS) }
      });
      return;
    }

    if (investmentAmount < seedConfig.minInvestment) {
      this.sendError(client, {
        code: ERROR_CODES.INSUFFICIENT_INVESTMENT,
        message: `Minimum investment for ${seedType} is ${seedConfig.minInvestment} USDC`,
        details: { seedType, minInvestment: seedConfig.minInvestment, provided: investmentAmount }
      });
      return;
    }

    // Use transaction to ensure atomicity
    try {
      const result = databaseService.transaction(() => {
        // Create crop in database
        const now = new Date().toISOString();
        const cropId = databaseService.saveCrop({
          player_id: authClient.playerId,
          seed_type: seedType,
          x: x,
          y: y,
          planted_at: now,
          growth_time: seedConfig.growthTime,
          investment_amount: investmentAmount,
          harvested: false
        });

        // Update player XP
        const newXP = player.xp + seedConfig.xpGain;
        databaseService.updatePlayerXP(authClient.playerId, newXP);

        return { cropId, now, newXP };
      });

      // Create crop in game state
      const crop = new Crop();
      crop.id = result.cropId;
      crop.playerId = authClient.playerId;
      crop.seedType = seedType;
      crop.x = x;
      crop.y = y;
      crop.plantedAt = result.now;
      crop.growthTime = seedConfig.growthTime;
      crop.investmentAmount = investmentAmount;
      crop.harvested = false;

      this.state.crops.set(result.cropId, crop);
      player.xp = result.newXP;

      // Send success response
      client.send('seed_planted', {
        cropId: result.cropId,
        seedType: seedType,
        x: x,
        y: y,
        xpGained: seedConfig.xpGain,
        newXP: result.newXP
      });

      // Broadcast to all players
      this.broadcast('crop_planted', {
        cropId: result.cropId,
        playerId: authClient.playerId,
        playerName: player.name,
        seedType: seedType,
        x: x,
        y: y
      });
    } catch (error) {
      console.error('❌ Error planting seed:', error);
      this.sendError(client, {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to plant seed',
        details: error
      });
    }

  }

  private handleHarvestCrop(client: Client, message: HarvestCropMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      this.sendError(client, {
        code: ERROR_CODES.PLAYER_NOT_FOUND,
        message: 'Player not found'
      });
      return;
    }

    // Check if player is the world owner (only host can harvest)
    const authClient = this.authenticatedClients.get(client.sessionId);
    if (!authClient || !authClient.isHost) {
      this.sendError(client, {
        code: ERROR_CODES.INVALID_REQUEST,
        message: 'Only the farm owner can harvest crops',
        details: { worldOwnerId: this.worldOwnerId, playerId: authClient?.playerId || 'unknown' }
      });
      return;
    }

    const { cropId } = message;
    const crop = this.state.crops.get(cropId);
    
    if (!crop) {
      this.sendError(client, {
        code: ERROR_CODES.CROP_NOT_FOUND,
        message: 'Crop not found',
        details: { cropId }
      });
      return;
    }

    // Verify ownership
    if (crop.playerId !== authClient.playerId) {
      this.sendError(client, {
        code: ERROR_CODES.INVALID_REQUEST,
        message: 'You can only harvest your own crops',
        details: { cropId }
      });
      return;
    }

    // Check if already harvested
    if (crop.harvested) {
      this.sendError(client, {
        code: ERROR_CODES.CROP_ALREADY_HARVESTED,
        message: 'Crop has already been harvested',
        details: { cropId }
      });
      return;
    }

    // Check if crop is ready
    const plantedTime = new Date(crop.plantedAt).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - plantedTime;

    if (timeElapsed < crop.growthTime) {
      const timeRemaining = crop.growthTime - timeElapsed;
      this.sendError(client, {
        code: ERROR_CODES.CROP_NOT_READY,
        message: 'Crop is not ready for harvest',
        details: { 
          cropId, 
          timeRemaining,
          readyAt: new Date(plantedTime + crop.growthTime).toISOString()
        }
      });
      return;
    }

    // Calculate yield
    const seedConfig = SEED_CONFIGS[crop.seedType as SeedType];
    const yieldAmount = databaseService.calculateYield(
      crop.investmentAmount,
      crop.plantedAt,
      seedConfig.baseYieldRate
    );

    try {
      // Update database
      databaseService.transaction(() => {
        databaseService.harvestCrop(cropId);
        // In a real implementation, we would also:
        // - Update player's wallet balance
        // - Record the yield transaction
        // - Update any DeFi protocol state
      });

      // Update game state
      crop.harvested = true;

      // Send success response
      client.send('crop_harvested', {
        cropId: cropId,
        investmentAmount: crop.investmentAmount,
        yieldAmount: yieldAmount,
        totalReturn: crop.investmentAmount + yieldAmount
      });

      // Broadcast harvest event
      this.broadcast('harvest_event', {
        playerId: authClient.playerId,
        playerName: player.name,
        cropId: cropId,
        seedType: crop.seedType,
        totalReturn: crop.investmentAmount + yieldAmount
      });

      // Remove crop from active state after a delay
      setTimeout(() => {
        this.state.crops.delete(cropId);
      }, 5000);

    } catch (error) {
      console.error('❌ Error harvesting crop:', error);
      this.sendError(client, {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to harvest crop',
        details: error
      });
    }
  }
}