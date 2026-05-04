"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Spoiler,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useQueries } from "@tanstack/react-query";

import { useGetUniverseGroupsGroupId } from "@jitaspace/esi-client";
import {
  useFuzzworkTypeMarketStats,
  useMarketPrices,
  useSelectedCharacter,
  useType,
} from "@jitaspace/hooks";
import {
  getDogmaAttributeByIdQueryOptions,
  getDogmaAttributeCategoryByIdQueryOptions,
} from "@jitaspace/sde-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  CategoryAnchor,
  CategoryName,
  DogmaAttributeAnchor,
  DogmaAttributeName,
  DogmaEffectAnchor,
  DogmaEffectName,
  GroupAnchor,
  GroupName,
  ISKAmount,
  MarketGroupAnchor,
  MarketGroupName,
  OpenMarketWindowActionIcon,
  TypeAvatar,
  TypeInventoryBreadcrumbs,
  TypeMarketBreadcrumbs,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";

export interface PageProps {
  typeId: number;
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
}

const notAvailableText = "Not available";

const booleanBadge = (value: boolean | null | undefined) => (
  <Badge
    color={
      value === undefined || value === null ? "gray" : value ? "teal" : "red"
    }
    variant="light"
  >
    {value === undefined || value === null ? "Unknown" : value ? "Yes" : "No"}
  </Badge>
);

