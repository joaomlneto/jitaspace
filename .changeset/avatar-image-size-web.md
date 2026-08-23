---
"@jitaspace/web": patch
---

Fixed avatars downloading images far larger than they display. Small avatars — the ones in menus, buttons, tables and skill queues — were each fetching a full 1024x1024 image and scaling it down to as little as 20 pixels. They now request an image that matches the size they are drawn at, which cuts a lot of wasted bandwidth from most pages.
