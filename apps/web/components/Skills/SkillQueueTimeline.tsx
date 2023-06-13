import React from "react";
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
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdSkillqueue } from "@jitaspace/esi-client";
import { SkillsIcon } from "@jitaspace/eve-icons";
import { TypeName } from "@jitaspace/ui";

export function SkillQueueTimeline() {
  const { data: session } = useSession();
  const { data, isLoading, error } = useGetCharactersCharacterIdSkillqueue(
    session?.user?.id ?? 1,
    {},
    {
      swr: {
        enabled: !!session?.user?.id,
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
    }[n] ?? "[Invalid Level]");

  return (
    <Stack>
      <Container size="md">
        <Timeline active={0} bulletSize={24} lineWidth={2}>
          {data?.data.map((entry) => (
            <Timeline.Item
              key={entry.skill_id}
              bullet={<SkillsIcon width={24} />}
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
                      {entry.queue_position && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">
                            Queue Position
                          </Text>
                          <Text size="sm">{entry.queue_position}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              }
            />
          ))}
        </Timeline>
      </Container>
    </Stack>
  );
}
