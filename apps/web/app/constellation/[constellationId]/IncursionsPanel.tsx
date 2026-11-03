"use client";

import { Anchor, SimpleGrid, Stack, Text } from "@mantine/core";

import { IncursionsIcon } from "@jitaspace/eve-icons";

import type { ConstellationIncursions } from "./types";
import type {
  SystemsById,
  UniverseSystem,
} from "~/components/UniversePage/types";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import { HoverPrefetchLink } from "~/components/Link";
import {
  ActiveIncursionCard,
  activeIncursions,
  IncursionHistory,
  SystemLink,
} from "~/components/UniversePage";

const ROLES = [
  { role: "vanguard", label: "Vanguard" },
  { role: "assault", label: "Assault" },
  { role: "headquarters", label: "Headquarters" },
] as const;

/** Whether the tab has anything to show. */
export const hasIncursionData = (
  systems: readonly UniverseSystem[],
  incursions: ConstellationIncursions,
) =>
  incursions.incursions.length > 0 ||
  systems.some((system) => system.siteRole !== null);

/** The constellation's incursions: the one running now, its layout, and every past one. */
export function IncursionsPanel({
  systems,
  systemsById,
  incursions,
  staging,
}: Readonly<{
  systems: readonly UniverseSystem[];
  systemsById: SystemsById;
  incursions: ConstellationIncursions;
  /** The staging system the latest incursion that recorded one used. */
  staging: number | null;
}>) {
  const isMapped = systems.some((system) => system.siteRole !== null);

  return (
    <Stack gap="lg">
      {activeIncursions(incursions).map((incursion) => (
        <ActiveIncursionCard
          key={incursion.incursionId}
          incursion={incursion}
        />
      ))}

      <Stack gap="sm">
        <SectionHeading icon={<IncursionsIcon size={18} alt="" />}>
          Site layout
        </SectionHeading>
        {isMapped ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            <StatCard
              label="Staging"
              value={
                staging === null ? (
                  <Text span c="dimmed">
                    Not recorded
                  </Text>
                ) : (
                  <SystemLink solarSystemId={staging} systems={systemsById} />
                )
              }
            />
            {ROLES.map(({ role, label }) => {
              const ids = systems
                .filter((system) => system.siteRole === role)
                .map((system) => system.solarSystemId);
              return (
                <StatCard
                  key={role}
                  label={`${label} (${ids.length})`}
                  value={
                    ids.length === 0 ? (
                      <Text span c="dimmed">
                        None
                      </Text>
                    ) : (
                      <Stack gap={4}>
                        {ids.map((id) => (
                          <SystemLink
                            key={id}
                            solarSystemId={id}
                            systems={systemsById}
                          />
                        ))}
                      </Stack>
                    )
                  }
                />
              );
            })}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            Where this constellation&apos;s sites spawn has not been mapped.
          </Text>
        )}
        <Text size="xs" c="dimmed">
          CCP does not publish where each site spawns; see the{" "}
          <Anchor
            component={HoverPrefetchLink}
            href="/incursions#layouts"
            size="xs"
          >
            layouts of every constellation
          </Anchor>{" "}
          and where they come from.
        </Text>
      </Stack>

      <IncursionHistory incursions={incursions} systemsById={systemsById} />
    </Stack>
  );
}
