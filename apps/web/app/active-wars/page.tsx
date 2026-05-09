import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Container, Group, Loader, Stack, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { WarsIcon } from "@jitaspace/eve-icons";

import { WarsTable } from "~/components/Wars";

type War = {
  warId: number;
  aggressorCorporationId: number | null;
  aggressorAllianceId: number | null;
  aggressorIskDestroyed: number;
  aggressorShipsKilled: number;
  allianceAllies: { allianceId: number }[];
  corporationAllies: { corporationId: number }[];
  declaredDate: string;
  defenderCorporationId: number | null;
  defenderAllianceId: number | null;
  defenderIskDestroyed: number;
  defenderShipsKilled: number;
  startedDate: string | null;
  finishedDate: string | null;
  isMutual: boolean;
  isOpenForAllies: boolean;
  retractedDate: string | null;
  updatedAt: string;
};

async function getCachedWarsData(): Promise<War[]> {
  "use cache";
  cacheLife("hours");

  try {
    const now = new Date();
    return await prisma.war
      .findMany({
        select: {
          warId: true,
          aggressorCorporationId: true,
          aggressorAllianceId: true,
          aggressorIskDestroyed: true,
          aggressorShipsKilled: true,
          allianceAllies: { select: { allianceId: true } },
          corporationAllies: { select: { corporationId: true } },
          declaredDate: true,
          defenderCorporationId: true,
          defenderAllianceId: true,
          defenderIskDestroyed: true,
          defenderShipsKilled: true,
          startedDate: true,
          finishedDate: true,
          isMutual: true,
          isOpenForAllies: true,
          retractedDate: true,
          updatedAt: true,
        },
        where: {
          isDeleted: false,
          OR: [
            { finishedDate: { gte: now } },
            { finishedDate: { equals: null } },
          ],
        },
      })
      .then((wars) =>
        wars.map((war) => ({
          ...war,
          aggressorCorporationId: war.aggressorCorporationId ?? null,
          aggressorAllianceId: war.aggressorAllianceId ?? null,
          declaredDate: war.declaredDate.toISOString(),
          defenderCorporationId: war.defenderCorporationId ?? null,
          defenderAllianceId: war.defenderAllianceId ?? null,
          startedDate: war.startedDate?.toISOString() ?? null,
          finishedDate: war.finishedDate?.toISOString() ?? null,
          retractedDate: war.retractedDate?.toISOString() ?? null,
          updatedAt: war.updatedAt.toISOString(),
        })),
      );
  } catch {
    notFound();
  }
}

async function ActiveWarsContent() {
  const wars = await getCachedWarsData();

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <WarsIcon width={48} />
          <Title>Active Wars ({wars.length})</Title>
        </Group>
        <WarsTable
          wars={wars.map((war) => ({
            ...war,
            aggressorCorporationId: war.aggressorCorporationId ?? undefined,
            aggressorAllianceId: war.aggressorAllianceId ?? undefined,
            defenderCorporationId: war.defenderCorporationId ?? undefined,
            defenderAllianceId: war.defenderAllianceId ?? undefined,
            allianceAllies: war.allianceAllies.map((ally) => ally.allianceId),
            corporationAllies: war.corporationAllies.map(
              (ally) => ally.corporationId,
            ),
            declaredDate: new Date(war.declaredDate),
            startedDate: war.startedDate
              ? new Date(war.startedDate)
              : undefined,
            finishedDate: war.finishedDate
              ? new Date(war.finishedDate)
              : undefined,
            retractedDate: war.retractedDate
              ? new Date(war.retractedDate)
              : undefined,
            updatedAt: new Date(war.updatedAt),
          }))}
        />
      </Stack>
    </Container>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <ActiveWarsContent />
    </Suspense>
  );
}
