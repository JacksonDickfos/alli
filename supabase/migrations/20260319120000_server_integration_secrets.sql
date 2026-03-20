-- Key/value secrets for the Node backend (Oura OAuth client id/secret, etc.).
-- Read only with SUPABASE_SERVICE_ROLE_KEY from the server — never from the app.
-- RLS enabled with no policies: anon/authenticated cannot access; service role bypasses RLS.

create table if not exists public.server_integration_secrets (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.server_integration_secrets enable row level security;

comment on table public.server_integration_secrets is
  'Backend-only secrets. Example: insert keys oura_client_id and oura_client_secret for Oura token exchange.';

-- Optional: seed in SQL editor (replace placeholders):
-- insert into public.server_integration_secrets (key, value) values
--   ('oura_client_id', 'YOUR_OURA_CLIENT_ID'),
--   ('oura_client_secret', 'YOUR_OURA_CLIENT_SECRET')
-- on conflict (key) do update set value = excluded.value, updated_at = now();
