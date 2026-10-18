"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, Text } from "@mantine/core";

import { CorporationName, TypeName } from "@jitaspace/eve-components";
import { useEsiName } from "@jitaspace/hooks";
import { DateHoverCard, TypeAvatar } from "@jitaspace/ui";

import type { KillmailCardProps } from "./parts";
import { CorporationAnchor, TypeAnchor } from "~/components/Anchor";
import { formatInteger, formatUtcTime } from "~/lib/format";
import classes from "./KillmailFeedCard.module.css";
import {
  accentStyle,
  finalBlowOf,
  KillmailActions,
  KillmailBadges,
  KillmailLocation,
  KillmailTimeAgo,
  KillmailValue,
  PartyAvatar,
  PartyName,
} from "./parts";
import { killmailPagePath } from "./zkillboard";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "a" or "an", by the ship's name once it has loaded. */
function useArticle(typeId: number) {
  const { name } = useEsiName(typeId, "inventory_type");
  return name && /^[aeiou]/i.test(name) ? "an" : "a";
}

/**
 * Whether a click on the entry should open the killmail: not when it landed
 * on one of its own links or buttons, came from a portal (a menu or hover
 * card the entry opened), or ended a text selection.
 */
function isRowClick(event: MouseEvent<HTMLElement>) {
  const target = event.target as Element;
  if (!event.currentTarget.contains(target)) return false;
  if (target.closest("a, button, input, [role='menu']")) return false;
  return !window.getSelection()?.toString();
}

/**
 * A killmail as an entry on a timeline: EVE time in the gutter, a dot in the
 * losing side's accent on a rail down the list, and the kill told as a
 * sentence — who lost what, to whom. Clicking the entry anywhere but its
 * links and buttons opens our killmail page.
 */
export function KillmailFeedCard({
  killmail,
  hash,
  zkb,
  tag,
}: KillmailCardProps) {
  const router = useRouter();
  const { victim } = killmail;
  const finalBlow = finalBlowOf(killmail);
  const others = killmail.attackers.length - 1;
  const article = useArticle(victim.ship_type_id);
  const corporationId = victim.character_id ? victim.corporation_id : undefined;
  const killedAt = new Date(killmail.killmail_time);
  const path = killmailPagePath(killmail.killmail_id, hash);

  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (!isRowClick(event)) return;
    // As a link would: modified clicks open a new tab or window.
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      window.open(path, "_blank", "noopener");
      return;
    }
    router.push(path);
  };
  // A middle click never fires `click`; it opens a new tab, as on a link.
  const onAuxClick = (event: MouseEvent<HTMLElement>) => {
    if (event.button === 1 && isRowClick(event))
      window.open(path, "_blank", "noopener");
  };

  return (
    <div className={classes.container}>
      {/* A mouse convenience: keyboard users reach the same page through
          the entry's "time ago" link. */}
      <article
        className={classes.item}
        style={accentStyle(tag)}
        aria-label={`Killmail ${killmail.killmail_id}`}
        onClick={onClick}
        onAuxClick={onAuxClick}
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

        <div className={classes.rail}>
          <span className={classes.dot} />
        </div>

        <div className={classes.body}>
          <TypeAvatar
            typeId={victim.ship_type_id}
            variation="render"
            size={40}
            radius="sm"
            className={classes.bodyRender}
            style={{ flexShrink: 0 }}
          />
          <div className={classes.sentence}>
            <PartyAvatar
              party={victim}
              size={18}
              className={classes.inlineAvatar}
            />
            <PartyName party={victim} fw={600} />
            {corporationId && (
              <Text span size="sm" c="dimmed">
                {" ("}
                <CorporationAnchor
                  corporationId={corporationId}
                  size="sm"
                  c="dimmed"
                >
                  <CorporationName span inherit corporationId={corporationId} />
                </CorporationAnchor>
                {")"}
              </Text>
            )}{" "}
            lost {article}{" "}
            <TypeAnchor typeId={victim.ship_type_id} fw={700} c="bright">
              <TypeName span inherit typeId={victim.ship_type_id} />
            </TypeAnchor>{" "}
            {finalBlow && (
              <>
                to{" "}
                <PartyAvatar
                  party={finalBlow}
                  size={18}
                  className={classes.inlineAvatar}
                />
                <PartyName party={finalBlow} fw={600} />
                {others > 0 && (
                  <Text span size="sm" c="dimmed">
                    {` and ${formatInteger(others)} other${others === 1 ? "" : "s"}`}
                  </Text>
                )}
              </>
            )}
            <div className={classes.meta}>
              <KillmailLocation
                solarSystemId={killmail.solar_system_id}
                size="xs"
              />
              <KillmailTimeAgo killmail={killmail} hash={hash} />
              <KillmailBadges zkb={zkb} tag={tag} />
            </div>
          </div>
        </div>

        <div className={classes.side}>
          <KillmailValue zkb={zkb} />
          <div className={classes.actions}>
            <KillmailActions killmail={killmail} hash={hash} />
          </div>
        </div>
      </article>
    </div>
  );
}

export function KillmailFeedCardSkeleton() {
  return (
    <div className={classes.container}>
      <div className={classes.item} aria-busy="true">
        <Skeleton h={28} mt={8} />
        <div className={classes.rail} />
        <div className={classes.body}>
          <Skeleton h={40} w={40} />
          <div style={{ flex: 1 }}>
            <Skeleton h={14} w="80%" mb={6} />
            <Skeleton h={10} w="40%" />
          </div>
        </div>
        <Skeleton h={14} w={64} mt={8} />
      </div>
    </div>
  );
}
