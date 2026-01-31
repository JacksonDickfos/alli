const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
const jwtLib = require('jsonwebtoken');


// Use native fetch (Node 18+)

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
// const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { AccessToken } = require('livekit-server-sdk');


const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

app.use(cors());
app.use(express.json());
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// Novita AI proxy config (keep API key on server; do NOT put it in the mobile app)
const NOVITA_ENDPOINT =
  process.env.NOVITA_ENDPOINT || 'https://api.novita.ai/dedicated/v1/openai/chat/completions';
const NOVITA_API_KEY = process.env.NOVITA_API_KEY; // required
const NOVITA_MODEL = process.env.NOVITA_MODEL; // required
const BACKEND_API_KEY = process.env.BACKEND_API_KEY; // optional: if set, require x-api-key header

// System prompt for Alli - makes responses simple and human-friendly
// const ALLI_SYSTEM_PROMPT = `You are Alli, a friendly and supportive nutrition assistant. Your goal is to help people eat better and feel healthier.

// IMPORTANT RULES FOR HOW YOU RESPOND:

// 1. USE SIMPLE LANGUAGE
//    - Explain everything like you're talking to a friend who knows nothing about nutrition
//    - Avoid scientific words, medical terms, and jargon
//    - If you must use a technical term, explain it simply in parentheses
//    - Example: Say "good fats" instead of "unsaturated fatty acids"
//    - Example: Say "helps your body fight sickness" instead of "boosts immune function"

// 2. BE WARM AND ENCOURAGING
//    - Use a friendly, conversational tone
//    - Celebrate small wins and progress
//    - Never shame or judge food choices
//    - Be supportive, not preachy

// 3. GIVE PRACTICAL ADVICE
//    - Focus on easy, actionable tips people can actually do
//    - Suggest simple food swaps, not complete diet overhauls
//    - Consider that people are busy and may not cook elaborate meals
//    - Give specific examples and portion sizes in everyday terms (like "a handful" or "about the size of your fist")

// 4. FORMAT FOR EASY READING
//    - Use short paragraphs
//    - Use bullet points for lists
//    - Bold important points
//    - Break up long explanations into digestible chunks

// 5. BE HONEST AND SAFE
//    - Don't diagnose medical conditions
//    - Recommend seeing a doctor for health concerns
//    - Acknowledge when something is debated or uncertain
//    - Don't promise specific results

// Remember: Your user might be confused, overwhelmed, or just starting their health journey. Make nutrition feel approachable and doable, not complicated or scary.`;



// const ALLI_SYSTEM_PROMPT = `You are Alli, a friendly and supportive nutrition assistant.

// Your job is to help people eat better and feel healthier in a simple, encouraging way.
// You should ALWAYS respond with a helpful text answer.

// Guidelines for your responses:

// • Use simple, everyday language, like talking to a friend.
// • Avoid medical or scientific terms when possible.
// • If a technical word is needed, explain it simply in parentheses.
// • Be warm, kind, and supportive. Never shame or judge food choices.
// • Focus on small, realistic tips that are easy to try.
// • Suggest simple food swaps and quick meals.
// • Use everyday portion sizes (like “a handful” or “about the size of your fist”).
// • Keep advice practical for busy people.

// Formatting:
// • Use short paragraphs.
// • Use bullet points when helpful.
// • Bold important points.

// Safety:
// • Do not diagnose medical conditions.
// • Do not promise specific health results.
// • Encourage seeing a doctor for serious concerns.

// If the user is unsure or overwhelmed, reassure them and keep things simple.
// `






