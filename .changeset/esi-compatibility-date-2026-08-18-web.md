---
"@jitaspace/web": patch
---

Updated JitaSpace to EVE's latest ESI API version (compatibility date 2026-08-18), keeping it current with changes CCP shipped since July. The Server Status page reports the new compatibility date.

Fixed the tax rate shown on corporation pages. EVE changed how it reports corporation tax: it used to send a fraction (0.1 for 10%) and now sends a percentage (10 for 10%). Without this fix a 10% corporation would have read as 1000.0%.

Corporation pages also keep showing the CEO, founder and militia correctly — EVE renamed the militia field and stopped sending a placeholder for corporations that have no CEO or founder, both of which would otherwise have started displaying wrongly or not at all.
