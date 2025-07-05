import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import path from "path";
import { networkInterfaces } from "os";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);
const app = express();
const gameServer = new Server({
  server: createServer(app)
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Add middleware for JSON parsing
app.use(express.json());

// API endpoint to get active worlds
app.get('/api/worlds', (req, res) => {
  try {
    const { databaseService } = require('./services/DatabaseService');
    const activeWorlds = databaseService.getActiveWorlds();
    res.json({ worlds: activeWorlds });
  } catch (error) {
    console.error('❌ Error fetching active worlds:', error);
    res.status(500).json({ error: 'Failed to fetch active worlds' });
  }
});

// API endpoint to check if a world exists
app.get('/api/worlds/:worldId/exists', (req, res) => {
  try {
    const { databaseService } = require('./services/DatabaseService');
    const worldId = req.params.worldId;
    const exists = databaseService.playerExists(worldId);
    res.json({ exists, worldId });
  } catch (error) {
    console.error(`❌ Error checking world existence for ${req.params.worldId}:`, error);
    res.status(500).json({ error: 'Failed to check world existence' });
  }
});

// Define the GameRoom with dynamic room creation
// Room IDs will be based on world owner IDs (e.g., wallet addresses)
gameServer.define('world', GameRoom).filterBy(['worldOwnerId']);

// Keep backwards compatibility with generic 'game' room
gameServer.define('game', GameRoom);

// Get local IP address
function getLocalIP(): string {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start the server
gameServer.listen(port, '0.0.0.0');

const localIP = getLocalIP();
console.log(`🎮 Colyseus Server listening on http://0.0.0.0:${port}`);
console.log(`📱 Share this with local network users: http://${localIP}:${port}`);
console.log(`🔗 Playground available at: http://0.0.0.0:${port}/colyseus`);
console.log(`🧪 Test client available at: http://0.0.0.0:${port}/test.html`);
console.log(`🌐 Local network test client: http://${localIP}:${port}/test.html`);