"use client";

import { memo } from "react";
import { UnstyledButton } from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import type { EntityCardVariant } from "@jitaspace/ui";
import { KillmailCard as EveKillmailCard } from "@jitaspace/eve-components";

import { EsiKillmailFittingCard } from "~/components/Fitting";

interface KillmailCardProps {
  killmailId: number;
  killmailHash: string;
  variant?: EntityCardVariant;
}

/**
 * The shared killmail card, with the lost ship's fitting beside it: a
 * thumbnail that opens the full fitting in a modal.
 */
export const KillmailCard = memo(
  ({ killmailId, killmailHash, variant = "compact" }: KillmailCardProps) => (
    <EveKillmailCard
      killmailId={killmailId}
      killmailHash={killmailHash}
      variant={variant}
      headerRightSection={
        <UnstyledButton
          aria-label="Show the lost ship's fitting"
          onClick={() => {
            openContextModal({
              modal: "killmailFitting",
              withCloseButton: false,
              size: "sm",
              padding: 0,
              innerProps: { killmailId, killmailHash },
              style: { padding: 0, margin: 0 },
            });
          }}
        >
          <EsiKillmailFittingCard
            killmailId={killmailId}
            killmailHash={killmailHash}
            hideModules
          />
        </UnstyledButton>
      }
    />
  ),
);
KillmailCard.displayName = "KillmailCard";
