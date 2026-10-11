"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Badge,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeAnchor, TypeAvatar } from "@jitaspace/eve-components";
import {
  WindowAttributesIcon,
  WindowFittingIcon,
  WindowInfoIcon,
  WindowItemsIcon,
} from "@jitaspace/eve-icons";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  CategoryAnchor,
  DogmaAttributeValue,
  DogmaEffectAnchor,
  EveIconAvatar,
  GroupAnchor,
} from "@jitaspace/ui";

import type { DogmaAttributeTypeRow } from "~/app/api/dogma/attribute/[attributeId]/types/route";
import type { EffectAttribute, EffectModifier } from "~/components/Dogma";
import { DataTable } from "~/components/DataTable";
import { AttributeLink, ModifierSentence } from "~/components/Dogma";
import {
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
  useEntityTable,
  YesNoBadge,
} from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { groupDogmaModifiers } from "~/lib/dogmaModifiers";

const SKILL_CATEGORY_ID = 16;
const BLUEPRINT_CATEGORY_ID = 9;

interface AttributeRef {
  attributeId: number;
  name: string | null;
  displayName: string | null;
}

/** One modifier that changes, or reads, this attribute. */
export interface AttributeModifierRow extends EffectModifier {
  effectId: number;
  effectName: string | null;
  /** How many items carry the modifier's effect. */
  carrierCount: number;
}

