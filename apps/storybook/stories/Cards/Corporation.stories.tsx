import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CorporationCardDisplay } from "@jitaspace/ui";

import { CORPORATION } from "../cardFixtures";

const meta = {
  title: "Cards/Corporation",
  component: CorporationCardDisplay,
  args: {
    corporationId: CORPORATION.id,
    corporation: CORPORATION.data,
    variant: "full",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof CorporationCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dressed in the corporation's in-game palette: stripe, wash and ticker. */
export const Full: Story = {};

export const Compact: Story = { args: { variant: "compact" } };

/** NPC corporations, and many player ones, have no palette. */
export const WithoutPalette: Story = {
  args: { corporation: { ...CORPORATION.data, palette: undefined } },
};

/** A single white palette colour: the ticker gains an edge on light cards. */
export const PaleTicker: Story = {
  args: {
    corporation: {
      ...CORPORATION.data,
      palette: { main_color: "#ffffff" },
    },
  },
};

/** Missing fields read "N/A"; a `url` that is not http(s) is not linked. */
export const SparseData: Story = {
  args: {
    corporation: {
      name: CORPORATION.data.name,
      ticker: CORPORATION.data.ticker,
      url: "dredditisrecruiting",
    },
  },
};

export const Loading: Story = { args: { corporation: undefined } };
