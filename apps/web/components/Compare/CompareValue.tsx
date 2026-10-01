"use client";

import { memo } from "react";
import { Box, Group, Skeleton, Text, VisuallyHidden } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import { TypeAnchor, TypeName } from "@jitaspace/eve-components";
import {
  DogmaAttributeAnchor,
  formatDogmaAttributeValue,
  GroupAnchor,
  ISKAmount,
} from "@jitaspace/ui";

import type { CompareCatalog } from "./catalog";
import type { CompareCell, CompareRow } from "./comparison";
import { GroupName } from "~/components/Text";
import classes from "./Compare.module.css";
import { REFERENCE_UNIT_IDS } from "./comparison";

const RANK_COLORS = { best: "teal.4", worst: "red.4" } as const;
const RANK_LABELS = { best: "best", worst: "worst" } as const;
const RANK_ICONS = { best: IconThumbUp, worst: IconThumbDown } as const;

const ROMAN_LEVELS = ["0", "I", "II", "III", "IV", "V"];

/** "+19%", "−4.5%"; tiny changes keep a decimal so they don't read as 0%. */
export function formatDelta(delta: number): string {
  const percent = delta * 100;
  const digits = Math.abs(percent) < 10 ? 1 : 0;
  const rounded = Number(percent.toFixed(digits));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })}%`;
}

/**
 * The value of an attribute whose unit is an id: a link to what it names. The
 * attribute case is labelled from the catalog, which already has every name.
 */
function ReferenceValue({
  row,
  value,
  level,
  attributes,
}: Readonly<{
  row: CompareRow;
  value: number;
  level?: number;
  attributes: CompareCatalog["attributes"];
}>) {
  if (row.unitId === 116) {
    return (
      <Group gap={6} wrap="nowrap" justify="flex-end">
        <TypeAnchor typeId={value} fz={12.5}>
          <TypeName span typeId={value} />
        </TypeAnchor>
        {level !== undefined && (
          <Text span size="xs" c="dimmed">
            {ROMAN_LEVELS[level] ?? level}
          </Text>
        )}
      </Group>
    );
  }
  if (row.unitId === 115) {
    return (
      <GroupAnchor groupId={value} fz={12.5}>
        <GroupName span groupId={value} />
      </GroupAnchor>
    );
  }
  const attribute = attributes[value];
  return (
    <DogmaAttributeAnchor attributeId={value} fz={12.5}>
      {attribute?.displayName ?? attribute?.name ?? value}
    </DogmaAttributeAnchor>
  );
}

/** One cell of the comparison: the value, its rank and its baseline delta. */
export const CompareValue = memo(
  ({
    row,
    cell,
    attributes,
  }: Readonly<{
    row: CompareRow;
    cell: CompareCell;
    attributes: CompareCatalog["attributes"];
  }>) => {
    if (cell.loading) {
      return <Skeleton height={12} width="60%" mx="auto" />;
    }
    if (cell.value === undefined) {
      return (
        <Text fz={12.5} c="dimmed">
          <span aria-hidden>—</span>
          <VisuallyHidden>Not applicable</VisuallyHidden>
        </Text>
      );
    }

    if (row.unitId !== undefined && REFERENCE_UNIT_IDS.has(row.unitId)) {
      return (
        <ReferenceValue
          row={row}
          value={cell.value}
          level={cell.level}
          attributes={attributes}
        />
      );
    }

    // A default is dimmed and italic — two cues, not colour alone — and is
    // never ranked (see buildComparison).
    let color: string | undefined = cell.rank
      ? RANK_COLORS[cell.rank]
      : undefined;
    if (cell.isDefault) color = "dimmed";
    let deltaColor = "dimmed";
    if (cell.deltaIsBetter === true) deltaColor = "teal.6";
    if (cell.deltaIsBetter === false) deltaColor = "red.6";
    const RankIcon = cell.rank ? RANK_ICONS[cell.rank] : undefined;
    const DeltaIcon =
      cell.deltaIsBetter === undefined
        ? undefined
        : RANK_ICONS[cell.deltaIsBetter ? "best" : "worst"];

    return (
      <Group
        gap={6}
        justify="center"
        wrap="nowrap"
        title={
          cell.isDefault ? "Default value: not set on this item" : undefined
        }
      >
        {RankIcon && (
          <Box
            component="span"
            c={color}
            aria-hidden
            style={{ display: "inline-flex" }}
          >
            <RankIcon size={12} />
          </Box>
        )}
        {row.isk ? (
          <ISKAmount
            amount={cell.value}
            fz={12.5}
            fw={600}
            c={color}
            className={classes.figure}
          />
        ) : (
          <Text
            fz={12.5}
            fw={600}
            c={color}
            className={classes.figure}
            fs={cell.isDefault ? "italic" : undefined}
          >
            {formatDogmaAttributeValue(cell.value, {
              unitId: row.unitId,
              symbol: row.unitSymbol,
            })}
          </Text>
        )}
        {cell.rank && (
          <VisuallyHidden>{` (${RANK_LABELS[cell.rank]})`}</VisuallyHidden>
        )}
        {cell.isDefault && (
          <VisuallyHidden> (default, not set on this item)</VisuallyHidden>
        )}
        {cell.delta !== undefined && (
          <Text fz={10.5} c={deltaColor} className={classes.figure}>
            {DeltaIcon && (
              <Box
                component="span"
                aria-hidden
                mr={2}
                style={{ display: "inline-flex", verticalAlign: "-1px" }}
              >
                <DeltaIcon size={10} />
              </Box>
            )}
            {formatDelta(cell.delta)}
            {cell.deltaIsBetter !== undefined && (
              <VisuallyHidden>
                {cell.deltaIsBetter ? " better" : " worse"} than the first
                column
              </VisuallyHidden>
            )}
          </Text>
        )}
      </Group>
    );
  },
);
CompareValue.displayName = "CompareValue";
