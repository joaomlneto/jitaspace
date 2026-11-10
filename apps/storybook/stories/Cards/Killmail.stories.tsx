import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KillmailCardDisplay } from "@jitaspace/ui";

import { KILLMAIL } from "../cardFixtures";

const meta = {
  title: "Cards/Killmail",
  component: KillmailCardDisplay,
  args: {
    killmailId: KILLMAIL.id,
    killmail: KILLMAIL.data,
    variant: "full",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof KillmailCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Compact: Story = { args: { variant: "compact" } };

/** One attacker: the card marks it solo. A killboard's ISK value shows too. */
export const SoloWithValue: Story = {
  args: {
    killmail: { ...KILLMAIL.data, attackerCount: 1, value: 186_400_000 },
  },
};

export const Loading: Story = { args: { killmail: undefined } };
