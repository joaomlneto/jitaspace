// Global Jest stub for `next/cache` (wired via `moduleNameMapper` in
// jest.config.ts). The real module constructs a `Request` at load time
// (next/dist/server/web/spec-extension/request), which throws under jsdom — so
// any test that transitively imports a `"use cache"` module (e.g. the
// change-history server actions reached through EntityHistory / the type page)
// would crash on import. These no-ops let those modules load cleanly; the cache
// directives have no runtime effect under Jest anyway.

export const cacheLife = (): void => undefined;
export const unstable_cacheLife = (): void => undefined;
export const cacheTag = (): void => undefined;
export const unstable_cacheTag = (): void => undefined;
export const revalidateTag = (): void => undefined;
export const revalidatePath = (): void => undefined;
