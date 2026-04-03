# @jitaspace/prettier-config

Shared Prettier configuration for the JitaSpace monorepo.

## Usage

In `package.json`:

```json
{
  "prettier": "@jitaspace/prettier-config"
}
```

## Configuration

Extends Prettier defaults with [`@ianvs/prettier-plugin-sort-imports`](https://github.com/IanVS/prettier-plugin-sort-imports) to enforce a consistent import order:

1. React
2. Next.js
3. Third-party packages
4. Internal `@jitaspace/*` packages
5. Relative imports
