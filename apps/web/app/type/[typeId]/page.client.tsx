"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCoin,
  IconExternalLink,
  IconFileText,
  IconInfoCircle,
  IconListDetails,
} from "@tabler/icons-react";
import { useQueries, useQuery } from "@tanstack/react-query";

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
  getDogmaUnitByIdQueryOptions,
} from "@jitaspace/sde-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  CategoryAnchor,
  DogmaAttributeAnchor,
  DogmaEffectAnchor,
  EveIconAvatar,
  GroupAnchor,
  ISKAmount,
  MarketGroupAnchor,
  TypeAnchor,
  TypeName,
} from "@jitaspace/ui";

import { OpenMarketWindowActionIcon } from "~/components/ActionIcon";
import {
  TypeInventoryBreadcrumbs,
  TypeMarketBreadcrumbs,
} from "~/components/Breadcrumbs";
import { MailMessageViewer } from "~/components/EveMail";
import {
  CategoryName,
  DogmaAttributeName,
  DogmaEffectName,
  GroupName,
  MarketGroupName,
} from "~/components/Text";

export interface PageProps {
  typeId: number;
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
}

const notAvailableText = "Not available";

/** The Forge — the region containing Jita, EVE's main trade hub. */
const THE_FORGE_REGION_ID = 10000002;

/** Image variations that look good rendered large (vs. small square icons). */
const LARGE_IMAGE_VARIATIONS = new Set(["render", "bp", "bpc"]);

interface UnitInfo {
  unitId: number;
  symbol?: string;
}

/** Minimal shapes for the loosely-typed market hooks. */
interface MarketAggregateStats {
  buy: { percentile: number };
  sell: { percentile: number };
}

interface MarketPriceEntry {
  average_price?: number;
  adjusted_price?: number;
}

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

/** Turn ASCII unit shorthand from the SDE into nicer typography (m3 -> m³). */
const prettifyUnitSymbol = (symbol?: string): string | undefined =>
  symbol
    ? symbol
        .replaceAll(/m3/gi, "m³")
        .replaceAll("^3", "³")
        .replaceAll("^2", "²")
    : undefined;

/** Locale-format a number, keeping useful precision for small fractions. */
const formatNumber = (value: number): string => {
  if (value === 0) return "0";
  if (Number.isInteger(value)) return value.toLocaleString();
  const abs = Math.abs(value);
  let maximumFractionDigits = 2;
  if (abs < 1) maximumFractionDigits = 4;
  if (abs < 0.001) maximumFractionDigits = 6;
  return value.toLocaleString(undefined, { maximumFractionDigits });
};

/**
 * Format a dogma attribute value the way the EVE client does, applying the
 * well-known unit transforms (resistances, percentages, multipliers) and
 * otherwise appending the unit symbol. Transforms are documented in the SDE
 * unit descriptions and verified against in-game values.
 */
const formatAttributeValue = (value: number, unit?: UnitInfo): string => {
  switch (unit?.unitId) {
    // Inverse Absolute Percent — resistances. 0.0 => 100%, 1.0 => 0%.
    case 108:
      return `${formatNumber((1 - value) * 100)}%`;
    // Absolute Percent. 0.0 => 0%, 1.0 => 100%.
    case 127:
      return `${formatNumber(value * 100)}%`;
    // Modifier Percent — multiplier shown as a signed %. 1.1 => +10%, 0.9 => -10%.
    case 109: {
      const percent = (value - 1) * 100;
      return `${percent > 0 ? "+" : ""}${formatNumber(percent)}%`;
    }
    // Boolean flag.
    case 137:
      return value >= 1 ? "Yes" : "No";
    default: {
      const symbol = prettifyUnitSymbol(unit?.symbol);
      if (!symbol) return formatNumber(value);
      if (symbol === "%") return `${formatNumber(value)}%`;
      return `${formatNumber(value)} ${symbol}`;
    }
  }
};

function SectionHeading({
  icon,
  children,
}: Readonly<{
  icon: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Group gap={8} align="center">
      <Box c="eve_accent.4" style={{ display: "flex" }}>
        {icon}
      </Box>
      <Title order={4}>{children}</Title>
    </Group>
  );
}

