"use client";

import type { TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import Link from "next/link";
import { Anchor, Text } from "@mantine/core";

/**
 * Local stand-ins for the `@jitaspace/ui` anchor and value components that were
 * removed with the hooks refactor (commit f5e47407). Names come from the labels
 * the server read with the timeline (`_labels.tsx`); the `*Anchor` components
 * link each one to that entity's detail page (`/type/…`, `/dogma/attribute/…`,
 * …). The market group is the lone exception, with no dedicated page yet, so
 * it stays inline text.
 */

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
    // No prefetch: a timeline holds hundreds of these, and prefetching every
    // visible one would fire a request per label.
    <Anchor component={Link} href={href} size={size} c={c} prefetch={false}>
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

export function CorporationAnchor({
  corporationId,
  ...rest
}: AnchorBaseProps & { corporationId: number }) {
  return <LinkAnchor href={`/corporation/${corporationId}`} {...rest} />;
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
