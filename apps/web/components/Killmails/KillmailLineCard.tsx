"use client";

import { Anchor, Skeleton, Text } from "@mantine/core";

import { TypeName } from "@jitaspace/eve-components";
import { DateHoverCard, TypeAvatar } from "@jitaspace/ui";

import type { KillmailCardProps } from "./parts";
import { HoverPrefetchLink } from "~/components/Link";
import { formatUtcTime } from "~/lib/format";
import classes from "./KillmailLineCard.module.css";
import {
  accentStyle,
  finalBlowOf,
  KillmailActions,
  KillmailLocation,
  KillmailValue,
  othersLabel,
  partsClasses as parts,
  PartyAffiliation,
  PartyAvatar,
  PartyName,
} from "./parts";
import { killmailPagePath } from "./zkillboard";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** The column titles above a list of {@link KillmailLineCard}s, on the same tracks. */
export function KillmailLineCardHeader() {
  return (
    <div className={classes.container} aria-hidden="true">
      <div className={classes.header}>
        <span className={classes.time}>EVE</span>
        <span className={classes.ship}>Ship</span>
        <span className={classes.victim}>Victim</span>
        <span className={classes.attacker}>Final blow</span>
        <span className={classes.where}>System</span>
        <span className={classes.value}>Value</span>
        <span className={classes.actions} />
      </div>
    </div>
  );
}

/**
 * A killmail as one dense row, killboard style, its columns aligned with
 * every other row's and with {@link KillmailLineCardHeader}.
 */
export function KillmailLineCard({
  killmail,
  hash,
  zkb,
  tag,
}: Readonly<KillmailCardProps>) {
  const { victim } = killmail;
  const finalBlow = finalBlowOf(killmail);
  const killedAt = new Date(killmail.killmail_time);
  return (
    <div className={classes.container}>
      <article
        className={classes.line}
        style={accentStyle(tag)}
        aria-label={`Killmail ${killmail.killmail_id}`}
      >
        {/* The grid area sits on this wrapper: the hover card wraps its
            child in a span of its own. */}
        <div className={classes.time}>
          <DateHoverCard date={killedAt}>
            <span>
              <span className={classes.clock}>
                {formatUtcTime(killmail.killmail_time)}
              </span>
              <span className={classes.day}>{dayFormat.format(killedAt)}</span>
            </span>
          </DateHoverCard>
        </div>

        <div className={`${classes.cell} ${classes.ship}`}>
          <TypeAvatar typeId={victim.ship_type_id} size={32} radius="xs" />
          <div className={classes.stack}>
            <Anchor
              component={HoverPrefetchLink}
              href={killmailPagePath(killmail.killmail_id, hash)}
              size="sm"
              fw={700}
              c="bright"
              className={parts.truncate}
            >
              <TypeName span inherit typeId={victim.ship_type_id} />
            </Anchor>
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
        </div>

        <div className={`${classes.cell} ${classes.victim}`}>
          <PartyAvatar party={victim} size={32} />
          <div className={classes.stack}>
            <span className={parts.truncate}>
              <PartyName party={victim} />
            </span>
            <PartyAffiliation party={victim} logos={false} />
          </div>
        </div>

        <div className={`${classes.cell} ${classes.attacker}`}>
          {finalBlow && <PartyAvatar party={finalBlow} size={32} />}
          <div className={classes.stack}>
            <span className={parts.truncate}>
              {finalBlow ? <PartyName party={finalBlow} /> : "—"}
            </span>
            <Text span size="xs" c="dimmed">
              {othersLabel(killmail)}
            </Text>
          </div>
        </div>

        <div className={`${classes.cell} ${classes.where}`}>
          <KillmailLocation
            solarSystemId={killmail.solar_system_id}
            showRegion={false}
          />
        </div>

        <div className={classes.value}>
          <KillmailValue zkb={zkb} />
        </div>

        <div className={classes.actions}>
          <KillmailActions killmail={killmail} hash={hash} />
        </div>
      </article>
    </div>
  );
}

export function KillmailLineCardSkeleton() {
  return (
    <div className={classes.container}>
      <div className={classes.line} aria-busy="true">
        <Skeleton h={28} className={classes.time} />
        <Skeleton h={28} className={classes.ship} />
        <Skeleton h={28} className={classes.victim} />
        <Skeleton h={28} className={classes.attacker} />
        <Skeleton h={16} className={classes.where} />
        <Skeleton h={16} className={classes.value} />
        <span className={classes.actions} />
      </div>
    </div>
  );
}
