"use client";

import { Fragment } from "react";

import { WarAnchor } from "@jitaspace/ui";

import type { WarRoomWar } from "./types";
import { BalanceBar, IskFigure, StatusPill, WarEntity } from "./parts";
import { allyCount, formatDuration } from "./utils";
import classes from "./WarRoom.module.css";

export function WarRow({ war }: Readonly<{ war: WarRoomWar }>) {
  const allies = allyCount(war);
  const allyLabel = allies === 1 ? "ally" : "allies";
  const meta = [
    `${war.aggressorShipsKilled}·${war.defenderShipsKilled} ships`,
    war.status === "pending" ? "not started" : formatDuration(war.ageDays),
    war.isMutual ? "mutual" : null,
    war.isOpenForAllies ? "open for allies" : null,
    allies > 0 ? `${allies} ${allyLabel}` : null,
  ].filter(Boolean);

  return (
    <WarAnchor warId={war.warId} className={classes.warRow} underline="never">
      <WarEntity
        side="aggressor"
        corporationId={war.aggressorCorporationId}
        allianceId={war.aggressorAllianceId}
      />
      <div className={classes.rowMid}>
        <div className={classes.rowFigs}>
          <IskFigure war={war} side="aggressor" />
          <span className={classes.dim}>ISK destroyed</span>
          <IskFigure war={war} side="defender" />
        </div>
        <BalanceBar share={war.aggressorIskShare} />
      </div>
      <WarEntity
        side="defender"
        corporationId={war.defenderCorporationId}
        allianceId={war.defenderAllianceId}
        reversed
      />
      <div className={classes.rowMeta}>
        <StatusPill status={war.status} />
        {meta.map((item) => (
          <Fragment key={item}>
            <span className={classes.sep}>·</span>
            <span>{item}</span>
          </Fragment>
        ))}
      </div>
    </WarAnchor>
  );
}
