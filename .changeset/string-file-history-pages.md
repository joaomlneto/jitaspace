---
"@jitaspace/web": minor
---

Added change-history pages for EVE client localization strings and files. `/string/{id}` shows a string's current text in each language, formatted as in game, and how it changed build by build, with every edit highlighted word by word (character by character for Chinese and Japanese) and filters for language and server. `/file/{path}` shows a client file's current size and MD5, a chart of its size over time with each Tranquility change marked, and every change in a table. String ids and file paths on the build pages now link to these, and changed strings there are shown as a word-level diff.
