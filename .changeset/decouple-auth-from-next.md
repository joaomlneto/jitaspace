---
"@jitaspace/auth": minor
"@jitaspace/auth-utils": patch
"@jitaspace/web": patch
---

refactor(auth): remove the Next.js dependency from the auth layer

`@jitaspace/auth` and `@jitaspace/auth-utils` no longer depend on `next`, so the
authentication logic is framework-agnostic and reusable by a future second
consumer (e.g. a mobile backend).

- `@jitaspace/auth` — `refreshTokenApiRouteHandler` now takes and returns Web
  standard `Request`/`Response` (`(request: Request) => Promise<Response>`,
  using `Response.json()`), replacing the Next.js Pages Router
  `(req: NextApiRequest, res: NextApiResponse)` signature. This drops the only
  `next` import in the package.
- `@jitaspace/auth-utils` — removed an unused `next` dependency (it imported
  nothing from it).
- `@jitaspace/web` — the SSO token-refresh server action now invokes the handler
  with a `Request` and reads the `Response`, removing the hand-rolled
  `NextApiResponse` adapter. No user-facing behaviour change.
