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

## Telegram (metadata-only)

Deliberate pilot-stage choice: Telegram alerts include **tenant name, role, and admin console deep link only**. Message content is never sent. Full transcripts are read in `/platform/support`.

## Durable Objects

Package: `chat-realtime/` (Cloudflare Workers + one DO per `chatSession.id`). Deploy steps and env wiring: `chat-realtime/README.md`.

Admin claim verifies `platform_admin` in Next.js **before** notifying the DO (`POST /internal/claim`). The DO rejects admin WebSockets unless `claimedAdminId` matches the signed ticket’s `userId`.
