---
name: STS credit metering integrity
description: How Stack Trace Surgeon (and any per-use credit feature) must charge so it stays race-safe and fail-closed.
---

Stack Trace Surgeon meters paid use (credits in cents) and free use (a small trial count). Charging must follow this pattern, learned from a code review that failed twice before passing:

**Rule: reserve-before-work, refund-on-throw — never read-then-write, never charge-after-success.**

- Reserve with a SINGLE atomic conditional SQL UPDATE that both checks and decrements in one statement (e.g. `SET credits = credits - cost WHERE credits >= cost RETURNING`; trial: `SET used = used + 1 WHERE used < limit RETURNING`). If no row comes back, the caller is out of budget → return 402. Two parallel requests can then never both pass the gate.
- Do the side-effecting work AFTER a successful reserve. If the work throws, refund the reservation (add the credits back / decrement the trial) so failures are always free.
- Do NOT charge after success with a separate read-modify-write — that re-introduces the race and is fail-open if the write throws.
- The one-time welcome grant must ALSO be atomic + idempotent: conditional UPDATE `WHERE granted = false` that ADDS to the live balance (never overwrites it). A non-conditional grant lets a stale concurrent request reset a balance another request already debited.
- Owner/employee (isOwnerAccount(user) || user.isEmployee) bypass all debits and are never charged.
- If you hold an in-flight lock (a Set guarding double-submit), make sure it is released on EVERY exit path including when the debit itself throws, or you leak the lock and serve false 409s until restart.

**Why:** strict metering requires "hard stop at zero" and "failures are free" simultaneously; only atomic reserve+refund satisfies both under concurrency. Read-then-write and charge-after-success both let paid users overspend or get free work.
