---
"@jitaspace/auth-utils": patch
"@jitaspace/esi-metadata": patch
"@jitaspace/tiptap-eve": patch
"@jitaspace/db": patch
---

build: declare a conditional `exports` map for the publishable packages

`auth-utils`, `esi-metadata` and `tiptap-eve` published only `main`/`module`/`types`.
Node ignores `module` entirely, so with the package marked `"type": "module"` both
of the following were wrong for anyone installing from npm:

- **ESM consumers loaded the CJS build.** `import.meta.resolve` landed on
  `dist/index.cjs`, so the ESM output shipped in every tarball but was never used,
  and the namespace object carried a spurious `default` key.
- **CJS TypeScript consumers could not compile.** Under `module: node16`,
  `types` resolved to `dist/index.d.ts`, which is ESM, giving
  `TS1479: ... cannot be imported with 'require'`. Runtime was fine, so this was
  purely a type-resolution failure — and invisible in-repo, where `nodenext` and
  `bundler` both pass.

All three now declare the same `import`/`require` map `@jitaspace/db` already used,
pointing `require` at the `dist/index.d.cts` that `tsup --dts` was already emitting
but nothing referenced. Every package also exposes `./package.json`, which some
tooling reads.

The map lives under `publishConfig`, not at the top level: `exports` outranks
`main`, so a top-level map pointing into `dist/` would override
`main: "./index.ts"` and break in-repo consumption via `transpilePackages`, which
expects TypeScript source that `dist/` does not contain in a fresh clone.
