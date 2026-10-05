"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Breadcrumbs,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconGitBranch,
  IconHistory,
  IconInfoCircle,
  IconListNumbers,
  IconRoute,
  IconUsers,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { FactionAnchor } from "@jitaspace/eve-components";
import {
  EveIconAvatar,
  FactionAvatar,
  ISKAmount,
  MissionAnchor,
} from "@jitaspace/ui";

import type { EpicArc, EpicArcStep } from "~/lib/epicArcs";
import type { MissionKind } from "~/lib/missions";
import { HeroStat, SectionHeading, StatCard } from "~/components/EntityPage";
import {
  AgentLabel,
  EpicArcStepsTable,
  HeroImage,
  notAvailableText,
} from "~/components/Missions";
import { epicArcAgents, epicArcShape, isRepeatable } from "~/lib/epicArcs";
import { formatMinutes } from "~/lib/missions";
import { EntityHistory } from "../../history/EntityHistory";
import {
  DEFAULT_EPIC_ARC_PAGE_TAB,
  EPIC_ARC_PAGE_TABS,
  isEpicArcPageTab,
} from "./tabs";

/** Singular and plural noun for each kind of step. */
const KIND_NOUNS: [MissionKind, string, string][] = [
  ["kill", "encounter", "encounters"],
  ["courier", "courier run", "courier runs"],
  ["other", "talk-to step", "talk-to steps"],
];

/** "40 encounters · 12 courier runs · 12 talk-to steps", leaving out none. */
function kindBreakdown(steps: readonly EpicArcStep[]): string {
  return KIND_NOUNS.map(([kind, one, many]) => {
    const count = steps.filter((step) => step.kind === kind).length;
    if (count === 0) return null;
    return `${count} ${count === 1 ? one : many}`;
  })
    .filter(Boolean)
    .join(" · ");
}

function restartText(arc: EpicArc): string {
  return isRepeatable(arc.arcRestartInterval)
    ? `Every ${formatMinutes(arc.arcRestartInterval ?? 0)}`
    : "Not on a timer";
}

function FactionLabel({ arc }: Readonly<{ arc: EpicArc }>) {
  if (!arc.faction) return <>{notAvailableText}</>;
  return (
    <Group gap={6} wrap="nowrap">
      <FactionAvatar factionId={arc.faction.factionId} size="sm" />
      <FactionAnchor factionId={arc.faction.factionId}>
        {arc.faction.name ?? `Faction ${arc.faction.factionId}`}
      </FactionAnchor>
    </Group>
  );
}

