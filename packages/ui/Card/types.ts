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

/** The kinds of entity a card links to; the app maps each to its page. */
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
