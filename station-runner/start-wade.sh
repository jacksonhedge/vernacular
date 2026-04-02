#!/bin/bash
# Start the Vernacular Station Runner for Wade
# Run this on the Mac that has iMessage configured with (412) 512-8437

# Load secrets from environment or .env file
export STATION_ID="${STATION_ID:-9ae1a138-10bb-435b-a397-b3e2637fa3af}"
export SUPABASE_URL="${SUPABASE_URL:-https://miuyksnwzkhiyyilchjs.supabase.co}"
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_KEY must be set in environment"
  exit 1
fi

echo "Starting Vernacular Station Runner (Wade)..."
echo "Station: Wade | Phone: (412) 512-8437"
echo ""

cd "$(dirname "$0")"
npx ts-node runner.ts
