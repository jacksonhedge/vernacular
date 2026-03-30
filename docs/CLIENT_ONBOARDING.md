# Vernacular — Client Onboarding Runbook

**For each new client, follow these steps in order.**

---

## Prerequisites

- [ ] Mac Mini (or MacBook) available for this client's station
- [ ] Phone number assigned (AT&T/Verizon prepaid — NOT T-Mobile)
- [ ] Apple ID created for this client's station
- [ ] SIM card inserted in a paired iPhone (one-time activation), then iPhone can be removed
- [ ] Mac signed into the Apple ID with iMessage enabled
- [ ] Full Disk Access granted to Terminal on the Mac

---

## Step 1: Create the Organization

In Supabase (or via the admin API):

```sql
INSERT INTO organizations (name, slug, plan)
VALUES ('Client Company Name', 'client-slug', 'starter');
```

Note the returned `organization_id`.

---

## Step 2: Create the Station

```sql
INSERT INTO stations (
  name, phone_number, apple_id, machine_name,
  organization_id, runner_id, status, auto_reply_enabled
)
VALUES (
  'ClientName-Station-1',
  '+1XXXXXXXXXX',
  'client-station@vernacular.chat',
  'MacMini-ClientName',
  '<organization_id>',
  '<runner_id>',
  'offline',
  false
);
```

Note the returned `station_id`.

---

## Step 3: Create the Admin User

The client's primary login:

```sql
-- First, create the Supabase auth user (via dashboard or API)
-- Then link it:
INSERT INTO users (auth_id, organization_id, email, full_name, role)
VALUES (
  '<supabase_auth_user_id>',
  '<organization_id>',
  'client@company.com',
  'Client Name',
  'owner'
);
```

---

## Step 4: Generate API Key for the Engine

```sql
INSERT INTO api_keys (
  organization_id, name, key_hash, key_prefix, scopes, created_by
)
VALUES (
  '<organization_id>',
  'Engine Key - Station 1',
  '<bcrypt_hash_of_key>',       -- generate with: node -e "console.log(require('bcrypt').hashSync('vnc_engine_xxxxx', 10))"
  'vnc_eng_',                    -- first 8 chars of the key
  ARRAY['read', 'write', 'send_message'],
  NULL
);
```

Save the actual key (before hashing) — you'll need it for the engine config.

---

## Step 5: Configure Organization Settings

```sql
INSERT INTO org_settings (
  organization_id, company_name, ai_auto_draft, ai_model,
  quiet_hours_start, quiet_hours_end, quiet_hours_timezone,
  max_messages_per_day, max_blast_recipients
)
VALUES (
  '<organization_id>',
  'Client Company Name',
  true,                          -- AI drafts responses automatically
  'claude-sonnet-4-20250514',
  '21:00', '08:00',             -- No sends 9pm-8am
  'America/New_York',
  500,                           -- Daily message limit
  50                             -- Max blast recipients
);
```

---

## Step 6: Set Up the Mac

SSH or sit at the Mac and run:

```bash
# Clone the repo
git clone https://github.com/jacksonhedge/vernacular.git
cd vernacular

# Install dependencies
npm install

# Run the setup script
chmod +x engine/setup.sh
./engine/setup.sh
```

The setup script will:
1. Check that chat.db is accessible
2. Verify Full Disk Access
3. Prompt for station config
4. Write `.env.station`

---

## Step 7: Start the Engine

```bash
# Test run (foreground)
npx tsx engine/station.ts

# Production run (background with pm2)
npm install -g pm2
pm2 start "npx tsx engine/station.ts" --name "vernacular-station"
pm2 save
pm2 startup  # auto-start on reboot
```

---

## Step 8: Verify

1. **Check station status** in Supabase:
   ```sql
   SELECT name, status, last_heartbeat FROM stations WHERE id = '<station_id>';
   ```
   Should show `status = 'online'` and recent `last_heartbeat`.

2. **Send a test message** from another phone to the station's number.

3. **Check the web dashboard** — log in as the client user, verify the message appears.

4. **Test outbound** — compose a message in the web UI, verify it sends via iMessage.

---

## Step 9: Import Contacts (Optional)

If the client has a contact list (CSV, Google Form, etc.):

```bash
# CSV format: phone,first_name,last_name,email,school,greek_org
npx tsx engine/import-contacts.ts --file contacts.csv --org-id <organization_id>
```

Or via the API:
```bash
curl -X POST https://vernacular.chat/api/contacts \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+14125551234","first_name":"Jake","last_name":"Smith"}'
```

---

## Step 10: Configure Campaign (Optional)

If the client has a specific outreach campaign:

```sql
INSERT INTO campaigns (
  name, brand, description, system_prompt,
  affiliate_link, restricted_states, goal_per_contact, payout_per_contact
)
VALUES (
  'Campaign Name',
  'Brand Name',
  'Description of the campaign goals',
  'You are a friendly outreach agent for [Brand]. Your goal is to [objective]. Be casual, use first names, keep messages short.',
  'https://tracking-link.com/ref',
  ARRAY['NY', 'CA'],  -- states where this product can't be offered
  25,                  -- signups needed per chapter
  1000                 -- payout amount
);
```

---

## Checklist Summary

| Step | What | Who |
|------|------|-----|
| 1 | Create org in Supabase | Platform admin |
| 2 | Create station record | Platform admin |
| 3 | Create user account | Platform admin |
| 4 | Generate engine API key | Platform admin |
| 5 | Configure org settings | Platform admin |
| 6 | Set up Mac + run setup.sh | Platform admin (on the Mac) |
| 7 | Start engine with pm2 | Platform admin (on the Mac) |
| 8 | Verify station online + test send/receive | Platform admin |
| 9 | Import contacts | Platform admin or client |
| 10 | Configure campaign | Platform admin or client |

**Time per client: ~30 minutes** (assuming Mac is prepped and SIM is ready)

---

## Scaling Notes

- Each Mac Mini runs 1 station (1 Apple ID, 1 number)
- Mac Minis can be rack-mounted (OWC, Sonnet)
- Use Tailscale for remote SSH to all Macs
- pm2 handles auto-restart on crash/reboot
- Monitor via Supabase dashboard (station heartbeats) or Slack alerts

---

## Troubleshooting

**Station shows "offline":**
- Check if the engine process is running: `pm2 status`
- Check logs: `pm2 logs vernacular-station`
- Verify `.env.station` has correct STATION_ID and ENGINE_KEY

**Messages not sending:**
- Verify iMessage is signed in: open Messages app on the Mac
- Check Full Disk Access for the terminal/pm2 process
- Test AppleScript manually: `osascript -e 'tell application "Messages" to send "test" to buddy "+1234567890"'`

**Messages not receiving:**
- iMessage must be the default messaging app
- Phone number must be registered to the Apple ID
- Check that chat.db is being updated: `sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message"`

**AI drafts not generating:**
- Check ANTHROPIC_API_KEY in environment
- Check org_settings.ai_auto_draft is true
- Check station.auto_reply_enabled is true
