import posthog from "posthog-js";

/**
 * Tell PostHog who is using this browser, from the stored session.
 *
 * `posthog.identify` used to run only on `/login/complete`. Sessions never
 * expire, so a player who signed in before that call existed (2026-06-26), or
 * whose PostHog storage was cleared since, kept using the site as an anonymous
 * visitor and was missing from every "signed-in players" count.
 *
 * Two things happen on every page load with a readable session:
 *
 * - `signed_in` and `character_count` are registered as super properties, so
 *   every later event says whether a session was present. This is the property
 *   to filter on: PostHog's own `$is_identified` stays true after a sign-out.
 * - The browser is identified by the selected character, unless PostHog already
 *   knows it as one of this browser's characters. Checking the whole set keeps
 *   one person per browser: identifying again whenever the selected character
 *   changes would split one player across several people.
 *
 * Nothing is reset when the session is empty. `posthog.reset()` mints a new
 * anonymous id, and running it on every signed-out page load would turn each
 * visit into a new visitor.
 */
export function syncPosthogIdentity({
  characterIds,
  selectedCharacter,
}: {
  characterIds: number[];
  selectedCharacter: number | null;
}): void {
  // False when no project token is configured (see instrumentation-client.ts).
  if (!posthog.__loaded) return;

  posthog.register({
    signed_in: characterIds.length > 0,
    character_count: characterIds.length,
  });

  const characterId = selectedCharacter ?? characterIds[0];
  if (characterId === undefined) return;

  const knownAs = posthog.get_distinct_id();
  if (characterIds.some((id) => String(id) === knownAs)) return;

  posthog.identify(String(characterId), { eve_character_id: characterId });
}
