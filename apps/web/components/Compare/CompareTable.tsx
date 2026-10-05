"use client";

import type {
  CellContext,
  ColumnDef,
  ExpandedState,
  HeaderContext,
  Updater,
} from "@tanstack/react-table";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Popover,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconPlus,
} from "@tabler/icons-react";
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  flexRender,
  rowExpandingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { DogmaAttributeAnchor, EveIconAvatar } from "@jitaspace/ui";

import type { IndexedCompareCatalog } from "./catalog";
import type { CompareRow, CompareSection, Comparison } from "./comparison";
import { draggedTypeId, isColumnDrag } from "./columnDrag";
import classes from "./Compare.module.css";
import { CompareItemHeader } from "./CompareItemHeader";
import { ComparePickerPortalContext } from "./CompareItemPicker";
import { CompareValue } from "./CompareValue";

export interface CompareTableProps {
  typeIds: number[];
  /** Each item's name, for button labels and the table's accessible name. */
  names: Record<number, string>;
  catalog?: IndexedCompareCatalog;
  comparison: Comparison;
  /** Each item's ESI group, for headers of items outside the catalog. */
  groupIds: Record<number, number | undefined>;
  /** Remove an item; omit it for a table whose items are fixed. */
  onRemove?: (typeId: number) => void;
  /**
   * Move `typeId` to column `index` (0 makes it the baseline); omit it for a
   * table whose column order is fixed.
   */
  onMove?: (typeId: number, index: number) => void;
  /** Contents of the trailing column, where items are added. */
  addColumn?: ReactNode;
  /** Cap on the height; the table scrolls inside. Defaults to the viewport. */
  maxHeight?: CSSProperties["maxHeight"];
}

/** The TanStack features the table uses; the core row model is built in. */
const features = tableFeatures({
  columnOrderingFeature,
  columnPinningFeature,
  // For `row.getVisibleCells()`, though every column is always visible.
  columnVisibilityFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});
type Features = typeof features;

/** A section heading, or one attribute row under it. */
type TableRow =
  | { kind: "section"; section: CompareSection; subRows: TableRow[] }
  | { kind: "row"; row: CompareRow };

const LABEL_COLUMN_ID = "label";
const ADD_COLUMN_ID = "add";
const ITEM_COLUMN_MIN_WIDTH = 150;
const ADD_COLUMN_WIDTH = 200;
/** Where the add box lives, for focus to fall back to. */
const ADD_INPUT_SELECTOR = 'input[aria-label="Add an item to compare"]';

const typeColumnId = (typeId: number) => `type:${typeId}`;
const columnTypeId = (columnId: string) => Number(columnId.slice(5));

/** The rendered width of the label column, mirroring `.label` in the CSS. */
const labelColumnPx = (viewportWidth: number) =>
  Math.min(Math.max(viewportWidth * 0.24, 150), 260);

function RowLabel({ row }: Readonly<{ row: CompareRow }>) {
  return (
    <Group gap={8} wrap="nowrap" title={row.name}>
      {row.iconId !== undefined && (
        <EveIconAvatar iconId={row.iconId} size={20} radius={0} alt="" />
      )}
      {row.attributeId === undefined ? (
        <Text fz={12.5}>{row.label}</Text>
      ) : (
        <DogmaAttributeAnchor
          attributeId={row.attributeId}
          fz={12.5}
          c="inherit"
          lineClamp={1}
        >
          {row.label}
        </DogmaAttributeAnchor>
      )}
      {row.hidden && (
        <Badge size="xs" variant="outline" color="gray" radius="sm">
          hidden
        </Badge>
      )}
    </Group>
  );
}

/** What the column renderers below read, passed through the table's `meta`. */
interface CompareTableMeta {
  typeIds: number[];
  names: Record<number, string>;
  catalog?: IndexedCompareCatalog;
  groupIds: Record<number, number | undefined>;
  onMove?: (typeId: number, index: number) => void;
  onRemove?: (typeId: number) => void;
  addColumn?: ReactNode;
  addCollapsed: boolean;
}

type CompareHeaderContext = Readonly<HeaderContext<Features, TableRow>>;
type CompareCellContext = Readonly<CellContext<Features, TableRow>>;

