"use client";

import { useSyncExternalStore } from "react";

import {
  getAcceptLanguage,
  subscribeToAcceptLanguage,
} from "@jitaspace/esi-client";

/**
 * The server snapshot reads the same module-level config the client does.
 *
 * That is deliberate rather than lazy. `useSyncExternalStore` uses this value
 * for the hydration render too, so returning a hardcoded `undefined` would make
 * every name resolve once under "no language" and again the moment the real one
 * landed — one wasted ESI request per entity on every cold load. Reading the
 * config instead means an app that configures the language before its first
 * render (apps/web seeds it at module scope in MyQueryClientProvider) agrees
 * across the server render, the hydration render and every render after.
 *
 * `setAcceptLanguage` is only ever called from the browser, so on the server
 * this is a request-independent constant and cannot leak between requests.
 */
const getServerSnapshot = (): string | undefined => getAcceptLanguage();

/**
 * The Accept-Language currently configured on the ESI client, re-rendering when
 * it changes.
 *
 * ESI serves localised names for types, regions, solar systems and factions, so
 * anything that caches a resolved name has to treat the language as part of the
 * cache identity — otherwise a language switch leaves previously-resolved names
 * rendered in the old language until a full page reload.
 */
export const useEsiAcceptLanguage = (): string | undefined =>
  useSyncExternalStore(
    subscribeToAcceptLanguage,
    getAcceptLanguage,
    getServerSnapshot,
  );
