import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, JsonInput, Stack, Title } from "@mantine/core";
import axios from "axios";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { LPStoreIcon } from "@jitaspace/eve-icons";

import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  solarSystems: Record<
    number,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    const solarSystemsQuery = await prisma.solarSystem.findMany({
      select: {
        solarSystemId: true,
        name: true,
        securityStatus: true,
        stargates: {
          select: {
            DestinationStargate: {
              select: {
                solarSystemId: true,
              },
            },
          },
        },
      },
    });

    const solarSystems: Record<
      number,
      { name: string; securityStatus: number; neighbors: number[] }
    > = {};
    solarSystemsQuery.forEach((solarSystem) => {
      solarSystems[solarSystem.solarSystemId] = {
        name: solarSystem.name,
        securityStatus: solarSystem.securityStatus.toNumber(),
        neighbors: solarSystem.stargates.flatMap(
          (stargate) => stargate.DestinationStargate.solarSystemId,
        ),
      };
    });

    return {
      props: {
        solarSystems,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 30, // 30 seconds on error
    };
  }
};

export default function Page({ solarSystems }: PageProps) {
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        {true && (
          <JsonInput
            value={JSON.stringify(
              {
                solarSystems,
              },
              null,
              2,
            )}
            autosize
            maxRows={50}
          />
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="LP Store" />
      {page}
    </MainLayout>
  );
};
