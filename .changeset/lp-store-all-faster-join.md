---
"@jitaspace/web": patch
---

Made the **All LP Store Offers** page load faster and more reliably. It now matches each offer to its required items in a single pass instead of comparing every offer against every required item, and stops sending fields the table never uses — trimming the page's data by over a megabyte.
