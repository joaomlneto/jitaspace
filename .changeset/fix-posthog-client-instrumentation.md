---
"@jitaspace/web": patch
---

Fixed client-side product analytics never being recorded. The PostHog browser
initialization had been placed in `app/instrumentation-client.ts`, which
Next.js does not execute — only the app-root `instrumentation-client.ts` runs.
Moved the initialization there so page views and in-app events are captured.
