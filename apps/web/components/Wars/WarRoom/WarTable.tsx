"use client";

import { WarAnchor } from "@jitaspace/ui";

import type { WarRoomWar } from "./types";
import type { SortKey } from "./utils";
import { BalanceBar, cx, IskFigure, StatusPill, WarEntity } from "./parts";
import { formatDuration } from "./utils";
import classes from "./WarRoom.module.css";

function SortableTh({
  sortId,
  label,
  sortKey,
  sortDir,
  onSort,
}: Readonly<{
  sortId: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: -1 | 1;
  onSort: (key: SortKey) => void;
}>) {
  const active = sortKey === sortId;
  let ariaSort: "ascending" | "descending" | "none" = "none";
  if (active) ariaSort = sortDir < 0 ? "descending" : "ascending";

  // A real <button> keeps the header keyboard-accessible; aria-sort stays on the
  // <th> (its native columnheader role supports it).
  return (
    <th className={classes.num} aria-sort={ariaSort}>
      <button
        type="button"
        className={classes.sortBtn}
        onClick={() => onSort(sortId)}
      >
        {label}
        {active ? (
          <span className={classes.car}>{sortDir < 0 ? "↓" : "↑"}</span>
        ) : null}
      </button>
    </th>
  );
}

export function WarTable({
  wars,
  sortKey,
  sortDir,
  onSort,
}: Readonly<{
  wars: WarRoomWar[];
  sortKey: SortKey;
  sortDir: -1 | 1;
  onSort: (key: SortKey) => void;
}>) {
  return (
    <div className={classes.tableScroll}>
      <table className={classes.ledger}>
        <thead>
          <tr>
            <th>War</th>
            <th>Aggressor</th>
            <SortableTh
              sortId="isk"
              label="ISK dealt"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th style={{ textAlign: "center" }}>Balance</th>
            <th className={classes.num}>ISK dealt</th>
            <th>Defender</th>
            <SortableTh
              sortId="ships"
              label="Ships"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              sortId="longest"
              label="Age"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {wars.map((war) => (
            <tr key={war.warId}>
              <td className={cx(classes.num, classes.dim)}>
                <WarAnchor warId={war.warId} inherit>
                  #{war.warId}
                </WarAnchor>
              </td>
              <td className={classes.nameCell}>
                <WarEntity
                  side="aggressor"
                  corporationId={war.aggressorCorporationId}
                  allianceId={war.aggressorAllianceId}
                  size={18}
                  linked
                />
              </td>
              <td className={classes.num}>
                <IskFigure war={war} side="aggressor" />
              </td>
              <td className={classes.balCell}>
                <BalanceBar share={war.aggressorIskShare} height={5} />
              </td>
              <td className={classes.num}>
                <IskFigure war={war} side="defender" />
              </td>
              <td className={classes.nameCell}>
                <WarEntity
                  side="defender"
                  corporationId={war.defenderCorporationId}
                  allianceId={war.defenderAllianceId}
                  size={18}
                  linked
                />
              </td>
              <td className={classes.num}>
                {war.aggressorShipsKilled}·{war.defenderShipsKilled}
              </td>
              <td className={classes.num}>{formatDuration(war.ageDays)}</td>
              <td>
                <StatusPill status={war.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
