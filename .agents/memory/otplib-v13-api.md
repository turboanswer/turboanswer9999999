---
name: otplib v13 API
description: otplib v13 is an ESM functional API — no `authenticator` object; verify is async
---

otplib v13.x dropped the class/singleton surface. There is NO `authenticator`,
`totp`, or `hotp` default export object. `import { authenticator } from "otplib"`
throws "does not provide an export named 'authenticator'".

Use the named functional exports instead:
- `generateSecret()` → base32 secret string
- `generateURI({ issuer, label, secret })` → otpauth:// URI (for QR / manual key)
- `verify({ secret, token, epochTolerance })` is **async**, returns `{ valid, delta }`
  (epochTolerance is in seconds; 30 ≈ ±1 time step of drift)

**Why:** spent multiple attempts assuming the old v12 `authenticator.*` API.
**How to apply:** any TOTP helper wrapping otplib must be async and await verify();
remember to await it at every call site (route handlers).
