# Vernacular — Integration & Configuration Roadmap

**Owner:** Jackson Fitzgerald, Hedge Inc.
**Status:** Planning
**Last Updated:** March 2026

---

## Overview

This roadmap covers the external integration layer for Vernacular — enabling human alerting, contact data ingestion, and remote configuration/control via Slack, Gmail, and an MCP server for Claude Desktop. Integrations are additive to the core closed-loop architecture and do not touch the station pipeline directly.

---

## Integration Tiers

| Priority | Integration | Purpose | Phase |
|----------|-------------|---------|-------|
| P0 | **MCP Server (Claude Desktop)** | Config & control Vernacular from Claude | Phase 2 |
| P0 | **Slack** | Human alerts + override triggers | Phase 2 |
| P1 | **Gmail** | Contact sync + inbound lead ingestion | Phase 2-3 |
| P2 | **Webhooks / REST API** | General-purpose outbound events | Phase 3 |
| P2 | **CRM (HubSpot / Salesforce)** | Bi-directional contact enrichment | Phase 3 |
| P3 | **Zapier / Make** | No-code automation layer | Phase 3+ |

---

## Phase 2 Integrations

### 1. MCP Server for Claude Desktop

**Purpose:** Allow operators to query, configure, and control Vernacular stations directly from Claude Desktop using natural language.

**MCP Tools:**

| Tool Name | Description |
|-----------|-------------|
| `get_station_status` | Returns online/offline status, last write time, model in use |
| `list_conversations` | Pulls active conversations across all stations |
| `get_thread` | Fetches full message history for a contact |
| `send_message` | Triggers an outbound message from a specified station |
| `pause_station` | Disables auto-reply on a station (human takeover mode) |
| `resume_station` | Re-enables auto-reply on a station |
| `update_system_prompt` | Overwrites the persona/system prompt for a station |
| `flag_conversation` | Marks a conversation for human review |
| `get_model_router_logs` | Returns recent model router decisions |

### 2. Slack Integration

Real-time human alerting and lightweight override triggers.

**Alert Events -> Slack:**
- Conversation flagged -> #vernacular-flags
- Ollama fallback triggered -> #vernacular-ops
- Station goes offline -> #vernacular-ops
- New inbound from unknown contact -> #vernacular-leads

**Interactive Override (v2):**
- [Take Over] — pauses auto-reply
- [Dismiss] — unflag
- [View Thread] — deep link to UI

### 3. Gmail Integration

- Contact ingestion from labeled emails
- Outbound email summaries for flagged conversations

---

## Phase 3 Integrations

### 4. REST API
### 5. CRM Integration (HubSpot / Salesforce)
### 6. Zapier / Make

---

## Build Order

```
1. MCP Server (local, stdio transport)
2. Slack webhooks (alerting only)
3. Vernacular REST API (internal)
4. Slack interactive messages
5. Gmail contact ingestion
6. Gmail outbound summaries
7. CRM sync worker
8. Public webhook registration
```

## Open Questions

1. MCP transport — stdio (local) or SSE (hosted)?
2. Slack interactivity in v1 — buttons or just links?
3. Gmail OAuth vs. service account?
4. API auth — secret key or JWT?
5. Config hot-reload — poll cycle (3s) or restart signal?
