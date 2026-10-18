"use client";

import { Skeleton, Text, Tooltip } from "@mantine/core";
import { IconCrosshair } from "@tabler/icons-react";

import { TypeName } from "@jitaspace/eve-components";
import { TypeAvatar } from "@jitaspace/ui";

import type { KillmailCardProps } from "./parts";
import { TypeAnchor } from "~/components/Anchor";
import classes from "./KillmailTileCard.module.css";
import {
  accentStyle,
  finalBlowOf,
  KillmailActions,
  KillmailLocation,
  KillmailTimeAgo,
  KillmailValue,
  othersLabel,
  partsClasses as parts,
  PartyAffiliation,
  PartyAvatar,
  PartyName,
} from "./parts";

/**
 * A killmail as a compact tile, for a grid that fills the page — ship and
 * value, the victim, the final blow, and where and when.
 */
export function KillmailTileCard({
  killmail,
  hash,
  zkb,
  tag,
}: Readonly<KillmailCardProps>) {
  const { victim } = killmail;
  const finalBlow = finalBlowOf(killmail);
  return (
    <article
      className={classes.card}
      style={accentStyle(tag)}
      aria-label={`Killmail ${killmail.killmail_id}`}
    >
      <div className={classes.head}>
        <TypeAvatar
          typeId={victim.ship_type_id}
          variation="render"
          size={44}
          radius="sm"
        />
        <div className={classes.headText}>
          <TypeAnchor
            typeId={victim.ship_type_id}
            size="sm"
            fw={700}
            c="bright"
            className={parts.truncate}
          >
            <TypeName span inherit typeId={victim.ship_type_id} />
          </TypeAnchor>
          {tag && (
            <Text
              span
              size="xs"
              fw={600}
              className={`${parts.truncate} ${parts.accentText}`}
            >
              {tag.label}
            </Text>
          )}
        </div>
        <KillmailValue zkb={zkb} />
      </div>

      <div className={classes.party}>
        <PartyAvatar party={victim} size={24} />
        <div style={{ minWidth: 0 }}>
          <div className={parts.truncate}>
            <PartyName party={victim} />
          </div>
          <PartyAffiliation party={victim} logos={false} />
        </div>
      </div>

      <Tooltip label="Final blow" position="top-start">
        <div className={classes.killer}>
          <IconCrosshair size={14} className={classes.glyph} />
          {finalBlow && <PartyAvatar party={finalBlow} size={18} />}
          <span className={parts.truncate}>
            {finalBlow ? (
              <PartyName party={finalBlow} size="xs" />
            ) : (
              <Text span size="xs" c="dimmed">
                No attackers
              </Text>
            )}
          </span>
          <Text span size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {othersLabel(killmail)}
          </Text>
        </div>
      </Tooltip>

      <div className={classes.foot}>
        <div className={classes.footWhere}>
          <KillmailLocation
            solarSystemId={killmail.solar_system_id}
            showRegion={false}
            size="xs"
          />
          <KillmailTimeAgo killmail={killmail} hash={hash} />
        </div>
        <KillmailActions killmail={killmail} hash={hash} />
      </div>
    </article>
  );
}

export function KillmailTileCardSkeleton() {
  return (
    <div className={classes.card} aria-busy="true">
      <div className={classes.head}>
        <Skeleton h={44} w={44} radius="sm" />
        <Skeleton h={14} w="70%" />
        <Skeleton h={14} w={40} />
      </div>
      <Skeleton h={24} w="80%" />
      <Skeleton h={14} w="60%" />
      <Skeleton h={14} w="50%" />
    </div>
  );
}
