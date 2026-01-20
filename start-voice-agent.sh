#!/bin/bash

# Start voice agent backend and agent in parallel

PROJECT_DIR="/Volumes/Muhammad Abdullah Baig/Projects/alli"

echo "🚀 Starting Alli Voice Agent..."
echo ""

# Check if node_modules exist in backend
if [ ! -d "$PROJECT_DIR/backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$PROJECT_DIR/backend"
    npm install
fi

# Check if node_modules exist in agent
if [ ! -d "$PROJECT_DIR/backend/agent/node_modules" ]; then
    echo "📦 Installing agent dependencies..."
    cd "$PROJECT_DIR/backend/agent"
    npm install
fi

echo ""
echo "✅ Dependencies ready"
echo ""
echo "🔹 Starting backend server..."
cd "$PROJECT_DIR/backend"
npm start &
BACKEND_PID=$!

sleep 2

echo "🔹 Starting voice agent..."
cd "$PROJECT_DIR/backend/agent"
node agent.js &
AGENT_PID=$!

echo ""
echo "✅ Both processes started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Agent PID: $AGENT_PID"
echo ""
echo "Press Ctrl+C to stop all processes"
echo ""

# Wait for both processes
wait

echo "🛑 All processes stopped"
