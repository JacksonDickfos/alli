# Deploy Alli API on Railway

Your **iOS and Android apps** (Expo) do not run on Railway. Only this **Node/Express API** (`backend/`) does. The native apps call it via **`EXPO_PUBLIC_BACKEND_URL`** (and optional **`EXPO_PUBLIC_BACKEND_API_KEY`**).

## 1. Create the service

1. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub** (or CLI).
2. Select this repository.
3. Open the new service → **Settings** → set **Root Directory** to **`backend`**  
   (required for this monorepo so `package.json` and `index.js` are found).
4. **Generate Domain** (or attach a custom domain) under **Networking**.  
   Your public base URL will look like `https://alli-backend-production.up.railway.app`.

## 2. Environment variables

In the service → **Variables**, add everything you need from **`backend/.env.example`** and your secrets:

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` |
| `FIREWORKS_API_KEY` / `FIREWORKS_MODEL` | Chat (`POST /chat`) |
| `PASSIO_API_KEY` | Food vision proxy |
| `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` *or* `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `server_integration_secrets` | Oura token exchange |
| `BACKEND_API_KEY` | Optional; if set, app must send matching `x-api-key` |
| `JWT_SECRET` | Only if you use legacy `/login` `/register` demo routes |

Railway injects **`PORT`** automatically — do not set it manually unless you know you need to.

## 3. Point the mobile apps at Railway

1. Copy the **HTTPS** public URL (no trailing slash).
2. Set **`EXPO_PUBLIC_BACKEND_URL`** to that value in **EAS** (Secrets / env for your build profile) **or** `app.json` → `expo.extra.backendUrl`.
3. If you use **`BACKEND_API_KEY`** on the server, set **`EXPO_PUBLIC_BACKEND_API_KEY`** to the same value for the client build.
4. Rebuild the native app (`eas build`) so the new URL is embedded.

Smoke test from a machine:

```bash
curl -sS "https://YOUR_RAILWAY_URL/message"
```

Expect: `{"message":"Hello from your backend API!"}`

## 4. Optional: WebSocket / OpenAI Realtime proxy

Voice uses **`proxy-server/`**, which is a **separate** long-lived WebSocket process. Deploy it as a **second** Railway service (root directory `proxy-server`, own `PORT`, env `OPENAI_API_KEY`), then set **`EXPO_PUBLIC_REALTIME_PROXY_URL`** to `wss://…` for that service. See `THIRD_PARTY_INTEGRATIONS.md` if present in your repo.
