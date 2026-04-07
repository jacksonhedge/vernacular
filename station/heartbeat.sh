#!/bin/bash
# Vernacular Station Heartbeat — Pings the server every 30 seconds
#
# Usage:
#   STATION_NAME=Wade VERNACULAR_URL=https://vernacular.chat ./heartbeat.sh
#
# Environment:
#   STATION_NAME     — Station name (required)
#   VERNACULAR_URL   — Base URL (default: https://vernacular.chat)
#   HEARTBEAT_INTERVAL — Seconds between pings (default: 30)

STATION_NAME="${STATION_NAME:?ERROR: STATION_NAME is required}"
VERNACULAR_URL="${VERNACULAR_URL:-https://vernacular.chat}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-30}"

echo "[$(date '+%H:%M:%S')] Starting heartbeat for ${STATION_NAME} (every ${HEARTBEAT_INTERVAL}s)"
echo "[$(date '+%H:%M:%S')] URL: ${VERNACULAR_URL}/api/engine/ping"

while true; do
    RESPONSE=$(curl -s -X POST "${VERNACULAR_URL}/api/engine/ping" \
        -H "Content-Type: application/json" \
        -d "{\"station\": \"${STATION_NAME}\"}" 2>&1)

    if echo "$RESPONSE" | grep -q "ok"; then
        echo "[$(date '+%H:%M:%S')] Heartbeat OK"
    else
        echo "[$(date '+%H:%M:%S')] Heartbeat FAILED: $RESPONSE"
    fi

    sleep "$HEARTBEAT_INTERVAL"
done
