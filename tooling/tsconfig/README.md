# @jitaspace/tsconfig

Shared TypeScript configuration presets for the JitaSpace monorepo.

## Presets

| File | Use for |
|---|---|
| `base.json` | All TypeScript packages (strict, bundler module resolution) |
| `internal-package.json` | Packages that emit declaration files (extends `base`) |
| `nextjs.json` | Next.js applications (extends `base`) |

## Usage

In `tsconfig.json`:

```json
{
  "extends": "@jitaspace/tsconfig/base.json",
  "include": ["."],
  "exclude": ["node_modules"]
}
```

## Key Settings (`base.json`)

- `strict: true` with `noUncheckedIndexedAccess`
- `module: "Preserve"` + `moduleResolution: "Bundler"` for bundler-first workflows
- `allowImportingTsExtensions: true`
- `noEmit: true` (compilation handled by the app bundler, not `tsc`)
