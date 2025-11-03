# Voice AI Implementation Plan

## 🎯 Decision: Native iOS + OpenAI Chat API

**Rationale:**
- 10-24x cheaper than streaming solutions
- No proxy server needed (eliminates connection issues)
- Works natively on iOS
- Can implement today with existing packages
- Upgrade to streaming later if needed

---

## 📋 Implementation Steps

### Step 1: UI Redesign ✅ READY TO IMPLEMENT

**Changes to `AlliScreen.tsx`:**

1. **Remove**: Tap on Alli image to start voice
2. **Add**: Two buttons underneath Alli logo
   - Microphone button (start/listening state)
   - End/X button (stop voice mode)

**Button States:**
- **Microphone Button**:
  - Default: Gray with mic icon
  - Active: Green/blue with pulsing animation
  - Shows "Listening..." text when active
  
- **End Button**:
  - Always visible when voice mode is active
  - Gray/red with X icon
  - Stops recording and clears state

### Step 2: Create Simple Voice Service

**New File: `services/SimpleVoiceService.ts`**

```typescript
// Uses:
// 1. @react-native-voice for speech-to-text (iOS native)
// 2. OpenAI Chat API for AI responses (REST, no WebSocket)
// 3. react-native-tts for text-to-speech (iOS native)

// Flow:
// User taps mic → Start listening → Transcribe → Send to GPT → Get response → Speak
```

**Key Features:**
- No WebSocket complexity
- Simple REST API calls
- Works offline for recognition (iOS)
- Reliable and predictable

### Step 3: Replace OpenAI Realtime Service

**Remove:**
- `OpenAIRealtimeService.ts` (or keep for future)
- Proxy server dependency
- WebSocket connection logic

**Add:**
- `SimpleVoiceService.ts`
- Direct OpenAI Chat API calls
- Turn-based conversation (not streaming, but works perfectly)

### Step 4: Update AlliScreen

**Changes:**
1. Import `SimpleVoiceService` instead of `OpenAIRealtimeService`
2. Update button handlers
3. Simplify state management (no connection states)
4. Add visual feedback for listening/speaking

---

## 🏗️ Architecture

### Old (Complex):
```
App → Proxy Server → OpenAI Realtime WebSocket → Audio Stream
  ←─────────────────────────────────────────────────┘
```

### New (Simple):
```
App → iOS Speech Recognition → Text → OpenAI Chat API → Response Text → iOS TTS → Audio
```

**Benefits:**
- ✅ No proxy server
- ✅ No WebSocket issues
- ✅ Simpler debugging
- ✅ More reliable
- ✅ Much cheaper

---

## 📱 User Experience Flow

1. User sees Alli logo with mic and end buttons below
2. User taps **Microphone button**
3. Button turns green/blue, shows "Listening..."
4. User speaks their question
5. Speech is transcribed (real-time feedback)
6. Text sent to OpenAI
7. AI response displayed and spoken
8. User taps **End button** to stop or tap mic again for next question

**This is exactly how it works in most voice assistants!**

---

## 💰 Cost Savings

**Example: 100 users, 30 min/day each = 3,000 min/day**

| Solution | Daily Cost | Monthly Cost |
|----------|-----------|--------------|
| **New (Native)** | $15-75 | $450-2,250 |
| Old (Realtime API) | $180-360 | $5,400-10,800 |

**Savings: $3,150-8,550/month** 🎉

---

## 🚀 Next Steps

1. ✅ **I'll implement the UI redesign** (mic + end buttons)
2. ✅ **Create SimpleVoiceService** (native iOS approach)
3. ✅ **Update AlliScreen** to use new service
4. ✅ **Test and verify** it works reliably
5. ⏭️ **Optional**: Add streaming later if needed

**Should I proceed with implementation?**

