"use client";

import type { ComponentType, ReactNode } from "react";
import { memo } from "react";
import { Anchor, Paper, Text } from "@mantine/core";

import { useKillmail } from "@jitaspace/hooks";

import type { KillmailCardProps, KillmailCardTag } from "./parts";
import type { EsiKillmail } from "./zkillboard";
import { zkillboardKillUrl } from "./zkillboard";

export interface EsiKillmailCardProps extends Omit<
  KillmailCardProps,
  "killmail" | "hash"
> {
  killmailId: number;
  killmailHash: string;
  /** The card to render once the killmail has loaded. */
  card: ComponentType<KillmailCardProps>;
  /** What to show while it loads: the card's own skeleton. */
  skeleton: ReactNode;
  /** Picks the tag once the killmail is known (who lost the ship). */
  tagFor?: (killmail: EsiKillmail) => KillmailCardTag | undefined;
}

/**
 * Fetches a killmail from ESI by id and hash, then renders it with the given
 * card (`KillmailLineCard`, `KillmailTileCard` or `KillmailFeedCard`).
 */
export const EsiKillmailCard = memo(
  ({
    killmailId,
    killmailHash,
    card: Card,
    skeleton,
    tag,
    tagFor,
    zkb,
  }: EsiKillmailCardProps) => {
    const { data, isError } = useKillmail(killmailHash, killmailId);
    const killmail = data?.data;

    if (killmail) {
      return (
        <Card
          killmail={killmail}
          hash={killmailHash}
          zkb={zkb}
          tag={tag ?? tagFor?.(killmail)}
        />
      );
    }
    if (isError) {
      return (
        <Paper withBorder radius="md" p="sm">
          <Text size="sm" c="dimmed">
            Killmail #{killmailId} could not be loaded.{" "}
            <Anchor
              href={zkillboardKillUrl(killmailId)}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              View it on zKillboard
            </Anchor>
            .
          </Text>
        </Paper>
      );
    }
    return skeleton;
  },
);
EsiKillmailCard.displayName = "EsiKillmailCard";
