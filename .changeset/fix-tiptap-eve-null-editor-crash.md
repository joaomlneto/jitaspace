---
"@jitaspace/tiptap-eve": patch
"@jitaspace/web": patch
---

Fixed a crash when viewing character descriptions and EVE mails.

The rich-text renderer read the editor's HTML before the editor finished
initializing, which threw on the first render and took the page down. The
renderer now waits for the editor to be ready, so descriptions and mail
bodies display correctly.
