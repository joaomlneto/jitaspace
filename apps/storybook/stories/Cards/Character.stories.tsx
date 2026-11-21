import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CharacterCardDisplay } from "@jitaspace/ui";

import { CHARACTER } from "../cardFixtures";

const meta = {
  title: "Cards/Character",
  component: CharacterCardDisplay,
  args: {
    characterId: CHARACTER.id,
    character: CHARACTER.data,
    variant: "full",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof CharacterCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Compact: Story = { args: { variant: "compact" } };

/** A militia pilot with a negative security status. */
export const Militia: Story = {
  args: {
    character: {
      ...CHARACTER.data,
      alliance: undefined,
      faction: { id: 500001, name: "Caldari State" },
      securityStatus: -3.4,
    },
  },
};

export const Loading: Story = { args: { character: undefined } };
