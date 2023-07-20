import { memo, useState } from "react";
import { Select, type SelectProps } from "@mantine/core";

import { useCharacterAssets, useEsiNamesCache } from "@jitaspace/esi-client";

import { AssetLocationSelectItem } from "./AssetLocationSelectItem";

export type AssetLocationSelectItemProps = Omit<SelectProps, "data">;

export const AssetLocationSelect = memo(
  ({ ...otherProps }: AssetLocationSelectItemProps) => {
    const { locations } = useCharacterAssets();
    const [value, onChange] = useState<string | null>();

    const cache = useEsiNamesCache();
    const getNameFromCache = (id: number) => cache[id]?.value?.name;

    return (
      <>
        <Select
          itemComponent={AssetLocationSelectItem}
          data={(Object.values(locations) ?? [])
            .filter((location) => location.location_type !== "item")
            .map((location) => ({
              value: location.location_id?.toString(),
              label: `${getNameFromCache(location.location_id)} (${
                location.location_type
              })`,
            }))}
          value={otherProps.value ?? value}
          onChange={(value: string) => {
            otherProps.onChange?.(value);
            onChange(value);
          }}
          miw={300}
          clearable
          searchable
          {...otherProps}
        />
        {value}
      </>
    );
  },
);
AssetLocationSelect.displayName = "AssetLocationSelect";
