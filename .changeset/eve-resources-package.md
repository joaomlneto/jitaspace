---
"@jitaspace/eve-resources": minor
---

Add `@jitaspace/eve-resources`, a dependency-free, isomorphic toolkit for EVE Online's content CDN: resolve the build pointer → app index → resfile index chain for every server (CCP and NetEase) and platform, navigate the resource tree lazily (`buildTreeIndex` / `listChildren`), classify files by extension, and fetch their bytes (`fetchResourceBytes`, `fetchResourceHead`). Decodes DDS (BC1–BC7, BC6H, uncompressed, float/HDR, cubemaps) and TGA textures to RGBA with a PNG encoder, Python pickles (`unpickle`) and plain-text resources, and exports the historical build list (`KNOWN_BUILDS`, `BUILD_DATES`).
