---
"@jitaspace/web": patch
---

The market sidebar now loads its category tree far more cheaply. Building the tree was by a wide margin the heaviest thing JitaSpace asked of its database — enough that it contributed to the site running out of database capacity — and it now reads about a fifteenth of the data to show you exactly the same thing.
