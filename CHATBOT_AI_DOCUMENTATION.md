# Chatbot AI Configuration Guide

## Overview

This document describes the AI models, system prompts, and fallback systems used in the Alli mobile app's chatbot functionality. The app has **two different chatbot implementations**:

1. **AlliScreen.tsx** - Voice-enabled chat with real-time conversation
2. **AlliChatScreen.tsx** - Text-based chat with conversation history (uses Supabase)

Both implementations share the same AI infrastructure and fallback logic.

---

## AI Models & APIs

### Primary AI: Novita API

The app primarily uses **Novita AI** as its main language model provider.

**Configuration:**
- **API URL**: Configured via `EXPO_PUBLIC_NOVITA_API_URL`
- **API Key**: Configured via `EXPO_PUBLIC_NOVITA_API_KEY`
- **Model**: Configured via `EXPO_PUBLIC_NOVITA_MODEL`

**API Request Format:**
```json
{
  "model": "<NOVITA_MODEL>",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user", "content": "<user message>" },
    { "role": "assistant", "content": "<AI response>" }
  ],
  "temperature": 0.3,
  "max_tokens": 800,
  "reasoning": { "enabled": false }
}
```

**Response Format:**
```json
{
  "choices": [
    {
      "message": {
        "content": "AI response text here"
      }
    }
  ]
}
```

**Location in Code:**
- `screens/AlliScreen.tsx` (lines 42-44, 263-280)
- `components/AlliChatScreen.tsx` (lines 48-50, 572-591)

---

### Fallback AI: RAG Endpoint

If the Novita API fails or returns empty content, the app automatically falls back to a **RAG (Retrieval-Augmented Generation)** endpoint.

**Configuration:**
- **API URL**: Configured via `EXPO_PUBLIC_RAG_FALLBACK_URL`

**API Request Format:**
```json
{
  "input": "<user question only>"
}
```

**Response Format (flexible):**
The RAG endpoint can return responses in multiple formats. The app checks for these fields in order:
```json
{
  "output": "response text",      // Priority 1
  "response": "response text",    // Priority 2
  "text": "response text",         // Priority 3
  "message": "response text"      // Priority 4
}
```

Or simply a string response.

**Location in Code:**
- `screens/AlliScreen.tsx` (lines 45, 293-308)
- `components/AlliChatScreen.tsx` (lines 51, 595-611)

---

## System Prompts

### Current System Prompt

Both chatbot implementations use the **same system prompt**:

```
"you are a specialized nutritionist, give short answers about the questions user asks"
```

**Location in Code:**
- `screens/AlliScreen.tsx` (line 250)
- `components/AlliChatScreen.tsx` (line 565)

### Purpose & Characteristics

- **Role**: Nutritionist specialist
- **Behavior**: Provides concise, short answers
- **Context**: User questions are nutrition-focused
- **Tone**: Professional and helpful

---

## How to Change Configuration

### Method 1: Environment Variables (Recommended)

Create or modify a `.env` file in the `alli/` directory:

```bash
# Novita AI Configuration
EXPO_PUBLIC_NOVITA_API_URL=https://api.novita.ai/v3/openai/chat/completions
EXPO_PUBLIC_NOVITA_API_KEY=your_api_key_here
EXPO_PUBLIC_NOVITA_MODEL=gpt-3.5-turbo

# Fallback RAG Configuration
EXPO_PUBLIC_RAG_FALLBACK_URL=https://your-rag-endpoint.com/api/chat
```

**Note**: All environment variables must start with `EXPO_PUBLIC_` to be accessible in the React Native code.

### Method 2: Direct Code Modification

If you need to hardcode values (not recommended for production):

**File: `screens/AlliScreen.tsx`**
```typescript
// Lines 42-45
const NOVITA_API_URL = 'https://your-api-url.com';
const NOVITA_API_KEY = 'your-api-key';
const NOVITA_MODEL = 'your-model-name';
const RAG_FALLBACK_URL = 'https://your-fallback-url.com';
```

**File: `components/AlliChatScreen.tsx`**
```typescript
// Lines 48-51
const NOVITA_API_URL = 'https://your-api-url.com';
const NOVITA_API_KEY = 'your-api-key';
const NOVITA_MODEL = 'your-model-name';
const RAG_FALLBACK_URL = 'https://your-fallback-url.com';
```

### Method 3: Changing System Prompt

**File: `screens/AlliScreen.tsx`**
```typescript
// Line 250 in sendMessage function
const systemPrompt = "Your custom system prompt here";
```

