import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useType } from "@jitaspace/hooks";
import { TypeAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export interface TypeButtonProps {
  typeId?: number;
}

export const TypeButton = memo(({ typeId }: TypeButtonProps) => {
  const { data } = useType(
    typeId ?? 0,
    {},
    {},
    { query: { enabled: typeId !== undefined } },
  );
  return (
    <UnstyledButton className={classes.user}>
      <Group wrap="nowrap" gap="sm">
        <TypeAvatar typeId={typeId} size={30} />
        <Text fz="sm" fw={500}>
          {data?.data.name}
        </Text>
      </Group>
    </UnstyledButton>
  );
});

TypeButton.displayName = "TypeButton";
