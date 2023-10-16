import React, {
  useCallback,
  useEffect,
  useMemo,
  type ReactElement,
} from "react";
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
import { useForceUpdate, usePagination, useTimeout } from "@mantine/hooks";

import { AssetsIcon } from "@jitaspace/eve-icons";
import {
  useCharacterAssets,
  useEsiNamePrefetch,
  useEsiNamesCache,
  useMarketPrices,
} from "@jitaspace/hooks";
import { AssetLocationSelect, ISKAmount } from "@jitaspace/ui";

import { AssetsTable } from "~/components/Assets";
import { MainLayout } from "~/layouts";

export default function Page() {
  const forceUpdate = useForceUpdate();
  const { assets, isLoading } = useCharacterAssets();
  const filterForm = useForm<{ location_id: number | null; name: string }>({
    initialValues: {
      location_id: null,
      name: "",
    },
  });
  const cache = useEsiNamesCache();
  const { data: marketPrices } = useMarketPrices();

  const getNameFromCache = useCallback(
    (id: number) => cache[id]?.value?.name,
    [cache],
  );

  useEsiNamePrefetch(
    Object.values(assets ?? {}).map((asset) => ({
      id: asset.type_id,
      category: "inventory_type",
    })),
  );

  const filtersEnabled =
    filterForm.values.location_id !== null || filterForm.values.name !== "";

  const entries = useMemo(
    () =>
      Object.values(assets ?? {})
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

  // reload if some asset names are still missing
  const { start } = useTimeout(() => forceUpdate(), 1000);

  useEffect(() => {
    if (numUndefinedNames > 0) start();
  });

  return (
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
                value ? parseInt(value) : null,
              );
            }}
          />
          <TextInput
            label="Filter by name"
            size="xs"
            {...filterForm.getInputProps("name")}
          />
        </Group>
        <Text size="sm" color="dimmed">
          {filtersEnabled
            ? `Showing ${entries.length}/${
                (Object.keys(assets) ?? []).length
              } assets`
            : `${(Object.keys(assets) ?? []).length} assets`}
        </Text>
        <Text size="sm" color="dimmed">
          Total value: <ISKAmount span amount={totalPrice} />
        </Text>
        {numUndefinedNames > 0 && (
          <Text color="red" size="sm">
            Failed to resolve names for {numUndefinedNames} items! This causes
            the ordering of items to be wrong.
            <br />
            Keep changing between pages 1 and 2 and it should resolve itself...
            This is an annoying bug, sorry about that!
          </Text>
        )}
        <Center>
          <Pagination
            total={numPages}
            value={pagination.active}
            onChange={pagination.setPage}
          />
        </Center>
        <AssetsTable
          assets={entries.slice(offset, offset + ENTRIES_PER_PAGE)}
        />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = ["esi-assets.read_assets.v1"];
