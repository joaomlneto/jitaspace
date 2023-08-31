import React, { memo } from "react";
import {
  Center,
  Group,
  Paper,
  RingProgress,
  Skeleton,
  Text,
} from "@mantine/core";

import { WalletIcon } from "@jitaspace/eve-icons";

type WalletBalanceProps = {
  division: string;
  balance?: number;
};

export const WalletBalance = memo(
  ({ balance, division }: WalletBalanceProps) => {
    return (
      <Paper withBorder radius="md" p="xs">
        <Group>
          <RingProgress
            size={60}
            roundCaps
            thickness={8}
            sections={[{ value: (balance ?? 0) / 3200000000, color: "green" }]}
            label={
              <Center>
                <WalletIcon width={24} />
              </Center>
            }
          />

          <div>
            <Text color="dimmed" size="xs" transform="uppercase" weight={700}>
              {division}
            </Text>
            <Skeleton visible={balance === undefined}>
              <Text weight={700} size="xl">
                {(balance ?? 123456789012).toLocaleString()} ISK
              </Text>
            </Skeleton>
          </div>
        </Group>
      </Paper>
    );
  },
);

WalletBalance.displayName = "WalletBalance";
