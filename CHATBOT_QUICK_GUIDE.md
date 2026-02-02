# Alli Chatbot - Quick Reference Guide

> A simple guide to understanding and customizing the AI chatbot in Alli app

---

## 🤖 What AI Does the App Use?

The app uses **two AI services** that work together:

| Service | Purpose | When It's Used |
|---------|---------|---------------|
| **Novita AI** | Main chatbot brain | First choice for all questions |
| **RAG Endpoint** | Backup chatbot | Only if Novita fails or is unavailable |

**Think of it like this:** Novita is your primary assistant. If Novita is busy or down, RAG steps in as backup.

---

## 🌐 What is Portkey & How We Use It

**Portkey** is an AI gateway/router that can manage multiple LLM providers and handle fallbacks automatically. 

**Current Setup:**
- We're **NOT currently using Portkey** in the app
- Instead, we handle LLM routing manually in our code
- We use direct API calls to Novita AI with custom fallback logic

**How Our LLM Management Works:**

```
User Question
     ↓
Try Novita AI (Primary)
     ↓
  Success? → Return Response
     ↓ No
Try RAG Endpoint (Fallback)
     ↓
  Success? → Return Response
     ↓ No
Show Error Message
```

**If you want to add Portkey:**
1. Sign up at portkey.ai
2. Get your Portkey API key
3. Add to `.env`: `EXPO_PUBLIC_PORTKEY_API_KEY=<key>`
4. Modify the fetch calls to use Portkey's endpoint
5. Configure fallback providers in Portkey dashboard

---

## 🔄 How RAG, LLMs, and Fallback Work

### What is RAG?

**RAG = Retrieval-Augmented Generation**

It's a system that:
1. Searches your knowledge base (documents, FAQs, nutrition data)
2. Finds relevant information
3. Passes it to an LLM to generate a response

**Think of it like:** A librarian who looks up facts in books before answering your question.

### Our Current Architecture

```
┌─────────────────────────────────────────┐
│         User Asks Question              │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Step 1: Try Novita AI (Primary LLM)    │
│  - Uses: Your configured model          │
│  - Timeout: Default fetch timeout       │
│  - Success: Return answer to user       │
└─────────────────┬───────────────────────┘
                  ↓ (Only if failed)
┌─────────────────────────────────────────┐
│  Step 2: Try RAG Endpoint (Fallback)    │
│  - Uses: Custom RAG system              │
│  - Has: Nutrition knowledge base        │
│  - Success: Return answer to user       │
└─────────────────┬───────────────────────┘
                  ↓ (Only if both failed)
┌─────────────────────────────────────────┐
│  Step 3: Show Error                     │
│  "All assistants failed to respond"     │
└─────────────────────────────────────────┘
```

### Why This Approach?

| Feature | Benefit |
|---------|---------|
| **Primary LLM** | Fast, general AI knowledge |
| **RAG Fallback** | Specialized nutrition knowledge from your data |
| **Manual Control** | Full visibility into what's happening |
| **Cost Control** | Only pay for what you use |
| **Reliability** | If one fails, the other takes over |

### When Each System is Used

**Novita AI Used For:**
- ✅ General nutrition questions
- ✅ Meal planning advice
- ✅ Quick responses
- ✅ Conversational interactions

**RAG Endpoint Used For:**
- ✅ Backup when Novita is down
- ✅ Questions needing specific data
- ✅ Custom nutrition knowledge
- ✅ Emergency fallback

---

## ⚙️ How Everything is Configured

### Configuration Files Overview

| File | What It Stores | Example |
|------|----------------|---------|
| `.env` | API keys, URLs, secrets | `EXPO_PUBLIC_NOVITA_API_KEY=xxx` |
| `AlliScreen.tsx` | Voice chat settings & prompts | System prompt, temperature |
| `AlliChatScreen.tsx` | Text chat settings & prompts | System prompt, max_tokens |

### Configuration Hierarchy

```
1. Environment Variables (.env file)
      ↓
   Loaded at app startup
      ↓
2. Component Constants (in .tsx files)
      ↓
   Uses env vars OR defaults
      ↓
3. Runtime Settings (in functions)
      ↓
   Uses constants to make API calls
```

### Complete Configuration Map

