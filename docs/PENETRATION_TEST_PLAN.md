# ZSMS Penetration Test Plan

Manual and automated checks for Phase 4 security controls. Run against **staging** before each major release.

## Prerequisites

- Staging URL with production-like env (HTTPS, real JWT secrets, RLS migration applied)
- Test accounts: student, teacher, HOD, headteacher, two schools (A and B)
- OWASP ZAP (optional): baseline scan against staging

## 1. Authentication

| #   | Scenario              | Steps                                                                       | Expected                                |
| --- | --------------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| 1.1 | Unauthenticated API   | `GET /api/dashboard/headteacher` with no cookie                             | `401`                                   |
| 1.2 | CVE-2025-29927 bypass | `GET /api/dashboard/headteacher` with `x-middleware-subrequest: middleware` | `401` (not `200`)                       |
| 1.3 | Expired token         | Use expired JWT in `Authorization`                                          | `401`                                   |
| 1.4 | Wrong audience        | JWT signed with valid secret but `aud: wrong`                               | `401` after transition window           |
| 1.5 | Cookie flags          | Login via browser; inspect `Set-Cookie`                                     | `HttpOnly`, `Secure`, `SameSite=Strict` |

## 2. Multi-tenant isolation

| #   | Scenario             | Steps                                                     | Expected                            |
| --- | -------------------- | --------------------------------------------------------- | ----------------------------------- |
| 2.1 | Cross-school student | School A token + `x-school-id: school-b` on student API   | Empty or `403`; never School B rows |
| 2.2 | Body schoolId spoof  | POST with `"schoolId": "other-school"` in JSON            | Ignored; JWT school used            |
| 2.3 | Marketplace review   | School B HOD reviews School A pending material            | `404` / not found                   |
| 2.4 | Automated tests      | `npm test -- __tests__/security/tenant-isolation.test.js` | All pass                            |

## 3. Input validation

| #   | Scenario          | Steps                                                     | Expected                      |
| --- | ----------------- | --------------------------------------------------------- | ----------------------------- |
| 3.1 | Role escalation   | `PUT /api/users/profile` body `{ "role": "headteacher" }` | `403` or role unchanged       |
| 3.2 | Oversized payload | POST 2MB JSON to SMS send                                 | `400` validation / size limit |
| 3.3 | Automated tests   | `npm test -- __tests__/security/input-validation.test.js` | All pass                      |

## 4. Content Security Policy

| #   | Scenario        | Steps                                                         | Expected                  |
| --- | --------------- | ------------------------------------------------------------- | ------------------------- |
| 4.1 | CSP header      | `curl -I https://staging/ \| grep -i content-security-policy` | Header present            |
| 4.2 | API no-cache    | `curl -I https://staging/api/health`                          | `Cache-Control: no-store` |
| 4.3 | Automated tests | `npm test -- __tests__/security/csp.test.js`                  | All pass                  |

## 5. Dependencies and secrets

```bash
npm run audit:security   # 0 HIGH/CRITICAL
npm test                 # full suite green
```

- TruffleHog / GitHub secret scan on PRs (`.github/workflows/security.yml`)
- Rotate secrets per `docs/SECRET_ROTATION.md` after any suspected leak

## 6. Feature-specific (Phase 4 Track B)

| Feature     | Check                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Marketplace | Public browse works without login; no `schoolId` in JSON                  |
| Mock exam   | In-progress paper has no `answer` fields; percentile returns buckets only |
| Mobile push | Invalid Expo token rejected at register endpoint                          |

## OWASP ZAP (optional)

1. Point ZAP at `https://<staging-host>/`
2. Authenticate as teacher (session or Bearer token in replacer)
3. Run **Passive** scan first; fix High alerts
4. Run **Active** scan only on staging with permission

## Sign-off

- [ ] All automated security tests pass
- [ ] Manual scenarios 1–3 executed
- [ ] No open HIGH/CRITICAL npm audit findings
- [ ] CHANGELOG updated for release
