---
name: Screen Time & ClearSpace features
description: Architecture of the reward session countdown system and the ClearSpace breathing intervention modal.
---

# Screen Time & ClearSpace

## Rule
Any shop item with `durationMinutes > 0` is a "screen-time reward". Buying one:
1. Triggers the ClearSpace modal (4-second inhale → hold → exhale cycle)
2. Confirms payment only after breathing completes
3. Server creates a `reward_sessions` row with `expiresAt = now + durationMinutes * 60s`
4. Frontend redirects to `/screen-time` which shows live countdowns

**Why:** Impulse-control gate before entertainment purchases; session timer enforces the limit.

**How to apply:**
- Check `item.durationMinutes && item.durationMinutes > 0` in the shop buy handler
- `rewardSession` is returned in the buy response alongside `item`, `stats`, `newAchievements`
- `/api/reward-sessions` GET returns only sessions where `expiresAt > now()`
- `/api/reward-sessions/:id` DELETE ends a session early
