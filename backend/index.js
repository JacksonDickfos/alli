const path = require('path');
const dotenv = require('dotenv');

// Load env vars from repo root AND backend/.env (backend wins)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use native fetch (Node 18+)

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
// IMPORTANT: food photo analysis sends base64 payloads (can be many MB).
// Express defaults to 100kb, which causes 413 PayloadTooLargeError.
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Novita AI proxy config (keep API key on server; do NOT put it in the mobile app)
// Supports both:
// - LLM API (default): https://api.novita.ai/v3/openai/chat/completions
// - Dedicated endpoints: https://api.novita.ai/dedicated/v1/openai/chat/completions
const NOVITA_BASE_URL = process.env.NOVITA_BASE_URL; // optional (e.g. https://api.novita.ai/dedicated/v1/openai)
const NOVITA_ENDPOINT =
  process.env.NOVITA_ENDPOINT ||
  (NOVITA_BASE_URL ? `${NOVITA_BASE_URL.replace(/\/+$/, '')}/chat/completions` : '') ||
  'https://api.novita.ai/v3/openai/chat/completions';
const NOVITA_API_KEY = process.env.NOVITA_API_KEY; // required
const NOVITA_MODEL = process.env.NOVITA_MODEL; // required

// OpenAI fallback (optional). Use a backend-only key (do NOT reuse EXPO_PUBLIC_* keys here).
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY; // optional: if set, require x-api-key header

// Passio Nutrition AI config (keep API key on server; do NOT put it in the mobile app)
const PASSIO_API_KEY = process.env.PASSIO_API_KEY;
const PASSIO_BASE_URL = 'https://api.passiolife.com/v2';

// Passio token cache (in-memory for local dev)
let passioTokenCache = {
  access_token: null,
  customer_id: null,
  expires_at: null, // ms timestamp
};

async function getPassioAccessToken() {
  if (!PASSIO_API_KEY) {
    throw new Error('PASSIO_API_KEY is not configured on the backend.');
  }

  const now = Date.now();
  if (
    passioTokenCache.access_token &&
    passioTokenCache.expires_at &&
    now < passioTokenCache.expires_at - 60_000
  ) {
    return passioTokenCache;
  }

  const tokenUrl = `${PASSIO_BASE_URL}/token-cache/unified/oauth/token/${PASSIO_API_KEY}`;
  const { res: tokenRes, data: tokenData } = await fetchJsonWithTimeout(
    tokenUrl,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: '*/*' } },
    15_000
  );

  if (!tokenRes.ok) {
    throw new Error(
      `Passio token request failed: ${tokenRes.status} ${JSON.stringify(tokenData).substring(0, 500)}`
    );
  }
  const expiresIn = tokenData.expires_in || 3600;
  passioTokenCache = {
    access_token: tokenData.access_token,
    customer_id: tokenData.customer_id,
    expires_at: now + expiresIn * 1000,
  };

  return passioTokenCache;
}

