"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeAnchor, TypeAvatar } from "@jitaspace/eve-components";
import {
  WindowAttributesIcon,
  WindowFittingIcon,
  WindowInfoIcon,
  WindowItemsIcon,
  WindowRestrictionIcon,
} from "@jitaspace/eve-icons";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  DogmaAttributeAnchor,
  DogmaAttributeValue,
  DogmaEffectAnchor,
  EveIconAvatar,
  GroupAnchor,
} from "@jitaspace/ui";

import type { DogmaModifier, DogmaModifierLine } from "~/lib/dogmaModifiers";
import { DataTable } from "~/components/DataTable";
import {
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
  YesNoBadge,
} from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import {
  DOGMA_DOMAIN_HINTS,
  dogmaDomainNoun,
  dogmaOperatorInfo,
  groupDogmaModifiers,
} from "~/lib/dogmaModifiers";

const SKILL_CATEGORY_ID = 16;

/** CCP's placeholder description on effects nobody wrote one for. */
const BOILERPLATE_DESCRIPTION = "Automatically generated effect";

export interface EffectAttribute {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  unitId: number | null;
  unitSymbol: string | null;
}

export interface EffectModifier extends DogmaModifier {
  groupName: string | null;
  skillName: string | null;
  targetEffectName: string | null;
}

export interface EffectType {
  typeId: number;
  name: string;
  published: boolean;
  groupId: number;
  groupName: string;
  categoryId: number;
  isDefault: boolean;
  /** This type's value for each of the effect's modifying attributes. */
  values: Record<number, number>;
}

const STAT_LABELS = {
  discharge: "Activation cost",
  duration: "Cycle time",
  range: "Optimal range",
  falloff: "Falloff",
  trackingSpeed: "Tracking",
  resistance: "Resisted by",
  npcUsageChance: "NPC usage chance",
  npcActivationChance: "NPC activation chance",
  fittingUsageChance: "Side-effect chance",
} as const;

const FLAG_LABELS = {
  isOffensive: "Offensive",
  isAssistance: "Assistance",
  isWarpSafe: "Warp safe",
  disallowAutoRepeat: "Disallow auto-repeat",
  electronicChance: "Electronic chance",
  propulsionChance: "Propulsion chance",
  rangeChance: "Range chance",
} as const;

export interface PageProps {
  effectId: number;
  name: string | null;
  displayName: string | null;
  description: string | null;
  /** Our own (AI-generated) description, shown when CCP's is missing. */
  customDescription: string | null;
  published: boolean | null;
  iconId: number | null;
  guid: string | null;
  distribution: number | null;
  category: { effectCategoryId: number; name: string | null } | null;
  flags: Record<keyof typeof FLAG_LABELS, boolean | null>;
  /** The attribute each of the effect's own pointers names, if any. */
  stats: Record<keyof typeof STAT_LABELS, number | null>;
  preExpression: number | null;
  postExpression: number | null;
  attributes: EffectAttribute[];
  modifiers: EffectModifier[];
  /** Effects whose modifiers point at this one. */
  targetedBy: {
    effectId: number;
    name: string | null;
    func: string;
    domain: string | null;
  }[];
  types: EffectType[];
}

/** `dgmEffTarget` → `Target`. */
function categoryLabel(category: NonNullable<PageProps["category"]>): string {
  if (!category.name) return `Category ${category.effectCategoryId}`;
  return category.name.replace(/^dgmEff/, "");
}

/** "A", "A and B", "A, B and C", keyed by each item's id. */
function joinNodes(
  ids: number[],
  render: (id: number) => ReactNode,
): ReactNode {
  return ids.map((id, index) => (
    <Fragment key={id}>
      {index > 0 && (index === ids.length - 1 ? " and " : ", ")}
      {render(id)}
    </Fragment>
  ));
}

function attributeLabel(
  attributeId: number,
  attribute: EffectAttribute | undefined,
): string {
  return (
    attribute?.displayName ?? attribute?.name ?? `Attribute ${attributeId}`
  );
}

