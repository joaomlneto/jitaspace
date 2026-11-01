"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Badge, Group, Progress, Stack, Text, Tooltip } from "@mantine/core";

import type { FreelanceJob, FreelanceJobState } from "@jitaspace/hooks";
import {
  CareerEnforcerIcon,
  CareerExplorerIcon,
  CareerIndustrialistIcon,
  CareerSoldierOfFortuneIcon,
  CareerUnclassifiedIcon,
} from "@jitaspace/eve-icons";

import type { FreelanceParticipantState } from "./freelanceJobs";
import {
  FREELANCE_JOB_STATE_COLORS,
  FREELANCE_PARTICIPANT_STATE_COLORS,
  freelanceJobProgressPercent,
} from "./freelanceJobs";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const isk = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** `12.3M`, or the exact number below a thousand. */
export const formatCompact = (value: number) => compact.format(value);

/** `12,345,678` — for tooltips and screen readers. */
export const formatWhole = (value: number) => whole.format(value);

/** `12,345,678.5 ISK`. */
export const formatIsk = (value: number) => `${isk.format(value)} ISK`;

export const FreelanceJobStateBadge = memo(
  ({ state }: { state: FreelanceJobState }) => (
    <Badge
      color={FREELANCE_JOB_STATE_COLORS[state]}
      variant="light"
      size="sm"
      radius="sm"
    >
      {state}
    </Badge>
  ),
);
FreelanceJobStateBadge.displayName = "FreelanceJobStateBadge";

export const FreelanceParticipantStateBadge = memo(
  ({ state }: { state: FreelanceParticipantState }) => (
    <Badge
      color={FREELANCE_PARTICIPANT_STATE_COLORS[state]}
      variant="light"
      size="sm"
      radius="sm"
    >
      {state}
    </Badge>
  ),
);
FreelanceParticipantStateBadge.displayName = "FreelanceParticipantStateBadge";

const CAREER_ICONS = {
  Enforcer: CareerEnforcerIcon,
  Explorer: CareerExplorerIcon,
  Industrialist: CareerIndustrialistIcon,
  "Soldier of Fortune": CareerSoldierOfFortuneIcon,
  Unspecified: CareerUnclassifiedIcon,
} as const;

export type FreelanceCareer = keyof typeof CAREER_ICONS;

export const FreelanceCareerBadge = memo(
  ({ career }: { career: FreelanceCareer }) => {
    const Icon = CAREER_ICONS[career];
    return (
      <Badge
        variant="default"
        size="lg"
        radius="sm"
        leftSection={<Icon size={16} color="currentColor" alt="" />}
      >
        {career === "Unspecified" ? "No career" : career}
      </Badge>
    );
  },
);
FreelanceCareerBadge.displayName = "FreelanceCareerBadge";

/**
 * A job's progress as a bar with its numbers beside it. The bar carries the
 * same figures as its accessible name, since a screen reader announces the
 * percentage alone otherwise.
 */
export const FreelanceJobProgress = memo(
  ({
    job,
    size = "sm",
  }: {
    job: Pick<FreelanceJob, "progress" | "name">;
    size?: "sm" | "md" | "lg";
  }) => {
    const percent = freelanceJobProgressPercent(job);
    const { current, desired } = job.progress;
    const exact = `${formatWhole(current)} of ${formatWhole(desired)}`;
    return (
      <Stack gap={4} miw={120}>
        <Progress
          value={percent}
          size={size}
          color={percent >= 100 ? "blue" : "green"}
          aria-label={`${job.name}: ${exact} (${percent.toFixed(0)}%)`}
        />
        <Tooltip label={exact} openDelay={300}>
          <Text size="xs" c="dimmed">
            {formatCompact(current)} / {formatCompact(desired)}
            {" · "}
            {percent.toFixed(percent > 0 && percent < 1 ? 1 : 0)}%
          </Text>
        </Tooltip>
      </Stack>
    );
  },
);
FreelanceJobProgress.displayName = "FreelanceJobProgress";

/** An ISK amount, compact, with the exact figure on hover. */
export const IskText = memo(
  ({ amount, size = "sm" }: { amount?: number; size?: "xs" | "sm" | "md" }) => {
    if (amount === undefined) {
      return (
        <Text size={size} c="dimmed" aria-label="No reward">
          —
        </Text>
      );
    }
    return (
      <Tooltip label={formatIsk(amount)} openDelay={300}>
        <Text size={size} style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatCompact(amount)} ISK
        </Text>
      </Tooltip>
    );
  },
);
IskText.displayName = "IskText";

/** A label above a value, for the detail page's fact lists. */
export function Fact({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md" align="flex-start">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <div style={{ textAlign: "right", minWidth: 0 }}>{children}</div>
    </Group>
  );
}
