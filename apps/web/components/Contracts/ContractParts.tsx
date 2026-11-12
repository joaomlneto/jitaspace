"use client";

import type { BadgeProps, TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Badge, Group, Text, Tooltip } from "@mantine/core";
import { formatDistanceToNowStrict } from "date-fns";

import type { EveIconProps } from "@jitaspace/eve-icons";
import {
  CharacterName,
  CorporationName,
  SolarSystemName,
  StationName,
  StructureName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";
import {
  ContractAuctionIcon,
  ContractCourierIcon,
  ContractItemExchangeIcon,
  ContractsIcon,
} from "@jitaspace/eve-icons";
import {
  CharacterAvatar,
  CorporationAvatar,
  SolarSystemSecurityStatusBadge as SecurityStatusBadge,
} from "@jitaspace/ui";

import type {
  ContractKind,
  ContractLocation,
  ContractSummary,
} from "./contract";
import {
  CharacterAnchor,
  CorporationAnchor,
  SolarSystemAnchor,
  StationAnchor,
} from "~/components/Anchor";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { CONTRACT_KIND_LABEL } from "./contract";

const KIND_ICON: Record<ContractKind, (props: EveIconProps) => ReactNode> = {
  item_exchange: ContractItemExchangeIcon,
  auction: ContractAuctionIcon,
  courier: ContractCourierIcon,
  loan: ContractsIcon,
  unknown: ContractsIcon,
};

const KIND_COLOR: Record<ContractKind, string> = {
  item_exchange: "blue",
  auction: "grape",
  courier: "orange",
  loan: "gray",
  unknown: "gray",
};

export function ContractTypeIcon({
  type,
  ...props
}: Readonly<{ type: ContractKind } & EveIconProps>) {
  const Icon = KIND_ICON[type];
  return <Icon alt={CONTRACT_KIND_LABEL[type]} {...props} />;
}

/**
 * The picture for a contract: its first offered item's image, or the
 * contract type's icon when it has no item (couriers, title-only contracts)
 * or the item has no image of its own (SKINs and the like).
 */
export function ContractArtwork({
  type,
  item,
  size,
}: Readonly<{
  type: ContractKind;
  item:
    | { typeId: number; name?: string | null; imageVariation?: string }
    | null
    | undefined;
  size: number;
}>) {
  const icon = <ContractTypeIcon type={type} size={size} />;
  if (!item) {
    return (
      <span
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
    );
  }
  return (
    <TypeAvatar
      typeId={item.typeId}
      variation={item.imageVariation}
      size={size}
      radius="sm"
      // Named after the item, not the debug-ish "types <id> icon" default,
      // which Mantine also shows as the fallback's tooltip.
      alt={item.name ?? undefined}
      // Without its own tile the fallback icon looks the same as for a
      // contract with no item at all.
      variant="transparent"
      fallback={icon}
    />
  );
}

export function ContractTypeBadge({
  type,
  ...props
}: Readonly<{ type: ContractKind } & BadgeProps>) {
  return (
    <Badge variant="light" color={KIND_COLOR[type]} radius="sm" {...props}>
      {CONTRACT_KIND_LABEL[type]}
    </Badge>
  );
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  outstanding: { label: "Outstanding", color: "teal" },
  in_progress: { label: "In progress", color: "yellow" },
  finished_issuer: { label: "Finished", color: "gray" },
  finished_contractor: { label: "Finished", color: "gray" },
  finished: { label: "Finished", color: "gray" },
  cancelled: { label: "Cancelled", color: "gray" },
  rejected: { label: "Rejected", color: "red" },
  failed: { label: "Failed", color: "red" },
  deleted: { label: "Deleted", color: "gray" },
  reversed: { label: "Reversed", color: "red" },
};

export function ContractStatusBadge({
  status,
  ...props
}: Readonly<{ status: string } & BadgeProps>) {
  const known = STATUS_LABEL[status] ?? { label: status, color: "gray" };
  return (
    <Badge variant="dot" color={known.color} radius="sm" {...props}>
      {known.label}
    </Badge>
  );
}

const subscribeNever = () => () => undefined;

/**
 * False while the server renders and during hydration, true after. Times shown
 * relative to now read the clock, and a component that does so while a cached
 * page prerenders drops the page out of the cache (apps/web/CLAUDE.md → "No
 * `Math.random()` while a static page renders"), so they wait for this.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** "in 3 days" / "2 hours ago", rendered only in the browser. */
export function RelativeTime({
  date,
  ...props
}: Readonly<{ date: string } & TextProps>) {
  const isMounted = useIsMounted();
  const value = new Date(date);
  return (
    <Tooltip
      label={`${value.toISOString().slice(0, 16).replace("T", " ")} EVE`}
    >
      <Text component="span" inherit {...props}>
        {isMounted
          ? formatDistanceToNowStrict(value, { addSuffix: true })
          : value.toISOString().slice(0, 10)}
      </Text>
    </Tooltip>
  );
}

/** "Expires in 3 days" or "Expired 2 years ago", rendered only in the browser. */
export function ExpiryText({ date }: Readonly<{ date: string }>) {
  const isMounted = useIsMounted();
  const value = new Date(date);
  if (!isMounted) return <>Expires {date.slice(0, 10)}</>;
  const distance = formatDistanceToNowStrict(value, { addSuffix: true });
  return (
    <Tooltip label={`${date.slice(0, 16).replace("T", " ")} EVE`}>
      <span>
        {/* date-fns words the past "… ago"; reading the clock again here
            would break render purity. */}
        {distance.endsWith(" ago") ? "Expired" : "Expires"} {distance}
      </span>
    </Tooltip>
  );
}

const END_LABEL: Record<
  NonNullable<ContractSummary["endReason"]>,
  { label: string; hint: string }
> = {
  Expired: { label: "Expired", hint: "Listed until it expired" },
  RemovedBeforeExpiry: {
    label: "Closed",
    hint: "Left the public listing before it expired: accepted, completed or deleted",
  },
};

/** How our snapshots saw a contract end, with the last day they listed it. */
export function ContractEndBadge({
  contract,
  size,
}: Readonly<{ contract: ContractSummary; size: "xs" | "sm" }>) {
  const end = contract.endReason
    ? END_LABEL[contract.endReason]
    : { label: "Ended", hint: "No longer in the public listing" };
  const lastListed = contract.lastSeenAt?.slice(0, 10);
  return (
    <Tooltip
      label={
        lastListed ? `${end.hint}. Last listed ${lastListed}.` : `${end.hint}.`
      }
    >
      <Badge variant="dot" color="gray" radius="sm" size={size}>
        {end.label}
        {lastListed ? ` ${lastListed}` : ""}
      </Badge>
    </Tooltip>
  );
}

/**
 * Where a contract stands, for the list views: ESI's status once it is no
 * longer outstanding, how it ended once the public listing dropped it, and
 * otherwise when it expires.
 */
export function ContractTiming({
  contract,
  size,
  ta,
}: Readonly<{
  contract: ContractSummary;
  size: "xs" | "sm";
  ta?: TextProps["ta"];
}>) {
  if (contract.status && contract.status !== "outstanding") {
    return <ContractStatusBadge status={contract.status} size={size} />;
  }
  if (contract.isOpen === false) {
    return <ContractEndBadge contract={contract} size={size} />;
  }
  return (
    <Text size={size} c="dimmed" ta={ta} style={{ whiteSpace: "nowrap" }}>
      <ExpiryText date={contract.dateExpired} />
    </Text>
  );
}

/**
 * Who issued the contract: the corporation when issued on its behalf, the
 * character otherwise, with names the database supplied or ESI resolves.
 */
export function ContractIssuer({
  contract,
  size = "sm",
}: Readonly<{ contract: ContractSummary; size?: TextProps["size"] }>) {
  if (contract.forCorporation) {
    return (
      <Group gap={6} wrap="nowrap" miw={0}>
        <CorporationAvatar
          corporationId={contract.issuerCorporationId}
          size={20}
        />
        <CorporationAnchor
          corporationId={contract.issuerCorporationId}
          size={size}
          truncate
        >
          {contract.issuerCorporationName ?? (
            <CorporationName
              corporationId={contract.issuerCorporationId}
              span
              inherit
            />
          )}
        </CorporationAnchor>
      </Group>
    );
  }
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      <CharacterAvatar characterId={contract.issuerId} size={20} />
      <CharacterAnchor characterId={contract.issuerId} size={size} truncate>
        {contract.issuerName ?? (
          <CharacterName characterId={contract.issuerId} span inherit />
        )}
      </CharacterAnchor>
    </Group>
  );
}

