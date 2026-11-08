import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Group, Stack, Text } from "@mantine/core";

import {
  AllianceTickerBadge,
  CalendarEventResponseBadge,
  CorporationTickerBadge,
  MailLabelBadge,
  securityStatusBand,
  SolarSystemSecurityStatusBadge,
  StandingsBadge,
  WarAggressorTickerBadge,
  WarDefenderTickerBadge,
} from "@jitaspace/ui";

import { SAMPLE } from "./fixtures";

const meta = {
  title: "Components/Badge",
  component: SolarSystemSecurityStatusBadge,
  args: { securityStatus: 0.9459 },
  argTypes: {
    securityStatus: { control: { type: "range", min: -1, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof SolarSystemSecurityStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SecurityStatus: Story = {};

/** The in-game map's colour for every rounded security level. Negative statuses display as 0.0. */
export const SecurityStatusScale: Story = {
  render: (args) => (
    <Stack gap="xs">
      {(["High-Sec", "Low-Sec", "Null-Sec"] as const).map((band) => (
        <Group key={band} gap="xs">
          <Text size="sm" w={70}>
            {band}
          </Text>
          {[1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0]
            .filter((status) => securityStatusBand(status) === band)
            .map((status) => (
              <SolarSystemSecurityStatusBadge
                key={status}
                {...args}
                securityStatus={status}
              />
            ))}
        </Group>
      ))}
    </Stack>
  ),
};

export const Standings: Story = {
  render: () => (
    <Group gap="xs">
      {[10, 5.5, 2.3, 0, -2.5, -5, -7.8, -10].map((standing) => (
        <StandingsBadge key={standing} standing={standing} />
      ))}
    </Group>
  ),
};

/** Raw values on the left; each badge is coloured by the value it shows. */
const RawValues = ({
  values,
  render,
}: {
  values: number[];
  render: (value: number) => React.ReactNode;
}) => (
  <Stack gap={6}>
    {values.map((value) => (
      <Group key={value} gap="xs">
        <Text size="sm" ff="monospace" w={60}>
          {value}
        </Text>
        {render(value)}
      </Group>
    ))}
  </Stack>
);

/**
 * Rounding edges: a barely-positive status is low-sec, so it shows 0.1, never
 * null-sec's 0.0; negative statuses show as 0.0.
 */
export const SecurityStatusRounding: Story = {
  render: () => (
    <RawValues
      values={[0.45, 0.449, 0.05, 0.04, 0.001, 0, -0.4]}
      render={(value) => (
        <SolarSystemSecurityStatusBadge securityStatus={value} />
      )}
    />
  ),
};

/** The colour follows the displayed value, so 0.04 reads 0.0 in neutral grey. */
export const StandingsRounding: Story = {
  render: () => (
    <RawValues
      values={[5.04, 5, 0.04, -0.04, -5.04]}
      render={(value) => <StandingsBadge standing={value} />}
    />
  ),
};

export const CalendarEventResponses: Story = {
  render: () => (
    <Group gap="xs">
      {(["accepted", "tentative", "not_responded", "declined"] as const).map(
        (response) => (
          <CalendarEventResponseBadge key={response} response={response} />
        ),
      )}
    </Group>
  ),
};

export const Tickers: Story = {
  render: () => (
    <Stack gap="xs" align="start">
      <Group gap="xs">
        <Text size="sm" w={110}>
          Corporation
        </Text>
        <CorporationTickerBadge ticker={SAMPLE.corporation.ticker} />
        <CorporationTickerBadge
          ticker={SAMPLE.npcCorporation.ticker}
          variant="outline"
        />
      </Group>
      <Group gap="xs">
        <Text size="sm" w={110}>
          Alliance
        </Text>
        <AllianceTickerBadge ticker={SAMPLE.alliance.ticker} color="yellow" />
      </Group>
      <Group gap="xs">
        <Text size="sm" w={110}>
          War
        </Text>
        <WarAggressorTickerBadge
          ticker={SAMPLE.war.aggressor.ticker}
          color="red"
        />
        <Text size="sm">vs</Text>
        <WarDefenderTickerBadge
          ticker={SAMPLE.war.defender.ticker}
          color="blue"
        />
      </Group>
    </Stack>
  ),
};

export const MailLabels: Story = {
  render: () => (
    <Group gap="xs">
      <MailLabelBadge labelName="Inbox" />
      <MailLabelBadge labelName="Fleet ops" color="#fe0000" />
      <MailLabelBadge labelName="Industry" color="#ff6600" variant="light" />
      <MailLabelBadge labelName="Market" color="#349800" variant="outline" />
    </Group>
  ),
};

/** Every badge renders a skeleton until its value arrives. */
export const Loading: Story = {
  render: () => (
    <Group gap="xs">
      <SolarSystemSecurityStatusBadge />
      <StandingsBadge />
      <CalendarEventResponseBadge />
      <CorporationTickerBadge />
      <AllianceTickerBadge />
    </Group>
  ),
};
