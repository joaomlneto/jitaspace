# @jitaspace/eve-resources

Resolve, browse and fetch the EVE Online client's resource files as served from
CCP's content CDN — and decode the common formats among them (DDS/TGA textures,
pickles, plain text).

These functions are **isomorphic and dependency-free**. The pure helpers
(parsing, tree navigation, classification, decoding) run anywhere; the
network helpers (`getCurrentBuild`, `fetch*`) are intended for server/CLI use,
since the CDN sends no CORS headers.

## How EVE resource resolution works

EVE's CDN is content-addressed by a hashed path. Resolution is a chain:

1. **Build pointer** — `https://binaries.eveonline.com/eveclient_TQ.json`
   → `{ "build": "3368760", ... }`
2. **App index** — `…/eveonline_<build>.txt`, which points at the resfile
   index. CSV: `app:/path,<hashedRelPath>,<md5>,<size>,<compressedSize>,<mode>`
3. **Resfile index** — fetched via the app index entry `app:/resfileindex.txt`:
   the ~120k `res:/` assets. CSV: `res:/path,<hashedRelPath>,<md5>,<size>,<compressedSize>`
4. **Files** — `res:/` assets are served from `https://resources.eveonline.com/<hashedRelPath>`
   and `app:/` files from `https://binaries.eveonline.com/<hashedRelPath>`.
   `entryUrl(entry)` / `fetchResourceBytes(entry)` pick the host from the
   entry's scheme.

> The CDN serves files **uncompressed** (its `content-type: application/gzip`
> header is unreliable — trust the `res:/` extension instead).

Each platform has its own app index (`eveonline_` for Windows,
`eveonlinemacOS_` for macOS — see `PLATFORM_LAYOUT`), and the Chinese clusters
(Serenity, Infinity) resolve the same way from NetEase's hosts
(`PROVIDER_ENDPOINTS`). `KNOWN_BUILDS` / `BUILD_DATES` list the historical
Tranquility and Singularity builds.

## Usage

```ts
import {
  buildTreeIndex,
  decodeResource,
  fetchResourceBytes,
  fetchResourceIndex,
  listChildren,
} from "@jitaspace/eve-resources";

// Resolve the whole index for the current Tranquility build.
const { build, entries } = await fetchResourceIndex("tranquility");

// Navigate it lazily, one directory at a time.
const tree = buildTreeIndex(entries);
const { directories, files } = listChildren(tree, "res:/ui/");

// Fetch + decode a single file.
const entry = tree.byPath.get("res:/videocardcategories.yaml")!;
const decoded = decodeResource(entry.path, await fetchResourceBytes(entry));
if (decoded.kind === "text") console.log(decoded.text);
```

## Supported formats

| Format                                                                     | Support                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text (`yaml`, `json`, `py`, `xml`, …; + paperdoll `color`/`type`/`pose`/…) | `decodeText` (CCP ships paperdoll config as plain YAML)                                                                                                                                                                                                             |
| Native media (`png`, `jpg`, `webm`, `ogg`, fonts, …)                       | classification + correct MIME                                                                                                                                                                                                                                       |
| DDS textures (`dds`)                                                       | `decodeDds` → RGBA: block-compressed (BC1–BC7, BC6H HDR→sRGB), uncompressed at any bit depth (8/16/24/32bpp via the pixel-format masks, incl. luminance & alpha-only), float/HDR (R16F–RGBA32F + R11G11B10, tone-mapped), and cubemaps (6 faces → horizontal strip) |
| TGA images (`tga`)                                                         | `decodeTga` → RGBA (true-color + grayscale, uncompressed/RLE)                                                                                                                                                                                                       |
| Python pickle (`pickle`)                                                   | `unpickle` → JSON — protocols 0–2 plus the protocol-4 opcodes EVE emits (`FRAME`/`MEMOIZE`/`STACK_GLOBAL`/`SHORT_BINUNICODE`); plain data, throws on anything unhandled                                                                                             |
| Any other file                                                             | `inspectBinary` — size, magic, hex dump + embedded strings                                                                                                                                                                                                          |

Decoded pixels can be turned into a PNG with `encodePng`.

## Tests

`pnpm test` runs the Jest suite (`tests/`). It covers the resolution layer
(parse / tree / url / classify), the network helpers (build / resolve / fetch,
with an injected `fetch`), and the decoders — `unpickle` (protocols 0–2),
DDS / BC / BPTC / TGA / PNG, and `inspectBinary` — against hand-crafted
fixtures, with no network access.
