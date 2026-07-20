# ZSMS Chat Realtime (Cloudflare Durable Objects)

Phase 2 human-handoff WebSocket relay. One Durable Object instance per `chatSession.id`.

## What it does

- Accepts WebSocket clients (teacher/HOD browser + claiming platform admin).
- On `HUMAN_ACTIVE`, relays typed messages; rejects AI-token shaped payloads.
- Admin WS is accepted **only after** Next.js calls `POST /internal/claim` (which runs only after server-side `platform_admin` verification). The DO never trusts a client-supplied role alone.

## Deploy

```bash
cd chat-realtime
npm install
npx wrangler login
npx wrangler secret put CHAT_DO_SHARED_SECRET   # same value as Next.js CHAT_DO_SHARED_SECRET
npx wrangler deploy
```

Note the worker URL, e.g. `https://zsms-chat-realtime.<account>.workers.dev`.

## Next.js env

```env
# Browser WebSocket base (no path). Client appends /ws?...
NEXT_PUBLIC_CHAT_DO_WSS_URL=wss://zsms-chat-realtime.<account>.workers.dev

# Shared HMAC + internal auth (must match wrangler secret)
CHAT_DO_SHARED_SECRET=<long-random-secret>

# Telegram (metadata-only alerts)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Local stub

If `NEXT_PUBLIC_CHAT_DO_WSS_URL` is unset:

- Handoff still works (PENDING_HUMAN → claim → HUMAN_ACTIVE → CLOSED via HTTP APIs).
- Live relay is skipped; admin/user UIs refresh via HTTP after send.
- `wrangler dev` in this folder provides a local DO for integration testing.

## PILOT STAGE routing

Escalations route to **platform admin**. Once past single-school pilot, change escalation target to same-tenant Headteacher/HOD — see `ZSMS_chatbot_architecture_review.md`. This routing choice should not become permanent by default.

Telegram alerts are **metadata-only** (tenant name, role, admin console link) — never message content. Deliberate pilot-stage choice.
