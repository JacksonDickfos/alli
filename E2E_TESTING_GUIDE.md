# End-to-End Voice Agent Testing Guide

## Current Setup Status ✅

### Environment Variables
- **Agent .env**: ✅ Has OpenAI API key configured
- **Backend .env**: ✅ Has LiveKit credentials
- **LiveKit URL**: wss://voice-agent-saq96whw.livekit.cloud
- **API Keys**: All configured

### Components
1. **Backend Server** (`/backend/index.js`) - Generates LiveKit tokens
2. **Voice Agent Worker** (`/backend/agent/index.js`) - Listens and responds
3. **React Native App** (`/components/VoiceAgent.tsx`) - User interface

---

## Step-by-Step End-to-End Test

### ✅ Step 1: Start Backend Server

**Terminal 1:**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend
npm start
```

**Expected Output:**
```
Backend server running on http://localhost:3001
```

**Verify:** The backend is listening on port 3001

---

### ✅ Step 2: Start Voice Agent Worker

**Terminal 2:**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent
node index.js
```

**Expected Output:**
```
🚀 Starting LiveKit voice agent worker...
✅ Worker context initialized
```

**The agent should now be:**
- Connecting to LiveKit at wss://voice-agent-saq96whw.livekit.cloud
- Waiting for participants to join the room
- Listening for speech input

---

### ✅ Step 3: Start Your React Native App

**Terminal 3 (or on your device):**
```bash
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli
npm start
# or for Expo
expo start
```

Then open the app in:
- iOS Simulator
- Android Emulator  
- Physical device

---

### ✅ Step 4: Test the Voice Connection

In your React Native app:

1. **Tap "Connect" button**
   - App requests token from backend
   - App joins LiveKit room
   
   **Check Terminal 1 output:**
   ```
   📤 Sending request to: http://10.0.2.2:3001/voice-agent
   ✅ Received data: { token: "eyJ..." }
   ✅ LiveKit connection successful
   ```

2. **Check Agent Status (Terminal 2)**
   - Look for: `🎤 Agent session started`
   - This means agent detected you joined

3. **Speak into your device microphone**
   - Say something like: "Hello Alli" or "How are you?"
   
   **Check Agent Terminal output:**
   ```
   📝 User said: "Hello Alli"
   🤖 Agent response: "Hello! I'm Alli, your nutrition assistant..."
   ```

4. **Listen for agent response**
   - The agent should speak back to you through your device speaker
   - Response comes from OpenAI GPT-4o-mini

---

## Testing Checklist

### Backend Tests
- [ ] Backend server starts without errors
- [ ] Backend responds to requests on port 3001
- [ ] Token generation works (check `/voice-agent` endpoint)

### Agent Tests
- [ ] Agent worker starts and connects to LiveKit
- [ ] Agent shows "Worker context initialized"
- [ ] Agent shows "Agent session started" when app connects

### Integration Tests
- [ ] React Native app connects successfully
- [ ] App shows "Connected" status
- [ ] Speech is captured and sent to agent
- [ ] Agent receives user speech (check logs)
- [ ] Agent calls OpenAI API
- [ ] Agent speaks response back

### Full E2E Test
- [ ] User speaks → Agent hears it
- [ ] Agent processes → Calls OpenAI
- [ ] Agent responds → User hears response

---

## Troubleshooting

### Agent Not Responding?

**Check 1: Is agent running?**
```bash
ps aux | grep "node index.js"
```

**Check 2: Review agent logs for errors:**
```
❌ Agent session error
❌ OpenAI API error
```

**Check 3: Test backend token generation:**
```bash
curl -X POST http://localhost:3001/voice-agent \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "voice-agent-room",
    "participantName": "test-user"
  }'
```

Expected response:
```json
{"token":"eyJ0eXAiOiJKV1QiLCJhbGc..."}
```

### App Not Connecting?

**Check 1: Backend is running**
```bash
curl http://localhost:3001/
```

**Check 2: Network access (Android)**
- Android emulator uses 10.0.2.2 to access host localhost
- Make sure backend is accessible

**Check 3: Microphone permissions**
- iOS: Check Settings → Privacy → Microphone
- Android: Grant RECORD_AUDIO permission

---

## Real-Time Monitoring

### Monitor Backend Requests
**Terminal 1:**
```
📤 Sending request to: http://10.0.2.2:3001/voice-agent
📥 Response status: 200
✅ Received data: {"token": "..."}
```

### Monitor Agent Activity
**Terminal 2:**
```
🎤 Agent session started: user-1234567890
✅ Agent connected to LiveKit room
📝 User said: "What should I eat for breakfast?"
🤖 Agent response: "Some great breakfast options..."
```

---

## Expected Flow Summary

```
User speaks
    ↓
React Native app captures audio
    ↓
Sends to LiveKit room
    ↓
Agent receives audio (WebRTC)
    ↓
Agent transcribes speech
    ↓
Agent calls OpenAI GPT-4o-mini
    ↓
Agent gets response from OpenAI
    ↓
Agent synthesizes response to speech
    ↓
Agent sends audio back through LiveKit
    ↓
User hears agent response
```

---

## Success Indicators ✅

1. **Agent terminal shows:**
   - `🎤 Agent session started`
   - `📝 User said: "..."`
   - `🤖 Agent response: "..."`

2. **App terminal shows:**
   - `✅ LiveKit connection successful`
   - Connection status changes to "Connected"

3. **You hear:**
   - Agent greets you when connected
   - Agent responds to your speech
   - Responses are natural and helpful

---

## Start Fresh (All Processes)

```bash
# Terminal 1: Backend
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend && npm start

# Terminal 2: Agent
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli/backend/agent && node index.js

# Terminal 3: React Native App
cd /Volumes/Muhammad\ Abdullah\ Baig/Projects/alli && npm start
```

Then tap "Connect" in the app and start talking!
