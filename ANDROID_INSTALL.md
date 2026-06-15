# TurboAnswer Android — Build & Update Guide

This app is a Capacitor wrapper. The Android app's WebView loads the **live website**
(`server.url` in `capacitor.config.ts`, currently the Azure URL). The HTML/JS baked into
the `.aab` is essentially unused at runtime — but the **native plugins** (contacts,
calendar, local notifications) live inside the `.aab` and only work after a new build.

## Native phone features (mobile app only)

These work in the installed Android app, after the user grants permission. On the web they
degrade gracefully and point to the cloud connectors (Settings → Connections).

- **Phone contacts** — "find Mom's number", "what's Alex's email"
- **Device calendar** — "what do I have planned today?", and the AI can add events
- **Reminders & alarms** — "remind me to call the dentist at 5pm" → a real device
  notification, persisted across app restarts
- **Device Tools page** (`/device-tools`, also in the side drawer) — world clock,
  countdown timer, and a manual reminders manager

The new-user onboarding carousel (mobile only) includes a slide announcing these features.

## Releasing an update (two parts — BOTH required)

Because the WebView loads the live site, a code change needs **both**:

1. **Redeploy the website** (you do this) so the new JS that calls the native plugins is
   served to the app. Push to GitHub `main` → the Azure workflow deploys.
2. **Build & upload a new signed AAB** (steps below) so the native plugins are present and
   the new permissions are declared. Required whenever native plugins/permissions change
   (like this release) — not needed for pure web-only changes.

## Building the signed AAB

Prerequisites — the signing passwords must be set as secrets (requested in-chat):

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Signing uses `android/turbo-answer-upload.keystore`, alias `turbo-answer-upload`
(the Play **upload key**). `versionCode`/`versionName` are bumped in
`android/app/build.gradle` for every Play upload (currently `9` / `3.2.3`).

Build:

```bash
export JAVA_HOME=<openjdk-21 path>
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease --no-daemon --max-workers=1 -Dorg.gradle.parallel=false
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Notes:
- The release build can be OOM-killed in low-RAM sessions. If it dies silently, just
  re-run `bundleRelease` — the heavy R8/shrink tasks are cached and it finishes fast.
- Never stage the `.aab`/`.apk` inside `client/public` — it gets baked into the bundle and
  bloats it. Keep deliverables in `build-output/`.

## Installing / updating on a device

- **Google Play:** upload `app-release.aab` to the Play Console → Production (or Internal
  testing) → roll out. Users update through the Play Store.
- **Sideload (for testing):** convert the AAB to a universal APK with `bundletool`
  (`build-apks --mode=universal`), unzip `universal.apk`, and install with `adb install`.

## Permissions declared (AndroidManifest.xml)

- `READ_CONTACTS`, `READ_CALENDAR`, `WRITE_CALENDAR`
- `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` (from the notifications plugin)
- `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` (exact-time reminders/alarms)
