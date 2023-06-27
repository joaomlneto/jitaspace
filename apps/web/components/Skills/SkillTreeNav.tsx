import React, { memo } from "react";
import { Box, Container, Group, NavLink, Stack, Text } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdSkills,
  type GetCharactersCharacterIdSkills200SkillsItem,
  type GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";
import { SkillBar, TypeName } from "@jitaspace/ui";

import { useSkillTree } from "~/hooks";

const TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID = 275;

export const SkillTreeNav = memo(() => {
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data: skillTree, loading, error } = useSkillTree();
  const {
    data: skills,
    isLoading: skillsLoading,
    error: skillsError,
  } = useGetCharactersCharacterIdSkills(
    characterId ?? 1,
    {},
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  const hideUnpublished = true;

  if (loading || skillsLoading) return "Loading skill tree...";

  if (!skillTree || error || skillsError)
    return "Error loading skill tree: " + JSON.stringify(error);

  // get IDs of groups sorted by their respective names
  const alphabeticallySortedGroupIds = Object.values(skillTree.groups ?? [])
    .filter((group) => !hideUnpublished || group.published)
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    })
    .map(({ group_id }) => group_id);

  // get IDs of types within each group sorted by their respective names
  const alphabeticallySortedTypeIdsPerGroup: { [key: string]: number[] } = {};
  alphabeticallySortedGroupIds.forEach((groupId) => {
    alphabeticallySortedTypeIdsPerGroup[groupId] = Object.values(
      (skillTree.groups[groupId] ?? { types: [] }).types,
    )
      .filter((type) => !hideUnpublished || type.published)
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      })
      .map(({ type_id }) => type_id);
  });

  const characterSkillsIndex = skills?.data.skills.reduce((acc, skill) => {
    acc[skill.skill_id] = skill;
    return acc;
  }, {} as Record<string, GetCharactersCharacterIdSkills200SkillsItem>);

  const getSkillTrainingTimeMultiplier = (skill: GetUniverseTypesTypeId200) =>
    skill.dogma_attributes?.find(
      (attribute) =>
        attribute.attribute_id === TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID,
    )?.value ?? 1;

  const getSPNeededForLevel = (
    skill: GetUniverseTypesTypeId200,
    level: number,
  ) =>
    Math.ceil(
      250 *
        getSkillTrainingTimeMultiplier(skill) *
        Math.sqrt(32 ** (level - 1)),
    );

  return (
    <Container size="sm">
      <Box>
        {alphabeticallySortedGroupIds.map((groupId) => {
          const group = skillTree.groups[groupId];
          if (group === undefined) return null;
          const totalSPInGroup = Object.values(group.types).reduce(
            (acc, type) => {
              return acc + getSPNeededForLevel(type, 5);
            },
            0,
          );
          const characterSPInGroup = Object.values(group.types).reduce(
            (acc, type) => {
              const characterSkill = characterSkillsIndex?.[type.type_id];
              if (!characterSkill) return acc;
              return acc + characterSkill.skillpoints_in_skill;
            },
            0,
          );
          return (
            <NavLink
              key={groupId}
              label={
                <Group position="apart">
                  <Text>{group.name}</Text>
                  <Text>
                    {characterSPInGroup.toLocaleString()} /{" "}
                    {totalSPInGroup.toLocaleString()} SP
                  </Text>
                </Group>
              }
            >
              <Stack spacing="xs">
                {alphabeticallySortedTypeIdsPerGroup[groupId]?.map((typeId) => {
                  const type = group.types[typeId];
                  const characterSkill = characterSkillsIndex?.[typeId];
                  if (!type) return "?";
                  return (
                    <Group key={typeId} position="apart">
                      <Group>
                        <TypeName typeId={typeId} size="sm" />
                      </Group>
                      <Group>
                        <Text size="xs" color="dimmed">
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
        })}
      </Box>
    </Container>
  );
});
SkillTreeNav.displayName = "SkillTreeNav";
