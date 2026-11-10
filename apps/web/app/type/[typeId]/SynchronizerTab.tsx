"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Group,
  List,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";

import { CategoryRiggingIcon, SystemFittingIcon } from "@jitaspace/eve-icons";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { formatDogmaAttributeValue } from "@jitaspace/ui";

import type {
  SynchronizerAttribute,
  SynchronizerModule,
  SynchronizerRig,
  SynchronizerTarget,
  TypeSynchronizer,
} from "~/lib/synchronizer";
import { DogmaAttributeAnchor, TypeAnchor } from "~/components/Anchor";
import { SectionHeading } from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import {
  perModuleAmount,
  synchronizedValue,
  synchronizerCounter,
  synchronizerTrend,
  synchronizerZeroAt,
} from "~/lib/synchronizer";

/** A ship has at most eight slots in each of its high, medium and low racks. */
const MAX_MODULES = 24;
const SLIDER_MARKS = [0, 4, 8, 12, 16, 20, 24].map((value) => ({
  value,
  label: String(value),
}));

const formatValue = (attribute: SynchronizerAttribute, value: number) =>
  formatDogmaAttributeValue(value, {
    unitId: attribute.unitId,
    symbol: attribute.unitSymbol,
  });

/** Percentage points, signed: "+3", "−2". */
const formatPoints = (points: number) => {
  const rounded = Math.round(points * 100) / 100;
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
};

function AttributeCell({
  attribute,
}: Readonly<{ attribute: SynchronizerAttribute }>) {
  return (
    <Stack gap={2}>
      <DogmaAttributeAnchor attributeId={attribute.attributeId}>
        {attribute.name}
      </DogmaAttributeAnchor>
      {attribute.appliesTo && (
        <Group gap={6} align="flex-start" wrap="nowrap">
          <Text component="div" size="xs" c="dimmed">
            <MailMessageViewer
              content={sanitizeFormattedEveString(attribute.appliesTo.text)}
            />
          </Text>
          {attribute.appliesTo.source === "ai" && (
            <Tooltip
              label="AI-generated from this effect's data, not written by CCP"
              withArrow
            >
              <Badge
                size="xs"
                variant="light"
                color="gray"
                style={{ flexShrink: 0, cursor: "help" }}
              >
                AI
              </Badge>
            </Tooltip>
          )}
        </Group>
      )}
    </Stack>
  );
}