export interface PageProps {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  /** Ours (AI-generated, EVE HTML), shown first. */
  customDescription: string | null;
  /** CCP's developer note. */
  description: string | null;
  /** CCP's in-game tooltip. */
  tooltipTitle: string | null;
  tooltipDescription: string | null;
  defaultValue: number | null;
  highIsGood: boolean | null;
  published: boolean | null;
  stackable: boolean | null;
  displayWhenZero: boolean | null;
  dataType: number | null;
  iconId: number | null;
  unit: {
    unitId: number;
    name: string;
    displayName: string | null;
    description: string | null;
  } | null;
  category: {
    categoryId: number;
    name: string;
    description: string | null;
  } | null;
  minAttribute: AttributeRef | null;
  maxAttribute: AttributeRef | null;
  chargeRechargeTimeAttribute: AttributeRef | null;
  itemCount: number;
  valueRange: { min: number; max: number } | null;
  /** Every attribute the page names, for the modifier sentences. */
  attributes: EffectAttribute[];
  /** Modifiers that change this attribute. */
  modifiedBy: AttributeModifierRow[];
  /** Modifiers that read this attribute to change another. */
  modifies: AttributeModifierRow[];
  /** Effects that point at this attribute, and as what. */
  statOf: { effectId: number; effectName: string | null; role: string }[];
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

function UnitValue({
  value,
  unit,
}: Readonly<{ value: number; unit: PageProps["unit"] }>) {
  return (
    <DogmaAttributeValue
      span
      inherit
      value={value}
      unitId={unit?.unitId}
      unitSymbol={unit?.displayName ?? undefined}
    />
  );
}

function AttributeRefLink({
  attribute,
}: Readonly<{ attribute: AttributeRef }>) {
  const map = new Map([
    [attribute.attributeId, { ...attribute, unitId: null, unitSymbol: null }],
  ]);
  return <AttributeLink attributeId={attribute.attributeId} attributes={map} />;
}

// --- modifier tables --------------------------------------------------------

function ModifierCell({
  row,
  attributes,
}: Readonly<{
  row: AttributeModifierRow;
  attributes: Map<number, EffectAttribute>;
}>) {
  const [line] = groupDogmaModifiers([row]);
  if (!line) return null;
  return (
    <ModifierSentence line={line} modifiers={[row]} attributes={attributes} />
  );
}

const renderEffect = (row: AttributeModifierRow) => (
  <DogmaEffectAnchor effectId={row.effectId}>
    {row.effectName ?? `Effect ${row.effectId}`}
  </DogmaEffectAnchor>
);

function modifierColumns(
  attributes: Map<number, EffectAttribute>,
): DataTableColumn<AttributeModifierRow>[] {
  return [
    {
      id: "effect",
      header: "Effect",
      accessor: "effectName",
      sortable: true,
      cell: renderEffect,
    },
    {
      id: "modifier",
      header: "Modifier",
      accessor: (row) => `${row.func} ${row.domain ?? ""}`,
      cell: (row) => <ModifierCell row={row} attributes={attributes} />,
    },
    {
      id: "items",
      header: "Items",
      accessor: "carrierCount",
      sortable: true,
      align: "right",
      width: 90,
    },
  ];
}

function ModifierTableSection({
  icon,
  title,
  intro,
  rows,
  attributes,
}: Readonly<{
  icon: ReactNode;
  title: string;
  intro: string;
  rows: AttributeModifierRow[];
  attributes: Map<number, EffectAttribute>;
}>) {
  const columns = useMemo(() => modifierColumns(attributes), [attributes]);
  if (rows.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={icon}>{title}</SectionHeading>
      <Text size="sm" c="dimmed">
        {intro}
      </Text>
      <DataTable
        data={rows}
        columns={columns}
        rowId={(row) => `${row.effectId}-${row.modifierIndex}`}
        withGlobalFilter
        withPagination
        defaultPageSize={10}
        initialSort={{ columnId: "items", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
      />
    </Stack>
  );
}

// --- items table ------------------------------------------------------------

function TypeNameCell({ row }: Readonly<{ row: DogmaAttributeTypeRow }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <TypeAvatar
        typeId={row.typeId}
        size="sm"
        // Blueprints have no `icon` on the image server (it answers 400), and
        // the row already says what it is, so skip TypeAvatar's icon attempt.
        variation={row.categoryId === BLUEPRINT_CATEGORY_ID ? "bp" : undefined}
      />
      <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
    </Group>
  );
}

const renderTypeName = (row: DogmaAttributeTypeRow) => (
  <TypeNameCell row={row} />
);
const renderGroup = (row: DogmaAttributeTypeRow) => (
  <GroupAnchor groupId={row.groupId}>{row.groupName}</GroupAnchor>
);
const renderCategory = (row: DogmaAttributeTypeRow) => (
  <CategoryAnchor categoryId={row.categoryId}>
    {row.categoryName}
  </CategoryAnchor>
);
const renderPublished = (row: DogmaAttributeTypeRow) => (
  <Badge size="sm" variant="light" color={row.published ? "teal" : "gray"}>
    {row.published ? "Yes" : "No"}
  </Badge>
);

function typeColumns(
  unit: PageProps["unit"],
): DataTableColumn<DogmaAttributeTypeRow>[] {
  return [
    {
      id: "typeId",
      header: "Type ID",
      accessor: "typeId",
      sortable: true,
      width: 100,
      defaultVisible: false,
    },
    {
      id: "name",
      header: "Type",
      accessor: "name",
      sortable: true,
      cell: renderTypeName,
    },
    {
      id: "group",
      header: "Group",
      accessor: "groupName",
      sortable: true,
      filter: { type: "multi-select" },
      cell: renderGroup,
    },
    {
      id: "category",
      header: "Category",
      accessor: "categoryName",
      sortable: true,
      filter: { type: "multi-select" },
      cell: renderCategory,
    },
    {
      id: "value",
      header: "Value",
      accessor: "value",
      sortable: true,
      filter: { type: "range" },
      align: "right",
      cell: (row) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <UnitValue value={row.value} unit={unit} />
          {row.categoryId === SKILL_CATEGORY_ID && (
            <Text size="xs" c="dimmed">
              / level
            </Text>
          )}
        </Group>
      ),
    },
    {
      id: "published",
      header: "Published",
      accessor: "published",
      sortable: true,
      filter: { type: "boolean" },
      cell: renderPublished,
    },
  ];
}

function TypesSection({
  attributeId,
  itemCount,
  valueRange,
  unit,
}: Readonly<{
  attributeId: number;
  itemCount: number;
  valueRange: PageProps["valueRange"];
  unit: PageProps["unit"];
}>) {
  const { data, isPending, isError } = useEntityTable<DogmaAttributeTypeRow[]>(
    `/api/dogma/attribute/${attributeId}/types`,
    itemCount > 0,
  );
  const columns = useMemo(() => typeColumns(unit), [unit]);
  const rows = useMemo(() => data ?? [], [data]);

  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowItemsIcon size={18} alt="" />}>
        Items
      </SectionHeading>
      {itemCount === 0 ? (
        <Text c="dimmed" size="sm">
          No item has this attribute.
        </Text>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {plural(itemCount, "item has", "items have")} this attribute
            {valueRange && (
              <>
                , with values from{" "}
                <UnitValue value={valueRange.min} unit={unit} /> to{" "}
                <UnitValue value={valueRange.max} unit={unit} />
              </>
            )}
            .
          </Text>
          {isError ? (
            <Text c="red" size="sm">
              The item list could not be loaded.
            </Text>
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              isLoading={isPending}
              rowId={(row) => row.typeId}
              withGlobalFilter
              withColumnVisibility
              withPagination
              defaultPageSize={25}
              initialSort={{ columnId: "name", direction: "asc" }}
              verticalSpacing="xs"
              highlightOnHover
              striped
            />
          )}
        </>
      )}
    </Stack>
  );
}

