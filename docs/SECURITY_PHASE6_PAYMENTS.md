# Phase 6 — Lipila payments hardening (audit + fixes)

**Date:** 2026-08-05  
**Scope:** Lipila mobile money (school fees, plan upgrades, onboarding)

## Audit scorecard

| #   | Criterion                        | Pre-fix                                                                     | Post-fix                                                                                                                                                        |
| --- | -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Webhook auth before marking paid | **PARTIAL** — shared secret enforced fail-closed; no body HMAC              | **PASS\*** — secret still required; optional HMAC via `LIPILA_WEBHOOK_HMAC_SECRET` / `LIPILA_REQUIRE_HMAC`; query secret still allowed for Lipila header limits |
| 2   | Amount/currency cross-check      | **FAIL** — callback ignored amount; fee amount client-trusted at initiate   | **PASS** — webhook amount/currency compared to stored payment; plan/onboarding server-priced; fee initiate locks currency + optional invoice bind               |
| 3   | Idempotent duplicate webhooks    | **PARTIAL** — fee paid-dup skip; plan could re-extend; paid→failed possible | **PASS** — terminal paid is sticky; duplicates return handled without re-credit; ledger `eventKey` unique                                                       |
| 4   | Append-only reconciliation       | **FAIL** — in-place status only                                             | **PASS\*** — immutable `PaymentLedgerEntry` for every transition; payment row status remains denormalized current state (no delete; no paid→failed)             |
| 5   | API keys server-only + rotation  | **PASS** (keys); rotation incomplete                                        | **PASS** — keys remain server-only; `SECRET_ROTATION.md` covers `LIPILA_API_KEY` + `LIPILA_WEBHOOK_SECRET`                                                      |

\* Lipila does not document a public body-signature scheme; shared secret remains the primary gate. HMAC is opt-in when the provider or a reverse-proxy can sign.

## Gaps found (pre-fix)

1. Callbacks authenticated with `LIPILA_WEBHOOK_SECRET` but payload amount/currency never checked against DB.
2. Fee `POST /api/payments/mobile-money` accepted client `amount` and client `callbackUrl`.
3. Duplicate plan paid webhooks could re-run `planExpiresAt` extension.
4. Paid records could be overwritten to `failed` on a late failure callback.
5. No append-only payment event ledger; `SECRET_ROTATION.md` omitted webhook secret.

## Code map

| Area           | Files                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Auth           | `lib/security/webhookAuth.js`, callback routes                        |
| Parse + amount | `lib/payments/lipilaCallback.js`                                      |
| Activate       | `lib/payments/feePayments.js`, `lib/billing/activate-plan-payment.js` |
| Ledger         | `lib/payments/paymentLedger.js`, `PaymentLedgerEntry` model           |
| Initiate       | `app/api/payments/mobile-money/route.js`                              |
| Docs           | this file, `docs/SECRET_ROTATION.md`                                  |
