---
"@jitaspace/eve-resources": minor
---

Add `@jitaspace/eve-resources`, a dependency-free, isomorphic toolkit for EVE Online's content CDN: resolve the build pointer → app index → resfile index chain for every server (CCP and NetEase) and platform, look files up by `res:/` path and build their CDN URLs, navigate the resource tree lazily (`buildTreeIndex` / `listChildren`), classify files by extension, and fetch their bytes (`fetchResourceBytes`, `fetchResourceHead`). Also exports the historical build list (`KNOWN_BUILDS`, `BUILD_DATES`).
