import { renderEveHref } from "@jitaspace/tiptap-eve";

/**
 * The id of the entity an existing editor link points at, so reopening a link
 * control shows that entity rather than the raw `showinfo:` href.
 *
 * Parses through `renderEveHref`, the same mapping the mail viewer uses, so the
 * many type ids behind a character, station or structure link stay in one
 * place. Returns "" when the link is a plain URL or points at an entity outside
 * `routes` (e.g. a character link under the cursor when Alliance is clicked).
 */
export const getLinkedEntityId = (
  href: unknown,
  routes: readonly string[],
): string => {
  if (typeof href !== "string") return "";
  const match = /^\/([a-z]+)\/(\d+)$/.exec(renderEveHref(href));
  const route = match?.[1];
  const id = match?.[2];
  return route !== undefined && id !== undefined && routes.includes(route)
    ? id
    : "";
};
