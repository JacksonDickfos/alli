# Alli Voice Agent - Python Setup Guide

## Architecture

The voice agent now uses **Python** for AI processing:

```
React Native App
    ↓
Node.js Backend (port 3001)
    ↓
Python Voice Server (port 3002)
    ↓
OpenAI API
```

## Setup

### 1. Install Python Dependencies

```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent
python3 -m pip install -r requirements.txt
```

### 2. Ensure OpenAI API Key is Set

Edit `/Volumes/Muhammad Abdullah Baig/Projects/alli/backend/agent/.env`:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

## Running the System

### Terminal 1: Node.js Backend

```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend
npm start
```

Expected output:
```
Backend server running on http://localhost:3001
```

### Terminal 2: Python Voice Server

```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent
python3 voice_server.py
```

Expected output:
```
🚀 Starting Alli Python Voice Agent Server...
📍 Listening on http://localhost:3002
```

### Terminal 3: React Native App

```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli
npm start
```

## Testing

### 1. Test Python Server Health

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{"status": "ok"}
```

### 2. Test Voice Response

```bash
curl -X POST http://localhost:3002/process-voice \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I eat for breakfast?"}'
```

Expected response:
```json
{"response": "Some great breakfast options..."}
```

### 3. Test Full Flow

In your React Native app:
1. Tap "Connect"
2. Wait for "Connected" status
3. Speak a message
4. Listen for response

## Logs to Watch

### Backend Logs (Terminal 1)
- ✅ `Backend server running` - Backend ready
- 📝 `Request body: { message: ... }` - Voice request received

### Python Server Logs (Terminal 2)
- 🚀 `Starting Alli Python Voice Agent Server` - Server started
- 📝 `Processing message:` - Message received
- 🤖 `Agent response:` - Response generated

### App Logs (Terminal 3)
- ✅ `Room connected` - App connected to LiveKit
- ✅ `LiveKit connection successful` - Ready to send audio

## Quick Start (Copy & Paste)

**Terminal 1:**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend && npm start
```

**Terminal 2:**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent && python3 voice_server.py
```

**Terminal 3:**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli && npm start
```

Then open the app and click Connect!

## Troubleshooting

### Python server not starting
- Check Python version: `python3 --version` (should be 3.9+)
- Check OpenAI key: `echo $OPENAI_API_KEY`

### App not getting responses
- Verify both ports are open: `curl localhost:3001` and `curl localhost:3002/health`
- Check backend logs for errors
- Check Python server logs for OpenAI errors

### OpenAI API errors
- Verify API key in `.env`
- Check API key is valid: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

## File Structure

```
backend/
  ├── index.js                 # Node.js backend + /voice-agent endpoint
  ├── .env                     # Backend config
  └── agent/
      ├── voice_server.py      # Python Flask server (NEW)
      ├── voice_agent.py       # Simple Python agent (reference)
      ├── requirements.txt     # Python dependencies
      ├── .env                 # Python config
      └── package.json         # Node.js config (legacy)
```
