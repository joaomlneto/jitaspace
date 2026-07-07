"use client";

import { useMemo } from "react";

import { AllianceName, CorporationName } from "@jitaspace/eve-components";
import { WarAnchor } from "@jitaspace/ui";

import type { WarRoomAggressor, WarRoomWar } from "./types";
import { cx, WarEntity } from "./parts";
import { formatCompactNumber, formatIskCompact, warHasCombat } from "./utils";
import classes from "./WarRoom.module.css";

function SideName({
  corporationId,
  allianceId,
}: Readonly<{
  corporationId?: number;
  allianceId?: number;
}>) {
  const isAlliance = allianceId != null;
  return isAlliance ? (
    <AllianceName allianceId={allianceId} inherit span />
  ) : (
    <CorporationName corporationId={corporationId} inherit span />
  );
}

function AggressorRow({
  aggressor,
  rank,
  max,
}: Readonly<{
  aggressor: WarRoomAggressor;
  rank: number;
  max: number;
}>) {
  const width = max > 0 ? Math.max((aggressor.warCount / max) * 100, 3) : 0;
  return (
    <div className={classes.blRow}>
      <span className={classes.blRank}>{rank}</span>
      <div className={classes.blMain}>
        <WarEntity
          side="aggressor"
          corporationId={aggressor.corporationId}
          allianceId={aggressor.allianceId}
          size={20}
          linked
        />
        <div className={classes.blTrack}>
          <div
            className={cx(classes.blFill, classes.a)}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <div className={classes.blVal}>
        <div className={classes.blValNum}>{aggressor.warCount}</div>
        <div className={classes.blValSub}>
          {aggressor.iskDestroyed > 0
            ? `${formatIskCompact(aggressor.iskDestroyed)} dealt`
            : "wars"}
        </div>
      </div>
    </div>
  );
}

function FightRow({
  war,
  rank,
  max,
}: Readonly<{
  war: WarRoomWar;
  rank: number;
  max: number;
}>) {
  const width = max > 0 ? Math.max((war.totalIskDestroyed / max) * 100, 3) : 0;
  return (
    <div className={classes.blRow}>
      <span className={classes.blRank}>{rank}</span>
      <div className={classes.blMain}>
        <WarAnchor warId={war.warId} inherit className={classes.blMatch}>
          <SideName
            corporationId={war.aggressorCorporationId}
            allianceId={war.aggressorAllianceId}
          />
          <span className={classes.dim}> vs </span>
          <SideName
            corporationId={war.defenderCorporationId}
            allianceId={war.defenderAllianceId}
          />
        </WarAnchor>
        <div className={classes.blTrack}>
          <div
            className={cx(classes.blFill, classes.d)}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <div className={classes.blVal}>
        <div className={classes.blValNum}>
          {formatIskCompact(war.totalIskDestroyed)}
        </div>
        <div className={classes.blValSub}>
          {formatCompactNumber(war.totalShipsKilled)} ships
        </div>
      </div>
    </div>
  );
}

export function Belligerents({
  aggressors,
  wars,
}: Readonly<{
  aggressors: WarRoomAggressor[];
  wars: WarRoomWar[];
}>) {
  const heaviest = useMemo(
    () =>
      wars
        .filter(warHasCombat)
        .sort((a, b) => b.totalIskDestroyed - a.totalIskDestroyed)
        .slice(0, 5),
    [wars],
  );

  const maxWars = aggressors[0]?.warCount ?? 0;
  const maxIsk = heaviest[0]?.totalIskDestroyed ?? 0;

  return (
    <div className={classes.blCols}>
      <section>
        <div className={classes.sectionHead}>
          <div className={classes.sectionTitle}>
            Most active aggressors{" "}
            <span className={classes.sectionSub}>wars declared</span>
          </div>
        </div>
        <div className={classes.blCard}>
          {aggressors.slice(0, 5).map((aggressor, index) => (
            <AggressorRow
              key={`${aggressor.allianceId ?? "c"}-${aggressor.corporationId ?? "a"}`}
              aggressor={aggressor}
              rank={index + 1}
              max={maxWars}
            />
          ))}
        </div>
      </section>

      <section>
        <div className={classes.sectionHead}>
          <div className={classes.sectionTitle}>
            Heaviest fighting{" "}
            <span className={classes.sectionSub}>by ISK destroyed</span>
          </div>
        </div>
        <div className={classes.blCard}>
          {heaviest.length > 0 ? (
            heaviest.map((war, index) => (
              <FightRow
                key={war.warId}
                war={war}
                rank={index + 1}
                max={maxIsk}
              />
            ))
          ) : (
            <div className={classes.blNote}>No kills recorded yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
