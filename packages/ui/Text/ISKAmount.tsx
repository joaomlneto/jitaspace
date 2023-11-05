import React, { memo, useMemo } from "react";
import { Skeleton, Text, Tooltip, type TextProps } from "@mantine/core";





export type ISKAmountProps = TextProps & {
  amount?: number;
  digits?: number;
  space?: boolean;
};

export const ISKAmount = memo(
  ({ amount, digits = 1, ...otherProps }: ISKAmountProps) => {
    const formattedAmount = useMemo(() => {
      if (amount === undefined) return null;
      const lookup = [
        { value: 1e12, symbol: "T" },
        { value: 1e9, symbol: "B" },
        { value: 1e6, symbol: "M" },
        { value: 1e3, symbol: "K" },
        { value: 1, symbol: "" },
      ];

      const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
      const item = lookup.find((item) => Math.abs(amount) >= item.value);
      if (!item) return "0";
      return (
        (amount / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
      );
    }, [amount, digits]);

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
