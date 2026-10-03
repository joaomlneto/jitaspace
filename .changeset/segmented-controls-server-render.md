---
"@jitaspace/web": patch
---

The localization string history pages now load fully formed for every visitor.
Before, only the first visitor to a string got a complete page; everyone after
them saw it fill in once the page's scripts loaded. The segmented controls on
those pages, the travel planner and the compare tool now use a lightweight
control that renders the same way on the server and in the browser.
