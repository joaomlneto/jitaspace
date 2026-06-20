"use client";

import type { TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import Link from "next/link";
import { Anchor, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getTypeByIdQueryOptions } from "@jitaspace/sde-client";

/**
 * Local stand-ins for the `@jitaspace/ui` name/anchor components that were
 * removed with the hooks refactor (commit f5e47407). The history UI resolves
 * most names itself and passes `name=`, so these mostly just render that text;
 * `TypeName` fetches from the (surviving) SDE client. The `*Anchor` components
 * link each resolved name to that entity's detail page (`/type/…`,
 * `/dogma/attribute/…`, …); the market group is the lone exception, with no
 * dedicated page yet, so it stays inline text.
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

// ── anchors (link each resolved name to that entity's detail page) ───────────
// Each caller passes the entity's id (categoryId, attributeId, …) plus the
// inline `size`/`c` it wants on the link. We turn that into a real `next/link`
// anchor pointing at the matching detail route.
interface AnchorBaseProps {
  size?: TextProps["size"];
  c?: TextProps["c"];
  children?: ReactNode;
}

function LinkAnchor({
  href,
  size,
  c,
  children,
}: AnchorBaseProps & { href: string }) {
  return (
    <Anchor component={Link} href={href} size={size} c={c}>
      {children}
    </Anchor>
  );
}

export function CategoryAnchor({
  categoryId,
  ...rest
}: AnchorBaseProps & { categoryId: number }) {
  return <LinkAnchor href={`/category/${categoryId}`} {...rest} />;
}

export function GroupAnchor({
  groupId,
  ...rest
}: AnchorBaseProps & { groupId: number }) {
  return <LinkAnchor href={`/group/${groupId}`} {...rest} />;
}

export function RaceAnchor({
  raceId,
  ...rest
}: AnchorBaseProps & { raceId: number }) {
  return <LinkAnchor href={`/race/${raceId}`} {...rest} />;
}

export function FactionAnchor({
  factionId,
  ...rest
}: AnchorBaseProps & { factionId: number }) {
  return <LinkAnchor href={`/faction/${factionId}`} {...rest} />;
}

export function DogmaAttributeAnchor({
  attributeId,
  ...rest
}: AnchorBaseProps & { attributeId: number }) {
  return <LinkAnchor href={`/dogma/attribute/${attributeId}`} {...rest} />;
}

export function DogmaEffectAnchor({
  effectId,
  ...rest
}: AnchorBaseProps & { effectId: number }) {
  return <LinkAnchor href={`/dogma/effect/${effectId}`} {...rest} />;
}

export function TypeAnchor({
  typeId,
  ...rest
}: AnchorBaseProps & { typeId: number }) {
  return <LinkAnchor href={`/type/${typeId}`} {...rest} />;
}

// No dedicated market-group page exists yet, so this stays inline text rather
// than linking to a route that would 404.
export function MarketGroupAnchor({
  marketGroupId: _marketGroupId,
  size,
  c,
  children,
}: AnchorBaseProps & { marketGroupId?: number }) {
  return (
    <Text span size={size} c={c}>
      {children}
    </Text>
  );
}

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
