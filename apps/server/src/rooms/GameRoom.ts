import { Room, Client } from "colyseus";
import { GameState, Player } from "../schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 10;

  onCreate(options: any) {
    this.setState(new GameState());
    
    console.log("🎮 GameRoom created with options:", options);
    
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
}