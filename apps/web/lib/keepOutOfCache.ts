/**
 * Keep the current render out of the page's ISR cache. Call it on the path
 * where a page that is cached whole degrades instead of failing: a section
 * that renders without its data after a failed read. Without it the degraded
 * page is stored like any other and served until the entry revalidates, long
 * after the read would have succeeded again. With it the render becomes
 * request-time, so the next request retries.
 *
 * Imported on the failure path only: `next/server` cannot load in the jsdom
 * suites that import the host pages, which jsdom's lack of a global `Request`
 * breaks at import time.
 */
export async function keepOutOfCache(): Promise<void> {
  const { connection } = await import("next/server");
  await connection();
}