const tableMeta = ({
  table,
}: CompareHeaderContext | CompareCellContext): CompareTableMeta =>
  table.options.meta as CompareTableMeta;

function LabelHeader(context: CompareHeaderContext) {
  const { addColumn, addCollapsed } = tableMeta(context);
  return (
    <Stack gap={6} align="flex-start">
      {addColumn && addCollapsed && (
        <CollapsedAddColumn>{addColumn}</CollapsedAddColumn>
      )}
      <span className={classes.columnLabel}>Attribute</span>
    </Stack>
  );
}

function LabelCell({ row }: CompareCellContext) {
  return row.original.kind === "row" ? (
    <RowLabel row={row.original.row} />
  ) : null;
}

function ItemHeader(context: CompareHeaderContext) {
  const { typeIds, names, catalog, groupIds, onMove, onRemove } =
    tableMeta(context);
  const typeId = columnTypeId(context.column.id);
  return (
    <CompareItemHeader
      typeId={typeId}
      name={names[typeId] ?? `item ${typeId}`}
      catalog={catalog}
      fallbackGroupId={groupIds[typeId]}
      index={typeIds.indexOf(typeId)}
      count={typeIds.length}
      onMove={onMove ? (target) => onMove(typeId, target) : undefined}
      onRemove={onRemove ? () => onRemove(typeId) : undefined}
    />
  );
}

function ItemCell(context: CompareCellContext) {
  const original = context.row.original;
  if (original.kind !== "row") return null;
  const { typeIds, catalog } = tableMeta(context);
  const cell =
    original.row.cells[typeIds.indexOf(columnTypeId(context.column.id))];
  if (!cell) return null;
  return (
    <CompareValue
      row={original.row}
      cell={cell}
      attributes={catalog?.attributes ?? {}}
    />
  );
}

function AddHeader(context: CompareHeaderContext) {
  return tableMeta(context).addColumn ?? null;
}

/** "3", or "3 of 9" when filters hide some of the section's rows. */
function sectionCount(section: CompareSection): string {
  const total = section.totalRows ?? section.rows.length;
  return total > section.rows.length
    ? `${section.rows.length} of ${total}`
    : `${section.rows.length}`;
}

