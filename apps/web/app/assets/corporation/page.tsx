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
  //
  // `subjectIds` is the list of corporations that were actually queried, which
  // is what every permission claim below has to be made against. Deriving it
  // from the returned rows instead would fold three different situations — no
  // Director anywhere, a corporation that owns nothing, and a query that failed
  // — into the same empty list, and answer all three with "you need Director".
  const {
    data: allAssets,
    isPending,
    errors,
    subjectIds: corporationIds,
  } = useMultipleCorporationAssets();
  const [pickedCorporationId, setPickedCorporationId] = useState<string | null>(
    null,
  );
  const { data: marketPrices } = useMarketPrices();

  // A pick is only honoured while the corporation it names is still readable.
  // Losing a token mid-session would otherwise leave the filter applied to a
  // corporation that is no longer offered, hiding every remaining asset.
  const selectedCorporationId =
    pickedCorporationId !== null &&
    corporationIds.includes(Number.parseInt(pickedCorporationId, 10))
      ? pickedCorporationId
      : null;

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

  const entries = useMemo(
    () =>
      Object.values(assets)
        .filter((asset) => asset.location_type !== "item")
        .map((asset) => {
          const adjustedPrice = marketPrices[asset.type_id]?.adjusted_price;
          return {
            typeName: getNameFromCache(asset.type_id),
            price: adjustedPrice ? adjustedPrice * asset.quantity : undefined,
            ...asset,
          };
        })
        .sort((a, b) =>
          (a.typeName ?? "").trim().localeCompare((b.typeName ?? "").trim()),
        ),
    [assets, getNameFromCache, marketPrices],
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
  // usePagination clamps inside setPage but never re-derives `active` when
  // `total` shrinks, so narrowing to a smaller corporation would leave the
  // index past the end and slice an empty window out of a non-empty table.
  const activePage = Math.min(pagination.active, Math.max(numPages, 1));
  const offset = ENTRIES_PER_PAGE * (activePage - 1);

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
                onChange={setPickedCorporationId}
              />
            )}
          </Group>
          {errors.length > 0 && (
            <Alert
              icon={<AttentionIcon width={32} />}
              title="Some assets could not be loaded"
              color="red"
            >
              Could not read assets for {errors.length}{" "}
              {errors.length === 1 ? "corporation" : "corporations"}.
            </Alert>
          )}
          {corporationIds.length === 0 && !isPending && (
            // Not an error, and not a failure: no corporation was queried at
            // all. Two things produce that, and the message names both, because
            // only one of them is something the player can act on here.
            <Alert icon={<AttentionIcon width={32} />} color="gray">
              None of your characters can read corporation assets. This needs
              the Director role in the corporation, and the permission to read
              corporation roles — sign in again to grant it.
            </Alert>
          )}
          {corporationIds.length > 0 && (
            <>
              <Text size="sm" c="dimmed">
                {`${Object.keys(assets).length} assets`}
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
                  value={activePage}
                  onChange={pagination.setPage}
                />
              </Center>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <th>Item ID</th>
                    <th>Qty</th>
                    <th>Type</th>
                    <th>Location</th>
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
                        <Table.Td>
                          <Group gap="xs">
                            <EveEntityAnchor entityId={asset.location_id}>
                              <EveEntityName entityId={asset.location_id} />
                            </EveEntityAnchor>
                          </Group>
                        </Table.Td>
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