function AttributeLink({
  attributeId,
  attributes,
}: Readonly<{
  attributeId: number;
  attributes: Map<number, EffectAttribute>;
}>) {
  const attribute = attributes.get(attributeId);
  return (
    <DogmaAttributeAnchor
      attributeId={attributeId}
      title={attribute?.name ?? undefined}
    >
      {attributeLabel(attributeId, attribute)}
    </DogmaAttributeAnchor>
  );
}

function DomainNoun({ domain }: Readonly<{ domain: string | null }>) {
  const noun = dogmaDomainNoun(domain);
  const hint = domain === null ? undefined : DOGMA_DOMAIN_HINTS[domain];
  if (!hint) return <>{noun}</>;
  return (
    <Tooltip label={hint} withArrow multiline maw={280}>
      <Text
        component="span"
        inherit
        style={{ textDecoration: "underline dotted", cursor: "help" }}
      >
        {noun}
      </Text>
    </Tooltip>
  );
}

/** Who a line applies to: "Energy Weapon on the ship", "The character"… */
function LineSubject({
  line,
  modifiers,
}: Readonly<{ line: DogmaModifierLine; modifiers: EffectModifier[] }>) {
  const domain = <DomainNoun domain={line.domain} />;
  const first = modifiers[0];
  const skill =
    line.skillTypeId === null ? null : (
      <TypeAnchor typeId={line.skillTypeId}>
        {first?.skillName ?? `Type ${line.skillTypeId}`}
      </TypeAnchor>
    );
  const groups = joinNodes(line.groupIds, (groupId) => (
    <GroupAnchor groupId={groupId}>
      {modifiers.find((modifier) => modifier.groupId === groupId)?.groupName ??
        `Group ${groupId}`}
    </GroupAnchor>
  ));

  switch (line.func) {
    case "ItemModifier":
      return <>The {domain}</>;
    case "LocationModifier":
      return <>Everything on the {domain}</>;
    case "LocationGroupModifier":
      return (
        <>
          {groups} on the {domain}
        </>
      );
    case "LocationRequiredSkillModifier":
      return (
        <>
          Items requiring {skill} on the {domain}
        </>
      );
    case "OwnerRequiredSkillModifier":
      return (
        <>
          Items owned by the {domain} requiring {skill}
        </>
      );
    default:
      return (
        <>
          <Code>{line.func}</Code> on the {domain}
        </>
      );
  }
}

