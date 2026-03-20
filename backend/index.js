require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use native fetch (Node 18+)
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// CRITICAL: Express 5 body parser configuration
// Express 5 uses body-parser internally but has a default 100kb limit
// We need to configure it BEFORE any routes and ensure the limit is applied
const jsonParser = bodyParser.json({ 
  limit: '100mb',
  strict: false
});
const urlencodedParser = bodyParser.urlencoded({ 
  limit: '100mb', 
  extended: true 
});

// Apply parsers globally
app.use(jsonParser);
app.use(urlencodedParser);
app.use(cors());

// Fireworks proxy config (keep API key on server; do NOT put it in the mobile app)
const FIREWORKS_ENDPOINT =
  process.env.FIREWORKS_ENDPOINT || 'https://api.fireworks.ai/inference/v1/chat/completions';
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY; // required
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL; // required
const BACKEND_API_KEY = process.env.BACKEND_API_KEY; // optional: if set, require x-api-key header

// Optional: load Oura OAuth client secret from Supabase when env vars are unset
let _supabaseAdmin = null;
let _supabaseAdminTried = false;

function getSupabaseServiceConfig() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  ).trim();
  return { url, key, ok: Boolean(url && key) };
}

function getSupabaseAdmin() {
  if (_supabaseAdminTried) return _supabaseAdmin;
  _supabaseAdminTried = true;
  const { url, key, ok } = getSupabaseServiceConfig();
  if (!ok) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  } catch (e) {
    console.error('[Oura OAuth] Supabase client init failed:', e);
    _supabaseAdmin = null;
  }
  return _supabaseAdmin;
}

/**
 * @returns {Promise<
 *   | { ok: true, clientId: string, clientSecret: string, source: 'env' | 'database' }
 *   | { ok: false, diagnostic: Record<string, unknown> }
 * >}
 */
