---
name: Broadcast / bulk email safety
description: Hard rules for any "send to all users" style admin email broadcast feature
---

# Broadcast / bulk email safety

Two non-negotiable controls for any admin "send to every user" email action:

1. **Confirmation tokens must be single-use, not just signed + time-boxed.**
   A signed HMAC token that only checks signature + template + audience-count + expiry
   is still *replayable* within its TTL — re-POSTing the same confirm token fires the
   whole broadcast again. Embed a random nonce in the token payload and record consumed
   nonces server-side (in-memory Map nonce→expiry, pruned lazily); reject a nonce seen
   before. Consume the nonce immediately after verify, before the send loop.
   **Why:** a duplicate broadcast to the entire user base is high-impact and irreversible
   (people get the email twice). UI button-disabling is not a control.
   **How to apply:** sign{t,c,e,n}; verify returns {ok,nonce,expiry}; route calls
   consumeBroadcastNonce(nonce,expiry) and 409s on replay.

2. **HTML-escape every user-derived field in HTML email bodies.**
   Broadcast recipient names come from the users table (user-controlled), so any
   `${name}`/body interpolation into HTML is a stored-XSS-into-inbox vector. Escape
   &,<,>,",' before interpolation. Plain-text part needs no escaping.
   **Why:** single-send admin emails use admin-typed names (low risk) but broadcast
   pulls names straight from the DB — different trust level, same template function.

Other broadcast hygiene already in place: auth + admin gate, template allowlist
(only the marketing template may broadcast), aggregate-only logging (never log
recipient emails), throttled batches to stay under the email provider's rate limit.
