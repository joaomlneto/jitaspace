// Static image imports (e.g. `import icon from "./icon.png"`) resolve to
// Next.js's `StaticImageData`. Next normally injects this reference into the
// generated `next-env.d.ts`; referencing it here keeps the types available for
// `tsc`/ESLint even before `next build` has regenerated that file. Referencing
// the same types package is idempotent, so this is safe alongside next-env.d.ts.
/// <reference types="next/image-types/global" />

export {};
