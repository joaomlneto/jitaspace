"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Avatar,
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
  IconBook,
  IconCoin,
  IconHistory,
  IconInfoCircle,
  IconMessages,
  IconRoute,
  IconTarget,
  IconUser,
  IconVersions,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { DataTableColumn } from "@jitaspace/datatable";
import { FactionAnchor } from "@jitaspace/eve-components";
import { useSelectedCharacter } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  DungeonAnchor,
  EpicArcAnchor,
  EveIconAvatar,
  FactionAvatar,
  MissionAnchor,
} from "@jitaspace/ui";

import type { MissionDetail, MissionVariant } from "./data";
import type { EpicArc } from "~/lib/epicArcs";
import type { CorporationRef, FactionRef, TypeRef } from "~/lib/missionRefs";
import type { MissionMessageSpeaker, MissionTextValues } from "~/lib/missions";
import { DataTable } from "~/components/DataTable";
import { HeroStat, SectionHeading, StatCard } from "~/components/EntityPage";
import {
  AgentLabel,
  BooleanBadge,
  EpicArcStepsTable,
  HeroImage,
  MissionKindBadge,
  MissionText,
  notAvailableText,
  TypeRefLabel,
} from "~/components/Missions";
import { isRepeatable } from "~/lib/epicArcs";
import {
  formatExpiration,
  formatMinutes,
  ISK_TYPE_ID,
  MISSION_KIND_LABELS,
  missionMessageSlot,
} from "~/lib/missions";
import { EntityHistory } from "../../history/EntityHistory";
import {
  DEFAULT_MISSION_PAGE_TAB,
  isMissionPageTab,
  MISSION_PAGE_TABS,
} from "./tabs";

function FactionLabel({ faction }: Readonly<{ faction: FactionRef }>) {
  return (
    <Group gap={6} wrap="nowrap">
      <FactionAvatar factionId={faction.factionId} size="sm" />
      <FactionAnchor factionId={faction.factionId}>
        {faction.name ?? `Faction ${faction.factionId}`}
      </FactionAnchor>
    </Group>
  );
}

function CorporationLabel({
  corporation,
}: Readonly<{ corporation: CorporationRef }>) {
  return (
    <Group gap={6} wrap="nowrap">
      <CorporationAvatar corporationId={corporation.corporationId} size="sm" />
      <CorporationAnchor corporationId={corporation.corporationId}>
        {corporation.name ?? `Corporation ${corporation.corporationId}`}
      </CorporationAnchor>
    </Group>
  );
}

function DungeonLabel({
  dungeonId,
  name,
}: Readonly<{ dungeonId: number; name: string | null }>) {
  return (
    <DungeonAnchor dungeonId={dungeonId}>
      {name ?? `Dungeon ${dungeonId}`}
    </DungeonAnchor>
  );
}

/** A labelled block of mission text, framed. */
function TextPanel({
  title,
  text,
  values,
}: Readonly<{ title?: ReactNode; text: string; values: MissionTextValues }>) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="xs">
        {title !== undefined && (
          <Text fw={700} size="sm">
            {title}
          </Text>
        )}
        <MissionText text={text} values={values} />
      </Stack>
    </Paper>
  );
}

const SPEAKER_LABELS: Record<MissionMessageSpeaker, string | null> = {
  agent: "Agent",
  pilot: "You",
  text: null,
};

/** Whose portrait a line gets; `null` draws the generic one. */
const SPEAKER_AVATAR: Record<
  MissionMessageSpeaker,
  (ids: { agentId: number | null; pilotId: number | null }) => number | null
> = {
  agent: ({ agentId }) => agentId,
  pilot: ({ pilotId }) => pilotId,
  text: () => null,
};

