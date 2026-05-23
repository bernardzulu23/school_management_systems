# Local Gradle (Windows SSL workaround)

If `npx expo run:android` fails with `SSLHandshakeException` / `PKIX path building failed` when downloading Gradle, place the distribution here:

**File:** `gradle-8.10.2-all.zip` (~218 MB)

**Download (browser):** https://services.gradle.org/distributions/gradle-8.10.2-all.zip

Or run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-gradle.ps1
```

`android/gradle/wrapper/gradle-wrapper.properties` is configured to use `file:///.../tools/gradle-8.10.2-all.zip` instead of HTTPS.
