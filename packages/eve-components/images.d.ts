// Ambient declarations for static image imports.
//
// Next.js normally injects these into `next-env.d.ts` for the consuming app,
// but this standalone library is type-checked on its own, so the bundler's
// static-image imports (e.g. `import icon from "./icon.png"`) would otherwise
// fail to resolve. Declaring them here as `StaticImageData` (the shape Next's
// `<Image src>` accepts) keeps those imports precisely typed.
//
// This also covers `@jitaspace/eve-icons`, whose `.tsx` sources are pulled into
// this package's program (it ships raw TypeScript), and which imports a `.png`
// per icon. Kept in sync with `packages/ui/images.d.ts`.

interface StaticImageData {
  src: string;
  height: number;
  width: number;
  blurDataURL?: string;
  blurWidth?: number;
  blurHeight?: number;
}

declare module "*.gif" {
  const content: StaticImageData;
  export default content;
}

declare module "*.png" {
  const content: StaticImageData;
  export default content;
}

declare module "*.jpg" {
  const content: StaticImageData;
  export default content;
}

declare module "*.jpeg" {
  const content: StaticImageData;
  export default content;
}

declare module "*.svg" {
  const content: StaticImageData;
  export default content;
}

declare module "*.webp" {
  const content: StaticImageData;
  export default content;
}

declare module "*.avif" {
  const content: StaticImageData;
  export default content;
}
