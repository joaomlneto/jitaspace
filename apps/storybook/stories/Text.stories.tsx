import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stack, Table } from "@mantine/core";

import {
  AsteroidBeltName,
  BloodlineName,
  CalendarEventOwnerName,
  CategoryName,
  CSPACostText,
  DogmaAttributeName,
  DogmaAttributeValue,
  DogmaEffectName,
  EveEntityNameDisplay,
  GroupName,
  ISKAmount,
  LabelName,
  MailingListName,
  MarketGroupName,
  MoonName,
  PlanetName,
  Position3DText,
  RaceName,
  StargateName,
  StarName,
} from "@jitaspace/ui";

const meta = {
  title: "Components/Text",
  component: ISKAmount,
  args: { amount: 1_234_567_890.12, digits: 1, showFullAmount: false },
} satisfies Meta<typeof ISKAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Abbreviated amount, with the exact figure in a tooltip. */
export const ISK: Story = {};

export const ISKMagnitudes: Story = {
  render: (args) => (
    <Table w="auto" withRowBorders={false}>
      <Table.Tbody>
        {[
          0, 0.5, 950, 999.96, 12_500, 999_950, 4_200_000, 1_234_567_890,
          999_999_999, 2.5e12, -350_000_000,
        ].map((amount) => (
          <Table.Tr key={amount}>
            <Table.Td>
              <code>{amount}</code>
            </Table.Td>
            <Table.Td>
              <ISKAmount {...args} amount={amount} />
            </Table.Td>
            <Table.Td>
              <ISKAmount {...args} amount={amount} showFullAmount />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  ),
};

/** How a dogma attribute's raw value reads once its unit is applied. */
export const DogmaAttributeValues: Story = {
  render: () => (
    <Table w="auto">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Attribute</Table.Th>
          <Table.Th>Raw value</Table.Th>
          <Table.Th>Unit</Table.Th>
          <Table.Th>Displayed</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {(
          [
            ["Rate of fire", 4500, 101, "ms"],
            ["EM damage resistance", 0.6, 108, "inverse %"],
            ["Damage modifier", 1.15, 109, "modifier %"],
            ["Signature radius bonus", 0.95, 111, "inverse %"],
            ["Chance", 0.25, 127, "%"],
            ["Can fit to capital ships", 1, 137, "boolean"],
            ["Tech level", 2, 117, "level"],
            ["Security modifier", -0.5, 139, "plus sign"],
            ["Capacity", 140, 9, "m3"],
            ["Maximum velocity", 365.5, 11, "m/sec"],
          ] as const
        ).map(([name, value, unitId, unitSymbol]) => (
          <Table.Tr key={name}>
            <Table.Td>
              <DogmaAttributeName name={name} />
            </Table.Td>
            <Table.Td>
              <code>{value}</code>
            </Table.Td>
            <Table.Td>
              <code>{unitId}</code> ({unitSymbol})
            </Table.Td>
            <Table.Td>
              <DogmaAttributeValue
                value={value}
                unitId={unitId}
                unitSymbol={unitSymbol}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  ),
};

/**
 * The name components render an already-resolved name, and a skeleton sized
 * like a name until it arrives.
 */
export const Names: Story = {
  render: () => {
    const names = [
      ["EveEntityNameDisplay", EveEntityNameDisplay, "Chribba"],
      ["BloodlineName", BloodlineName, "Deteis"],
      ["RaceName", RaceName, "Caldari"],
      ["CategoryName", CategoryName, "Ship"],
      ["GroupName", GroupName, "Frigate"],
      ["MarketGroupName", MarketGroupName, "Standard Frigates"],
      ["DogmaAttributeName", DogmaAttributeName, "Structure Hitpoints"],
      ["DogmaEffectName", DogmaEffectName, "Low power"],
      ["PlanetName", PlanetName, "Jita IV"],
      ["MoonName", MoonName, "Jita IV - Moon 4"],
      ["AsteroidBeltName", AsteroidBeltName, "Jita VII - Asteroid Belt 1"],
      ["MailingListName", MailingListName, "Jita Traders"],
    ] as const;
    return (
      <Table w="auto">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Component</Table.Th>
            <Table.Th>Loaded</Table.Th>
            <Table.Th>Loading</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {names.map(([label, Component, name]) => (
            <Table.Tr key={label}>
              <Table.Td>
                <code>{label}</code>
              </Table.Td>
              <Table.Td>
                <Component name={name} />
              </Table.Td>
              <Table.Td>
                {label === "EveEntityNameDisplay" ? (
                  <EveEntityNameDisplay name={name} loading />
                ) : (
                  <Component />
                )}
              </Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr>
            <Table.Td>
              <code>CalendarEventOwnerName</code>
            </Table.Td>
            <Table.Td>
              <CalendarEventOwnerName ownerName="CCP Games" />
            </Table.Td>
            <Table.Td>
              <CalendarEventOwnerName />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>
              <code>StarName</code>, <code>StargateName</code>,{" "}
              <code>LabelName</code>
            </Table.Td>
            <Table.Td>
              <StarName name="Jita - Star" />
              <StargateName name="Stargate (Perimeter)" />
              <LabelName name="Fleet ops" />
            </Table.Td>
            <Table.Td />
          </Table.Tr>
        </Table.Tbody>
      </Table>
    );
  },
};

export const Position3D: Story = {
  render: () => (
    <Position3DText
      position={[-107354576606, -18753785170, 436797007078]}
      ff="monospace"
      size="sm"
    />
  ),
};

/** The ISK CONCORD charges to send mail to a character with CSPA set. */
export const CSPACost: Story = {
  render: () => (
    <Stack gap={4}>
      <CSPACostText cost={250_000} />
      <CSPACostText cost={0} />
      <CSPACostText />
    </Stack>
  ),
};
