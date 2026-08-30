---
"@jitaspace/web": patch
---

Fixed the tax rate shown on corporation pages. EVE's API changed how it reports
corporation tax: it used to send a fraction (0.1 for 10%) and now sends a
percentage (10 for 10%). Without this fix the corporation card would have
displayed a tax rate a hundred times too large — a 10% corporation reading as
1000.0%.
