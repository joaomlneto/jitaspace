import React from "react";
import {
  Center,
  Group,
  Paper,
  Popover,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdAttributes } from "@jitaspace/esi-client";
import {
  AttributesIcon,
  CharismaAttributeSmallIcon,
  IntelligenceAttributeSmallIcon,
  MemoryAttributeSmallIcon,
  PerceptionAttributeSmallIcon,
  WillpowerAttributeSmallIcon,
  type EveIconProps,
} from "@jitaspace/eve-icons";

const characterAttributes = [
  "charisma",
  "intelligence",
  "memory",
  "perception",
  "willpower",
] as const;

type CharacterAttribute = (typeof characterAttributes)[number];

const colors: Record<CharacterAttribute, string> = {
  charisma: "yellow",
  intelligence: "blue",
  memory: "purple",
  perception: "green",
  willpower: "red",
};

const icons: Record<CharacterAttribute, React.FC<EveIconProps>> = {
  charisma: CharismaAttributeSmallIcon,
  intelligence: IntelligenceAttributeSmallIcon,
  memory: MemoryAttributeSmallIcon,
  perception: PerceptionAttributeSmallIcon,
  willpower: WillpowerAttributeSmallIcon,
};

export function CharacterAttributesRingProgress() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useGetCharactersCharacterIdAttributes(
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

  const normalizeAttributeToPercentage = (value: number) => {
    const zero = 0;
    const max = 40;
    return (value - zero) * (100 / (max - zero));
  };

  const stats = characterAttributes.map((attribute) => {
    const Icon = icons[attribute];
    return (
      <Paper withBorder radius="md" p="xs" key={attribute}>
        <Group>
          <RingProgress
            size={42}
            roundCaps
            thickness={4}
            sections={[
              {
                value: normalizeAttributeToPercentage(
                  data?.data[attribute] ?? 0,
                ),
                color: colors[attribute],
              },
            ]}
            label={<Center>{<Icon width={32} />}</Center>}
          />

          <div>
            <Text color="dimmed" size="xs" transform="uppercase" weight={700}>
              {attribute}
            </Text>
            <Text weight={700} size="xl">
              {data?.data[attribute]}
            </Text>
          </div>
        </Group>
      </Paper>
    );
  });

  const remapCooldownElapsed =
    data?.data.accrued_remap_cooldown_date &&
    new Date(data.data.accrued_remap_cooldown_date).getTime() <
      new Date().getTime();

  return (
    <SimpleGrid
      cols={6}
      breakpoints={[
        { maxWidth: "lg", cols: 3 },
        { maxWidth: "sm", cols: 2 },
        { maxWidth: 500, cols: 1 },
      ]}
    >
      {stats}
      <Popover>
        <Popover.Target>
          <UnstyledButton>
            <Paper
              withBorder
              radius="md"
              p="xs"
              sx={(theme) => ({
                backgroundColor:
                  theme.colors.dark[theme.colorScheme === "dark" ? 9 : 6],
                color: "#fff",
                "&:hover": {
                  backgroundColor:
                    theme.colors.dark[theme.colorScheme === "dark" ? 6 : 9],
                },
              })}
            >
              <Group>
                <AttributesIcon width={42} />

                <Stack spacing={0}>
                  <Group spacing="xs" position="apart">
                    <Text
                      color="dimmed"
                      size="xs"
                      transform="uppercase"
                      weight={700}
                    >
                      Remap
                    </Text>
                  </Group>
                  <Group spacing="xs">
                    <Text weight={700} size="xl">
                      {remapCooldownElapsed
                        ? "Available"
                        : (data?.data.bonus_remaps ?? 0) > 0
                        ? "Bonus"
                        : "No"}
                    </Text>
                  </Group>
                </Stack>
              </Group>
            </Paper>
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack>
            {data?.data.last_remap_date && (
              <Group position="apart" spacing="xl">
                <Text size="sm" color="dimmed">
                  Last remap
                </Text>
                <Text size="sm">
                  {format(
                    new Date(data.data.last_remap_date),
                    "yyyy-MM-dd HH:mm",
                  )}
                </Text>
              </Group>
            )}
            {data?.data.accrued_remap_cooldown_date && (
              <Group position="apart" spacing="xl">
                <Text size="sm" color="dimmed">
                  Next remap
                </Text>
                <Text size="sm">
                  {format(
                    new Date(data.data.accrued_remap_cooldown_date),
                    "yyyy-MM-dd HH:mm",
                  )}
                </Text>
              </Group>
            )}
            {data?.data.bonus_remaps && (
              <Group position="apart" spacing="xl">
                <Text size="sm" color="dimmed">
                  Bonus Remaps
                </Text>
                <Text size="sm">{data.data.bonus_remaps} </Text>
              </Group>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </SimpleGrid>
  );
}