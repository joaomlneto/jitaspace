---
"@jitaspace/web": patch
---

Fixed LP Store prices for offers that grant more than one item (most ammunition, sold in lots of up to 5000). These offers were valued as if you received a single unit, so their Jita price, profit, and ISK/LP all came out far too low — often deeply negative — making genuinely profitable offers look like guaranteed losses and sinking them to the bottom when sorting by ISK/LP. The reward is now valued as the full stack you receive.
