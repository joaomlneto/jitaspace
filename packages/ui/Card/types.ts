/**
 * An entity a card refers to: its id, and its name once resolved. A missing
 * name renders as a skeleton, so a card can show its layout before every name
 * has arrived.
 */
export interface EntityRef {
  id: number;
  name?: string;
}

/**
 * `full` is the detailed card for pages and dashboards. `compact` is a single
 * row for lists and hover previews.
 */
export type EntityCardVariant = "full" | "compact";

/** The kinds of entity a card links to, each with its own page. */
export type EntityKind =
  | "alliance"
  | "category"
  | "character"
  | "corporation"
  | "faction"
  | "group"
  | "killmail"
  | "solar_system"
  | "type"
  | "war";

/** The web app's page for an entity. */
export const entityHref = (kind: EntityKind, id: number): string => {
  switch (kind) {
    case "alliance":
      return `/alliance/${id}`;
    case "category":
      return `/category/${id}`;
    case "character":
      return `/character/${id}`;
    case "corporation":
      return `/corporation/${id}`;
    case "faction":
      return `/faction/${id}`;
    case "group":
      return `/group/${id}`;
    case "killmail":
      return `/kill/${id}`;
    case "solar_system":
      return `/system/${id}`;
    case "type":
      return `/type/${id}`;
    case "war":
      return `/war/${id}`;
  }
};
