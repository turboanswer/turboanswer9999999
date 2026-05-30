---
name: Android build environment & AAB bloat
description: How to rebuild the signed AAB/APK and two non-obvious traps (public-dir bloat, /tmp SDK wipe)
---

# Rebuilding the signed Android bundle

Build recipe lives in `build-aab.sh`: `npm run build` → `npx cap sync android` → `cd android && ./gradlew bundleRelease`. Signing reads env vars (ANDROID_KEYSTORE_FILE/PASSWORD/KEY_ALIAS/KEY_PASSWORD) with defaults pointing at `android/turbo-answer-upload.keystore` (key A). Bump `versionCode` in `android/app/build.gradle` for every Play upload — Play rejects a duplicate versionCode.

Convert an existing AAB to a sideloadable APK without a full gradle build: `bundletool build-apks --mode=universal` signed with key A, then unzip `universal.apk` out of the `.apks`.

## Trap 1 — anything in client/public bloats the Android app
`client/public/*` is copied into `dist/public` by vite, then into `android/app/src/main/assets/public` by `cap sync`, then baked into the AAB. Putting download binaries (`*.aab`, `*.apk`) there made the AAB carry copies of itself (84MB instead of ~16MB).
**Why:** the webDir is bundled wholesale into the native app.
**How to apply:** never stage large download artifacts in `client/public`. Put deliverables in `build-output/` (gitignored, file-tree downloadable) instead.

## Trap 2 — Android SDK in /tmp gets wiped
`android/local.properties` had `sdk.dir=/tmp/android-sdk`, which disappears between sessions → "SDK location not found". Reinstall cmdline-tools + `platforms;android-35` + `build-tools;34.0.0` to a persistent path (`/home/runner/android-sdk`) and point local.properties there. Project compiles against android-35 (gradle will auto-install it, eating one build's time budget — run the build twice).
**Gradle dep cache** at `~/.gradle/caches` persists (~321MB), so only the SDK needs reinstalling.
