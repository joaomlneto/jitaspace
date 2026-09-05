---
"@jitaspace/web": patch
---

Fixed the site's pages being invisible to Google. Google's crawler was the only visitor served pages with no title and no description at all — every item, system, station, region and character page reached it as an untitled, unlabelled document, which is why so few of them were appearing in search results. Search Console's own inspection tool could not show the problem, because it is fetched differently from the real crawler.

Pages now also tell search engines their one true address, so the same item is no longer treated as several competing pages: `/market`, `/market/<item>` and `/market-group/<id>` all served an identical page, and any item could be reached at several spellings of its id (`/type/0587` and `/type/587.0` both showed the Rifter). Those alternate spellings now return a proper "not found" instead of a duplicate.

Station and constellation pages now show their name and details in the initial page load rather than filling in afterwards, and a station or constellation that does not exist correctly returns a 404 instead of an empty page that looked real. `/about`, `/dogma` and `/search` finally have their own titles and descriptions instead of inheriting the generic site one.