/** One line of the agent conversation: the agent on the left, the pilot on the right. */
function DialogueLine({
  speaker,
  label,
  text,
  values,
  agentId,
  pilotId,
}: Readonly<{
  speaker: "agent" | "pilot" | "text";
  label: string;
  text: string;
  values: MissionTextValues;
  agentId: number | null;
  pilotId: number | null;
}>) {
  const isPilot = speaker === "pilot";
  const avatarId = SPEAKER_AVATAR[speaker]({ agentId, pilotId });
  const avatar =
    avatarId === null ? (
      <Avatar size="md" radius="xl">
        <IconUser size={18} />
      </Avatar>
    ) : (
      <CharacterAvatar characterId={avatarId} size="md" radius="xl" />
    );
  return (
    <Group
      align="flex-start"
      gap="sm"
      wrap="nowrap"
      style={{ flexDirection: isPilot ? "row-reverse" : "row" }}
    >
      {avatar}
      <Paper
        withBorder
        radius="md"
        p="sm"
        maw="85%"
        style={{
          background: isPilot
            ? "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
            : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
        }}
      >
        <Stack gap={4}>
          <Text
            size="xs"
            c="dimmed"
            tt="uppercase"
            fw={700}
            style={{ letterSpacing: "0.05em" }}
            ta={isPilot ? "right" : "left"}
          >
            {[SPEAKER_LABELS[speaker], label].filter(Boolean).join(" · ")}
          </Text>
          <MissionText text={text} values={values} />
        </Stack>
      </Paper>
    </Group>
  );
}

function EpicArcPanel({
  arc,
  missionId,
}: Readonly<{ arc: EpicArc; missionId: number }>) {
  const position = arc.steps.findIndex((step) => step.missionId === missionId);
  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group gap="md" align="center">
          <EveIconAvatar iconId={arc.iconId} size="lg" radius="sm" />
          <Stack gap={2}>
            <EpicArcAnchor epicArcId={arc.epicArcId}>
              <Title order={3}>{arc.name}</Title>
            </EpicArcAnchor>
            <Group gap="xs">
              {arc.faction && <FactionLabel faction={arc.faction} />}
              <Badge variant="light" color="gray">
                {arc.steps.length} missions
              </Badge>
              {position !== -1 && (
                <Badge variant="light">
                  This is step {position + 1} of {arc.steps.length}
                </Badge>
              )}
              {isRepeatable(arc.arcRestartInterval) && (
                <Badge variant="light" color="grape">
                  Repeatable every {formatMinutes(arc.arcRestartInterval ?? 0)}
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>
      </Paper>
      <EpicArcStepsTable steps={arc.steps} currentMissionId={missionId} />
    </Stack>
  );
}

/** A mission's messages, split into the sections the tabs show. */
function groupMessages(messages: MissionDetail["messages"]) {
  const slotted = messages.map((message) => ({
    ...message,
    slot: missionMessageSlot(message.key),
  }));
  const textOf = (key: string) =>
    slotted.find((message) => message.key === key)?.text;

  const dialogueStages = new Map<string, typeof slotted>();
  // Mails come in header/body pairs sharing one label.
  const mailPairs = new Map<string, { header?: string; body?: string }>();
  for (const message of slotted) {
    if (message.slot.section === "dialogue") {
      const stage = message.slot.stage ?? "Other";
      dialogueStages.set(stage, [
        ...(dialogueStages.get(stage) ?? []),
        message,
      ]);
    } else if (message.slot.section === "mail") {
      const pair = mailPairs.get(message.slot.label) ?? {};
      if (message.key.endsWith("header")) pair.header = message.text;
      else pair.body = message.text;
      mailPairs.set(message.slot.label, pair);
    }
  }

  return {
    briefing: textOf("messages.mission.briefing"),
    extraInfoHeader: textOf("messages.mission.extrainfo.header"),
    extraInfoBody: textOf("messages.mission.extrainfo.body"),
    journal: slotted.filter((message) => message.slot.section === "journal"),
    dialogueStages: [...dialogueStages.entries()],
    mailPairs: [...mailPairs.entries()],
  };
}

const variantColumns: DataTableColumn<MissionVariant>[] = [
  {
    id: "missionId",
    header: "ID",
    accessor: "missionId",
    sortable: true,
    width: 90,
    cell: (row) => (
      <MissionAnchor missionId={row.missionId}>{row.missionId}</MissionAnchor>
    ),
  },
  {
    id: "kind",
    header: "Type",
    accessor: (row) => MISSION_KIND_LABELS[row.kind],
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => <MissionKindBadge kind={row.kind} />,
  },
  {
    id: "faction",
    header: "Faction",
    accessor: (row) => row.faction?.name ?? null,
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.faction ? <FactionLabel faction={row.faction} /> : null,
  },
  {
    id: "corporation",
    header: "Corporation",
    accessor: (row) => row.corporation?.name ?? null,
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.corporation ? (
        <CorporationLabel corporation={row.corporation} />
      ) : null,
  },
  {
    id: "dungeon",
    header: "Dungeon",
    accessor: "dungeonId",
    sortable: true,
    cell: (row) =>
      row.dungeonId === null ? null : (
        <DungeonAnchor dungeonId={row.dungeonId}>{row.dungeonId}</DungeonAnchor>
      ),
  },
  {
    id: "objective",
    header: "Objective",
    accessor: (row) => row.objective?.type.name ?? null,
    sortable: true,
    cell: (row) =>
      row.objective ? (
        <TypeRefLabel
          type={row.objective.type}
          quantity={row.objective.quantity}
          size="xs"
        />
      ) : null,
  },
  {
    id: "reward",
    header: "Reward",
    accessor: (row) =>
      row.reward?.type.typeId === ISK_TYPE_ID
        ? row.reward.quantity
        : (row.reward?.type.name ?? null),
    sortable: true,
    cell: (row) =>
      row.reward ? (
        <TypeRefLabel
          type={row.reward.type}
          quantity={row.reward.quantity}
          size="xs"
        />
      ) : null,
  },
];

type MessageGroups = ReturnType<typeof groupMessages>;

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

function MissionHeroImage({ mission }: Readonly<{ mission: MissionDetail }>) {
  const arc = mission.epicArcs[0];
  const { faction, corporation } = mission.issuer;
  if (arc) return <EveIconAvatar iconId={arc.iconId} size={96} radius={0} />;
  if (faction) {
    return <FactionAvatar factionId={faction.factionId} size={96} radius={0} />;
  }
  if (corporation) {
    return (
      <CorporationAvatar
        corporationId={corporation.corporationId}
        size={96}
        radius={0}
      />
    );
  }
  return <IconTarget size={56} stroke={1.2} />;
}

/** Faction · corporation · agent type, with separators only between parts. */
function MissionIssuerLine({ mission }: Readonly<{ mission: MissionDetail }>) {
  const { faction, corporation } = mission.issuer;
  const parts: { key: string; node: ReactNode }[] = [];
  if (faction) {
    parts.push({ key: "faction", node: <FactionLabel faction={faction} /> });
  }
  if (corporation) {
    parts.push({
      key: "corporation",
      node: <CorporationLabel corporation={corporation} />,
    });
  }
  if (mission.agentType) {
    parts.push({
      key: "agentType",
      node: (
        <Text size="sm" c="dimmed">
          {mission.agentType.name ??
            `Agent type ${mission.agentType.agentTypeId}`}
        </Text>
      ),
    });
  }
  return (
    <Group gap="xs" align="center">
      {parts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 && <Text c="dimmed">·</Text>}
          {part.node}
        </Fragment>
      ))}
    </Group>
  );
}

