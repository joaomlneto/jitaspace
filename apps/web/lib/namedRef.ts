/** An entity by id, with its name when the page already knows it. */
export interface NamedRef {
  id: number;
  name: string | null;
}

/**
 * A reference by id, named from the first of `known` with the same id. A name
 * from a stale source must not label a different entity, so a mismatched id
 * leaves the name for the entity's own component to resolve.
 */
export function named(
  id: number | null | undefined,
  ...known: (NamedRef | null | undefined)[]
): NamedRef | null {
  if (id == null) return null;
  const match = known.find((candidate) => candidate?.id === id);
  return { id, name: match?.name ?? null };
}
