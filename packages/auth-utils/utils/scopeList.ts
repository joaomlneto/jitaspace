import type { ESIScope } from "@jitaspace/esi-metadata";

/**
 * The `scp` claim as a list. EVE only writes a list for several scopes: a lone
 * scope is a bare string, and a token with no scopes has no claim at all.
 */
export function scopeList(scp: unknown): ESIScope[] {
  if (Array.isArray(scp)) return scp as ESIScope[];
  return typeof scp === "string" && scp ? [scp] : [];
}
