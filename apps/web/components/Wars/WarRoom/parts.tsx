"use client";

import type { CSSProperties } from "react";

import { AllianceName, CorporationName } from "@jitaspace/eve-components";
import {
  AllianceAnchor,
  AllianceAvatar,
  CorporationAnchor,
  CorporationAvatar,
} from "@jitaspace/ui";

import type { WarRoomWar, WarStatus } from "./types";
import { formatIskCompact, leadingSide, STATUS_LABEL } from "./utils";
import classes from "./WarRoom.module.css";

export function cx(...values: (string | false | undefined | null)[]): string {
  return values.filter(Boolean).join(" ");
}

/** Small logo + name for one belligerent. `side` tints the logo ring. */
export function WarEntity({
  side,
  corporationId,
  allianceId,
  size = 20,
  reversed = false,
  linked = false,
}: {
  side: "aggressor" | "defender";
  corporationId?: number;
  allianceId?: number;
  size?: number;
  reversed?: boolean;
  linked?: boolean;
}) {
  const ring = cx(
    classes.avatarRing,
    side === "aggressor" ? classes.agg : classes.def,
  );

  const avatar =
    allianceId != null ? (
      <AllianceAvatar allianceId={allianceId} size={size} className={ring} />
    ) : (
      <CorporationAvatar
        corporationId={corporationId}
        size={size}
        className={ring}
      />
    );

  const rawName =
    allianceId != null ? (
      <AllianceName allianceId={allianceId} className={classes.entityName} />
    ) : (
      <CorporationName
        corporationId={corporationId}
        className={classes.entityName}
      />
    );

  let name = rawName;
  if (linked && allianceId != null) {
    name = (
      <AllianceAnchor
        allianceId={allianceId}
        inherit
        className={classes.entityName}
      >
        {rawName}
      </AllianceAnchor>
    );
  } else if (linked && corporationId != null) {
    name = (
      <CorporationAnchor
        corporationId={corporationId}
        inherit
        className={classes.entityName}
      >
        {rawName}
      </CorporationAnchor>
    );
  }

  return (
    <span className={cx(classes.entity, reversed && classes.right)}>
      {avatar}
      {name}
    </span>
  );
}

/** Proportional ISK-destroyed split. `share` = aggressor's fraction, or null. */
export function BalanceBar({
  share,
  height,
}: {
  share: number | null;
  height?: number;
}) {
  const style: CSSProperties | undefined = height ? { height } : undefined;
  if (share === null) {
    return <span className={cx(classes.bal, classes.empty)} style={style} />;
  }
  return (
    <span className={classes.bal} style={style}>
      <span className={classes.a} style={{ width: `${share * 100}%` }} />
      <span className={classes.d} style={{ width: `${(1 - share) * 100}%` }} />
    </span>
  );
}

/** One side's ISK-destroyed figure; the leading side is emphasised. */
export function IskFigure({
  war,
  side,
}: {
  war: WarRoomWar;
  side: "aggressor" | "defender";
}) {
  const lead = leadingSide(war);
  const value =
    side === "aggressor" ? war.aggressorIskDestroyed : war.defenderIskDestroyed;
  const emphasis =
    lead === side ? classes.lead : lead ? classes.figDim : undefined;
  return (
    <span
      className={cx(
        classes.mono,
        side === "aggressor" ? classes.figA : classes.figD,
        emphasis,
      )}
    >
      {formatIskCompact(value)}
    </span>
  );
}

export function statusDotClass(status: WarStatus): string | undefined {
  if (status === "pending") return classes.dotStarting;
  if (status === "retracting") return classes.dotEnding;
  return classes.dotActive;
}

export function StatusPill({ status }: { status: WarStatus }) {
  return (
    <span className={classes.state}>
      <span className={cx(classes.dot, statusDotClass(status))} />
      {STATUS_LABEL[status]}
    </span>
  );
}
