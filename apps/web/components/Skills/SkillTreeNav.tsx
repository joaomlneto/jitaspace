import React, { memo } from "react";
import {
  Box,
  Container,
  Group,
  NavLink,
  Skeleton,
  Stack,
  Text,
  type NavLinkProps,
} from "@mantine/core";

import {
  useGetCharactersCharacterIdSkills,
  type GetCharactersCharacterIdSkills200SkillsItem,
  type GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { SkillBar, TypeAnchor, TypeName } from "@jitaspace/ui";

import {
  usePrecomputedCategoryGroups,
  usePrecomputedGroupTypes,
} from "~/hooks";

const SKILLS_CATEGORY_ID = 16;
const TRAINING_TIME_MULTIPLIER_ATTRIBUTE_ID = 275;

type SkillTreeNavLinkProps = NavLinkProps & {
  groupId: number;
};

const SkillTreeNavLink = memo(
  ({ groupId, ...otherProps }: SkillTreeNavLinkProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();
    const {
      data: group,
      isLoading: groupLoading,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      error: groupError,
    } = usePrecomputedGroupTypes(groupId);

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

    const loading = groupLoading || skillsLoading;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const error = groupError || skillsError;

    const sortedTypeIds = Object.values(group?.types ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((type) => type.type_id);

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

    const totalSPInGroup = Object.values(group?.types ?? []).reduce(
      (acc, type) => {
        return acc + getSPNeededForLevel(type, 5);
      },
      0,
    );

    const characterSPInGroup = Object.values(group?.types ?? []).reduce(
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
            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
            {error && <Text>Error loading skill group: {error.message}</Text>}
            {!error && loading && (
              <Skeleton w={200}>
                <Text>Loading...</Text>
              </Skeleton>
            )}
            {!error && !loading && <Text>{group?.name}</Text>}
            {!error && !loading && (
              <Text>
                {characterSPInGroup.toLocaleString()} /{" "}
                {totalSPInGroup.toLocaleString()} SP
              </Text>
            )}
          </Group>
        }
        {...otherProps}
      >
        <Stack spacing="xs" my="md" mr="md">
          {sortedTypeIds.map((typeId) => {
            const type = group?.types[typeId];
            const characterSkill = characterSkillsIndex?.[typeId];
            if (!type) return "?";
            return (
              <Group key={typeId} position="apart">
                <Group>
                  <TypeAnchor typeId={type.type_id}>
                    <TypeName span typeId={type.type_id} size="sm"></TypeName>
                  </TypeAnchor>
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
  },
);
SkillTreeNavLink.displayName = "SkillTreeNavLink";

export const SkillTreeNav = memo(() => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, isLoading, error } =
    usePrecomputedCategoryGroups(SKILLS_CATEGORY_ID);

  const hideUnpublished = true;

  if (isLoading) return "Loading skill tree...";

  if (!data || error)
    return "Error loading skill tree: " + JSON.stringify(error);

  // get IDs of groups sorted by their respective names
  const alphabeticallySortedGroupIds = Object.values(data.groups ?? [])
    .filter((group) => !hideUnpublished || group.published)
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    })
    .map(({ group_id }) => group_id);

  return (
    <Container size="sm">
      <Box>
        {alphabeticallySortedGroupIds.map((groupId) => (
          <SkillTreeNavLink key={groupId} groupId={groupId} />
        ))}
      </Box>
    </Container>
  );
});
SkillTreeNav.displayName = "SkillTreeNav";
