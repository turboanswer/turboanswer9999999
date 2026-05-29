---
name: Android signing / Play upload key
description: Why Play rejects "bundle isn't valid", the multi-key history, and how to rebuild/sign correctly.
---

# Android signing & Google Play upload key

## "Your bundle isn't valid" almost always = wrong signing key
Google Play locks an app to the upload key used on its first accepted upload. Any
later AAB signed with a different key is rejected as invalid. Diagnose by comparing
the signer cert fingerprint of the rejected bundle to a previously-accepted one:
`keytool -printcert -jarfile X.aab` (look at the SHA256 line). `jarsigner -verify X.aab`
just confirms it's self-consistent, not that it's the *right* key.

## TurboAnswer accumulated 3+ different keys (root cause of rejections)
- **Original (Feb, the one Google registered)**: `CN=TurboAnswer, O=TurboAnswer Inc, New York` — signed the approved `dist/public/turboanswer-v3.2.0.aab`. **Lost** — no keystore in the repo opens to it; none of the saved passwords fit.
- **CI key (swapped in May 27)**: `CN=Turbo Answer, O=Turbo Answer, Lisbon PT` — comes from GitHub secret `ANDROID_KEYSTORE_BASE64`. This swap is what started the rejections.
- **Key C (`dist/turboanswer-release.jks`)**: alias `turboanswer`, password documented in `dist/KEYSTORE-README.txt`. We control this one → standardized on it going forward.

**Why:** whoever set up CI kept regenerating keystores instead of reusing the original, so builds drifted off the registered key.

## Fix for a lost upload key: upload-key RESET, never delete/republish
In Play Console: Test and release → Setup → App integrity → App signing tab →
"Request upload key reset" → reason "I lost my upload key" → upload the new key's
`.pem` (`keytool -export -rfc -keystore key.jks -alias <alias> -file new.pem`).
Google switches the registered upload key (often same day, up to ~48h). The app
stays live with its package name, reviews, ratings, listing.
**Never delete + republish:** the package name `com.turboanswer.app` is burned
forever, you lose all reviews/installs/URL, and still face full re-review.

## Building the AAB locally
SDK at `/tmp/android-sdk` (sdk.dir in `android/local.properties`). After `npx cap sync android`:
`./gradlew :app:bundleRelease` from `android/`, signed via env vars
`ANDROID_KEYSTORE_FILE / ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD`
(see signingConfigs in `android/app/build.gradle`). First run auto-installs build-tools;
use a background `nohup` + poll because a cold build exceeds the 2-min tool limit.
`versionCode` lives in `android/app/build.gradle` — bump it for every Play upload.

## App is a thin WebView shell
`capacitor.config.ts` `webDir: dist/public`; the app loads the live site (Azure).
Only ~1MB of dex is real native code. Server-side fixes (e.g. PayPal) reach phone
users via the Azure redeploy, **not** via a new AAB.

## Don't commit signing material
`*.keystore` / `*.jks` are gitignored, and `build-output/` is now gitignored too
(it holds AABs + keystore base64 + the password README we hand to the user as a
download). Only public `.pem` certs are safe to track. The embedded PAT in the git
remote and the plaintext password in `dist/KEYSTORE-README.txt` should be rotated.
