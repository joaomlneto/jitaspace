# @jitaspace/eve-resources

Resolve, browse and fetch the EVE Online client's resource files as served from
EVE's content CDNs (CCP's, and NetEase's for the Chinese servers).

These functions are **isomorphic and dependency-free**. The pure helpers
(index parsing, tree navigation, classification) run anywhere; the network
helpers (`getCurrentBuild`, `fetch*`) are intended for server/CLI use, since
the CDN sends no CORS headers.

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

> The CDN sends files gzip-compressed in transit (`Content-Encoding: gzip`,
> so the wire size is the index's `compressedSize`), which `fetch` undoes
> transparently. Its `Content-Type` says nothing about a file's format — trust
> the `res:/` extension instead (`classifyResourcePath`).

Each platform has its own app index (`eveonline_` for Windows,
`eveonlinemacOS_` for macOS — see `PLATFORM_LAYOUT`), and the Chinese clusters
(Serenity, Infinity) resolve the same way from NetEase's hosts
(`PROVIDER_ENDPOINTS`).

`KNOWN_BUILDS` lists the historical Tranquility and Singularity builds, with
dates in `BUILD_DATES` and, for most builds since April 2023, timestamps in
`BUILD_TIMESTAMPS`. These are snapshots: CCP no longer serves every listed
build, and `fetchBuildDate` reads a build's date live from the CDN.

## Usage

```ts
import {
  buildTreeIndex,
  classifyResourcePath,
  fetchResourceBytes,
  fetchResourceIndex,
  listChildren,
  resourceUrl,
} from "@jitaspace/eve-resources";

// Resolve the whole index for the current Tranquility build.
const { build, entries } = await fetchResourceIndex("tranquility");

// Look a file up by its res:/ path and get its CDN URL…
const icon = entries.find(
  (e) => e.path === "res:/ui/texture/icons/7_64_15.png",
);
const url = icon && resourceUrl(icon.relPath);

// …or navigate the tree lazily, one directory at a time.
const tree = buildTreeIndex(entries);
const { directories, files } = listChildren(tree, "res:/ui/");

// Fetch a file's bytes, with its MIME type from the extension.
const entry = tree.byPath.get("res:/videocardcategories.yaml")!;
const bytes = await fetchResourceBytes(entry);
const { mimeType } = classifyResourcePath(entry.path);
```

## Tests

`pnpm test` runs the Jest suite (`tests/`). It covers index parsing, tree
navigation, URL building and classification, and the network helpers (build /
resolve / fetch, with an injected `fetch`), with no network access.
