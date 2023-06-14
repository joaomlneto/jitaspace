import React from "react";
import { Accordion, Container, Group, Stack, Text } from "@mantine/core";
import { useSession } from "next-auth/react";

import {
  useGetCharactersCharacterIdSkills,
  type GetCharactersCharacterIdSkills200SkillsItem,
  type GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";
import { SkillBar, TypeName } from "@jitaspace/ui";

import { useSkillTree } from "~/hooks";

const TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID = 275;

export function SkillTree() {
  const { data: session } = useSession();
  const { data: skillTree, loading, error } = useSkillTree();
  const {
    data: skills,
    isLoading: skillsLoading,
    error: skillsError,
  } = useGetCharactersCharacterIdSkills(
    session?.user?.id ?? 1,
    {},
    {
      swr: {
        enabled: !!session?.user?.id,
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
      <Accordion
        defaultValue={alphabeticallySortedGroupIds[0]?.toString()}
        variant="contained"
      >
        {alphabeticallySortedGroupIds.map((groupId) => (
          <Accordion.Item value={groupId.toString()} key={groupId}>
            <Accordion.Control>
              <Group position="apart">
                <Text size="sm">{skillTree.groups[groupId]?.name}</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack spacing="xs">
                {alphabeticallySortedTypeIdsPerGroup[groupId]?.map((typeId) => {
                  const type = skillTree.groups[groupId]?.types[typeId];
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
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Container>
  );
}
