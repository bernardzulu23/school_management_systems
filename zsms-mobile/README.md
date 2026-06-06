# ZSMS Teacher (React Native)

Companion app for **attendance** and **ECZ SBA scores**, synced to the same database as the ZSMS web app.

## Setup

```bash
cd zsms-mobile
cp .env.example .env
# Edit EXPO_PUBLIC_API_BASE_URL
npm install
npx expo start
```

## Docs

Full API and function inventory: [`../docs/doc/mobile-app.md`](../docs/doc/mobile-app.md)

## Theme

Colors match the school management system brutalist palette — see [`color.md`](../color.md) and `src/theme/colors.ts` (`#F5F2ED` paper, `#111111` ink, `#FF3B00` accent).

## Lesson attendance (per subject)

- **Attendance** tab → class with subject → lesson session (Present/Late, face scan picker, end session).
- **Face ML (Android, optional)**: the native `expo-face-detection` module (MobileFaceNet) is not in this repo yet; a **stub** is linked so builds succeed. Attendance works via class register + manual picker. When the real native module is added, replace `stubs/expo-face-detection` in `package.json`.
- **Dev client** (required for camera). **Expo Go will not work** — build a dev client:
  ```bash
  npm install
  npm run prebuild:android
  npm run android
  npx expo start --dev-client
  ```
  Then **Scan face** → **Identify face** or **Live scan**. Enrol templates with **Enrol face** on a pupil without a template.

### `expo prebuild` → `fetch failed`

```bash
npm run prebuild:android
```

### Gradle → `SSLHandshakeException` / `PKIX path building failed`

Java cannot download Gradle over HTTPS on many Windows PCs. Fix:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-gradle.ps1
npm run android
```

Or download in a browser: https://services.gradle.org/distributions/gradle-8.10.2-all.zip → save as `tools/gradle-8.10.2-all.zip`, then run the script above.

- **Offline**: marks and session close queue in Profile → **Sync now**.
- **Twins**: if API returns twin verification, enter PIN or use device biometrics (set PIN via `POST /api/students/{id}/twin-pin` on web/admin).

## Pilot school

- Subdomain: `stmaryschristian`
- Use a teacher account from that school after seeding.
