#!/bin/bash
# Vernacular Station Setup
# Run this on each Mac that will host a station.

set -e

echo "=== Vernacular Station Setup ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required. Install from nodejs.org"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "ERROR: npx is required."; exit 1; }

# Check iMessage access
CHAT_DB="$HOME/Library/Messages/chat.db"
if [ ! -f "$CHAT_DB" ]; then
  echo "ERROR: chat.db not found at $CHAT_DB"
  echo "Make sure Messages app has been opened at least once."
  exit 1
fi

# Check Full Disk Access
sqlite3 "$CHAT_DB" "SELECT COUNT(*) FROM message LIMIT 1" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "ERROR: Cannot read chat.db — grant Full Disk Access to Terminal:"
  echo "  System Preferences -> Privacy & Security -> Full Disk Access -> Add Terminal"
  exit 1
fi

echo "  chat.db accessible"
echo "  Node.js installed ($(node -v))"
echo ""

# Prompt for config
read -p "Station name (e.g., Albus): " STATION_NAME
read -p "Phone number (e.g., +18782458811): " PHONE
read -p "Apple ID email: " APPLE_ID
read -p "Engine API key: " ENGINE_KEY
read -p "Station ID (from Supabase): " STATION_ID

# Validate inputs
if [ -z "$STATION_NAME" ] || [ -z "$PHONE" ] || [ -z "$ENGINE_KEY" ] || [ -z "$STATION_ID" ]; then
  echo "ERROR: All fields are required."
  exit 1
fi

# Create .env file
cat > .env.station <<EOF
STATION_NAME=$STATION_NAME
STATION_ID=$STATION_ID
ENGINE_KEY=$ENGINE_KEY
PHONE_NUMBER=$PHONE
APPLE_ID=$APPLE_ID
NEXT_PUBLIC_SUPABASE_URL=https://miuyksnwzkhiyyilchjs.supabase.co
API_BASE=https://vernacular.chat
EOF

echo ""
echo "  Station configured!"
echo ""
echo "Configuration saved to .env.station"
echo ""
echo "To start the engine:"
echo "  source .env.station && STATION_ID=\$STATION_ID ENGINE_KEY=\$ENGINE_KEY npx tsx engine/station.ts"
echo ""
echo "To run as a background service, add to launchd or use pm2:"
echo "  pm2 start engine/station.ts --interpreter npx -- tsx"
echo ""
echo "To install dependencies:"
echo "  npm install better-sqlite3 @types/better-sqlite3"
