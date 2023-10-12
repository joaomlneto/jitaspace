import { memo, useState } from "react";
import { Select, type SelectProps } from "@mantine/core";

import { useCharacterAssets, useEsiNamesCache } from "@jitaspace/esi-hooks";

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
            // @ts-expect-error hook temporarily disabled
            .filter((location) => location.location_type !== "item")
            .map((location) => ({
              // @ts-expect-error hook temporarily disabled
              value: location.location_id?.toString(),
              // @ts-expect-error hook temporarily disabled
              label: `${getNameFromCache(location.location_id)} (${
                // @ts-expect-error hook temporarily disabled
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
