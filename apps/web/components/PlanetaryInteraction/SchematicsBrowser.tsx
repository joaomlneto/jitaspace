"use client";

import { memo, useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Chip,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";

import type { PiCatalog } from "./catalog";
import type { SchematicEntry } from "./schematics";
import { TIER_NAMES, tierLabel } from "./catalog";
import { formatNumber, TypeCell } from "./cells";
import {
  formatCycleTime,
  schematicAnchorId,
  schematicEntries,
  schematicMatches,
} from "./schematics";

const TIERS = [1, 2, 3, 4];

const SchematicCard = memo(
  ({
    schematic,
    catalog,
  }: Readonly<{ schematic: SchematicEntry; catalog: PiCatalog }>) => (
    <Paper
      withBorder
      p="md"
      radius="md"
      component="article"
      id={schematicAnchorId(schematic.schematicId)}
      aria-labelledby={`${schematicAnchorId(schematic.schematicId)}-title`}
      style={{ scrollMarginTop: "var(--app-shell-header-height, 60px)" }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Title
            order={3}
            size="h5"
            id={`${schematicAnchorId(schematic.schematicId)}-title`}
          >
            {schematic.name}
          </Title>
          <Badge variant="light" color="gray">
            {tierLabel(schematic.tier)}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          {formatCycleTime(schematic.cycleTime)} per run
          {schematic.outputPerHour > 0 &&
            ` · ${formatNumber(schematic.outputPerHour)} units per hour`}
        </Text>

        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
          Inputs
        </Text>
        <Stack gap={4} component="ul" m={0} p={0} style={{ listStyle: "none" }}>
          {schematic.inputs.map((input) => (
            <Group
              key={input.typeId}
              justify="space-between"
              wrap="nowrap"
              component="li"
            >
              <TypeCell typeId={input.typeId} catalog={catalog} withTier />
              <Text size="sm">× {formatNumber(input.quantity)}</Text>
            </Group>
          ))}
        </Stack>

        {schematic.output && (
          <>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              Output
            </Text>
            <Group justify="space-between" wrap="nowrap">
              <TypeCell typeId={schematic.output.typeId} catalog={catalog} />
              <Text size="sm">× {formatNumber(schematic.output.quantity)}</Text>
            </Group>
          </>
        )}

        {schematic.usedBy.length > 0 && (
          <Text size="xs" c="dimmed">
            Used in{" "}
            {schematic.usedBy.map((consumer, index) => (
              <span key={consumer.schematicId}>
                {index > 0 && ", "}
                <Anchor
                  href={`#${schematicAnchorId(consumer.schematicId)}`}
                  size="xs"
                >
                  {consumer.name}
                </Anchor>
              </span>
            ))}
          </Text>
        )}
      </Stack>
    </Paper>
  ),
);
SchematicCard.displayName = "SchematicCard";

/**
 * Every schematic, grouped by the tier of what it makes, with a search box and
 * tier filter kept in the URL.
 */
export const SchematicsBrowser = memo(
  ({ catalog }: Readonly<{ catalog: PiCatalog }>) => {
    const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
    // The box filters as you type; the URL follows once typing pauses, so a
    // keystroke never waits on a history update.
    const [text, setText] = useState(query);
    // The URL value the box last agreed with. When the URL changes on its own
    // (it is only read after hydration, and back/forward change it too), the
    // box follows; when the change is our own write, there is nothing to do.
    const [syncedQuery, setSyncedQuery] = useState(query);
    if (query !== syncedQuery) {
      setSyncedQuery(query);
      setText(query);
    }
    const writeQuery = useDebouncedCallback((value: string) => {
      setSyncedQuery(value);
      void setQuery(value || null);
    }, 300);
    const [tiers, setTiers] = useQueryState(
      "tier",
      parseAsArrayOf(parseAsInteger),
    );

    const entries = useMemo(() => schematicEntries(catalog), [catalog]);
    // Tiers a hand-edited URL names that do not exist are dropped (nuqs drops
    // ones it cannot parse), and a list left with none means no filter. The
    // chips never write an empty list: the last one checked stays checked.
    const activeTiers = useMemo(() => {
      const known = (tiers ?? TIERS).filter((tier) => TIERS.includes(tier));
      return new Set(known.length === 0 ? TIERS : known);
    }, [tiers]);
    const shown = useMemo(
      () =>
        entries.filter(
          (entry) =>
            entry.tier !== null &&
            activeTiers.has(entry.tier) &&
            schematicMatches(entry, catalog, text),
        ),
      [entries, activeTiers, catalog, text],
    );

    if (entries.length === 0) {
      return (
        <Text c="dimmed">
          Schematics are not available right now. Please try again later.
        </Text>
      );
    }

    return (
      <Stack>
        <Group align="flex-end">
          <TextInput
            label="Search"
            placeholder="Schematic or commodity"
            leftSection={<IconSearch size={16} aria-hidden />}
            value={text}
            onChange={(event) => {
              setText(event.currentTarget.value);
              writeQuery(event.currentTarget.value);
            }}
            w={{ base: "100%", sm: 280 }}
          />
          <Chip.Group
            multiple
            value={[...activeTiers].map(String)}
            onChange={(value) => {
              const next = value.map(Number).sort((a, b) => a - b);
              // Showing no tier at all would show nothing, so unchecking the
              // last one is ignored.
              if (next.length === 0) return;
              // Every tier is the default, so it is left out of the URL.
              void setTiers(next.length === TIERS.length ? null : next);
            }}
          >
            <Group gap="xs" role="group" aria-label="Tiers">
              {TIERS.map((tier) => (
                <Chip key={tier} value={String(tier)} size="sm" variant="light">
                  {tierLabel(tier)}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>

        <Text size="sm" c="dimmed" aria-live="polite">
          {shown.length === entries.length
            ? `${entries.length} schematics`
            : `${shown.length} of ${entries.length} schematics`}
        </Text>

        {TIERS.filter((tier) => activeTiers.has(tier)).map((tier) => {
          const ofTier = shown.filter((entry) => entry.tier === tier);
          if (ofTier.length === 0) return null;
          return (
            <Stack key={tier} gap="sm" component="section">
              <Title order={2} size="h3">
                {tierLabel(tier)} · {TIER_NAMES[tier]}
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {ofTier.map((entry) => (
                  <SchematicCard
                    key={entry.schematicId}
                    schematic={entry}
                    catalog={catalog}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          );
        })}

        {shown.length === 0 && (
          <Text c="dimmed">No schematic matches your search.</Text>
        )}
      </Stack>
    );
  },
);
SchematicsBrowser.displayName = "SchematicsBrowser";
