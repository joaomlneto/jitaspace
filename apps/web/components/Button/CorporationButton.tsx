import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useCorporation } from "@jitaspace/hooks";
import { CorporationAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export type CorporationButtonProps = {
  corporationId?: number;
};

export const CorporationButton = memo(
  ({ corporationId }: CorporationButtonProps) => {
    const { data } = useCorporation(
      corporationId ?? 0,
      {},
      {},
      { query: { enabled: corporationId !== undefined } },
    );
    return (
      <UnstyledButton className={classes.user}>
        <Group wrap="nowrap" gap="sm">
          <CorporationAvatar corporationId={corporationId} size={30} />
          <Text fz="sm" fw={500}>
            {data?.data.name}
          </Text>
        </Group>
      </UnstyledButton>
    );
  },
);

CorporationButton.displayName = "CorporationButton";
