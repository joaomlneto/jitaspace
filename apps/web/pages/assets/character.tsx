import React, { useMemo, type ReactElement } from "react";
import {
  Badge,
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { usePagination } from "@mantine/hooks";

import {
  useCharacterAssets,
  useEsiNamesCache,
  useMarketPrices,
} from "@jitaspace/esi-client";
import { AssetsIcon } from "@jitaspace/eve-icons";
import {
  AssetLocationSelect,
  EveEntityAnchor,
  EveEntityName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { assets, isLoading } = useCharacterAssets();
  const filterForm = useForm<{ location_id: number | null; name: string }>({
    initialValues: {
      location_id: null,
      name: "",
    },
  });
  const cache = useEsiNamesCache();
  const { data: marketPrices } = useMarketPrices();

  const getNameFromCache = (id: number) => cache[id]?.value?.name;

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
        )
        .sort((a, b) => (b.price ?? 0) - (a.price ?? 0)),
    [
      assets,
      filterForm.values.location_id,
      filterForm.values.name,
      getNameFromCache,
    ],
  );

  const totalPrice = useMemo(
    () => entries.reduce((acc, { price }) => (price ? acc + price : acc), 0),
    [entries],
  );

  const numUndefinedNames = entries.filter(
    (entry) => entry.typeName === undefined,
  ).length;

  // pagination
  const ENTRIES_PER_PAGE = 100;
  const numPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const pagination = usePagination({ total: numPages, siblings: 3 });
  const offset = ENTRIES_PER_PAGE * (pagination.active - 1);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AssetsIcon width={48} />
          <Title order={1}>Assets</Title>
          {isLoading && <Loader />}
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
          Total value: {totalPrice.toLocaleString()} ISK
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
        <Table highlightOnHover>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Qty</th>
              <th>Type</th>
              <th>Price</th>
              {filterForm.values.location_id === null && <th>Location</th>}
            </tr>
          </thead>
          <tbody>
            {entries.slice(offset, offset + ENTRIES_PER_PAGE).map((asset) => (
              <tr key={asset.item_id}>
                <td>
                  <Text size="xs" color="dimmed">
                    {asset.item_id}
                  </Text>
                </td>
                <td align="right">{asset.quantity}</td>
                <td>
                  <Group spacing="xs" position="apart">
                    <Group noWrap spacing="xs">
                      <TypeAvatar size="xs" typeId={asset.type_id} />
                      <TypeAnchor typeId={asset.type_id}>
                        <TypeName typeId={asset.type_id} />
                      </TypeAnchor>
                    </Group>
                    <Group spacing="xs" position="right">
                      {asset.is_singleton && <Badge size="xs">assembled</Badge>}
                      {asset.is_blueprint_copy && <Badge size="xs">BPC</Badge>}
                    </Group>
                  </Group>
                </td>
                <td>
                  {asset.price && (
                    <Text align="right">
                      {asset.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ISK
                    </Text>
                  )}
                </td>
                {filterForm.values.location_id === null && (
                  <td>
                    <Group spacing="xs">
                      <EveEntityAnchor entityId={asset.location_id}>
                        <EveEntityName entityId={asset.location_id} />
                      </EveEntityAnchor>
                    </Group>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = ["esi-assets.read_assets.v1"];
