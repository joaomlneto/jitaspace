# @jitaspace/tsconfig

Shared TypeScript configuration presets for the JitaSpace monorepo.

## Presets

| File        | Use for                                                     |
| ----------- | ----------------------------------------------------------- |
| `base.json` | All TypeScript packages (strict, bundler module resolution) |

`base.json` is the only preset. Declaration output is produced by each
package's bundler (`tsup --dts`), not by `tsc`.

## Usage

In `tsconfig.json`:

```json
{
  "extends": "@jitaspace/tsconfig/base.json",
  "include": ["."],
  "exclude": ["node_modules", "build", "dist", "coverage"]
}
```

## Key Settings (`base.json`)

- `strict: true` with `noUncheckedIndexedAccess`
- `module: "Preserve"` + `moduleResolution: "Bundler"` for bundler-first workflows
- `allowImportingTsExtensions: true`
- `noEmit: true` (compilation handled by the app bundler, not `tsc`)

There is deliberately no `exclude` in `base.json`: a child's `exclude` replaces
rather than extends the parent's, and relative paths in an inherited one resolve
against the preset's own directory. Each package spells out its own, as above.