const ALLI_SYSTEM_PROMPT = `
You are Alli, a friendly and supportive nutrition assistant.

Your job is to help people eat better and feel healthier in a simple, encouraging way.
You should ALWAYS respond with a helpful text answer.

In addition, act as a highly experienced, university-qualified, evidence-based dietitian
trained to international standards (such as USA or Australia), while staying within safe,
non-diagnostic boundaries.

━━━━━━━━━━━━━━
GUIDELINES FOR YOUR RESPONSES
━━━━━━━━━━━━━━

• Use simple, everyday language, like talking to a friend.
• Avoid medical or scientific terms when possible.
• If a technical word is needed, explain it simply (in parentheses).
• Be warm, kind, and supportive. Never shame or judge food choices.
• Focus on small, realistic tips that are easy to try.
• Suggest simple food swaps and quick meals.
• Use everyday portion sizes (like “a handful” or “about the size of your fist”).
• Keep advice practical for busy people.

━━━━━━━━━━━━━━
QUESTION-ASKING BEHAVIOUR
━━━━━━━━━━━━━━

• Ask the questions you need to fully understand the user before creating a nutrition plan.
• **Only ask ONE question at a time.**
• Do not stop asking questions until:
  – the user tells you to stop, OR  
  – you have all the information needed to create the plan.
• Only ask questions that are relevant to formulating the plan.
• If the user says something unclear or not definitive:
  – politely double-check the specific assumption you are unsure about
  – then continue.
• If the user says they are not comfortable answering a question:
  – respect that immediately
  – briefly explain how missing that information may make the plan less personalised
  – then move on.

• Stay professional in all questions and reactions, while remaining friendly,
  supportive, and true to your personality.
• Build rapport throughout the conversation using warmth, humour, and empathy.

━━━━━━━━━━━━━━
FORMATTING
━━━━━━━━━━━━━━

• Use short paragraphs.
• Use bullet points when helpful.
• **Bold important points.**

━━━━━━━━━━━━━━
SAFETY
━━━━━━━━━━━━━━

• Do not diagnose medical conditions.
• Do not promise specific health results.
• Do not prescribe medication or supplements.
• Encourage seeing a doctor or qualified professional for serious concerns.

━━━━━━━━━━━━━━
EVIDENCE & NEUTRALITY
━━━━━━━━━━━━━━

• Base advice on current, evidence-based nutrition research.
• Do not show bias toward any specific diet or way of eating unless supported by evidence.

━━━━━━━━━━━━━━
OVERWHELM HANDLING
━━━━━━━━━━━━━━

• If the user is unsure or overwhelmed:
  – reassure them
  – keep things simple
  – slow the pace.

━━━━━━━━━━━━━━
VOICE / DELIVERY NOTES (for voice use)
━━━━━━━━━━━━━━

• Tone should be warm, inviting, motivating, and engaging.
• Cadence should sound natural and conversational.
• Accent inspiration: Northern Beaches, Sydney, Australia.
• Any background noise should be soft, subtle, and relevant to the setting.
`;


// In-memory user store (for demo; use a DB in production)
const users = [];

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists.' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.json({ message: 'User registered successfully.' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwtLib.sign({ email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token });
});

app.get('/message', (req, res) => {
  res.json({ message: 'Hello from your backend API!' });
});

// Chat proxy endpoint




// OpenAI Chat
// app.post('/chat', async (req, res) => {
//   try {
//     console.log('📨 /chat endpoint hit');
//     console.log('📝 Request headers:', req.headers);
//     console.log('📝 Request body:', req.body);

//     // --- API key check ---
//     if (BACKEND_API_KEY) {
//       const clientKey = req.header('x-api-key');
//       console.log('🔑 Backend API key required, client sent key:', clientKey);
//       if (!clientKey || clientKey !== BACKEND_API_KEY) {
//         console.warn('❌ Unauthorized access attempt');
//         return res.status(401).json({ error: 'Unauthorized' });
//       }
//       console.log('✅ Backend API key validated');
//     }

//     const { messages, temperature, max_tokens } = req.body || {};
//     console.log('💬 Received messages count:', Array.isArray(messages) ? messages.length : 0);

//     if (!Array.isArray(messages) || messages.length === 0) {
//       console.warn('❌ messages[] missing or empty');
//       return res.status(400).json({ error: 'messages[] is required' });
//     }

//     // --- Ensure system prompt exists ---
//     const hasSystem = messages.some(m => m.role === 'system');
//     const finalMessages = hasSystem
//       ? messages
//       : [{ role: 'system', content: ALLI_SYSTEM_PROMPT }, ...messages];
//     console.log('📝 Total messages sent to OpenAI:', finalMessages.length);

//     // --- Call OpenAI ---
//     console.log('🔗 Sending request to OpenAI with model:', process.env.OPENAI_MODEL || 'gpt-4o-mini');
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
//       messages: finalMessages,
//       temperature: typeof temperature === 'number' ? temperature : 0.3,
//       max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
//     });

//     console.log('📥 OpenAI response received');
//     const content = completion.choices[0]?.message?.content || '';
//     console.log('📝 AI content length:', content.length);

//     res.json({
//       message: {
//         role: 'assistant',
//         content,
//       },
//       usage: completion.usage,
//     });

//     console.log('✅ Response sent to client successfully');
//   } catch (err) {
//     console.error('❌ OpenAI chat error:', err);
//     res.status(500).json({
//       error: 'OpenAI request failed',
//       details: err.message,
//     });
//   }
// });


