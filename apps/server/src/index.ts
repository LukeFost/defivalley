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

// Define the GameRoom
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