"use client";

import type { ReactNode } from "react";
import { memo, useMemo } from "react";

import type {
  EntityCardVariant,
  EntityRef,
  WarParticipant,
} from "@jitaspace/ui";
import { useWar } from "@jitaspace/hooks";
import { WarCardDisplay, warStatus } from "@jitaspace/ui";

import { useEntityRefs } from "./useEntityRefs";

export interface WarCardProps {
  warId: number;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

interface EsiWarParticipant {
  alliance_id?: number;
  corporation_id?: number;
}

const participant = (
  side: EsiWarParticipant,
  ref: (id?: number) => EntityRef | undefined,
): WarParticipant | undefined => {
  const entity = ref(side.alliance_id ?? side.corporation_id);
  if (!entity) return undefined;
  return { kind: side.alliance_id ? "alliance" : "corporation", entity };
};

/** `WarCardDisplay`, filled from ESI. */
export const WarCard = memo(
  ({ warId, variant = "full", headerRightSection }: WarCardProps) => {
    const { data } = useWar(warId);
    const war = data?.data;
    const allies = war?.allies ?? [];
    const ref = useEntityRefs([
      war?.aggressor.alliance_id ?? war?.aggressor.corporation_id,
      war?.defender.alliance_id ?? war?.defender.corporation_id,
      ...allies.map((ally) => ally.alliance_id ?? ally.corporation_id),
    ]);

    // The war arrives from ESI in the browser, so reading the clock here never
    // runs during a prerender.
    const card = useMemo(() => {
      if (!war) return undefined;
      const aggressor = participant(war.aggressor, ref);
      const defender = participant(war.defender, ref);
      if (!aggressor || !defender) return undefined;
      const dates = {
        declared: new Date(war.declared),
        started: war.started ? new Date(war.started) : undefined,
        finished: war.finished ? new Date(war.finished) : undefined,
      };
      return {
        ...dates,
        aggressor: {
          ...aggressor,
          iskDestroyed: war.aggressor.isk_destroyed,
          shipsKilled: war.aggressor.ships_killed,
        },
        defender: {
          ...defender,
          iskDestroyed: war.defender.isk_destroyed,
          shipsKilled: war.defender.ships_killed,
        },
        allies: (war.allies ?? []).flatMap(
          (ally) => participant(ally, ref) ?? [],
        ),
        mutual: war.mutual,
        openForAllies: war.open_for_allies,
        status: warStatus(dates, new Date()),
      };
    }, [war, ref]);

    return (
      <WarCardDisplay
        warId={warId}
        variant={variant}
        headerRightSection={headerRightSection}
        war={card}
      />
    );
  },
);
WarCard.displayName = "WarCard";