**File: `components/AlliChatScreen.tsx`**
```typescript
// Line 565 in sendMessage function
const systemPrompt = "Your custom system prompt here";
```

**System Prompt Examples:**

For a fitness coach:
```typescript
const systemPrompt = "You are an experienced fitness coach specializing in nutrition and exercise. Provide motivating, actionable advice in a friendly tone.";
```

For detailed explanations:
```typescript
const systemPrompt = "You are a knowledgeable nutritionist. Provide detailed, evidence-based answers with scientific explanations when appropriate.";
```

For meal planning focus:
```typescript
const systemPrompt = "You are a meal planning specialist. Help users create balanced, healthy meal plans tailored to their dietary needs and preferences.";
```

---

## Fallback System Flow

### Request Flow Diagram

```
User sends message
        ↓
1. Try Novita API
        ↓
   ┌────┴────┐
   │         │
Success   Failure
   │         │
   │         ↓
   │    2. Try RAG Endpoint
   │         ↓
   │    ┌────┴────┐
   │    │         │
   │  Success  Failure
   │    │         │
   └────┴─────────┴──→ Display response or error
```

### Detailed Logic

**Step 1: Novita API Attempt**
```typescript
try {
  const res = await fetch(NOVITA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOVITA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: NOVITA_MODEL,
      messages: messagesToSend,
      temperature: 0.3,
      max_tokens: 800
    })
  });

  if (res.ok) {
    assistantText = response.choices[0].message.content;
  }
} catch (error) {
  // Falls through to Step 2
}
```

**Step 2: RAG Fallback** (only if Step 1 fails or returns empty)
```typescript
if (!assistantText && RAG_FALLBACK_URL) {
  try {
    const ragRes = await fetch(RAG_FALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: question })
    });

    if (ragRes.ok) {
      const ragJson = await ragRes.json();
      assistantText = ragJson.output || ragJson.response || 
                     ragJson.text || ragJson.message || '';
    }
  } catch (ragErr) {
    // Final failure
  }
}
```

**Step 3: Error Handling**
```typescript
if (!assistantText) {
  throw new Error('All assistants failed to respond. Please try again later.');
}
```

### When Fallback Triggers

The RAG endpoint is used when:
- ✅ Novita API returns HTTP error (non-200 status)
- ✅ Novita API throws exception (network error, timeout)
- ✅ Novita API returns empty/invalid response
- ✅ Novita API URL/Key not configured

The RAG endpoint is **NOT** used when:
- ❌ Novita API succeeds with valid response
- ❌ RAG_FALLBACK_URL is not configured

---

## API Parameters Explained

### Temperature (0.3)

Controls randomness in responses:
- **0.0**: Deterministic, always same answer
- **0.3**: Current setting - slightly creative but mostly consistent
- **1.0**: Very creative and varied responses

**To change:**
```typescript
// In both AlliScreen.tsx and AlliChatScreen.tsx
body: JSON.stringify({
  temperature: 0.5,  // Adjust between 0.0 and 2.0
  // ... other params
})
```

### Max Tokens (800)

Maximum length of AI response:
- **800**: Current setting - moderate length responses
- Approximately 600-700 words
- Prevents overly long responses

**To change:**
```typescript
body: JSON.stringify({
  max_tokens: 1200,  // Increase for longer responses
  // ... other params
})
```

### Reasoning (disabled)

Some models support reasoning mode for complex problems:
- **false**: Current setting - direct answers
- **true**: Would enable chain-of-thought reasoning

---

## Configuration Files

### Environment Files

The app loads environment variables from:
1. `.env` (root of `alli/` directory) - **Create this file**
2. Environment variable precedence in Expo

**Example `.env` file:**
```bash
# AI Configuration
EXPO_PUBLIC_NOVITA_API_URL=https://api.novita.ai/v3/openai/chat/completions
EXPO_PUBLIC_NOVITA_API_KEY=nk-xxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_NOVITA_MODEL=meta-llama/llama-3.3-70b-instruct
EXPO_PUBLIC_RAG_FALLBACK_URL=https://your-backup-api.com/chat

# LiveKit Configuration (for voice mode)
EXPO_PUBLIC_LIVEKIT_URL=wss://alli-h8mq663x.livekit.cloud
EXPO_PUBLIC_BACKEND_URL=http://62.72.35.123:8003/start_call2
```

### After Changing Environment Variables

**Restart the development server:**
```bash
# Stop current server (Ctrl+C)

# Clear cache and restart
npx expo start --clear

# Or
npm start -- --clear
```

---

## Quick Prompts & User Experience

### AlliChatScreen Quick Prompts

Pre-defined quick prompts to help users get started:

