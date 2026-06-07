# ZSMS Mobile — Expo / EAS APK builds

This app uses **Expo SDK 56** with a **dev client** (`expo-dev-client`). Cloud APK builds use [EAS Build](https://docs.expo.dev/build/introduction/).

## One-time: link the project to Expo

1. Create a free account at [expo.dev](https://expo.dev/signup) (or log in).

2. From `zsms-mobile`:

   ```powershell
   npm install
   powershell -ExecutionPolicy Bypass -File scripts/link-expo.ps1
   ```

   Or manually:

   ```powershell
   npx eas login
   npx eas init
   ```

   `eas init` registers the app on Expo and writes a **project ID** into `app.json`:

   ```json
   "extra": {
     "eas": {
       "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     }
   }
   ```

   That ID is required for push notifications and EAS builds.

3. Confirm link:

   ```powershell
   npx eas project:info
   ```

## Build from GitHub (Expo dashboard)

If you see:

`Failed to read "/school_management_systems/zsms-mobile/eas.json"`

the **Root directory** in Expo is wrong. Your repo is `bernardzulu23/school_management_systems`; the app lives in **`zsms-mobile/`** only.

1. Open [Project → Settings / Details](https://expo.dev/accounts/brian-ben/projects/zsms-mobile)
2. Set **Root directory** (or **App directory**) to:

   ```
   zsms-mobile
   ```

   **Not** `school_management_systems/zsms-mobile` — that path does not exist in the repo.

3. Push latest code to GitHub (`eas.json` must be on the branch you build).
4. Click **Build from GitHub** → Android → profile **preview**.

## Build an APK (installable file)

| Command                  | Profile       | Output                                |
| ------------------------ | ------------- | ------------------------------------- |
| `npm run build:apk`      | `preview`     | Release APK for testers (recommended) |
| `npm run build:apk:prod` | `production`  | Release APK for pilot schools         |
| `npm run build:apk:dev`  | `development` | Dev client APK (needs Metro)          |

Example:

```powershell
npm run build:apk
```

When the build finishes, Expo shows a **download link** for the `.apk`. You can also open [expo.dev](https://expo.dev) → your project → **Builds**.

## API URL for builds

Preview/production profiles set:

`EXPO_PUBLIC_API_BASE_URL=https://bluepeacktechnologies.com`

Override per build:

```powershell
npx eas build --platform android --profile preview --env EXPO_PUBLIC_API_BASE_URL=https://your-school.example.com
```

Or set secrets in the Expo dashboard: **Project → Environment variables**.

## Play Store (optional)

Google Play prefers **AAB**, not APK:

```powershell
npx eas build --platform android --profile production-aab
```

## Troubleshooting

### `unable to verify the first certificate`

Common on Windows behind SSL inspection (same class of issue as Gradle in `README.md`). Try:

- Another network (phone hotspot)
- `set NODE_TLS_REJECT_UNAUTHORIZED=0` only for a one-off login (not recommended long term)
- Corporate proxy: configure `HTTP(S)_PROXY` for Node

### `Missing projectId`

Run `npx eas init` again after login.

### Build failed: `Unable to resolve module .../src/storage/secure`

`src/storage/secure.ts` was missing from GitHub because the repo root `.gitignore` had `storage/` (ignored **every** `storage/` folder). Fixed by scoping to `/storage/` only and committing `zsms-mobile/src/storage/secure.ts`.

Push the fix, then rebuild.

### Build failed: dependency version mismatches

Run locally in `zsms-mobile`:

```powershell
npx expo install --fix
```

Then commit `package.json` and `package-lock.json` (or `yarn.lock`) before rebuilding on GitHub.

### Build fails on native code

Ensure `app.json` / plugins match your native modules. This repo includes a stub for `expo-face-detection`; cloud builds use the same stub unless you add the real native module.

## Local APK (without Expo cloud)

If EAS is unavailable, build locally (requires Android SDK + Gradle fix from main `README.md`):

```powershell
npm run prebuild:android
cd android
.\gradlew assembleRelease
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`
