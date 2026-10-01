"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
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
 * The number the EVE client shows for a raw dogma value, before any unit symbol
 * is attached: resistances become the percentage resisted, multipliers the
 * percentage they add, milliseconds whole seconds. Units without a transform
 * pass through unchanged.
 */
export function dogmaAttributeDisplayValue(
  value: number,
  unitId?: number,
): number {
  switch (unitId) {
    // Milliseconds — the client shows seconds (its unit symbol is "s").
    case 101:
      return value / 1000;
    // Inverse Absolute Percent (resistances) and Inversed Modifier Percent
    // (resistance bonuses): 0.75 => 25%.
    case 108:
    case 111:
      return (1 - value) * 100;
    // Absolute Percent. 0.0 => 0%, 1.0 => 100%.
    case 127:
      return value * 100;
    // Modifier Percent — a multiplier shown as the percentage it adds.
    case 109:
      return (value - 1) * 100;
    default:
      return value;
  }
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
  const displayValue = dogmaAttributeDisplayValue(value, unit?.unitId);
  switch (unit?.unitId) {
    // Milliseconds. 125000 => 125 s.
    case 101:
      return `${formatNumber(displayValue)} s`;
    // Resistances (108) and resistance bonuses (111), 0.25 => 75%, and
    // Absolute Percent (127), 0.5 => 50%.
    case 108:
    case 111:
    case 127:
      return `${formatNumber(displayValue)}%`;
    // Modifier Percent — multiplier shown as a signed %. 1.1 => +10%, 0.9 => -10%.
    case 109:
      return `${displayValue > 0 ? "+" : ""}${formatNumber(displayValue)}%`;
    // Boolean flag.
    case 137:
      return value >= 1 ? "Yes" : "No";
    // Sizeclass and Level: the SDE "symbols" are a legend ("1=small 2=medium
    // 3=l") and the word "Level", neither of which belongs after the number.
    case 117:
    case 140:
      return formatNumber(value);
    // Bonus — an additive bonus, written the way the client does: +2.
    case 139:
      return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
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