function ScalingTable({
  rig,
  moduleCount,
}: Readonly<{ rig: SynchronizerRig; moduleCount: number }>) {
  const perModule = perModuleAmount(rig.modules);
  const counter = synchronizerCounter(rig.modules, moduleCount);
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Bonus</Table.Th>
            <Table.Th ta="right">Rig alone</Table.Th>
            <Table.Th ta="right">
              With {moduleCount} module{moduleCount === 1 ? "" : "s"}
            </Table.Th>
            <Table.Th ta="right">Per module</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rig.scaling.map((attribute) => {
            const direction = attribute.direction ?? 1;
            const trend = synchronizerTrend(
              attribute.base,
              perModule,
              direction,
            );
            const zeroAt = synchronizerZeroAt(
              attribute.base,
              perModule,
              direction,
            );
            const value = synchronizedValue(attribute.base, counter, direction);
            return (
              <Table.Tr key={attribute.attributeId}>
                <Table.Td>
                  <AttributeCell attribute={attribute} />
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {formatValue(attribute, attribute.base)}
                </Table.Td>
                <Table.Td
                  ta="right"
                  ff="monospace"
                  fw={700}
                  c={trend === "grows" ? "teal" : "orange"}
                >
                  {formatValue(attribute, value)}
                </Table.Td>
                <Table.Td ta="right">
                  {trend === "grows" ? (
                    <Text span ff="monospace" c="teal">
                      {formatPoints(direction * perModule)}
                    </Text>
                  ) : (
                    <Tooltip
                      multiline
                      w={280}
                      withArrow
                      label={`Each module moves this ${formatPoints(direction * perModule)} towards zero, so it gets weaker. From ${zeroAt} modules it turns into a penalty.`}
                    >
                      <Badge
                        variant="light"
                        color="orange"
                        style={{ cursor: "help" }}
                      >
                        weakens
                      </Badge>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function FixedTable({ rig }: Readonly<{ rig: SynchronizerRig }>) {
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Attribute</Table.Th>
            <Table.Th ta="right">Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rig.fixed.map((attribute) => (
            <Table.Tr key={attribute.attributeId}>
              <Table.Td>
                <AttributeCell attribute={attribute} />
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {formatValue(attribute, attribute.base)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ModuleGroups({
  modules,
}: Readonly<{ modules: SynchronizerModule[] }>) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, SynchronizerModule[]>();
    for (const item of modules) {
      const list = byGroup.get(item.groupName) ?? [];
      list.push(item);
      byGroup.set(item.groupName, list);
    }
    return [...byGroup.entries()];
  }, [modules]);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
      {groups.map(([groupName, members]) => (
        <Paper key={groupName} withBorder radius="md" p="sm">
          <Stack gap={6}>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text fw={600} size="sm">
                {groupName}
              </Text>
              <Badge variant="light" color="gray" size="sm">
                {members.length}
              </Badge>
            </Group>
            <List size="sm" spacing={2} listStyleType="none">
              {members.map((item) => (
                <List.Item key={item.typeId}>
                  <TypeAnchor typeId={item.typeId}>{item.name}</TypeAnchor>
                </List.Item>
              ))}
            </List>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

function RigPanel({ rig }: Readonly<{ rig: SynchronizerRig }>) {
  const [moduleCount, setModuleCount] = useState(4);
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading
          icon={<CategoryRiggingIcon size={18} color="currentColor" alt="" />}
        >
          How it scales
        </SectionHeading>
        <Paper withBorder radius="md" p="md" pb="xl">
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Matching modules fitted: {moduleCount}
            </Text>
            <Slider
              value={moduleCount}
              onChange={setModuleCount}
              min={0}
              max={MAX_MODULES}
              step={1}
              marks={SLIDER_MARKS}
              label={(value) => `${value} module${value === 1 ? "" : "s"}`}
              aria-label="Matching modules fitted"
            />
          </Stack>
        </Paper>
        <ScalingTable rig={rig} moduleCount={moduleCount} />
      </Stack>

      {rig.fixed.length > 0 && (
        <Stack gap="sm">
          <SectionHeading
            icon={<SystemFittingIcon size={18} color="currentColor" alt="" />}
          >
            Does not scale
          </SectionHeading>
          <Text size="sm" c="dimmed">
            The rig&apos;s penalties and its CPU drawback stay the same however
            many matching modules you fit.
          </Text>
          <FixedTable rig={rig} />
        </Stack>
      )}

      <Stack gap="sm">
        <SectionHeading
          icon={<SystemFittingIcon size={18} color="currentColor" alt="" />}
        >
          Matching modules ({rig.modules.length})
        </SectionHeading>
        <ModuleGroups modules={rig.modules} />
      </Stack>
    </Stack>
  );
}

function TargetsPanel({
  targets,
}: Readonly<{ targets: SynchronizerTarget[] }>) {
  return (
    <Stack gap="sm">
      <SectionHeading
        icon={<CategoryRiggingIcon size={18} color="currentColor" alt="" />}
      >
        Powers these Synchronizer rigs
      </SectionHeading>
      <Text size="sm">
        Fitting this module makes every bonus of a matching Synchronizer rig on
        the same ship {Math.abs(targets[0]?.amount ?? 1)} percentage point
        {Math.abs(targets[0]?.amount ?? 1) === 1 ? "" : "s"} stronger, whether
        the module is online or not.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        {targets.map((target) => (
          <Paper key={target.typeId} withBorder radius="md" p="sm">
            <Stack gap={2}>
              <TypeAnchor typeId={target.typeId} fw={600}>
                {target.name}
              </TypeAnchor>
              <Text size="xs" c="dimmed">
                {formatPoints(target.amount)} to {target.counterName}
              </Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/** The type page's Synchronizer tab: a rig's scaling, or a module's rigs. */
export function SynchronizerTab({
  synchronizer,
}: Readonly<{ synchronizer: TypeSynchronizer }>) {
  return (
    <Stack gap="xl">
      {synchronizer.rig && <RigPanel rig={synchronizer.rig} />}
      {synchronizer.countsTowards.length > 0 && (
        <TargetsPanel targets={synchronizer.countsTowards} />
      )}
    </Stack>
  );
}