function SectionToggle({
  section,
  expanded,
  onToggle,
}: Readonly<{
  section: CompareSection;
  expanded: boolean;
  onToggle: () => void;
}>) {
  const Chevron = expanded ? IconChevronDown : IconChevronRight;
  const count = sectionCount(section);
  return (
    <UnstyledButton
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${section.label}, ${count} rows`}
      className={classes.sectionToggle}
    >
      <Chevron size={12} aria-hidden />
      {section.label}
      <span className={classes.sectionCount}>{count}</span>
    </UnstyledButton>
  );
}

/**
 * The add column folded into a button in the pinned corner cell, once there is
 * no room for it: always in reach, and costing the item columns no width.
 */
function CollapsedAddColumn({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Popover position="bottom-start" width={260} trapFocus withinPortal>
      <Popover.Target>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconPlus size={12} />}
        >
          Add item
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <ComparePickerPortalContext value={false}>
          {children}
        </ComparePickerPortalContext>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * Items as columns, attributes as rows grouped into collapsible attribute
 * categories — a TanStack Table whose column order is the URL's item order,
 * laid out as the same compact ledger as the Active Wars table. The header row
 * has one fixed height, so it never changes size under a scrolling reader.
 * Columns are reordered by dragging their grip, with the arrow keys on it, or
 * from each column's actions menu; the trailing column adds new ones.
 */
export const CompareTable = memo(
  ({
    typeIds,
    names,
    catalog,
    comparison,
    groupIds,
    onRemove,
    onMove,
    addColumn,
    maxHeight,
  }: CompareTableProps) => {
    // Tracked as the sections the user collapsed, not TanStack's expanded
    // record: toggling one turns `true` into a record of only the sections
    // present then, so any that appear later (another filter, a new item's
    // attribute categories) would arrive collapsed.
    const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
      () => new Set(),
    );
    const [dropTarget, setDropTarget] = useState<number>();
    const [containerWidth, setContainerWidth] = useState<number>();
    const scrollRef = useRef<HTMLDivElement>(null);
    // A selector to focus once the columns have re-rendered: a moved column
    // is re-inserted into the DOM, and a removed one takes its button with it.
    const pendingFocus = useRef<string | null>(null);

    useEffect(() => {
      const selector = pendingFocus.current;
      if (!selector) return;
      pendingFocus.current = null;
      const target =
        scrollRef.current?.querySelector<HTMLElement>(selector) ??
        document.querySelector<HTMLElement>(ADD_INPUT_SELECTOR);
      target?.focus();
    }, [typeIds]);

    useEffect(() => {
      const element = scrollRef.current;
      if (!element || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(([entry]) =>
        setContainerWidth(entry?.contentRect.width),
      );
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    // Fold the add column into the corner cell when the item columns already
    // fill the width: otherwise it scrolls out of sight exactly when there are
    // many items, or on a phone. Worked out from the fixed column widths, not
    // the table's measured overflow, which the fold itself would change.
    const addCollapsed =
      addColumn === undefined ||
      (containerWidth !== undefined &&
        containerWidth <
          labelColumnPx(window.innerWidth) +
            typeIds.length * ITEM_COLUMN_MIN_WIDTH +
            ADD_COLUMN_WIDTH);

    const handleRemove = useCallback(
      (typeId: number) => {
        const index = typeIds.indexOf(typeId);
        const next = typeIds[index + 1] ?? typeIds[index - 1];
        pendingFocus.current =
          next === undefined
            ? ADD_INPUT_SELECTOR
            : `[data-compare-remove="${next}"]`;
        onRemove?.(typeId);
      },
      [typeIds, onRemove],
    );

    const handleMove = useCallback(
      (typeId: number, index: number) => {
        const fromGrip =
          document.activeElement instanceof HTMLElement &&
          document.activeElement.dataset.compareGrip !== undefined;
        pendingFocus.current = fromGrip
          ? `[data-compare-grip="${typeId}"]`
          : `[data-compare-menu="${typeId}"]`;
        onMove?.(typeId, index);
      },
      [onMove],
    );

    const data = useMemo<TableRow[]>(
      () =>
        comparison.sections.map((section) => ({
          kind: "section",
          section,
          subRows: section.rows.map((row) => ({ kind: "row", row })),
        })),
      [comparison.sections],
    );

    const meta = useMemo<CompareTableMeta>(
      () => ({
        typeIds,
        names,
        catalog,
        groupIds,
        onMove: onMove ? handleMove : undefined,
        onRemove: onRemove ? handleRemove : undefined,
        addColumn,
        addCollapsed,
      }),
      [
        typeIds,
        names,
        catalog,
        groupIds,
        onMove,
        onRemove,
        handleMove,
        handleRemove,
        addColumn,
        addCollapsed,
      ],
    );
    const columns = useMemo<ColumnDef<Features, TableRow>[]>(
      () => [
        { id: LABEL_COLUMN_ID, header: LabelHeader, cell: LabelCell },
        ...typeIds.map<ColumnDef<Features, TableRow>>((typeId) => ({
          id: typeColumnId(typeId),
          header: ItemHeader,
          cell: ItemCell,
        })),
        ...(addCollapsed
          ? []
          : [{ id: ADD_COLUMN_ID, header: AddHeader, cell: () => null }]),
      ],
      [typeIds, addCollapsed],
    );

    const expanded = useMemo<ExpandedState>(
      () =>
        Object.fromEntries(
          comparison.sections.map((section) => [
            section.key,
            !collapsed.has(section.key),
          ]),
        ),
      [comparison.sections, collapsed],
    );
    const onExpandedChange = useCallback(
      (updater: Updater<ExpandedState>) => {
        const next =
          typeof updater === "function" ? updater(expanded) : updater;
        if (next === true) {
          setCollapsed(new Set());
          return;
        }
        setCollapsed((current) => {
          const updated = new Set(current);
          for (const section of comparison.sections) {
            if (next[section.key]) updated.delete(section.key);
            else updated.add(section.key);
          }
          return updated;
        });
      },
      [expanded, comparison.sections],
    );

    const table = useTable({
      features,
      data,
      columns,
      meta,
      state: {
        expanded,
        columnOrder: [
          LABEL_COLUMN_ID,
          ...typeIds.map(typeColumnId),
          ...(addCollapsed ? [] : [ADD_COLUMN_ID]),
        ],
        columnPinning: { start: [LABEL_COLUMN_ID], end: [] },
      },
      onExpandedChange,
      getSubRows: (row) => (row.kind === "section" ? row.subRows : undefined),
      getRowId: (row) =>
        row.kind === "section" ? row.section.key : row.row.key,
    });

    const dragHandlers = (typeId: number) =>
      onMove ? columnDropHandlers(typeId, onMove) : {};
    const columnDropHandlers = (
      typeId: number,
      move: (typeId: number, index: number) => void,
    ) => ({
      onDragOver: (event: DragEvent) => {
        if (!isColumnDrag(event)) return;
        event.preventDefault();
        setDropTarget(typeId);
      },
      onDragLeave: () =>
        setDropTarget((current) => (current === typeId ? undefined : current)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        setDropTarget(undefined);
        const dragged = draggedTypeId(event);
        if (dragged !== undefined && dragged !== typeId) {
          move(dragged, typeIds.indexOf(typeId));
        }
      },
    });

    const columnCount = typeIds.length + (addCollapsed ? 1 : 2);
    const itemNames = typeIds.map(
      (typeId) => names[typeId] ?? `item ${typeId}`,
    );
    const tableName = `Comparison of ${itemNames.join(", ")}`;

    return (
      <section
        ref={scrollRef}
        aria-label="Comparison table"
        // Keyboard users scroll the table like any other scrollable region,
        // which needs it focusable: axe's scrollable-region-focusable.
        tabIndex={0} // NOSONAR(typescript:S6845)
        className={classes.scroll}
        style={maxHeight === undefined ? undefined : { maxHeight }}
      >
        <table
          className={classes.ledger}
          aria-label={tableName}
          style={{
            minWidth:
              labelColumnPx(0) +
              typeIds.length * ITEM_COLUMN_MIN_WIDTH +
              (addCollapsed ? 0 : ADD_COLUMN_WIDTH),
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const content = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );
                  if (columnId === LABEL_COLUMN_ID) {
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={`${classes.label} ${classes.corner}`}
                      >
                        {content}
                      </th>
                    );
                  }
                  if (columnId === ADD_COLUMN_ID) {
                    return (
                      <th
                        key={header.id}
                        style={{
                          width: ADD_COLUMN_WIDTH,
                          minWidth: ADD_COLUMN_WIDTH,
                        }}
                      >
                        {content}
                      </th>
                    );
                  }
                  const typeId = columnTypeId(columnId);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      {...dragHandlers(typeId)}
                      className={
                        dropTarget === typeId ? classes.dropTarget : undefined
                      }
                      style={{ minWidth: ITEM_COLUMN_MIN_WIDTH }}
                    >
                      {content}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const original = row.original;
              if (original.kind === "section") {
                return (
                  <tr key={row.id}>
                    <td colSpan={columnCount} className={classes.section}>
                      <SectionToggle
                        section={original.section}
                        expanded={row.getIsExpanded()}
                        onToggle={row.getToggleExpandedHandler()}
                      />
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id;
                    const content = flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    );
                    if (columnId === LABEL_COLUMN_ID) {
                      // A row header, so a screen reader moving across the
                      // row names the attribute with each value.
                      return (
                        <th key={cell.id} scope="row" className={classes.label}>
                          {content}
                        </th>
                      );
                    }
                    if (columnId === ADD_COLUMN_ID) {
                      return <td key={cell.id} />;
                    }
                    const index = typeIds.indexOf(columnTypeId(columnId));
                    const isBest = original.row.cells[index]?.rank === "best";
                    return (
                      <td
                        key={cell.id}
                        className={
                          isBest
                            ? `${classes.value} ${classes.best}`
                            : classes.value
                        }
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    );
  },
);
CompareTable.displayName = "CompareTable";
