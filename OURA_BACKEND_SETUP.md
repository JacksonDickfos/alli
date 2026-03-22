# Oura OAuth — backend configuration (env + Supabase)

The token exchange route (`POST /integrations/oura/oauth/exchange`) needs the Oura **client ID** and **client secret** on the server. You can use **both** of these mechanisms; the backend checks **environment variables first**, then falls back to Supabase.

## 1. Run the database migration

Apply `supabase/migrations/20260319120000_server_integration_secrets.sql` to create `public.server_integration_secrets`.

### Option A — Supabase CLI (recommended)

```bash
export SUPABASE_DB_PASSWORD='your-database-password'
./scripts/push-supabase-migrations.sh
```

Password: **Project Settings → Database** in the Supabase dashboard.  
Override project with `SUPABASE_PROJECT_REF` if different from `rkkoppppcxvbdzudzijw`.

Or manually:

```bash
npx supabase@latest link --project-ref YOUR_REF -p "$SUPABASE_DB_PASSWORD" --yes
npx supabase@latest db push --yes
```

### Option B — SQL Editor

Paste the full contents of `supabase/migrations/20260319120000_server_integration_secrets.sql` into **SQL Editor → New query → Run**.

## 2. Store Oura credentials in Supabase (fallback)

After the table exists, insert keys (replace placeholders):

```sql
insert into public.server_integration_secrets (key, value) values
  ('oura_client_id', 'YOUR_OURA_CLIENT_ID'),
  ('oura_client_secret', 'YOUR_OURA_CLIENT_SECRET')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

## 3. Set backend environment variables (primary + DB access)

Variables must be set on **the Node server that serves `backend/index.js`** (e.g. **Railway** with root directory `backend/`), not only in Supabase or the Expo app.

On the host that runs `backend/` (e.g. Railway, or `backend/.env` locally):

| Variable | Purpose |
|----------|---------|
| `OURA_CLIENT_ID` | Oura OAuth client ID (used first if set) |
| `OURA_CLIENT_SECRET` | Oura OAuth client secret (used first if set) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` — required to read secrets from DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Dashboard → Settings → API) — **server only**, never in the app |

If `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET` are both set, the backend **does not** read Oura values from the database. Keeping **both** env and rows in `server_integration_secrets` gives you a documented backup and a fallback if you unset env vars later.

## 4. Mobile app

- Set **`EXPO_PUBLIC_BACKEND_URL`** to your deployed API origin (no trailing slash), e.g. `https://your-service.up.railway.app`.  
  If this is missing, `app.json` has `extra.backendUrl: ""`, so the app falls back to **`http://localhost:3001`** — that only works on a simulator pointed at your machine, not on a real device.
- `EXPO_PUBLIC_OURA_CLIENT_ID` / redirect URI must match the Oura developer app.
- Client secret must **not** appear in the Expo app; only the backend performs the code exchange.

### Debug credentials on the server

Open in a browser (same base URL the app uses):

`GET https://YOUR_API/integrations/oura/oauth/exchange`

You should see `credentialsConfigured: true` and `source: "env"` or `"database"`. If `details` is present, it explains what is missing (no service role key, no rows, wrong project, etc.).

See also `backend/.env.example`.
