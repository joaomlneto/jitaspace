/**
 * gunzip a buffer if (and only if) it starts with the gzip magic bytes.
 *
 * The CDN serves resource files uncompressed in practice, but its
 * `content-type: application/gzip` header is untrustworthy — so we sniff the
 * actual bytes and only decompress real gzip streams. Uses the Web Streams
 * `DecompressionStream` API, which is available in both Node (>=18) and
 * browsers, keeping {@link fetchResourceBytes} isomorphic.
 */
export async function gunzipIfNeeded(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes;
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
