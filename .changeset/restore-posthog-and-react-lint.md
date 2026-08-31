---
"@jitaspace/web": patch
---

Fixed PostHog analytics never starting on the live site. The production build was dropping the PostHog configuration before it reached the app, so no usage data was ever recorded.

Also fixed three external links (the EVE-Kill and zKillboard links on killmails, and the EVE Partner badge in the footer) that opened new tabs without the protection that stops the destination page from tampering with the tab it came from.
