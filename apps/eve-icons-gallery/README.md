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
