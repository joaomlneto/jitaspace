import React, { forwardRef } from "react";
import { Avatar, Group } from "@mantine/core";

import { AssetLocationName } from "../../Text";
import { type AssetLocationSelectItemProps } from "./AssetLocationSelect";

export const AssetLocationSelectItem = forwardRef<
  HTMLDivElement,
  AssetLocationSelectItemProps
>(
  (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { value, defaultValue, onChange, ...other }: AssetLocationSelectItemProps,
    ref,
  ) => (
    <div ref={ref} {...other}>
      <Group wrap="nowrap">
        <Avatar />
        <div>
          <AssetLocationName locationId={value ?? undefined} size="sm" />
        </div>
      </Group>
    </div>
  ),
);
AssetLocationSelectItem.displayName = "AssetLocationSelectItem";
