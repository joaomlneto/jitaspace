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

        <section>
          <SectionHeader title="Capsuleer Tools" />
          <SimpleGrid spacing="md" cols={{ base: 1, xs: 2, sm: 3, lg: 4 }}>
            {Object.values(characterApps).map((app) => (
              <AppCard app={app} key={app.name} />
            ))}
          </SimpleGrid>
        </section>

        <section>
          <SectionHeader title="Universe" />
          <SimpleGrid spacing="md" cols={{ base: 1, xs: 2, sm: 3, lg: 4 }}>
            {Object.values(universeApps).map((app) => (
              <AppCard app={app} key={app.name} />
            ))}
          </SimpleGrid>
        </section>
      </Stack>
    </Container>
  );
}
