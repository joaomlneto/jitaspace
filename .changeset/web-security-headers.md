---
"@jitaspace/web": patch
---

feat(web): send HTTP security headers to harden the app. All routes now set X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy; page routes additionally get HSTS and a Content-Security-Policy. The CSP ships report-only for now — violations are reported to Sentry without blocking anything — while we validate coverage before enforcing it. API routes (/api/\*) are intentionally left without HSTS/CSP so programmatic consumers are unaffected.
