import { scopes } from "./scopes.generated";

export { scopes };

/**
 * Every ESI scope known when this package was last generated — a closed union.
 * Use it where you want exhaustiveness or typo-checking against the scopes that
 * existed at generation time (e.g. the keys of {@link scopeDescriptions}).
 */
export type KnownESIScope = (typeof scopes)[number];

/**
 * An ESI scope. Known scopes autocomplete; any other string is still accepted,
 * so scopes CCP adds after this package was generated do not break consumers
 * (notably the `scp` claim decoded from a live access token). Narrow to
 * {@link KnownESIScope} when you specifically need the closed set.
 */
export type ESIScope = KnownESIScope | (string & {});
