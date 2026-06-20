"use client";

import { Burger, Container, SimpleGrid, Stack } from "@mantine/core";
import { useShallow } from "zustand/shallow";

import { AllianceCard } from "@jitaspace/eve-components";
import { useAuthenticatedCharacterIds, useAuthStore } from "@jitaspace/hooks";

import { AuthenticatedCharacterCard, CorporationCard } from "~/components/Card";
import { DevelopmentModeAlert } from "~/components/debug";
import { AddPilotCard, AppCard, SectionHeader } from "~/components/Home";
import { AllianceMenu, CorporationMenu } from "~/components/Menu";
import { NewsCarousel } from "~/components/News";
import { characterApps, universeApps } from "~/config/apps";
import { env } from "~/env";

const toolSections = [
  { title: "Capsuleer Tools", apps: characterApps },
  { title: "Universe", apps: universeApps },
];

export default function Page() {
  const authenticatedCharacterIds = useAuthenticatedCharacterIds();
  const authenticatedCorporationIds = useAuthStore(
    useShallow((state) => {
      return Array.from(
        new Set(
          authenticatedCharacterIds
            .map((characterId) => state.characters[characterId]?.corporationId)
            .filter(
              (corporationId): corporationId is number => corporationId != null,
            ),
        ),
      );
    }),
  );
  const authenticatedAllianceIds = useAuthStore(
    useShallow((state) => {
      return Array.from(
        new Set(
          authenticatedCharacterIds
            .map((characterId) => state.characters[characterId]?.allianceId)
            .filter((allianceId): allianceId is number => allianceId != null),
        ),
      );
    }),
  );

  return (
    <Container size="xl" py="md">
      <Stack gap={48}>
        <NewsCarousel />
        {env.NODE_ENV === "development" && <DevelopmentModeAlert />}

        <section>
          <SectionHeader
            title="Pilots"
            count={authenticatedCharacterIds.length || undefined}
          />
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {authenticatedCharacterIds.map((characterId) => (
              <AuthenticatedCharacterCard
                characterId={characterId}
                key={characterId}
              />
            ))}
            <AddPilotCard />
          </SimpleGrid>
        </section>

        {authenticatedCorporationIds.length > 0 && (
          <section>
            <SectionHeader
              title="Corporations"
              count={authenticatedCorporationIds.length}
            />
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {authenticatedCorporationIds.map((corporationId) => (
                <CorporationCard
                  corporationId={corporationId}
                  key={corporationId}
                  compact
                  headerRightSection={
                    <CorporationMenu corporationId={corporationId}>
                      <Burger size="sm" />
                    </CorporationMenu>
                  }
                />
              ))}
            </SimpleGrid>
          </section>
        )}

        {authenticatedAllianceIds.length > 0 && (
          <section>
            <SectionHeader
              title="Alliances"
              count={authenticatedAllianceIds.length}
            />
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {authenticatedAllianceIds.map((allianceId) => (
                <AllianceCard
                  allianceId={allianceId}
                  key={allianceId}
                  compact
                  headerRightSection={
                    <AllianceMenu allianceId={allianceId}>
                      <Burger size="sm" />
                    </AllianceMenu>
                  }
                />
              ))}
            </SimpleGrid>
          </section>
        )}

        {toolSections.map(({ title, apps }) => (
          <section key={title}>
            <SectionHeader title={title} />
            <SimpleGrid spacing="md" cols={{ base: 1, xs: 2, sm: 3, lg: 4 }}>
              {Object.values(apps).map((app) => (
                <AppCard app={app} key={app.name} />
              ))}
            </SimpleGrid>
          </section>
        ))}
      </Stack>
    </Container>
  );
}
