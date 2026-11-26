"use client";

import type { TextProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Skeleton, Text, Tooltip } from "@mantine/core";

export type ISKAmountProps = TextProps & {
  amount?: number;
  digits?: number;
  showFullAmount?: boolean;
};

const ISK_UNITS = [
  { value: 1e12, symbol: "T" },
  { value: 1e9, symbol: "B" },
  { value: 1e6, symbol: "M" },
  { value: 1e3, symbol: "K" },
  { value: 1, symbol: "" },
];

/** Drops trailing zeros after the decimal point: "1.50" → "1.5", "2.0" → "2". */
const TRAILING_ZEROS = /\.0+$|(\.\d*[1-9])0+$/;

/**
 * `1234567` → `"1.2M"`. The unit is chosen after rounding, so 999,950 reads
 * "1M" rather than "1000K"; amounts below 1 ISK keep their decimals.
 */
const abbreviateIsk = (amount: number, digits: number): string => {
  let index = ISK_UNITS.findIndex((unit) => Math.abs(amount) >= unit.value);
  if (index === -1) index = ISK_UNITS.length - 1;
  const scaled = (i: number) =>
    Number((amount / (ISK_UNITS[i]?.value ?? 1)).toFixed(digits));
  if (index > 0 && Math.abs(scaled(index)) >= 1000) index -= 1;
  const unit = ISK_UNITS[index];
  return (
    scaled(index).toFixed(digits).replace(TRAILING_ZEROS, "$1") +
    (unit?.symbol ?? "")
  );
};

export const ISKAmount = memo(
  ({
    amount,
    digits = 1,
    showFullAmount = false,
    ...otherProps
  }: ISKAmountProps) => {
    const formattedAmount = useMemo(() => {
      if (amount === undefined) return null;
      if (showFullAmount) return amount.toLocaleString();
      return abbreviateIsk(amount, digits);
    }, [amount, digits, showFullAmount]);

    if (amount == null)
      return (
        <Skeleton>
          <Text {...otherProps}>123456789</Text>
        </Skeleton>
      );

    return (
      <Tooltip
        color="dark"
        label={`${amount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ISK`}
      >
        <Text {...otherProps}>{formattedAmount} ISK</Text>
      </Tooltip>
    );
  },
);
ISKAmount.displayName = "ISKAmount";
