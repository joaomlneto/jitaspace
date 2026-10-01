import type { DragEvent } from "react";

/** The drag payload type of a comparison column header's grip. */
export const COLUMN_DRAG_MIME_TYPE = "application/x-jitaspace-compare-type";

/** Start dragging the column of `typeId`. */
export function startColumnDrag(event: DragEvent, typeId: number): void {
  event.dataTransfer.setData(COLUMN_DRAG_MIME_TYPE, `${typeId}`);
  event.dataTransfer.effectAllowed = "move";
}

/** The type id being dragged, or undefined for a drag from elsewhere. */
export function draggedTypeId(event: DragEvent): number | undefined {
  const typeId = Number(event.dataTransfer.getData(COLUMN_DRAG_MIME_TYPE));
  return Number.isInteger(typeId) && typeId > 0 ? typeId : undefined;
}

/** Whether a drag carries a comparison column. */
export function isColumnDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes(COLUMN_DRAG_MIME_TYPE);
}
