import { Room, Client } from "colyseus";
import { GameState, Player, Crop } from "../schema/GameState";
import { databaseService } from "../services/DatabaseService";

export class GameRoom extends Room<GameState> {
  maxClients = 10;

  onCreate(options: any) {
    this.setState(new GameState());
    
    console.log("🎮 GameRoom created with options:", options);
    
    // Load existing crops from database
    this.loadCropsFromDatabase();
    
    // Set up message handlers
    this.onMessage("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      player.x = Math.max(0, Math.min(800, message.x));
      player.y = Math.max(0, Math.min(600, message.y));
      player.lastActive = Date.now();
    });
    
    this.onMessage("chat", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      this.broadcast('chat', {
        playerId: client.sessionId,
        name: player.name,
        message: message.text,
        timestamp: Date.now()
      });
    });
    
    this.onMessage("plant_seed", (client, message) => {
      this.handlePlantSeed(client, message);
    });
    
    this.onMessage("ping", (client, message) => {
      client.send('pong', { timestamp: Date.now() });
    });
    
    // Set up game loop for updates every 100ms
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 100);
  }

  onJoin(client: Client, options: any) {
    console.log(`👋 ${client.sessionId} joined the game`);
    
    // Create a new player
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name || `Player ${client.sessionId.substr(0, 6)}`;
    player.x = Math.random() * 800; // Random spawn position
    player.y = Math.random() * 600;
    player.connected = true;
    
    // Load player data from database
    const dbPlayer = databaseService.getPlayer(client.sessionId, player.name);
    player.xp = dbPlayer.xp;
    
    // Add player to game state
    this.state.players.set(client.sessionId, player);
    
    // Send welcome message
    client.send('welcome', { 
      message: `Welcome ${player.name}! There are ${this.state.players.size} players online.`,
      playerId: client.sessionId 
    });
    
    // Broadcast to all other clients
    this.broadcast('player-joined', { 
      playerId: client.sessionId,
      name: player.name,
      totalPlayers: this.state.players.size
    }, { except: client });
  }


  onLeave(client: Client, consented: boolean) {
    console.log(`👋 ${client.sessionId} left the game`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
      
      // Remove player after 30 seconds
      setTimeout(() => {
        this.state.players.delete(client.sessionId);
        this.broadcast('player-left', { 
          playerId: client.sessionId,
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

  private loadCropsFromDatabase() {
    try {
      // Load all unharvested crops from database
      const allCrops = databaseService.db.prepare('SELECT * FROM crops WHERE harvested = FALSE').all();
      
      for (const dbCrop of allCrops) {
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
      
      console.log(`📦 Loaded ${allCrops.length} crops from database`);
    } catch (error) {
      console.error('❌ Error loading crops from database:', error);
    }
  }

  private handlePlantSeed(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      client.send('error', { message: 'Player not found' });
      return;
    }

    // Validate the plant seed request
    const { seedType, x, y, investmentAmount } = message;
    
    if (!seedType || typeof x !== 'number' || typeof y !== 'number' || !investmentAmount) {
      client.send('error', { message: 'Invalid plant seed request' });
      return;
    }

    // Check if position is already occupied
    if (databaseService.isPositionOccupied(x, y)) {
      client.send('error', { message: 'Position already occupied' });
      return;
    }

    // Define seed types and their properties
    const seedTypes = {
      'usdc_sprout': { minInvestment: 10, growthTime: 24 * 60 * 60 * 1000, xpGain: 1 }, // 24 hours
      'premium_tree': { minInvestment: 100, growthTime: 48 * 60 * 60 * 1000, xpGain: 10 }, // 48 hours
      'whale_forest': { minInvestment: 1000, growthTime: 72 * 60 * 60 * 1000, xpGain: 100 } // 72 hours
    };

    const seedConfig = seedTypes[seedType as keyof typeof seedTypes];
    if (!seedConfig) {
      client.send('error', { message: 'Invalid seed type' });
      return;
    }

    if (investmentAmount < seedConfig.minInvestment) {
      client.send('error', { message: `Minimum investment for ${seedType} is ${seedConfig.minInvestment} USDC` });
      return;
    }

    // Create crop in database
    const now = new Date().toISOString();
    const cropId = databaseService.saveCrop({
      player_id: client.sessionId,
      seed_type: seedType,
      x: x,
      y: y,
      planted_at: now,
      growth_time: seedConfig.growthTime,
      investment_amount: investmentAmount,
      harvested: false
    });

    // Create crop in game state
    const crop = new Crop();
    crop.id = cropId;
    crop.playerId = client.sessionId;
    crop.seedType = seedType;
    crop.x = x;
    crop.y = y;
    crop.plantedAt = now;
    crop.growthTime = seedConfig.growthTime;
    crop.investmentAmount = investmentAmount;
    crop.harvested = false;

    this.state.crops.set(cropId, crop);

    // Update player XP
    player.xp += seedConfig.xpGain;
    databaseService.updatePlayerXP(client.sessionId, player.xp);

    // Send success response
    client.send('seed_planted', {
      cropId: cropId,
      seedType: seedType,
      x: x,
      y: y,
      xpGained: seedConfig.xpGain,
      newXP: player.xp
    });

    // Broadcast to all players
    this.broadcast('crop_planted', {
      cropId: cropId,
      playerId: client.sessionId,
      playerName: player.name,
      seedType: seedType,
      x: x,
      y: y
    });
  }
}