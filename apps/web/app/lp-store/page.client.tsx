"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  CloseButton,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import posthog from "posthog-js";

import { LPStoreIcon } from "@jitaspace/eve-icons";
import {
  useCharacterLoyaltyPoints,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { CorporationAvatar, FactionAvatar } from "@jitaspace/ui";

import type { LPStoreGroup } from "./groups";
import { lpStorePath } from "~/lib/lpStorePath";
import { filterLPStoreGroups } from "./groups";

export interface LPStorePageProps {
  /** Corporations grouped by faction, in display order. */
  groups: LPStoreGroup[];
}

export default function LPStorePage({ groups }: Readonly<LPStorePageProps>) {
  const theme = useMantineTheme();
  const character = useSelectedCharacter();
  const { hasToken, loyaltyPointsMap, isLoading } = useCharacterLoyaltyPoints(
    character?.characterId ?? 0,
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const visibleGroups = useMemo(
    () => filterLPStoreGroups(groups, deferredQuery),
    [groups, deferredQuery],
  );

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        <Title order={3}>
          Select a corporation below or{" "}
          <Anchor inherit component={Link} href="/lp-store/all">
            show all offers
          </Anchor>
        </Title>
        <TextInput
          aria-label="Filter corporations and factions"
          placeholder="Filter by corporation or faction name"
          leftSection={<IconSearch size={16} />}
          rightSection={
            query !== "" && (
              <CloseButton
                aria-label="Clear filter"
                onClick={() => setQuery("")}
              />
            )
          }
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {visibleGroups.length === 0 && deferredQuery.trim() !== "" && (
          <Text c="dimmed">
            No corporations or factions match &ldquo;{deferredQuery.trim()}
            &rdquo;.
          </Text>
        )}
        {visibleGroups.map((group) => (
          <Stack
            component="section"
            gap="sm"
            key={group.faction?.factionId ?? "other"}
          >
            <Group gap="sm">
              {group.faction ? (
                <>
                  <FactionAvatar
                    factionId={group.faction.factionId}
                    size="md"
                  />
                  <Title order={4}>
                    <Anchor
                      inherit
                      component={Link}
                      href={`/faction/${group.faction.factionId}`}
                    >
                      {group.faction.name}
                    </Anchor>
                  </Title>
                </>
              ) : (
                <Title order={4}>Other corporations</Title>
              )}
              <Badge variant="light" color="gray">
                {group.corporations.length}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
              {group.corporations.map((corporation) => {
                const loyaltyPoints =
                  loyaltyPointsMap[corporation.corporationId] ?? 0;
                return (
                  <Anchor
                    component={Link}
                    href={lpStorePath(corporation.name)}
                    key={corporation.corporationId}
                    onClick={() =>
                      posthog.capture("lp_store_corporation_selected", {
                        corporation_id: corporation.corporationId,
                        corporation_name: corporation.name,
                      })
                    }
                  >
                    <Group wrap="nowrap">
                      <CorporationAvatar
                        corporationId={corporation.corporationId}
                        size="sm"
                      />
                      <Stack gap={0}>
                        <Text>{corporation.name}</Text>
                        {hasToken &&
                          (isLoading ? (
                            <Skeleton height={12} mt={4} width={70} />
                          ) : (
                            <Text
                              c={
                                loyaltyPoints > 0
                                  ? theme.primaryColor
                                  : "dimmed"
                              }
                              fw={loyaltyPoints > 0 ? 600 : undefined}
                              size="xs"
                            >
                              {loyaltyPoints.toLocaleString()} LP
                            </Text>
                          ))}
                      </Stack>
                    </Group>
                  </Anchor>
                );
              })}
            </SimpleGrid>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