function EpicArcHero({ arc }: Readonly<{ arc: EpicArc }>) {
  const agents = epicArcAgents(arc.steps).length;
  const { endings } = epicArcShape(arc.steps);
  const chapters = arc.steps.filter((step) => step.chapterTitle).length;
  return (
    <Paper withBorder radius="md" p="lg">
      <Group align="flex-start" gap="xl" wrap="wrap">
        <HeroImage>
          <EveIconAvatar iconId={arc.iconId} size={96} radius={0} />
        </HeroImage>
        <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
          <Group gap="sm" align="center">
            <Title order={2}>{arc.name}</Title>
            <Badge variant="light" color="grape" size="md">
              Epic Arc
            </Badge>
            {isRepeatable(arc.arcRestartInterval) && (
              <Badge variant="light" size="md">
                Repeatable
              </Badge>
            )}
            <Badge variant="light" color="gray" size="md">
              ID {arc.epicArcId}
            </Badge>
          </Group>
          {arc.faction && <FactionLabel arc={arc} />}
          <Group gap="xl">
            <HeroStat label="Missions" value={arc.steps.length} />
            <HeroStat label="Agents" value={agents} />
            {chapters > 0 && <HeroStat label="Chapters" value={chapters} />}
            <HeroStat label="Endings" value={endings.length} />
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

/** A step, linked, with the agent who hands it out. */
function StepWithAgent({
  step,
  extra,
}: Readonly<{ step: EpicArcStep; extra?: ReactNode }>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Group gap="xs">
          <MissionAnchor missionId={step.missionId} fw={600}>
            {step.name ?? `Mission ${step.missionId}`}
          </MissionAnchor>
          {step.chapterTitle && (
            <Text size="xs" c="dimmed">
              {step.chapterTitle}
            </Text>
          )}
        </Group>
        {step.agent && <AgentLabel agent={step.agent} />}
        {extra}
      </Stack>
    </Paper>
  );
}

function EpicArcOverview({ arc }: Readonly<{ arc: EpicArc }>) {
  const byId = useMemo(
    () => new Map(arc.steps.map((step) => [step.missionId, step])),
    [arc.steps],
  );
  const shape = useMemo(() => epicArcShape(arc.steps), [arc.steps]);
  const stepsOf = (ids: number[]) =>
    ids.flatMap((id) => {
      const step = byId.get(id);
      return step ? [step] : [];
    });
  const totalIsk = arc.steps.reduce(
    (sum, step) => sum + (step.rewardIsk ?? 0),
    0,
  );
  const chapters = arc.steps.filter((step) => step.chapterTitle).length;

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconInfoCircle size={18} />}>
          Epic Arc
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <StatCard label="Epic Arc ID" value={arc.epicArcId} />
          <StatCard label="Faction" value={<FactionLabel arc={arc} />} />
          <StatCard
            label="Missions"
            value={arc.steps.length}
            sub={kindBreakdown(arc.steps)}
          />
          <StatCard label="Agents" value={epicArcAgents(arc.steps).length} />
          <StatCard
            label="Chapters"
            value={chapters === 0 ? notAvailableText : chapters}
          />
          <StatCard label="Repeatable" value={restartText(arc)} />
          <StatCard
            label="Choices"
            value={shape.branchPoints.length}
            sub="steps that lead to more than one next mission"
          />
          <StatCard label="Endings" value={shape.endings.length} />
          <StatCard
            label="ISK Across All Steps"
            value={<ISKAmount amount={totalIsk} span />}
            sub="every branch counted; one run plays only some"
          />
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeading icon={<IconRoute size={18} />}>
          Where It Starts
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {stepsOf(shape.starts).map((step) => (
            <StepWithAgent key={step.missionId} step={step} />
          ))}
        </SimpleGrid>
      </Stack>

      {shape.branchPoints.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconGitBranch size={18} />}>
            Where It Branches
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {stepsOf(shape.branchPoints).map((step) => (
              <StepWithAgent
                key={step.missionId}
                step={step}
                extra={
                  <Text size="sm">
                    Leads to{" "}
                    {stepsOf(step.nextMissionIds).map((next, index) => (
                      <span key={next.missionId}>
                        {index > 0 && " or "}
                        <MissionAnchor missionId={next.missionId} size="sm">
                          {next.name ?? `Mission ${next.missionId}`}
                        </MissionAnchor>
                      </span>
                    ))}
                  </Text>
                }
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}

      <Stack gap="sm">
        <SectionHeading icon={<IconListNumbers size={18} />}>
          Where It Ends
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {stepsOf(shape.endings).map((step) => (
            <StepWithAgent key={step.missionId} step={step} />
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}

function EpicArcAgentsTable({ arc }: Readonly<{ arc: EpicArc }>) {
  const agents = useMemo(() => epicArcAgents(arc.steps), [arc.steps]);
  const names = new Map(arc.steps.map((step) => [step.missionId, step.name]));
  return (
    <Paper withBorder radius="md" p="sm" style={{ overflowX: "auto" }}>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Agent</Table.Th>
            <Table.Th ta="right">Missions</Table.Th>
            <Table.Th>First Mission</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {agents.map(({ agent, stepCount, firstMissionId }) => (
            <Table.Tr key={agent.characterId}>
              <Table.Td>
                <AgentLabel agent={agent} />
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {stepCount}
              </Table.Td>
              <Table.Td>
                <MissionAnchor missionId={firstMissionId} size="sm">
                  {names.get(firstMissionId) ?? `Mission ${firstMissionId}`}
                </MissionAnchor>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

export default function EpicArcPage({ arc }: Readonly<{ arc: EpicArc }>) {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(EPIC_ARC_PAGE_TABS)
      .withDefault(DEFAULT_EPIC_ARC_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} href="/epic-arcs" size="sm">
            Epic Arcs
          </Anchor>
          <Text size="sm">{arc.name}</Text>
        </Breadcrumbs>

        <EpicArcHero arc={arc} />

        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (isEpicArcPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<IconInfoCircle size={16} />}
            >
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="missions" leftSection={<IconRoute size={16} />}>
              Missions ({arc.steps.length})
            </Tabs.Tab>
            <Tabs.Tab value="agents" leftSection={<IconUsers size={16} />}>
              Agents
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <EpicArcOverview arc={arc} />
          </Tabs.Panel>

          <Tabs.Panel value="missions" pt="lg">
            <EpicArcStepsTable steps={arc.steps} />
          </Tabs.Panel>

          <Tabs.Panel value="agents" pt="lg">
            <EpicArcAgentsTable arc={arc} />
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="lg">
            <EntityHistory
              entityType="epicArc"
              entityId={arc.epicArcId}
              embedded
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
