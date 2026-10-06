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
import { CorporationAvatar, FactionAvatar } from "@jitaspace/ui";

import type { LPStoreGroup } from "./groups";
// The modules themselves, not the `~/components/LPStore` barrel, which would
// pull the offers table and its data-table engines into this page.
import { useLoyaltyPointsResource } from "~/components/LPStore/characterResources";
import {
  personalFilter,
  useStoredToggle,
} from "~/components/LPStore/personalFilter";
import { PersonalFilterSwitch } from "~/components/LPStore/PersonalFilterSwitch";
import { lpStorePath } from "~/lib/lpStorePath";
import { filterLPStoreGroups } from "./groups";

/** Where the "only corporations I have LP with" toggle is remembered. */
const ONLY_WITH_LP_STORAGE_KEY = "jitaspace/lp-store-only-with-lp";

/** No balances to show: a stable empty map. */
const NO_BALANCES: Readonly<Record<number, number>> = {};

export interface LPStorePageProps {
  /** Corporations grouped by faction, in display order. */
  groups: LPStoreGroup[];
}

export default function LPStorePage({ groups }: Readonly<LPStorePageProps>) {
  const theme = useMantineTheme();
  // Always fetched: the page shows every balance, filter on or off.
  const loyaltyPoints = useLoyaltyPointsResource(true);
  const loyaltyPointsMap =
    loyaltyPoints.status === "ready" ? loyaltyPoints.value : NO_BALANCES;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [onlyWithLp, setOnlyWithLp] = useStoredToggle(ONLY_WITH_LP_STORAGE_KEY);
  const lpFilter = personalFilter(onlyWithLp, setOnlyWithLp, loyaltyPoints);
  const lpFilterActive = lpFilter.value !== undefined;
  // With the toggle on, hold the list while the balances load rather than
  // showing every corporation only to remove most of them a moment later.
  const awaitingBalances = lpFilter.awaiting;
  const corporationIdsWithLp = useMemo(
    () =>
      lpFilter.value === undefined
        ? undefined
        : new Set(
            Object.entries(lpFilter.value)
              .filter(([, balance]) => balance > 0)
              .map(([corporationId]) => Number(corporationId)),
          ),
    [lpFilter.value],
  );
  const visibleGroups = useMemo(
    () =>
      filterLPStoreGroups(
        groups,
        deferredQuery,
        corporationIdsWithLp
          ? { onlyCorporationIds: corporationIdsWithLp }
          : {},
      ),
    [groups, deferredQuery, corporationIdsWithLp],
  );
  const trimmedQuery = deferredQuery.trim();

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
        <Group align="center" gap="md">
          <TextInput
            style={{ flex: 1, minWidth: 220 }}
            aria-label="Filter corporations and factions"
            placeholder="Filter by corporation or faction name"
            leftSection={<IconSearch size={16} />}
            // Mantine makes input sections ignore the pointer by default, which
            // would let a click on the clear button fall through to the input.
            rightSectionPointerEvents="all"
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
          <PersonalFilterSwitch
            label="Only corporations I have LP with"
            {...lpFilter.switchProps}
          />
        </Group>
        {!awaitingBalances &&
          visibleGroups.length === 0 &&
          trimmedQuery !== "" && (
            <Text c="dimmed">
              {lpFilterActive
                ? "No corporations or factions you have LP with match"
                : "No corporations or factions match"}{" "}
              &ldquo;{trimmedQuery}&rdquo;.
            </Text>
          )}
        {visibleGroups.length === 0 &&
          trimmedQuery === "" &&
          lpFilterActive &&
          groups.length > 0 && (
            <Text c="dimmed">
              You have no loyalty points with any of these corporations yet.
            </Text>
          )}
        {awaitingBalances && (
          <Stack
            gap="sm"
            role="status"
            aria-busy="true"
            aria-label="Loading your loyalty points"
          >
            <Skeleton height={28} width={220} />
            <Skeleton height={36} />
            <Skeleton height={36} />
          </Stack>
        )}
        {!awaitingBalances &&
          visibleGroups.map((group) => (
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
                  const balance =
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
                          {loyaltyPoints.status === "loading" && (
                            <Skeleton height={12} mt={4} width={70} />
                          )}
                          {loyaltyPoints.status === "ready" && (
                            <Text
                              c={balance > 0 ? theme.primaryColor : "dimmed"}
                              fw={balance > 0 ? 600 : undefined}
                              size="xs"
                            >
                              {balance.toLocaleString()} LP
                            </Text>
                          )}
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
