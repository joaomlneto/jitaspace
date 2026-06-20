"use client";

import type { SelectProps } from "@mantine/core";
import { memo, useMemo, useState } from "react";
import { Select } from "@mantine/core";

import { useCharacterAssets, useEsiNameLookup } from "@jitaspace/hooks";

export type AssetLocationSelectItemProps = Omit<SelectProps, "data">;

export const AssetLocationSelect = memo(
  ({ ...otherProps }: AssetLocationSelectItemProps) => {
    const { locations } = useCharacterAssets();
    const [value, setValue] = useState<string | null>();

    const locationEntries = useMemo(
      () => Object.values(locations).map((loc) => ({ id: loc.location_id })),
      [locations],
    );
    const names = useEsiNameLookup(locationEntries);
    const getNameFromCache = (id: number) => names[id.toString()]?.value?.name;

    return (
      <>
        <Select
          //itemComponent={AssetLocationSelectItem}
          data={Object.values(locations)
            .filter((location) => location.location_type !== "item")
            .map((location) => ({
              value: location.location_id.toString(),
              label: `${getNameFromCache(location.location_id)} (${
                location.location_type
              })`,
            }))}
          value={otherProps.value ?? value}
          onChange={(value: string | null, options) => {
            otherProps.onChange?.(value, options);
            setValue(value);
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
