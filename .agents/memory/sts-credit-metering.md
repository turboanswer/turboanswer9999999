---
name: STS credit metering integrity
description: How Stack Trace Surgeon (and any per-use credit feature) must charge so it stays race-safe and fail-closed.
---

Stack Trace Surgeon meters paid use (credits in cents) and free use (a small trial count). Charging must follow this pattern, learned from a code review that failed twice before passing:

**Rule: reserve-before-work, refund-on-throw — never read-then-write, never charge-after-success.**

- Reserve with a SINGLE atomic conditional SQL UPDATE that both checks and decrements in one statement (e.g. `SET credits = credits - cost WHERE credits >= cost RETURNING`; trial: `SET used = used + 1 WHERE used < limit RETURNING`). If no row comes back, the caller is out of budget → return 402. Two parallel requests can then never both pass the gate.
- Do the side-effecting work AFTER a successful reserve. If the work throws, refund the reservation (add the credits back / decrement the trial) so failures are always free.
- Do NOT charge after success with a separate read-modify-write — that re-introduces the race and is fail-open if the write throws.
- When the real cost is only known AFTER the work (e.g. a model call's token usage), reserve a fixed upper-bound up front, then RECONCILE to actual: refund (reserve - actual) if positive, or debit the shortfall with an atomic floored decrement (`SET credits = GREATEST(0, credits - delta)`) — never an unconditional `SET credits = 0`, which clobbers concurrent balance changes.
- The recurring allowance grant must be atomic + idempotent AND period-aware: a SINGLE conditional UPDATE that resets the balance and stamps the current period (`YYYY-MM`, UTC) `WHERE COALESCE(stored_period,'') <> currentPeriod`. Same-period calls no-op (preserve the spent-down balance); first-ever (NULL period) and each new period reset. This is NOT a one-time `WHERE granted=false` grant — it must re-grant every period.
- Access is Enterprise-only (plus owner/employee). Lower paid tiers and free get a small trial count, then an upgrade wall. Owner/employee (isOwnerAccount(user) || user.isEmployee) bypass all debits and are never charged.
- If you hold an in-flight lock (a Set guarding double-submit), make sure it is released on EVERY exit path including when the debit itself throws, or you leak the lock and serve false 409s until restart.

**Why:** strict metering requires "hard stop at zero" and "failures are free" simultaneously; only atomic reserve+refund satisfies both under concurrency. Read-then-write and charge-after-success both let paid users overspend or get free work.
