# ZSMS chatbot — Phase 2 human handoff notes

## Pilot routing (locked)

**PILOT STAGE: escalations route to platform admin.** Once past single-school pilot, change escalation target to same-tenant Headteacher/HOD — see `ZSMS_chatbot_architecture_review.md`. This routing choice should not become permanent by default.

Code comments with the same wording live on:

- `app/api/chat/request-human/route.ts`
- `app/api/chat/send-message/route.ts` (RULE 5 path)
- `app/api/platform/support/queue/route.ts`
- `app/api/platform/support/sessions/[id]/claim/route.ts`
- `lib/ai/chat/handoff.ts`
- `app/platform/support/page.js`

### Who gets looped in?

| Actor                     | Sees invite / queue?                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Teacher / HOD (requester) | No personal invite. Chat shows waiting banner + claimer hint. Session stays open until claimed. |
| Headteacher (same school) | **No** — not the pilot claimer. School dashboards do not list `PENDING_HUMAN` handoffs.         |
| Platform admin            | **Yes** — Telegram metadata ping (if configured) + `/platform/support` queue + nav badge.       |

There is no magic “join link” emailed to the teacher who clicked Request human. The loop-in target is the **platform admin**, not the requester.

## How to claim a session (platform admin)

1. Sign in as platform admin on the apex domain (`/login` → `/platform`).
2. Open **Chat support** (`/platform/support`). A pending count badge appears in the left nav when handoffs are waiting.
3. Select a row under **Pending handoffs** (or open the Telegram deep link `…/platform/support?sessionId=<id>`).
4. Read the full transcript in the right panel.
5. Click **Claim** → status becomes `HUMAN_ACTIVE`; the teacher sees “An administrator has joined…”.
6. Reply in the console (optional **Connect live** if Durable Object WSS is configured).
7. **Close** when done → `CLOSED`.

### Assignee identity (pilot)

`PlatformAdmin` is a separate table from tenant `User`. Claim stores:

- `ChatSession.assignedToId` = platform JWT/`PlatformAdmin.id` (**no FK to User**)
- `ChatSession.assignedToName` = denormalized name/email for the support UI
- Claim / admin `ChatMessage` rows leave `userId` null (that column still FKs `User`)

Migration: `20260721200000_chat_session_assignee_no_user_fk` — run `npx prisma migrate deploy` in production after deploy.

## Telegram (metadata-only)

Deliberate pilot-stage choice: Telegram alerts include **tenant name, role, and admin console deep link only**. Message content is never sent. Full transcripts are read in `/platform/support`.

Deep link origin: `NEXT_PUBLIC_APP_ORIGIN` or `NEXT_PUBLIC_APP_URL` (fallback `http://localhost:3000`).

### Env required for Telegram invites

| Variable                                         | Required for ping?                       |
| ------------------------------------------------ | ---------------------------------------- |
| `TELEGRAM_BOT_TOKEN`                             | Yes                                      |
| `TELEGRAM_CHAT_ID`                               | Yes                                      |
| `NEXT_PUBLIC_APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` | Recommended (correct absolute deep link) |

If Telegram env is missing:

- Session still becomes `PENDING_HUMAN` (handoff works).
- Server logs a **warning** (not silent success).
- API returns `telegramSent: false` + `telegramReason` + `telegramSkippedHint`.
- Teacher UI shows that Telegram was not sent and that an admin must use Platform → Chat support.

Optional live relay: `NEXT_PUBLIC_CHAT_DO_WSS_URL`, `CHAT_DO_SHARED_SECRET` (see `chat-realtime/README.md`).

## API shape (`POST /api/chat/request-human`)

```json
{
  "success": true,
  "sessionId": "…",
  "status": "PENDING_HUMAN",
  "reply": "I am looping in an administrator…",
  "telegramSent": false,
  "telegramReason": "not_configured",
  "claimerHint": "An administrator has been notified. Platform admins claim…",
  "adminClaimPath": "/platform/support",
  "telegramSkippedHint": "Telegram alert was not sent…"
}
```

When `telegramSent` is true, `telegramReason` / `telegramSkippedHint` are omitted.

## Durable Objects

Package: `chat-realtime/` (Cloudflare Workers + one DO per `chatSession.id`). Deploy steps and env wiring: `chat-realtime/README.md`.

Admin claim verifies `platform_admin` in Next.js **before** notifying the DO (`POST /internal/claim`). The DO rejects admin WebSockets unless `claimedAdminId` matches the signed ticket’s `userId`.