const formatNumber = (value: number | null | undefined) => {
  if (value === undefined || value === null) return notAvailableText;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatDogmaValue = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

function DetailsGrid({
  details,
}: {
  details: { label: string; value: ReactNode }[];
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {details.map((detail) => (
        <Paper key={detail.label} withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              {detail.label}
            </Text>
            <Text fw={500}>{detail.value}</Text>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

export default function TypePage({
  typeId,
  typeName,
  typeDescription,
}: PageProps) {
  const character = useSelectedCharacter();
  const { data: type } = useType(typeId);
  const { data: marketPrices } = useMarketPrices();
  const [regionId, _setRegionId] = useState(10000002);
  const { data: marketStats } = useFuzzworkTypeMarketStats(typeId, regionId);
  const typeData = type?.data;
  const marketPrice = marketPrices[typeId];
  const { data: group } = useGetUniverseGroupsGroupId(
    typeData?.group_id ?? 0,
    {},
    {
      query: { enabled: typeData?.group_id !== undefined },
    },
  );

  const description = typeData?.description ?? typeDescription;

  const sortedDogmaAttributes = useMemo(
    () =>
      [...(typeData?.dogma_attributes ?? [])].sort(
        (a, b) => a.attribute_id - b.attribute_id,
      ),
    [typeData?.dogma_attributes],
  );

  const dogmaAttributeQueries = useQueries({
    queries: sortedDogmaAttributes.map((attribute) =>
      getDogmaAttributeByIdQueryOptions(attribute.attribute_id),
    ),
  });

  const dogmaAttributeCategoryIds = useMemo(() => {
    const categoryIds = new Set<number>();

    for (const query of dogmaAttributeQueries) {
      const categoryId = query.data?.data.attributeCategoryID;
      if (categoryId !== undefined) {
        categoryIds.add(categoryId);
      }
    }

    return Array.from(categoryIds).sort((a, b) => a - b);
  }, [dogmaAttributeQueries]);

  const dogmaAttributeCategoryQueries = useQueries({
    queries: dogmaAttributeCategoryIds.map((categoryId) =>
      getDogmaAttributeCategoryByIdQueryOptions(categoryId),
    ),
  });

  const dogmaAttributeCategoryByAttributeId = useMemo(() => {
    const categoryByAttributeId = new Map<number, number>();

    sortedDogmaAttributes.forEach((attribute, index) => {
      const categoryId =
        dogmaAttributeQueries[index]?.data?.data.attributeCategoryID;
      if (categoryId !== undefined) {
        categoryByAttributeId.set(attribute.attribute_id, categoryId);
      }
    });

    return categoryByAttributeId;
  }, [dogmaAttributeQueries, sortedDogmaAttributes]);

  const dogmaAttributeCategoryNamesById = useMemo(() => {
    const categoryNamesById = new Map<number, string>();

    dogmaAttributeCategoryIds.forEach((categoryId, index) => {
      const categoryName =
        dogmaAttributeCategoryQueries[index]?.data?.data.name;
      if (categoryName) {
        categoryNamesById.set(categoryId, categoryName);
      }
    });

    return categoryNamesById;
  }, [dogmaAttributeCategoryIds, dogmaAttributeCategoryQueries]);

  const categorizedDogmaAttributes = useMemo(() => {
    const grouped = new Map<
      string,
      {
        categoryId?: number;
        categoryLabel: string;
        attributes: typeof sortedDogmaAttributes;
      }
    >();

    for (const attribute of sortedDogmaAttributes) {
      const categoryId = dogmaAttributeCategoryByAttributeId.get(
        attribute.attribute_id,
      );
      const key = categoryId === undefined ? "uncategorized" : `${categoryId}`;
      const categoryLabel =
        categoryId === undefined
          ? "Uncategorized"
          : (dogmaAttributeCategoryNamesById.get(categoryId) ??
            `Category ${categoryId}`);

      const existingGroup = grouped.get(key);
      if (existingGroup) {
        existingGroup.attributes.push(attribute);
      } else {
        grouped.set(key, {
          categoryId,
          categoryLabel,
          attributes: [attribute],
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.categoryId === undefined && b.categoryId === undefined) {
        return 0;
      }
      if (a.categoryId === undefined) {
        return 1;
      }
      if (b.categoryId === undefined) {
        return -1;
      }
      return a.categoryId - b.categoryId;
    });
  }, [
    dogmaAttributeCategoryByAttributeId,
    dogmaAttributeCategoryNamesById,
    sortedDogmaAttributes,
  ]);

  const sortedDogmaEffects = useMemo(
    () =>
      [...(typeData?.dogma_effects ?? [])].sort(
        (a, b) => a.effect_id - b.effect_id,
      ),
    [typeData?.dogma_effects],
  );

  const identityDetails: { label: string; value: ReactNode }[] = [
    { label: "Type ID", value: typeData?.type_id ?? typeId },
    {
      label: "Name",
      value: typeData?.name ?? typeName ?? notAvailableText,
    },
    {
      label: "Published",
      value: booleanBadge(typeData?.published),
    },
    {
      label: "Group",
      value: (
        <GroupAnchor groupId={typeData?.group_id}>
          <GroupName groupId={typeData?.group_id} />
        </GroupAnchor>
      ),
    },
    {
      label: "Group ID",
      value: typeData?.group_id ?? notAvailableText,
    },
    {
      label: "Category",
      value:
        group?.data.category_id === undefined ? (
          notAvailableText
        ) : (
          <CategoryAnchor categoryId={group.data.category_id}>
            <CategoryName categoryId={group.data.category_id} />
          </CategoryAnchor>
        ),
    },
    {
      label: "Category ID",
      value: group?.data.category_id ?? notAvailableText,
    },
    {
      label: "Market Group",
      value:
        typeData?.market_group_id === undefined ? (
          notAvailableText
        ) : (
          <MarketGroupAnchor marketGroupId={typeData.market_group_id}>
            <MarketGroupName marketGroupId={typeData.market_group_id} />
          </MarketGroupAnchor>
        ),
    },
    {
      label: "Market Group ID",
      value: typeData?.market_group_id ?? notAvailableText,
    },
  ];

  const propertyDetails: { label: string; value: ReactNode }[] = [
    { label: "Capacity", value: formatNumber(typeData?.capacity) },
    { label: "Mass", value: formatNumber(typeData?.mass) },
    { label: "Radius", value: formatNumber(typeData?.radius) },
    { label: "Volume", value: formatNumber(typeData?.volume) },
    {
      label: "Packaged Volume",
      value: formatNumber(typeData?.packaged_volume),
    },
    {
      label: "Portion Size",
      value: typeData?.portion_size ?? notAvailableText,
    },
    {
      label: "Graphic ID",
      value: typeData?.graphic_id ?? notAvailableText,
    },
    {
      label: "Icon ID",
      value: typeData?.icon_id ?? notAvailableText,
    },
  ];

  if (!typeId) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading type information...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Stack gap="lg">
        <Group gap="xl">
          <TypeAvatar typeId={typeId} size="lg" />
          <Title order={1}>{typeData?.name ?? typeName}</Title>
          {character && (
            <OpenMarketWindowActionIcon
              characterId={character.characterId}
              typeId={typeId}
            />
          )}
        </Group>
        <Stack gap={0}>
          <TypeInventoryBreadcrumbs typeId={typeId} />
          <TypeMarketBreadcrumbs typeId={typeId} />
        </Stack>
        <Group>
          <Link href={`https://www.everef.net/type/${typeId}`} target="_blank">
            <Button size="xs">
              <Group gap="xs">
                <IconExternalLink size={14} />
                Eve Ref
              </Group>
            </Button>
          </Link>
          <Link href={`https://evetycoon.com/market/${typeId}`} target="_blank">
            <Button size="xs">
              <Group gap="xs">
                <IconExternalLink size={14} />
                EVE Tycoon
              </Group>
            </Button>
          </Link>
        </Group>

        <Title order={4}>Identity & Classification</Title>
        <DetailsGrid details={identityDetails} />

        <Title order={4}>Properties</Title>
        <DetailsGrid details={propertyDetails} />

        {description && (
          <Spoiler maxHeight={120} showLabel="Show more" hideLabel="Show less">
            <MailMessageViewer
              content={
                description
                  ? sanitizeFormattedEveString(description)
                  : "No description"
              }
            />
          </Spoiler>
        )}

        <Title order={4}>Market Information</Title>
        <Paper withBorder radius="md" p="sm">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text>Average Price</Text>
              <Text>
                {marketPrice?.average_price !== undefined ? (
                  <>
                    {marketPrice.average_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ISK
                  </>
                ) : (
                  notAvailableText
                )}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text>Adjusted Price</Text>
              <Text>
                {marketPrice?.adjusted_price !== undefined ? (
                  <>
                    {marketPrice.adjusted_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ISK
                  </>
                ) : (
                  notAvailableText
                )}
              </Text>
            </Group>
            {marketStats && (
              <>
                <Title order={6}>
                  Market Statistics (powered by{" "}
                  <Anchor href="https://www.fuzzwork.co.uk" target="_blank">
                    fuzzwork.co.uk
                  </Anchor>
                  )
                </Title>
                <Group justify="space-between">
                  <Text>Jita Buy</Text>
                  <Text>
                    <ISKAmount amount={marketStats.buy.percentile} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Jita Split</Text>
                  <Text>
                    <ISKAmount
                      amount={
                        (marketStats.buy.percentile +
                          marketStats.sell.percentile) /
                        2
                      }
                    />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Jita Sell</Text>
                  <Text>
                    <ISKAmount amount={marketStats.sell.percentile} />
                  </Text>
                </Group>
              </>
            )}
          </Stack>
        </Paper>

        <Title order={4}>Dogma Attributes</Title>
        <Paper withBorder radius="md" p="sm">
          {sortedDogmaAttributes.length > 0 ? (
            <Stack gap="lg">
              {categorizedDogmaAttributes.map((category) => (
                <Stack key={category.categoryId ?? "uncategorized"} gap="xs">
                  <Text fw={700} size="sm">
                    {category.categoryLabel}
                    {category.categoryId === undefined
                      ? ""
                      : ` (${category.categoryId})`}
                  </Text>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Attribute</Table.Th>
                        <Table.Th ta="right">Value</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {category.attributes.map((attribute) => (
                        <Table.Tr key={attribute.attribute_id}>
                          <Table.Td>
                            <DogmaAttributeAnchor
                              attributeId={attribute.attribute_id}
                            >
                              <DogmaAttributeName
                                attributeId={attribute.attribute_id}
                              />
                            </DogmaAttributeAnchor>
                          </Table.Td>
                          <Table.Td ta="right">
                            {formatDogmaValue(attribute.value)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {notAvailableText}
            </Text>
          )}
        </Paper>

        <Title order={4}>Dogma Effects</Title>
        <Paper withBorder radius="md" p="sm">
          {sortedDogmaEffects.length > 0 ? (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Effect</Table.Th>
                  <Table.Th ta="right">Default</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedDogmaEffects.map((effect) => (
                  <Table.Tr key={effect.effect_id}>
                    <Table.Td>
                      <DogmaEffectAnchor effectId={effect.effect_id}>
                        <DogmaEffectName effectId={effect.effect_id} />
                      </DogmaEffectAnchor>
                    </Table.Td>
                    <Table.Td ta="right">
                      {booleanBadge(effect.is_default)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text size="sm" c="dimmed">
              {notAvailableText}
            </Text>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
