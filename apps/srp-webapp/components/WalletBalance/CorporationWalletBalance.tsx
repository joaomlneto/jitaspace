import React, { memo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";

import { InfoIcon } from "@jitaspace/eve-icons";
import { TimeAgoText } from "@jitaspace/ui";

import { WalletBalance } from "~/components/WalletBalance/WalletBalance";
import { api } from "~/utils/api";

export const CorporationWalletBalance = memo(() => {
  const { data: corporationWalletBalance } =
    api.wallet.getCorporationWalletBalance.useQuery();

  const totalBalance = corporationWalletBalance?.divisions.reduce(
    (total, division) => total + division.balance,
    0,
  );

  return (
    <Stack spacing="xs">
      <WalletBalance balance={totalBalance} division="SRP Fund" />
      {corporationWalletBalance && (
        <Group spacing="xs">
          <Text color="dimmed" size="sm">
            Updated{" "}
            <TimeAgoText
              span
              date={new Date(corporationWalletBalance?.fetchedOn)}
              addSuffix
            />
          </Text>
          <Tooltip label="Updates every 5 minutes" color="dark">
            <div>
              <InfoIcon width={20} />
            </div>
          </Tooltip>
        </Group>
      )}
    </Stack>
  );
});
CorporationWalletBalance.displayName = "CorporationWalletBalance";
