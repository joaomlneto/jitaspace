/**
 * Accessible names for the pagination arrows both engines render.
 *
 * Mantine's Pagination draws its previous/next/first/last controls as bare
 * icons, so a screen reader announces them as "button" and axe fails every
 * paginated table (`button-name`). The page numbers need nothing: their
 * number is their name. TanStack passes this to `Pagination` as
 * `getControlProps`; mantine-datatable, which already named previous and
 * next the same way, as `getPaginationControlProps`.
 */
const CONTROL_LABELS = {
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
} as const;

export type PaginationControl = keyof typeof CONTROL_LABELS;

export const getPaginationControlProps = (control: PaginationControl) => ({
  "aria-label": CONTROL_LABELS[control],
});
