"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type DogmaAttributeValueProps = TextProps & {
  /** The raw numeric attribute value. */
  value?: number;
  /** The dogma unit's id (SDE `dogmaUnits`) — drives the transforms below. */
  unitId?: number;
  /** The unit's display symbol (e.g. "m", "m3", "%"); used for plain units. */
  unitSymbol?: string;
};

/** Locale-format a number, keeping useful precision for small fractions. */
function formatNumber(value: number): string {
  if (value === 0) return "0";
  if (Number.isInteger(value)) return value.toLocaleString();
  const abs = Math.abs(value);
  let maximumFractionDigits = 2;
  if (abs < 1) maximumFractionDigits = 4;
  if (abs < 0.001) maximumFractionDigits = 6;
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

/** Turn ASCII unit shorthand from the SDE into nicer typography (m3 -> m³). */
function prettifyUnitSymbol(symbol?: string): string | undefined {
  return symbol
    ? symbol
        .replaceAll(/m3/gi, "m³")
        .replaceAll("^3", "³")
        .replaceAll("^2", "²")
    : undefined;
}

/**
 * Format a dogma attribute value the way the EVE client does: applying the
 * well-known unit transforms (resistances, percentages, multipliers, booleans)
 * and otherwise appending the unit's display symbol. The numeric ids are the
 * SDE `dogmaUnits` ids; the transforms are verified against in-game values.
 */
export function formatDogmaAttributeValue(
  value: number,
  unit?: { unitId?: number; symbol?: string },
): string {
  switch (unit?.unitId) {
    // Inverse Absolute Percent — resistances. 0.0 => 100%, 1.0 => 0%.
    case 108:
      return `${formatNumber((1 - value) * 100)}%`;
    // Absolute Percent. 0.0 => 0%, 1.0 => 100%.
    case 127:
      return `${formatNumber(value * 100)}%`;
    // Modifier Percent — multiplier shown as a signed %. 1.1 => +10%, 0.9 => -10%.
    case 109: {
      const percent = (value - 1) * 100;
      return `${percent > 0 ? "+" : ""}${formatNumber(percent)}%`;
    }
    // Boolean flag.
    case 137:
      return value >= 1 ? "Yes" : "No";
    default: {
      const symbol = prettifyUnitSymbol(unit?.symbol);
      if (!symbol) return formatNumber(value);
      if (symbol === "%") return `${formatNumber(value)}%`;
      return `${formatNumber(value)} ${symbol}`;
    }
  }
}

/**
 * Renders a single dogma attribute value formatted for its unit. Pass the
 * attribute's `unitId` (and, for plain units, the unit's `unitSymbol`) so the
 * value reads the way it does in the EVE client — resistances as "25%",
 * multipliers as "+10%", volumes as "100 m³", booleans as "Yes"/"No". Renders
 * a skeleton while `value` is undefined.
 */
export const DogmaAttributeValue = memo(
  ({ value, unitId, unitSymbol, ...otherProps }: DogmaAttributeValueProps) => {
    if (value === undefined) {
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width="4ch"
          />
        </Text>
      );
    }
    return (
      <Text {...otherProps}>
        {formatDogmaAttributeValue(value, { unitId, symbol: unitSymbol })}
      </Text>
    );
  },
);
DogmaAttributeValue.displayName = "DogmaAttributeValue";
