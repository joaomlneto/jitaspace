import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

export type Position3DTextProps = TextProps & {
  position?: number[];
};

export const Position3DText = memo(
  ({ position, ...otherProps }: Position3DTextProps) => {
    if (position === undefined)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown Position</Text>
        </Skeleton>
      );

    const [x, y, z] = position;

    return (
      <Text {...otherProps}>
        {x !== undefined ? `x: ${x}` : ""}
        {y !== undefined && (
          <>
            <br />
            {`y: ${y}`}
          </>
        )}
        {z !== undefined && (
          <>
            <br />
            {`z: ${z}`}
          </>
        )}
      </Text>
    );
  },
);
Position3DText.displayName = "Position3DText";
