"use client";

import Link from "next/link";
import { Badge, Button, Group, Text, VisuallyHidden } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useSelectedCharacter } from "@jitaspace/hooks";
import { ISKAmount } from "@jitaspace/ui";

import type { EsiWar, WarSideKey } from "./sides";
import type { EntityWarStatus } from "~/lib/warRecord";
import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import { HeroStat } from "~/components/EntityPage";
import { WAR_STATUS_LABELS } from "~/components/Wars/EntityWars/EntityWarsTab";
import { formatInteger, formatPercent } from "~/lib/format";
import { PartyAvatar, PartyName, PartyTicker, WarDate } from "./parts";
import { WAR_SIDE_LABEL } from "./sides";
import classes from "./WarHeader.module.css";

const STATUS_COLOR: Record<EntityWarStatus, string> = {
  pending: "yellow",
  active: "red",
  retracting: "orange",
  finished: "gray",
};

/** Where else to look the war up. */
const externalLinks = (warId: number) => [
  { label: "zKillboard", href: `https://zkillboard.com/war/${warId}/` },
  { label: "DOTLAN EveMaps", href: `https://evemaps.dotlan.net/war/${warId}` },
];

/** One belligerent: logo, role, name, ticker, and what they destroyed. */
function Side({
  war,
  side,
}: Readonly<{ war: EsiWar | undefined; side: WarSideKey }>) {
  const character = useSelectedCharacter();
  const party = war?.[side];
  const entityId = party?.alliance_id ?? party?.corporation_id;
  return (
    <div className={classes.side} data-side={side}>
      <PartyAvatar party={party} size={112} className={classes.logo} />
      <div className={classes.sideBody}>
        <span className={classes.role}>{WAR_SIDE_LABEL[side]}</span>
        <div className={classes.name}>
          <PartyName party={party} />
        </div>
        <Group
          gap="xs"
          style={{ flexDirection: side === "defender" ? "row-reverse" : "row" }}
        >
          <PartyTicker party={party} />
          {character && entityId !== undefined && (
            <OpenInformationWindowActionIcon
              characterId={character.characterId}
              entityId={entityId}
            />
          )}
        </Group>
        <div className={classes.figures}>
          <div>
            <div className={classes.figureLabel}>ISK destroyed</div>
            <div className={classes.figureValue}>
              <ISKAmount span inherit amount={party?.isk_destroyed ?? 0} />
            </div>
          </div>
          <div>
            <div className={classes.figureLabel}>Ships killed</div>
            <div className={classes.figureValue}>
              {formatInteger(party?.ships_killed ?? 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Who dealt how much of the ISK destroyed, as one bar. */
function IskBalance({ war }: Readonly<{ war: EsiWar }>) {
  const aggressor = war.aggressor.isk_destroyed;
  const total = aggressor + war.defender.isk_destroyed;
  if (total <= 0)
    return (
      <Text size="xs" c="dimmed" ta="center">
        Nothing has been destroyed yet.
      </Text>
    );
  const share = aggressor / total;
  return (
    <>
      <div
        className={classes.bar}
        role="img"
        aria-label={`The aggressor dealt ${formatPercent(share)} of the ISK destroyed`}
      >
        <div className={classes.barAgg} style={{ width: `${share * 100}%` }} />
        <div
          className={classes.barDef}
          style={{ width: `${(1 - share) * 100}%` }}
        />
      </div>
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">
          {formatPercent(share)} of ISK destroyed
        </Text>
        <Text size="xs" c="dimmed">
          {formatPercent(1 - share)}
        </Text>
      </Group>
    </>
  );
}

/**
 * The war page's header: the aggressor and the defender facing each other,
 * the war's state between them, and its balance, dates and totals below.
 */
export function WarHeader({
  warId,
  war,
  status,
  now,
}: Readonly<{
  warId: number;
  war: EsiWar | undefined;
  status: EntityWarStatus | undefined;
  now: number;
}>) {
  const isFuture = (iso: string) => new Date(iso).getTime() > now;
  return (
    <header className={classes.header}>
      <div className={classes.topBar}>
        <Group gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            War #{warId}
          </Text>
          {status && (
            <Badge size="sm" variant="light" color={STATUS_COLOR[status]}>
              {WAR_STATUS_LABELS[status]}
            </Badge>
          )}
          {war?.mutual && (
            <Badge size="sm" variant="outline" color="grape">
              Mutual
            </Badge>
          )}
          {war?.open_for_allies && (
            <Badge size="sm" variant="outline" color="teal">
              Open for allies
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          {externalLinks(warId).map((link) => (
            <Button
              key={link.label}
              component={Link}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconExternalLink size={14} />}
            >
              {link.label}
            </Button>
          ))}
        </Group>
      </div>

      <VisuallyHidden component="h1">
        <PartyName party={war?.aggressor} linked={false} /> vs{" "}
        <PartyName party={war?.defender} linked={false} />
      </VisuallyHidden>
      <div className={classes.faceOff}>
        <Side war={war} side="aggressor" />
        <div className={classes.versus} aria-hidden="true">
          <span className={classes.vs}>VS</span>
        </div>
        <Side war={war} side="defender" />
      </div>

      {war && (
        <div className={classes.balance}>
          <IskBalance war={war} />
        </div>
      )}

      {war && (
        <div className={classes.footer}>
          <Group gap="xl">
            <HeroStat label="Declared" value={<WarDate iso={war.declared} />} />
            {war.started && (
              <HeroStat
                label={isFuture(war.started) ? "Starts" : "Started"}
                value={<WarDate iso={war.started} />}
              />
            )}
            {war.finished && (
              <HeroStat
                label={isFuture(war.finished) ? "Ends" : "Finished"}
                value={<WarDate iso={war.finished} />}
              />
            )}
          </Group>
          <Group gap="xl">
            <HeroStat
              label="Ships destroyed"
              value={formatInteger(
                war.aggressor.ships_killed + war.defender.ships_killed,
              )}
            />
            <HeroStat
              label="ISK destroyed"
              value={
                <ISKAmount
                  span
                  inherit
                  amount={
                    war.aggressor.isk_destroyed + war.defender.isk_destroyed
                  }
                />
              }
            />
          </Group>
        </div>
      )}
    </header>
  );
}
