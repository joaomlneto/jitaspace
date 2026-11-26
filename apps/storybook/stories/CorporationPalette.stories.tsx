import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, Group, Stack, Text } from "@mantine/core";

import type { CorporationPalette } from "@jitaspace/ui";
import {
  CorporationAvatar,
  CorporationPaletteStripe,
  corporationPaletteStyles,
  CorporationPaletteSwatches,
  CorporationTickerPaletteBadge,
  getCorporationPaletteSlots,
  useCorporationPaletteVars,
} from "@jitaspace/ui";

/** Palettes as ESI reported them on 2026-10-13. */
const PALETTES: {
  id: number;
  name: string;
  ticker: string;
  palette: CorporationPalette;
}[] = [
  {
    id: 1018389948,
    name: "Dreddit",
    ticker: "B0RT",
    palette: {
      main_color: "#0029ff",
      secondary_color: "#009cff",
      tertiary_color: "#ffffff",
    },
  },
  {
    id: 667531913,
    name: "GoonWaffe",
    ticker: "GEWNS",
    palette: {
      main_color: "#000000",
      secondary_color: "#b3fb04",
      tertiary_color: "#020300",
    },
  },
  {
    id: 98657999,
    name: "Rage Confederacy",
    ticker: "RAGEE",
    palette: { main_color: "#960000" },
  },
  {
    id: 98553333,
    name: "R Strike",
    ticker: "R ST",
    palette: { main_color: "#ffffff" },
  },
];

const PaletteSample = ({
  id,
  name,
  ticker,
  palette,
}: (typeof PALETTES)[number]) => {
  const slots = getCorporationPaletteSlots(palette);
  const colors = slots.map(({ color }) => color);
  const vars = useCorporationPaletteVars(colors);
  return (
    <Card withBorder radius="md" p={0} style={vars}>
      <CorporationPaletteStripe slots={slots} />
      <Group p="sm" style={corporationPaletteStyles.wash} wrap="nowrap">
        <CorporationAvatar
          corporationId={id}
          size={38}
          style={corporationPaletteStyles.logoBacking}
        />
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={500}>{name}</Text>
            <CorporationTickerPaletteBadge ticker={ticker} colors={colors} />
          </Group>
          <CorporationPaletteSwatches slots={slots} size={16} />
        </Stack>
      </Group>
    </Card>
  );
};

/**
 * The colours a corporation picks in game: a stripe, a wash over its header,
 * a ticker filled with its main colour (with an edge where that is too close
 * to the surface), and swatches naming each colour.
 */
const meta = {
  title: "Components/Corporation Palette",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palettes: Story = {
  render: () => (
    <Stack maw={420}>
      {PALETTES.map((sample) => (
        <PaletteSample key={sample.id} {...sample} />
      ))}
    </Stack>
  ),
};
