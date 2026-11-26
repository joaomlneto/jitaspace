import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Badge,
  Button,
  Card,
  ColorSwatch,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";

import {
  CharacterAvatar,
  CorporationTickerBadge,
  ISKAmount,
  SolarSystemSecurityStatusBadge,
  TypeAvatar,
} from "@jitaspace/ui";

import { SAMPLE } from "./fixtures";

/**
 * The web app's themes (`apps/web/themes`). Switch between them with the
 * Theme and Color scheme controls in the toolbar; every story follows.
 */
const meta = {
  title: "Foundations/Theme",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Palette = () => {
  const theme = useMantineTheme();
  return (
    <Stack gap={6}>
      <Text size="sm">
        Primary colour: <code>{theme.primaryColor}</code>
      </Text>
      {Object.entries(theme.colors).map(([name, shades]) => (
        <Group key={name} gap={6} wrap="nowrap">
          <Text
            size="xs"
            w={150}
            ff="monospace"
            fw={name === theme.primaryColor ? 700 : undefined}
          >
            {name}
          </Text>
          {shades.map((shade, index) => (
            <Tooltip key={index} label={`${name}.${index} ${shade}`}>
              <ColorSwatch color={shade} radius="xs" size={24} />
            </Tooltip>
          ))}
        </Group>
      ))}
    </Stack>
  );
};

export const Colors: Story = { render: () => <Palette /> };

export const Typography: Story = {
  render: () => (
    <Stack gap="xs">
      {([1, 2, 3, 4, 5, 6] as const).map((order) => (
        <Title key={order} order={order}>
          Heading {order}: New Eden awaits
        </Title>
      ))}
      <Text>
        Body text. The Jita 4-4 trade hub moves trillions of ISK a day.
      </Text>
      <Text c="dimmed" size="sm">
        Dimmed text, used for secondary labels and timestamps.
      </Text>
    </Stack>
  ),
};

export const Primitives: Story = {
  render: () => (
    <Stack>
      <Group>
        {(["filled", "light", "outline", "default", "subtle"] as const).map(
          (variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ),
        )}
      </Group>
      <Group>
        {(["filled", "light", "outline", "dot"] as const).map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </Group>
      <Divider />
      <Paper p="md" withBorder>
        <Text>Paper</Text>
      </Paper>
    </Stack>
  ),
};

/** A card composed the way the app composes them, from @jitaspace/ui parts. */
export const ComposedCard: Story = {
  render: () => (
    <SimpleGrid cols={{ base: 1, sm: 2 }} maw={720}>
      <Card>
        <Group wrap="nowrap">
          <CharacterAvatar characterId={SAMPLE.character.id} size="xl" />
          <Stack gap={4}>
            <Title order={4}>{SAMPLE.character.name}</Title>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {SAMPLE.corporation.name}
              </Text>
              <CorporationTickerBadge
                ticker={SAMPLE.corporation.ticker}
                size="sm"
              />
            </Group>
            <Group gap="xs">
              <Text size="sm">Jita</Text>
              <SolarSystemSecurityStatusBadge
                securityStatus={0.9459}
                size="sm"
              />
            </Group>
          </Stack>
        </Group>
      </Card>
      <Card>
        <Group wrap="nowrap">
          <TypeAvatar typeId={SAMPLE.types.plex.id} size="xl" />
          <Stack gap={4}>
            <Title order={4}>{SAMPLE.types.plex.name}</Title>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Jita sell
              </Text>
              <ISKAmount amount={5_234_000} size="sm" />
            </Group>
            <Button size="xs" variant="light">
              View market
            </Button>
          </Stack>
        </Group>
      </Card>
    </SimpleGrid>
  ),
};
