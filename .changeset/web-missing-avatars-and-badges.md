---
"@jitaspace/web": patch
---

Fixed three places where an icon or badge was silently missing.

- Solar system avatars now show the system's star when nobody holds sovereignty over it, instead of an empty placeholder.
- The travel route table now shows the security status badge for every system on the route.
- The station link picker in the mail editor now shows the station's icon as you search.

Also fixed responding to a calendar invitation: choosing "not responded" sent a request EVE rejects, since it is the state an invitation starts in rather than an answer you can give. That choice is now ignored instead of failing.
