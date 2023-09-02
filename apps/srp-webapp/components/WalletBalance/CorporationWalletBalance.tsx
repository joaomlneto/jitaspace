import React, { memo } from "react";
import { Stack, Text } from "@mantine/core";

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
        <Text color="dimmed" size="sm">
          Updated{" "}
          <TimeAgoText
            span
            date={new Date(corporationWalletBalance?.fetchedOn)}
            addSuffix
          />
        </Text>
      )}
    </Stack>
  );
});
CorporationWalletBalance.displayName = "CorporationWalletBalance";
