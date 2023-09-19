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
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { format } from "date-fns";

import { useGetCharactersCharacterIdAttributes } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
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
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data, error, isLoading } = useGetCharactersCharacterIdAttributes(
    characterId ?? 1,
    {},
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  if (isLoading) return "LOADING";
  if (error) return "ERROR";
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
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
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
              {attribute}
            </Text>
            <Text fw={700} size="xl">
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
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }}>
      {stats}
      <Popover>
        <Popover.Target>
          <UnstyledButton>
            <Paper
              withBorder
              radius="md"
              p="xs"
              style={{
                backgroundColor:
                  theme.colors.dark[colorScheme === "dark" ? 9 : 6],
                color: "#fff",
                /*
                // FIXME MANTINE V7 MIGRATION
                "&:hover": {
                  backgroundColor:
                    theme.colors.dark[colorScheme === "dark" ? 6 : 9],
                },*/
              }}
            >
              <Group>
                <AttributesIcon width={42} />

                <Stack gap={0}>
                  <Group gap="xs" justify="apart">
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Remap
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={700} size="xl">
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
              <Group justify="apart" gap="xl">
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
              <Group justify="apart" gap="xl">
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
              <Group justify="apart" gap="xl">
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
