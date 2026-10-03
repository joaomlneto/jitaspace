/**
 * Decode resource bytes as UTF-8 text, stripping a leading byte-order mark if
 * present. Suitable for the many plaintext EVE resources (yaml, json, py, ...).
 */
export function decodeText(bytes: Uint8Array): string {
  const hasBom =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf;
  const body = hasBom ? bytes.subarray(3) : bytes;
  return new TextDecoder("utf-8").decode(body);
}
