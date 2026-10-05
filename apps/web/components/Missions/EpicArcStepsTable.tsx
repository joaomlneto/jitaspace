"use client";

import type { ReactNode } from "react";
import { Paper, Stack, Table, Text } from "@mantine/core";

import { ISKAmount, MissionAnchor } from "@jitaspace/ui";

import type { EpicArcStep } from "~/lib/epicArcs";
import { AgentLabel, MissionKindBadge, notAvailableText } from "./parts";

/** Where a failed step leads: nowhere, the same step again, or another. */
function FailureStep({
  step,
  link,
}: Readonly<{
  step: EpicArcStep;
  link: (missionId: number) => ReactNode;
}>) {
  if (step.failMissionId === null) return <>{notAvailableText}</>;
  if (step.failMissionId === step.missionId) return <>Retry</>;
  return <>{link(step.failMissionId)}</>;
}

function NextSteps({
  step,
  link,
}: Readonly<{
  step: EpicArcStep;
  link: (missionId: number) => ReactNode;
}>) {
  if (step.nextMissionIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        End of arc
      </Text>
    );
  }
  return <Stack gap={2}>{step.nextMissionIds.map(link)}</Stack>;
}

/** A step's ISK reward, with its time bonus underneath when it pays one. */
function IskReward({ step }: Readonly<{ step: EpicArcStep }>) {
  if (step.rewardIsk === null && step.bonusIsk === null) {
    return <>{notAvailableText}</>;
  }
  return (
    <Stack gap={0} align="flex-end">
      {step.rewardIsk !== null && (
        <ISKAmount amount={step.rewardIsk} span size="sm" />
      )}
      {step.bonusIsk !== null && (
        <Text span size="xs" c="dimmed">
          + <ISKAmount amount={step.bonusIsk} span size="xs" inherit /> bonus
        </Text>
      )}
    </Stack>
  );
}

/**
 * Every step of an epic arc in play order: chapter, mission, agent, reward,
 * and where success and failure lead. `currentMissionId` highlights one step
 * (the mission page's own) and shows it unlinked.
 */
export function EpicArcStepsTable({
  steps,
  currentMissionId,
}: Readonly<{ steps: EpicArcStep[]; currentMissionId?: number }>) {
  const names = new Map(steps.map((step) => [step.missionId, step.name]));
  const missionLink = (id: number) => (
    <MissionAnchor key={id} missionId={id} size="sm">
      {names.get(id) ?? `Mission ${id}`}
    </MissionAnchor>
  );
  return (
    <Paper withBorder radius="md" p="sm" style={{ overflowX: "auto" }}>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Mission</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Agent</Table.Th>
            <Table.Th ta="right">ISK Reward</Table.Th>
            <Table.Th>Leads to</Table.Th>
            <Table.Th>On failure</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {steps.map((step, index) => {
            const isCurrent = step.missionId === currentMissionId;
            return (
              <Table.Tr
                key={step.missionId}
                bg={
                  isCurrent
                    ? "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))"
                    : undefined
                }
              >
                <Table.Td ff="monospace">{index + 1}</Table.Td>
                <Table.Td>
                  <Stack gap={0}>
                    {step.chapterTitle && (
                      <Text size="xs" c="dimmed">
                        {step.chapterTitle}
                      </Text>
                    )}
                    {isCurrent ? (
                      <Text fw={700} size="sm">
                        {step.name ?? `Mission ${step.missionId}`}
                      </Text>
                    ) : (
                      missionLink(step.missionId)
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <MissionKindBadge kind={step.kind} size="xs" />
                </Table.Td>
                <Table.Td>
                  {step.agent ? (
                    <AgentLabel agent={step.agent} withLocation={false} />
                  ) : (
                    notAvailableText
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  <IskReward step={step} />
                </Table.Td>
                <Table.Td>
                  <NextSteps step={step} link={missionLink} />
                </Table.Td>
                <Table.Td>
                  <FailureStep step={step} link={missionLink} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
