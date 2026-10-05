/**
 * gunzip a buffer if (and only if) it starts with the gzip magic bytes.
 *
 * The CDN gzips files in transit (`Content-Encoding: gzip`) and `fetch` undoes
 * that, so bodies normally arrive decompressed. This is a safety net for a
 * client that doesn't decode the transfer encoding: it sniffs the actual bytes
 * and only decompresses real gzip streams. Uses the Web Streams
 * `DecompressionStream` API, which is available in both Node (>=18) and
 * browsers, keeping {@link fetchResourceBytes} isomorphic.
 *
 * `label` names the resource in the error thrown for a corrupt gzip stream.
 */
export async function gunzipIfNeeded(
  bytes: Uint8Array,
  label: string,
): Promise<Uint8Array> {
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes;
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  try {
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (cause) {
    throw new Error(`Failed to gunzip ${label}`, { cause });
  }
}
