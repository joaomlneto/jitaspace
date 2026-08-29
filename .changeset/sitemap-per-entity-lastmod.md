---
"@jitaspace/web": patch
---

The sitemap now tells search engines when each page actually changed, instead of stamping every one of the ~50,000 item pages with the date of the last deploy. Search engines can skip re-crawling pages that have not changed, and give more weight to the ones that have.
