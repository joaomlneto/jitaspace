import { memo } from "react";
import { ColorSwatch, Group, Loader, Text } from "@mantine/core";

import { useServerStatus } from "@jitaspace/hooks";

export const ServerStatusIndicator = memo(() => {
  const { data, isError, isLoading, isSuccess } = useServerStatus();

  const isVip = !!data?.data.vip;

  return (
    <Group gap={4} wrap="nowrap">
      {isLoading && <Loader size={12} />}
      {!isLoading && (
        <ColorSwatch
          size={12}
          color={isSuccess ? "green" : isVip ? "yellow" : "red"}
        />
      )}
      {isLoading && <Text size="xs">Checking...</Text>}
      {!isLoading && isSuccess && !isVip && (
        <Text size="xs">{data?.data.players.toLocaleString()}</Text>
      )}
      {!isLoading && isSuccess && isVip && <Text size="xs">VIP Mode</Text>}
      {!isLoading && !isSuccess && <Text size="xs">TQ Down</Text>}
    </Group>
  );
});
