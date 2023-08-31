import React, { memo } from "react";
import { Center, Group, Paper, RingProgress, Text } from "@mantine/core";

import { WalletIcon } from "@jitaspace/eve-icons";

type WalletBalanceProps = {
  division: string;
  balance: number;
};

export const WalletBalance = memo(
  ({ balance, division }: WalletBalanceProps) => {
    return (
      <Paper withBorder radius="md" p="xs">
        <Group>
          <RingProgress
            size={80}
            roundCaps
            thickness={8}
            sections={[{ value: balance / 3200000000, color: "green" }]}
            label={
              <Center>
                <WalletIcon width={32} />
              </Center>
            }
          />

          <div>
            <Text color="dimmed" size="xs" transform="uppercase" weight={700}>
              {division}
            </Text>
            <Text weight={700} size="xl">
              {balance.toLocaleString()} ISK
            </Text>
          </div>
        </Group>
      </Paper>
    );
  },
);

WalletBalance.displayName = "WalletBalance";
