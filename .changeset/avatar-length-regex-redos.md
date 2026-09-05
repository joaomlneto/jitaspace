---
"@jitaspace/utils": patch
---

Make the avatar CSS-length pattern backtrack linearly.

The length parser added to `getAvatarSize` used `/^\s*(\d*\.?\d+)\s*(px|rem|em)?\s*$/`, which CodeQL correctly flagged as a polynomial-time regular expression on library input. It has two ambiguities: `\d*\.?\d+` can split a run of digits many ways once the overall match fails, and with the optional unit absent two `\s*` groups sit adjacent. Measured on a failing input of 50,000 digits it took 15.3 seconds.

The pattern is now `/^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)?$/` against a trimmed string: the two number alternatives start with different characters, the optional fraction needs a literal `.` so `\d+` cannot re-split, and no whitespace is matched at all. The same input now takes 0.32ms.

One accepted input changed: a space between the number and its unit (`"48 px"`) is no longer read as a length. CSS does not permit one.
