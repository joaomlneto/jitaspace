"use client";

import type { ReactNode } from "react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

import { EveEntitySelect } from "@jitaspace/eve-components";
import { AssetsIcon } from "@jitaspace/eve-icons";
import {
  useEsiNameLookup,
  useMarketPrices,
  useMultipleCharacterAssets,
} from "@jitaspace/hooks";
import { ISKAmount } from "@jitaspace/ui";

import { AssetSearchResults } from "~/components/Assets/AssetSearchResults";
import { buildAssetTree } from "~/components/Assets/assetTree";
import { CharacterAssetsTree } from "~/components/Assets/AssetTreeView";
import { ScopeGuard } from "~/components/ScopeGuard";

function Stat({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      {value}
    </Stack>
  );
}

export default function Page() {
  // Every logged-in character that granted the assets scope, not just the
  // selected one. Each asset carries its owner as `subjectId`.
  const { data: allAssets, isPending, errors } = useMultipleCharacterAssets();
  const { data: marketPrices } = useMarketPrices();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isSearching = deferredQuery.trim().length > 0;

  const characterIds = useMemo(
    () => [...new Set(allAssets.map((asset) => asset.subjectId))],
    [allAssets],
  );

  // buildAssetTree keys on item_id and roots on location_id, and EVE item ids
  // are globally unique — so merging several characters is safe, and a station
  // holding two characters' items becomes one location rather than two.
  const assets = useMemo(() => {
    const owned =
      selectedCharacterId === null
        ? allAssets
        : allAssets.filter(
            (asset) =>
              asset.subjectId === Number.parseInt(selectedCharacterId, 10),
          );
    return Object.fromEntries(owned.map((asset) => [asset.item_id, asset]));
  }, [allAssets, selectedCharacterId]);

  // Resolve every distinct type name once, in a single batched lookup.
  const typeIds = useMemo(
    () => [...new Set(Object.values(assets).map((asset) => asset.type_id))],
    [assets],
  );
  const nameEntries = useMemo(
    () => typeIds.map((id) => ({ id, category: "inventory_type" as const })),
    [typeIds],
  );
  const names = useEsiNameLookup(nameEntries);
  const getTypeName = useCallback(
    (typeId: number) => names[typeId.toString()]?.value?.name,
    [names],
  );

  const tree = useMemo(
    () => buildAssetTree(assets, marketPrices),
    [assets, marketPrices],
  );

  const unresolvedNames = useMemo(
    () => typeIds.filter((id) => getTypeName(id) === undefined).length,
    [typeIds, getTypeName],
  );

  const isEmpty = tree.totalStacks === 0;

  return (
    <ScopeGuard requiredScopes={["esi-assets.read_assets.v1"]}>
      <Container size="lg">
        <Stack gap="lg">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              <AssetsIcon width={48} />
              <Title order={1}>Assets</Title>
              {(isPending || unresolvedNames > 0) && <Loader size="sm" />}
            </Group>
            <EveEntitySelect
              size="xs"
              label="Filter by character"
              entityIds={characterIds.map((id) => ({ id }))}
              searchable
              allowDeselect
              clearable
              value={selectedCharacterId}
              onChange={setSelectedCharacterId}
            />
          </Group>

          {errors.length > 0 && (
            // A failed token drops that character's assets from a total that
            // claims to cover everyone, so the absence has to be visible.
            <Text c="dimmed" size="sm">
              Could not load assets for {errors.length}{" "}
              {errors.length === 1 ? "character" : "characters"}.
            </Text>
          )}

          <Paper withBorder radius="md" p="md">
            <SimpleGrid cols={3} spacing="md">
              <Stat
                label="Value"
                value={
                  <ISKAmount amount={tree.totalValue} fw={700} size="lg" />
                }
              />
              <Stat
                label="Items"
                value={
                  <Text fw={700} size="lg">
                    {tree.totalStacks.toLocaleString()}
                  </Text>
                }
              />
              <Stat
                label="Locations"
                value={
                  <Text fw={700} size="lg">
                    {tree.locations.length.toLocaleString()}
                  </Text>
                }
              />
            </SimpleGrid>
          </Paper>

          <TextInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search items…"
            leftSection={<IconSearch size={16} />}
            rightSection={
              query ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
          />

          {isEmpty && isPending && (
            <Center mih={200}>
              <Group gap="xs">
                <Loader size="sm" />
                <Text c="dimmed">Loading your assets…</Text>
              </Group>
            </Center>
          )}

          {isEmpty && !isPending && (
            <Center mih={200}>
              <Stack align="center" gap={4}>
                <AssetsIcon width={40} />
                {/* The filter only offers characters that own assets, so a
                    filtered view is never empty — this is always the
                    nothing-anywhere case. */}
                <Text c="dimmed">
                  No assets found for any of your characters.
                </Text>
              </Stack>
            </Center>
          )}

          {!isEmpty && isSearching && (
            <AssetSearchResults
              query={deferredQuery}
              tree={tree}
              getTypeName={getTypeName}
            />
          )}

          {!isEmpty && !isSearching && (
            <Box>
              <Stack gap="sm">
                <CharacterAssetsTree tree={tree} getTypeName={getTypeName} />
              </Stack>
            </Box>
          )}
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
