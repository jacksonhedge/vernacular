#!/usr/bin/env python3
"""
Vernacular Station Sync — Unified inbound + outbound message sync.

Reads messages from macOS Messages chat.db and syncs them to Supabase.
Runs as a background loop on each Mac station.

Usage:
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=xxx STATION_NAME=Wade python3 sync.py

Environment Variables:
  SUPABASE_URL      — Supabase project URL (required)
  SUPABASE_KEY      — Supabase service role key (required)
  STATION_NAME      — Station name, e.g. "Wade", "Albus" (required)
  SYNC_INTERVAL     — Seconds between sync cycles (default: 30)
  BATCH_SIZE        — Max messages per sync cycle (default: 20)
"""

import sqlite3
import subprocess
import json
import os
import re
import time
import sys
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
STATION_NAME = os.environ.get("STATION_NAME", "")
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL", "30"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "20"))

DB_PATH = os.path.expanduser("~/Library/Messages/chat.db")
HOME = os.path.expanduser("~")
INBOUND_STATE = os.path.join(HOME, f".{STATION_NAME.lower()}-inbound-last")
OUTBOUND_STATE = os.path.join(HOME, f".{STATION_NAME.lower()}-outbound-last")

if not SUPABASE_URL or not SUPABASE_KEY or not STATION_NAME:
    print("ERROR: SUPABASE_URL, SUPABASE_KEY, and STATION_NAME are required")
    sys.exit(1)


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def read_state(path: str) -> int:
    try:
        return int(open(path).read().strip())
    except (FileNotFoundError, ValueError):
        return 0


def write_state(path: str, rowid: int):
    open(path, "w").write(str(rowid))


