/**
 * Browser errors that are not the app's, dropped before they reach Sentry.
 *
 * Every pattern here must be unable to match the app's own frames. Those come
 * from `/_next/static/…`, and the Sentry SDK rewrites them to
 * `app:///_next/…` — so `app:///` itself is not a signal (server frames carry
 * it too) and must never be denied wholesale.
 */

/** Matched against the URL of the frame an error was thrown from. */
export const SENTRY_DENY_URLS: RegExp[] = [
  // Browser extensions' own scripts.
  /^(chrome|moz|safari(-web)?|ms-browser)-extension:\/\//i,
  // A userscript runner injecting `executors/<n>.js` into the page. One user's
  // copy threw ~1,200 "reading 'M_ID'" errors on /lp-store in two weeks
  // (JITASPACE-63/6E/6F). The app serves nothing under /executors/.
  /\/executors\/\d+\.js/,
];

/** Matched against the error message. */
export const SENTRY_IGNORE_ERRORS: (string | RegExp)[] = [
  // The MetaMask extension's injected provider; the app has no wallet
  // integration (JITASPACE-3F).
  "Failed to connect to MetaMask",
];
