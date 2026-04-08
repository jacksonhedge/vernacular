# Vernacular × Intercom Integration — Complete Implementation Plan

**Goal:** Build a Vernacular app for Intercom that adds "Continue in iMessage" to any Intercom Messenger, billing $0.99 per resolved ticket.

**Who does the work:** Us (Vernacular). Client clicks Install. Intercom does nothing.

**Revenue:** $0.99 per ticket resolved via iMessage + $50/mo integration add-on.

**Competition:** Zero. No one on the Intercom marketplace does native iMessage.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 INTERCOM MESSENGER                   │
│                                                     │
│  Customer: "I need help with my account"            │
│  AI Bot: "I can help! Or if you prefer..."         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  💬 Continue in iMessage                     │   │
│  │  Get a direct text from our support team     │   │
│  │                    [Text Us →]                │   │
│  └─────────────────────────────────────────────┘   │
│           ↓ (Canvas Kit card)                       │
└─────────────────────────────────────────────────────┘
                    │
                    │ User clicks "Text Us"
                    │ Opens: sms:+14125128437&body=Re: account help
                    ↓
┌─────────────────────────────────────────────────────┐
│              VERNACULAR STATION (Wade)                │
│                                                     │
│  Receives iMessage → AI responds → Conversation     │
│  tracked in Vernacular dashboard                    │
│                                                     │
│  Webhook → Intercom: "Continued via iMessage"       │
│  Webhook → Vernacular billing: $0.99 logged         │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Tables (Day 1 — 30 min)

Create these tables. None exist yet.

```sql
-- Widget/support config per client
CREATE TABLE widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  station_id UUID REFERENCES stations(id),
  client_name TEXT NOT NULL,
  brand_color TEXT DEFAULT '#378ADD',
  greeting TEXT DEFAULT 'Hi! How can I help you today?',
  ai_system_prompt TEXT,
  handoff_trigger_turns INT DEFAULT 3,
  handoff_trigger_keywords TEXT[],
  ticket_rate_cents INT DEFAULT 99,  -- $0.99
  embed_token UUID DEFAULT gen_random_uuid() UNIQUE,
  intercom_app_id TEXT,              -- Intercom workspace ID
  intercom_access_token TEXT,        -- OAuth token
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Widget/Intercom conversations
CREATE TABLE widget_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_config_id UUID REFERENCES widget_configs(id),
  station_id UUID REFERENCES stations(id),
  intercom_conversation_id TEXT,     -- Intercom's conversation ID
  session_id TEXT,                   -- browser session (widget) or intercom ID
  source TEXT DEFAULT 'widget',      -- 'widget' | 'intercom' | 'direct'
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  status TEXT DEFAULT 'open',        -- open | resolved | handed_off | escalated
  resolution_method TEXT,            -- 'ai' | 'imessage_handoff' | 'human'
  message_count INT DEFAULT 0,
  handed_off_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  billed BOOLEAN DEFAULT false,
  bill_amount_cents INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Widget/Intercom messages
CREATE TABLE widget_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES widget_conversations(id),
  role TEXT NOT NULL,                -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Per-ticket billing ledger
CREATE TABLE widget_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_config_id UUID REFERENCES widget_configs(id),
  conversation_id UUID REFERENCES widget_conversations(id),
  organization_id UUID,
  amount_cents INT NOT NULL DEFAULT 99,
  source TEXT DEFAULT 'widget',      -- 'widget' | 'intercom'
  billed_at TIMESTAMPTZ DEFAULT now()
);

-- FAQ knowledge base (per client)
CREATE TABLE widget_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_config_id UUID REFERENCES widget_configs(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  times_used INT DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Widget API Routes (Day 1-2 — 4 hours)

Build 5 routes under `/app/api/widget/`:

### POST /api/widget/session
```
Input:  { embed_token, session_id, visitor_name?, visitor_email? }
Output: { conversation_id, greeting, brand_color, station_phone }
Logic:  Validate embed_token → lookup widget_config → create/resume widget_conversation
```

### POST /api/widget/chat
```
Input:  { conversation_id, embed_token, message }
Output: { reply, offer_handoff, tokens_used }
Logic:
  1. Validate embed_token
  2. Save user message to widget_messages
  3. Check FAQs for match (skip API if >80% match)
  4. Build system prompt from widget_config.ai_system_prompt
  5. Call Claude Haiku (cheapest model — client doesn't choose)
  6. Detect [OFFER_IMESSAGE] in response → set offer_handoff: true
  7. Save assistant message
  8. Increment message_count
  9. Track tokens in ai_usage
```

### POST /api/widget/handoff
```
Input:  { conversation_id, embed_token }
Output: { phone_number, sms_link, context_message }
Logic:
  1. Update widget_conversation: status='handed_off', handed_off_at=now
  2. Summarize conversation (last 3 messages) as context
  3. Return sms:+1{station_phone}&body={url_encoded_context}
  4. Log system message: "Customer requested iMessage handoff"
```

### POST /api/widget/resolve
```
Input:  { conversation_id, embed_token, resolution_method }
Output: { billed_amount_cents }
Logic:
  1. Update: status='resolved', resolved_at=now, resolution_method
  2. Lookup ticket_rate_cents from widget_config (default $0.99)
  3. Insert row into widget_billing
  4. Set billed=true on conversation
  5. Deduct credits from org
```

### GET /api/widget/config/[embed_token]
```
Output: { client_name, brand_color, greeting, station_phone, is_active }
Logic:  Public route. Cached. Used by widget.js and Intercom app to initialize.
```

---

## Phase 3: Connect widget.js to Backend (Day 2 — 2 hours)

The widget UI (592 lines, public/widget.js) already exists but calls no backend.

Wire it up:
1. On open → `POST /api/widget/session` with embed_token from script tag
2. On user message → `POST /api/widget/chat`
3. Show AI response in chat
4. When `offer_handoff: true` → show "Continue in iMessage" card
5. On handoff click → `POST /api/widget/handoff` → open `sms:` link
6. On widget close (after ≥1 AI reply) → `POST /api/widget/resolve`

---

## Phase 4: Intercom Canvas Kit App (Day 2-3 — 4 hours)

### 4a. Create Intercom App Endpoint

**POST /api/intercom/canvas**

Intercom sends `initialize` or `submit` events. We return JSON canvases.

```typescript
// Initialize — show the "Continue in iMessage" card
if (event === 'initialize') {
  return {
    canvas: {
      content: {
        components: [
          { type: 'text', text: '💬 Continue in iMessage', style: 'header' },
          { type: 'text', text: 'Get a direct text from our support team. Faster responses, blue bubbles.' },
          { type: 'button', label: 'Text Us →', style: 'primary', action: {
            type: 'url',
            url: `sms:${stationPhone}&body=${encodeURIComponent(contextMessage)}`
          }},
          { type: 'spacer', size: 's' },
          { type: 'text', text: 'Powered by Vernacular', style: 'muted' }
        ]
      }
    }
  };
}
```

### 4b. Intercom Webhook Receiver

**POST /api/intercom/webhook**

Listen for conversation events:

```typescript
// conversation.user.created → log new conversation
if (topic === 'conversation.user.created') {
  // Create widget_conversation with source='intercom'
  // intercom_conversation_id = payload.data.item.id
}

// conversation.admin.closed → bill $0.99
if (topic === 'conversation.admin.closed') {
  // Find our widget_conversation by intercom_conversation_id
  // Call resolve logic → bill $0.99
  // Tag conversation in Intercom: "Resolved via Vernacular"
}

// conversation.user.replied → sync message
if (topic === 'conversation.user.replied') {
  // Save to widget_messages for history
}
```

### 4c. Intercom REST API Integration

**POST /api/intercom/sync**

After iMessage conversation ends, push a note back to Intercom:

```typescript
// Add note to Intercom conversation
await fetch(`https://api.intercom.io/conversations/${intercomConvId}/reply`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message_type: 'note',
    type: 'admin',
    admin_id: adminId,
    body: `<p>Customer continued via iMessage through Vernacular.</p>
           <p>iMessage conversation: ${messageCount} messages</p>
           <p>Resolution: ${resolutionMethod}</p>`
  })
});

