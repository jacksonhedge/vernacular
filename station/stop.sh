#!/bin/bash
# Vernacular Station — Stop all loops

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

STATION_NAME="${STATION_NAME:-unknown}"
STATION_LOWER=$(echo "$STATION_NAME" | tr '[:upper:]' '[:lower:]')

echo "Stopping ${STATION_NAME} station processes..."
pkill -f "${STATION_LOWER}.*sync.py" 2>/dev/null && echo "  Sync stopped" || echo "  Sync not running"
pkill -f "${STATION_LOWER}.*heartbeat" 2>/dev/null && echo "  Heartbeat stopped" || echo "  Heartbeat not running"
pkill -f "${STATION_LOWER}.*outbound" 2>/dev/null && echo "  Outbound stopped" || echo "  Outbound not running"
echo "Done."
