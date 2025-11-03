#!/bin/bash

# Setup script for OpenAI Realtime Proxy Server

echo "🚀 Setting up OpenAI Realtime Proxy Server..."

# Navigate to proxy server directory
cd proxy-server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set environment variable
echo "🔑 Setting up environment..."
export OPENAI_API_KEY="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"

# Start the server
echo "🌟 Starting proxy server on port 3001..."
echo "📡 WebSocket endpoint: ws://localhost:3001/realtime"
echo "🔗 Health check: http://localhost:3001/health"
echo ""
echo "✅ Proxy server is running! You can now test the React Native app."
echo ""

npm start