function MissionHero({ mission }: Readonly<{ mission: MissionDetail }>) {
  const objective = mission.kill?.objective ?? mission.courier?.objective;
  const bonusLabel =
    mission.bonusTimeInterval === null
      ? "Bonus"
      : `Bonus (${formatMinutes(mission.bonusTimeInterval)})`;
  return (
    <Paper withBorder radius="md" p="lg">
      <Group align="flex-start" gap="xl" wrap="wrap">
        <HeroImage>
          <MissionHeroImage mission={mission} />
        </HeroImage>
        <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
          <Group gap="sm" align="center">
            <Title order={2}>{mission.name}</Title>
            <MissionKindBadge kind={mission.kind} size="md" />
            {mission.epicArcs.length > 0 && (
              <Badge variant="light" color="grape" size="md">
                Epic Arc
              </Badge>
            )}
            <Badge variant="light" color="gray" size="md">
              ID {mission.missionId}
            </Badge>
          </Group>

          <MissionIssuerLine mission={mission} />

          <Group gap="xl">
            {mission.reward && (
              <HeroStat
                label="Reward"
                value={
                  <TypeRefLabel
                    type={mission.reward.type}
                    quantity={mission.reward.quantity}
                    size="xs"
                  />
                }
              />
            )}
            {mission.bonusReward && (
              <HeroStat
                label={bonusLabel}
                value={
                  <TypeRefLabel
                    type={mission.bonusReward.type}
                    quantity={mission.bonusReward.quantity}
                    size="xs"
                  />
                }
              />
            )}
            {objective && (
              <HeroStat
                label={mission.kind === "courier" ? "Cargo" : "Objective"}
                value={
                  <TypeRefLabel
                    type={objective.type}
                    quantity={objective.quantity}
                    size="xs"
                  />
                }
              />
            )}
            {mission.kill?.dungeon && (
              <HeroStat
                label="Dungeon"
                value={
                  <DungeonLabel
                    dungeonId={mission.kill.dungeon.dungeonId}
                    name={mission.kill.dungeon.name}
                  />
                }
              />
            )}
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

/** A type and quantity, or the not-available dash. */
function OptionalTypeRef({
  value,
}: Readonly<{ value: { type: TypeRef; quantity: number | null } | null }>) {
  if (value === null) return <>{notAvailableText}</>;
  return <TypeRefLabel type={value.type} quantity={value.quantity} />;
}

function MissionSummary({ mission }: Readonly<{ mission: MissionDetail }>) {
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconInfoCircle size={18} />}>
        Mission
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        <StatCard label="Mission ID" value={mission.missionId} />
        <StatCard
          label="Type"
          value={<MissionKindBadge kind={mission.kind} />}
        />
        <StatCard
          label="Faction"
          value={
            mission.faction ? (
              <FactionLabel faction={mission.faction} />
            ) : (
              notAvailableText
            )
          }
        />
        <StatCard
          label="Corporation"
          value={
            mission.corporation ? (
              <CorporationLabel corporation={mission.corporation} />
            ) : (
              notAvailableText
            )
          }
          sub={mission.corporationFaction?.name}
        />
        <StatCard
          label="Agent Type"
          value={mission.agentType?.name ?? notAvailableText}
          sub={
            mission.agentType
              ? `ID ${mission.agentType.agentTypeId}`
              : undefined
          }
        />
        <StatCard
          label="Offer Expires After"
          value={
            mission.expirationTime === null
              ? notAvailableText
              : formatExpiration(mission.expirationTime)
          }
        />
        <StatCard
          label="Standing Rewards"
          value={<BooleanBadge value={mission.hasStandingRewards} />}
        />
        {mission.agent && (
          <StatCard
            label="Offered By"
            value={<AgentLabel agent={mission.agent} />}
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}

function MissionDungeonCard({ mission }: Readonly<{ mission: MissionDetail }>) {
  const dungeon = mission.kill?.dungeon ?? null;
  if (dungeon === null) {
    return <StatCard label="Dungeon" value={notAvailableText} />;
  }
  const shared =
    mission.dungeonMissionCount > 0
      ? `shared with ${plural(mission.dungeonMissionCount, "other mission")}`
      : null;
  return (
    <StatCard
      label="Dungeon"
      value={<DungeonLabel dungeonId={dungeon.dungeonId} name={dungeon.name} />}
      sub={[dungeon.archetypeTitle, `ID ${dungeon.dungeonId}`, shared]
        .filter(Boolean)
        .join(" · ")}
    />
  );
}

function MissionObjective({ mission }: Readonly<{ mission: MissionDetail }>) {
  const objective =
    mission.kill?.objective ?? mission.courier?.objective ?? null;
  // A kill block may name a quantity but no item (mission 16414).
  const bareQuantity =
    mission.kill && !objective && mission.kill.objectiveQuantity !== null
      ? `Quantity ${mission.kill.objectiveQuantity}`
      : undefined;
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconTarget size={18} />}>Objective</SectionHeading>
      {mission.kind === "other" ? (
        <Text size="sm" c="dimmed">
          This mission has no encounter or delivery of its own — it is completed
          by talking to the agent.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {mission.kill && <MissionDungeonCard mission={mission} />}
          <StatCard
            label={
              mission.kind === "courier"
                ? "Cargo to Deliver"
                : "Item to Retrieve"
            }
            value={<OptionalTypeRef value={objective} />}
            sub={objective?.type.groupName ?? bareQuantity}
          />
          {mission.kill?.dropItem && (
            <StatCard
              label="Dropped in Mission Container"
              value={<TypeRefLabel type={mission.kill.dropItem} />}
            />
          )}
          {mission.courier && (
            <StatCard
              label="Assembled (Singleton)"
              value={<BooleanBadge value={mission.courier.singleton} />}
            />
          )}
        </SimpleGrid>
      )}
    </Stack>
  );
}

function MissionRewards({ mission }: Readonly<{ mission: MissionDetail }>) {
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconCoin size={18} />}>Rewards</SectionHeading>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        <StatCard
          label="Reward"
          value={<OptionalTypeRef value={mission.reward} />}
        />
        <StatCard
          label="Time Bonus"
          value={<OptionalTypeRef value={mission.bonusReward} />}
          sub={
            mission.bonusTimeInterval === null
              ? undefined
              : `if completed within ${formatMinutes(mission.bonusTimeInterval)}`
          }
        />
        {mission.initialAgentGift && (
          <StatCard
            label="Handed Over on Acceptance"
            value={<OptionalTypeRef value={mission.initialAgentGift} />}
          />
        )}
      </SimpleGrid>
      {mission.extraStandings.length > 0 && (
        <Paper withBorder radius="md" p="sm">
          <Stack gap="xs">
            <Text fw={700} size="sm">
              Extra Standing Changes
            </Text>
            <Table verticalSpacing={4}>
              <Table.Tbody>
                {mission.extraStandings.map((standing) => (
                  <Table.Tr key={standing.faction.factionId}>
                    <Table.Td>
                      <FactionLabel faction={standing.faction} />
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      ff="monospace"
                      fw={600}
                      c={standing.value >= 0 ? "teal" : "red"}
                    >
                      {standing.value > 0 ? "+" : ""}
                      {standing.value}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

function MissionBriefing({
  groups,
  values,
}: Readonly<{ groups: MessageGroups; values: MissionTextValues }>) {
  const { briefing, extraInfoHeader, extraInfoBody, journal } = groups;
  const extraInfoTitle =
    extraInfoHeader === undefined ? (
      "Additional Information"
    ) : (
      <MissionText text={extraInfoHeader} values={values} />
    );
  return (
    <Stack gap="md">
      {briefing !== undefined && (
        <TextPanel title="Briefing" text={briefing} values={values} />
      )}
      {extraInfoBody !== undefined && (
        <TextPanel
          title={extraInfoTitle}
          text={extraInfoBody}
          values={values}
        />
      )}
      {journal.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconBook size={18} />}>
            Epic Journal
          </SectionHeading>
          {journal.map((entry) => (
            <TextPanel
              key={entry.key}
              title={entry.slot.label}
              text={entry.text}
              values={values}
            />
          ))}
        </Stack>
      )}
      <Text size="xs" c="dimmed">
        Text in [brackets] is filled in by the game when the mission is offered.
      </Text>
    </Stack>
  );
}

function MissionDialogue({
  groups,
  values,
  agentId,
  pilotId,
}: Readonly<{
  groups: MessageGroups;
  values: MissionTextValues;
  agentId: number | null;
  pilotId: number | null;
}>) {
  return (
    <Stack gap="lg">
      {groups.dialogueStages.map(([stage, lines]) => (
        <Stack key={stage} gap="sm">
          <SectionHeading icon={<IconMessages size={18} />}>
            {stage}
          </SectionHeading>
          {lines.map((line) => (
            <DialogueLine
              key={line.key}
              speaker={line.slot.speaker}
              label={line.slot.label}
              text={line.text}
              values={values}
              // A completion line is often spoken by the agent the pilot was
              // sent to, not the one who offered it.
              agentId={stage === "Complete" ? null : agentId}
              pilotId={pilotId}
            />
          ))}
        </Stack>
      ))}
      {groups.mailPairs.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconMessages size={18} />}>
            Notification Mails
          </SectionHeading>
          {groups.mailPairs.map(([label, mail]) => (
            <Paper key={label} withBorder radius="md" p="md">
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge variant="light" color="gray">
                    {label}
                  </Badge>
                  {mail.header !== undefined && (
                    <MissionText text={mail.header} values={values} />
                  )}
                </Group>
                {mail.body !== undefined && (
                  <MissionText text={mail.body} values={values} />
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default function MissionPage({
  mission,
}: Readonly<{ mission: MissionDetail }>) {
  const character = useSelectedCharacter();
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(MISSION_PAGE_TABS)
      .withDefault(DEFAULT_MISSION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  // The pilot's own name, when signed in; the rest comes from the server.
  const pilotName = character?.accessTokenPayload.name;
  const values = useMemo<MissionTextValues>(
    () =>
      pilotName
        ? { ...mission.textValues, player: pilotName }
        : mission.textValues,
    [mission.textValues, pilotName],
  );

  const groups = useMemo(
    () => groupMessages(mission.messages),
    [mission.messages],
  );

  const available: Record<string, boolean> = {
    briefing:
      groups.briefing !== undefined ||
      groups.extraInfoBody !== undefined ||
      groups.journal.length > 0,
    dialogue: groups.dialogueStages.length > 0 || groups.mailPairs.length > 0,
    "epic-arc": mission.epicArcs.length > 0,
    variants: mission.variants.length > 0,
  };
  const selectedTab =
    available[activeTab] === false ? DEFAULT_MISSION_PAGE_TAB : activeTab;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} href="/missions" size="sm">
            Missions
          </Anchor>
          {mission.epicArcs[0] && (
            <EpicArcAnchor epicArcId={mission.epicArcs[0].epicArcId} size="sm">
              {mission.epicArcs[0].name}
            </EpicArcAnchor>
          )}
          <Text size="sm">{mission.name}</Text>
        </Breadcrumbs>

        <MissionHero mission={mission} />

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isMissionPageTab(value)) void setActiveTab(value);
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
            {available.briefing && (
              <Tabs.Tab value="briefing" leftSection={<IconBook size={16} />}>
                Briefing
              </Tabs.Tab>
            )}
            {available.dialogue && (
              <Tabs.Tab
                value="dialogue"
                leftSection={<IconMessages size={16} />}
              >
                Dialogue
              </Tabs.Tab>
            )}
            {available["epic-arc"] && (
              <Tabs.Tab value="epic-arc" leftSection={<IconRoute size={16} />}>
                Epic Arc
              </Tabs.Tab>
            )}
            {available.variants && (
              <Tabs.Tab
                value="variants"
                leftSection={<IconVersions size={16} />}
              >
                Variants ({mission.variants.length})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <MissionSummary mission={mission} />
              <MissionObjective mission={mission} />
              <MissionRewards mission={mission} />
            </Stack>
          </Tabs.Panel>

          {available.briefing && (
            <Tabs.Panel value="briefing" pt="lg">
              <MissionBriefing groups={groups} values={values} />
            </Tabs.Panel>
          )}

          {available.dialogue && (
            <Tabs.Panel value="dialogue" pt="lg">
              <MissionDialogue
                groups={groups}
                values={values}
                agentId={mission.agent?.characterId ?? null}
                pilotId={character?.characterId ?? null}
              />
            </Tabs.Panel>
          )}

          {available["epic-arc"] && (
            <Tabs.Panel value="epic-arc" pt="lg">
              <Stack gap="xl">
                {mission.epicArcs.map((arc) => (
                  <EpicArcPanel
                    key={arc.epicArcId}
                    arc={arc}
                    missionId={mission.missionId}
                  />
                ))}
              </Stack>
            </Tabs.Panel>
          )}

          {available.variants && (
            <Tabs.Panel value="variants" pt="lg">
              <Stack gap="sm">
                <Alert variant="light" color="gray" icon={<IconVersions />}>
                  Other missions named “{mission.name}” — usually the same
                  mission offered by another faction, corporation or agent
                  level.
                </Alert>
                <DataTable
                  data={mission.variants}
                  columns={variantColumns}
                  rowId={(row) => row.missionId}
                  withGlobalFilter
                  withColumnVisibility
                  withPagination
                  defaultPageSize={25}
                  initialSort={{ columnId: "missionId", direction: "asc" }}
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          <Tabs.Panel value="history" pt="lg">
            <EntityHistory
              entityType="mission"
              entityId={mission.missionId}
              embedded
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
