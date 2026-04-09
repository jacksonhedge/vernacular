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
    # Poll for queued messages — Python handles ALL parsing and writes individual files
    RESPONSE=$(curl -s "${VERNACULAR_URL}/api/engine/poll-outbound?station=${STATION_NAME}")

    # Python writes msg_id, phone, text, att_url to separate line-based files
    echo "$RESPONSE" | python3 -c "
import sys, json, os
try:
    data = json.load(sys.stdin)
    msgs = data.get('messages', [])
    for i, m in enumerate(msgs):
        phone = m.get('phone', '') or m.get('contact_phone', '')
        text = m.get('message', '') or ''
        msg_id = m.get('id', '')
        att_url = m.get('attachment_url', '') or ''
        if phone and (text or att_url):
            # Write each field to its own file — avoids ALL parsing issues
            base = f'/tmp/vern_msg_{i}'
            open(f'{base}_id', 'w').write(msg_id)
            open(f'{base}_phone', 'w').write(phone)
            open(f'{base}_text', 'w').write(text)
            open(f'{base}_att', 'w').write(att_url)
            print(f'READY:{i}')
except Exception as e:
    print(f'ERROR:{e}', file=sys.stderr)
" 2>/dev/null | while read -r LINE; do
        # Each READY:N line means a message is ready to send
        if [[ "$LINE" == READY:* ]]; then
            IDX="${LINE#READY:}"
            MSG_ID=$(cat "/tmp/vern_msg_${IDX}_id" 2>/dev/null)
            PHONE=$(cat "/tmp/vern_msg_${IDX}_phone" 2>/dev/null)
            TEXT=$(cat "/tmp/vern_msg_${IDX}_text" 2>/dev/null)
            ATT_URL=$(cat "/tmp/vern_msg_${IDX}_att" 2>/dev/null)

            echo "[$(date '+%H:%M:%S')] Sending to ${PHONE}: ${TEXT:0:60}..."

            SEND_STATUS=0

            # If there's an attachment URL, download and send as file
            if [ -n "$ATT_URL" ]; then
                echo "[$(date '+%H:%M:%S')] Downloading attachment..."
                ATT_FILENAME=$(basename "$ATT_URL" | sed 's/?.*//')
                ATT_PATH="/tmp/vernacular_att_${ATT_FILENAME}"
                curl -s -o "$ATT_PATH" "$ATT_URL"

                if [ -f "$ATT_PATH" ] && [ -s "$ATT_PATH" ]; then
                    # Send text first if it's not just the placeholder
                    if [ -n "$TEXT" ] && ! echo "$TEXT" | grep -qE '^\[IMAGE|^\[VIDEO|^\[PDF|^\[FILE|^\[AUDIO'; then
                        osascript -e "tell application \"Messages\"
                            set targetService to 1st account whose service type = iMessage
                            set targetBuddy to participant \"${PHONE}\" of targetService
                            send \"${TEXT}\" to targetBuddy
                        end tell" 2>/dev/null
                        sleep 1
                    fi

                    # Send the file
                    osascript -e "tell application \"Messages\"
                        set targetService to 1st account whose service type = iMessage
                        set targetBuddy to participant \"${PHONE}\" of targetService
                        send POSIX file \"${ATT_PATH}\" to targetBuddy
                    end tell" 2>/dev/null
                    SEND_STATUS=$?
                    rm -f "$ATT_PATH"
                else
                    echo "[$(date '+%H:%M:%S')] Download failed, sending text only"
                    osascript -e "tell application \"Messages\"
                        set targetService to 1st account whose service type = iMessage
                        set targetBuddy to participant \"${PHONE}\" of targetService
                        send \"${TEXT}\" to targetBuddy
                    end tell" 2>/dev/null
                    SEND_STATUS=$?
                fi
            # Check if message contains a URL — split into text + link
            elif echo "$TEXT" | grep -qE 'https?://[^ ]*'; then
                URL=$(echo "$TEXT" | grep -oE 'https?://[^ ]*' | head -1)
                TEXT_ONLY=$(echo "$TEXT" | sed "s|$URL||g" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

                if [ -n "$TEXT_ONLY" ]; then
                    osascript -e "tell application \"Messages\"
                        set targetService to 1st account whose service type = iMessage
                        set targetBuddy to participant \"${PHONE}\" of targetService
                        send \"${TEXT_ONLY}\" to targetBuddy
                    end tell" 2>/dev/null
                    sleep 1
                fi

                osascript -e "tell application \"Messages\"
                    set targetService to 1st account whose service type = iMessage
                    set targetBuddy to participant \"${PHONE}\" of targetService
                    send \"${URL}\" to targetBuddy
                end tell" 2>/dev/null
                SEND_STATUS=$?
            else
                # No URL, no attachment — send as single message
                osascript -e "tell application \"Messages\"
                    set targetService to 1st account whose service type = iMessage
                    set targetBuddy to participant \"${PHONE}\" of targetService
                    send \"${TEXT}\" to targetBuddy
                end tell" 2>/dev/null
                SEND_STATUS=$?
            fi

            if [ $SEND_STATUS -eq 0 ]; then
                echo "[$(date '+%H:%M:%S')] Sent successfully"
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

            # Clean up temp files
            rm -f "/tmp/vern_msg_${IDX}_id" "/tmp/vern_msg_${IDX}_phone" "/tmp/vern_msg_${IDX}_text" "/tmp/vern_msg_${IDX}_att"
        fi
    done

    sleep "$POLL_INTERVAL"
done