**In `.env` file:**
```env
# Primary AI
EXPO_PUBLIC_NOVITA_API_URL=https://api.novita.ai/v3/...
EXPO_PUBLIC_NOVITA_API_KEY=nk-xxxxxxxxxxxxx
EXPO_PUBLIC_NOVITA_MODEL=meta-llama/llama-3.3-70b-instruct

# Fallback AI
EXPO_PUBLIC_RAG_FALLBACK_URL=https://your-rag-api.com/chat

# Voice Features (LiveKit)
EXPO_PUBLIC_LIVEKIT_URL=wss://alli-xxxxx.livekit.cloud
EXPO_PUBLIC_BACKEND_URL=http://your-backend:8003/start_call2
```

**In Code Files:**
```typescript
// These read from .env automatically
const NOVITA_API_URL = process.env.EXPO_PUBLIC_NOVITA_API_URL;
const NOVITA_API_KEY = process.env.EXPO_PUBLIC_NOVITA_API_KEY;
const NOVITA_MODEL = process.env.EXPO_PUBLIC_NOVITA_MODEL;
const RAG_FALLBACK_URL = process.env.EXPO_PUBLIC_RAG_FALLBACK_URL;
```

### Settings Reference Table

| Setting | Location | Default | What It Does |
|---------|----------|---------|--------------|
| `systemPrompt` | Both .tsx files | See personality section | AI's behavior rules |
| `temperature` | Both .tsx files | 0.3 | Response creativity |
| `max_tokens` | Both .tsx files | 800 | Response length |
| `reasoning` | Both .tsx files | false | Chain-of-thought mode |
| `model` | .env file | (varies) | Which AI model to use |

---

## 📋 How to Use Prompts as Default

### What are Default Prompts?

Default prompts are **system instructions** that tell the AI how to behave for EVERY conversation. They're automatically included with every user question.

### Current Default Prompt Location

**File:** `screens/AlliScreen.tsx` (line ~250)  
**File:** `components/AlliChatScreen.tsx` (line ~565)

### How to Change the Default Prompt

**Option 1: Edit Directly in Code (Simple)**

1. Open `screens/AlliScreen.tsx`
2. Find `const systemPrompt =`
3. Replace the text between backticks
4. Copy the SAME text to `components/AlliChatScreen.tsx`
5. Save both files
6. Restart app

**Option 2: Load from External File (Advanced)**

Create `prompts/default.txt`:
```
You are Alli, a friendly nutrition assistant...
(your prompt here)
```

Then in your code:
```typescript
import defaultPrompt from './prompts/default.txt';
const systemPrompt = defaultPrompt;
```

**Option 3: Environment Variable (Flexible)**

Add to `.env`:
```env
EXPO_PUBLIC_SYSTEM_PROMPT="You are Alli, a friendly nutritionist. Keep answers short and practical."
```

Then in code:
```typescript
const systemPrompt = process.env.EXPO_PUBLIC_SYSTEM_PROMPT || 
  "fallback prompt if env var not set";
```

### Default Prompt Best Practices

✅ **DO:**
- Keep it focused on one role/personality
- Use clear, simple language
- Include specific formatting instructions
- Set boundaries (what NOT to do)
- Make it 1-3 paragraphs max

❌ **DON'T:**
- Make it too long (AI might ignore parts)
- Change it without testing
- Use contradictory instructions
- Forget to update BOTH files

### Example Default Prompts

**Short & Simple:**
```typescript
const systemPrompt = "You are Alli, a nutrition assistant. Give short, practical advice in simple language. Be friendly and encouraging.";
```

**Medium Detail (Current):**
```typescript
const systemPrompt = `You are Alli, a friendly nutrition assistant.

Rules:
- Use simple, everyday language
- Give practical, actionable advice
- Be warm and encouraging
- Format with bullets and bold text
- Don't diagnose medical conditions`;
```

**Detailed (Full Current Version):**
```typescript
const systemPrompt = `You are Alli, a friendly and supportive nutrition assistant...
(See current code for full version)`;
```

### How Prompts Flow

```
Default System Prompt (Set Once)
         +
User's Question
         +
Previous Conversation History
         ↓
   Sent to AI Model
         ↓
   AI Response
         ↓
