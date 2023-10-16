import React, { memo } from "react";
import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  Popover,
  Stack,
  Text,
  Timeline,
  UnstyledButton,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { format } from "date-fns";
import humanizeDuration from "humanize-duration";

import { useGetCharactersCharacterIdSkillqueue } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { TypeAvatar, TypeName } from "@jitaspace/ui";

export const SkillQueueTimeline = memo(() => {
  const { characterId, isTokenValid, accessToken } = useEsiClientContext();
  const { data, isLoading, error } = useGetCharactersCharacterIdSkillqueue(
    characterId ?? 1,
    { token: accessToken },
    {},
    {
      query: {
        enabled: isTokenValid,
      },
    },
  );

  if (isLoading) return "LOADING";
  if (error) return "ERROR";

  const skillLevelRomanNumeral = (n: number): string =>
    ({
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
    })[n] ?? "[Invalid Level]";

  return (
    <Stack>
      <Container size="md">
        <Timeline active={0} bulletSize={24} lineWidth={2}>
          {data?.data.map((entry) => (
            <Timeline.Item
              key={entry.skill_id}
              bullet={
                <TypeAvatar
                  typeId={entry.skill_id}
                  variation="icon"
                  size={24}
                />
              }
              title={
                <Popover key={entry.skill_id}>
                  <Popover.Target>
                    <UnstyledButton>
                      <Group>
                        <Anchor>
                          <TypeName span typeId={entry.skill_id} />{" "}
                          {skillLevelRomanNumeral(entry.finished_level)}
                        </Anchor>
                      </Group>
                    </UnstyledButton>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack spacing="xs">
                      {entry.start_date && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Start date
                          </Text>
                          <Text size="sm">
                            {format(
                              new Date(entry.start_date),
                              "yyyy-MM-dd HH:mm:ss",
                            )}
                          </Text>
                        </Group>
                      )}
                      {entry.finish_date && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Finish date
                          </Text>
                          <Text size="sm">
                            {format(
                              new Date(entry.finish_date),
                              "yyyy-MM-dd HH:mm:ss",
                            )}
                          </Text>
                        </Group>
                      )}
                      {entry.training_start_sp && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Training Start SP
                          </Text>
                          <Text size="sm">{entry.training_start_sp}</Text>
                        </Group>
                      )}
                      {entry.level_start_sp && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Level Start SP
                          </Text>
                          <Text size="sm">{entry.level_start_sp}</Text>
                        </Group>
                      )}
                      {entry.level_end_sp && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Level End SP
                          </Text>
                          <Text size="sm">{entry.level_end_sp}</Text>
                        </Group>
                      )}
                      {entry.queue_position !== undefined && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Queue Position
                          </Text>
                          <Text size="sm">{entry.queue_position}</Text>
                        </Group>
                      )}
                      <Anchor
                        component={Link}
                        href={`https://everef.net/type/${entry.skill_id}`}
                        target="_blank"
                        size="sm"
                      >
                        <Group spacing="xs">
                          <IconExternalLink size={14} />
                          <Anchor>Open in EVE Ref</Anchor>
                        </Group>
                      </Anchor>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              }
            >
              {entry.start_date && entry.finish_date && (
                <Text size="sm">
                  {humanizeDuration(
                    new Date(entry.finish_date).getTime() -
                      (entry.queue_position > 0
                        ? new Date(entry.start_date)
                        : new Date()
                      ).getTime(),
                    { largest: 2, units: ["d", "h", "m", "s"], round: true },
                  )}
                </Text>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Container>
    </Stack>
  );
});
SkillQueueTimeline.displayName = "SkillQueueTimeline";
