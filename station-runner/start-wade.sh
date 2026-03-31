#!/bin/bash
# Start the Vernacular Station Runner for Wade
# Run this on the Mac that has iMessage configured with (412) 512-8437

export STATION_ID="9ae1a138-10bb-435b-a397-b3e2637fa3af"
export SUPABASE_URL="https://miuyksnwzkhiyyilchjs.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdXlrc253emtoaXl5aWxjaGpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4NzA3NywiZXhwIjoyMDkwNDYzMDc3fQ.ELbzfs92jYikwB4IcQrGBCDfSZs_gNoJeqx4jswEJuo"

echo "Starting Vernacular Station Runner (Wade)..."
echo "Station: Wade | Phone: (412) 512-8437"
echo ""

cd "$(dirname "$0")"
npx ts-node runner.ts
