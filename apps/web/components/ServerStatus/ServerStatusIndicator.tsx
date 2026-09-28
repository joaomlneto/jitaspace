import { memo } from "react";
import { ColorSwatch, Group, Loader, Text } from "@mantine/core";

import type { GetStatusQueryResponse } from "@jitaspace/esi-client";
import { useServerStatus } from "@jitaspace/hooks";

/**
 * VIP mode is checked before plain success: a server in VIP mode answers the
 * status request successfully too, so checking success first painted it green.
 */
export const serverStatusColor = ({
  isSuccess,
  isVip,
}: {
  isSuccess: boolean;
  isVip: boolean;
}) => {
  if (!isSuccess) return "red";
  return isVip ? "yellow" : "green";
};

export const ServerStatusIndicator = memo(() => {
  const { data, isLoading, isSuccess } = useServerStatus();

  // ESI's schema marks `players` as required, but responses have arrived
  // without it (Sentry JITASPACE-5E). This renders in the header on every
  // page, so an unguarded `players.toLocaleString()` took the whole page down
  // to the error screen.
  const status: Partial<GetStatusQueryResponse> | undefined = data?.data;
  const isVip = !!status?.vip;
  const players = status?.players;

  return (
    <Group gap={4} wrap="nowrap">
      {isLoading && <Loader size={12} />}
      {!isLoading && (
        <ColorSwatch
          size={12}
          color={serverStatusColor({ isSuccess, isVip })}
        />
      )}
      {isLoading && <Text size="xs">Checking...</Text>}
      {!isLoading && isSuccess && !isVip && (
        <Text size="xs">
          {players === undefined ? "Online" : players.toLocaleString()}
        </Text>
      )}
      {!isLoading && isSuccess && isVip && <Text size="xs">VIP Mode</Text>}
      {!isLoading && !isSuccess && <Text size="xs">TQ Down</Text>}
    </Group>
  );
});

ServerStatusIndicator.displayName = "ServerStatusIndicator";
