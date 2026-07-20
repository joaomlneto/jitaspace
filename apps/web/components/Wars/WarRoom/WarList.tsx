"use client";

import { useMemo, useState } from "react";
import { Button, Chip, SegmentedControl, Select } from "@mantine/core";

import type { WarRoomWar } from "./types";
import type { SortKey, StatusFilter } from "./utils";
import { cx } from "./parts";
import { filterWars, SORT_OPTIONS, sortWars, STATUS_FILTERS } from "./utils";
import classes from "./WarRoom.module.css";
import { WarRow } from "./WarRow";
import { WarTable } from "./WarTable";

type ViewMode = "rows" | "table";

const INITIAL_VISIBLE = 24;
const VISIBLE_STEP = 24;

export function WarList({ wars }: Readonly<{ wars: WarRoomWar[] }>) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [combat, setCombat] = useState(false);
  const [mutual, setMutual] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("rows");
  const [sortKey, setSortKey] = useState<SortKey>("isk");
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered = useMemo(
    () => filterWars(wars, { status, combat, mutual, open }),
    [wars, status, combat, mutual, open],
  );
  const sorted = useMemo(
    () => sortWars(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
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
    if (key === sortKey) setSortDir((dir) => (dir === -1 ? 1 : -1));
    else {
      setSortKey(key);
      setSortDir(-1);
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
          sortKey={sortKey}
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
            value={sortKey}
            onChange={(value) => value && setSortKey(value)}
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
            onChange={(value) => setView(value)}
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
            onChange={(value) => setStatus(value)}
            data={STATUS_FILTERS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <Chip size="xs" radius="sm" checked={combat} onChange={setCombat}>
            In combat
          </Chip>
          <Chip size="xs" radius="sm" checked={mutual} onChange={setMutual}>
            Mutual
          </Chip>
          <Chip size="xs" radius="sm" checked={open} onChange={setOpen}>
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
