---
"@jitaspace/web": patch
---

Fixed a few numbers that displayed wrongly. Low-sec systems with a security status just above zero now show 0.1 in low-sec red instead of null-sec's 0.0. Abbreviated ISK amounts no longer read "1000K" or "1000M" at the edge of a unit (999,950 ISK now reads 1M), and amounts below 1 ISK are no longer shown as 0. Standings are coloured by the value shown, so a 0.04 standing reads 0.0 in neutral grey. CSPA charges show thousands separators. The "open in game" information link can now be reached with the keyboard.
