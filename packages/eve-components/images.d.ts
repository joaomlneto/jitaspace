// Ambient declarations for static image imports.
//
// This package imports no images itself, but it consumes `@jitaspace/ui` and
// `@jitaspace/eve-icons` as TypeScript source, so their static-image imports
// (e.g. `import icon from "./rhea.png"`) are resolved by *this* program. A
// dependency's own `images.d.ts` is not pulled along by the import graph, so
// the declarations have to be repeated here — the same reason `@jitaspace/ui`
// carries a copy. `StaticImageData` is the shape Next's `<Image src>` accepts.

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

declare module "*.webp" {
  const content: StaticImageData;
  export default content;
}

declare module "*.avif" {
  const content: StaticImageData;
  export default content;
}
