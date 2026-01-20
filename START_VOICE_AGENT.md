# Starting the Voice Agent

The voice agent requires **TWO processes** to be running:

## 1. Backend Server (generates tokens)
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend
npm start
# or
node index.js
```

## 2. Voice Agent (listens and responds)
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent
npm install  # if you haven't already
node agent.js
```

## Process Flow

1. **React Native app** → calls `/voice-agent` endpoint to get token
2. **React Native app** → connects to LiveKit with token
3. **Agent process** → also connects to same LiveKit room
4. **User speaks** → audio is captured and sent to agent
5. **Agent** → transcribes speech, calls OpenAI API, generates response
6. **Agent** → speaks response back to user

## Environment Variables Required

Make sure your `.env` file in `/backend` has:
```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=your_openai_api_key
```

And `.env` in `/backend/agent` has:
```
LIVEKIT_URL=wss://voice-agent-saq96whw.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=your_openai_api_key
```

## Quick Start (Run Both Processes)

Terminal 1:
```bash
cd backend && npm start
```

Terminal 2:
```bash
cd backend/agent && node agent.js
```

Then connect from your React Native app!
