import { memo } from "react";
import { ColorSwatch, Group, Loader, Text } from "@mantine/core";

import { useServerStatus } from "@jitaspace/hooks";

export const ServerStatusIndicator = memo(() => {
  const { data, isError: _isError, isLoading, isSuccess } = useServerStatus();

  const isVip = !!data?.data.vip;

  let swatchColor: string;
  if (isSuccess) {
    swatchColor = "green";
  } else if (isVip) {
    swatchColor = "yellow";
  } else {
    swatchColor = "red";
  }

  return (
    <Group gap={4} wrap="nowrap">
      {isLoading && <Loader size={12} />}
      {!isLoading && <ColorSwatch size={12} color={swatchColor} />}
      {isLoading && <Text size="xs">Checking...</Text>}
      {!isLoading && isSuccess && !isVip && (
        <Text size="xs">{data?.data.players.toLocaleString()}</Text>
      )}
      {!isLoading && isSuccess && isVip && <Text size="xs">VIP Mode</Text>}
      {!isLoading && !isSuccess && <Text size="xs">TQ Down</Text>}
    </Group>
  );
});