// --- page sections ----------------------------------------------------------

function AttributeHero(props: Readonly<PageProps>) {
  const {
    attributeId,
    name,
    displayName,
    published,
    iconId,
    category,
    highIsGood,
    stackable,
    defaultValue,
    unit,
    itemCount,
    modifiedBy,
  } = props;
  const title = displayName ?? name ?? `Attribute ${attributeId}`;
  const changingEffects = new Set(modifiedBy.map((m) => m.effectId)).size;
  return (
    <HeroCard
      artwork={
        iconId === null ? (
          <WindowAttributesIcon size={64} alt="" />
        ) : (
          <EveIconAvatar iconId={iconId} size={96} radius={0} />
        )
      }
    >
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        {displayName && name && displayName !== name && (
          <Code w="fit-content">{name}</Code>
        )}
      </Stack>
      <Group gap={6}>
        {published !== null && (
          <Badge variant="light" color={published ? "teal" : "gray"}>
            {published ? "Published" : "Unpublished"}
          </Badge>
        )}
        {category && category.name !== "NULL" && (
          <Badge variant="light" color="eve_accent">
            {category.name}
          </Badge>
        )}
        {highIsGood !== null && (
          <Badge variant="light" color="teal">
            {highIsGood ? "Higher is better" : "Lower is better"}
          </Badge>
        )}
        {stackable === false && (
          <Badge variant="light" color="orange">
            Stacking penalised
          </Badge>
        )}
      </Group>
      <Group gap="xl">
        <HeroStat label="Attribute ID" value={attributeId} />
        {defaultValue !== null && (
          <HeroStat
            label="Default"
            value={<UnitValue value={defaultValue} unit={unit} />}
          />
        )}
        <HeroStat label="Items" value={itemCount.toLocaleString("en-US")} />
        <HeroStat
          label="Changed by"
          value={plural(changingEffects, "effect", "effects")}
        />
      </Group>
    </HeroCard>
  );
}

/**
 * Ours first, labelled; then CCP's own texts side by side: the in-game
 * tooltip and the developer note.
 */
