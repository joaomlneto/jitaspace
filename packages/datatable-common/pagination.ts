export type PaginationControl = "first" | "previous" | "next" | "last";

const PAGINATION_CONTROL_LABELS: Record<PaginationControl, string> = {
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
};

/**
 * Accessible names for Mantine Pagination's icon-only arrow buttons, which have
 * none by default. Pass as `getControlProps` (Mantine) or
 * `getPaginationControlProps` (mantine-datatable).
 */
export const getPaginationControlProps = (control: PaginationControl) => ({
  "aria-label": PAGINATION_CONTROL_LABELS[control],
});
