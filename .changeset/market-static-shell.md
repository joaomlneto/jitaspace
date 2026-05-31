---
"@jitaspace/web": patch
---

Serve `/market/<typeId>` from a single static shell instead of an optional catch-all route. The selected type is now read from the path on the client (`usePathname`) and the pretty URL is preserved via a Next.js rewrite, so every market URL is answered by one prerendered page instead of an on-demand, per-type server render. This eliminates the per-type serverless invocations and ISR cache writes that dominated hosting cost, and removes the cascading market-sidebar database query load they triggered.
