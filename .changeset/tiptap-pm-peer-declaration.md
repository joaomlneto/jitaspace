---
"@jitaspace/tiptap-eve": patch
"@jitaspace/ui": patch
---

Declare the `@tiptap/pm` peer where Tiptap is actually used.

`@tiptap/pm` is a hard peer dependency of both `@tiptap/core` and `@tiptap/react`, pinned to an exact version. `@jitaspace/ui` was the only workspace declaring it — and it never imported a line of Tiptap, so pruning its unused dependencies left the peer satisfied by nobody. Under `nodeLinker: hoisted` with `strictPeerDependencies: false` that still resolves, silently, from the transitive copy; it would break the day the chain supplying it changes. It is now declared by `@jitaspace/tiptap-eve` and `@jitaspace/web`, which are the workspaces that build on Tiptap.

Also cleaned up two leftovers in `@jitaspace/ui`: `postcss`, `postcss-preset-mantine` and `postcss-simple-vars` were unused devDependencies (the package has no postcss config and no stylesheet of any kind), and `jest.config.ts` still carved a `transformIgnorePatterns` exception for `@tiptap`, a namespace that can no longer appear in the package's module graph.
