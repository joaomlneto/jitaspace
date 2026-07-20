"use client";

import { useMemo, useState } from "react";
import { Button, Chip, SegmentedControl, Select } from "@mantine/core";
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs";

import type { WarRoomWar } from "./types";
import type { SortKey } from "./utils";
import { cx } from "./parts";
import { filterWars, SORT_OPTIONS, sortWars, STATUS_FILTERS } from "./utils";
import classes from "./WarRoom.module.css";
import { WarRow } from "./WarRow";
import { WarTable } from "./WarTable";

const VIEW_MODES = ["rows", "table"] as const;

const INITIAL_VISIBLE = 24;
const VISIBLE_STEP = 24;

// The filter/sort/view controls are synced to the URL so a filtered view can be
// shared, bookmarked, and survives a refresh. Parsers live at module scope for
// stable references; each default matches the previous useState default, and
// nuqs strips any param equal to its default so a pristine view has a clean URL.
const STATUS_VALUES = STATUS_FILTERS.map((option) => option.value);
const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);
const SORT_DIRECTIONS = ["desc", "asc"] as const;

const warControlParsers = {
  status: parseAsStringLiteral(STATUS_VALUES).withDefault("all"),
  combat: parseAsBoolean.withDefault(false),
  mutual: parseAsBoolean.withDefault(false),
  open: parseAsBoolean.withDefault(false),
  view: parseAsStringLiteral(VIEW_MODES).withDefault("rows"),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("isk"),
  dir: parseAsStringLiteral(SORT_DIRECTIONS).withDefault("desc"),
};

// Match the mail page: replace history entries rather than pushing one per click.
const warControlUrlOptions = { history: "replace" as const };

export function WarList({ wars }: Readonly<{ wars: WarRoomWar[] }>) {
  const [{ status, combat, mutual, open, view, sort, dir }, setControls] =
    useQueryStates(warControlParsers, warControlUrlOptions);

  // WarTable and sortWars use a numeric -1|1 direction; the URL keeps the more
  // readable desc/asc, so convert at this boundary.
  const sortDir: -1 | 1 = dir === "asc" ? 1 : -1;

  // Load-more window is ephemeral pagination — deliberately not URL-synced.
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered = useMemo(
    () => filterWars(wars, { status, combat, mutual, open }),
    [wars, status, combat, mutual, open],
  );
  const sorted = useMemo(
    () => sortWars(filtered, sort, sortDir),
    [filtered, sort, sortDir],
  );

  // Reset the load-more window when the filters change (render-time, no effect).
  const filterKey = `${status}:${combat}:${mutual}:${open}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisible(INITIAL_VISIBLE);
  }

  const shown = sorted.slice(0, visible);

  const handleTableSort = (key: SortKey) => {
    if (key === sort) {
      void setControls({ dir: dir === "asc" ? "desc" : "asc" });
    } else {
      void setControls({ sort: key, dir: "desc" });
    }
  };

  let listContent;
  if (shown.length === 0) {
    listContent = (
      <div className={cx(classes.listCard, classes.emptyMessage)}>
        No wars match these filters.
      </div>
    );
  } else if (view === "table") {
    listContent = (
      <div className={classes.swap} key="table">
        <WarTable
          wars={shown}
          sortKey={sort}
          sortDir={sortDir}
          onSort={handleTableSort}
        />
      </div>
    );
  } else {
    listContent = (
      <div className={cx(classes.listCard, classes.swap)} key="rows">
        {shown.map((war) => (
          <WarRow key={war.warId} war={war} />
        ))}
      </div>
    );
  }

  return (
    <section className={classes.section}>
      <div className={classes.sectionHead}>
        <div className={classes.sectionTitle}>
          All wars{" "}
          <span className={classes.sectionSub}>
            {filtered.length.toLocaleString()} shown
          </span>
        </div>
        <div className={classes.controlsGroup}>
          <Select
            size="xs"
            w={168}
            aria-label="Sort wars"
            value={sort}
            onChange={(value) => {
              if (value) void setControls({ sort: value });
            }}
            data={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            allowDeselect={false}
            checkIconPosition="right"
          />
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(value) => void setControls({ view: value })}
            data={[
              { value: "rows", label: "Rows" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>
      </div>

      <div className={classes.controls}>
        <div className={classes.controlsGroup}>
          <SegmentedControl
            size="xs"
            value={status}
            onChange={(value) => void setControls({ status: value })}
            data={STATUS_FILTERS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <Chip
            size="xs"
            radius="sm"
            checked={combat}
            onChange={(checked) => void setControls({ combat: checked })}
          >
            In combat
          </Chip>
          <Chip
            size="xs"
            radius="sm"
            checked={mutual}
            onChange={(checked) => void setControls({ mutual: checked })}
          >
            Mutual
          </Chip>
          <Chip
            size="xs"
            radius="sm"
            checked={open}
            onChange={(checked) => void setControls({ open: checked })}
          >
            Open for allies
          </Chip>
        </div>
      </div>

      {listContent}

      {visible < sorted.length ? (
        <div className={classes.moreWrap}>
          <Button
            size="xs"
            variant="default"
            onClick={() => setVisible((current) => current + VISIBLE_STEP)}
          >
            Show more ({(sorted.length - visible).toLocaleString()} more)
          </Button>
        </div>
      ) : null}
    </section>
  );
}
