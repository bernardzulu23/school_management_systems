# ZSMS Mobile — Expo account + website linking

Project dashboard: [expo.dev/accounts/brian-ben/projects/zsms-mobile](https://expo.dev/accounts/brian-ben/projects/zsms-mobile)

## 1. Is it linked to your account?

**Yes** — if `app.json` contains:

| Field                 | Value                                  |
| --------------------- | -------------------------------------- |
| `owner`               | `brian-ben`                            |
| `extra.eas.projectId` | `69a22dc7-5305-468f-b46c-e829968564d4` |
| `slug`                | `zsms-mobile`                          |

You must be logged in as **brian-ben** on [expo.dev](https://expo.dev/accounts/brian-ben) to see the project. The account URL shows a login page when you are not signed in.

Verify from terminal:

```powershell
cd zsms-mobile
npx eas whoami
# should print: brian-ben

npx eas project:info
# should show projectId 69a22dc7-5305-468f-b46c-e829968564d4
```

If `eas whoami` fails with SSL errors, try a phone hotspot or (one-time only):

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
npx eas login
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED
```

---

## 2. Build an APK (EAS cloud)

```powershell
cd zsms-mobile
npm install
npx eas login
npm run build:apk
```

First Android build will ask to create a **keystore** — choose **Yes, let EAS handle it**.

When finished, download the `.apk` from:

- Terminal output link, or
- [Project → Builds](https://expo.dev/accounts/brian-ben/projects/zsms-mobile/builds)

| Script                   | Profile     | Use                                |
| ------------------------ | ----------- | ---------------------------------- |
| `npm run build:apk`      | preview     | Test APK for schools (recommended) |
| `npm run build:apk:prod` | production  | Pilot / release APK                |
| `npm run build:apk:dev`  | development | Dev client (needs Metro)           |

---

## 3. Environment variables on Expo (link app ↔ website)

Set these in the Expo dashboard:

**Project → zsms-mobile → Environment variables**

([direct link when logged in](https://expo.dev/accounts/brian-ben/projects/zsms-mobile/environment-variables))

### Required for production builds

| Variable                   | Example                             | Purpose                                                                                    |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_BASE_URL` | `https://bluepeacktechnologies.com` | All API calls (`/api/mobile/*`, attendance, scores). **Must match your live website URL.** |
| `EXPO_PUBLIC_WEB_BASE`     | `bluepeacktechnologies.com`         | “Open web dashboard” links (`https://{subdomain}.{WEB_BASE}/login`)                        |

Apply to environments: **preview**, **production** (and **development** if you use dev builds).

These are already in `eas.json` for cloud builds; dashboard vars override them per environment.

### Already configured (do not duplicate as secrets)

| Setting               | Where      | Purpose                                                 |
| --------------------- | ---------- | ------------------------------------------------------- |
| `extra.eas.projectId` | `app.json` | Push notifications + EAS project identity               |
| `owner`               | `app.json` | Expo account `brian-ben`                                |
| `android.package`     | `app.json` | `com.bluepeack.zsms.teacher` — unique app ID on devices |

### Optional local-only (`.env` — not uploaded to Expo)

Copy `.env.example` → `.env` for local Metro / dev client:

```env
EXPO_PUBLIC_API_BASE_URL=https://bluepeacktechnologies.com
EXPO_PUBLIC_WEB_BASE=bluepeacktechnologies.com
```

### Do **not** put on Expo (server-only)

These stay on **Vercel / website** `.env`, never in the mobile app:

- `DATABASE_URL`
- `JWT_SECRET` / `NEXTAUTH_SECRET`
- `RESEND_API_KEY`, payment keys, etc.

The mobile app only talks to your website over HTTPS using teacher login tokens.

---

## 4. What the website must expose for the app

The app expects these on `EXPO_PUBLIC_API_BASE_URL`:

| Endpoint                                                   | Purpose                                    |
| ---------------------------------------------------------- | ------------------------------------------ |
| `POST /api/mobile/auth/login`                              | Staff login (email + password + subdomain) |
| `POST /api/mobile/auth/refresh`                            | Token refresh                              |
| `GET /api/public/schools?q=`                               | School search by name                      |
| `POST /api/mobile/push/register`                           | Expo push token registration               |
| `/api/mobile/*`, `/api/attendance/*`, `/api/assessments/*` | Attendance & ECZ scores                    |

Every authenticated request sends:

- `Authorization: Bearer <accessToken>`
- `x-school-subdomain: <school-subdomain>`

Ensure production CORS / middleware allows the mobile app origin if you restrict API access.

---

## 5. Common failures

| Problem                                                             | Fix                                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Project not visible on expo.dev                                     | Log in as **brian-ben**, not another account                                                    |
| `eas-cli` / npm SSL errors                                          | Hotspot network; fix `eas-cli` in `package.json` (use `^16.3.2`, not `^0.0.0`)                  |
| `eas init` crash after “Created project”                            | Project is still created; confirm `projectId` in `app.json`                                     |
| App shows “Network error” / localhost                               | Rebuild APK after setting `EXPO_PUBLIC_API_BASE_URL` on Expo                                    |
| Login works on web, not app                                         | Use same subdomain + teacher account; check API URL is production, not `10.0.2.2`               |
| Push notifications empty                                            | `projectId` must be in `app.json`; rebuild after `eas init`                                     |
| `Failed to read .../school_management_systems/zsms-mobile/eas.json` | Set Expo **Root directory** to `zsms-mobile` only (not `school_management_systems/zsms-mobile`) |

---

## 6. Fix broken `npm install` (dependency versions)

If builds fail with SDK mismatches, reinstall aligned Expo 56 deps:

```powershell
cd zsms-mobile
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npx expo-doctor
```

See also [`EAS_APK_BUILD.md`](./EAS_APK_BUILD.md).
