import React, { useMemo, type ReactElement } from "react";
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

import { useCorporationAssets, useEsiNamesCache } from "@jitaspace/esi-client";
import { AssetsIcon, AttentionIcon } from "@jitaspace/eve-icons";
import {
  EveEntityAnchor,
  EveEntityName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { assets, locations, isLoading, errorMessage } = useCorporationAssets();
  const filterForm = useForm<{ location_id: number | null; name: string }>({
    initialValues: {
      location_id: null,
      name: "",
    },
  });
  const cache = useEsiNamesCache();

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
        .map((asset) => ({
          typeName: getNameFromCache(asset.type_id),
          ...asset,
        }))
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
    ],
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
        {errorMessage && (
          <Alert icon={<AttentionIcon width={32} />} title="Error!" color="red">
            {errorMessage}
          </Alert>
        )}
        {!errorMessage && (
          <>
            <Text size="sm" color="dimmed">
              {filtersEnabled
                ? `Showing ${entries.length}/${
                    (Object.keys(assets) ?? []).length
                  } assets`
                : `${(Object.keys(assets) ?? []).length} assets`}
            </Text>
            {numUndefinedNames > 0 && (
              <Text color="red" size="sm">
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
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Qty</th>
                  <th>Type</th>
                  {filterForm.values.location_id === null && <th>Location</th>}
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice(offset, offset + ENTRIES_PER_PAGE)
                  .map((asset) => (
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
                            {asset.is_singleton && (
                              <Badge size="xs">assembled</Badge>
                            )}
                            {asset.is_blueprint_copy && (
                              <Badge size="xs">BPC</Badge>
                            )}
                          </Group>
                        </Group>
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
          </>
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-assets.read_assets.v1",
  "esi-characters.read_corporation_roles.v1",
];