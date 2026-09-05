---
"@jitaspace/web": minor
"@jitaspace/hooks": minor
---

The wallet moved from `/wallet/character` to `/wallet`, and now shows every wallet you can read in one place — all of your characters, plus any corporation where you hold the Accountant or Junior Accountant role. Entries from every wallet are merged into a single list, newest first, with an Owner column showing which character or corporation (and which corporation division) each entry came from. Pick which wallets to include with the chips above the table; your choice is kept in the address bar, so a filtered view can be reloaded or shared.

The separate "Corporation Wallet" menu entry is gone — it pointed at a page that never existed and returned "page not found". Old `/wallet/character` and `/wallet/corporation` links redirect to `/wallet`.