// Body: { messages: [{ role: 'user'|'assistant'|'system', content: string }], ...optional params }
app.post('/chat', async (req, res) => {
  try {
    console.log('📨 Received /chat request');

    if (BACKEND_API_KEY) {
      const clientKey = req.header('x-api-key');
      if (!clientKey || clientKey !== BACKEND_API_KEY) {
        console.log('❌ Unauthorized: Invalid API key');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    if (!NOVITA_API_KEY || !NOVITA_MODEL) {
      console.log('❌ Server not configured - missing NOVITA_API_KEY or NOVITA_MODEL');
      return res.status(500).json({
        error:
          'Server not configured. Set NOVITA_API_KEY and NOVITA_MODEL environment variables.',
      });
    }

    console.log('✅ API keys validated');
    console.log('🔧 Model:', NOVITA_MODEL);

    const { messages, max_tokens, temperature } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }

    // Prepend system prompt if not already present
    const hasSystemPrompt = messages.some(m => m.role === 'system');
    const messagesWithSystem = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: ALLI_SYSTEM_PROMPT }, ...messages];

    const payload = {
      model: NOVITA_MODEL,
      messages: messagesWithSystem,
      temperature: typeof temperature === 'number' ? temperature : 0.3,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
      reasoning: { enabled: false },
    };

    console.log('📤 Sending request to Novita AI...');
    console.log('🔗 Endpoint:', NOVITA_ENDPOINT);
    console.log('💬 Messages count:', messagesWithSystem.length);

    const nvRes = await fetch(NOVITA_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NOVITA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Received response from Novita AI');
    console.log('📊 Status:', nvRes.status, nvRes.statusText);

    const data = await nvRes.json().catch(() => ({}));

    if (!nvRes.ok) {
      console.log('❌ Novita AI error:', data);
      return res.status(nvRes.status).json({
        error: data?.error?.message || data?.error || 'Novita AI request failed',
        details: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content ?? '';
    console.log('✅ Response received successfully');
    console.log('📝 Content length:', content.length);

    return res.json({
      message: { role: 'assistant', content },
      usage: data?.usage,
      raw: data,
    });
  } catch (err) {
    console.error('❌ Chat proxy error:', err);
    console.error('Error details:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
// Voice Agent Backend Endpoint
// Voice Agent Backend Endpoint
app.post('/voice-agent', async (req, res) => {
  try {
    console.log('📦 Request body:', req.body); // Debug: see what's in body
    console.log('📦 Request headers:', req.headers); // Debug: check content-type
    console.log('🔑 LIVEKIT_API_KEY exists:', !!LIVEKIT_API_KEY);
    console.log('🔑 LIVEKIT_API_SECRET exists:', !!LIVEKIT_API_SECRET);

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('❌ Missing LiveKit credentials');
      return res.status(500).json({ error: 'LiveKit not configured' });
    }

    const { roomName, participantName } = req.body;

    console.log('📝 Request body:', { roomName, participantName });

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName required' });
    }

    // const roomService = new RoomServiceClient(
    //   process.env.LIVEKIT_URL,
    //   process.env.LIVEKIT_API_KEY,
    //   process.env.LIVEKIT_API_SECRET
    // );

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: participantName,
        ttl: 60 * 60, // 1 hour
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    // 2️⃣ DISPATCH AGENT JOB (THIS IS MISSING)
    // await roomService.dispatchAgentJob({
    //   room: roomName,
    //   agentName: "", // default agent
    // });


    const jwt = await token.toJwt();

    console.log('✅ LiveKit token generated:', jwt.slice(0, 30) + '...');

    res.json({ token: jwt });

  } catch (err) {
    console.error('❌ LiveKit token error:', err);
    console.error('❌ Error details:', err.message); // More detailed error
    console.error('❌ Error stack:', err.stack); // Full stack trace
    res.status(500).json({
      error: 'Token generation failed',
      details: err.message // Include error message in response
    });
  }
});

// Voice response endpoint - processes text and returns AI response
app.post('/voice-response', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    console.log('📝 Voice message received:', message);

    // Call Python agent for response
    const response = await fetch('http://localhost:3002/process-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Python agent error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🤖 Agent response:', data.response);

    res.json({ response: data.response });
  } catch (err) {
    console.error('❌ Voice response error:', err.message);
    res.status(500).json({ error: 'Failed to process voice message' });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

// Export for Vercel
module.exports = app; 