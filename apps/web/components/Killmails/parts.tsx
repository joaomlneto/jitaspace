"use client";

import type { CSSProperties } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { IconExternalLink } from "@tabler/icons-react";

import {
  AllianceName,
  CharacterName,
  CorporationName,
  FactionName,
  RegionName,
  SolarSystemName,
} from "@jitaspace/eve-components";
import { FittingIcon } from "@jitaspace/eve-icons";
import { useConstellation, useSolarSystem } from "@jitaspace/hooks";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  DateHoverCard,
  FactionAvatar,
  ISKAmount,
  SolarSystemSecurityStatusBadge,
  TimeAgoText,
} from "@jitaspace/ui";

import type { EsiKillmail, ZkbKillmailMeta } from "./zkillboard";
import {
  AllianceAnchor,
  CharacterAnchor,
  CorporationAnchor,
  FactionAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";
import { formatInteger } from "~/lib/format";
import classes from "./parts.module.css";
import {
  eveKillKillUrl,
  killmailPagePath,
  zkillboardKillUrl,
} from "./zkillboard";

/** Someone on a killmail: the victim or one of the attackers. */
export interface KillmailParty {
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
}

/** A label and colour for the card's accent and badge. */
export interface KillmailCardTag {
  label: string;
  /** Any CSS colour. */
  color: string;
}

export interface KillmailCardProps {
  killmail: EsiKillmail;
  hash: string;
  /** zKillboard's valuation and flags, when the killmail came from there. */
  zkb?: ZkbKillmailMeta;
  /** Whose loss this was, from the page's point of view. */
  tag?: KillmailCardTag;
}

export const partsClasses = classes;

const BILLION = 1e9;

export function iskTier(value: number): "huge" | "high" | undefined {
  if (value >= 10 * BILLION) return "huge";
  if (value >= BILLION) return "high";
  return undefined;
}

/** The attacker who landed the final blow, else the first one listed. */
export function finalBlowOf(killmail: EsiKillmail) {
  return (
    killmail.attackers.find((attacker) => attacker.final_blow) ??
    killmail.attackers[0]
  );
}

/** "+3 others", or "Solo" when the final blow was the only attacker. */
export function othersLabel(killmail: EsiKillmail) {
  const others = killmail.attackers.length - 1;
  if (others <= 0) return "Solo";
  return `+${formatInteger(others)} other${others === 1 ? "" : "s"}`;
}

/** The card's accent colour, as the `--killmail-accent` custom property. */
export function accentStyle(tag?: KillmailCardTag): CSSProperties | undefined {
  return tag
    ? ({ "--killmail-accent": tag.color } as CSSProperties)
    : undefined;
}

/** A party's face: their portrait, else their corporation's or faction's logo. */
export function PartyAvatar({
  party,
  size,
  className,
}: Readonly<{ party: KillmailParty; size: number; className?: string }>) {
  if (party.character_id)
    return (
      <CharacterAvatar
        characterId={party.character_id}
        size={size}
        className={className}
      />
    );
  if (party.corporation_id)
    return (
      <CorporationAvatar
        corporationId={party.corporation_id}
        size={size}
        className={className}
      />
    );
  if (party.faction_id)
    return (
      <FactionAvatar
        factionId={party.faction_id}
        size={size}
        className={className}
      />
    );
  return null;
}

/** The most specific name a party has, linked. */
export function PartyName({
  party,
  fw,
  size = "sm",
}: Readonly<{ party: KillmailParty; fw?: number; size?: string }>) {
  if (party.character_id)
    return (
      <CharacterAnchor characterId={party.character_id} size={size} fw={fw}>
        <CharacterName span inherit characterId={party.character_id} />
      </CharacterAnchor>
    );
  if (party.corporation_id)
    return (
      <CorporationAnchor
        corporationId={party.corporation_id}
        size={size}
        fw={fw}
      >
        <CorporationName span inherit corporationId={party.corporation_id} />
      </CorporationAnchor>
    );
  if (party.faction_id)
    return (
      <FactionAnchor factionId={party.faction_id} size={size} fw={fw}>
        <FactionName span inherit factionId={party.faction_id} />
      </FactionAnchor>
    );
  return (
    <Text span size={size} c="dimmed">
      Unknown
    </Text>
  );
}

/**
 * The organisations behind a party, below its name: the corporation (unless
 * it already is the name) and the alliance.
 */
export function PartyAffiliation({
  party,
  logos = true,
}: Readonly<{ party: KillmailParty; logos?: boolean }>) {
  const corporationId = party.character_id ? party.corporation_id : undefined;
  const allianceId =
    party.character_id || party.corporation_id ? party.alliance_id : undefined;
  if (!corporationId && !allianceId) return null;
  return (
    <Group gap={6} wrap="nowrap" className={classes.truncate}>
      {corporationId && (
        <Group gap={4} wrap="nowrap" className={classes.truncate}>
          {logos && (
            <CorporationAvatar corporationId={corporationId} size={16} />
          )}
          <CorporationAnchor
            corporationId={corporationId}
            size="xs"
            c="dimmed"
            className={classes.truncate}
          >
            <CorporationName span inherit corporationId={corporationId} />
          </CorporationAnchor>
        </Group>
      )}
      {allianceId && (
        <Group gap={4} wrap="nowrap" className={classes.truncate}>
          {logos && <AllianceAvatar allianceId={allianceId} size={16} />}
          <AllianceAnchor
            allianceId={allianceId}
            size="xs"
            c="dimmed"
            className={classes.truncate}
          >
            <AllianceName span inherit allianceId={allianceId} />
          </AllianceAnchor>
        </Group>
      )}
    </Group>
  );
}

/** "0.5 Amarr · Domain", each part linked. */
export function KillmailLocation({
  solarSystemId,
  showRegion = true,
  size = "sm",
}: Readonly<{ solarSystemId: number; showRegion?: boolean; size?: string }>) {
  const { data: system } = useSolarSystem(solarSystemId);
  const constellationId = system?.data.constellation_id;
  const { data: constellation } = useConstellation(
    showRegion ? constellationId : undefined,
  );
  const regionId = constellation?.data.region_id;
  return (
    <Group gap={6} wrap="nowrap" className={classes.truncate} component="span">
      <SolarSystemSecurityStatusBadge
        securityStatus={system?.data.security_status}
        size={size === "xs" ? "xs" : "sm"}
      />
      <SolarSystemAnchor solarSystemId={solarSystemId} size={size} fw={600}>
        <SolarSystemName span inherit solarSystemId={solarSystemId} />
      </SolarSystemAnchor>
      {showRegion && regionId !== undefined && (
        <>
          <Text span size={size} c="dimmed">
            ·
          </Text>
          <RegionAnchor
            regionId={regionId}
            size={size}
            c="dimmed"
            className={classes.truncate}
          >
            <RegionName span inherit regionId={regionId} />
          </RegionAnchor>
        </>
      )}
    </Group>
  );
}

/** "5 days ago", linked to our killmail page, the full date on hover. */
export function KillmailTimeAgo({
  killmail,
  hash,
}: Readonly<{ killmail: EsiKillmail; hash: string }>) {
  const killedAt = new Date(killmail.killmail_time);
  return (
    <DateHoverCard date={killedAt}>
      <Anchor
        component={HoverPrefetchLink}
        href={killmailPagePath(killmail.killmail_id, hash)}
        size="xs"
        c="dimmed"
      >
        <TimeAgoText span inherit date={killedAt} addSuffix />
      </Anchor>
    </DateHoverCard>
  );
}

/**
 * zKillboard's value for the kill, coloured when it stands out. ISKAmount
 * shows the exact figure on hover; where it comes from is said once, above
 * the list, not on every card.
 */
export function KillmailValue({
  zkb,
  className,
}: Readonly<{ zkb?: ZkbKillmailMeta; className?: string }>) {
  const value = zkb?.totalValue;
  if (value === undefined) return null;
  return (
    <span
      className={[classes.iskFigure, className].filter(Boolean).join(" ")}
      data-tier={iskTier(value)}
    >
      <ISKAmount span inherit amount={value} />
    </span>
  );
}

/** The side's tag, and zKillboard's solo and awox flags. */
export function KillmailBadges({
  zkb,
  tag,
}: Readonly<{ zkb?: ZkbKillmailMeta; tag?: KillmailCardTag }>) {
  return (
    <>
      {tag && (
        <Badge
          size="xs"
          variant="outline"
          color={tag.color}
          className={classes.tagBadge}
          style={{ flexShrink: 0 }}
        >
          {tag.label}
        </Badge>
      )}
      {zkb?.solo && (
        <Badge size="xs" variant="light" color="gray">
          Solo
        </Badge>
      )}
      {zkb?.awox && (
        <Badge size="xs" variant="light" color="grape">
          Awox
        </Badge>
      )}
    </>
  );
}

function openFitting(killmailId: number, killmailHash: string) {
  openContextModal({
    modal: "killmailFitting",
    withCloseButton: false,
    size: "sm",
    padding: 0,
    innerProps: { killmailId, killmailHash },
    style: { padding: 0, margin: 0 },
  });
}

/** Two icons: the fitting, and an "Open in…" menu for zKillboard and EVE-Kill. */
export function KillmailActions({
  killmail,
  hash,
}: Readonly<{ killmail: EsiKillmail; hash: string }>) {
  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label="Fitting">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Show fitting"
          onClick={() => openFitting(killmail.killmail_id, hash)}
        >
          <FittingIcon size={18} alt="" />
        </ActionIcon>
      </Tooltip>
      <Menu position="bottom-end" withinPortal shadow="md">
        <Tooltip label="Open in…">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Open in…"
            >
              <IconExternalLink size={16} />
            </ActionIcon>
          </Menu.Target>
        </Tooltip>
        <Menu.Dropdown>
          <Menu.Label>Open in…</Menu.Label>
          <Menu.Item
            component="a"
            href={zkillboardKillUrl(killmail.killmail_id)}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={14} />}
          >
            zKillboard
          </Menu.Item>
          <Menu.Item
            component="a"
            href={eveKillKillUrl(killmail.killmail_id)}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={14} />}
          >
            EVE-Kill
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
