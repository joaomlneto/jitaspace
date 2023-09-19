import React, { forwardRef } from "react";
import { Badge, Group, type SelectItemProps } from "@mantine/core";

import { MailLabelColorSwatch } from "../../ColorSwatch";
import { LabelName } from "../../Text";

export const EveMailLabelMultiSelectItem = forwardRef<
  HTMLDivElement,
  SelectItemProps & { unreadCount: number }
>(({ value, unreadCount, ...others }, ref) => {
  return (
    <Group ref={ref} {...others} position="apart" wrap="nowrap">
      <Group wrap="nowrap">
        <MailLabelColorSwatch labelId={value ?? 1} size={16} />
        <LabelName labelId={value} />
      </Group>
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Group>
  );
});
EveMailLabelMultiSelectItem.displayName = "EmailLabelMultiSelectItem";
