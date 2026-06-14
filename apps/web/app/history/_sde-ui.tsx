"use client";

import type { ReactNode } from "react";
import type { TextProps } from "@mantine/core";
import { Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getTypeByIdQueryOptions } from "@jitaspace/sde-client";

/**
 * Local stand-ins for the `@jitaspace/ui` name/anchor components that were
 * removed with the hooks refactor (commit f5e47407). The history UI resolves
 * most names itself and passes `name=`, so these mostly just render that text;
 * `TypeName` fetches from the (surviving) SDE client. The per-entity link
 * targets no longer exist, so the `*Anchor` components render their content
 * inline rather than as links.
 */

function sdeLabel(data: unknown): string | undefined {
  const d = data as
    | {
        name?: string | { en?: string };
        displayName?: { en?: string };
        nameID?: { en?: string };
      }
    | undefined;
  if (!d) return undefined;
  const display = d.displayName?.en?.trim();
  if (display) return display;
  if (typeof d.name === "string") return d.name.trim() || undefined;
  const localized = d.name?.en?.trim();
  if (localized) return localized;
  return d.nameID?.en?.trim() ?? undefined;
}

// ── names (rendered from a resolved `name`, or a dimmed placeholder) ──────────
type NameProps = { name?: string } & TextProps;
function Name({ name, ...p }: NameProps) {
  return name ? (
    <Text {...p}>{name}</Text>
  ) : (
    <Text {...p} c="dimmed" fs="italic">
      …
    </Text>
  );
}
export const CategoryName = Name;
export const GroupName = Name;
export const MarketGroupName = Name;
export const RaceName = Name;
export const DogmaAttributeName = Name;
export const DogmaEffectName = Name;

export function TypeName({
  typeId,
  name,
  ...p
}: { typeId?: number; name?: string } & TextProps) {
  const q = useQuery({
    ...getTypeByIdQueryOptions(typeId ?? 0),
    staleTime: Infinity,
    retry: false,
    enabled: !name && !!typeId,
  });
  const label =
    name ??
    sdeLabel((q.data as { data?: unknown } | undefined)?.data) ??
    (q.isPending && typeId ? "…" : `#${typeId ?? "?"}`);
  return <Text {...p}>{label}</Text>;
}

export function FactionName({
  factionId,
  name,
  ...p
}: { factionId?: number; name?: string } & TextProps) {
  return <Text {...p}>{name ?? `#${factionId ?? "?"}`}</Text>;
}

// ── anchors (link targets removed → render content inline) ───────────────────
type AnchorProps = {
  size?: TextProps["size"];
  c?: TextProps["c"];
  children?: ReactNode;
} & Record<string, unknown>;
function Passthrough({ size, c, children }: AnchorProps) {
  return (
    <Text span size={size} c={c}>
      {children}
    </Text>
  );
}
export const CategoryAnchor = Passthrough;
export const GroupAnchor = Passthrough;
export const MarketGroupAnchor = Passthrough;
export const RaceAnchor = Passthrough;
export const FactionAnchor = Passthrough;
export const DogmaAttributeAnchor = Passthrough;
export const DogmaEffectAnchor = Passthrough;
export const TypeAnchor = Passthrough;

// ── value formatters ─────────────────────────────────────────────────────────
export function ISKAmount({ amount, ...p }: { amount: number } & TextProps) {
  return (
    <Text {...p}>
      {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ISK
    </Text>
  );
}

export function DogmaAttributeValue({
  value,
  unitId: _unitId,
  unitSymbol,
  ...p
}: { value: number; unitId?: number; unitSymbol?: string } & TextProps) {
  return (
    <Text {...p}>
      {value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      {unitSymbol ? ` ${unitSymbol}` : ""}
    </Text>
  );
}
