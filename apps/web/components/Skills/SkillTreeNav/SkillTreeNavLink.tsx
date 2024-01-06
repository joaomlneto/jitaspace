import React, { memo, useMemo } from "react";
import {
  Group,
  Loader,
  NavLink,
  NavLinkProps,
  Stack,
  Text,
} from "@mantine/core";

import { CharacterSkill, useCharacterSkills } from "@jitaspace/hooks";
import { SkillBar, TypeAnchor, TypeName } from "@jitaspace/ui";





const TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID = 275;

type SkillTreeNavLinkProps = NavLinkProps & {
  characterId: number;
  group: {
    groupId: number;
    name: string;
    published: boolean;
    types: {
      typeId: number;
      name: string;
      description: string;
      published: boolean;
      attributes: {
        attributeId: number;
        value: number;
      }[];
    }[];
  };
  showUnpublished?: boolean;
  fetchNameFromEsi?: boolean;
};

export const SkillTreeNavLink = memo(
  ({
    characterId,
    group,
    showUnpublished = false,
    fetchNameFromEsi = false,
    ...otherProps
  }: SkillTreeNavLinkProps) => {
    const {
      data: skills,
      isLoading: skillsLoading,
      error: skillsError,
    } = useCharacterSkills(characterId);

    const sortedTypes = useMemo(
      () =>
        group.types
          .filter((type) => showUnpublished || type.published)
          .sort((a, b) => a.name.localeCompare(b.name)),
      [group],
    );

    const characterSkillsIndex = skills?.data.skills.reduce(
      (acc, skill) => {
        acc[skill.skill_id] = skill;
        return acc;
      },
      {} as Record<string, CharacterSkill>,
    );

    const getSkillTrainingTimeMultiplier = (skill: {
      attributes: {
        attributeId: number;
        value: number;
      }[];
    }) =>
      skill.attributes.find(
        (attribute) =>
          attribute.attributeId === TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID,
      )?.value ?? 1;

    const getSPNeededForLevel = (
      skill: {
        attributes: {
          attributeId: number;
          value: number;
        }[];
      },
      level: number,
    ) =>
      Math.ceil(
        250 *
          getSkillTrainingTimeMultiplier(skill) *
          Math.sqrt(32 ** (level - 1)),
      );

    const totalSPInGroup = Object.values(group?.types ?? []).reduce(
      (acc, type) => {
        return acc + getSPNeededForLevel(type, 5);
      },
      0,
    );

    const characterSPInGroup = Object.values(group?.types ?? []).reduce(
      (acc, type) => {
        const characterSkill = characterSkillsIndex?.[type.typeId];
        if (!characterSkill) return acc;
        return acc + characterSkill.skillpoints_in_skill;
      },
      0,
    );

    return (
      <NavLink
        key={group.groupId}
        label={
          <Group justify="space-between">
            <Text>{group.name}</Text>
            <Text>
              {skillsLoading ? (
                <Loader size="xs" />
              ) : (
                characterSPInGroup.toLocaleString()
              )}{" "}
              / {totalSPInGroup.toLocaleString()} SP
            </Text>
          </Group>
        }
        {...otherProps}
      >
        <Stack gap="xs" my="md" mr="md">
          {sortedTypes.map((type) => {
            const characterSkill = characterSkillsIndex?.[type.typeId];
            return (
              <Group key={type.typeId} justify="space-between">
                <Group>
                  <TypeAnchor typeId={type.typeId}>
                    {fetchNameFromEsi ? (
                      <TypeName span typeId={type.typeId} size="sm" />
                    ) : (
                      <Text span size="sm">
                        {type.name}
                      </Text>
                    )}
                  </TypeAnchor>
                </Group>
                <Group>
                  <Text size="xs" c="dimmed">
                    {(
                      characterSkill?.skillpoints_in_skill ?? 0
                    ).toLocaleString()}{" "}
                    / {getSPNeededForLevel(type, 5).toLocaleString()} SP
                  </Text>
                  <SkillBar
                    activeLevel={characterSkill?.active_skill_level ?? 0}
                  />
                </Group>
              </Group>
            );
          })}
        </Stack>
      </NavLink>
    );
  },
);
SkillTreeNavLink.displayName = "SkillTreeNavLink";
