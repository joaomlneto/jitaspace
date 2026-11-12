# @jitaspace/eve-icons-gallery

A searchable gallery of [`@jitaspace/eve-icons`](../../packages/eve-icons):
browse every icon by set, try sizes, tints and backgrounds, and copy the
component's import.

It is a fully static site. `pnpm build` copies the package's PNGs into
`public/icons/` and exports to `out/`, which any static host can serve. The
grid shows those PNGs directly, so the page stays light. Opening an icon loads
the package itself (one ~1.7 MB chunk, fetched once) and renders the real
component.

```bash
pnpm --filter @jitaspace/eve-icons-gallery dev     # http://localhost:3000
pnpm --filter @jitaspace/eve-icons-gallery build   # static site in out/
```

The icons are © CCP hf. (Fenris Creations) and are not MIT-licensed; see the
package's [LICENSE](../../packages/eve-icons/LICENSE). The footer carries the
required notices.

On Vercel (project `eve-icons-gallery`), `vercel.json`'s `ignoreCommand` runs
[`scripts/ignore-build.ts`](scripts/ignore-build.ts), which builds only when
something that reaches `out/` changed since the branch's last successful
deployment: a file of this app, `@jitaspace/eve-icons` or `@jitaspace/tsconfig`
(docs, lint and test files aside), a non-tooling field of their `package.json`,
the lockfile version of one of their direct dependencies, or `turbo.json`.
ESLint, Prettier and Jest bumps do not count. If the gallery gains a workspace
dependency, add it to `WORKSPACES` in that script. To see what it would decide:

```bash
node apps/eve-icons-gallery/scripts/ignore-build.ts <base> [<head>]
```
