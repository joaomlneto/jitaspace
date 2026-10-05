# @jitaspace/icon-server

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/joaomlneto/jitaspace&root-directory=apps/icon-server&project-name=icon-server)

A [Nitro](https://nitro.build) service that serves EVE Online icons and other
client resources straight from CCP's CDN (`resources.eveonline.com`).

It replaces the partial `iec.jita.space` proxy: instead of guessing a filename,
it resolves each request against the live **resfile index** for the current EVE
build, so it covers ~99.9% of SDE icons, not just the ~34% that the old proxy
hosted. Resolution goes through `@jitaspace/eve-resources`.

## How it works

```
GET /icons/22
  └─ SDE (DB):      icon 22            → res:/ui/texture/icons/6_64_14.png
  └─ resfile index: res:/…/6_64_14.png → 3c/3ccd4d7c…   (content-addressed)
  └─ proxy:         https://resources.eveonline.com/3c/3ccd4d7c…  → image bytes
```

The CDN labels every object `binary/octet-stream` and sends no CORS headers,
so the service proxies the bytes (rather than redirecting) to set the correct
`Content-Type` from the file extension and add `Access-Control-Allow-Origin: *`.

The resfile index (~120k entries, ~5 MB) is fetched once and cached in memory
per process, refreshed hourly to pick up new EVE builds.

## Routes

Most routes resolve against the EVE resfile index and serve bytes directly from
`resources.eveonline.com`. The exceptions are the blueprint variations (`/bp`,
`/bpc`), which CCP's image server composes at request time and which aren't
stored in the resfile — those are proxied from `images.evetech.net` for parity.

Every image route accepts a power-of-two `?size=` in `[32, 1024]` (matching the
image server); without it the native size is served.

| Route                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /icons/{iconId}`        | Image for an EVE icon ID (SDE `iconID` → `iconFile` → CDN), e.g. `/icons/22`.                                                                                                                                                                                                                                                                                                                                                  |
| `GET /types/{typeId}`        | JSON array of image variations this service serves for a type, e.g. `/types/34` → `["icon"]`, `/types/587` → `["icon","render"]`, `/types/691` → `["bp","bpc"]`. SKINs report `["icon"]`. 404 if none.                                                                                                                                                                                                                         |
| `GET /types/{typeId}/icon`   | Icon for an EVE type, e.g. `/types/34/icon`. Flat resfile icon (`typeID` → `iconID` → `iconFile` → CDN); for meta-group items (Tech II, faction, …) the tier badge is composited on to match `images.evetech.net` (pass `?badge=0` for the bare icon). **SKIN** types resolve to their material icon (coverage the official server lacks); **ships/structures** fall back to their 64px render icon. 404 only if none resolve. |
| `GET /types/{typeId}/render` | 3D render for a type (ships, structures, drones, …), e.g. `/types/587/render`. Served from the resfile (`typeID` → `graphicID` → `iconFolder` → `{graphicID}_512.jpg`), resized for `?size=`. JPEG. 404 for types with no render (e.g. modules — those have `/icon`).                                                                                                                                                          |
| `GET /types/{typeId}/bp`     | Blueprint-original image, e.g. `/types/691/bp`. Proxied from `images.evetech.net` (a runtime composite, not in the resfile). 404 for non-blueprints. Forwards a power-of-two `?size=` (32–1024).                                                                                                                                                                                                                               |
| `GET /types/{typeId}/bpc`    | Blueprint-copy image, e.g. `/types/691/bpc`. Proxied from `images.evetech.net` for parity. 404 for non-blueprints.                                                                                                                                                                                                                                                                                                             |

`GET /` returns a service overview — a styled landing page in browsers, the same
info as JSON for everything else.

## Local development

```bash
pnpm --filter @jitaspace/icon-server dev      # nitro dev server (default :3000)
# in another shell:
curl -sI http://localhost:3000/icons/22       # → 200, content-type: image/png

pnpm --filter @jitaspace/icon-server build     # build
pnpm --filter @jitaspace/icon-server preview   # run the built node server
```

## Configuration

| Env var                   | Default                                                                                      | Purpose                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`            | _(required)_                                                                                 | JitaSpace database (`@jitaspace/db`), queried for SDE lookups (icons, types, …).           |
| `RESFILE_TTL_MS`          | `3600000` (1h)                                                                               | How long the resfile index is cached before refetch.                                       |
| `IMAGE_CACHE_CONTROL`     | `public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800` | `Cache-Control` on served images and the `/types/{id}` JSON.                               |
| `NOT_FOUND_CACHE_CONTROL` | `public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400`                         | `Cache-Control` on 404s/400s (unknown or malformed IDs). 5xx errors are always `no-store`. |
| `IMAGE_SERVER_BASE`       | `https://images.evetech.net`                                                                 | Image server proxied for the `/bp` and `/bpc` blueprint variations.                        |

## Deploying to Vercel

Click the **Deploy with Vercel** button at the top of this README. It clones the
monorepo and pre-sets the project's **Root Directory** to `apps/icon-server`. Set
`DATABASE_URL` to the JitaSpace database.

To set it up manually instead, create a Vercel project with **Root Directory** =
`apps/icon-server`. The included [`vercel.json`](./vercel.json) wires the monorepo
build and scopes the install to this app's dependency graph, which includes
`@jitaspace/db` — its postinstall (and the build's `db:generate` dependency)
generates the Prisma client.
Nitro auto-detects the Vercel preset and emits a Build Output API bundle.
