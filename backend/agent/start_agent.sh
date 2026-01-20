#!/bin/bash

# Start Python voice agent

cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent

echo "🚀 Starting Alli Python Voice Agent..."
echo ""

# Set environment variables
export LIVEKIT_URL=$(grep LIVEKIT_URL .env | cut -d '=' -f2)
export LIVEKIT_API_KEY=$(grep LIVEKIT_API_KEY .env | cut -d '=' -f2)
export LIVEKIT_API_SECRET=$(grep LIVEKIT_API_SECRET .env | cut -d '=' -f2)
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2)

echo "Configuration:"
echo "  LiveKit URL: $LIVEKIT_URL"
echo "  API Key: ${LIVEKIT_API_KEY:0:10}..."
echo ""

# Run the agent
python3 voice_agent.py
