/**
 * POST /universe/names only takes int32 ids. Anything larger (an Upwell
 * structure, or an item in a hangar or container; the two share one id space)
 * makes ESI reject the whole batch with a 400 ("failed to coerce value … into
 * type integer"). Bisecting then still spends a request and an error-limit hit
 * on the id itself, so it is never sent.
 */
export const UNIVERSE_NAMES_MAX_ID = 2_147_483_647;