/**
 * Where a contract sits: its solar system with security status, then the
 * station. Structures are named only when `resolveStructures` is set: their
 * names need a token on the structure's access list, and asking ESI for a
 * public contract's structure would spend the error budget on 403s.
 */
export function ContractLocationLine({
  location,
  regionName,
  resolveStructures = false,
  size = "sm",
}: Readonly<{
  location: ContractLocation | null;
  regionName?: string | null;
  resolveStructures?: boolean;
  size?: TextProps["size"];
}>) {
  if (location === null) {
    return (
      <Text size={size} c="dimmed">
        {regionName ?? "Unknown location"}
      </Text>
    );
  }

  let place: ReactNode;
  if (location.kind === "station") {
    place = (
      <StationAnchor stationId={location.locationId} size={size} truncate>
        {location.name ?? (
          <StationName stationId={location.locationId} span inherit />
        )}
      </StationAnchor>
    );
  } else if (location.kind === "structure" && resolveStructures) {
    place = (
      <StructureName
        structureId={location.locationId}
        size={size}
        truncate
        span
      />
    );
  } else {
    place = (
      <Text size={size} c="dimmed" span truncate>
        {location.kind === "structure" ? "Player structure" : "Unknown"}
        {regionName ? ` · ${regionName}` : ""}
      </Text>
    );
  }

  // The database names the system of a station contract; for the rest, the
  // station's name already starts with its system's.
  const system =
    location.solarSystemId != null ? (
      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
        {location.securityStatus != null ? (
          <SecurityStatusBadge
            securityStatus={location.securityStatus}
            size="xs"
          />
        ) : (
          <SolarSystemSecurityStatusBadge
            solarSystemId={location.solarSystemId}
            size="xs"
          />
        )}
        <SolarSystemAnchor
          solarSystemId={location.solarSystemId}
          size={size}
          fw={600}
        >
          {location.solarSystemName ?? (
            <SolarSystemName
              solarSystemId={location.solarSystemId}
              span
              inherit
            />
          )}
        </SolarSystemAnchor>
      </Group>
    ) : null;

  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      {system}
      {place}
    </Group>
  );
}

/**
 * What a contract is called in a list: its first offered item (and how many
 * more lines follow) when it has items, otherwise its title, otherwise its
 * type — the order the in-game browser uses.
 */
export function contractDisplayName(contract: ContractSummary): ReactNode {
  const first = contract.items?.first;
  if (first) {
    const more = (contract.items?.count ?? 1) - 1;
    return (
      <>
        {first.name ?? <TypeName typeId={first.typeId} span inherit />}
        {first.quantity > 1 ? ` ×${first.quantity.toLocaleString()}` : ""}
        {more > 0 ? ` + ${more} more` : ""}
      </>
    );
  }
  if (contract.title) return contract.title;
  if (contract.type === "courier") {
    return contract.volume
      ? `Courier · ${formatVolume(contract.volume)}`
      : "Courier";
  }
  return `${CONTRACT_KIND_LABEL[contract.type]} #${contract.contractId}`;
}

export function formatVolume(volume: number): string {
  return `${volume.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³`;
}
