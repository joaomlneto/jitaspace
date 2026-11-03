"use client";

import { memo } from "react";
import { Badge, Box, Group, List, Stack, Text } from "@mantine/core";

import type { FreelanceJobDetails } from "@jitaspace/hooks";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { useGroup, useStructure } from "@jitaspace/hooks";
import { EveEntityNameDisplay } from "@jitaspace/ui";

import type { DescribedParameter, ParameterValueGroup } from "./freelanceJobs";
import { EveEntityAnchor, GroupAnchor } from "~/components/Anchor";
import { describeParameters, parameterValueKind } from "./freelanceJobs";

/** Entities with a picture worth showing beside their name. */
const AVATAR_CATEGORIES = new Set([
  "alliance",
  "character",
  "corporation",
  "faction",
  "inventory_type",
]);

function GroupNameAnchor({ groupId }: Readonly<{ groupId: number }>) {
  const { data } = useGroup(groupId);
  return (
    <GroupAnchor groupId={groupId} size="sm">
      {data?.data.name ?? `Group ${groupId}`}
    </GroupAnchor>
  );
}

/**
 * A player structure's name needs a token whose character can dock there, so
 * most visitors cannot read it. Name it by id then, rather than "Unknown".
 */
function StructureValueName({
  structureId,
}: Readonly<{ structureId: number }>) {
  const { data, isLoading } = useStructure(structureId);
  return (
    <EveEntityNameDisplay
      span
      name={data?.data.name ?? `Structure ${structureId}`}
      loading={isLoading}
    />
  );
}

function ParameterValue({
  valueType,
  value,
}: Readonly<{ valueType: string; value: string }>) {
  const kind = parameterValueKind(valueType);
  const id = Number(value);

  // An id ESI sent in a form we cannot read is shown as it came, rather than
  // linking to /character/NaN and asking ESI for it.
  if (kind.kind === "other" || !Number.isSafeInteger(id)) {
    return (
      <Text size="sm" span>
        {kind.kind === "other" ? `${kind.label} ${value}` : value}
      </Text>
    );
  }
  if (kind.kind === "group") return <GroupNameAnchor groupId={id} />;

  const { category } = kind;
  return (
    <Group gap={6} wrap="nowrap" component="span">
      {AVATAR_CATEGORIES.has(category) && (
        <EveEntityAvatar entityId={id} category={category} size={20} />
      )}
      <EveEntityAnchor entityId={id} category={category} size="sm">
        {category === "structure" ? (
          <StructureValueName structureId={id} />
        ) : (
          <EveEntityName span entityId={id} category={category} />
        )}
      </EveEntityAnchor>
    </Group>
  );
}

function ValueGroups({
  groups,
  anyText,
}: Readonly<{ groups: ParameterValueGroup[]; anyText: string }>) {
  if (groups.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        {anyText}
      </Text>
    );
  }
  return (
    <List size="sm" spacing="xs" listStyleType="none" withPadding={false}>
      {groups.flatMap((group) =>
        group.values.map((value) => (
          <List.Item key={`${group.valueType}:${value}`}>
            <ParameterValue valueType={group.valueType} value={value} />
          </List.Item>
        )),
      )}
    </List>
  );
}

function ParameterBody({
  parameter,
}: Readonly<{ parameter: DescribedParameter }>) {
  switch (parameter.kind) {
    case "matcher":
      return <ValueGroups groups={parameter.groups} anyText="Any" />;
    case "boolean":
      return <Text size="sm">{parameter.value ? "Yes" : "No"}</Text>;
    case "options":
      return (
        <Group gap={4}>
          {parameter.selected.map((option) => (
            <Badge key={option} variant="default" size="sm" radius="sm">
              {option}
            </Badge>
          ))}
        </Group>
      );
    case "delivery":
      return (
        <Stack gap="xs">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Items
            </Text>
            <ValueGroups groups={parameter.items} anyText="Any item" />
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Deliver to
            </Text>
            <ValueGroups
              groups={parameter.locations}
              anyText="Any corporation office"
            />
          </div>
        </Stack>
      );
    case "unknown":
      return (
        <Text size="sm" c="dimmed" fs="italic">
          Not shown by ESI in a form we can read
        </Text>
      );
  }
}

/**
 * What a participant has to do: the job's parameters, as a description list.
 * The delivery parameter is the job's whole requirement, so it gets no label
 * of its own.
 */
export const FreelanceJobRequirements = memo(
  ({
    configuration,
  }: Readonly<{ configuration: FreelanceJobDetails["configuration"] }>) => {
    const parameters = describeParameters(configuration);
    if (parameters.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          This job sets no conditions.
        </Text>
      );
    }
    return (
      <Stack component="dl" gap="sm" m={0}>
        {parameters.map((parameter) => (
          <div key={parameter.key}>
            <Text component="dt" size="sm" fw={600}>
              {parameter.label}
            </Text>
            <Box component="dd" m={0} mt={2}>
              <ParameterBody parameter={parameter} />
            </Box>
          </div>
        ))}
      </Stack>
    );
  },
);
FreelanceJobRequirements.displayName = "FreelanceJobRequirements";
