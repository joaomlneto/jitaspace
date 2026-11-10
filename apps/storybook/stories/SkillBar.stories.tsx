import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Table, Text } from "@mantine/core";

import { SkillBar } from "@jitaspace/ui";

const meta = {
  title: "Components/Skill Bar",
  component: SkillBar,
  args: { activeLevel: 3, requiredLevel: 5, requirementType: "missing" },
  argTypes: {
    activeLevel: { control: { type: "range", min: 0, max: 5, step: 1 } },
    requiredLevel: { control: { type: "range", min: 0, max: 5, step: 1 } },
    requirementType: {
      control: "inline-radio",
      options: ["missing", "queued", "missingStrong"],
    },
  },
} satisfies Meta<typeof SkillBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The in-game skill level boxes: trained, required-but-missing, not required. */
export const Skill: Story = {};

export const SkillStates: Story = {
  render: () => (
    <Table w="auto" withRowBorders={false}>
      <Table.Tbody>
        {(
          [
            ["Fully trained", 5, 5, "missing"],
            ["Level 3 of 5 required", 3, 5, "missing"],
            ["Levels 4-5 queued", 3, 5, "queued"],
            ["Required, untrained", 0, 4, "missingStrong"],
            ["Level 2, none required", 2, 0, "missing"],
          ] as const
        ).map(([label, activeLevel, requiredLevel, requirementType]) => (
          <Table.Tr key={label}>
            <Table.Td>
              <Text size="sm">{label}</Text>
            </Table.Td>
            <Table.Td>
              <SkillBar
                activeLevel={activeLevel}
                requiredLevel={requiredLevel}
                requirementType={requirementType}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  ),
};
