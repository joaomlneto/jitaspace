"use client";

import { Badge, Group, Stack, Text, Title } from "@mantine/core";

import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";

import type { AccessListRow } from "./accessListRows";
import { CharacterAnchor } from "~/components/Anchor";
import { AccessBadge } from "./AccessBadge";
import { AccessListMembersTable } from "./AccessListMembersTable";
import classes from "./AccessLists.module.css";

export interface AccessListDetailsProps {
  accessList: AccessListRow;
}

/** One access list in full: what it is, who manages it, and its members. */
export function AccessListDetails({
  accessList,
}: Readonly<AccessListDetailsProps>) {
  return (
    <Stack>
      {accessList.description ? (
        <Text size="sm" className={classes.description}>
          {accessList.description}
        </Text>
      ) : (
        <Text size="sm" fs="italic" className={classes.secondary}>
          No description.
        </Text>
      )}

      <Group gap="xs">
        {accessList.allowEveryone ? (
          <Badge variant="light" color="teal">
            Open to everyone not blocked
          </Badge>
        ) : (
          <Badge variant="light" color="gray">
            Members only
          </Badge>
        )}
        <Text size="xs" className={classes.secondary}>
          ID {accessList.id}
        </Text>
      </Group>

      <Stack gap="xs">
        <Title order={3} size="h5">
          Your characters
        </Title>
        {accessList.managers.map((manager) => (
          <Group key={manager.characterId} gap="xs" wrap="nowrap">
            <EveEntityAvatar
              entityId={manager.characterId}
              category="character"
              size="sm"
            />
            <CharacterAnchor characterId={manager.characterId} size="sm">
              <EveEntityName
                span
                inherit
                entityId={manager.characterId}
                category="character"
              />
            </CharacterAnchor>
            {manager.access && (
              <AccessBadge access={manager.access} size="sm" />
            )}
          </Group>
        ))}
      </Stack>

      <Stack gap="xs">
        <Title order={3} size="h5">
          Members ({accessList.members.length})
        </Title>
        <AccessListMembersTable members={accessList.members} />
      </Stack>
    </Stack>
  );
}
