import type { ReactElement } from "react";
import React from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { WarsIcon } from "@jitaspace/eve-icons";

import { WarsTable } from "~/components/Wars";
import { MainLayout } from "~/layouts";

type PageProps = {
  wars: {
    warId: number;
    aggressorCorporationId: number | null;
    aggressorAllianceId: number | null;
    aggressorIskDestroyed: number;
    aggressorShipsKilled: number;
    allianceAllies: {
      allianceId: number;
    }[];
    corporationAllies: {
      corporationId: number;
    }[];
    declaredDate: string; // ISO string
    defenderCorporationId: number | null;
    defenderAllianceId: number | null;
    defenderIskDestroyed: number;
    defenderShipsKilled: number;
    startedDate: string | null; // ISO string
    finishedDate: string | null; // ISO string
    isMutual: boolean;
    isOpenForAllies: boolean;
    retractedDate: string | null; // ISO string
    updatedAt: string; // ISO string
  }[];
  corporations: {
    corporationId: number;
    name: string;
  }[];
  alliances: {
    allianceId: number;
    name: string;
  }[];
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const now = new Date();
    const wars = await prisma.war
      .findMany({
        select: {
          warId: true,
          aggressorCorporationId: true,
          aggressorAllianceId: true,
          aggressorIskDestroyed: true,
          aggressorShipsKilled: true,
          allianceAllies: {
            select: {
              allianceId: true,
            },
          },
          corporationAllies: {
            select: {
              corporationId: true,
            },
          },
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
          // Exclude wars that are deleted, or finish in the future
          OR: [
            {
              finishedDate: { gte: now }, // Finished in the past
            },
            {
              finishedDate: { equals: null }, // Not finished yet
            },
          ],
        },
        take: 1000, // XXX: Limit to 1000 wars, just for testing
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

    return {
      props: {
        wars,
        corporations: [],
        alliances: [],
      },
      revalidate: 3600, // every hour
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 300, // at most once every 5 minutes
    };
  }
};

export default function Page({
  wars,
  corporations,
  alliances,
}: Readonly<PageProps>) {
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

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Wars" />
      {page}
    </MainLayout>
  );
};
