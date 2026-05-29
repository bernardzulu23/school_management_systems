# Secret Rotation Runbook

> Owner: platform engineering. Rotate on a schedule and immediately on any suspected leak.

All secrets live in the Vercel project environment (and `.env.local` for dev).
**Never** commit secrets — `.github/workflows/security.yml` runs a TruffleHog scan
on every push. This runbook explains how to rotate each secret with minimal or
zero downtime.

## Token model (context)

- **Access token** — `JWT_SECRET`, HS256, `aud: zsms-api`, 8h (30d with
  "remember me"). Verified in `lib/middleware/auth.ts`.
- **Refresh token** — `JWT_REFRESH_SECRET`, HS256, 7d (90d with "remember me"),
  rotated on every use with reuse detection (`app/api/auth/refresh/route.js`).
- All signing/verification pins `HS256` (blocks algorithm-confusion / `none`).

---

## 1. `JWT_SECRET` — zero-downtime rotation

The verifier accepts **two** secrets at once via `JWT_SECRET_PREVIOUS`, so active
access tokens stay valid through the change.

1. Generate a new secret (≥ 32 bytes):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
2. In Vercel env, set:
   - `JWT_SECRET_PREVIOUS` = the **current** `JWT_SECRET` value
   - `JWT_SECRET` = the **new** value
3. Redeploy. New tokens are signed with the new secret; old tokens still verify
   against `JWT_SECRET_PREVIOUS`.
4. **Wait for the longest access-token lifetime to elapse** (8h normal, or up to
   30d if "remember me" is enabled — force re-login sooner if rotating due to a
   compromise, see §5).
5. Remove `JWT_SECRET_PREVIOUS` from Vercel env and redeploy. Rotation complete.

> Compromise shortcut: if the old secret is leaked, skip the grace window —
> rotate `JWT_SECRET` (no `JWT_SECRET_PREVIOUS`) and run the mass-revocation in §5
> so every existing session is invalidated immediately.

## 2. `JWT_REFRESH_SECRET`

Refresh tokens are persisted in the `RefreshToken` table, so rotation = invalidate
all refresh tokens (users silently get new ones on next login).

1. Set the new `JWT_REFRESH_SECRET` in Vercel env and redeploy.
2. Existing refresh tokens fail verification → the frontend interceptor
   (`lib/api.js`) redirects to login. Access tokens keep working until they expire.
3. Optionally pre-empt confusion by clearing stale rows:
   ```sql
   UPDATE "RefreshToken" SET revoked = true WHERE revoked = false;
   ```

## 3. `GROQ_API_KEY` (AI)

1. Create a new key at console.groq.com.
2. Set `GROQ_API_KEY` in Vercel env, redeploy.
3. Revoke the old key in the Groq console. No user-facing downtime (server-side only).

## 4. Provider keys — `LIPILA_API_KEY`, `AFRICASTALKING_API_KEY`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`

All are server-side only; rotation is a simple swap:

1. Provision a new key in the provider dashboard.
2. Update the env var in Vercel, redeploy.
3. Revoke the old key.

Notes:

- `AFRICASTALKING_API_KEY` also requires the matching `AFRICASTALKING_USERNAME`.
- `LIPILA_API_KEY` — verify the matching `LIPILA_BASE_URL` (sandbox vs production).
- `BLOB_READ_WRITE_TOKEN` is managed automatically when using the Vercel Blob
  integration; rotate by regenerating the store token in Storage → Blob.
- `CRON_SECRET` protects `/api/cron/*`; update the Vercel Cron config to match.

## 5. Forced global logout (compromise response)

To invalidate **every** session immediately (independent of token lifetime):

1. Rotate `JWT_SECRET` **without** `JWT_SECRET_PREVIOUS` → all access tokens fail.
2. Revoke all refresh tokens:
   ```sql
   UPDATE "RefreshToken" SET revoked = true;
   ```
3. Redeploy. All users must log in again.

## Rotation schedule (recommended)

| Secret                              | Cadence        | Trigger                       |
| ----------------------------------- | -------------- | ----------------------------- |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | every 90 days  | + on any suspected leak       |
| Provider API keys                   | every 180 days | + on staff offboarding / leak |
| `CRON_SECRET`                       | every 180 days | + on leak                     |
