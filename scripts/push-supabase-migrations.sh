#!/usr/bin/env bash
# Push local supabase/migrations to your hosted Supabase project.
#
# Prerequisites:
#   1) Database password: Supabase Dashboard → Project Settings → Database → Database password
#   2) Optional: SUPABASE_PROJECT_REF (default: rkkoppppcxvbdzudzijw from app.json)
#
# Usage:
#   export SUPABASE_DB_PASSWORD='your-postgres-password'
#   ./scripts/push-supabase-migrations.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-rkkoppppcxvbdzudzijw}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD is not set."
  echo "Get it from: Supabase Dashboard → Project Settings → Database"
  exit 1
fi

npx supabase@latest link --project-ref "$PROJECT_REF" -p "$SUPABASE_DB_PASSWORD" --yes
npx supabase@latest db push --yes
echo "Migrations applied to $PROJECT_REF"
