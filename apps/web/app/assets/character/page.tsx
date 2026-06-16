"use client";

import { useCallback, useMemo } from "react";
import {
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { usePagination } from "@mantine/hooks";

import { AssetLocationSelect } from "@jitaspace/eve-components";
import { AssetsIcon } from "@jitaspace/eve-icons";
import {
  useCharacterAssets,
  useEsiNameLookup,
  useMarketPrices,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { ISKAmount } from "@jitaspace/ui";

import { AssetsDataTable } from "~/components/Assets/AssetsDataTable";
import { ScopeGuard } from "~/components/ScopeGuard";

export default function Page() {
  const character = useSelectedCharacter();
  const { assets, isLoading } = useCharacterAssets(character?.characterId);
  const filterForm = useForm<{ location_id: number | null; name: string }>({
    initialValues: {
      location_id: null,
      name: "",
    },
  });
  const { data: marketPrices } = useMarketPrices();

  const assetEntries = useMemo(
    () =>
      Object.values(assets).map((asset) => ({
        id: asset.type_id,
        category: "inventory_type" as const,
      })),
    [assets],
  );
  const names = useEsiNameLookup(assetEntries);

  const getNameFromCache = useCallback(
    (id: number) => names[id.toString()]?.value?.name,
    [names],
  );

  const filtersEnabled =
    filterForm.values.location_id !== null || filterForm.values.name !== "";

  const entries = useMemo(
    () =>
      Object.values(assets)
        .filter((asset) => asset.location_type !== "item")
        .filter(
          (asset) =>
            filterForm.values.location_id === null ||
            asset.location_id === filterForm.values.location_id,
        )
        .map((asset) => {
          const adjustedPrice = marketPrices[asset.type_id]?.adjusted_price;
          return {
            typeName: getNameFromCache(asset.type_id),
            price: adjustedPrice ? adjustedPrice * asset.quantity : undefined,
            ...asset,
          };
        })
        .filter(
          (asset) =>
            filterForm.values.name === "" ||
            asset.typeName
              ?.toLowerCase()
              .includes(filterForm.values.name.toLowerCase()),
        )
        .sort((a, b) =>
          (a.typeName ?? "").trim().localeCompare((b.typeName ?? "").trim()),
        ),
    [
      assets,
      filterForm.values.location_id,
      filterForm.values.name,
      getNameFromCache,
      marketPrices,
    ],
  );

  const totalPrice = useMemo(
    () => entries.reduce((acc, { price }) => (price ? acc + price : acc), 0),
    [entries],
  );

  const numUndefinedNames = useMemo(
    () => entries.filter((entry) => entry.typeName === undefined).length,
    [entries],
  );

  // pagination
  const ENTRIES_PER_PAGE = 100;
  const numPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const pagination = usePagination({ total: numPages, siblings: 3 });
  const offset = ENTRIES_PER_PAGE * (pagination.active - 1);

  return (
    <ScopeGuard requiredScopes={["esi-assets.read_assets.v1"]}>
      <Container size="xl">
        <Stack>
          <Group>
            <AssetsIcon width={48} />
            <Title order={1}>Assets</Title>
            {(isLoading || numUndefinedNames > 0) && <Loader />}
          </Group>
          <Group align="end">
            <AssetLocationSelect
              size="xs"
              label="Filter by location"
              value={filterForm.values.location_id?.toString()}
              onChange={(value) => {
                filterForm.setFieldValue(
                  "location_id",
                  value ? Number.parseInt(value, 10) : null,
                );
              }}
            />
            <TextInput
              label="Filter by name"
              size="xs"
              {...filterForm.getInputProps("name")}
            />
          </Group>
          <Text size="sm" c="dimmed">
            {filtersEnabled
              ? `Showing ${entries.length}/${Object.keys(assets).length} assets`
              : `${Object.keys(assets).length} assets`}
          </Text>
          <Text size="sm" c="dimmed">
            Total value: <ISKAmount span amount={totalPrice} />
          </Text>
          {numUndefinedNames > 0 && (
            <Text c="red" size="sm">
              Resolving names for {numUndefinedNames} items…
            </Text>
          )}
          <Center>
            <Pagination
              total={numPages}
              value={pagination.active}
              onChange={pagination.setPage}
            />
          </Center>
          <AssetsDataTable
            entries={entries.slice(offset, offset + ENTRIES_PER_PAGE)}
          />
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
