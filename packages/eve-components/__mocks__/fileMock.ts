// Stub for static binary assets (images) imported by transitive `@jitaspace/ui`
// sources (e.g. StandingIndicator's `.gif` files). Jest's transformer cannot
// parse binary files, so any `import x from "...gif"` resolves to this module.
// The shape mirrors next/image's StaticImageData so components that read
// `.src`/`.width`/`.height` keep working.
const stub = { src: "test-file-stub.png", height: 1, width: 1 };

export default stub;