def normalize_phone(phone: str) -> str:
    """Normalize phone to +1XXXXXXXXXX format."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits[0] == "1":
        return f"+{digits}"
    return f"+{digits}"


def extract_text_from_blob(blob_data: bytes) -> str | None:
    """Extract plain text from attributedBody NSAttributedString BLOB."""
    if not blob_data:
        return None
    try:
        decoded = blob_data.decode("utf-8", errors="ignore")
        # Remove binary headers
        for header in ["streamtyped", "NSAttributedString", "NSMutableString"]:
            decoded = decoded.replace(header, "")
        # Extract longest readable text sequence
        matches = re.findall(r"[\x20-\x7E\u00A0-\uFFFF]{3,}", decoded)
        if matches:
            text = max(matches, key=len).strip()
            # Filter out known junk patterns
            junk = ["__kIMMessage", "NSValue", "NSObject", "NSString"]
            if len(text) > 2 and not any(j in text for j in junk):
                # Strip +X BLOB prefix artifact (e.g. "+#Hello" → "Hello")
                if len(text) > 2 and text[0] == "+" and not text[1].isdigit():
                    text = text[2:]
                return text
    except Exception:
        pass

    # Fallback: split on null bytes
    try:
        parts = blob_data.split(b"\x00")
        for part in parts:
            if len(part) > 3:
                decoded_part = part.decode("utf-8", errors="ignore")
                cleaned = "".join(c for c in decoded_part if c.isprintable() or c in "\n\t ")
                if len(cleaned) > 2 and cleaned not in ["NSString", "NSAttributed"]:
                    return cleaned.strip()
    except Exception:
        pass

    return None


def insert_message(phone: str, text: str, direction: str, sent_at: str,
                    attachment_type: str | None = None, attachment_name: str | None = None):
    """Insert a message to Supabase."""
    payload = {
        "message": text[:500],
        "contact_phone": normalize_phone(phone),
        "direction": direction,
        "station": STATION_NAME,
        "status": "Delivered" if direction == "Inbound" else "Sent",
        "source_system": "wade-station",
        "sent_at": sent_at,
    }
    if attachment_type:
        payload["attachment_type"] = attachment_type
    if attachment_name:
        payload["attachment_name"] = attachment_name
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST",
            f"{SUPABASE_URL}/rest/v1/messages",
            "-H", f"apikey: {SUPABASE_KEY}",
            "-H", f"Authorization: Bearer {SUPABASE_KEY}",
            "-H", "Content-Type: application/json",
            "-H", "Prefer: return=minimal,resolution=ignore-duplicates",
            "-d", json.dumps(payload),
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and "error" not in result.stdout.lower()


def get_attachment_info(db: sqlite3.Connection, message_rowid: int) -> tuple[str | None, str | None]:
    """Check if a message has an attachment and return (type, filename)."""
    try:
        row = db.execute(
            """
            SELECT a.mime_type, a.filename, a.transfer_name
            FROM attachment a
            JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
            WHERE maj.message_id = ?
            LIMIT 1
            """,
            (message_rowid,),
        ).fetchone()
        if row:
            mime = row[0] or ""
            name = row[2] or row[1] or ""
            if name:
                name = name.rsplit("/", 1)[-1]  # strip path, keep filename
            # Simplify mime to type
            if "pdf" in mime:
                atype = "pdf"
            elif "image" in mime:
                atype = "image"
            elif "video" in mime:
                atype = "video"
            elif "audio" in mime:
                atype = "audio"
            elif mime:
                atype = "file"
            else:
                atype = "file"
            return atype, name
    except Exception:
        pass
    return None, None


def sync_inbound(db: sqlite3.Connection):
    """Sync inbound messages (is_from_me=0) from chat.db."""
    last_rowid = read_state(INBOUND_STATE)
    # Include messages with NULL text (could be attachments)
    cursor = db.execute(
        """
        SELECT h.id, m.ROWID, m.text,
            strftime('%Y-%m-%dT%H:%M:%SZ', m.date/1000000000 + 978307200, 'unixepoch') as msg_time
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        JOIN chat c ON cmj.chat_id = c.ROWID
        JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.is_from_me = 0 AND m.ROWID > ?
        ORDER BY m.ROWID ASC
        LIMIT ?
        """,
        (last_rowid, BATCH_SIZE),
    )

    count = 0
    for phone, rowid, text, msg_time in cursor:
        # Skip spam: short codes, emails
        digits = re.sub(r"\D", "", phone)
        if len(digits) < 7 or "@" in phone:
            write_state(INBOUND_STATE, rowid)
            continue
        area = digits[1:4] if len(digits) == 11 else digits[:3]
        if area == "555":
            write_state(INBOUND_STATE, rowid)
            continue

        # Detect file transfer GUID artifacts
        att_type, att_name = None, None
        if text and "kIMFileTransferGUID" in text:
            text = None  # Force attachment lookup

        # Check for attachment if no text
        if not text or len(text.strip()) < 1:
            att_type, att_name = get_attachment_info(db, rowid)
            if att_type:
                text = f"[{att_type.upper()}: {att_name}]" if att_name else f"[{att_type.upper()} attached]"
            else:
                write_state(INBOUND_STATE, rowid)
                continue

        if insert_message(phone, text.strip(), "Inbound", msg_time, att_type, att_name):
            log(f"IN  {normalize_phone(phone)}: {text[:60]}")
            count += 1

        write_state(INBOUND_STATE, rowid)

    return count


def sync_outbound(db: sqlite3.Connection):
    """Sync outbound messages (is_from_me=1) from chat.db, with BLOB extraction."""
    last_rowid = read_state(OUTBOUND_STATE)
    cursor = db.execute(
        """
        SELECT h.id, m.ROWID, m.text, m.attributedBody,
            strftime('%Y-%m-%dT%H:%M:%SZ', m.date/1000000000 + 978307200, 'unixepoch') as msg_time
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        JOIN chat c ON cmj.chat_id = c.ROWID
        JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.is_from_me = 1 AND m.ROWID > ?
        ORDER BY m.ROWID ASC
        LIMIT ?
        """,
        (last_rowid, BATCH_SIZE),
    )

    count = 0
    for phone, rowid, text, attr_blob, msg_time in cursor:
        # Try text column first, fall back to BLOB extraction
        msg_text = text
        if not msg_text or len(msg_text.strip()) < 1:
            msg_text = extract_text_from_blob(attr_blob) if attr_blob else None

        # Detect file transfer GUID artifacts from BLOB extraction
        att_type, att_name = None, None
        if msg_text and "kIMFileTransferGUID" in msg_text:
            msg_text = None  # Force attachment lookup

        if not msg_text or len(msg_text.strip()) < 1:
            # No text and no BLOB — check for attachment
            att_type, att_name = get_attachment_info(db, rowid)
            if att_type:
                msg_text = f"[{att_type.upper()}: {att_name}]" if att_name else f"[{att_type.upper()} sent]"
            else:
                write_state(OUTBOUND_STATE, rowid)
                continue

        if insert_message(phone, msg_text.strip(), "Outbound", msg_time, att_type, att_name):
            log(f"OUT {normalize_phone(phone)}: {msg_text[:60]}")
            count += 1

        write_state(OUTBOUND_STATE, rowid)

    return count


# ── Main Loop ───────────────────────────────────────────────────────────────
log(f"Starting {STATION_NAME} sync (interval: {SYNC_INTERVAL}s, batch: {BATCH_SIZE})")
log(f"DB: {DB_PATH}")
log(f"Supabase: {SUPABASE_URL}")

while True:
    try:
        db = sqlite3.connect(DB_PATH)
        inbound = sync_inbound(db)
        outbound = sync_outbound(db)
        db.close()

        if inbound > 0 or outbound > 0:
            log(f"Synced: {inbound} inbound, {outbound} outbound")
    except Exception as e:
        log(f"ERROR: {e}")

    time.sleep(SYNC_INTERVAL)
