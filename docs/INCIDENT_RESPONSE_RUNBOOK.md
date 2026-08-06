# Incident response runbook — ZSMS

**Audience:** on-call / platform engineering  
**Related:** [SECRET_ROTATION.md](./SECRET_ROTATION.md), [SECURITY_PHASE8_OBSERVABILITY.md](./SECURITY_PHASE8_OBSERVABILITY.md)

Minors’ education data (grades, attendance, guardian phones) is in scope. Prefer **contain → assess → notify → remediate → review**.

---

## 1. Who gets paged

| Severity  | Examples                                                                                                                            | Page                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **SEV-1** | Confirmed data exposure across schools; auth secret leak with active abuse; payment webhook forging paid subscriptions              | Primary on-call **immediately** (phone/SMS). Escalate to engineering lead + product owner within 30 min. |
| **SEV-2** | Cross-tenant query alerts firing; repeated failed logins across many schools; SMS failure storm; Lipila webhook auth failures spike | Primary on-call within **15 min**.                                                                       |
| **SEV-3** | Single-school SMS outage; isolated 5xx; non-exploitable bug with PII in a log line                                                  | Next business hours / ticket; no phone page unless it escalates.                                         |

**Channels (fill with your roster):**

- Primary on-call: _[PagerDuty / phone rota]_
- Secondary: _[backup engineer]_
- Comms (school notifications): _[ops / customer success]_
- Legal / DPO (data exposure): _[named contact]_

**Signal sources:** Sentry issues tagged `alert=*`, Vercel logs (`event=login_failed`, `cross_tenant_query_attempt`, `payment_webhook_failure`), customer reports.

---

## 2. First 15 minutes (any SEV-1/2)

1. Acknowledge the page; open a war-room note (time, requestIds, schoolIds — **no pupil names**).
2. Confirm blast radius from logs: `requestId`, `schoolId`, route, alert type.
3. **Contain** if abuse is active:
   - Rotate the implicated secret (see §3).
   - Temporarily disable the feature flag / webhook / SMS provider if needed.
   - For auth compromise: revoke refresh tokens (see SECRET_ROTATION §5 / mass revoke).
4. Preserve evidence: export Sentry event + log query window; do not scrub production DB yet.
5. Decide severity; if SEV-1 data exposure, notify DPO/legal before public statements.

---

## 3. Rotate a leaked credential

Follow [SECRET_ROTATION.md](./SECRET_ROTATION.md). Quick map:

| Leak                           | Immediate action                                                       |
| ------------------------------ | ---------------------------------------------------------------------- |
| `JWT_SECRET` / refresh secret  | Rotate; mass-revoke sessions if compromise confirmed                   |
| `LIPILA_WEBHOOK_SECRET` / HMAC | Deploy new secret; update callback URLs; reject old secret fail-closed |
| `LIPILA_API_KEY`               | Issue new key in Lipila; update Vercel; revoke old                     |
| `AFRICASTALKING_API_KEY`       | Rotate AT key + username pair; watch SMS fail alerts                   |
| SMS gateway token              | Disable/rotate device in platform admin; prefer dedicated gateway      |
| `DATABASE_URL` / Neon          | Rotate DB password; update all envs; audit connections                 |
| `SENTRY_DSN`                   | Low urgency (write-only); rotate if project compromised                |
| `CRON_SECRET` / QStash         | Rotate; redeploy workers                                               |

After rotate: redeploy, verify health (`/api/health`), watch Sentry + payment/SMS alerts for 1 hour.

---

## 4. Notify affected schools (data exposure)

Use when pupil/guardian PII, grades, or cross-tenant records may have left the trust boundary.

1. **Identify schools** from `schoolId` in logs/ledger — not from guessing emails.
2. **Draft** (legal review for SEV-1):
   - What happened (facts, no speculation)
   - What data categories (e.g. “guardian phone numbers used for SMS”, not the numbers themselves)
   - Time window
   - What you did (containment, rotation)
   - What schools should do (force password reset for staff, watch parent SMS for phishing)
   - Contact for questions
3. **Notify** school admins via known admin emails in School records + phone if high severity. Do **not** SMS guardians with incident details that themselves expand exposure.
4. Log notification time + schoolIds in the incident ticket (no PII in the ticket title).
5. If statutory breach notification applies (Zambia Data Protection Act / contracts), DPO owns the clock — engineering supplies the technical timeline.

---

## 5. Scenario playbooks

### A. Repeated failed logins across tenants

1. Confirm Sentry `alert=repeated_failed_logins` or log `event=login_failed`.
2. Check IP hashes / geo in edge logs; tighten Cloudflare / proxy rate limits if needed.
3. If credential stuffing: force password reset for targeted accounts; consider temporary stricter `LOGIN_BRUTE_FORCE`.
4. Close when volume returns to baseline.

### B. Cross-tenant query pattern

1. Treat as **SEV-2** until proven false positive.
2. From alert context, note `model` + `operation` (IDs are not logged as a mapping pair).
3. Trace recent deploys / API routes touching that model.
4. If confirmed bug: hotfix tenant scope; audit whether responses leaked rows (log `requestId`s).
5. If confirmed exposure: escalate to SEV-1 and §4.

### C. SMS send failures above threshold

1. Check Africa’s Talking status + Android gateway online metrics.
2. Confirm not a bad deploy of sender ID / balance exhaustion.
3. Pause non-critical broadcasts; keep grades/attendance alerts if a fallback path works.
4. Refunds/credits already handled in app code where applicable — verify school balances if mass fail.

### D. Payment webhook failures

1. Distinguish **unauthorized** (secret mismatch / attack) vs **parse/handler** errors.
2. Unauthorized spike after a rotate: verify Lipila callback URL embeds the new secret.
3. Unauthorized without rotate: assume probing — confirm fail-closed; do not loosen auth.
4. Handler errors: check `PaymentLedgerEntry` for REJECTED\_\* / stuck pending; reconcile manually before replaying.

---

## 6. After-action (within 5 business days)

- Timeline, root cause, blast radius (school count, data categories)
- Gaps in detection / runbook
- Follow-up tickets (tests, alerts, docs)
- Update this runbook if steps were wrong or missing

---

## 7. What never to do

- Paste pupil names, NRCs, full phone lists, or mark sheets into Slack/Sentry/tickets
- Disable webhook authentication “temporarily” to unblock payments
- Notify parents with speculative breach details before containment
- Commit rotated secrets to git or share via unencrypted email
