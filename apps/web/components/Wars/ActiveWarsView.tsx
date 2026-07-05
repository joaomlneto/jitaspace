"use client";

import { Container, Group, Stack, Title } from "@mantine/core";

import { WarsIcon } from "@jitaspace/eve-icons";

import { usePreferencesStore } from "~/lib/preferences";
import type { WarRoomData, WarRoomWar } from "./WarRoom";
import { WarRoom } from "./WarRoom";
import type { War } from "./WarsTable";
import { WarsTable } from "./WarsTable";

function toTableWar(war: WarRoomWar): War {
  return {
    warId: war.warId,
    aggressorCorporationId: war.aggressorCorporationId,
    aggressorAllianceId: war.aggressorAllianceId,
    aggressorIskDestroyed: war.aggressorIskDestroyed,
    aggressorShipsKilled: war.aggressorShipsKilled,
    allianceAllies: war.allianceAllies,
    corporationAllies: war.corporationAllies,
    declaredDate: new Date(war.declaredDate),
    defenderCorporationId: war.defenderCorporationId,
    defenderAllianceId: war.defenderAllianceId,
    defenderIskDestroyed: war.defenderIskDestroyed,
    defenderShipsKilled: war.defenderShipsKilled,
    startedDate: war.startedDate ? new Date(war.startedDate) : undefined,
    finishedDate: war.finishedDate ? new Date(war.finishedDate) : undefined,
    isMutual: war.isMutual,
    isOpenForAllies: war.isOpenForAllies,
    retractedDate: war.retractedDate ? new Date(war.retractedDate) : undefined,
    updatedAt: new Date(war.updatedAt),
  };
}

/**
 * Chooses how to present Active Wars based on the "New Active Wars page"
 * experimental setting: the redesigned overview when enabled, otherwise the
 * long-standing table. Both render from the same server-fetched data.
 */
export function ActiveWarsView({ data }: { data: WarRoomData }) {
  const experimental = usePreferencesStore(
    (state) => state.experimentalActiveWars,
  );

  if (experimental) {
    return <WarRoom data={data} />;
  }

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <WarsIcon width={48} />
          <Title>Active Wars ({data.wars.length})</Title>
        </Group>
        <WarsTable wars={data.wars.map(toTableWar)} />
      </Stack>
    </Container>
  );
}
