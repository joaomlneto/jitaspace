"use client";

import type { WarRoomStats } from "./types";
import { cx } from "./parts";
import { formatCompactNumber, formatIskCompact } from "./utils";
import classes from "./WarRoom.module.css";

export function StatHeader({ stats }: { stats: WarRoomStats }) {
  const cells: { value: string; label: string; dot?: string }[] = [
    {
      value: formatCompactNumber(stats.activeCount),
      label: "Active",
      dot: classes.dotActive,
    },
    {
      value: formatCompactNumber(stats.startingCount),
      label: "Starting",
      dot: classes.dotStarting,
    },
    {
      value: formatCompactNumber(stats.endingCount),
      label: "Ending",
      dot: classes.dotEnding,
    },
    { value: formatCompactNumber(stats.warsWithCombat), label: "In combat" },
    {
      value: formatIskCompact(stats.totalIskDestroyed),
      label: "ISK destroyed",
    },
    { value: formatCompactNumber(stats.totalShipsKilled), label: "Ships lost" },
  ];

  return (
    <div className={classes.statGrid}>
      {cells.map((cell) => (
        <div className={classes.statCell} key={cell.label}>
          <div className={classes.statValue}>{cell.value}</div>
          <div className={classes.statLabel}>
            {cell.dot ? <span className={cx(classes.dot, cell.dot)} /> : null}
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}
