---
"@jitaspace/ui": patch
"@jitaspace/web": patch
---

Fix the category page breadcrumbs showing a loading skeleton forever. `CategoryBreadcrumbs` was still passing `categoryId` to the now-presentational `CategoryName`, which only accepts a `name` prop. It now takes a `categoryName` prop (mirroring `GroupBreadcrumbs`), and the category page passes the name it already fetched server-side.