async function getOuraOAuthCredentialsDetailed() {
  const envId = (process.env.OURA_CLIENT_ID || '').trim();
  const envSecret = (process.env.OURA_CLIENT_SECRET || '').trim();
  if (envId && envSecret) {
    return { ok: true, clientId: envId, clientSecret: envSecret, source: 'env' };
  }

  const { ok: hasSupabaseEnv, url: supabaseUrl } = getSupabaseServiceConfig();
  const hasPartialOuraEnv = Boolean((envId && !envSecret) || (!envId && envSecret));

  if (!hasSupabaseEnv) {
    return {
      ok: false,
      diagnostic: {
        hasOuraEnvPair: Boolean(envId && envSecret),
        hasPartialOuraEnv,
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(
          (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim(),
        ),
        hint:
          'On this server, set OURA_CLIENT_ID and OURA_CLIENT_SECRET (e.g. Vercel → backend project → Environment Variables), OR set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY so the backend can read public.server_integration_secrets.',
      },
    };
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return {
      ok: false,
      diagnostic: {
        hasSupabaseEnv: true,
        supabaseClientInitialized: false,
        hint: 'SUPABASE_URL and service role key are set but createClient failed. Check backend logs and that @supabase/supabase-js is installed.',
      },
    };
  }

  const { data, error } = await sb
    .from('server_integration_secrets')
    .select('key, value')
    .in('key', ['oura_client_id', 'oura_client_secret']);

  if (error) {
    console.error('[Oura OAuth] Supabase read error:', error.code, error.message);
    return {
      ok: false,
      diagnostic: {
        hasSupabaseEnv: true,
        supabaseClientInitialized: true,
        supabaseError: error.message,
        supabaseCode: error.code,
        hint: 'Service role could not read server_integration_secrets. Confirm the migration ran on this same Supabase project and the service role key matches that project.',
      },
    };
  }

  const rows = data || [];
  const map = Object.fromEntries(rows.map((r) => [r.key, String(r.value || '').trim()]));
  if (map.oura_client_id && map.oura_client_secret) {
    return {
      ok: true,
      clientId: map.oura_client_id,
      clientSecret: map.oura_client_secret,
      source: 'database',
    };
  }

  return {
    ok: false,
    diagnostic: {
      hasSupabaseEnv: true,
      supabaseClientInitialized: true,
      dbRowsForOuraKeys: rows.length,
      keysFound: rows.map((r) => r.key),
      hint:
        rows.length === 0
          ? 'Table is readable but no oura_* rows. INSERT oura_client_id and oura_client_secret into public.server_integration_secrets in this Supabase project.'
          : 'Need both oura_client_id and oura_client_secret rows (non-empty values).',
    },
  };
}

// Passio Nutrition AI config (keep API key on server; do NOT put it in the mobile app)
const PASSIO_API_KEY = process.env.PASSIO_API_KEY; // Required - must be set in Vercel environment variables
const PASSIO_BASE_URL = 'https://api.passiolife.com/v2';

// Passio token cache (in-memory for now; in production, use Redis or similar)
let passioTokenCache = {
  access_token: null,
  customer_id: null,
  expires_at: null, // timestamp when token expires
};

/**
 * Get or refresh Passio access token
 * Implements token caching and auto-refresh as per Passio best practices
 */
async function getPassioAccessToken() {
  const now = Date.now();
  
  // If we have a valid cached token, return it
  if (
    passioTokenCache.access_token &&
    passioTokenCache.expires_at &&
    now < passioTokenCache.expires_at - 60000 // Refresh 1 minute before expiry
  ) {
    return passioTokenCache;
  }

  // Fetch new token
  try {
    const tokenUrl = `${PASSIO_BASE_URL}/token-cache/unified/oauth/token/${PASSIO_API_KEY}`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Passio token request failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Cache the token with expiration
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not provided
    passioTokenCache = {
      access_token: tokenData.access_token,
      customer_id: tokenData.customer_id,
      expires_at: now + expiresIn * 1000, // Convert seconds to milliseconds
    };

    console.log('✅ Passio access token obtained and cached');
    return passioTokenCache;
  } catch (error) {
    console.error('❌ Failed to get Passio access token:', error);
    throw error;
  }
}

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

// Passio image recognition endpoint
// Body: { image: base64String, message?: {} }
// Apply body parser explicitly on this route to ensure 100mb limit
app.post('/passio/recognize-image', bodyParser.json({ limit: '100mb' }), async (req, res) => {
  try {
    console.log('📦 Passio endpoint hit');
    if (BACKEND_API_KEY) {
      const clientKey = req.header('x-api-key');
      if (!clientKey || clientKey !== BACKEND_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { image, message } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 string) is required' });
    }

    // Get Passio access token (with caching)
    const { access_token, customer_id } = await getPassioAccessToken();

    // Call Passio image recognition endpoint
    // Try both formats: raw base64 and data URI
    const passioUrl = `${PASSIO_BASE_URL}/products/napi/tools/vision/extractIngredientsAutoTyped`;
    
    console.log('🔍 Calling Passio API...');
    console.log('📦 Image length:', image.length);
    console.log('📦 Image preview (first 50 chars):', image.substring(0, 50));
    
    // Check if image is already a data URI, if not, try as data URI first
    let imageToSend = image;
    if (!image.startsWith('data:')) {
      // Try as data URI format (some APIs expect this)
      imageToSend = `data:image/jpeg;base64,${image}`;
      console.log('📦 Converting to data URI format');
    }
    
    const passioResponse = await fetch(passioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        Authorization: `Bearer ${access_token}`,
        'Passio-ID': customer_id,
      },
      body: JSON.stringify({
        image: imageToSend,
        message: message || {},
      }),
    });
    
    console.log('📋 Passio API response status:', passioResponse.status);

    let passioData;
    try {
      passioData = await passioResponse.json();
    } catch (parseError) {
      const errorText = await passioResponse.text();
      console.error('❌ Failed to parse Passio response:', errorText.substring(0, 500));
      return res.status(passioResponse.status).json({
        error: 'Passio API returned invalid response',
        details: { status: passioResponse.status, body: errorText.substring(0, 500) },
      });
    }

    if (!passioResponse.ok) {
      console.error('❌ Passio API error:', passioResponse.status);
      console.error('❌ Passio error details:', JSON.stringify(passioData, null, 2));
      return res.status(passioResponse.status).json({
        error: passioData?.error || passioData?.message || passioData?.cause || 'Passio API request failed',
        details: passioData,
      });
    }
    
    console.log('✅ Passio API success, detected items:', Array.isArray(passioData) ? passioData.length : 1);

    // Return the Passio response (array of detected foods)
    return res.json({
      success: true,
      foods: Array.isArray(passioData) ? passioData : [passioData],
    });
  } catch (err) {
    console.error('Passio image recognition error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Oura OAuth — health check (GET): confirms URL + whether credentials resolve (no secrets returned)
app.get('/integrations/oura/oauth/exchange', async (req, res) => {
  const r = await getOuraOAuthCredentialsDetailed();
  res.json({
    ok: true,
    message: 'Oura exchange endpoint. POST JSON body: { code, redirectUri? }.',
    credentialsConfigured: r.ok,
    source: r.ok ? r.source : 'none',
    ...(r.ok ? {} : { details: r.diagnostic }),
  });
});

// Oura OAuth token exchange
// Body: { code: string, redirectUri?: string }
app.post('/integrations/oura/oauth/exchange', async (req, res) => {
  try {
    if (BACKEND_API_KEY) {
      const clientKey = req.header('x-api-key');
      if (!clientKey || clientKey !== BACKEND_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { code, redirectUri } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code (string) is required' });
    }

    const OURA_TOKEN_URL = process.env.OURA_TOKEN_URL || 'https://api.ouraring.com/oauth/token';
    const credsResult = await getOuraOAuthCredentialsDetailed();

    if (!credsResult.ok) {
      return res.status(500).json({
        success: false,
        error:
          'Oura OAuth not configured on this server. Use GET on this same URL to see details (no secrets).',
        details: credsResult.diagnostic,
      });
    }
    const creds = credsResult;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    if (redirectUri) params.append('redirect_uri', redirectUri);
    params.append('client_id', creds.clientId);
    params.append('client_secret', creds.clientSecret);

    const tokenRes = await fetch(OURA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        success: false,
        error: tokenData?.error_description || tokenData?.error || 'Oura token exchange failed',
      });
    }

    // Tokens are sensitive; we only return "success" + non-sensitive metadata.
    return res.json({
      success: true,
      token_type: tokenData?.token_type,
      expires_in: tokenData?.expires_in,
      scope: tokenData?.scope || tokenData?.scopes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`📦 Body parser configured with 100MB limit`);
  });
}

// Export for Vercel
module.exports = app; 