function extractUpstreamErrorMessage(data, status) {
  const msg =
    data?.error?.message ||
    (typeof data?.error === 'string' ? data.error : null) ||
    data?.message ||
    data?.reason ||
    data?.metadata?.reason;
  return msg || `Upstream LLM request failed (${status})`;
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    // NOTE: Some serverless runtimes can ignore abort during DNS/TLS stalls.
    // Promise.race guarantees we return a response in time for Vercel limits.
    const res = await Promise.race([
      fetch(url, { ...options, signal: ac.signal }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Upstream request timed out after ${timeoutMs}ms`)), timeoutMs + 50)),
    ]);
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (err) {
    if (err && typeof err === 'object' && err.name === 'AbortError') {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

async function fetchTextWithTimeout(url, options, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      fetch(url, { ...options, signal: ac.signal }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Upstream request timed out after ${timeoutMs}ms`)), timeoutMs + 50)),
    ]);
    const text = await res.text().catch(() => '');
    return { res, text };
  } catch (err) {
    if (err && typeof err === 'object' && err.name === 'AbortError') {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

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



const ALLI_SYSTEM_PROMPT = `You are Alli, a friendly and supportive nutrition assistant.

Your job is to help people eat better and feel healthier in a simple, encouraging way.
You should ALWAYS respond with a helpful text answer.

Guidelines for your responses:

• Use simple, everyday language, like talking to a friend.
• Avoid medical or scientific terms when possible.
• If a technical word is needed, explain it simply in parentheses.
• Be warm, kind, and supportive. Never shame or judge food choices.
• Focus on small, realistic tips that are easy to try.
• Suggest simple food swaps and quick meals.
• Use everyday portion sizes (like “a handful” or “about the size of your fist”).
• Keep advice practical for busy people.

Formatting:
• Use short paragraphs.
• Use bullet points when helpful.
• Bold important points.

Safety:
• Do not diagnose medical conditions.
• Do not promise specific health results.
• Encourage seeing a doctor for serious concerns.

If the user is unsure or overwhelmed, reassure them and keep things simple.
`


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

// Passio image recognition endpoint (proxy)
// Body: { image: base64String, message?: {} }
app.post('/passio/recognize-image', async (req, res) => {
  try {
    if (BACKEND_API_KEY) {
      const clientKey = req.header('x-api-key');
      if (!clientKey || clientKey !== BACKEND_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { image, message } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 string) is required' });
    }

    const { access_token, customer_id } = await getPassioAccessToken();

    const passioUrl = `${PASSIO_BASE_URL}/products/napi/tools/vision/extractIngredientsAutoTyped`;
    const imageToSend = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const { res: passioRes, text } = await fetchTextWithTimeout(
      passioUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          Authorization: `Bearer ${access_token}`,
          'Passio-ID': customer_id,
        },
        body: JSON.stringify({ image: imageToSend, message: message || {} }),
      },
      25_000
    );
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!passioRes.ok) {
      return res.status(passioRes.status).json({
        error: data?.error || data?.message || data?.cause || 'Passio API request failed',
        details: data,
      });
    }

    return res.json({
      success: true,
      foods: Array.isArray(data) ? data : [data],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Chat proxy endpoint
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

    const provider = NOVITA_API_KEY && NOVITA_MODEL ? 'novita' : OPENAI_API_KEY ? 'openai' : null;

    if (!provider) {
      console.log('❌ Server not configured - missing AI provider credentials');
      return res.status(500).json({
        error:
          'Server not configured. Set NOVITA_API_KEY + NOVITA_MODEL, or set OPENAI_API_KEY.',
      });
    }

    console.log('✅ API keys validated');
    console.log('🤖 Provider:', provider);
    console.log('🔧 Model:', provider === 'novita' ? NOVITA_MODEL : OPENAI_MODEL);

    const { messages, max_tokens, temperature } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }

    // Prepend system prompt if not already present
    const hasSystemPrompt = messages.some(m => m.role === 'system');
    const messagesWithSystem = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: ALLI_SYSTEM_PROMPT }, ...messages];

    const basePayload = {
      messages: messagesWithSystem,
      temperature: typeof temperature === 'number' ? temperature : 0.3,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
    };

    const endpoint = provider === 'novita' ? NOVITA_ENDPOINT : OPENAI_ENDPOINT;
    const apiKey = provider === 'novita' ? NOVITA_API_KEY : OPENAI_API_KEY;
    const configuredModel = provider === 'novita' ? NOVITA_MODEL : OPENAI_MODEL;

    const usingNovitaDedicatedEndpoint = provider === 'novita' && /\/dedicated\/v1\/openai\/?/i.test(endpoint);

    // Some Novita LLM API models don't accept revision-suffixed model IDs (e.g. `model:rev`),
    // but dedicated endpoint model IDs DO include the endpoint suffix and must not be stripped.
    const modelCandidates =
      provider === 'novita' && !usingNovitaDedicatedEndpoint && typeof configuredModel === 'string' && configuredModel.includes(':')
        ? [configuredModel, configuredModel.split(':')[0]]
        : [configuredModel];

    console.log('📤 Sending request to LLM provider...');
    console.log('🔗 Endpoint:', endpoint);
    console.log('💬 Messages count:', messagesWithSystem.length);

    let upstreamRes;
    let data;
    let usedModel = modelCandidates[0];

    for (const candidate of modelCandidates) {
      usedModel = candidate;
      const payload = { model: candidate, ...basePayload };

      console.log('🧠 Trying model:', candidate);
      const result = await fetchJsonWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        25000
      );

      upstreamRes = result.res;
      data = result.data;

      if (upstreamRes.ok) break;

      const isModelNotFound =
        upstreamRes.status === 404 &&
        (data?.reason === 'MODEL_NOT_FOUND' ||
          data?.message === 'model not found' ||
          data?.metadata?.reason?.includes?.('not found'));

      if (provider === 'novita' && isModelNotFound && candidate !== modelCandidates[modelCandidates.length - 1]) {
        console.log('↩️ Model not found, retrying with fallback model…');
        continue;
      }

      break;
    }

    console.log('📥 Received response from upstream');
    console.log('📊 Status:', upstreamRes.status, upstreamRes.statusText);
    
    if (!upstreamRes.ok) {
      console.log('❌ Upstream LLM error:', data);
      return res.status(upstreamRes.status).json({
        error: extractUpstreamErrorMessage(data, upstreamRes.status),
        details: { provider, model: usedModel, upstreamStatus: upstreamRes.status, upstream: data },
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

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app; 