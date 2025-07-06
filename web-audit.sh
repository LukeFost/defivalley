#!/bin/bash

# 🎮 DeFi Valley Web Audit Setup Script
# Usage: ./web-audit.sh or /web-audit

echo "🎮 Setting up DeFi Valley Web Audit Environment..."

# 1. Clean up existing processes
echo "🧹 Cleaning up existing processes..."
tmux kill-server 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:2567 | xargs kill -9 2>/dev/null || true

# 2. Navigate to project directory
cd /Users/lukefoster/Documents/Development/defivalley

# 3. Start web server in tmux
echo "🌐 Starting web server (Next.js on port 3000)..."
tmux new-session -d -s defi-valley-web 'cd apps/web && pnpm dev'

# 4. Start game server in tmux  
echo "🎮 Starting game server (Colyseus on port 2567)..."
tmux new-session -d -s defi-valley-server 'cd apps/server && pnpm dev'

# 5. Wait for servers to start
echo "⏳ Waiting for servers to start..."
sleep 8

# 6. Check server status
echo "🔍 Checking server status..."
echo "=== Web Server (port 3000) ==="
tmux capture-pane -t defi-valley-web -p | tail -3
echo ""
echo "=== Game Server (port 2567) ==="
tmux capture-pane -t defi-valley-server -p | tail -3
echo ""

# 7. Show available URLs
echo "✅ Setup Complete! Available URLs:"
echo "   📱 Web App: http://localhost:3000"
echo "   🎮 Game Server: http://localhost:2567"  
echo "   🧪 Test Client: http://localhost:2567/test.html"
echo "   🔧 Colyseus Playground: http://localhost:2567/colyseus"
echo ""

# 8. Show tmux management commands
echo "🛠️ Tmux Management:"
echo "   View sessions: tmux list-sessions"
echo "   Attach to web: tmux attach-session -t defi-valley-web"
echo "   Attach to server: tmux attach-session -t defi-valley-server"
echo "   View web logs: tmux capture-pane -t defi-valley-web -p | tail -10"
echo "   View server logs: tmux capture-pane -t defi-valley-server -p | tail -10"
echo "   Kill sessions: tmux kill-session -t defi-valley-web"
echo ""

# 9. Show debug commands
echo "🐛 Browser Console Debug Commands:"
echo "   debugCharacters()     - Show character loading info"
echo "   resetMyCharacter()    - Reset character selection"
echo "   toggleDebugMode()     - Show/hide terrain debug overlay"
echo "   togglePhysicsDebug()  - Show/hide collision bounding boxes"
echo "   printTerrainLayout()  - Print terrain to console"
echo "   debugTilemap()        - Complete tilemap diagnostic"
echo "   testTileVisibility()  - Test basic tile rendering"
echo ""

echo "🚀 Ready for development and debugging!"
echo "🌱 Your simple grass farm background is live with invisible collision walls!"