function StatCard({
  label,
  value,
  sub,
}: Readonly<{
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={2}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={700}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Text component="div" fw={600} c="gray.0">
          {value}
        </Text>
        {sub !== undefined && (
          <Text size="xs" c="dimmed">
            {sub}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function HeroStat({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Stack gap={0}>
      <Text
        size="xs"
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {label}
      </Text>
      <Text component="div" fw={600} c="gray.0">
        {value}
      </Text>
    </Stack>
  );
}

/** Renders an attribute value, linking out for ID-reference units. */
function AttributeValue({
  value,
  unit,
}: Readonly<{
  value: number;
  unit?: UnitInfo;
}>) {
  switch (unit?.unitId) {
    // typeID
    case 116:
      return (
        <TypeAnchor typeId={value}>
          <TypeName span typeId={value} />
        </TypeAnchor>
      );
    // groupID
    case 115:
      return (
        <GroupAnchor groupId={value}>
          <GroupName groupId={value} />
        </GroupAnchor>
      );
    // attributeID
    case 119:
      return (
        <DogmaAttributeAnchor attributeId={value}>
          <DogmaAttributeName attributeId={value} />
        </DogmaAttributeAnchor>
      );
    default:
      return (
        <Text ff="monospace" fw={600} c="eve.2">
          {formatAttributeValue(value, unit)}
        </Text>
      );
  }
}

export default function TypePage({
  typeId,
  typeName,
  typeDescription,
}: PageProps) {
  const character = useSelectedCharacter();
  const { data: type } = useType(typeId);
  const { data: marketPrices } = useMarketPrices();
  const [regionId] = useState(THE_FORGE_REGION_ID);
  const { data: marketStats } = useFuzzworkTypeMarketStats(
    typeId,
    regionId,
  ) as { data: MarketAggregateStats | null };
  const typeData = type?.data;
  const marketPrice = marketPrices[typeId] as MarketPriceEntry | undefined;
  const { data: group } = useGetUniverseGroupsGroupId(
    typeData?.group_id ?? 0,
    {},
    {
      query: { enabled: typeData?.group_id !== undefined },
    },
  );

  const name = typeData?.name ?? typeName;
  const description = typeData?.description ?? typeDescription;
  const categoryId = group?.data.category_id;

  // Determine the best image variation: prefer the 3D render (ships), then a
  // blueprint, otherwise fall back to the icon.
  const { data: imageVariations } = useQuery<string[]>({
    queryKey: ["evetech-type-image-variations", typeId],
    queryFn: () =>
      fetch(`https://images.evetech.net/types/${typeId}`).then((res) =>
        res.ok ? (res.json() as Promise<string[]>) : [],
      ),
    staleTime: Infinity,
    enabled: !!typeId,
  });

  const heroVariation = useMemo(() => {
    const variations = imageVariations ?? [];
    if (variations.includes("render")) return "render";
    if (variations.includes("bp")) return "bp";
    if (variations.includes("icon")) return "icon";
    return variations[0] ?? "icon";
  }, [imageVariations]);

  const isLargeImage = LARGE_IMAGE_VARIATIONS.has(heroVariation);

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

  // Per-attribute SDE metadata (display name, icon, unit, category), keyed by id.
  const attributeMetaById = useMemo(() => {
    const metaById = new Map<
      number,
      {
        displayName?: string;
        name?: string;
        iconId?: number;
        unitId?: number;
        categoryId?: number;
      }
    >();

    sortedDogmaAttributes.forEach((attribute, index) => {
      const data = dogmaAttributeQueries[index]?.data?.data;
      if (data) {
        // The generated SDE type marks `displayName` as required, but the API
        // omits it for some internal attributes, so guard against undefined.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const displayName = data.displayName?.en?.trim();
        metaById.set(attribute.attribute_id, {
          displayName,
          name: data.name,
          iconId: data.iconID || undefined,
          unitId: data.unitID || undefined,
          categoryId: data.attributeCategoryID,
        });
      }
    });

    return metaById;
  }, [dogmaAttributeQueries, sortedDogmaAttributes]);

  // Resolve unit symbols once per unique unit id used by this type.
  const unitIds = useMemo(() => {
    const ids = new Set<number>();
    for (const meta of attributeMetaById.values()) {
      if (meta.unitId) ids.add(meta.unitId);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [attributeMetaById]);

  const unitQueries = useQueries({
    queries: unitIds.map((unitId) => getDogmaUnitByIdQueryOptions(unitId)),
  });

  const unitById = useMemo(() => {
    const units = new Map<number, UnitInfo>();
    unitIds.forEach((unitId, index) => {
      const data = unitQueries[index]?.data?.data;
      // `displayName` is typed as required but may be absent on some units.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      units.set(unitId, { unitId, symbol: data?.displayName?.en });
    });
    return units;
  }, [unitIds, unitQueries]);

  const dogmaAttributeCategoryIds = useMemo(() => {
    const categoryIds = new Set<number>();
    for (const meta of attributeMetaById.values()) {
      if (meta.categoryId !== undefined) categoryIds.add(meta.categoryId);
    }
    return Array.from(categoryIds).sort((a, b) => a - b);
  }, [attributeMetaById]);

  const dogmaAttributeCategoryQueries = useQueries({
    queries: dogmaAttributeCategoryIds.map((categoryId) =>
      getDogmaAttributeCategoryByIdQueryOptions(categoryId),
    ),
  });

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
      const categoryId = attributeMetaById.get(
        attribute.attribute_id,
      )?.categoryId;
      const key = categoryId === undefined ? "uncategorized" : `${categoryId}`;
      const categoryLabel =
        categoryId === undefined
          ? "Other"
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
      if (a.categoryId === undefined) return 1;
      if (b.categoryId === undefined) return -1;
      return a.categoryId - b.categoryId;
    });
  }, [
    attributeMetaById,
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

  // Physical properties — only render the ones this type actually defines.
  const propertyItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const push = (label: string, value: number | undefined, unit?: string) => {
      if (value === undefined) return;
      items.push({
        label,
        value: unit ? `${formatNumber(value)} ${unit}` : formatNumber(value),
      });
    };
    push("Volume", typeData?.volume, "m³");
    push("Packaged Volume", typeData?.packaged_volume, "m³");
    push("Capacity", typeData?.capacity, "m³");
    push("Mass", typeData?.mass, "kg");
    push("Radius", typeData?.radius, "m");
    push("Portion Size", typeData?.portion_size);
    return items;
  }, [typeData]);

  const jitaSellPrice = marketStats?.sell.percentile;
  const heroPrice = jitaSellPrice ?? marketPrice?.average_price;

  const hasAttributes =
    sortedDogmaAttributes.length > 0 || sortedDogmaEffects.length > 0;
  const hasMarket =
    typeData?.market_group_id !== undefined ||
    marketPrice !== undefined ||
    marketStats != null;

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
    <Container size="lg" py="md">
      <Stack gap="lg">
        {/* Hero */}
        <Paper withBorder radius="md" p="lg">
          <Group align="flex-start" gap="xl" wrap="wrap">
            <Box
              style={{
                width: 170,
                height: 170,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 8,
                border: "1px solid rgba(108, 132, 151, 0.28)",
                background:
                  "radial-gradient(circle at 50% 35%, rgba(44, 66, 88, 0.4), rgba(6, 9, 15, 0.92))",
              }}
            >
              <Image
                src={`https://images.evetech.net/types/${typeId}/${heroVariation}?size=${
                  isLargeImage ? 512 : 128
                }`}
                alt={name ?? `Type ${typeId}`}
                w={isLargeImage ? 150 : 72}
                h={isLargeImage ? 150 : 72}
                fit="contain"
              />
            </Box>

            <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
              <TypeInventoryBreadcrumbs typeId={typeId} fz="sm" />
              <Group gap="sm" align="center">
                <Title order={2}>{name ?? notAvailableText}</Title>
                {typeData?.published === false && (
                  <Badge color="red" variant="light">
                    Unpublished
                  </Badge>
                )}
                {character && (
                  <OpenMarketWindowActionIcon
                    characterId={character.characterId}
                    typeId={typeId}
                  />
                )}
              </Group>

              <Group gap="xs" align="center">
                <GroupAnchor groupId={typeData?.group_id}>
                  <GroupName groupId={typeData?.group_id} />
                </GroupAnchor>
                {categoryId !== undefined && (
                  <>
                    <Text c="dimmed">·</Text>
                    <CategoryAnchor categoryId={categoryId}>
                      <CategoryName categoryId={categoryId} />
                    </CategoryAnchor>
                  </>
                )}
              </Group>

              <Group gap="xl">
                {typeData?.volume !== undefined && (
                  <HeroStat
                    label="Volume"
                    value={`${formatNumber(typeData.volume)} m³`}
                  />
                )}
                {heroPrice !== undefined && (
                  <HeroStat
                    label={
                      jitaSellPrice === undefined
                        ? "Average Price"
                        : "Jita Sell"
                    }
                    value={<ISKAmount amount={heroPrice} />}
                  />
                )}
              </Group>

              <Group gap="xs">
                <Button
                  component={Link}
                  href={`https://www.everef.net/type/${typeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                >
                  EVE Ref
                </Button>
                <Button
                  component={Link}
                  href={`https://evetycoon.com/market/${typeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                >
                  EVE Tycoon
                </Button>
              </Group>
            </Stack>
          </Group>
        </Paper>

        <Tabs defaultValue="overview" variant="outline" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<IconInfoCircle size={16} />}
            >
              Overview
            </Tabs.Tab>
            {hasAttributes && (
              <Tabs.Tab
                value="attributes"
                leftSection={<IconListDetails size={16} />}
              >
                Attributes
              </Tabs.Tab>
            )}
            {hasMarket && (
              <Tabs.Tab value="market" leftSection={<IconCoin size={16} />}>
                Market
              </Tabs.Tab>
            )}
            {description && (
              <Tabs.Tab
                value="description"
                leftSection={<IconFileText size={16} />}
              >
                Description
              </Tabs.Tab>
            )}
          </Tabs.List>

          {/* Overview */}
          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <Stack gap="sm">
                <SectionHeading icon={<IconInfoCircle size={18} />}>
                  Identity &amp; Classification
                </SectionHeading>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  <StatCard label="Type ID" value={typeId} />
                  <StatCard
                    label="Group"
                    value={
                      <GroupAnchor groupId={typeData?.group_id}>
                        <GroupName groupId={typeData?.group_id} />
                      </GroupAnchor>
                    }
                    sub={
                      typeData?.group_id === undefined
                        ? undefined
                        : `ID ${typeData.group_id}`
                    }
                  />
                  <StatCard
                    label="Category"
                    value={
                      categoryId === undefined ? (
                        notAvailableText
                      ) : (
                        <CategoryAnchor categoryId={categoryId}>
                          <CategoryName categoryId={categoryId} />
                        </CategoryAnchor>
                      )
                    }
                    sub={
                      categoryId === undefined ? undefined : `ID ${categoryId}`
                    }
                  />
                  {typeData?.market_group_id !== undefined && (
                    <StatCard
                      label="Market Group"
                      value={
                        <MarketGroupAnchor
                          marketGroupId={typeData.market_group_id}
                        >
                          <MarketGroupName
                            marketGroupId={typeData.market_group_id}
                          />
                        </MarketGroupAnchor>
                      }
                      sub={`ID ${typeData.market_group_id}`}
                    />
                  )}
                  <StatCard
                    label="Published"
                    value={booleanBadge(typeData?.published)}
                  />
                </SimpleGrid>
              </Stack>

              {propertyItems.length > 0 && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconListDetails size={18} />}>
                    Properties
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                    {propertyItems.map((item) => (
                      <StatCard
                        key={item.label}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </SimpleGrid>
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Attributes */}
          {hasAttributes && (
            <Tabs.Panel value="attributes" pt="lg">
              <Stack gap="lg">
                {sortedDogmaAttributes.length > 0 && (
                  <Stack gap="md">
                    <SectionHeading icon={<IconListDetails size={18} />}>
                      Attributes
                    </SectionHeading>
                    {categorizedDogmaAttributes.map((category) => (
                      <Paper
                        key={category.categoryId ?? "uncategorized"}
                        withBorder
                        radius="md"
                        p="sm"
                      >
                        <Stack gap="xs">
                          <Text
                            fw={700}
                            size="sm"
                            c="gray.0"
                            tt="uppercase"
                            style={{ letterSpacing: "0.04em" }}
                          >
                            {category.categoryLabel}
                          </Text>
                          <Table highlightOnHover verticalSpacing="xs">
                            <Table.Tbody>
                              {category.attributes.map((attribute) => {
                                const meta = attributeMetaById.get(
                                  attribute.attribute_id,
                                );
                                const unit = meta?.unitId
                                  ? unitById.get(meta.unitId)
                                  : undefined;
                                const label = meta?.displayName ?? meta?.name;
                                return (
                                  <Table.Tr key={attribute.attribute_id}>
                                    <Table.Td style={{ width: 36 }}>
                                      {meta?.iconId ? (
                                        <EveIconAvatar
                                          iconId={meta.iconId}
                                          size="sm"
                                          alt={label}
                                        />
                                      ) : null}
                                    </Table.Td>
                                    <Table.Td>
                                      <DogmaAttributeAnchor
                                        attributeId={attribute.attribute_id}
                                      >
                                        {label ?? (
                                          <Skeleton height="1em" width="10ch" />
                                        )}
                                      </DogmaAttributeAnchor>
                                    </Table.Td>
                                    <Table.Td ta="right">
                                      <AttributeValue
                                        value={attribute.value}
                                        unit={unit}
                                      />
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                          </Table>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {sortedDogmaEffects.length > 0 && (
                  <Stack gap="sm">
                    <SectionHeading icon={<IconListDetails size={18} />}>
                      Effects
                    </SectionHeading>
                    <Paper withBorder radius="md" p="sm">
                      <Table highlightOnHover verticalSpacing="xs">
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
                                  <DogmaEffectName
                                    effectId={effect.effect_id}
                                  />
                                </DogmaEffectAnchor>
                              </Table.Td>
                              <Table.Td ta="right">
                                {booleanBadge(effect.is_default)}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Paper>
                  </Stack>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {/* Market */}
          {hasMarket && (
            <Tabs.Panel value="market" pt="lg">
              <Stack gap="lg">
                <TypeMarketBreadcrumbs typeId={typeId} fz="sm" />
                <Stack gap="sm">
                  <SectionHeading icon={<IconCoin size={18} />}>
                    Jita / The Forge
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                    {marketStats && (
                      <StatCard
                        label="Jita Buy"
                        value={
                          <ISKAmount amount={marketStats.buy.percentile} />
                        }
                      />
                    )}
                    {marketStats && (
                      <StatCard
                        label="Jita Split"
                        value={
                          <ISKAmount
                            amount={
                              (marketStats.buy.percentile +
                                marketStats.sell.percentile) /
                              2
                            }
                          />
                        }
                      />
                    )}
                    {marketStats && (
                      <StatCard
                        label="Jita Sell"
                        value={
                          <ISKAmount amount={marketStats.sell.percentile} />
                        }
                      />
                    )}
                    {marketPrice?.average_price !== undefined && (
                      <StatCard
                        label="Average Price"
                        value={<ISKAmount amount={marketPrice.average_price} />}
                      />
                    )}
                    {marketPrice?.adjusted_price !== undefined && (
                      <StatCard
                        label="Adjusted Price"
                        value={
                          <ISKAmount amount={marketPrice.adjusted_price} />
                        }
                      />
                    )}
                  </SimpleGrid>
                  <Text size="xs" c="dimmed">
                    Regional statistics powered by{" "}
                    <Anchor
                      href="https://www.fuzzwork.co.uk"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      fuzzwork.co.uk
                    </Anchor>
                    . Average and adjusted prices are CCP&apos;s global ESI
                    estimates.
                  </Text>
                </Stack>
              </Stack>
            </Tabs.Panel>
          )}

          {/* Description */}
          {description && (
            <Tabs.Panel value="description" pt="lg">
              <Paper withBorder radius="md" p="md">
                <MailMessageViewer
                  content={sanitizeFormattedEveString(description)}
                />
              </Paper>
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>
    </Container>
  );
}
