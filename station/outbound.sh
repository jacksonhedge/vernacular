#!/bin/bash
# Vernacular Station Outbound Sender — Polls outbound_queue and sends via AppleScript
#
# Usage:
#   STATION_NAME=Wade VERNACULAR_URL=https://vernacular.chat ./outbound.sh
#
# Environment:
#   STATION_NAME     — Station name (required)
#   VERNACULAR_URL   — Base URL (default: https://vernacular.chat)
#   POLL_INTERVAL    — Seconds between polls (default: 5)

STATION_NAME="${STATION_NAME:?ERROR: STATION_NAME is required}"
VERNACULAR_URL="${VERNACULAR_URL:-https://vernacular.chat}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"

echo "[$(date '+%H:%M:%S')] Starting outbound sender for ${STATION_NAME} (every ${POLL_INTERVAL}s)"

while true; do
    # Poll for queued messages
    RESPONSE=$(curl -s "${VERNACULAR_URL}/api/engine/poll-outbound?station=${STATION_NAME}")

    # Parse messages from response
    MESSAGES=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    msgs = data.get('messages', [])
    for m in msgs:
        phone = m.get('phone', '') or m.get('contact_phone', '')
        text = m.get('message', '')
        msg_id = m.get('id', '')
        if phone and text:
            # Escape for shell safety
            text_escaped = text.replace(\"'\", \"'\\\\''\")
            print(f'{msg_id}|{phone}|{text_escaped}')
except:
    pass
" 2>/dev/null)

    if [ -n "$MESSAGES" ]; then
        while IFS='|' read -r MSG_ID PHONE TEXT; do
            echo "[$(date '+%H:%M:%S')] Sending to ${PHONE}: ${TEXT:0:60}..."

            # Check if message contains a URL — split into text + link
            URL_PATTERN='https?://[^ ]*'
            if echo "$TEXT" | grep -qE "$URL_PATTERN"; then
                # Extract the URL and the non-URL text
                URL=$(echo "$TEXT" | grep -oE "$URL_PATTERN" | head -1)
                TEXT_ONLY=$(echo "$TEXT" | sed "s|$URL||g" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

                # Send text part first (if there is any)
                if [ -n "$TEXT_ONLY" ]; then
                    osascript -e "
                        tell application \"Messages\"
                            set targetService to 1st account whose service type = iMessage
                            set targetBuddy to participant \"${PHONE}\" of targetService
                            send \"${TEXT_ONLY}\" to targetBuddy
                        end tell
                    " 2>/dev/null
                    sleep 1
                fi

                # Send URL alone (better chance of link preview)
                osascript -e "
                    tell application \"Messages\"
                        set targetService to 1st account whose service type = iMessage
                        set targetBuddy to participant \"${PHONE}\" of targetService
                        send \"${URL}\" to targetBuddy
                    end tell
                " 2>/dev/null
            else
                # No URL — send as single message
                osascript -e "
                    tell application \"Messages\"
                        set targetService to 1st account whose service type = iMessage
                        set targetBuddy to participant \"${PHONE}\" of targetService
                        send \"${TEXT}\" to targetBuddy
                    end tell
                " 2>/dev/null
            fi

            SEND_STATUS=$?

            if [ $SEND_STATUS -eq 0 ]; then
                echo "[$(date '+%H:%M:%S')] Sent successfully"
                # Confirm sent
                curl -s -X POST "${VERNACULAR_URL}/api/engine/confirm-sent" \
                    -H "Content-Type: application/json" \
                    -d "{\"messageId\": \"${MSG_ID}\", \"status\": \"sent\", \"station\": \"${STATION_NAME}\"}" \
                    > /dev/null
            else
                echo "[$(date '+%H:%M:%S')] SEND FAILED"
                curl -s -X POST "${VERNACULAR_URL}/api/engine/confirm-sent" \
                    -H "Content-Type: application/json" \
                    -d "{\"messageId\": \"${MSG_ID}\", \"status\": \"failed\", \"station\": \"${STATION_NAME}\", \"error\": \"AppleScript failed\"}" \
                    > /dev/null
            fi
        done <<< "$MESSAGES"
    fi

    sleep "$POLL_INTERVAL"
done
