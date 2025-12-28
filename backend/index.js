require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use native fetch (Node 18+)

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Fireworks proxy config (keep API key on server; do NOT put it in the mobile app)
const FIREWORKS_ENDPOINT =
  process.env.FIREWORKS_ENDPOINT || 'https://api.fireworks.ai/inference/v1/chat/completions';
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY; // required
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL; // required
const BACKEND_API_KEY = process.env.BACKEND_API_KEY; // optional: if set, require x-api-key header

// System prompt for Alli - makes responses simple and human-friendly
const ALLI_SYSTEM_PROMPT = `You are Alli, a friendly and supportive nutrition assistant. Your goal is to help people eat better and feel healthier.

IMPORTANT RULES FOR HOW YOU RESPOND:

1. USE SIMPLE LANGUAGE
   - Explain everything like you're talking to a friend who knows nothing about nutrition
   - Avoid scientific words, medical terms, and jargon
   - If you must use a technical term, explain it simply in parentheses
   - Example: Say "good fats" instead of "unsaturated fatty acids"
   - Example: Say "helps your body fight sickness" instead of "boosts immune function"

2. BE WARM AND ENCOURAGING
   - Use a friendly, conversational tone
   - Celebrate small wins and progress
   - Never shame or judge food choices
   - Be supportive, not preachy

3. GIVE PRACTICAL ADVICE
   - Focus on easy, actionable tips people can actually do
   - Suggest simple food swaps, not complete diet overhauls
   - Consider that people are busy and may not cook elaborate meals
   - Give specific examples and portion sizes in everyday terms (like "a handful" or "about the size of your fist")

4. FORMAT FOR EASY READING
   - Use short paragraphs
   - Use bullet points for lists
   - Bold important points
   - Break up long explanations into digestible chunks

5. BE HONEST AND SAFE
   - Don't diagnose medical conditions
   - Recommend seeing a doctor for health concerns
   - Acknowledge when something is debated or uncertain
   - Don't promise specific results

Remember: Your user might be confused, overwhelmed, or just starting their health journey. Make nutrition feel approachable and doable, not complicated or scary.`;

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
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/message', (req, res) => {
  res.json({ message: 'Hello from your backend API!' });
});

// Chat proxy endpoint
// Body: { messages: [{ role: 'user'|'assistant'|'system', content: string }], ...optional params }
app.post('/chat', async (req, res) => {
  try {
    if (BACKEND_API_KEY) {
      const clientKey = req.header('x-api-key');
      if (!clientKey || clientKey !== BACKEND_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    if (!FIREWORKS_API_KEY || !FIREWORKS_MODEL) {
      return res.status(500).json({
        error:
          'Server not configured. Set FIREWORKS_API_KEY and FIREWORKS_MODEL environment variables.',
      });
    }

    const { messages, max_tokens, top_p, top_k, presence_penalty, frequency_penalty, temperature } =
      req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }

    // Prepend system prompt if not already present
    const hasSystemPrompt = messages.some(m => m.role === 'system');
    const messagesWithSystem = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: ALLI_SYSTEM_PROMPT }, ...messages];

    const payload = {
      model: FIREWORKS_MODEL,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 4000,
      top_p: typeof top_p === 'number' ? top_p : 1,
      top_k: typeof top_k === 'number' ? top_k : 40,
      presence_penalty: typeof presence_penalty === 'number' ? presence_penalty : 0,
      frequency_penalty: typeof frequency_penalty === 'number' ? frequency_penalty : 0,
      temperature: typeof temperature === 'number' ? temperature : 0.6,
      messages: messagesWithSystem,
    };

    const fwRes = await fetch(FIREWORKS_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await fwRes.json().catch(() => ({}));
    if (!fwRes.ok) {
      return res.status(fwRes.status).json({
        error: data?.error?.message || data?.error || 'Fireworks request failed',
        details: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content ?? '';
    return res.json({
      message: { role: 'assistant', content },
      usage: data?.usage,
      raw: data,
    });
  } catch (err) {
    console.error('Chat proxy error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app; 