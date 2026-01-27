"use client";

import type React from "react";
import { Card, Group, RingProgress, Text } from "@mantine/core";
import { differenceInSeconds } from "date-fns";

import { useCharacterSkillQueue } from "@jitaspace/hooks";
import { TimeAgoText, TypeAvatar, TypeName } from "@jitaspace/ui";
import { skillLevelRomanNumeral } from "@jitaspace/utils";

import classes from "~/components/Card/SolarSystemCard.module.css";


export interface CharacterSkillTrainingCardProps {
  characterId: number;
  fallback?: React.ReactNode;
  hideFallback?: boolean;
}

export const CharacterSkillTrainingCard = ({
  characterId,
  fallback,
  hideFallback = false,
}: CharacterSkillTrainingCardProps) => {
  const { data, isLoading: _isLoading, error: _error } = useCharacterSkillQueue(characterId);

  if (!data) {
    return hideFallback
      ? null
      : fallback ?? (
          <Text size="xs" c="dimmed">
            Character skill queue not available
          </Text>
        );
  }

  const activeSkill = data?.data.filter(
    (skill) =>
      skill.finish_date && skill.finish_date > new Date().toISOString(),
  )[0];

  console.log({ characterId, activeSkill });

  const skillDuration =
    activeSkill?.start_date && activeSkill?.finish_date
      ? differenceInSeconds(
          new Date(activeSkill?.start_date),
          new Date(activeSkill?.finish_date),
        )
      : null;

  const elapsedTime =
    activeSkill?.start_date && activeSkill?.finish_date
      ? differenceInSeconds(new Date(activeSkill?.start_date), new Date())
      : null;

  const percentComplete =
    skillDuration && elapsedTime ? (elapsedTime / skillDuration) * 100 : 0;

  const finishDate = activeSkill?.finish_date
    ? new Date(activeSkill?.finish_date)
    : null;

  return (
    <Card withBorder p={0} m={0} className={classes.card}>
      <Group p="xs" wrap="nowrap">
        {activeSkill && (
          <RingProgress
            size={36}
            thickness={4}
            label={<TypeAvatar typeId={19430} size={20} />}
            sections={[{ value: percentComplete, color: "blue" }]}
          />
        )}
        {!activeSkill && <TypeAvatar typeId={19430} size="md" />}
        <div>
          {activeSkill ? (
            <Group>
              <Text size="xs" fw={500} lineClamp={1}>
                <TypeName span inherit typeId={data?.data[0]?.skill_id} />{" "}
                {skillLevelRomanNumeral(activeSkill?.finished_level)}
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              No skill in training
            </Text>
          )}
          {finishDate && (
            <Text size="xs">
              <TimeAgoText span date={finishDate} /> remaining
            </Text>
          )}
        </div>
      </Group>
    </Card>
  );
};
