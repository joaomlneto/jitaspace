"use client";

import { memo, useMemo } from "react";
import {
  ColorSwatch,
  Group,
  Loader,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { openModal } from "@mantine/modals";

import { useGetStatus as useGetMetaStatus } from "@jitaspace/esi-meta-client";

import RateLimitDashboard from "~/components/RateLimits/RateLimitDashboard";
import { useEsiRateLimitState } from "~/lib/useEsiRateLimitState";

type IndicatorColor = "green" | "yellow" | "red";

export const EsiStatusIndicator = memo(() => {
  const {
    data: esiStatus,
    isLoading,
    isError,
  } = useGetMetaStatus(
    {},
    {
      query: { refetchInterval: 30 * 1000 },
    },
  );
  const rateLimitState = useEsiRateLimitState({
    refreshMs: 1000,
  });

  const endpointStatusCounts = useMemo(() => {
    const entries = esiStatus?.data ?? [];
    let red = 0;
    let yellow = 0;
    for (const entry of entries) {
      if (entry.status === "red") {
        red += 1;
      } else if (entry.status === "yellow") {
        yellow += 1;
      }
    }
    return { red, yellow, total: entries.length };
  }, [esiStatus?.data]);

  const hasEndpointRed = endpointStatusCounts.red > 0;
  const hasEndpointYellow = endpointStatusCounts.yellow > 0;

  const isThrottling = rateLimitState.waiting > 0;
  const hasRateLimitErrors = rateLimitState.totalFailed > 0;

  const hasErrors = isError || hasEndpointRed || hasRateLimitErrors;
  const hasWarnings = hasEndpointYellow || isThrottling;

  const statusColor: IndicatorColor = hasErrors
    ? "red"
    : hasWarnings
      ? "yellow"
      : "green";

  const showLoader = isLoading && !hasErrors && !hasWarnings;
  const statusLabel = showLoader
    ? "Checking ESI..."
    : hasErrors
      ? "ESI issues"
      : hasWarnings
        ? "ESI degraded"
        : "ESI OK";

  return (
    <Tooltip label={`${statusLabel}. Click for ESI dashboard.`} openDelay={200}>
      <UnstyledButton
        onClick={() =>
          openModal({
            title: null,
            size: "90%",
            children: <RateLimitDashboard />,
          })
        }
        aria-label="Open ESI dashboard"
      >
        <Group gap={4} wrap="nowrap">
          {showLoader ? (
            <Loader size={12} />
          ) : (
            <ColorSwatch size={12} color={statusColor} />
          )}
          <Text size="xs">ESI</Text>
        </Group>
      </UnstyledButton>
    </Tooltip>
  );
});
