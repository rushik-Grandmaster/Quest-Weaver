---
name: Shop item schema extension
description: shopItems table has two new optional columns for screen-time rewards.
---

# Shop Item Schema Extension

## Rule
`shopItems` has two nullable columns:
- `url text` — launch URL (e.g. https://youtube.com)
- `durationMinutes integer` — session duration; non-null = screen-time reward

**Why:** Differentiates regular rewards (no timer) from screen-time rewards that get a countdown session and ClearSpace gate.

**How to apply:**
- `insertShopItemSchema` includes both fields (nullable by default from drizzle-zod)
- CreateItemDialog in Shop.tsx has optional "SCREEN-TIME SETTINGS" section
- Server buy route checks `item.durationMinutes > 0` to decide whether to create a session