// Add tag
await fetch(`https://api.intercom.io/conversations/${intercomConvId}/tags`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: JSON.stringify({ id: tagId }) // "vernacular-imessage" tag
});
```

---

## Phase 5: Intercom OAuth Setup (Day 3 — 2 hours)

For public app (marketplace listing):

### OAuth Flow

1. Client clicks "Connect Vernacular" in Intercom settings
2. Redirect to: `https://app.intercom.com/oauth?client_id=VERNACULAR_CLIENT_ID&redirect_uri=https://vernacular.chat/api/intercom/oauth/callback`
3. Client authorizes
4. Intercom redirects back with `code`
5. Exchange for access token: `POST https://api.intercom.io/auth/eagle/token`
6. Store token in `widget_configs.intercom_access_token`

### API Route

**GET /api/intercom/oauth/callback**
```
1. Exchange code for token
2. Store token in widget_configs
3. Redirect to vernacular.chat/dashboard with success message
```

---

## Phase 6: Billing — $0.99 Per Resolved Ticket (Day 3 — 1 hour)

### When does a ticket count as "resolved"?

| Trigger | Source | Billable? |
|---------|--------|-----------|
| Admin closes conversation in Intercom | Webhook: `conversation.admin.closed` | ✅ $0.99 |
| User closes widget after ≥1 AI reply | `POST /api/widget/resolve` | ✅ $0.99 |
| iMessage handoff completed | `POST /api/widget/handoff` | ✅ $0.99 |
| User abandons widget (no AI reply) | Timer / no resolve call | ❌ Not billed |
| Conversation auto-closed after 24h inactivity | Cron job | ✅ $0.99 |

### Billing Flow

