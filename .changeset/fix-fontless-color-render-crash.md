---
"@jitaspace/tiptap-eve": patch
"@jitaspace/web": patch
---

Fixed the Description tab (and other EVE rich-text content like mails and bios) failing to load when the text contained a `<font size=...>` heading with no colour — for example the PLEX item description. Such headings are common in EVE descriptions and previously crashed the rich-text renderer.
