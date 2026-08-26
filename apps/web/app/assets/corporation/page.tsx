"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { usePagination } from "@mantine/hooks";

import {
  EveEntityAnchor,
  EveEntityName,
  EveEntitySelect,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";
import { AssetsIcon, AttentionIcon } from "@jitaspace/eve-icons";
import {
  useEsiNameLookup,
  useMarketPrices,
  useMultipleCorporationAssets,
} from "@jitaspace/hooks";

import { ScopeGuard } from "~/components/ScopeGuard";

export default function Page() {
  // Every corporation a logged-in character can read assets for. A corporation
  // where nobody holds Director is simply not a subject, so it costs no request
  // and raises no error — previously that showed as "Token not available".
  const { data: allAssets, isPending, errors } = useMultipleCorporationAssets();
  const [selectedCorporationId, setSelectedCorporationId] = useState<
    string | null
  >(null);
  const filterForm = useForm<{ location_id: number | null; name: string }>({
    initialValues: {
      location_id: null,
      name: "",
    },
  });
  const { data: marketPrices } = useMarketPrices();

  const corporationIds = useMemo(
    () => [...new Set(allAssets.map((asset) => asset.subjectId))],
    [allAssets],
  );

  const assets = useMemo(() => {
    const owned =
      selectedCorporationId === null
        ? allAssets
        : allAssets.filter(
            (asset) =>
              asset.subjectId === Number.parseInt(selectedCorporationId, 10),
          );
    return Object.fromEntries(owned.map((asset) => [asset.item_id, asset]));
  }, [allAssets, selectedCorporationId]);

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

  const _totalPrice = useMemo(
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
    <ScopeGuard requiredScopes={["esi-assets.read_corporation_assets.v1"]}>
      <Container size="xl">
        <Stack>
          <Group justify="space-between" wrap="nowrap">
            <Group>
              <AssetsIcon width={48} />
              <Title order={1}>Corporation Assets</Title>
              {isPending && <Loader />}
            </Group>
            {/* Most players have characters in a single corporation, so the
                filter would be an empty choice — only offer it when it is a
                real one. */}
            {corporationIds.length > 1 && (
              <EveEntitySelect
                size="xs"
                label="Filter by corporation"
                entityIds={corporationIds.map((id) => ({ id }))}
                searchable
                allowDeselect
                clearable
                value={selectedCorporationId}
                onChange={setSelectedCorporationId}
              />
            )}
          </Group>
          {errors.length > 0 && (
            <Alert
              icon={<AttentionIcon width={32} />}
              title="Some assets could not be loaded"
              color="red"
            >
              {errors.length}{" "}
              {errors.length === 1 ? "corporation" : "corporations"} could not
              be read. The totals below cover the rest.
            </Alert>
          )}
          {corporationIds.length === 0 && !isPending && (
            // Not an error: reading corporation assets needs the Director role,
            // and most members do not have it.
            <Alert icon={<AttentionIcon width={32} />} color="gray">
              None of your characters can read corporation assets. This needs
              the Director role in the corporation.
            </Alert>
          )}
          {corporationIds.length > 0 && (
            <>
              <Text size="sm" c="dimmed">
                {filtersEnabled
                  ? `Showing ${entries.length}/${
                      Object.keys(assets).length
                    } assets`
                  : `${Object.keys(assets).length} assets`}
              </Text>
              {numUndefinedNames > 0 && (
                <Text c="red" size="sm">
                  Failed to resolve names for {numUndefinedNames} items! This
                  causes the ordering of items to be wrong.
                  <br />
                  Keep changing pages and it should resolve itself... This is a
                  bug, sorry about that!
                </Text>
              )}
              <Center>
                <Pagination
                  total={numPages}
                  value={pagination.active}
                  onChange={pagination.setPage}
                />
              </Center>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <th>Item ID</th>
                    <th>Qty</th>
                    <th>Type</th>
                    {filterForm.values.location_id === null && (
                      <th>Location</th>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entries
                    .slice(offset, offset + ENTRIES_PER_PAGE)
                    .map((asset) => (
                      <Table.Tr key={asset.item_id}>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {asset.item_id}
                          </Text>
                        </Table.Td>
                        <Table.Td align="right">{asset.quantity}</Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="space-between">
                            <Group wrap="nowrap" gap="xs">
                              <TypeAvatar size="xs" typeId={asset.type_id} />
                              <TypeAnchor typeId={asset.type_id}>
                                <TypeName typeId={asset.type_id} />
                              </TypeAnchor>
                            </Group>
                            <Group gap="xs" justify="flex-end">
                              {asset.is_singleton && (
                                <Badge size="xs">assembled</Badge>
                              )}
                              {asset.is_blueprint_copy && (
                                <Badge size="xs">BPC</Badge>
                              )}
                            </Group>
                          </Group>
                        </Table.Td>
                        {filterForm.values.location_id === null && (
                          <Table.Td>
                            <Group gap="xs">
                              <EveEntityAnchor entityId={asset.location_id}>
                                <EveEntityName entityId={asset.location_id} />
                              </EveEntityAnchor>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                </Table.Tbody>
              </Table>
            </>
          )}
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