function AttributeDescriptions({
  customDescription,
  description,
  tooltipTitle,
  tooltipDescription,
}: Readonly<PageProps>) {
  const ccp: { label: string; title?: string; text: string }[] = [
    ...(tooltipDescription
      ? [
          {
            label: "In-game tooltip",
            title: tooltipTitle ?? undefined,
            text: tooltipDescription,
          },
        ]
      : []),
    ...(description ? [{ label: "CCP's note", text: description }] : []),
  ];
  if (!customDescription && ccp.length === 0) return null;
  return (
    <Stack gap="sm">
      {customDescription && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <MailMessageViewer
              content={sanitizeFormattedEveString(customDescription)}
            />
            <Group gap={6}>
              <Badge size="xs" variant="light" color="gray">
                AI-generated
              </Badge>
              <Text size="xs" c="dimmed">
                Written from this attribute&apos;s data, not by CCP. CCP&apos;s
                own text and the effects below are the source of truth.
              </Text>
            </Group>
          </Stack>
        </Paper>
      )}
      {ccp.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: ccp.length }} spacing="sm">
          {ccp.map((entry) => (
            <Paper key={entry.label} withBorder radius="md" p="sm">
              <Stack gap={4}>
                <Text
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={700}
                  style={{ letterSpacing: "0.05em" }}
                >
                  {entry.label}
                </Text>
                {entry.title && (
                  <Text fw={600} size="sm">
                    {entry.title}
                  </Text>
                )}
                <Text component="div" size="sm">
                  <MailMessageViewer
                    content={sanitizeFormattedEveString(entry.text)}
                  />
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

function StatOfSection({ statOf }: Readonly<{ statOf: PageProps["statOf"] }>) {
  if (statOf.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowFittingIcon size={18} alt="" />}>
        Used as a stat by effects
      </SectionHeading>
      <Paper withBorder radius="md" p="sm">
        <Stack gap={6}>
          {statOf.map((entry) => (
            <Group key={`${entry.effectId}-${entry.role}`} gap="xs">
              <Badge size="sm" variant="light" color="gray">
                {entry.role}
              </Badge>
              <DogmaEffectAnchor effectId={entry.effectId}>
                {entry.effectName ?? `Effect ${entry.effectId}`}
              </DogmaEffectAnchor>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

const optional = (label: string, value: ReactNode) =>
  value === null || value === undefined ? [] : [{ label, value }];

function attributeDetails(
  props: Readonly<PageProps>,
): { label: string; value: ReactNode; sub?: ReactNode }[] {
  const { unit, category } = props;
  const link = (attribute: AttributeRef | null) =>
    attribute ? <AttributeRefLink attribute={attribute} /> : null;
  return [
    { label: "Attribute ID", value: props.attributeId },
    ...optional("Name", props.name ? <Code>{props.name}</Code> : null),
    ...optional("Display name", props.displayName),
    ...(category
      ? [
          {
            label: "Category",
            value: `${category.name} (${category.categoryId})`,
            sub: category.description ?? undefined,
          },
        ]
      : []),
    ...(unit
      ? [
          {
            label: "Unit",
            value: `${unit.displayName ?? unit.name} (${unit.unitId})`,
            sub: unit.description ?? unit.name,
          },
        ]
      : []),
    ...optional(
      "Default value",
      props.defaultValue === null ? null : (
        <>
          <UnitValue value={props.defaultValue} unit={unit} />{" "}
          <Text component="span" c="dimmed" size="sm">
            ({props.defaultValue})
          </Text>
        </>
      ),
    ),
    ...optional(
      "High is good",
      props.highIsGood === null ? null : (
        <YesNoBadge value={props.highIsGood} />
      ),
    ),
    ...optional(
      "Stackable",
      props.stackable === null ? null : <YesNoBadge value={props.stackable} />,
    ),
    ...optional(
      "Published",
      props.published === null ? null : <YesNoBadge value={props.published} />,
    ),
    ...optional(
      "Display when zero",
      props.displayWhenZero === null ? null : (
        <YesNoBadge value={props.displayWhenZero} />
      ),
    ),
    ...optional("Data type", props.dataType),
    ...optional("Minimum from", link(props.minAttribute)),
    ...optional("Maximum from", link(props.maxAttribute)),
    ...optional(
      "Charge recharge time",
      link(props.chargeRechargeTimeAttribute),
    ),
    ...optional("Icon ID", props.iconId),
    ...optional("Tooltip title", props.tooltipTitle),
  ];
}

export default function DogmaAttributePage(props: Readonly<PageProps>) {
  const attributes = useMemo(
    () => new Map(props.attributes.map((a) => [a.attributeId, a])),
    [props.attributes],
  );

  return (
    <Container size="lg">
      <Stack gap="lg">
        <AttributeHero {...props} />
        <AttributeDescriptions {...props} />
        <ModifierTableSection
          icon={<WindowFittingIcon size={18} alt="" />}
          title="Changed by"
          intro="Every effect modifier that changes this attribute, and what it changes it with."
          rows={props.modifiedBy}
          attributes={attributes}
        />
        <ModifierTableSection
          icon={<WindowAttributesIcon size={18} alt="" />}
          title="Changes"
          intro="Effect modifiers that read this attribute's value to change another attribute."
          rows={props.modifies}
          attributes={attributes}
        />
        <StatOfSection statOf={props.statOf} />
        <TypesSection
          attributeId={props.attributeId}
          itemCount={props.itemCount}
          valueRange={props.valueRange}
          unit={props.unit}
        />
        <Stack gap="sm">
          <SectionHeading icon={<WindowInfoIcon size={18} alt="" />}>
            Details
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
            {attributeDetails(props).map((detail) => (
              <StatCard
                key={detail.label}
                label={detail.label}
                value={detail.value}
                sub={detail.sub}
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
