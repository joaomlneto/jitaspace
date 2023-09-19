import React, { memo } from "react";
import { Box, Container } from "@mantine/core";

import { SkillTreeNavLink } from "./SkillTreeNavLink";

type SkillTreeNavProps = {
  groups: {
    groupId: number;
    name: string;
    published: boolean;
    types: {
      typeId: number;
      name: string;
      description: string;
      iconId: number | null;
      graphicId: number | null;
      published: boolean;
      attributes: {
        attributeId: number;
        value: number;
      }[];
    }[];
  }[];
  showUnpublished?: boolean;
};

export const SkillTreeNav = memo(
  ({ groups, showUnpublished = false }: SkillTreeNavProps) => {
    // get IDs of groups sorted by their respective names
    const alphabeticallySortedGroupIds = groups
      .filter((group) => showUnpublished || group.published)
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

    return (
      <Container size="sm">
        <Box>
          {alphabeticallySortedGroupIds.map((group) => (
            <SkillTreeNavLink
              key={group.groupId}
              group={group}
              showUnpublished={showUnpublished}
            />
          ))}
        </Box>
      </Container>
    );
  },
);
SkillTreeNav.displayName = "SkillTreeNav";
