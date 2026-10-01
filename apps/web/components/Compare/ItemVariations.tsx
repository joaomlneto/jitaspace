"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { IconArrowsDiff } from "@tabler/icons-react";

import { TypeAnchor, TypeAvatar } from "@jitaspace/eve-components";
import { useFuzzworkRegionalMarketAggregates } from "@jitaspace/hooks";
import { ISKAmount } from "@jitaspace/ui";

import { SHIP_CATEGORY_ID } from "./catalog";
import classes from "./Compare.module.css";
import { compareHref } from "./CompareEmptyState";
import { MAX_COMPARE_ITEMS } from "./ItemComparison";

/** The Forge — the region containing Jita, EVE's main trade hub. */
const THE_FORGE_REGION_ID = 10000002;

/** One variation of an item, as the type page reads it from the database. */
export interface ItemVariation {
  typeId: number;
  name: string;
  /** Inventory category, to show hulls by their render. */
  categoryId: number;
  /** "Tech II", "Faction", …; absent for items without a meta group. */
  metaGroupName?: string;
  metaLevel?: number;
}

export interface ItemVariationsProps {
  /** The item the table is shown for; its row is marked. */
  typeId: number;
  /** Every variation, this item included, in display order. */
  variations: ItemVariation[];
}

/**
 * Every variation of an item — its Tech I base and each Tech II, faction,
 * storyline, deadspace and officer version — as a compact table: meta group,
 * meta level and Jita price. Rows can be ticked and opened in the Compare
 * tool, with this item as the baseline.
 */
export function ItemVariations({
  typeId,
  variations,
}: Readonly<ItemVariationsProps>) {
  const typeIds = useMemo(
    () => variations.map((variation) => variation.typeId),
    [variations],
  );
  const { data: market } = useFuzzworkRegionalMarketAggregates(
    typeIds,
    THE_FORGE_REGION_ID,
  );

  // Every variation starts ticked, up to what one comparison holds; this item
  // always among them.
  const [selection, setSelection] = useState<ReadonlySet<number>>();
  const selected = useMemo(
    () =>
      selection ??
      new Set([
        typeId,
        ...typeIds
          .filter((id) => id !== typeId)
          .slice(0, MAX_COMPARE_ITEMS - 1),
      ]),
    [selection, typeId, typeIds],
  );
  const isFull = selected.size >= MAX_COMPARE_ITEMS;

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  if (variations.length < 2) {
    return (
      <Text size="sm" c="dimmed">
        This item has no variations.
      </Text>
    );
  }

  // This item leads the comparison, as its baseline.
  const compared = [
    ...(selected.has(typeId) ? [typeId] : []),
    ...typeIds.filter((id) => id !== typeId && selected.has(id)),
  ];

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm">
        <Text size="sm" c="dimmed">
          {variations.length} variations
          {typeIds.length > MAX_COMPARE_ITEMS &&
            ` · up to ${MAX_COMPARE_ITEMS} can be compared at once`}
        </Text>
        <Button
          component={Link}
          href={compareHref(compared)}
          size="xs"
          variant="light"
          leftSection={<IconArrowsDiff size={14} />}
          disabled={compared.length < 2}
        >
          Compare {compared.length} selected
        </Button>
      </Group>
      <div className={classes.scroll} style={{ maxHeight: "none" }}>
        <table className={classes.ledger} aria-label="Variations">
          <thead>
            <tr>
              <th scope="col" style={{ width: 36 }}>
                <VisuallyHidden>Compare</VisuallyHidden>
              </th>
              <th scope="col">
                <span className={classes.columnLabel}>Item</span>
              </th>
              <th scope="col">
                <span className={classes.columnLabel}>Meta group</span>
              </th>
              <th scope="col" style={{ textAlign: "right" }}>
                <span className={classes.columnLabel}>Meta level</span>
              </th>
              <th scope="col" style={{ textAlign: "right" }}>
                <span className={classes.columnLabel}>Jita sell</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {variations.map((variation) => {
              const isCurrent = variation.typeId === typeId;
              const isSelected = selected.has(variation.typeId);
              const { metaGroupName } = variation;
              const sell = market?.[variation.typeId]?.sell.percentile;
              return (
                <tr
                  key={variation.typeId}
                  className={isCurrent ? classes.current : undefined}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  <td>
                    <Checkbox
                      size="xs"
                      checked={isSelected}
                      disabled={!isSelected && isFull}
                      onChange={() => toggle(variation.typeId)}
                      aria-label={`Compare ${variation.name}`}
                    />
                  </td>
                  <th scope="row" style={{ fontWeight: "normal" }}>
                    <Group gap={8} wrap="nowrap">
                      <TypeAvatar
                        typeId={variation.typeId}
                        variation={
                          variation.categoryId === SHIP_CATEGORY_ID
                            ? "render"
                            : undefined
                        }
                        size={24}
                        radius="sm"
                        alt=""
                      />
                      <TypeAnchor
                        typeId={variation.typeId}
                        fz={12.5}
                        fw={isCurrent ? 700 : 500}
                      >
                        {variation.name}
                      </TypeAnchor>
                      {isCurrent && (
                        <Badge size="xs" variant="outline" radius="sm">
                          This item
                        </Badge>
                      )}
                    </Group>
                  </th>
                  <td>
                    {metaGroupName ? (
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        {metaGroupName}
                      </Badge>
                    ) : (
                      <Text fz={12.5} c="dimmed" span>
                        —
                      </Text>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Text fz={12.5} className={classes.figure} span>
                      {variation.metaLevel ?? "—"}
                    </Text>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {sell ? (
                      <ISKAmount
                        amount={sell}
                        fz={12.5}
                        className={classes.figure}
                        span
                      />
                    ) : (
                      <Text fz={12.5} c="dimmed" span>
                        {market ? "No orders" : "…"}
                      </Text>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}
