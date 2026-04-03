# @jitaspace/eslint-config

Shared ESLint flat-config presets for the JitaSpace monorepo.

## Presets

| Import | Use for |
|---|---|
| `@jitaspace/eslint-config/base` | Node.js packages and tooling |
| `@jitaspace/eslint-config/react` | React component libraries |
| `@jitaspace/eslint-config/nextjs` | Next.js applications |

## Usage

```ts
// eslint.config.ts
import baseConfig from "@jitaspace/eslint-config/base";
export default [...baseConfig];
```

All configs use the ESLint 9 flat-config format and include TypeScript ESLint rules via `typescript-eslint`.
