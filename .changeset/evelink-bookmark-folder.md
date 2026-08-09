---
"@jitaspace/tiptap-eve": patch
"@jitaspace/web": patch
---

feat(tiptap-eve): recognize `bookmarkFolder:` links in EVE mail

`bookmarkFolder:` was missing from `EveLink`'s protocol allowlist, so TipTap's
Link extension stripped the mark from a real mail's
`<a href="bookmarkFolder:7102471">MC Deputy Training</a>`. The label survived as
bare text, silently losing both its affordance and MailMessageViewer's link
coloring.

Registered as lowercase `bookmarkfolder`, matching the other schemes — linkifyjs
v4 throws at editor construction on any non-lowercase name, and matching is
case-insensitive so the camelCase href in mail content still resolves.

A shared bookmark folder has no web equivalent, so `renderEveHref` leaves the
href intact and `MailMessageViewer` intercepts the click with an explanatory
alert, as it does for `shipSkinListing:` and `fleet:`. It takes the internal link
color, like the similarly client-only `fitting:`.

For `@jitaspace/web`: shared bookmark folder links in mail are now shown as
links, and clicking one explains that it can only be opened in the EVE Online
client.
