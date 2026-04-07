#!/bin/bash
# Vernacular Station — Start all loops
#
# Usage:
#   cd station && ./start.sh
#
# Starts three background processes:
#   1. Message sync (inbound + outbound every 30s)
#   2. Heartbeat (every 30s)
#   3. Outbound sender (polls every 5s) — disabled by default
#
# Logs go to /tmp/<station>_*.log
# Stop with: ./stop.sh

set -e

# Load .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

STATION_NAME="${STATION_NAME:?ERROR: Set STATION_NAME in .env}"
STATION_LOWER=$(echo "$STATION_NAME" | tr '[:upper:]' '[:lower:]')
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Vernacular station: ${STATION_NAME}"
echo "================================================"

# Kill any existing processes
pkill -f "${STATION_LOWER}.*sync.py" 2>/dev/null || true
pkill -f "${STATION_LOWER}.*heartbeat" 2>/dev/null || true

# 1. Message Sync (inbound + outbound)
echo "Starting message sync..."
nohup python3 "${SCRIPT_DIR}/sync.py" > "/tmp/${STATION_LOWER}_sync.log" 2>&1 &
echo "  PID: $! → /tmp/${STATION_LOWER}_sync.log"

# 2. Heartbeat
echo "Starting heartbeat..."
nohup bash "${SCRIPT_DIR}/heartbeat.sh" > "/tmp/${STATION_LOWER}_heartbeat.log" 2>&1 &
echo "  PID: $! → /tmp/${STATION_LOWER}_heartbeat.log"

# 3. Outbound Sender (uncomment when ready to auto-send)
# echo "Starting outbound sender..."
# nohup bash "${SCRIPT_DIR}/outbound.sh" > "/tmp/${STATION_LOWER}_outbound.log" 2>&1 &
# echo "  PID: $! → /tmp/${STATION_LOWER}_outbound.log"

echo ""
echo "Station ${STATION_NAME} is running."
echo "View logs: tail -f /tmp/${STATION_LOWER}_sync.log"
echo "Stop all:  ${SCRIPT_DIR}/stop.sh"