function ModifierSentence({
  line,
  modifiers,
  attributes,
}: Readonly<{
  line: DogmaModifierLine;
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  if (line.func === "EffectStopper") {
    return (
      <Text>
        <Text component="span" fw={700}>
          Stops
        </Text>{" "}
        {joinNodes(line.targetEffectIds, (effectId) => (
          <DogmaEffectAnchor effectId={effectId}>
            {modifiers.find((modifier) => modifier.targetEffectId === effectId)
              ?.targetEffectName ?? `Effect ${effectId}`}
          </DogmaEffectAnchor>
        ))}{" "}
        on the <DomainNoun domain={line.domain} />
      </Text>
    );
  }

  const operator = dogmaOperatorInfo(line.operator);
  const modified = joinNodes(line.modifiedAttributeIds, (attributeId) => (
    <AttributeLink attributeId={attributeId} attributes={attributes} />
  ));

  return (
    <Text>
      <Text component="span" fw={700}>
        <LineSubject line={line} modifiers={modifiers} />
      </Text>
      <Text component="span" c="dimmed" mx={6}>
        ›
      </Text>
      {modified}{" "}
      <Text component="span" fw={700} ff="monospace">
        {operator ? operator.symbol : `op ${line.operator ?? "?"}`}
      </Text>{" "}
      {line.modifyingAttributeId === null ? (
        <Text component="span" c="dimmed">
          (no modifying attribute)
        </Text>
      ) : (
        <AttributeLink
          attributeId={line.modifyingAttributeId}
          attributes={attributes}
        />
      )}
      {operator?.suffix && (
        <Text component="span" fw={700} ff="monospace">
          {" "}
          {operator.suffix}
        </Text>
      )}
    </Text>
  );
}

/** The raw SDE rows behind a line, field for field. */
function RawModifiers({
  modifiers,
  attributes,
}: Readonly<{
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  const has = (key: keyof EffectModifier) =>
    modifiers.some((modifier) => modifier[key] !== null);
  const idWithName = (id: number | null, name: string | null | undefined) =>
    id === null ? (
      "—"
    ) : (
      <>
        {id}
        {name ? (
          <Text component="span" c="dimmed" size="xs">
            {" "}
            {name}
          </Text>
        ) : null}
      </>
    );

  return (
    <Table.ScrollContainer minWidth={480}>
      <Table fz="xs" verticalSpacing={4} withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>func</Table.Th>
            <Table.Th>domain</Table.Th>
            <Table.Th>operation</Table.Th>
            {has("modifiedAttributeId") && (
              <Table.Th>modifiedAttributeID</Table.Th>
            )}
            {has("modifyingAttributeId") && (
              <Table.Th>modifyingAttributeID</Table.Th>
            )}
            {has("groupId") && <Table.Th>groupID</Table.Th>}
            {has("skillTypeId") && <Table.Th>skillTypeID</Table.Th>}
            {has("targetEffectId") && <Table.Th>effectID</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {modifiers.map((modifier) => (
            <Table.Tr key={modifier.modifierIndex}>
              <Table.Td>{modifier.modifierIndex}</Table.Td>
              <Table.Td ff="monospace">{modifier.func}</Table.Td>
              <Table.Td ff="monospace">{modifier.domain ?? "—"}</Table.Td>
              <Table.Td ff="monospace">
                {idWithName(
                  modifier.operator,
                  dogmaOperatorInfo(modifier.operator)?.name,
                )}
              </Table.Td>
              {has("modifiedAttributeId") && (
                <Table.Td ff="monospace">
                  {idWithName(
                    modifier.modifiedAttributeId,
                    modifier.modifiedAttributeId === null
                      ? null
                      : attributes.get(modifier.modifiedAttributeId)?.name,
                  )}
                </Table.Td>
              )}
              {has("modifyingAttributeId") && (
                <Table.Td ff="monospace">
                  {idWithName(
                    modifier.modifyingAttributeId,
                    modifier.modifyingAttributeId === null
                      ? null
                      : attributes.get(modifier.modifyingAttributeId)?.name,
                  )}
                </Table.Td>
              )}
              {has("groupId") && (
                <Table.Td ff="monospace">
                  {idWithName(modifier.groupId, modifier.groupName)}
                </Table.Td>
              )}
              {has("skillTypeId") && (
                <Table.Td ff="monospace">
                  {idWithName(modifier.skillTypeId, modifier.skillName)}
                </Table.Td>
              )}
              {has("targetEffectId") && (
                <Table.Td ff="monospace">
                  {idWithName(
                    modifier.targetEffectId,
                    modifier.targetEffectName,
                  )}
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ModifierLineCard({
  line,
  modifiers,
  attributes,
}: Readonly<{
  line: DogmaModifierLine;
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  const [showRaw, setShowRaw] = useState(true);
  const operator = dogmaOperatorInfo(line.operator);
  const count = modifiers.length;

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="xs">
        <ModifierSentence
          line={line}
          modifiers={modifiers}
          attributes={attributes}
        />
        <Group gap="xs" justify="space-between">
          <Group gap={6}>
            {operator && (
              <Badge size="sm" variant="light" color="gray">
                {operator.label}
              </Badge>
            )}
            {count > 1 && (
              <Badge size="sm" variant="light">
                {count} modifiers
              </Badge>
            )}
          </Group>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            onClick={() => setShowRaw((value) => !value)}
          >
            {showRaw ? "Hide raw" : "Show raw"}
          </Button>
        </Group>
        {showRaw && (
          <RawModifiers modifiers={modifiers} attributes={attributes} />
        )}
      </Stack>
    </Paper>
  );
}

interface FlagEntry {
  key: keyof typeof FLAG_LABELS;
  value: boolean;
}

function TypeNameCell({ row }: Readonly<{ row: EffectType }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <TypeAvatar typeId={row.typeId} size="sm" />
      <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
    </Group>
  );
}

function TypeValueCell({
  row,
  attributeId,
  attribute,
}: Readonly<{
  row: EffectType;
  attributeId: number;
  attribute: EffectAttribute | undefined;
}>) {
  const value = row.values[attributeId];
  if (value === undefined) return null;
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <DogmaAttributeValue
        value={value}
        unitId={attribute?.unitId ?? undefined}
        unitSymbol={attribute?.unitSymbol ?? undefined}
      />
      {row.categoryId === SKILL_CATEGORY_ID && (
        <Text size="xs" c="dimmed">
          / level
        </Text>
      )}
    </Group>
  );
}

function PublishedBadge({ published }: Readonly<{ published: boolean }>) {
  return (
    <Badge size="sm" variant="light" color={published ? "teal" : "gray"}>
      {published ? "Yes" : "No"}
    </Badge>
  );
}

const renderTypeName = (row: EffectType) => <TypeNameCell row={row} />;
const renderGroup = (row: EffectType) => (
  <GroupAnchor groupId={row.groupId}>{row.groupName}</GroupAnchor>
);
const renderDefault = (row: EffectType) =>
  row.isDefault ? (
    <Badge size="sm" variant="light">
      Default
    </Badge>
  ) : null;
const renderPublished = (row: EffectType) => (
  <PublishedBadge published={row.published} />
);

const LEADING_TYPE_COLUMNS: DataTableColumn<EffectType>[] = [
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
];

const TRAILING_TYPE_COLUMNS: DataTableColumn<EffectType>[] = [
  {
    id: "isDefault",
    header: "Default",
    accessor: "isDefault",
    sortable: true,
    filter: { type: "boolean" },
    cell: renderDefault,
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

/** A column holding each type's own value for one modifying attribute. */
function valueColumn(
  attributeId: number,
  attribute: EffectAttribute | undefined,
): DataTableColumn<EffectType> {
  return {
    id: `value-${attributeId}`,
    header: attributeLabel(attributeId, attribute),
    accessor: (row) => row.values[attributeId] ?? null,
    sortable: true,
    filter: { type: "range" },
    align: "right",
    cell: (row) => (
      <TypeValueCell
        row={row}
        attributeId={attributeId}
        attribute={attribute}
      />
    ),
  };
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

function EffectHero({
  effectId,
  name,
  displayName,
  published,
  iconId,
  category,
  flagEntries,
  modifierCount,
  typeCount,
}: Readonly<{
  effectId: number;
  name: string | null;
  displayName: string | null;
  published: boolean | null;
  iconId: number | null;
  category: PageProps["category"];
  flagEntries: FlagEntry[];
  modifierCount: number;
  typeCount: number;
}>) {
  const title = displayName ?? name ?? `Effect ${effectId}`;
  return (
    <HeroCard
      artwork={
        iconId === null ? (
          <WindowFittingIcon size={64} alt="" />
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
        {category && (
          <Badge variant="light" color="eve_accent">
            {categoryLabel(category)}
          </Badge>
        )}
        {flagEntries
          .filter(({ value }) => value)
          .map(({ key }) => (
            <Badge key={key} variant="light" color="teal">
              {FLAG_LABELS[key]}
            </Badge>
          ))}
      </Group>
      <Group gap="xl">
        <HeroStat label="Effect ID" value={effectId} />
        <HeroStat label="Modifiers" value={modifierCount} />
        <HeroStat label="Used by" value={plural(typeCount, "type", "types")} />
      </Group>
    </HeroCard>
  );
}

/**
 * CCP's own text wins; our custom description only fills the gap where CCP
 * left nothing, or only its "Automatically generated effect" placeholder.
 */
function EffectDescription({
  description,
  customDescription,
}: Readonly<{ description: string | null; customDescription: string | null }>) {
  const hasOfficialDescription =
    description !== null && description !== BOILERPLATE_DESCRIPTION;

  if (!hasOfficialDescription && customDescription) {
    return (
      <Paper withBorder radius="md" p="md">
        <Stack gap="xs">
          <Text style={{ whiteSpace: "pre-line" }}>{customDescription}</Text>
          <Group gap={6}>
            <Badge size="xs" variant="light" color="gray">
              AI-generated
            </Badge>
            <Text size="xs" c="dimmed">
              Written from this effect&apos;s data, not by CCP. The modifiers
              below are the source of truth.
            </Text>
          </Group>
        </Stack>
      </Paper>
    );
  }
  if (!description) return null;
  return (
    <Paper withBorder radius="md" p="md">
      <Text
        component="div"
        c={description === BOILERPLATE_DESCRIPTION ? "dimmed" : undefined}
      >
        <MailMessageViewer content={sanitizeFormattedEveString(description)} />
      </Text>
    </Paper>
  );
}

function StatsUsedSection({
  stats,
  attributes,
}: Readonly<{
  stats: PageProps["stats"];
  attributes: Map<number, EffectAttribute>;
}>) {
  const entries = (Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[])
    .map((key) => ({ key, attributeId: stats[key] }))
    .filter(
      (
        entry,
      ): entry is { key: keyof typeof STAT_LABELS; attributeId: number } =>
        entry.attributeId !== null,
    );
  if (entries.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowAttributesIcon size={18} alt="" />}>
        Stats used
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
        {entries.map(({ key, attributeId }) => (
          <StatCard
            key={key}
            label={STAT_LABELS[key]}
            value={
              <AttributeLink
                attributeId={attributeId}
                attributes={attributes}
              />
            }
            sub={attributes.get(attributeId)?.name ?? undefined}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function ModifiersSection({
  modifiers,
  attributes,
}: Readonly<{
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  const lines = useMemo(() => groupDogmaModifiers(modifiers), [modifiers]);
  const byIndex = useMemo(
    () =>
      new Map(modifiers.map((modifier) => [modifier.modifierIndex, modifier])),
    [modifiers],
  );
  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowFittingIcon size={18} alt="" />}>
        Modifiers
      </SectionHeading>
      {lines.length === 0 ? (
        <Text c="dimmed" size="sm">
          This effect has no modifiers. Whatever it does is implemented in the
          game itself rather than described by data.
        </Text>
      ) : (
        lines.map((line) => (
          <ModifierLineCard
            key={line.key}
            line={line}
            modifiers={line.modifiers.flatMap((modifier) => {
              const full = byIndex.get(modifier.modifierIndex);
              return full ? [full] : [];
            })}
            attributes={attributes}
          />
        ))
      )}
    </Stack>
  );
}

function TargetedBySection({
  targetedBy,
}: Readonly<{ targetedBy: PageProps["targetedBy"] }>) {
  if (targetedBy.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowRestrictionIcon size={18} alt="" />}>
        Targeted by
      </SectionHeading>
      <Paper withBorder radius="md" p="sm">
        <Stack gap={6}>
          {targetedBy.map((entry) => (
            <Group key={entry.effectId} gap="xs">
              <Badge size="sm" variant="light" color="gray">
                {entry.func === "EffectStopper" ? "Stopped by" : "Modified by"}
              </Badge>
              <DogmaEffectAnchor effectId={entry.effectId}>
                {entry.name ?? `Effect ${entry.effectId}`}
              </DogmaEffectAnchor>
              <Text size="xs" c="dimmed">
                on the {dogmaDomainNoun(entry.domain)}
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function TypesSection({
  types,
  modifiers,
  attributes,
}: Readonly<{
  types: EffectType[];
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  const columns = useMemo((): DataTableColumn<EffectType>[] => {
    // One column per modifying attribute some type actually has a value for.
    const ids = new Set<number>();
    for (const { modifyingAttributeId: id } of modifiers) {
      if (id !== null && types.some((type) => type.values[id] !== undefined)) {
        ids.add(id);
      }
    }
    return [
      ...LEADING_TYPE_COLUMNS,
      ...[...ids].map((id) => valueColumn(id, attributes.get(id))),
      ...TRAILING_TYPE_COLUMNS,
    ];
  }, [modifiers, types, attributes]);

  const groupCount = useMemo(
    () => new Set(types.map((type) => type.groupId)).size,
    [types],
  );

  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowItemsIcon size={18} alt="" />}>
        Types
      </SectionHeading>
      {types.length === 0 ? (
        <Text c="dimmed" size="sm">
          No item uses this effect.
        </Text>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {plural(types.length, "type", "types")} in{" "}
            {plural(groupCount, "group", "groups")} carry this effect.
          </Text>
          <DataTable
            data={types}
            columns={columns}
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
        </>
      )}
    </Stack>
  );
}

/** Every raw field, with the flags as Yes/No. */
function effectDetails(
  props: Readonly<PageProps>,
  flagEntries: FlagEntry[],
): { label: string; value: ReactNode }[] {
  const { effectId, name, displayName, category, guid } = props;
  const optional = (label: string, value: number | null) =>
    value === null ? [] : [{ label, value }];
  return [
    { label: "Effect ID", value: effectId },
    ...(name ? [{ label: "Name", value: <Code>{name}</Code> }] : []),
    ...(displayName ? [{ label: "Display name", value: displayName }] : []),
    ...(category
      ? [
          {
            label: "Category",
            value: (
              <>
                {categoryLabel(category)}{" "}
                <Text component="span" c="dimmed" size="sm">
                  ({category.effectCategoryId})
                </Text>
              </>
            ),
          },
        ]
      : []),
    ...flagEntries.map(({ key, value }) => ({
      label: FLAG_LABELS[key],
      value: <YesNoBadge value={value} />,
    })),
    ...(guid ? [{ label: "GUID", value: <Code>{guid}</Code> }] : []),
    ...optional("Distribution", props.distribution),
    ...optional("Icon ID", props.iconId),
    ...optional("Pre-expression", props.preExpression),
    ...optional("Post-expression", props.postExpression),
  ];
}

export default function DogmaEffectPage(props: Readonly<PageProps>) {
  const { attributes, flags, modifiers, types } = props;
  const attributeMap = useMemo(
    () =>
      new Map(
        attributes.map((attribute) => [attribute.attributeId, attribute]),
      ),
    [attributes],
  );
  const flagEntries = (
    Object.keys(FLAG_LABELS) as (keyof typeof FLAG_LABELS)[]
  ).flatMap((key) => {
    const value = flags[key];
    return value === null ? [] : [{ key, value }];
  });

  return (
    <Container size="lg">
      <Stack gap="lg">
        <EffectHero
          effectId={props.effectId}
          name={props.name}
          displayName={props.displayName}
          published={props.published}
          iconId={props.iconId}
          category={props.category}
          flagEntries={flagEntries}
          modifierCount={modifiers.length}
          typeCount={types.length}
        />
        <EffectDescription
          description={props.description}
          customDescription={props.customDescription}
        />
        <StatsUsedSection stats={props.stats} attributes={attributeMap} />
        <ModifiersSection modifiers={modifiers} attributes={attributeMap} />
        <TargetedBySection targetedBy={props.targetedBy} />
        <TypesSection
          types={types}
          modifiers={modifiers}
          attributes={attributeMap}
        />
        <Stack gap="sm">
          <SectionHeading icon={<WindowInfoIcon size={18} alt="" />}>
            Details
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
            {effectDetails(props, flagEntries).map((detail) => (
              <StatCard
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
