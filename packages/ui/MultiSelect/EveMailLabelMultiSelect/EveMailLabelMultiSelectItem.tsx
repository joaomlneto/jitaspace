import React, { forwardRef } from "react";
import { Badge, Group, type SelectItemProps } from "@mantine/core";

import { MailLabelColorSwatch } from "../../ColorSwatch";
import { LabelName } from "../../Text";


export const EveMailLabelMultiSelectItem = forwardRef<
  HTMLDivElement,
  SelectItemProps & { characterId: number; unreadCount: number }
>(({ value, characterId, unreadCount, ...others }, ref) => {
  return (
    <Group ref={ref} {...others} position="apart" wrap="nowrap">
      <Group wrap="nowrap">
        <MailLabelColorSwatch
          characterId={characterId}
          labelId={value ?? 1}
          size={16}
        />
        <LabelName characterId={characterId} labelId={value} />
      </Group>
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Group>
  );
});
EveMailLabelMultiSelectItem.displayName = "EmailLabelMultiSelectItem";