```typescript
const QUICK_PROMPTS = [
  'What should I eat for breakfast?',
  'Help me plan a healthy meal',
  'How can I lose weight safely?',
  'What are good protein sources?',
];
```

**Location**: `components/AlliChatScreen.tsx` (lines 55-60)

**To add more prompts:**
```typescript
const QUICK_PROMPTS = [
  'What should I eat for breakfast?',
  'Help me plan a healthy meal',
  'How can I lose weight safely?',
  'What are good protein sources?',
  'Create a vegetarian meal plan',      // NEW
  'How much water should I drink?',     // NEW
  'Best post-workout snacks?',          // NEW
];
```

### AlliScreen Quick Suggestions

Different set for the voice-enabled screen:

```typescript
const suggestions = [
  "What should my meal plan be?",
  "How do I lose weight?",
  "Give me meal ideas",
  "What can you help me with?",
];
```

**Location**: `screens/AlliScreen.tsx` (lines 696-701)

---

## Conversation History (AlliChatScreen only)

### Supabase Integration

**AlliChatScreen** stores conversation history in Supabase:

**Tables Used:**
- `alli_ai_conversations` - Stores conversation metadata
- `alli_ai_messages` - Stores individual messages

**Configuration:**
Supabase credentials are configured in `lib/supabase.ts`

**Note**: AlliScreen (voice mode) does **NOT** persist conversations to database - they are only stored in React state during the session.

---

## Testing the AI Configuration

### Test Novita API

```typescript
// Quick test in browser console or Postman
fetch('https://api.novita.ai/v3/openai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct',
    messages: [
      { role: 'system', content: 'You are a nutritionist.' },
      { role: 'user', content: 'What should I eat for breakfast?' }
    ],
    temperature: 0.3,
    max_tokens: 800
  })
})
.then(r => r.json())
.then(data => console.log(data))
```

### Test RAG Fallback

```typescript
fetch('YOUR_RAG_ENDPOINT_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: 'What are good protein sources?' })
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## Troubleshooting

### Issue: "All assistants failed to respond"

**Causes:**
1. Both Novita and RAG endpoints are down
2. Invalid API keys
3. Network connectivity issues
4. API rate limits exceeded

**Solutions:**
1. Check `.env` file exists and has correct values
2. Verify API keys are valid
3. Test API endpoints independently
4. Check console logs for specific error messages

### Issue: Responses are too long/short

**Solution:** Adjust `max_tokens` parameter
```typescript
max_tokens: 1200,  // For longer responses
max_tokens: 400,   // For shorter responses
```

### Issue: Responses are inconsistent

**Solution:** Lower `temperature` parameter
```typescript
temperature: 0.1,  // More consistent
temperature: 0.0,  // Completely deterministic
```

### Issue: App not using fallback

**Check:**
1. `EXPO_PUBLIC_RAG_FALLBACK_URL` is set in `.env`
2. Novita API is actually failing (check console logs)
3. RAG endpoint is accessible and returning valid JSON

### Issue: Changes not reflecting

**Solution:**
1. Restart Expo server with `--clear` flag
2. Clear app cache on device/emulator
3. Verify `.env` file is in correct location (`alli/` directory)

---

## Best Practices

### Security
- ✅ **NEVER** commit `.env` file to version control
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables for all API keys
- ❌ Don't hardcode API keys in source code

### Performance
- ✅ Keep `max_tokens` reasonable (400-1200)
- ✅ Use `temperature` 0.2-0.5 for consistent responses
- ✅ Implement fallback systems for reliability

### User Experience
- ✅ Show typing indicators while waiting for response
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Provide quick prompt suggestions for new users

---

## Summary

### Current Configuration

| Component | Value |
|-----------|-------|
| **Primary AI** | Novita API (OpenAI-compatible) |
| **Fallback AI** | Custom RAG endpoint |
| **System Prompt** | "you are a specialized nutritionist, give short answers about the questions user asks" |
| **Temperature** | 0.3 (slightly creative) |
| **Max Tokens** | 800 (moderate length) |
| **Reasoning** | Disabled |

### Key Files

| File | Purpose |
|------|---------|
| `screens/AlliScreen.tsx` | Voice-enabled chat implementation |
| `components/AlliChatScreen.tsx` | Text chat with history |
| `.env` | Environment configuration (**create this**) |
| `lib/supabase.ts` | Database configuration |

### Quick Reference Commands

```bash
# Start with cleared cache
npx expo start --clear

# Test environment variables are loaded
# Check console output when app starts
```

---

*Last Updated: February 2, 2026*
*Document Version: 1.0*