```
Conversation resolved
  → INSERT into widget_billing (amount_cents: 99, source: 'intercom')
  → UPDATE widget_conversations SET billed=true
  → deductCredits(orgId, 'support_ticket_resolved')
  → Monthly invoice includes: "47 tickets × $0.99 = $46.53"
```

### Dashboard Metrics

Show on the client's dashboard:
- Tickets resolved this month: 47
- AI-resolved (no handoff): 31 (66%)
- iMessage handoffs: 16 (34%)
- Total billed: $46.53
- Average resolution time: 2.3 minutes

---

## Phase 7: Dashboard — Widget Management (Day 4 — 4 hours)

### /dashboard → Integrations tab (add Intercom card)

Show alongside existing integrations:
- Connected status (green/gray)
- "Connect Intercom" button → OAuth flow
- Workspace name after connected

### /dashboard → Customer Support view (when solution type selected)

**Widget Config:**
- Brand color picker
- Greeting message editor
- AI system prompt
- Handoff trigger settings (turns + keywords)
- Embed code with copy button

**Ticket Dashboard:**
- Table: Time | Visitor | Source (widget/intercom) | Messages | Resolution | Billed
- Filters: status, source, date
- Click → conversation thread slide-over

**Billing Summary:**
- Tickets this month / Revenue
- Resolution method breakdown (pie chart)
- Daily ticket volume (bar chart)

---

## Phase 8: Intercom App Store Submission (Day 5 — 2 hours)

### What Intercom Needs

1. **App name:** "Vernacular — iMessage for Support"
2. **Description:** "Add iMessage as a support channel. When customers prefer texting, one tap moves the conversation to blue bubble iMessage."
3. **Logo:** Vernacular logo (256×256)
4. **Screenshots:** Canvas Kit card in Messenger, dashboard
5. **Categories:** Customer Support, Messaging
6. **Pricing:** Free to install (we bill through our platform)
7. **OAuth redirect URI:** `https://vernacular.chat/api/intercom/oauth/callback`
8. **Webhook URL:** `https://vernacular.chat/api/intercom/webhook`
9. **Canvas Kit URL:** `https://vernacular.chat/api/intercom/canvas`

### Private App (Immediate)
- No review needed
- Install URL: direct to clients
- Test with our own Intercom workspace

### Public App (After validation)
- Submit for review (~1-2 weeks)
- Available to 25,000+ Intercom customers
- Intercom takes NO revenue cut

---

## Build Order

| Day | What | Hours | Deliverable |
|-----|------|-------|-------------|
| 1 | DB tables + Widget API routes | 4h | 5 working API routes |
| 2 | Connect widget.js + Canvas Kit app | 6h | Working widget + Intercom card |
| 3 | Intercom webhooks + OAuth + billing | 3h | Full Intercom ↔ Vernacular sync |
| 4 | Dashboard: widget config + ticket view | 4h | Client self-serve setup |
| 5 | Intercom app submission + testing | 2h | Private app live |
| **Total** | | **19h** | **Full integration** |

---

## Revenue Model

### Per Client
```
Customer Support base:        $100/mo
Intercom add-on:               $50/mo
Average 100 tickets/mo × $0.99: $99/mo
                              ─────────
Per client revenue:           $249/mo
```

### At Scale (50 Intercom clients)
```
50 × $150/mo (base + add-on):  $7,500/mo
50 × 100 tickets × $0.99:      $4,950/mo
                               ─────────
Monthly revenue:              $12,450/mo
Annual:                      $149,400/yr
```

### Cost to Us
- Claude Haiku per ticket: ~$0.001 (500 tokens avg)
- Per $0.99 ticket: $0.001 cost = 99.9% margin
- iMessage relay: already built (Mac station cost is fixed)

---

## Files to Create

```
src/app/api/widget/session/route.ts
src/app/api/widget/chat/route.ts
src/app/api/widget/handoff/route.ts
src/app/api/widget/resolve/route.ts
src/app/api/widget/config/[token]/route.ts
src/app/api/intercom/canvas/route.ts
src/app/api/intercom/webhook/route.ts
src/app/api/intercom/oauth/callback/route.ts
src/app/api/intercom/sync/route.ts
```

---

## Environment Variables

```env
# Intercom (add to .env.local + Vercel)
INTERCOM_CLIENT_ID=           # from Intercom Developer Hub
INTERCOM_CLIENT_SECRET=       # from Intercom Developer Hub
INTERCOM_WEBHOOK_SECRET=      # webhook signature verification
```

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Intercom changes Canvas Kit API | Low | Their API is stable, versioned |
| Apple blocks Mac relay | Medium | Multiple stations, different Apple IDs |
| Client doesn't get tickets | Low | Widget is proven UX (Intercom, Drift, etc.) |
| Intercom rejects public app | Low | "iMessage handoff" is unique value, not competitive |

---

**Ready to build tomorrow. Start with Phase 1 (DB tables) and Phase 2 (API routes).**
