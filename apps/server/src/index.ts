import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import path from "path";
import { networkInterfaces } from "os";
import rateLimit from "express-rate-limit";
import { GameRoom } from "./rooms/GameRoom";
import { databaseService } from "./services/DatabaseService";
import { sanitizeWorldId, validatePagination } from "./utils/validation";
import { GameConfig } from "./config/GameConfig";

const port = Number(process.env.PORT || GameConfig.NETWORK_SERVER_PORT);
const app = express();
const gameServer = new Server({
  server: createServer(app)
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Add middleware for JSON parsing with size limit
app.use(express.json({ limit: '10mb' }));

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// API endpoint to get active worlds with pagination
app.get('/api/worlds', (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page as string, req.query.limit as string);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    
    const activeWorlds = databaseService.getActiveWorlds(limit, (page - 1) * limit, search);
    const totalWorlds = databaseService.getTotalWorldsCount(search);
    
    res.json({ 
      worlds: activeWorlds,
      pagination: {
        page,
        limit,
        total: totalWorlds,
        totalPages: Math.ceil(totalWorlds / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching active worlds:', error);
    res.status(500).json({ error: 'Failed to fetch active worlds' });
  }
});

// API endpoint to check if a world exists with input validation
app.get('/api/worlds/:worldId/exists', (req, res) => {
  try {
    const worldId = sanitizeWorldId(req.params.worldId);
    
    if (!worldId) {
      return res.status(400).json({ 
        error: 'Invalid world ID format',
        exists: false 
      });
    }
    
    const exists = databaseService.playerExists(worldId);
    res.json({ exists, worldId });
  } catch (error) {
    console.error(`❌ Error checking world existence:`, error);
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