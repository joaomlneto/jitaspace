---
"@jitaspace/web": patch
---

The "All LP Store Offers" page is a lot lighter. It was sending about 8 MB to your browser on every visit, most of which was structural overhead rather than actual offer data, and the page now sends roughly half that — so it loads and becomes responsive noticeably faster, especially on mobile.