Displayed to User
```

---

## 📝 What's the Current AI Personality?

The AI is programmed to act like **Alli - a friendly nutrition assistant**.

**Current Instructions to AI:**
- Be friendly and supportive (not preachy)
- Use simple, everyday language (no medical jargon)
- Give practical, easy-to-follow advice
- Keep answers short and to the point
- Format nicely with bullets and bold text
- Never diagnose medical conditions

**Example Behavior:**
- ✅ Says "good fats" instead of "unsaturated fatty acids"
- ✅ Gives portion sizes like "handful" or "fist-sized"
- ✅ Celebrates small wins
- ✅ Suggests simple food swaps
- ❌ Doesn't shame food choices
- ❌ Doesn't give medical diagnoses

---

## ⚙️ Where Are the Settings?

All AI settings are in one file: **`.env`** (in the `alli/` folder)

### Required Settings:

```env
# Main AI
EXPO_PUBLIC_NOVITA_API_URL=<your novita url>
EXPO_PUBLIC_NOVITA_API_KEY=<your api key>
EXPO_PUBLIC_NOVITA_MODEL=<model name>

# Backup AI
EXPO_PUBLIC_RAG_FALLBACK_URL=<your backup url>
```

### ⚠️ Important Notes:
- Create the `.env` file if it doesn't exist
- Never commit this file to Git (contains secret keys)
- All variables must start with `EXPO_PUBLIC_`
- Restart the app after changing anything

---

## 🔧 How to Change the AI Personality

The AI personality is controlled by the **system prompt** - a set of instructions that tells the AI how to behave.

### Where to Change It:

**File:** `screens/AlliScreen.tsx`  
**Line:** Around 250  

**Look for:**
```typescript
const systemPrompt = 
`You are Alli, a friendly and supportive nutrition assistant...`
```

### Quick Personality Examples:

**Fitness Coach:**
```
You are a motivating fitness coach. Be energetic, encouraging, and focus on both nutrition and exercise. Keep it upbeat!
```

**Strict Nutritionist:**
```
You are a professional nutritionist. Give evidence-based advice with clear explanations. Be direct and informative.
```

**Meal Planning Expert:**
```
You are a meal prep specialist. Help users plan practical, easy-to-make meals. Focus on grocery lists and weekly planning.
```

**Casual Friend:**
```
You're a friend who knows a lot about healthy eating. Chat casually, use emojis occasionally, and make nutrition feel fun and easy.
```

---

## 🎛️ Quick Settings Explained

### Response Length

Controlled by: `max_tokens: 800`

| Setting | Result |
|---------|--------|
| 400 | Very short answers |
| 800 | Current (medium answers) |
| 1200 | Longer, detailed answers |

**Where:** Both chatbot files, search for `max_tokens`

### Response Consistency

Controlled by: `temperature: 0.3`

| Setting | Result |
|---------|--------|
| 0.0 | Always same answer (robotic) |
| 0.3 | Current (consistent but natural) |
| 0.7 | More variety and creativity |

**Where:** Both chatbot files, search for `temperature`

---

## 📱 Where Is the Chatbot Used?

The app has **2 different chatbot screens**:

### 1. AlliScreen.tsx (Voice Mode)
- Voice conversations with AI
- Text chat option
- Real-time transcriptions
- **Does NOT save** chat history

### 2. AlliChatScreen.tsx (Text Mode)  
- Full-screen text chat
- **Saves** conversation history to database
- Better for longer conversations
- Markdown formatting support

**Both use the same AI and settings!**

---

## 🆘 Common Tasks

### Change AI Provider

1. Get new API credentials
2. Update `.env` file with new URL and key
3. Restart app with `npx expo start --clear`

### Make Responses Shorter

1. Find `max_tokens: 800` in both files
2. Change to `max_tokens: 400`
3. Save and restart

### Make Responses More Consistent

1. Find `temperature: 0.3` in both files
2. Change to `temperature: 0.1`
3. Save and restart

### Add Backup AI

1. Get RAG endpoint URL
2. Add to `.env`: `EXPO_PUBLIC_RAG_FALLBACK_URL=<url>`
3. Restart app

### Change Quick Suggestions

**File:** `screens/AlliScreen.tsx`  
**Around line:** 738

Change this list:
```typescript
const suggestions = [
  "What should my meal plan be?",
  "How do I lose weight?",
  "Give me meal ideas",
  "What can you help me with?",
];
```

To whatever you want:
```typescript
const suggestions = [
  "Create a weekly meal plan",
  "Vegetarian protein sources",
  "Quick healthy breakfast ideas",
  "Snacks under 200 calories",
];
```


